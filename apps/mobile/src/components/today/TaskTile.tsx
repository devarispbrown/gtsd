import React, { useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  useColorScheme,
} from 'react-native';
import {
  GestureHandlerRootView,
  Swipeable,
  RectButton,
} from 'react-native-gesture-handler';
import Animated, {
  FadeIn,
  FadeOut,
  Layout,
} from 'react-native-reanimated';
import HapticFeedback from 'react-native-haptic-feedback';
import { Task } from '../../types/tasks';
import { colors } from '../../constants/colors';

interface TaskTileProps {
  task: Task;
  onPress: () => void;
  onQuickComplete: () => void;
  isLast?: boolean;
  groupColor?: string;
}

export const TaskTile: React.FC<TaskTileProps> = ({
  task,
  onPress,
  onQuickComplete,
  isLast = false,
}) => {
  const isDarkMode = useColorScheme() === 'dark';
  const theme = isDarkMode ? colors.dark : colors.light;
  const swipeableRef = React.useRef<Swipeable>(null);

  const isCompleted = task.status === 'completed';
  const isSkipped = task.status === 'skipped';

  const handleComplete = useCallback(() => {
    HapticFeedback.trigger('notificationSuccess');
    onQuickComplete();
    swipeableRef.current?.close();
  }, [onQuickComplete]);

  const handleSkip = useCallback(() => {
    HapticFeedback.trigger('impactLight');
    // Skip functionality would be implemented here
    swipeableRef.current?.close();
  }, []);

  const renderRightActions = () => {
    return (
      <View style={styles.swipeActions}>
        <RectButton
          style={[styles.swipeAction, styles.skipAction]}
          onPress={handleSkip}
        >
          <Text style={styles.swipeActionText}>Skip</Text>
        </RectButton>
        <RectButton
          style={[styles.swipeAction, styles.completeAction]}
          onPress={handleComplete}
        >
          <Text style={styles.swipeActionText}>Complete</Text>
        </RectButton>
      </View>
    );
  };

  const statusIcon = () => {
    if (isCompleted) return '✓';
    if (isSkipped) return '−';
    return '○';
  };

  const styles = StyleSheet.create({
    container: {
      backgroundColor: theme.background,
    },
    content: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 12,
      paddingHorizontal: 0,
      borderBottomWidth: isLast ? 0 : StyleSheet.hairlineWidth,
      borderBottomColor: theme.separator,
    },
    statusIcon: {
      width: 24,
      height: 24,
      borderRadius: 12,
      borderWidth: 2,
      borderColor: isCompleted ? theme.success : theme.separator,
      backgroundColor: isCompleted ? theme.success : 'transparent',
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 12,
    },
    statusIconText: {
      fontSize: 14,
      fontWeight: '600',
      color: isCompleted ? '#FFFFFF' : theme.textSecondary,
    },
    taskInfo: {
      flex: 1,
      marginRight: 8,
    },
    taskTitle: {
      fontSize: 16,
      fontWeight: '500',
      color: isCompleted ? theme.textSecondary : theme.text,
      textDecorationLine: isCompleted ? 'line-through' : 'none',
    },
    taskDescription: {
      fontSize: 14,
      color: theme.textSecondary,
      marginTop: 2,
    },
    chevron: {
      fontSize: 18,
      color: theme.textTertiary,
    },
    swipeActions: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    swipeAction: {
      justifyContent: 'center',
      alignItems: 'center',
      width: 75,
      height: '100%',
    },
    skipAction: {
      backgroundColor: theme.warning,
    },
    completeAction: {
      backgroundColor: theme.success,
    },
    swipeActionText: {
      color: '#FFFFFF',
      fontSize: 14,
      fontWeight: '600',
    },
  });

  return (
    <GestureHandlerRootView>
      <Swipeable
        ref={swipeableRef}
        renderRightActions={renderRightActions}
        overshootRight={false}
        friction={2}
        rightThreshold={40}
      >
        <Animated.View
          entering={FadeIn}
          exiting={FadeOut}
          layout={Layout.springify()}
          style={styles.container}
        >
          <TouchableOpacity
            onPress={onPress}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel={`${task.title}. Status: ${task.status}`}
            accessibilityHint="Tap to view details or swipe right to complete"
          >
            <View style={styles.content}>
              <TouchableOpacity
                onPress={isCompleted ? undefined : handleComplete}
                disabled={isCompleted}
                style={styles.statusIcon}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: isCompleted }}
                accessibilityLabel="Mark as complete"
              >
                <Text style={styles.statusIconText}>{statusIcon()}</Text>
              </TouchableOpacity>

              <View style={styles.taskInfo}>
                <Text style={styles.taskTitle} numberOfLines={1}>
                  {task.title}
                </Text>

                {task.description && (
                  <Text style={styles.taskDescription} numberOfLines={2}>
                    {task.description}
                  </Text>
                )}

                {/* Task meta (timeEstimate and priority removed - not in DailyTask type) */}
              </View>

              <Text style={styles.chevron}>›</Text>
            </View>
          </TouchableOpacity>
        </Animated.View>
      </Swipeable>
    </GestureHandlerRootView>
  );
};