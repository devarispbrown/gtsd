/**
 * Permission utilities for camera and photo library access
 * Works with react-native-image-picker's built-in permission handling
 */

import { Platform, Alert, Linking, PermissionsAndroid } from 'react-native';

// Permission types
export type PermissionType = 'camera' | 'photoLibrary';

/**
 * Show alert when permission is denied with option to open settings
 */
export const showPermissionDeniedAlert = (type: PermissionType) => {
  const permissionName = type === 'camera' ? 'Camera' : 'Photo Library';
  const message = `${permissionName} access is required for this feature. Please enable it in your device settings.`;

  Alert.alert(
    `${permissionName} Permission Required`,
    message,
    [
      {
        text: 'Cancel',
        style: 'cancel',
      },
      {
        text: 'Open Settings',
        onPress: () => Linking.openSettings(),
      },
    ]
  );
};

/**
 * Request camera permission on Android
 * iOS handles permissions automatically through react-native-image-picker
 */
export const requestCameraPermission = async (): Promise<boolean> => {
  if (Platform.OS === 'ios') {
    // iOS permissions are handled by react-native-image-picker
    return true;
  }

  try {
    const granted = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.CAMERA,
      {
        title: 'Camera Permission',
        message: 'This app needs access to your camera to take photos',
        buttonNeutral: 'Ask Me Later',
        buttonNegative: 'Cancel',
        buttonPositive: 'OK',
      }
    );
    return granted === PermissionsAndroid.RESULTS.GRANTED;
  } catch (err) {
    console.warn('Camera permission error:', err);
    return false;
  }
};

/**
 * Request photo library permission on Android
 * iOS handles permissions automatically through react-native-image-picker
 */
export const requestPhotoLibraryPermission = async (): Promise<boolean> => {
  if (Platform.OS === 'ios') {
    // iOS permissions are handled by react-native-image-picker
    return true;
  }

  try {
    // Android 13 (API 33) and above use different permissions
    const permission =
      Platform.Version >= 33
        ? PermissionsAndroid.PERMISSIONS.READ_MEDIA_IMAGES
        : PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE;

    const granted = await PermissionsAndroid.request(
      permission,
      {
        title: 'Photo Library Permission',
        message: 'This app needs access to your photo library to select photos',
        buttonNeutral: 'Ask Me Later',
        buttonNegative: 'Cancel',
        buttonPositive: 'OK',
      }
    );
    return granted === PermissionsAndroid.RESULTS.GRANTED;
  } catch (err) {
    console.warn('Photo library permission error:', err);
    return false;
  }
};

/**
 * Check camera permission on Android
 */
export const checkCameraPermission = async (): Promise<boolean> => {
  if (Platform.OS === 'ios') {
    return true; // Will be checked by react-native-image-picker
  }

  try {
    const granted = await PermissionsAndroid.check(
      PermissionsAndroid.PERMISSIONS.CAMERA
    );
    return granted;
  } catch (err) {
    console.warn('Check camera permission error:', err);
    return false;
  }
};

/**
 * Check photo library permission on Android
 */
export const checkPhotoLibraryPermission = async (): Promise<boolean> => {
  if (Platform.OS === 'ios') {
    return true; // Will be checked by react-native-image-picker
  }

  try {
    const permission =
      Platform.Version >= 33
        ? PermissionsAndroid.PERMISSIONS.READ_MEDIA_IMAGES
        : PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE;

    const granted = await PermissionsAndroid.check(permission);
    return granted;
  } catch (err) {
    console.warn('Check photo library permission error:', err);
    return false;
  }
};

/**
 * Request all photo-related permissions
 */
export const requestPhotoPermissions = async (): Promise<boolean> => {
  if (Platform.OS === 'ios') {
    // iOS permissions are handled by react-native-image-picker
    return true;
  }

  const cameraGranted = await requestCameraPermission();
  const libraryGranted = await requestPhotoLibraryPermission();
  return cameraGranted && libraryGranted;
};

/**
 * Helper to handle permission flow for photo picker
 */
export const handlePhotoPickerPermissions = async (
  source: 'camera' | 'library'
): Promise<boolean> => {
  if (source === 'camera') {
    const granted = await requestCameraPermission();
    if (!granted) {
      showPermissionDeniedAlert('camera');
    }
    return granted;
  } else {
    const granted = await requestPhotoLibraryPermission();
    if (!granted) {
      showPermissionDeniedAlert('photoLibrary');
    }
    return granted;
  }
};

export default {
  requestCameraPermission,
  requestPhotoLibraryPermission,
  checkCameraPermission,
  checkPhotoLibraryPermission,
  requestPhotoPermissions,
  handlePhotoPickerPermissions,
  showPermissionDeniedAlert,
};