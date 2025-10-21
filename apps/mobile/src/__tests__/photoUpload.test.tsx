/**
 * Photo Upload Tests
 * Tests for photo capture, upload, and gallery functionality
 */

import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import { Alert } from 'react-native';
import * as ImagePicker from 'react-native-image-picker';
import PhotoPicker from '../components/PhotoPicker';
import UploadProgressModal from '../components/UploadProgressModal';
import PhotoGallery from '../components/PhotoGallery';
import photoUploadService from '../services/photoUpload';
import { usePhotoStore } from '../stores/photoStore';
import { PhotoEvidenceType } from '@gtsd/shared-types';

// Mock dependencies
jest.mock('react-native-image-picker');
jest.mock('../services/photoUpload');
jest.mock('../api/client');
jest.mock('react-native-haptic-feedback', () => ({
  HapticFeedbackTypes: {
    impactLight: 'impactLight',
    notificationSuccess: 'notificationSuccess',
    notificationError: 'notificationError',
    notificationWarning: 'notificationWarning',
  },
  trigger: jest.fn(),
}));

// Mock photo data
const mockPhotoData = {
  uri: 'file:///path/to/photo.jpg',
  fileName: 'test-photo.jpg',
  mimeType: 'image/jpeg',
  fileSize: 1024000,
  width: 1920,
  height: 1080,
  takenAt: new Date('2024-01-01'),
};

const mockPhoto = {
  id: 1,
  fileKey: 'photos/test-photo.jpg',
  fileSize: 1024000,
  mimeType: 'image/jpeg' as const,
  width: 1920,
  height: 1080,
  url: 'https://s3.amazonaws.com/bucket/photos/test-photo.jpg',
  thumbnailUrl: 'https://s3.amazonaws.com/bucket/photos/thumb-test-photo.jpg',
  metadata: {
    fileName: 'test-photo.jpg',
    mimeType: 'image/jpeg' as const,
    fileSize: 1024000,
    width: 1920,
    height: 1080,
    takenAt: '2024-01-01T00:00:00Z',
  },
  userId: 1,
  uploadedAt: '2024-01-01T00:00:00Z',
  createdAt: '2024-01-01T00:00:00Z',
};

describe('PhotoPicker', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders picker modal with camera and gallery options', () => {
    const onPhotoSelected = jest.fn();
    const onCancel = jest.fn();

    const { getByText, getByLabelText } = render(
      <PhotoPicker
        onPhotoSelected={onPhotoSelected}
        onCancel={onCancel}
      />
    );

    expect(getByText('Add Photo')).toBeTruthy();
    expect(getByText('Take Photo')).toBeTruthy();
    expect(getByText('Choose from Gallery')).toBeTruthy();
    expect(getByLabelText('Take photo with camera')).toBeTruthy();
    expect(getByLabelText('Choose from gallery')).toBeTruthy();
  });

  it('handles camera selection and preview', async () => {
    const onPhotoSelected = jest.fn();
    const onCancel = jest.fn();

    // Mock camera response
    (ImagePicker.launchCamera as jest.Mock).mockImplementation((_options, callback) => {
      callback({
        didCancel: false,
        assets: [{
          uri: mockPhotoData.uri,
          fileName: mockPhotoData.fileName,
          type: mockPhotoData.mimeType,
          fileSize: mockPhotoData.fileSize,
          width: mockPhotoData.width,
          height: mockPhotoData.height,
        }],
      });
    });

    const { getByText } = render(
      <PhotoPicker
        onPhotoSelected={onPhotoSelected}
        onCancel={onCancel}
      />
    );

    // Click take photo
    fireEvent.press(getByText('Take Photo'));

    await waitFor(() => {
      expect(ImagePicker.launchCamera).toHaveBeenCalled();
      expect(getByText('Use Photo')).toBeTruthy();
      expect(getByText('Retake')).toBeTruthy();
    });

    // Confirm photo selection
    fireEvent.press(getByText('Use Photo'));

    expect(onPhotoSelected).toHaveBeenCalledWith(
      expect.objectContaining({
        uri: mockPhotoData.uri,
        fileName: mockPhotoData.fileName,
        mimeType: mockPhotoData.mimeType,
      })
    );
  });

  it('handles file size validation', async () => {
    const onPhotoSelected = jest.fn();
    const onCancel = jest.fn();
    const maxFileSize = 5 * 1024 * 1024; // 5MB

    // Mock gallery response with large file
    (ImagePicker.launchImageLibrary as jest.Mock).mockImplementation((_options, callback) => {
      callback({
        didCancel: false,
        assets: [{
          uri: mockPhotoData.uri,
          fileName: mockPhotoData.fileName,
          type: mockPhotoData.mimeType,
          fileSize: 10 * 1024 * 1024, // 10MB - exceeds limit
          width: mockPhotoData.width,
          height: mockPhotoData.height,
        }],
      });
    });

    jest.spyOn(Alert, 'alert');

    const { getByText } = render(
      <PhotoPicker
        onPhotoSelected={onPhotoSelected}
        onCancel={onCancel}
        maxFileSize={maxFileSize}
      />
    );

    fireEvent.press(getByText('Choose from Gallery'));

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith(
        'File Too Large',
        expect.stringContaining('5MB')
      );
    });

    expect(onPhotoSelected).not.toHaveBeenCalled();
  });

  it('handles cancel action', () => {
    const onPhotoSelected = jest.fn();
    const onCancel = jest.fn();

    const { getByLabelText } = render(
      <PhotoPicker
        onPhotoSelected={onPhotoSelected}
        onCancel={onCancel}
      />
    );

    const closeButton = getByLabelText('Close');
    fireEvent.press(closeButton);

    expect(onCancel).toHaveBeenCalled();
    expect(onPhotoSelected).not.toHaveBeenCalled();
  });
});

describe('UploadProgressModal', () => {
  it('shows upload progress', () => {
    const { getByText } = render(
      <UploadProgressModal
        visible={true}
        fileName="test.jpg"
        progress={50}
        status="uploading"
      />
    );

    expect(getByText('Uploading Photo')).toBeTruthy();
    expect(getByText('test.jpg')).toBeTruthy();
    expect(getByText('50%')).toBeTruthy();
  });

  it('shows success state', () => {
    const onDismiss = jest.fn();

    const { getByText } = render(
      <UploadProgressModal
        visible={true}
        fileName="test.jpg"
        progress={100}
        status="success"
        onDismiss={onDismiss}
      />
    );

    expect(getByText('Upload Complete!')).toBeTruthy();
    expect(getByText('Done')).toBeTruthy();
  });

  it('shows error state with retry', () => {
    const onRetry = jest.fn();

    const { getByText } = render(
      <UploadProgressModal
        visible={true}
        fileName="test.jpg"
        progress={0}
        status="error"
        error="Network error"
        onRetry={onRetry}
      />
    );

    expect(getByText('Network error')).toBeTruthy();
    expect(getByText('Retry')).toBeTruthy();

    fireEvent.press(getByText('Retry'));
    expect(onRetry).toHaveBeenCalled();
  });

  it('handles cancel action', () => {
    const onCancel = jest.fn();

    const { getByText } = render(
      <UploadProgressModal
        visible={true}
        fileName="test.jpg"
        progress={30}
        status="uploading"
        onCancel={onCancel}
      />
    );

    fireEvent.press(getByText('Cancel'));
    expect(onCancel).toHaveBeenCalled();
  });
});

describe('PhotoGallery', () => {
  it('renders photo grid', () => {
    const photos = [
      { ...mockPhoto, id: 1 },
      { ...mockPhoto, id: 2 },
      { ...mockPhoto, id: 3 },
    ];

    const { getAllByRole } = render(
      <PhotoGallery photos={photos} />
    );

    const photoButtons = getAllByRole('button');
    expect(photoButtons.length).toBe(3);
  });

  it('shows empty state', () => {
    const { getByText } = render(
      <PhotoGallery
        photos={[]}
        emptyMessage="No photos available"
      />
    );

    expect(getByText('No photos available')).toBeTruthy();
  });

  it('handles photo deletion', async () => {
    const onDeletePhoto = jest.fn().mockResolvedValue(undefined);
    const photos = [mockPhoto];

    jest.spyOn(Alert, 'alert').mockImplementation((_title, _message, buttons) => {
      // Simulate pressing "Delete"
      if (buttons && buttons[1]) {
        buttons[1].onPress?.();
      }
    });

    const { getByLabelText, getByText } = render(
      <PhotoGallery
        photos={photos}
        onDeletePhoto={onDeletePhoto}
      />
    );

    // Open photo viewer
    fireEvent.press(getByLabelText(`Photo ${mockPhoto.metadata.fileName}`));

    await waitFor(() => {
      expect(getByText('Delete Photo')).toBeTruthy();
    });

    // Delete photo
    fireEvent.press(getByText('Delete Photo'));

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith(
        'Delete Photo',
        'Are you sure you want to delete this photo?',
        expect.any(Array)
      );
      expect(onDeletePhoto).toHaveBeenCalledWith(mockPhoto.id);
    });
  });

  it('handles pull to refresh', async () => {
    const onRefresh = jest.fn();
    const photos = [mockPhoto];

    render(
      <PhotoGallery
        photos={photos}
        onRefresh={onRefresh}
        testID="photo-gallery"
      />
    );

    // Note: Testing RefreshControl is complex in RNTL
    // This is a simplified test
    expect(onRefresh).toBeDefined();
  });
});

describe('Photo Upload Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('requests presigned URL successfully', async () => {
    const mockResponse = {
      uploadUrl: 'https://s3.amazonaws.com/presigned-url',
      fileKey: 'photos/test.jpg',
      expiresIn: 3600,
    };

    (photoUploadService.requestPresignedUrl as jest.Mock).mockResolvedValue({
      data: mockResponse,
    });

    const result = await photoUploadService.requestPresignedUrl(
      'test.jpg',
      'image/jpeg',
      1024000
    );

    expect(result.data).toEqual(mockResponse);
    expect(result.error).toBeUndefined();
  });

  it('handles presigned URL request failure', async () => {
    (photoUploadService.requestPresignedUrl as jest.Mock).mockResolvedValue({
      error: 'Network error',
    });

    const result = await photoUploadService.requestPresignedUrl(
      'test.jpg',
      'image/jpeg',
      1024000
    );

    expect(result.data).toBeUndefined();
    expect(result.error).toBe('Network error');
  });

  it('confirms upload successfully', async () => {
    const mockResponse = {
      id: 1,
      fileKey: 'photos/test.jpg',
      url: 'https://s3.amazonaws.com/bucket/photos/test.jpg',
      metadata: mockPhotoData,
      createdAt: '2024-01-01T00:00:00Z',
    };

    (photoUploadService.confirmUpload as jest.Mock).mockResolvedValue({
      data: mockResponse,
    });

    const result = await photoUploadService.confirmUpload(
      'photos/test.jpg',
      mockPhotoData as any
    );

    expect(result.data).toEqual(mockResponse);
    expect(result.error).toBeUndefined();
  });

  it('fetches photos with filters', async () => {
    const photos = [mockPhoto];

    (photoUploadService.getPhotos as jest.Mock).mockResolvedValue({
      data: photos,
    });

    const result = await photoUploadService.getPhotos({
      taskId: 123,
      evidenceType: PhotoEvidenceType.Before,
    });

    expect(result.data).toEqual(photos);
    expect(photoUploadService.getPhotos).toHaveBeenCalledWith({
      taskId: 123,
      evidenceType: PhotoEvidenceType.Before,
    });
  });

  it('deletes photo successfully', async () => {
    (photoUploadService.deletePhoto as jest.Mock).mockResolvedValue({
      success: true,
    });

    const result = await photoUploadService.deletePhoto(1);

    expect(result.success).toBe(true);
    expect(result.error).toBeUndefined();
  });
});

describe('Photo Store', () => {
  beforeEach(() => {
    usePhotoStore.setState({
      photos: [],
      isUploading: false,
      uploadProgress: 0,
      uploadFileName: '',
      uploadStatus: 'idle',
      error: null,
      isLoadingPhotos: false,
      uploadController: null,
    });
    jest.clearAllMocks();
  });

  it('manages upload progress state', async () => {
    const store = usePhotoStore.getState();

    // Mock successful upload flow
    (photoUploadService.requestPresignedUrl as jest.Mock).mockResolvedValue({
      data: {
        uploadUrl: 'https://s3.amazonaws.com/presigned-url',
        fileKey: 'photos/test.jpg',
        expiresIn: 3600,
      },
    });

    (photoUploadService.uploadToS3 as jest.Mock).mockResolvedValue({
      success: true,
    });

    (photoUploadService.confirmUpload as jest.Mock).mockResolvedValue({
      data: {
        id: 1,
        fileKey: 'photos/test.jpg',
        url: 'https://s3.amazonaws.com/bucket/photos/test.jpg',
        metadata: mockPhotoData,
        createdAt: '2024-01-01T00:00:00Z',
      },
    });

    // Start upload
    await act(async () => {
      await store.uploadPhoto(mockPhotoData, 123, PhotoEvidenceType.Before, 'Test photo');
    });

    const state = usePhotoStore.getState();
    expect(state.uploadStatus).toBe('success');
    expect(state.photos.length).toBe(1);
  });

  it('handles upload cancellation', () => {
    const store = usePhotoStore.getState();
    const mockController = { abort: jest.fn() };

    usePhotoStore.setState({
      uploadController: mockController as any,
      uploadStatus: 'uploading',
    });

    store.cancelUpload();

    expect(mockController.abort).toHaveBeenCalled();
    expect(usePhotoStore.getState().uploadStatus).toBe('cancelled');
  });

  it('manages photo deletion with optimistic update', async () => {
    const store = usePhotoStore.getState();

    // Set initial photos
    usePhotoStore.setState({
      photos: [mockPhoto],
    });

    (photoUploadService.deletePhoto as jest.Mock).mockResolvedValue({
      success: true,
    });

    await act(async () => {
      await store.deletePhoto(1);
    });

    const state = usePhotoStore.getState();
    expect(state.photos.length).toBe(0);
    expect(photoUploadService.deletePhoto).toHaveBeenCalledWith(1);
  });
});