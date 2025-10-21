/**
 * PhotoIntegration Component
 * Example integration component showing how to use the photo upload system
 * Can be integrated into TodayScreen or any task-related screen
 */

import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
} from 'react-native';
import PhotoPicker, { PhotoData } from './PhotoPicker';
import UploadProgressModal from './UploadProgressModal';
import PhotoGallery from './PhotoGallery';
import { usePhotoStore, usePhotosForTask, useUploadState } from '../stores/photoStore';
import { requestPhotoPermissions } from '../utils/permissions';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import { PhotoEvidenceType } from '@gtsd/shared-types';

interface PhotoIntegrationProps {
  taskId?: number;
  taskTitle?: string;
  onPhotoUploaded?: (photoId: number) => void;
}

const PhotoIntegration: React.FC<PhotoIntegrationProps> = ({
  taskId,
  taskTitle,
  onPhotoUploaded,
}) => {
  const [showPhotoPicker, setShowPhotoPicker] = useState(false);
  const [selectedEvidenceType, setSelectedEvidenceType] = useState<'before' | 'during' | 'after' | undefined>();
  const [showGallery, setShowGallery] = useState(false);

  // Store hooks
  const {
    uploadPhoto,
    fetchPhotos,
    deletePhoto,
    cancelUpload,
    retryUpload,
    resetUploadState,
  } = usePhotoStore();

  const taskPhotos = usePhotosForTask(taskId || 0);
  const {
    isUploading,
    uploadProgress,
    uploadFileName,
    uploadStatus,
    error,
  } = useUploadState();

  // Fetch photos on mount
  useEffect(() => {
    if (taskId) {
      fetchPhotos({ taskId });
    }
  }, [taskId]);

  const handleAddPhoto = useCallback(async (type?: 'before' | 'during' | 'after') => {
    // Request permissions first
    const hasPermissions = await requestPhotoPermissions();
    if (!hasPermissions) {
      Alert.alert(
        'Permissions Required',
        'Camera and photo library permissions are required to add photos.'
      );
      return;
    }

    ReactNativeHapticFeedback.trigger(
      'impactLight',
      {
        enableVibrateFallback: true,
        ignoreAndroidSystemSettings: false,
      }
    );

    setSelectedEvidenceType(type);
    setShowPhotoPicker(true);
  }, []);

  const handlePhotoSelected = useCallback(async (photo: PhotoData) => {
    setShowPhotoPicker(false);

    // Map string to enum
    const evidenceTypeMap: Record<string, PhotoEvidenceType> = {
      'before': PhotoEvidenceType.Before,
      'during': PhotoEvidenceType.During,
      'after': PhotoEvidenceType.After,
    };

    const evidenceType = selectedEvidenceType ? evidenceTypeMap[selectedEvidenceType] : undefined;

    // Upload the photo
    await uploadPhoto(
      photo,
      taskId,
      evidenceType,
      taskTitle ? `Photo for: ${taskTitle}` : undefined
    );

    // Callback when upload is complete
    if (uploadStatus === 'success' && onPhotoUploaded) {
      onPhotoUploaded(1); // In real implementation, get the actual photo ID from the store
    }
  }, [taskId, selectedEvidenceType, taskTitle, uploadPhoto, uploadStatus, onPhotoUploaded]);

  const handleDeletePhoto = useCallback(async (photoId: number) => {
    await deletePhoto(photoId);

    ReactNativeHapticFeedback.trigger(
      'notificationSuccess',
      {
        enableVibrateFallback: true,
        ignoreAndroidSystemSettings: false,
      }
    );
  }, [deletePhoto]);

  const handleRetryUpload = useCallback(() => {
    retryUpload();
  }, [retryUpload]);

  const handleDismissUpload = useCallback(() => {
    resetUploadState();
  }, [resetUploadState]);

  const getPhotoCount = (type: 'before' | 'during' | 'after') => {
    return taskPhotos.filter(p => p.metadata?.evidenceType === type).length;
  };

  return (
    <View style={styles.container}>
      {/* Quick Actions for Task Photos */}
      {taskId && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Photo Evidence</Text>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.evidenceTypes}
          >
            <TouchableOpacity
              style={styles.evidenceButton}
              onPress={() => handleAddPhoto('before')}
              accessibilityLabel="Add before photo"
              accessibilityRole="button"
            >
              <Text style={styles.evidenceIcon}>📸</Text>
              <Text style={styles.evidenceLabel}>Before</Text>
              {getPhotoCount('before') > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{getPhotoCount('before')}</Text>
                </View>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.evidenceButton}
              onPress={() => handleAddPhoto('during')}
              accessibilityLabel="Add during photo"
              accessibilityRole="button"
            >
              <Text style={styles.evidenceIcon}>🎬</Text>
              <Text style={styles.evidenceLabel}>During</Text>
              {getPhotoCount('during') > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{getPhotoCount('during')}</Text>
                </View>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.evidenceButton}
              onPress={() => handleAddPhoto('after')}
              accessibilityLabel="Add after photo"
              accessibilityRole="button"
            >
              <Text style={styles.evidenceIcon}>✅</Text>
              <Text style={styles.evidenceLabel}>After</Text>
              {getPhotoCount('after') > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{getPhotoCount('after')}</Text>
                </View>
              )}
            </TouchableOpacity>
          </ScrollView>
        </View>
      )}

      {/* General Add Photo Button */}
      <TouchableOpacity
        style={styles.addPhotoButton}
        onPress={() => handleAddPhoto()}
        accessibilityLabel="Add photo"
        accessibilityRole="button"
      >
        <Text style={styles.addPhotoIcon}>📷</Text>
        <Text style={styles.addPhotoText}>Add Photo Evidence</Text>
      </TouchableOpacity>

      {/* Photo Count Summary */}
      {taskPhotos.length > 0 && (
        <TouchableOpacity
          style={styles.photoSummary}
          onPress={() => setShowGallery(true)}
          accessibilityLabel="View photos"
          accessibilityRole="button"
        >
          <Text style={styles.photoSummaryText}>
            {taskPhotos.length} photo{taskPhotos.length !== 1 ? 's' : ''} attached
          </Text>
          <Text style={styles.viewAllText}>View All →</Text>
        </TouchableOpacity>
      )}

      {/* Photo Thumbnail Preview */}
      {taskPhotos.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.thumbnailScroll}
        >
          {taskPhotos.slice(0, 5).map((photo) => (
            <TouchableOpacity
              key={photo.id}
              style={styles.thumbnail}
              onPress={() => setShowGallery(true)}
            >
              <View style={styles.thumbnailImage}>
                <Text style={styles.thumbnailPlaceholder}>🖼️</Text>
              </View>
            </TouchableOpacity>
          ))}
          {taskPhotos.length > 5 && (
            <TouchableOpacity
              style={styles.thumbnail}
              onPress={() => setShowGallery(true)}
            >
              <View style={[styles.thumbnailImage, styles.moreThumbnail]}>
                <Text style={styles.moreText}>+{taskPhotos.length - 5}</Text>
              </View>
            </TouchableOpacity>
          )}
        </ScrollView>
      )}

      {/* Photo Picker Modal */}
      {showPhotoPicker && (
        <PhotoPicker
          onPhotoSelected={handlePhotoSelected}
          onCancel={() => setShowPhotoPicker(false)}
          taskId={taskId}
          evidenceType={selectedEvidenceType}
        />
      )}

      {/* Upload Progress Modal */}
      <UploadProgressModal
        visible={isUploading || uploadStatus !== 'idle'}
        fileName={uploadFileName}
        progress={uploadProgress}
        status={uploadStatus}
        error={error || undefined}
        onCancel={cancelUpload}
        onRetry={handleRetryUpload}
        onDismiss={handleDismissUpload}
      />

      {/* Photo Gallery Modal */}
      {showGallery && (
        <View style={styles.galleryModal}>
          <View style={styles.galleryHeader}>
            <Text style={styles.galleryTitle}>Photos</Text>
            <TouchableOpacity
              onPress={() => setShowGallery(false)}
              style={styles.closeButton}
            >
              <Text style={styles.closeButtonText}>✕</Text>
            </TouchableOpacity>
          </View>
          <PhotoGallery
            photos={taskPhotos}
            onDeletePhoto={handleDeletePhoto}
            onRefresh={() => fetchPhotos({ taskId })}
            taskId={taskId}
          />
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
    marginBottom: 12,
  },
  evidenceTypes: {
    flexDirection: 'row',
  },
  evidenceButton: {
    backgroundColor: '#F5F5F5',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginRight: 12,
    alignItems: 'center',
    minWidth: 90,
    position: 'relative',
  },
  evidenceIcon: {
    fontSize: 24,
    marginBottom: 4,
  },
  evidenceLabel: {
    fontSize: 14,
    color: '#666',
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#007AFF',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '600',
  },
  addPhotoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#007AFF',
    padding: 14,
    borderRadius: 12,
    justifyContent: 'center',
    marginBottom: 16,
  },
  addPhotoIcon: {
    fontSize: 20,
    marginRight: 8,
  },
  addPhotoText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  photoSummary: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  photoSummaryText: {
    fontSize: 14,
    color: '#000',
  },
  viewAllText: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '500',
  },
  thumbnailScroll: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  thumbnail: {
    marginRight: 8,
  },
  thumbnailImage: {
    width: 60,
    height: 60,
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  thumbnailPlaceholder: {
    fontSize: 24,
  },
  moreThumbnail: {
    backgroundColor: '#E0E0E0',
  },
  moreText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  galleryModal: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#FFF',
    zIndex: 1000,
  },
  galleryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  galleryTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#000',
  },
  closeButton: {
    padding: 4,
  },
  closeButtonText: {
    fontSize: 24,
    color: '#666',
  },
});

export default PhotoIntegration;