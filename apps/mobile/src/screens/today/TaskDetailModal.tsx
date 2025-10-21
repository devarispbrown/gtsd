import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  Modal,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  useColorScheme,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, {
  FadeIn,
  FadeOut,
  SlideInDown,
  SlideOutDown,
} from 'react-native-reanimated';
import HapticFeedback from 'react-native-haptic-feedback';
import { Task } from '../../types/tasks';
import { EvidenceType } from '@gtsd/shared-types';
import { useEvidenceStore } from '../../stores/evidenceStore';
import { useTodayStore } from '../../stores/todayStore';
import { EvidenceForm } from '../../components/today/EvidenceForm';
import { colors } from '../../constants/colors';

interface TaskDetailModalProps {
  visible: boolean;
  task: Task;
  onClose: () => void;
}

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

export const TaskDetailModal: React.FC<TaskDetailModalProps> = ({
  visible,
  task,
  onClose,
}) => {
  const isDarkMode = useColorScheme() === 'dark';
  const theme = isDarkMode ? colors.dark : colors.light;
  const scrollViewRef = useRef<ScrollView>(null);

  const [selectedEvidenceType, setSelectedEvidenceType] = useState<EvidenceType>(EvidenceType.TextLog);
  const [showEvidenceForm, setShowEvidenceForm] = useState(false);

  const {
    isSubmitting,
    submitError,
    submitSuccess,
    initializeEvidence,
    submitEvidence,
    clearError,
    clearSuccess,
    resetForm,
  } = useEvidenceStore();

  const { completeTask, skipTask } = useTodayStore();

  // Initialize evidence when modal opens
  useEffect(() => {
    if (visible && task) {
      initializeEvidence(task.id, selectedEvidenceType);
    }
  }, [visible, task, selectedEvidenceType]);

  // Handle success message
  useEffect(() => {
    if (submitSuccess) {
      HapticFeedback.trigger('notificationSuccess');
      setTimeout(() => {
        clearSuccess();
        onClose();
      }, 1000);
    }
  }, [submitSuccess]);

  // Handle error message
  useEffect(() => {
    if (submitError) {
      Alert.alert('Error', submitError, [
        {
          text: 'OK',
          onPress: clearError,
        },
      ]);
    }
  }, [submitError]);

  const handleEvidenceTypeSelect = useCallback((type: EvidenceType) => {
    setSelectedEvidenceType(type);
    setShowEvidenceForm(true);
    initializeEvidence(task.id, type);
  }, [task, initializeEvidence]);

  const handleQuickComplete = useCallback(async () => {
    HapticFeedback.trigger('notificationSuccess');
    await completeTask(task.id);
    onClose();
  }, [task, completeTask, onClose]);

  const handleSkip = useCallback(async () => {
    Alert.alert(
      'Skip Task',
      'Are you sure you want to skip this task?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Skip',
          style: 'destructive',
          onPress: async () => {
            HapticFeedback.trigger('impactLight');
            await skipTask(task.id);
            onClose();
          },
        },
      ]
    );
  }, [task, skipTask, onClose]);

  const handleSubmitEvidence = useCallback(async () => {
    const success = await submitEvidence();
    if (success) {
      await completeTask(task.id);
    }
  }, [task, submitEvidence, completeTask]);

  const handleClose = useCallback(() => {
    resetForm();
    setShowEvidenceForm(false);
    onClose();
  }, [resetForm, onClose]);

  const styles = StyleSheet.create({
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'flex-end',
    },
    modalContent: {
      backgroundColor: theme.background,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      maxHeight: SCREEN_HEIGHT * 0.9,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: -2 },
      shadowOpacity: 0.25,
      shadowRadius: 10,
      elevation: 10,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: 20,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: theme.separator,
    },
    headerTitle: {
      fontSize: 20,
      fontWeight: '600',
      color: theme.text,
    },
    closeButton: {
      padding: 4,
    },
    closeButtonText: {
      fontSize: 28,
      color: theme.textSecondary,
    },
    scrollContent: {
      padding: 20,
    },
    taskSection: {
      marginBottom: 24,
    },
    taskTitle: {
      fontSize: 24,
      fontWeight: '700',
      color: theme.text,
      marginBottom: 8,
    },
    taskDescription: {
      fontSize: 16,
      color: theme.textSecondary,
      lineHeight: 22,
      marginBottom: 16,
    },
    metadataContainer: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    metadataChip: {
      backgroundColor: theme.card,
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: theme.separator,
    },
    metadataText: {
      fontSize: 14,
      color: theme.textSecondary,
    },
    evidenceSection: {
      marginBottom: 24,
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: theme.text,
      marginBottom: 12,
    },
    evidenceOptions: {
      gap: 12,
    },
    evidenceOption: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.card,
      padding: 16,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: theme.separator,
    },
    evidenceOptionSelected: {
      borderColor: theme.primary,
      backgroundColor: theme.primary + '10',
    },
    evidenceOptionIcon: {
      fontSize: 24,
      marginRight: 12,
    },
    evidenceOptionContent: {
      flex: 1,
    },
    evidenceOptionTitle: {
      fontSize: 16,
      fontWeight: '500',
      color: theme.text,
    },
    evidenceOptionDescription: {
      fontSize: 14,
      color: theme.textSecondary,
      marginTop: 2,
    },
    evidenceFormContainer: {
      marginTop: 16,
      padding: 16,
      backgroundColor: theme.card,
      borderRadius: 12,
    },
    actionButtons: {
      flexDirection: 'row',
      gap: 12,
      paddingTop: 20,
      paddingBottom: Platform.select({ ios: 0, android: 20 }),
    },
    button: {
      flex: 1,
      paddingVertical: 16,
      borderRadius: 12,
      alignItems: 'center',
    },
    skipButton: {
      backgroundColor: theme.card,
      borderWidth: 1,
      borderColor: theme.separator,
    },
    completeButton: {
      backgroundColor: theme.primary,
    },
    submitButton: {
      backgroundColor: theme.success,
    },
    buttonDisabled: {
      opacity: 0.5,
    },
    buttonText: {
      fontSize: 16,
      fontWeight: '600',
    },
    skipButtonText: {
      color: theme.text,
    },
    completeButtonText: {
      color: '#FFFFFF',
    },
    loadingOverlay: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'center',
      alignItems: 'center',
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
    },
    successMessage: {
      backgroundColor: theme.success,
      paddingHorizontal: 20,
      paddingVertical: 10,
      borderRadius: 20,
      marginTop: 10,
    },
    successMessageText: {
      color: '#FFFFFF',
      fontSize: 16,
      fontWeight: '600',
    },
  });

  const evidenceTypeOptions = [
    {
      type: EvidenceType.TextLog,
      icon: '📝',
      title: 'Text Note',
      description: 'Add a quick note about completion',
    },
    {
      type: EvidenceType.Metrics,
      icon: '📊',
      title: 'Metrics',
      description: 'Log specific numbers and data',
    },
    {
      type: EvidenceType.PhotoReference,
      icon: '📸',
      title: 'Photo',
      description: 'Take or select a photo as evidence',
    },
  ];

  if (!task) return null;

  const isCompleted = task.status === 'completed';
  const isSkipped = task.status === 'skipped';

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={handleClose}
    >
      <Animated.View
        entering={FadeIn.duration(200)}
        exiting={FadeOut.duration(200)}
        style={styles.modalOverlay}
      >
        <Animated.View
          entering={SlideInDown.duration(300)}
          exiting={SlideOutDown.duration(300)}
          style={styles.modalContent}
        >
          <SafeAreaView edges={['bottom']}>
            <View style={styles.header}>
              <Text style={styles.headerTitle}>Task Details</Text>
              <TouchableOpacity
                onPress={handleClose}
                style={styles.closeButton}
                accessibilityRole="button"
                accessibilityLabel="Close modal"
              >
                <Text style={styles.closeButtonText}>×</Text>
              </TouchableOpacity>
            </View>

            <KeyboardAvoidingView
              behavior={Platform.select({ ios: 'padding', android: undefined })}
              keyboardVerticalOffset={Platform.select({ ios: 0, android: 0 })}
            >
              <ScrollView
                ref={scrollViewRef}
                style={{ maxHeight: SCREEN_HEIGHT * 0.6 }}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
              >
                <View style={styles.taskSection}>
                  <Text style={styles.taskTitle}>{task.title}</Text>

                  {task.description && (
                    <Text style={styles.taskDescription}>{task.description}</Text>
                  )}

                  <View style={styles.metadataContainer}>
                    <View style={styles.metadataChip}>
                      <Text style={styles.metadataText}>
                        {task.taskType.replace('_', ' ')}
                      </Text>
                    </View>

                    {task.priority && (
                      <View style={styles.metadataChip}>
                        <Text style={styles.metadataText}>
                          {task.priority} priority
                        </Text>
                      </View>
                    )}
                  </View>
                </View>

                {!isCompleted && !isSkipped && (
                  <View style={styles.evidenceSection}>
                    <Text style={styles.sectionTitle}>Add Evidence</Text>

                    <View style={styles.evidenceOptions}>
                      {evidenceTypeOptions.map((option) => (
                        <TouchableOpacity
                          key={option.type}
                          style={[
                            styles.evidenceOption,
                            selectedEvidenceType === option.type &&
                              showEvidenceForm &&
                              styles.evidenceOptionSelected,
                          ]}
                          onPress={() => handleEvidenceTypeSelect(option.type)}
                          accessibilityRole="button"
                          accessibilityLabel={option.title}
                          accessibilityHint={option.description}
                        >
                          <Text style={styles.evidenceOptionIcon}>{option.icon}</Text>
                          <View style={styles.evidenceOptionContent}>
                            <Text style={styles.evidenceOptionTitle}>
                              {option.title}
                            </Text>
                            <Text style={styles.evidenceOptionDescription}>
                              {option.description}
                            </Text>
                          </View>
                        </TouchableOpacity>
                      ))}
                    </View>

                    {showEvidenceForm && (
                      <Animated.View
                        entering={FadeIn}
                        style={styles.evidenceFormContainer}
                      >
                        <EvidenceForm
                          type={selectedEvidenceType}
                          taskType={task.taskType}
                        />
                      </Animated.View>
                    )}
                  </View>
                )}

                {isCompleted && (
                  <View style={styles.evidenceSection}>
                    <Text style={styles.sectionTitle}>Task Completed</Text>
                    <Text style={styles.taskDescription}>
                      This task was completed on{' '}
                      {new Date(task.completedAt || '').toLocaleDateString()}
                    </Text>
                  </View>
                )}

                {isSkipped && (
                  <View style={styles.evidenceSection}>
                    <Text style={styles.sectionTitle}>Task Skipped</Text>
                    <Text style={styles.taskDescription}>
                      This task was skipped
                    </Text>
                  </View>
                )}

                <View style={styles.actionButtons}>
                  {!isCompleted && !isSkipped && (
                    <>
                      <TouchableOpacity
                        style={[styles.button, styles.skipButton]}
                        onPress={handleSkip}
                        accessibilityRole="button"
                        accessibilityLabel="Skip task"
                      >
                        <Text style={[styles.buttonText, styles.skipButtonText]}>
                          Skip
                        </Text>
                      </TouchableOpacity>

                      {showEvidenceForm ? (
                        <TouchableOpacity
                          style={[
                            styles.button,
                            styles.submitButton,
                            isSubmitting && styles.buttonDisabled,
                          ]}
                          onPress={handleSubmitEvidence}
                          disabled={isSubmitting}
                          accessibilityRole="button"
                          accessibilityLabel="Submit evidence and complete"
                        >
                          <Text style={[styles.buttonText, styles.completeButtonText]}>
                            {isSubmitting ? 'Submitting...' : 'Submit & Complete'}
                          </Text>
                        </TouchableOpacity>
                      ) : (
                        <TouchableOpacity
                          style={[styles.button, styles.completeButton]}
                          onPress={handleQuickComplete}
                          accessibilityRole="button"
                          accessibilityLabel="Mark as complete"
                        >
                          <Text style={[styles.buttonText, styles.completeButtonText]}>
                            Mark Complete
                          </Text>
                        </TouchableOpacity>
                      )}
                    </>
                  )}
                </View>
              </ScrollView>
            </KeyboardAvoidingView>

            {isSubmitting && (
              <View style={styles.loadingOverlay}>
                <ActivityIndicator size="large" color="#FFFFFF" />
              </View>
            )}

            {submitSuccess && (
              <Animated.View
                entering={FadeIn}
                exiting={FadeOut}
                style={styles.successMessage}
              >
                <Text style={styles.successMessageText}>
                  Task completed successfully!
                </Text>
              </Animated.View>
            )}
          </SafeAreaView>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
};