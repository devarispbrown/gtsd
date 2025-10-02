import { Counter, Histogram, register } from 'prom-client';

/**
 * Counter for photo presign requests
 * Labels:
 * - status: success | error
 */
export const photoPresignCounter = new Counter({
  name: 'photo_presign_requests_total',
  help: 'Total number of photo presign URL requests',
  labelNames: ['status'],
  registers: [register],
});

/**
 * Counter for photo uploads confirmed
 * Labels:
 * - mime_type: image/jpeg | image/png | image/heic
 */
export const photoUploadCounter = new Counter({
  name: 'photo_uploads_total',
  help: 'Total number of confirmed photo uploads',
  labelNames: ['mime_type'],
  registers: [register],
});

/**
 * Histogram for photo upload sizes in bytes
 * Buckets optimized for photo sizes (100KB to 10MB)
 */
export const photoUploadBytesHistogram = new Histogram({
  name: 'photo_upload_bytes',
  help: 'Distribution of photo upload sizes in bytes',
  buckets: [
    102400, // 100KB
    204800, // 200KB
    512000, // 500KB
    1048576, // 1MB
    2097152, // 2MB
    5242880, // 5MB
    10485760, // 10MB
  ],
  registers: [register],
});

/**
 * Helper function to increment presign request counter
 * @param status - success or error
 */
export const incrementPhotoPresign = (status: 'success' | 'error'): void => {
  photoPresignCounter.inc({ status });
};

/**
 * Helper function to increment photo upload counter
 * @param mimeType - MIME type of the uploaded photo
 */
export const incrementPhotoUpload = (mimeType: string): void => {
  photoUploadCounter.inc({ mime_type: mimeType });
};

/**
 * Helper function to record photo upload size
 * @param bytes - Size of the uploaded photo in bytes
 */
export const recordPhotoUploadBytes = (bytes: number): void => {
  photoUploadBytesHistogram.observe(bytes);
};
