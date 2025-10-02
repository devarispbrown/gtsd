import { z } from 'zod';

/**
 * Maximum file size for uploads (10MB)
 */
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB in bytes

/**
 * Allowed MIME types for photo uploads
 */
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/heic'] as const;

/**
 * Evidence types for photo-task linking
 */
const EVIDENCE_TYPES = ['before', 'during', 'after'] as const;

/**
 * Schema for presigned URL request
 * Used to generate a presigned S3 URL for photo upload
 */
export const presignRequestSchema = z.object({
  fileName: z
    .string()
    .min(1, 'File name is required')
    .max(255, 'File name must be less than 255 characters')
    .transform((val) => val.trim()),
  contentType: z.enum(ALLOWED_MIME_TYPES, {
    errorMap: () => ({
      message: `Content type must be one of: ${ALLOWED_MIME_TYPES.join(', ')}`,
    }),
  }),
  fileSize: z
    .number()
    .int('File size must be an integer')
    .positive('File size must be positive')
    .max(MAX_FILE_SIZE, `File size must be less than ${MAX_FILE_SIZE / 1024 / 1024}MB`),
});

export type PresignRequest = z.infer<typeof presignRequestSchema>;

/**
 * Schema for photo confirmation after upload
 * Creates the photo record in the database after successful S3 upload
 */
export const confirmPhotoSchema = z.object({
  fileKey: z.string().min(1, 'File key is required'),
  fileSize: z
    .number()
    .int('File size must be an integer')
    .positive('File size must be positive')
    .max(MAX_FILE_SIZE, `File size must be less than ${MAX_FILE_SIZE / 1024 / 1024}MB`),
  contentType: z.enum(ALLOWED_MIME_TYPES, {
    errorMap: () => ({
      message: `Content type must be one of: ${ALLOWED_MIME_TYPES.join(', ')}`,
    }),
  }),
  width: z.number().int().positive().optional(),
  height: z.number().int().positive().optional(),
  takenAt: z.string().datetime().optional(),
  taskId: z.number().int().positive().optional(),
  evidenceType: z.enum(EVIDENCE_TYPES).optional(),
});

export type ConfirmPhoto = z.infer<typeof confirmPhotoSchema>;

/**
 * Schema for validating evidenceType is provided when taskId is present
 */
export const confirmPhotoWithValidation = confirmPhotoSchema.refine(
  (data) => {
    // If taskId is provided, evidenceType must also be provided
    if (data.taskId && !data.evidenceType) {
      return false;
    }
    return true;
  },
  {
    message: 'evidenceType is required when taskId is provided',
    path: ['evidenceType'],
  }
);

/**
 * Schema for querying photos
 * Used to fetch paginated list of user's photos
 */
export const getPhotosQuerySchema = z.object({
  limit: z.coerce
    .number()
    .int('Limit must be an integer')
    .positive('Limit must be positive')
    .max(100, 'Limit cannot exceed 100')
    .default(50),
  offset: z.coerce
    .number()
    .int('Offset must be an integer')
    .min(0, 'Offset cannot be negative')
    .default(0),
  taskId: z.coerce.number().int().positive().optional(),
});

export type GetPhotosQuery = z.infer<typeof getPhotosQuerySchema>;

/**
 * Schema for photo ID parameter validation
 */
export const photoIdParamSchema = z.object({
  photoId: z.coerce.number().int().positive(),
});

export type PhotoIdParam = z.infer<typeof photoIdParamSchema>;
