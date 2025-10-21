import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { env } from '../config/env';
import { logger } from '../config/logger';
import { trace, SpanStatusCode } from '@opentelemetry/api';
import { v4 as uuidv4 } from 'uuid';
import { AppError } from '../middleware/error';

const tracer = trace.getTracer('s3-service');

/**
 * Configuration for S3 presigned upload URLs
 */
interface PresignedUploadConfig {
  userId: number;
  fileName: string;
  contentType: string;
}

/**
 * Result of presigned upload URL generation
 */
interface PresignedUploadResult {
  uploadUrl: string;
  fileKey: string;
  expiresIn: number;
}

/**
 * Result of file verification
 */
interface VerifyFileResult {
  exists: boolean;
  contentType: string;
  contentLength: number;
}

/**
 * Allowed MIME types for photo uploads
 */
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/heic'] as const;
type AllowedMimeType = (typeof ALLOWED_MIME_TYPES)[number];

/**
 * Default expiration time for presigned URLs (10 minutes)
 */
const DEFAULT_UPLOAD_EXPIRY = 600; // 10 minutes in seconds

/**
 * Default expiration time for download URLs (1 hour)
 */
const DEFAULT_DOWNLOAD_EXPIRY = 3600; // 1 hour in seconds

/**
 * S3Service handles all S3/MinIO operations for photo uploads
 * Provides presigned URL generation, file deletion, and validation
 */
export class S3Service {
  private readonly client: S3Client;
  private readonly bucket: string;

  constructor() {
    this.bucket = env.S3_BUCKET;

    this.client = new S3Client({
      endpoint: env.S3_ENDPOINT,
      region: env.S3_REGION,
      credentials: {
        accessKeyId: env.S3_ACCESS_KEY_ID,
        secretAccessKey: env.S3_SECRET_ACCESS_KEY,
      },
      forcePathStyle: env.S3_FORCE_PATH_STYLE,
    });

    logger.info(
      {
        endpoint: env.S3_ENDPOINT,
        region: env.S3_REGION,
        bucket: this.bucket,
        forcePathStyle: env.S3_FORCE_PATH_STYLE,
      },
      'S3Service initialized'
    );
  }

  /**
   * Validates if the content type is allowed
   * @param contentType - MIME type to validate
   * @throws AppError if content type is not allowed
   */
  private validateContentType(contentType: string): asserts contentType is AllowedMimeType {
    if (!ALLOWED_MIME_TYPES.includes(contentType as AllowedMimeType)) {
      throw new AppError(
        400,
        `Invalid content type: ${contentType}. Allowed types: ${ALLOWED_MIME_TYPES.join(', ')}`
      );
    }
  }

  /**
   * Sanitizes a file name by removing/replacing special characters
   * Prevents path traversal, null bytes, and malicious patterns
   * @param fileName - Original file name
   * @returns Sanitized file name
   * @throws AppError if filename is invalid
   */
  private sanitizeFileName(fileName: string): string {
    // Check for null bytes
    if (fileName.includes('\0')) {
      throw new AppError(400, 'Invalid filename: contains null bytes');
    }

    // Remove any path components (handles both / and \)
    const baseName = fileName.split(/[/\\]/).pop() || fileName;

    // Check for path traversal attempts
    if (baseName.includes('..')) {
      throw new AppError(400, 'Invalid filename: path traversal detected');
    }

    // Validate file extension is safe
    const extension = baseName.toLowerCase().split('.').pop() || '';
    const allowedExtensions = ['jpg', 'jpeg', 'png', 'heic'];

    if (!allowedExtensions.includes(extension)) {
      throw new AppError(400, `Invalid file extension: .${extension}. Allowed: ${allowedExtensions.join(', ')}`);
    }

    // Check for double extensions (e.g., .jpg.exe)
    const parts = baseName.split('.');
    if (parts.length > 2) {
      throw new AppError(400, 'Invalid filename: multiple extensions detected');
    }

    // Replace special characters with underscores, keep dots for extensions
    const sanitized = baseName.replace(/[^a-zA-Z0-9._-]/g, '_');

    // Ensure filename is not empty after sanitization
    if (!sanitized || sanitized === '.' || sanitized === '..') {
      throw new AppError(400, 'Invalid filename: empty or invalid after sanitization');
    }

    // Limit length to 255 characters
    return sanitized.substring(0, 255);
  }

  /**
   * Generates a unique S3 key for a photo
   * Format: progress-photos/{userId}/{uuid}-{sanitizedFileName}
   * @param userId - User ID
   * @param fileName - Original file name
   * @returns Unique S3 object key
   */
  private generateFileKey(userId: number, fileName: string): string {
    const sanitizedName = this.sanitizeFileName(fileName);
    const uniqueId = uuidv4();
    return `progress-photos/${userId}/${uniqueId}-${sanitizedName}`;
  }

  /**
   * Generates a presigned URL for uploading a photo to S3
   * @param config - Upload configuration
   * @returns Presigned upload URL, file key, and expiration time
   * @throws AppError if validation fails or URL generation fails
   */
  async generatePresignedUploadUrl(config: PresignedUploadConfig): Promise<PresignedUploadResult> {
    const span = tracer.startSpan('s3.generatePresignedUploadUrl');

    try {
      const { userId, fileName, contentType } = config;

      span.setAttributes({
        'user.id': userId,
        'file.name': fileName,
        'file.content_type': contentType,
      });

      // Validate content type
      this.validateContentType(contentType);

      // Generate unique file key
      const fileKey = this.generateFileKey(userId, fileName);

      span.setAttributes({
        'file.key': fileKey,
        'file.bucket': this.bucket,
      });

      logger.info(
        {
          userId,
          fileName,
          contentType,
          fileKey,
        },
        'Generating presigned upload URL'
      );

      // Create PutObject command
      const command = new PutObjectCommand({
        Bucket: this.bucket,
        Key: fileKey,
        ContentType: contentType,
        Metadata: {
          userId: userId.toString(),
          uploadedBy: 'gtsd-api',
        },
      });

      // Generate presigned URL
      const uploadUrl = await getSignedUrl(this.client, command, {
        expiresIn: DEFAULT_UPLOAD_EXPIRY,
      });

      span.setStatus({ code: SpanStatusCode.OK });
      span.setAttributes({
        'url.expires_in': DEFAULT_UPLOAD_EXPIRY,
      });

      logger.info(
        {
          userId,
          fileKey,
          expiresIn: DEFAULT_UPLOAD_EXPIRY,
        },
        'Presigned upload URL generated successfully'
      );

      return {
        uploadUrl,
        fileKey,
        expiresIn: DEFAULT_UPLOAD_EXPIRY,
      };
    } catch (error) {
      span.setStatus({
        code: SpanStatusCode.ERROR,
        message: error instanceof Error ? error.message : 'Unknown error',
      });
      span.recordException(error as Error);

      logger.error(
        {
          error,
          userId: config.userId,
          fileName: config.fileName,
        },
        'Failed to generate presigned upload URL'
      );

      if (error instanceof AppError) {
        throw error;
      }

      throw new AppError(500, 'Failed to generate upload URL');
    } finally {
      span.end();
    }
  }

  /**
   * Generates a presigned URL for downloading a photo from S3
   * @param fileKey - S3 object key
   * @param expiresIn - Expiration time in seconds (default: 1 hour)
   * @returns Presigned download URL
   * @throws AppError if URL generation fails
   */
  async getPresignedDownloadUrl(fileKey: string, expiresIn: number = DEFAULT_DOWNLOAD_EXPIRY): Promise<string> {
    const span = tracer.startSpan('s3.getPresignedDownloadUrl');

    try {
      span.setAttributes({
        'file.key': fileKey,
        'file.bucket': this.bucket,
        'url.expires_in': expiresIn,
      });

      logger.debug(
        {
          fileKey,
          expiresIn,
        },
        'Generating presigned download URL'
      );

      // Create GetObject command
      const command = new GetObjectCommand({
        Bucket: this.bucket,
        Key: fileKey,
      });

      // Generate presigned URL
      const downloadUrl = await getSignedUrl(this.client, command, { expiresIn });

      span.setStatus({ code: SpanStatusCode.OK });

      return downloadUrl;
    } catch (error) {
      span.setStatus({
        code: SpanStatusCode.ERROR,
        message: error instanceof Error ? error.message : 'Unknown error',
      });
      span.recordException(error as Error);

      logger.error(
        {
          error,
          fileKey,
        },
        'Failed to generate presigned download URL'
      );

      throw new AppError(500, 'Failed to generate download URL');
    } finally {
      span.end();
    }
  }

  /**
   * Verifies if an object exists in S3 and returns its metadata
   * @param fileKey - S3 object key to verify
   * @param expectedContentType - Expected MIME type (optional validation)
   * @param expectedSize - Expected file size in bytes (optional validation, allows 1% tolerance)
   * @returns Object metadata including content type and size
   * @throws AppError(404) if object does not exist
   * @throws AppError(400) if content type or size doesn't match
   * @throws AppError(500) for other errors
   */
  async verifyObjectExists(
    fileKey: string,
    expectedContentType?: string,
    expectedSize?: number
  ): Promise<VerifyFileResult> {
    const span = tracer.startSpan('s3.verifyObjectExists');

    try {
      span.setAttributes({
        'file.key': fileKey,
        'file.bucket': this.bucket,
      });

      logger.debug(
        {
          fileKey,
          expectedContentType,
          expectedSize,
        },
        'Verifying object exists in S3'
      );

      // Create HeadObject command
      const command = new HeadObjectCommand({
        Bucket: this.bucket,
        Key: fileKey,
      });

      // Execute head request
      const response = await this.client.send(command);

      // Extract metadata
      const actualContentType = response.ContentType || 'unknown';
      const actualSize = response.ContentLength || 0;

      // Validate content type if expected
      if (expectedContentType && actualContentType !== expectedContentType) {
        span.setStatus({
          code: SpanStatusCode.ERROR,
          message: 'Content type mismatch',
        });

        logger.warn(
          {
            fileKey,
            expectedContentType,
            actualContentType,
          },
          'Content type mismatch in S3 file'
        );

        throw new AppError(
          400,
          `Content type mismatch: expected ${expectedContentType}, got ${actualContentType}`
        );
      }

      // Validate file size if expected (allow 1% tolerance for encoding differences)
      if (expectedSize) {
        const sizeTolerance = Math.max(1024, expectedSize * 0.01); // 1% or 1KB, whichever is larger
        const sizeDiff = Math.abs(actualSize - expectedSize);

        if (sizeDiff > sizeTolerance) {
          span.setStatus({
            code: SpanStatusCode.ERROR,
            message: 'File size mismatch',
          });

          logger.warn(
            {
              fileKey,
              expectedSize,
              actualSize,
              sizeDiff,
            },
            'File size mismatch in S3 file'
          );

          throw new AppError(
            400,
            `File size mismatch: expected ${expectedSize} bytes, got ${actualSize} bytes`
          );
        }
      }

      span.setStatus({ code: SpanStatusCode.OK });

      logger.debug(
        {
          fileKey,
          contentType: actualContentType,
          contentLength: actualSize,
        },
        'Object verified in S3'
      );

      return {
        exists: true,
        contentType: actualContentType,
        contentLength: actualSize,
      };
    } catch (error: any) {
      // Re-throw AppErrors as-is
      if (error instanceof AppError) {
        throw error;
      }

      // Check if it's a not found error
      if (error.name === 'NotFound' || error.$metadata?.httpStatusCode === 404) {
        span.setStatus({
          code: SpanStatusCode.ERROR,
          message: 'Object not found',
        });

        logger.warn(
          {
            fileKey,
          },
          'Object not found in S3'
        );

        throw new AppError(404, `File not found in storage: ${fileKey}`);
      }

      // Other errors
      span.setStatus({
        code: SpanStatusCode.ERROR,
        message: error instanceof Error ? error.message : 'Unknown error',
      });
      span.recordException(error as Error);

      logger.error(
        {
          error,
          fileKey,
        },
        'Failed to verify object existence in S3'
      );

      throw new AppError(500, 'Failed to verify file in storage');
    } finally {
      span.end();
    }
  }

  /**
   * Deletes an object from S3
   * @param fileKey - S3 object key to delete
   * @throws AppError if deletion fails
   */
  async deleteObject(fileKey: string): Promise<void> {
    const span = tracer.startSpan('s3.deleteObject');

    try {
      span.setAttributes({
        'file.key': fileKey,
        'file.bucket': this.bucket,
      });

      logger.info(
        {
          fileKey,
        },
        'Deleting object from S3'
      );

      // Create DeleteObject command
      const command = new DeleteObjectCommand({
        Bucket: this.bucket,
        Key: fileKey,
      });

      // Execute deletion
      await this.client.send(command);

      span.setStatus({ code: SpanStatusCode.OK });

      logger.info(
        {
          fileKey,
        },
        'Object deleted successfully from S3'
      );
    } catch (error) {
      span.setStatus({
        code: SpanStatusCode.ERROR,
        message: error instanceof Error ? error.message : 'Unknown error',
      });
      span.recordException(error as Error);

      logger.error(
        {
          error,
          fileKey,
        },
        'Failed to delete object from S3'
      );

      throw new AppError(500, 'Failed to delete file from storage');
    } finally {
      span.end();
    }
  }
}

/**
 * Export singleton instance
 */
export const s3Service = new S3Service();
