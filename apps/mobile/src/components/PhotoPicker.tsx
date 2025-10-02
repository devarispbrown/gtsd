/**
 * PhotoPicker Component
 * Handles photo capture from camera and gallery selection with permissions
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Alert,
  Image,
  ActivityIndicator,
  Platform,
} from 'react-native';
import {
  launchCamera,
  launchImageLibrary,
  ImagePickerResponse,
  CameraOptions,
  ImageLibraryOptions,
  Asset,
} from 'react-native-image-picker';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';

// Types
export interface PhotoData {
  uri: string;
  fileName: string;
  mimeType: string;
  fileSize: number;
  width?: number;
  height?: number;
  takenAt?: Date;
}

interface PhotoPickerProps {
  onPhotoSelected: (photo: PhotoData) => void;
  onCancel: () => void;
  taskId?: number;
  evidenceType?: 'before' | 'during' | 'after';
  maxFileSize?: number; // in bytes, default 10MB
}

const PhotoPicker: React.FC<PhotoPickerProps> = ({
  onPhotoSelected,
  onCancel,
  taskId,
  evidenceType,
  maxFileSize = 10 * 1024 * 1024, // 10MB default
}) => {
  const [isVisible, setIsVisible] = useState(true);
  const [previewPhoto, setPreviewPhoto] = useState<PhotoData | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const hapticFeedback = useCallback((type: 'success' | 'error' | 'selection' = 'selection') => {
    const feedbackType = type === 'success'
      ? ReactNativeHapticFeedback.HapticFeedbackTypes.notificationSuccess
      : type === 'error'
      ? ReactNativeHapticFeedback.HapticFeedbackTypes.notificationError
      : ReactNativeHapticFeedback.HapticFeedbackTypes.impactLight;

    ReactNativeHapticFeedback.trigger(feedbackType, {
      enableVibrateFallback: true,
      ignoreAndroidSystemSettings: false,
    });
  }, []);

  const processImageAsset = (asset: Asset): PhotoData | null => {
    if (!asset.uri || !asset.fileName) {
      Alert.alert('Error', 'Invalid image data');
      return null;
    }

    // Check file size
    if (asset.fileSize && asset.fileSize > maxFileSize) {
      Alert.alert(
        'File Too Large',
        `Please select an image smaller than ${Math.round(maxFileSize / 1024 / 1024)}MB`
      );
      return null;
    }

    // Extract EXIF data if available
    const takenAt = asset.timestamp ? new Date(asset.timestamp) : new Date();

    return {
      uri: asset.uri,
      fileName: asset.fileName,
      mimeType: asset.type || 'image/jpeg',
      fileSize: asset.fileSize || 0,
      width: asset.width,
      height: asset.height,
      takenAt,
    };
  };

  const handleImageResponse = (response: ImagePickerResponse) => {
    setIsProcessing(false);

    if (response.didCancel) {
      return;
    }

    if (response.errorMessage) {
      hapticFeedback('error');
      Alert.alert('Error', response.errorMessage);
      return;
    }

    if (response.assets && response.assets.length > 0) {
      const photoData = processImageAsset(response.assets[0]);
      if (photoData) {
        setPreviewPhoto(photoData);
        hapticFeedback('success');
      }
    }
  };

  const openCamera = useCallback(() => {
    hapticFeedback();
    setIsProcessing(true);

    const options: CameraOptions = {
      mediaType: 'photo',
      includeBase64: false,
      maxHeight: 2000,
      maxWidth: 2000,
      quality: 0.8,
      saveToPhotos: false,
      includeExtra: true, // Include EXIF data
    };

    launchCamera(options, handleImageResponse);
  }, [hapticFeedback]);

  const openGallery = useCallback(() => {
    hapticFeedback();
    setIsProcessing(true);

    const options: ImageLibraryOptions = {
      mediaType: 'photo',
      includeBase64: false,
      maxHeight: 2000,
      maxWidth: 2000,
      quality: 0.8,
      selectionLimit: 1,
      includeExtra: true, // Include EXIF data
    };

    launchImageLibrary(options, handleImageResponse);
  }, [hapticFeedback]);

  const confirmPhoto = useCallback(() => {
    if (previewPhoto) {
      hapticFeedback('success');
      onPhotoSelected(previewPhoto);
      setIsVisible(false);
    }
  }, [previewPhoto, onPhotoSelected, hapticFeedback]);

  const retakePhoto = useCallback(() => {
    hapticFeedback();
    setPreviewPhoto(null);
  }, [hapticFeedback]);

  const handleCancel = useCallback(() => {
    hapticFeedback();
    setIsVisible(false);
    onCancel();
  }, [onCancel, hapticFeedback]);

  return (
    <Modal
      visible={isVisible}
      animationType="slide"
      transparent={true}
      onRequestClose={handleCancel}
    >
      <View style={styles.container}>
        <View style={styles.modal}>
          <View style={styles.header}>
            <Text style={styles.title}>
              {evidenceType ? `Add ${evidenceType} photo` : 'Add Photo'}
            </Text>
            <TouchableOpacity onPress={handleCancel} style={styles.closeButton}>
              <Text style={styles.closeButtonText}>✕</Text>
            </TouchableOpacity>
          </View>

          {isProcessing && (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#007AFF" />
              <Text style={styles.loadingText}>Processing image...</Text>
            </View>
          )}

          {!isProcessing && !previewPhoto && (
            <View style={styles.optionsContainer}>
              <Text style={styles.subtitle}>Choose photo source:</Text>

              <TouchableOpacity
                style={styles.optionButton}
                onPress={openCamera}
                accessibilityLabel="Take photo with camera"
                accessibilityRole="button"
              >
                <Text style={styles.optionIcon}>📷</Text>
                <Text style={styles.optionText}>Take Photo</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.optionButton}
                onPress={openGallery}
                accessibilityLabel="Choose from gallery"
                accessibilityRole="button"
              >
                <Text style={styles.optionIcon}>🖼️</Text>
                <Text style={styles.optionText}>Choose from Gallery</Text>
              </TouchableOpacity>
            </View>
          )}

          {previewPhoto && !isProcessing && (
            <View style={styles.previewContainer}>
              <Image
                source={{ uri: previewPhoto.uri }}
                style={styles.previewImage}
                resizeMode="contain"
                accessibilityLabel="Photo preview"
              />

              <View style={styles.photoInfo}>
                <Text style={styles.infoText}>
                  Size: {Math.round((previewPhoto.fileSize || 0) / 1024)}KB
                </Text>
                {previewPhoto.width && previewPhoto.height && (
                  <Text style={styles.infoText}>
                    Dimensions: {previewPhoto.width} × {previewPhoto.height}
                  </Text>
                )}
              </View>

              <View style={styles.previewActions}>
                <TouchableOpacity
                  style={[styles.actionButton, styles.retakeButton]}
                  onPress={retakePhoto}
                  accessibilityLabel="Retake photo"
                  accessibilityRole="button"
                >
                  <Text style={styles.retakeButtonText}>Retake</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.actionButton, styles.confirmButton]}
                  onPress={confirmPhoto}
                  accessibilityLabel="Use this photo"
                  accessibilityRole="button"
                >
                  <Text style={styles.confirmButtonText}>Use Photo</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modal: {
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 20,
    paddingBottom: Platform.OS === 'ios' ? 40 : 20,
    minHeight: 400,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: '#000',
  },
  closeButton: {
    padding: 5,
  },
  closeButtonText: {
    fontSize: 24,
    color: '#666',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 20,
    textAlign: 'center',
  },
  optionsContainer: {
    paddingHorizontal: 20,
  },
  optionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  optionIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  optionText: {
    fontSize: 16,
    color: '#000',
    fontWeight: '500',
  },
  previewContainer: {
    paddingHorizontal: 20,
  },
  previewImage: {
    width: '100%',
    height: 250,
    borderRadius: 12,
    backgroundColor: '#F5F5F5',
  },
  photoInfo: {
    marginTop: 12,
    paddingHorizontal: 4,
  },
  infoText: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  previewActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
    gap: 12,
  },
  actionButton: {
    flex: 1,
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  retakeButton: {
    backgroundColor: '#F5F5F5',
  },
  retakeButtonText: {
    color: '#000',
    fontSize: 16,
    fontWeight: '500',
  },
  confirmButton: {
    backgroundColor: '#007AFF',
  },
  confirmButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#666',
  },
});

export default PhotoPicker;