/**
 * Photo Store - Zustand store for photo management
 * Handles photo upload state, caching, and operations
 */

import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import photoUploadService, {
  Photo,
  PhotoMetadata,
  UploadController,
  GetPhotosQuery,
} from '../services/photoUpload';
import { PhotoEvidenceType, PhotoMimeType } from '@gtsd/shared-types';
import type { PhotoData } from '../components/PhotoPicker';

// Store types
interface PhotoStore {
  // State
  photos: Photo[];
  isUploading: boolean;
  uploadProgress: number;
  uploadFileName: string;
  uploadStatus: 'idle' | 'uploading' | 'success' | 'error' | 'cancelled';
  error: string | null;
  isLoadingPhotos: boolean;
  uploadController: UploadController | null;

  // Actions
  uploadPhoto: (
    photo: PhotoData,
    taskId?: number,
    evidenceType?: PhotoEvidenceType,
    description?: string
  ) => Promise<void>;
  fetchPhotos: (query?: GetPhotosQuery) => Promise<void>;
  deletePhoto: (photoId: number) => Promise<void>;
  cancelUpload: () => void;
  retryUpload: () => void;
  clearError: () => void;
  resetUploadState: () => void;
  clearPhotos: () => void;
}

// Cache key for offline photo viewing
const PHOTOS_CACHE_KEY = '@gtsd_photos_cache';

// Helper to cache photos for offline viewing
const cachePhotos = async (photos: Photo[]) => {
  try {
    await AsyncStorage.setItem(PHOTOS_CACHE_KEY, JSON.stringify(photos));
  } catch (error) {
    console.error('Failed to cache photos:', error);
  }
};

// Helper to load cached photos
const loadCachedPhotos = async (): Promise<Photo[]> => {
  try {
    const cached = await AsyncStorage.getItem(PHOTOS_CACHE_KEY);
    return cached ? JSON.parse(cached) : [];
  } catch (error) {
    console.error('Failed to load cached photos:', error);
    return [];
  }
};

// Store to keep last upload data for retry
let lastUploadData: {
  photo: PhotoData;
  taskId?: number;
  evidenceType?: PhotoEvidenceType;
  description?: string;
} | null = null;

export const usePhotoStore = create<PhotoStore>((set, get) => ({
  // Initial state
  photos: [],
  isUploading: false,
  uploadProgress: 0,
  uploadFileName: '',
  uploadStatus: 'idle',
  error: null,
  isLoadingPhotos: false,
  uploadController: null,

  // Upload photo with progress tracking
  uploadPhoto: async (photo, taskId, evidenceType, description) => {
    // Store data for retry
    lastUploadData = { photo, taskId, evidenceType, description };

    // Reset state
    set({
      isUploading: true,
      uploadProgress: 0,
      uploadFileName: photo.fileName,
      uploadStatus: 'uploading',
      error: null,
    });

    // Create upload controller for cancellation
    const controller = new UploadController();
    set({ uploadController: controller });

    try {
      // Prepare metadata - validate mimeType
      const validMimeType: PhotoMimeType = photo.mimeType as PhotoMimeType;

      const metadata: PhotoMetadata = {
        fileName: photo.fileName,
        mimeType: validMimeType,
        fileSize: photo.fileSize,
        width: photo.width,
        height: photo.height,
        takenAt: photo.takenAt?.toISOString(),
        taskId,
        evidenceType,
        description,
      };

      // Upload with progress tracking
      const result = await photoUploadService.uploadPhoto(
        photo.uri,
        photo.fileName,
        photo.mimeType,
        photo.fileSize,
        metadata,
        (progress) => {
          set({ uploadProgress: progress });
        },
        controller
      );

      if (result.error) {
        throw new Error(result.error);
      }

      if (result.data) {
        // Convert response to Photo type
        const newPhoto: Photo = {
          id: result.data.id,
          fileKey: result.data.fileKey,
          url: result.data.url,
          thumbnailUrl: result.data.thumbnailUrl,
          metadata: result.data.metadata,
          taskId,
          userId: 0, // Will be set by server
          fileSize: photo.fileSize,
          mimeType: validMimeType,
          width: photo.width,
          height: photo.height,
          uploadedAt: result.data.createdAt,
          createdAt: result.data.createdAt,
        };

        // Add to photos list (optimistic update)
        const updatedPhotos = [newPhoto, ...get().photos];
        set({
          photos: updatedPhotos,
          uploadStatus: 'success',
          isUploading: false,
          uploadProgress: 100,
        });

        // Cache updated photos
        await cachePhotos(updatedPhotos);

        // Clear upload data after success
        lastUploadData = null;
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Upload failed';

      // Check if cancelled
      if (errorMessage.includes('cancelled')) {
        set({
          uploadStatus: 'cancelled',
          isUploading: false,
          error: null,
        });
      } else {
        set({
          uploadStatus: 'error',
          isUploading: false,
          error: errorMessage,
        });
      }
    } finally {
      set({ uploadController: null });
    }
  },

  // Fetch photos from server
  fetchPhotos: async (query) => {
    set({ isLoadingPhotos: true, error: null });

    try {
      // Load cached photos immediately for better UX
      const cached = await loadCachedPhotos();
      if (cached.length > 0) {
        set({ photos: cached });
      }

      // Fetch fresh data from server
      const result = await photoUploadService.getPhotos(query);

      if (result.error) {
        throw new Error(result.error);
      }

      if (result.data) {
        set({ photos: result.data, isLoadingPhotos: false });

        // Update cache
        await cachePhotos(result.data);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch photos';
      set({ error: errorMessage, isLoadingPhotos: false });
    }
  },

  // Delete photo with optimistic update
  deletePhoto: async (photoId) => {
    const state = get();
    const photoToDelete = state.photos.find(p => p.id === photoId);

    if (!photoToDelete) return;

    // Optimistic update - remove from list immediately
    const updatedPhotos = state.photos.filter(p => p.id !== photoId);
    set({ photos: updatedPhotos });

    try {
      const result = await photoUploadService.deletePhoto(photoId);

      if (!result.success && result.error) {
        // Revert on error
        set({ photos: state.photos, error: result.error });
      } else {
        // Update cache on success
        await cachePhotos(updatedPhotos);
      }
    } catch (error) {
      // Revert on error
      set({
        photos: state.photos,
        error: error instanceof Error ? error.message : 'Failed to delete photo'
      });
    }
  },

  // Cancel ongoing upload
  cancelUpload: () => {
    const { uploadController } = get();
    if (uploadController) {
      uploadController.abort();
      set({
        uploadStatus: 'cancelled',
        isUploading: false,
        uploadController: null,
      });
    }
  },

  // Retry last upload
  retryUpload: () => {
    if (lastUploadData) {
      const { photo, taskId, evidenceType, description } = lastUploadData;
      get().uploadPhoto(photo, taskId, evidenceType, description);
    }
  },

  // Clear error
  clearError: () => {
    set({ error: null });
  },

  // Reset upload state
  resetUploadState: () => {
    set({
      isUploading: false,
      uploadProgress: 0,
      uploadFileName: '',
      uploadStatus: 'idle',
      error: null,
      uploadController: null,
    });
  },

  // Clear all photos
  clearPhotos: () => {
    set({ photos: [] });
  },
}));

// Selector hooks for common use cases
export const usePhotosForTask = (taskId: number) => {
  return usePhotoStore(state =>
    state.photos.filter(photo => photo.taskId === taskId)
  );
};

export const useUploadState = () => {
  return usePhotoStore(state => ({
    isUploading: state.isUploading,
    uploadProgress: state.uploadProgress,
    uploadFileName: state.uploadFileName,
    uploadStatus: state.uploadStatus,
    error: state.error,
  }));
};

export default usePhotoStore;