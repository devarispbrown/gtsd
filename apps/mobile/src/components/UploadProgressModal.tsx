/**
 * UploadProgressModal Component
 * Displays upload progress with cancel, retry, and status feedback
 */

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  Animated,
} from 'react-native';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';

interface UploadProgressModalProps {
  visible: boolean;
  fileName: string;
  progress: number;
  status: 'idle' | 'uploading' | 'success' | 'error' | 'cancelled';
  error?: string;
  onCancel?: () => void;
  onRetry?: () => void;
  onDismiss?: () => void;
  autoCloseOnSuccess?: boolean;
}

const UploadProgressModal: React.FC<UploadProgressModalProps> = ({
  visible,
  fileName,
  progress,
  status,
  error,
  onCancel,
  onRetry,
  onDismiss,
  autoCloseOnSuccess = true,
}) => {
  const [progressAnimation] = useState(new Animated.Value(0));

  useEffect(() => {
    Animated.timing(progressAnimation, {
      toValue: progress,
      duration: 300,
      useNativeDriver: false,
    }).start();
  }, [progress, progressAnimation]);

  useEffect(() => {
    if (status === 'success') {
      // Haptic feedback on success
      ReactNativeHapticFeedback.trigger(
        'notificationSuccess',
        {
          enableVibrateFallback: true,
          ignoreAndroidSystemSettings: false,
        }
      );

      if (autoCloseOnSuccess && onDismiss) {
        setTimeout(() => {
          onDismiss();
        }, 1500);
      }
    } else if (status === 'error') {
      // Haptic feedback on error
      ReactNativeHapticFeedback.trigger(
        'notificationError',
        {
          enableVibrateFallback: true,
          ignoreAndroidSystemSettings: false,
        }
      );
    }
  }, [status, autoCloseOnSuccess, onDismiss]);

  const getStatusIcon = () => {
    switch (status) {
      case 'success':
        return '✅';
      case 'error':
        return '❌';
      case 'cancelled':
        return '🚫';
      default:
        return null;
    }
  };

  const getStatusMessage = () => {
    switch (status) {
      case 'success':
        return 'Upload Complete!';
      case 'error':
        return error || 'Upload Failed';
      case 'cancelled':
        return 'Upload Cancelled';
      default:
        return `Uploading ${progress}%`;
    }
  };

  const progressWidth = progressAnimation.interpolate({
    inputRange: [0, 100],
    outputRange: ['0%', '100%'],
  });

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onDismiss}
    >
      <View style={styles.container}>
        <View style={styles.modal}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>
              {status === 'uploading' ? 'Uploading Photo' : 'Upload Status'}
            </Text>
          </View>

          {/* Status Icon */}
          {status !== 'uploading' && (
            <Text style={styles.statusIcon}>{getStatusIcon()}</Text>
          )}

          {/* File Name */}
          <Text style={styles.fileName} numberOfLines={1}>
            {fileName}
          </Text>

          {/* Progress Bar */}
          {status === 'uploading' && (
            <>
              <View style={styles.progressContainer}>
                <View style={styles.progressBar}>
                  <Animated.View
                    style={[
                      styles.progressFill,
                      { width: progressWidth },
                    ]}
                  />
                </View>
                <Text style={styles.progressText}>{progress}%</Text>
              </View>

              {/* Uploading Animation */}
              <ActivityIndicator
                size="large"
                color="#007AFF"
                style={styles.spinner}
              />
            </>
          )}

          {/* Status Message */}
          <Text
            style={[
              styles.statusMessage,
              status === 'error' && styles.errorMessage,
            ]}
          >
            {getStatusMessage()}
          </Text>

          {/* Actions */}
          <View style={styles.actions}>
            {status === 'uploading' && onCancel && (
              <TouchableOpacity
                style={[styles.button, styles.cancelButton]}
                onPress={onCancel}
                accessibilityLabel="Cancel upload"
                accessibilityRole="button"
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
            )}

            {status === 'error' && onRetry && (
              <TouchableOpacity
                style={[styles.button, styles.retryButton]}
                onPress={onRetry}
                accessibilityLabel="Retry upload"
                accessibilityRole="button"
              >
                <Text style={styles.retryButtonText}>Retry</Text>
              </TouchableOpacity>
            )}

            {(status === 'success' || status === 'error' || status === 'cancelled') &&
              onDismiss && (
                <TouchableOpacity
                  style={[styles.button, styles.dismissButton]}
                  onPress={onDismiss}
                  accessibilityLabel="Close"
                  accessibilityRole="button"
                >
                  <Text style={styles.dismissButtonText}>
                    {status === 'success' ? 'Done' : 'Close'}
                  </Text>
                </TouchableOpacity>
              )}
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modal: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 24,
    width: '85%',
    maxWidth: 360,
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 8,
      },
      android: {
        elevation: 5,
      },
    }),
  },
  header: {
    marginBottom: 20,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
    textAlign: 'center',
  },
  statusIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  fileName: {
    fontSize: 14,
    color: '#666',
    marginBottom: 20,
    paddingHorizontal: 20,
    textAlign: 'center',
  },
  progressContainer: {
    width: '100%',
    marginBottom: 20,
  },
  progressBar: {
    height: 6,
    backgroundColor: '#E5E5E5',
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#007AFF',
    borderRadius: 3,
  },
  progressText: {
    fontSize: 14,
    color: '#007AFF',
    textAlign: 'center',
    fontWeight: '600',
  },
  spinner: {
    marginBottom: 16,
  },
  statusMessage: {
    fontSize: 16,
    color: '#000',
    textAlign: 'center',
    marginBottom: 24,
    fontWeight: '500',
  },
  errorMessage: {
    color: '#FF3B30',
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
  },
  button: {
    paddingVertical: 10,
    paddingHorizontal: 24,
    borderRadius: 8,
    minWidth: 100,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#F5F5F5',
  },
  cancelButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '500',
  },
  retryButton: {
    backgroundColor: '#007AFF',
  },
  retryButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  dismissButton: {
    backgroundColor: '#007AFF',
  },
  dismissButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default UploadProgressModal;