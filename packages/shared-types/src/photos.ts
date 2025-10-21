/**
 * Photo upload and progress photo types
 * Shared between API S3 operations and mobile upload service
 */

/**
 * Photo evidence type - when photos are linked to tasks
 */
export enum PhotoEvidenceType {
  Before = 'before',
  During = 'during',
  After = 'after',
}

/**
 * Allowed MIME types for photo uploads
 */
export type PhotoMimeType = 'image/jpeg' | 'image/png' | 'image/heic';

/**
 * Photo upload constraints
 */
export const PhotoConstraints = {
  MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB in bytes
  ALLOWED_MIME_TYPES: ['image/jpeg', 'image/png', 'image/heic'] as const,
  MIN_DIMENSION: 100, // pixels
  MAX_DIMENSION: 8192, // pixels
} as const;

/**
 * Request to generate a presigned S3 URL
 */
export interface PresignedUrlRequest {
  fileName: string;
  contentType: PhotoMimeType;
  fileSize: number;
}

/**
 * Response containing presigned URL for S3 upload
 */
export interface PresignedUrlResponse {
  uploadUrl: string;
  fileKey: string;
  expiresIn: number; // seconds
}

/**
 * Photo metadata attached to uploads
 */
export interface PhotoMetadata {
  fileName: string;
  mimeType: PhotoMimeType;
  fileSize: number;
  width?: number;
  height?: number;
  takenAt?: string; // ISO timestamp
  taskId?: number;
  evidenceType?: PhotoEvidenceType;
  description?: string;
}

/**
 * Request to confirm photo upload and create database record
 */
export interface PhotoConfirmRequest {
  fileKey: string;
  fileSize: number;
  contentType: PhotoMimeType;
  width?: number;
  height?: number;
  takenAt?: string; // ISO timestamp
  taskId?: number;
  evidenceType?: PhotoEvidenceType;
}

/**
 * Response after confirming photo upload
 */
export interface PhotoConfirmResponse {
  id: number;
  fileKey: string;
  url: string;
  thumbnailUrl?: string;
  metadata: PhotoMetadata;
  createdAt: string;
}

/**
 * Complete photo entity (from database)
 */
export interface Photo {
  id: number;
  userId: number;
  fileKey: string;
  fileSize: number;
  mimeType: PhotoMimeType;
  width?: number | null;
  height?: number | null;
  url?: string; // Presigned URL for viewing
  thumbnailUrl?: string;
  metadata?: PhotoMetadata;
  taskId?: number | null;
  takenAt?: Date | string | null;
  uploadedAt: Date | string;
  createdAt: Date | string;
}

/**
 * Query parameters for fetching photos
 */
export interface GetPhotosQuery {
  taskId?: number;
  evidenceType?: PhotoEvidenceType;
  limit?: number;
  offset?: number;
}

/**
 * Response for GET /v1/progress/photos
 */
export interface GetPhotosResponse {
  photos: Photo[];
  pagination: {
    limit: number;
    offset: number;
    total: number;
    hasMore: boolean;
  };
}

/**
 * Photo upload status for tracking
 */
export type PhotoUploadStatus = 'idle' | 'uploading' | 'success' | 'error' | 'cancelled';

/**
 * Upload progress state (for mobile UI)
 */
export interface PhotoUploadProgress {
  isUploading: boolean;
  progress: number; // 0-100
  fileName: string;
  status: PhotoUploadStatus;
  error?: string | null;
}

/**
 * Photo data structure from mobile picker
 */
export interface PhotoPickerData {
  uri: string;
  fileName: string;
  mimeType: PhotoMimeType;
  fileSize: number;
  width?: number;
  height?: number;
  takenAt?: Date;
}

/**
 * Task-Photo linking entity (many-to-many)
 */
export interface TaskPhotoEvidence {
  id: number;
  taskId: number;
  photoId: number;
  evidenceType: PhotoEvidenceType;
  createdAt: Date | string;
}

/**
 * Type guard to check if MIME type is allowed
 */
export const isAllowedMimeType = (mimeType: string): mimeType is PhotoMimeType => {
  return PhotoConstraints.ALLOWED_MIME_TYPES.includes(mimeType as PhotoMimeType);
};

/**
 * Type guard to check if file size is within limits
 */
export const isValidFileSize = (fileSize: number): boolean => {
  return fileSize > 0 && fileSize <= PhotoConstraints.MAX_FILE_SIZE;
};

/**
 * Type guard to check if dimensions are valid
 */
export const isValidDimensions = (width?: number, height?: number): boolean => {
  if (!width || !height) return true; // Dimensions are optional

  return (
    width >= PhotoConstraints.MIN_DIMENSION &&
    width <= PhotoConstraints.MAX_DIMENSION &&
    height >= PhotoConstraints.MIN_DIMENSION &&
    height <= PhotoConstraints.MAX_DIMENSION
  );
};
