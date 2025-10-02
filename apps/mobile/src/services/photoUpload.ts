/**
 * Photo Upload Service
 * Handles S3 presigned URL generation and direct upload with progress tracking
 */

import apiClient, { apiRequest, handleApiError } from '../api/client';
import { Platform } from 'react-native';

// Types
export interface PresignedUrlRequest {
  fileName: string;
  contentType: string;
  fileSize: number;
}

export interface PresignedUrlResponse {
  uploadUrl: string;
  fileKey: string;
  expiresIn: number;
}

export interface PhotoMetadata {
  fileName: string;
  mimeType: string;
  fileSize: number;
  width?: number;
  height?: number;
  takenAt?: string;
  taskId?: number;
  evidenceType?: 'before' | 'during' | 'after';
  description?: string;
}

export interface PhotoConfirmRequest {
  fileKey: string;
  metadata: PhotoMetadata;
}

export interface PhotoConfirmResponse {
  id: number;
  fileKey: string;
  url: string;
  thumbnailUrl?: string;
  metadata: PhotoMetadata;
  createdAt: string;
}

export interface Photo {
  id: number;
  fileKey: string;
  url: string;
  thumbnailUrl?: string;
  metadata: PhotoMetadata;
  taskId?: number;
  userId: number;
  createdAt: string;
  updatedAt: string;
}

export interface GetPhotosQuery {
  taskId?: number;
  evidenceType?: 'before' | 'during' | 'after';
  limit?: number;
  offset?: number;
}

// Upload controller for cancellation
export class UploadController {
  private abortController: AbortController | null = null;

  abort() {
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }
  }

  getSignal(): AbortSignal | undefined {
    this.abortController = new AbortController();
    return this.abortController.signal;
  }
}

/**
 * Photo Upload Service
 */
export const photoUploadService = {
  /**
   * Request a presigned URL for S3 upload
   */
  requestPresignedUrl: async (
    fileName: string,
    contentType: string,
    fileSize: number
  ): Promise<{ data?: PresignedUrlResponse; error?: string }> => {
    try {
      const response = await apiClient.post<PresignedUrlResponse>(
        '/v1/progress/photo/presign',
        {
          fileName,
          contentType,
          fileSize,
        }
      );

      return { data: response.data };
    } catch (error) {
      return { error: handleApiError(error) };
    }
  },

  /**
   * Upload file directly to S3 using presigned URL with progress tracking
   */
  uploadToS3: async (
    uploadUrl: string,
    fileUri: string,
    contentType: string,
    onProgress?: (progress: number) => void,
    controller?: UploadController
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      // Create form data for file upload
      const formData = new FormData();

      // Platform-specific file handling
      const file: any = {
        uri: Platform.OS === 'android' ? fileUri : fileUri.replace('file://', ''),
        type: contentType,
        name: 'photo.jpg',
      };

      // For direct S3 upload, we need to use PUT with binary data
      // React Native's fetch doesn't support progress for uploads well
      // We'll use XMLHttpRequest for better progress tracking

      return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();

        // Setup progress tracking
        if (onProgress) {
          xhr.upload.onprogress = (event) => {
            if (event.lengthComputable) {
              const progress = Math.round((event.loaded / event.total) * 100);
              onProgress(progress);
            }
          };
        }

        // Setup completion handlers
        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve({ success: true });
          } else {
            resolve({
              success: false,
              error: `Upload failed with status ${xhr.status}`
            });
          }
        };

        xhr.onerror = () => {
          resolve({
            success: false,
            error: 'Network error during upload'
          });
        };

        xhr.onabort = () => {
          resolve({
            success: false,
            error: 'Upload cancelled'
          });
        };

        // Handle abort signal
        if (controller) {
          const signal = controller.getSignal();
          if (signal) {
            signal.addEventListener('abort', () => {
              xhr.abort();
            });
          }
        }

        // Read file as blob and upload
        xhr.open('PUT', uploadUrl);
        xhr.setRequestHeader('Content-Type', contentType);

        // Create blob from file URI
        fetch(fileUri)
          .then(response => response.blob())
          .then(blob => {
            xhr.send(blob);
          })
          .catch(error => {
            resolve({
              success: false,
              error: `Failed to read file: ${error.message}`
            });
          });
      });
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Upload failed'
      };
    }
  },

  /**
   * Confirm successful upload and create photo record
   */
  confirmUpload: async (
    fileKey: string,
    metadata: PhotoMetadata
  ): Promise<{ data?: PhotoConfirmResponse; error?: string }> => {
    try {
      const response = await apiClient.post<PhotoConfirmResponse>(
        '/v1/progress/photo/confirm',
        {
          fileKey,
          metadata,
        }
      );

      return { data: response.data };
    } catch (error) {
      return { error: handleApiError(error) };
    }
  },

  /**
   * Get photos with optional filters
   */
  getPhotos: async (
    query?: GetPhotosQuery
  ): Promise<{ data?: Photo[]; error?: string }> => {
    try {
      const params = new URLSearchParams();

      if (query?.taskId) params.append('taskId', query.taskId.toString());
      if (query?.evidenceType) params.append('evidenceType', query.evidenceType);
      if (query?.limit) params.append('limit', query.limit.toString());
      if (query?.offset) params.append('offset', query.offset.toString());

      const queryString = params.toString();
      const endpoint = `/v1/progress/photos${queryString ? `?${queryString}` : ''}`;

      const response = await apiClient.get<Photo[]>(endpoint);
      return { data: response.data };
    } catch (error) {
      return { error: handleApiError(error) };
    }
  },

  /**
   * Delete a photo
   */
  deletePhoto: async (photoId: number): Promise<{ success: boolean; error?: string }> => {
    try {
      await apiClient.delete(`/v1/progress/photo/${photoId}`);
      return { success: true };
    } catch (error) {
      return { success: false, error: handleApiError(error) };
    }
  },

  /**
   * Full upload flow with retry logic
   */
  uploadPhoto: async (
    fileUri: string,
    fileName: string,
    contentType: string,
    fileSize: number,
    metadata: PhotoMetadata,
    onProgress?: (progress: number) => void,
    controller?: UploadController,
    maxRetries: number = 2
  ): Promise<{ data?: PhotoConfirmResponse; error?: string }> => {
    let retryCount = 0;
    let lastError = '';

    while (retryCount <= maxRetries) {
      try {
        // Step 1: Request presigned URL
        const presignedResult = await photoUploadService.requestPresignedUrl(
          fileName,
          contentType,
          fileSize
        );

        if (presignedResult.error) {
          lastError = presignedResult.error;
          retryCount++;
          continue;
        }

        if (!presignedResult.data) {
          lastError = 'Failed to get presigned URL';
          retryCount++;
          continue;
        }

        // Step 2: Upload to S3
        const uploadResult = await photoUploadService.uploadToS3(
          presignedResult.data.uploadUrl,
          fileUri,
          contentType,
          onProgress,
          controller
        );

        if (!uploadResult.success) {
          lastError = uploadResult.error || 'Upload failed';

          // Check if it was cancelled
          if (uploadResult.error === 'Upload cancelled') {
            return { error: uploadResult.error };
          }

          retryCount++;
          continue;
        }

        // Step 3: Confirm upload
        const confirmResult = await photoUploadService.confirmUpload(
          presignedResult.data.fileKey,
          metadata
        );

        if (confirmResult.error) {
          lastError = confirmResult.error;
          retryCount++;
          continue;
        }

        // Success!
        return confirmResult;
      } catch (error) {
        lastError = error instanceof Error ? error.message : 'Unknown error';
        retryCount++;
      }
    }

    return { error: `Upload failed after ${maxRetries} retries: ${lastError}` };
  },
};

export default photoUploadService;