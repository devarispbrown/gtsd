import { Router, Request, Response, NextFunction } from 'express';
import { trace, SpanStatusCode } from '@opentelemetry/api';
import { logger } from '../../config/logger';
import { AppError } from '../../middleware/error';
import { requireAuth } from '../../middleware/auth';
import { db } from '../../db/connection';
import { photos, taskEvidence, dailyTasks } from '../../db/schema';
import { eq, and, desc } from 'drizzle-orm';
import { ZodError } from 'zod';
import { s3Service } from '../../services/s3';
import {
  presignRequestSchema,
  confirmPhotoWithValidation,
  getPhotosQuerySchema,
  photoIdParamSchema,
  type PresignRequest,
  type ConfirmPhoto,
  type GetPhotosQuery,
} from './schemas';
import {
  incrementPhotoPresign,
  incrementPhotoUpload,
  recordPhotoUploadBytes,
} from '../../metrics/photo-metrics';
import rateLimit from 'express-rate-limit';

const router = Router();
const tracer = trace.getTracer('progress-photos-routes');

/**
 * Rate limiter for presigned URL generation
 * 20 requests per minute per user
 */
const presignRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 20,
  message: 'Too many presign requests, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: Request) => `presign_${req.userId || 'anonymous'}`,
});

/**
 * POST /v1/progress/photo/presign
 * Generate presigned URL for photo upload
 *
 * Body:
 * - fileName: string (max 255 chars)
 * - contentType: 'image/jpeg' | 'image/png' | 'image/heic'
 * - fileSize: number (max 10MB)
 *
 * Returns:
 * - uploadUrl: string (presigned S3 URL)
 * - fileKey: string (S3 object key)
 * - expiresIn: number (seconds)
 *
 * Rate limit: 20 requests/min
 */
router.post(
  '/photo/presign',
  requireAuth,
  presignRateLimiter,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const span = tracer.startSpan('POST /v1/progress/photo/presign');

    try {
      span.setAttributes({
        'user.id': req.userId,
        'http.method': 'POST',
        'http.route': '/v1/progress/photo/presign',
      });

      logger.info({ userId: req.userId, body: req.body as Record<string, unknown> }, 'Presign request received');

      // Validate request body
      const validatedInput: PresignRequest = presignRequestSchema.parse(req.body);

      span.setAttributes({
        'file.name': validatedInput.fileName,
        'file.content_type': validatedInput.contentType,
        'file.size': validatedInput.fileSize,
      });

      // Generate presigned URL
      const result = await s3Service.generatePresignedUploadUrl({
        userId: req.userId!,
        fileName: validatedInput.fileName,
        contentType: validatedInput.contentType,
      });

      span.setStatus({ code: SpanStatusCode.OK });

      // Record metrics
      incrementPhotoPresign('success');

      logger.info(
        {
          userId: req.userId,
          fileKey: result.fileKey,
          contentType: validatedInput.contentType,
        },
        'Presigned URL generated successfully'
      );

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      span.setStatus({
        code: SpanStatusCode.ERROR,
        message: error instanceof Error ? error.message : 'Unknown error',
      });

      // Record metrics
      incrementPhotoPresign('error');

      if (error instanceof ZodError) {
        logger.warn({ userId: req.userId, validationErrors: error.errors }, 'Presign validation failed');

        span.recordException(error);
        next(
          new AppError(
            400,
            `Validation failed: ${error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ')}`
          )
        );
      } else if (error instanceof AppError) {
        span.recordException(error);
        next(error);
      } else {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        logger.error({ userId: req.userId, error, errorMessage }, 'Unexpected error generating presigned URL');
        span.recordException(error as Error);
        next(new AppError(500, `Failed to generate presigned URL: ${errorMessage}`));
      }
    } finally {
      span.end();
    }
  }
);

/**
 * POST /v1/progress/photo/confirm
 * Confirm photo upload and create database record
 *
 * Body:
 * - fileKey: string (S3 object key from presign)
 * - width: number (optional, image width)
 * - height: number (optional, image height)
 * - takenAt: string (optional, ISO datetime)
 * - taskId: number (optional, link to task)
 * - evidenceType: 'before' | 'during' | 'after' (required if taskId provided)
 *
 * Returns:
 * - photoId: number
 * - downloadUrl: string (presigned download URL)
 */
router.post(
  '/photo/confirm',
  requireAuth,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const span = tracer.startSpan('POST /v1/progress/photo/confirm');

    try {
      span.setAttributes({
        'user.id': req.userId,
        'http.method': 'POST',
        'http.route': '/v1/progress/photo/confirm',
      });

      logger.info({ userId: req.userId, body: req.body as Record<string, unknown> }, 'Photo confirm request received');

      // Validate request body
      const validatedInput: ConfirmPhoto = confirmPhotoWithValidation.parse(req.body);

      span.setAttributes({
        'file.key': validatedInput.fileKey,
        'task.id': validatedInput.taskId,
        'file.size': validatedInput.fileSize,
        'file.content_type': validatedInput.contentType,
      });

      // Verify file exists in S3 before creating database record
      await s3Service.verifyObjectExists(validatedInput.fileKey);

      // Check if photo already exists with same fileKey (idempotency)
      const [existingPhoto] = await db
        .select()
        .from(photos)
        .where(and(eq(photos.fileKey, validatedInput.fileKey), eq(photos.userId, req.userId!)))
        .limit(1);

      if (existingPhoto) {
        logger.info(
          {
            userId: req.userId,
            photoId: existingPhoto.id,
            fileKey: validatedInput.fileKey,
          },
          'Photo already confirmed (idempotent request)'
        );

        // Generate download URL for existing photo
        const downloadUrl = await s3Service.getPresignedDownloadUrl(validatedInput.fileKey);

        span.setStatus({ code: SpanStatusCode.OK });
        span.setAttributes({
          'photo.id': existingPhoto.id,
          'idempotent': true,
        });

        // Return existing photo with 200 status
        res.status(200).json({
          success: true,
          data: {
            photoId: existingPhoto.id,
            downloadUrl,
          },
        });
        return;
      }

      // If taskId is provided, verify the task exists and belongs to the user
      if (validatedInput.taskId) {
        const [task] = await db
          .select()
          .from(dailyTasks)
          .where(and(eq(dailyTasks.id, validatedInput.taskId), eq(dailyTasks.userId, req.userId!)))
          .limit(1);

        if (!task) {
          throw new AppError(404, `Task ${validatedInput.taskId} not found or does not belong to user`);
        }
      }

      // Create photo record in transaction
      const result = await db.transaction(async (tx) => {
        // Insert photo record
        const [photo] = await tx
          .insert(photos)
          .values({
            userId: req.userId!,
            fileKey: validatedInput.fileKey,
            fileSize: validatedInput.fileSize,
            mimeType: validatedInput.contentType,
            width: validatedInput.width,
            height: validatedInput.height,
            takenAt: validatedInput.takenAt ? new Date(validatedInput.takenAt) : null,
          })
          .returning();

        // If taskId provided, create task evidence link
        let evidence = null;
        if (validatedInput.taskId && validatedInput.evidenceType) {
          [evidence] = await tx
            .insert(taskEvidence)
            .values({
              taskId: validatedInput.taskId,
              photoId: photo.id,
              evidenceType: validatedInput.evidenceType,
            })
            .returning();
        }

        return { photo, evidence };
      });

      // Generate download URL
      const downloadUrl = await s3Service.getPresignedDownloadUrl(validatedInput.fileKey);

      span.setStatus({ code: SpanStatusCode.OK });
      span.setAttributes({
        'photo.id': result.photo.id,
      });

      // Record metrics
      incrementPhotoUpload(validatedInput.contentType);
      recordPhotoUploadBytes(validatedInput.fileSize);

      logger.info(
        {
          userId: req.userId,
          photoId: result.photo.id,
          fileKey: validatedInput.fileKey,
          taskLinked: !!validatedInput.taskId,
        },
        'Photo confirmed successfully'
      );

      res.status(201).json({
        success: true,
        data: {
          photoId: result.photo.id,
          downloadUrl,
        },
      });
    } catch (error) {
      span.setStatus({
        code: SpanStatusCode.ERROR,
        message: error instanceof Error ? error.message : 'Unknown error',
      });

      if (error instanceof ZodError) {
        logger.warn({ userId: req.userId, validationErrors: error.errors }, 'Photo confirm validation failed');

        span.recordException(error);
        next(
          new AppError(
            400,
            `Validation failed: ${error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ')}`
          )
        );
      } else if (error instanceof AppError) {
        span.recordException(error);
        next(error);
      } else {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        logger.error({ userId: req.userId, error, errorMessage }, 'Unexpected error confirming photo');
        span.recordException(error as Error);
        next(new AppError(500, `Failed to confirm photo: ${errorMessage}`));
      }
    } finally {
      span.end();
    }
  }
);

/**
 * GET /v1/progress/photos
 * Get paginated list of user's photos with optional task filter
 *
 * Query params:
 * - limit: number (default 50, max 100)
 * - offset: number (default 0)
 * - taskId: number (optional, filter by task)
 *
 * Returns array of photos with download URLs
 */
router.get(
  '/photos',
  requireAuth,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const span = tracer.startSpan('GET /v1/progress/photos');

    try {
      span.setAttributes({
        'user.id': req.userId,
        'http.method': 'GET',
        'http.route': '/v1/progress/photos',
      });

      // Validate query parameters
      const queryParams: GetPhotosQuery = getPhotosQuerySchema.parse(req.query);

      span.setAttributes({
        'query.limit': queryParams.limit,
        'query.offset': queryParams.offset,
        'query.task_id': queryParams.taskId,
      });

      logger.info({ userId: req.userId, queryParams }, 'Fetching photos');

      // Build query
      let query = db
        .select({
          id: photos.id,
          fileKey: photos.fileKey,
          fileSize: photos.fileSize,
          mimeType: photos.mimeType,
          width: photos.width,
          height: photos.height,
          takenAt: photos.takenAt,
          uploadedAt: photos.uploadedAt,
          createdAt: photos.createdAt,
        })
        .from(photos)
        .where(eq(photos.userId, req.userId!))
        .orderBy(desc(photos.createdAt))
        .limit(queryParams.limit)
        .offset(queryParams.offset);

      // If taskId filter is provided, join with task_evidence
      let photosList;
      if (queryParams.taskId) {
        photosList = await db
          .select({
            id: photos.id,
            fileKey: photos.fileKey,
            fileSize: photos.fileSize,
            mimeType: photos.mimeType,
            width: photos.width,
            height: photos.height,
            takenAt: photos.takenAt,
            uploadedAt: photos.uploadedAt,
            createdAt: photos.createdAt,
            evidenceType: taskEvidence.evidenceType,
          })
          .from(photos)
          .innerJoin(taskEvidence, eq(taskEvidence.photoId, photos.id))
          .where(and(eq(photos.userId, req.userId!), eq(taskEvidence.taskId, queryParams.taskId)))
          .orderBy(desc(photos.createdAt))
          .limit(queryParams.limit)
          .offset(queryParams.offset);
      } else {
        photosList = await query;
      }

      // Generate download URLs for each photo
      const photosWithUrls = await Promise.all(
        photosList.map(async (photo) => ({
          ...photo,
          downloadUrl: await s3Service.getPresignedDownloadUrl(photo.fileKey),
        }))
      );

      span.setStatus({ code: SpanStatusCode.OK });
      span.setAttributes({
        'response.count': photosWithUrls.length,
      });

      logger.info(
        {
          userId: req.userId,
          count: photosWithUrls.length,
        },
        'Photos fetched successfully'
      );

      res.status(200).json({
        success: true,
        data: {
          photos: photosWithUrls,
          pagination: {
            limit: queryParams.limit,
            offset: queryParams.offset,
            total: photosWithUrls.length,
          },
        },
      });
    } catch (error) {
      span.setStatus({
        code: SpanStatusCode.ERROR,
        message: error instanceof Error ? error.message : 'Unknown error',
      });

      if (error instanceof ZodError) {
        logger.warn({ userId: req.userId, validationErrors: error.errors }, 'Query validation failed');

        span.recordException(error);
        next(
          new AppError(
            400,
            `Validation failed: ${error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ')}`
          )
        );
      } else if (error instanceof AppError) {
        span.recordException(error);
        next(error);
      } else {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        logger.error({ userId: req.userId, error, errorMessage }, 'Unexpected error fetching photos');
        span.recordException(error as Error);
        next(new AppError(500, `Failed to fetch photos: ${errorMessage}`));
      }
    } finally {
      span.end();
    }
  }
);

/**
 * DELETE /v1/progress/photo/:photoId
 * Delete photo from database and S3
 *
 * Params:
 * - photoId: number
 *
 * Cascades to task_evidence table
 */
router.delete(
  '/photo/:photoId',
  requireAuth,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const span = tracer.startSpan('DELETE /v1/progress/photo/:photoId');

    try {
      span.setAttributes({
        'user.id': req.userId,
        'http.method': 'DELETE',
        'http.route': '/v1/progress/photo/:photoId',
      });

      // Validate photo ID parameter
      const { photoId } = photoIdParamSchema.parse(req.params);

      span.setAttributes({
        'photo.id': photoId,
      });

      logger.info({ userId: req.userId, photoId }, 'Deleting photo');

      // Fetch photo to verify ownership and get S3 key
      const [photo] = await db
        .select()
        .from(photos)
        .where(and(eq(photos.id, photoId), eq(photos.userId, req.userId!)))
        .limit(1);

      if (!photo) {
        throw new AppError(404, `Photo ${photoId} not found or does not belong to user`);
      }

      // Delete from S3 first
      await s3Service.deleteObject(photo.fileKey);

      // Delete from database (cascades to task_evidence)
      await db.delete(photos).where(eq(photos.id, photoId));

      span.setStatus({ code: SpanStatusCode.OK });

      logger.info(
        {
          userId: req.userId,
          photoId,
          fileKey: photo.fileKey,
        },
        'Photo deleted successfully'
      );

      res.status(200).json({
        success: true,
        message: 'Photo deleted successfully',
      });
    } catch (error) {
      span.setStatus({
        code: SpanStatusCode.ERROR,
        message: error instanceof Error ? error.message : 'Unknown error',
      });

      if (error instanceof ZodError) {
        logger.warn({ userId: req.userId, validationErrors: error.errors }, 'Photo ID validation failed');

        span.recordException(error);
        next(
          new AppError(
            400,
            `Validation failed: ${error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ')}`
          )
        );
      } else if (error instanceof AppError) {
        span.recordException(error);
        next(error);
      } else {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        logger.error({ userId: req.userId, error, errorMessage }, 'Unexpected error deleting photo');
        span.recordException(error as Error);
        next(new AppError(500, `Failed to delete photo: ${errorMessage}`));
      }
    } finally {
      span.end();
    }
  }
);

export default router;
