/**
 * PhotoGallery Component
 * Grid display of photos with full-screen viewing and management
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Image,
  TouchableOpacity,
  Modal,
  Alert,
  RefreshControl,
  ActivityIndicator,
  Dimensions,
  Platform,
} from 'react-native';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import type { Photo } from '../services/photoUpload';

interface PhotoGalleryProps {
  photos: Photo[];
  isLoading?: boolean;
  onRefresh?: () => void;
  onDeletePhoto?: (photoId: number) => Promise<void>;
  onPhotoPress?: (photo: Photo) => void;
  emptyMessage?: string;
  numColumns?: number;
  showTaskFilter?: boolean;
  taskId?: number;
  testID?: string;
}

const { width: screenWidth } = Dimensions.get('window');

const PhotoGallery: React.FC<PhotoGalleryProps> = ({
  photos,
  isLoading = false,
  onRefresh,
  onDeletePhoto,
  onPhotoPress,
  emptyMessage = 'No photos yet',
  numColumns = 3,
  taskId,
}) => {
  const [refreshing, setRefreshing] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Calculate item dimensions based on columns
  const itemSize = (screenWidth - (numColumns + 1) * 8) / numColumns;

  const handleRefresh = useCallback(async () => {
    if (onRefresh) {
      setRefreshing(true);
      await onRefresh();
      setRefreshing(false);
    }
  }, [onRefresh]);

  const handlePhotoPress = useCallback((photo: Photo) => {
    ReactNativeHapticFeedback.trigger(
      'impactLight',
      {
        enableVibrateFallback: true,
        ignoreAndroidSystemSettings: false,
      }
    );

    if (onPhotoPress) {
      onPhotoPress(photo);
    } else {
      setSelectedPhoto(photo);
    }
  }, [onPhotoPress]);

  const handleDeletePhoto = useCallback(async (photo: Photo) => {
    if (!onDeletePhoto) return;

    Alert.alert(
      'Delete Photo',
      'Are you sure you want to delete this photo?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            ReactNativeHapticFeedback.trigger(
              'notificationWarning',
              {
                enableVibrateFallback: true,
                ignoreAndroidSystemSettings: false,
              }
            );

            setIsDeleting(true);
            try {
              await onDeletePhoto(photo.id);
              setSelectedPhoto(null);
              ReactNativeHapticFeedback.trigger(
                'notificationSuccess',
                {
                  enableVibrateFallback: true,
                  ignoreAndroidSystemSettings: false,
                }
              );
            } catch (error) {
              Alert.alert('Error', 'Failed to delete photo. Please try again.');
            } finally {
              setIsDeleting(false);
            }
          },
        },
      ]
    );
  }, [onDeletePhoto]);

  const renderPhoto = useCallback(({ item }: { item: Photo }) => {
    const isTaskPhoto = taskId && item.taskId === taskId;

    return (
      <TouchableOpacity
        style={[
          styles.photoItem,
          { width: itemSize, height: itemSize },
        ]}
        onPress={() => handlePhotoPress(item)}
        accessibilityLabel={`Photo ${item.metadata?.fileName || 'Unknown'}`}
        accessibilityRole="button"
      >
        <Image
          source={{ uri: item.thumbnailUrl || item.url }}
          style={styles.photoImage}
          resizeMode="cover"
        />
        {item.metadata?.evidenceType && (
          <View style={[
            styles.badge,
            item.metadata.evidenceType === 'before' && styles.beforeBadge,
            item.metadata.evidenceType === 'during' && styles.duringBadge,
            item.metadata.evidenceType === 'after' && styles.afterBadge,
          ]}>
            <Text style={styles.badgeText}>
              {item.metadata.evidenceType.charAt(0).toUpperCase()}
            </Text>
          </View>
        )}
        {isTaskPhoto && (
          <View style={styles.taskIndicator} />
        )}
      </TouchableOpacity>
    );
  }, [itemSize, taskId, handlePhotoPress]);

  const renderEmptyComponent = () => {
    if (isLoading) {
      return (
        <View style={styles.emptyContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Loading photos...</Text>
        </View>
      );
    }

    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyIcon}>📷</Text>
        <Text style={styles.emptyText}>{emptyMessage}</Text>
        {onRefresh && (
          <TouchableOpacity
            style={styles.refreshButton}
            onPress={handleRefresh}
          >
            <Text style={styles.refreshButtonText}>Refresh</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  return (
    <>
      <FlatList
        data={photos}
        renderItem={renderPhoto}
        keyExtractor={(item) => item.id.toString()}
        numColumns={numColumns}
        columnWrapperStyle={numColumns > 1 ? styles.row : undefined}
        contentContainerStyle={[
          styles.container,
          photos.length === 0 && styles.emptyListContainer,
        ]}
        refreshControl={
          onRefresh ? (
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor="#007AFF"
            />
          ) : undefined
        }
        ListEmptyComponent={renderEmptyComponent}
        showsVerticalScrollIndicator={false}
      />

      {/* Full Screen Photo Viewer */}
      <Modal
        visible={!!selectedPhoto}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setSelectedPhoto(null)}
      >
        <View style={styles.fullScreenContainer}>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={() => setSelectedPhoto(null)}
            accessibilityLabel="Close photo viewer"
            accessibilityRole="button"
          >
            <Text style={styles.closeButtonText}>✕</Text>
          </TouchableOpacity>

          {selectedPhoto && (
            <>
              <Image
                source={{ uri: selectedPhoto.url }}
                style={styles.fullScreenImage}
                resizeMode="contain"
              />

              <View style={styles.photoDetails}>
                <Text style={styles.photoFileName}>
                  {selectedPhoto.metadata?.fileName || 'Unknown'}
                </Text>
                {selectedPhoto.metadata?.description && (
                  <Text style={styles.photoDescription}>
                    {selectedPhoto.metadata.description}
                  </Text>
                )}
                <Text style={styles.photoDate}>
                  {new Date(selectedPhoto.createdAt).toLocaleDateString()}
                </Text>

                {onDeletePhoto && (
                  <TouchableOpacity
                    style={styles.deleteButton}
                    onPress={() => handleDeletePhoto(selectedPhoto)}
                    disabled={isDeleting}
                    accessibilityLabel="Delete photo"
                    accessibilityRole="button"
                  >
                    {isDeleting ? (
                      <ActivityIndicator size="small" color="#FFF" />
                    ) : (
                      <Text style={styles.deleteButtonText}>Delete Photo</Text>
                    )}
                  </TouchableOpacity>
                )}
              </View>
            </>
          )}
        </View>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingTop: 8,
  },
  emptyListContainer: {
    flex: 1,
  },
  row: {
    paddingHorizontal: 8,
  },
  photoItem: {
    margin: 4,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#F5F5F5',
  },
  photoImage: {
    width: '100%',
    height: '100%',
  },
  badge: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  beforeBadge: {
    backgroundColor: '#FF9500',
  },
  duringBadge: {
    backgroundColor: '#007AFF',
  },
  afterBadge: {
    backgroundColor: '#34C759',
  },
  badgeText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '600',
  },
  taskIndicator: {
    position: 'absolute',
    bottom: 4,
    left: 4,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#007AFF',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 80,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    marginBottom: 20,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#666',
  },
  refreshButton: {
    paddingVertical: 8,
    paddingHorizontal: 20,
    backgroundColor: '#007AFF',
    borderRadius: 8,
  },
  refreshButtonText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '500',
  },
  fullScreenContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
    justifyContent: 'center',
  },
  closeButton: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 50 : 20,
    right: 20,
    zIndex: 1,
    padding: 10,
  },
  closeButtonText: {
    color: '#FFF',
    fontSize: 28,
    fontWeight: '300',
  },
  fullScreenImage: {
    flex: 1,
    width: '100%',
  },
  photoDetails: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    padding: 20,
    paddingBottom: Platform.OS === 'ios' ? 40 : 20,
  },
  photoFileName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFF',
    marginBottom: 4,
  },
  photoDescription: {
    fontSize: 14,
    color: '#DDD',
    marginBottom: 8,
  },
  photoDate: {
    fontSize: 12,
    color: '#AAA',
    marginBottom: 16,
  },
  deleteButton: {
    backgroundColor: '#FF3B30',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
  },
  deleteButtonText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
  },
});

export default PhotoGallery;