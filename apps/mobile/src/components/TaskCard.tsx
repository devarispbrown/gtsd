import React from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  useColorScheme,
} from 'react-native';
import { Task } from '../types/task';
import { colors } from '@constants/colors';
import { getAccessibleTouchableProps } from '@constants/accessibility';

interface TaskCardProps {
  task: Task;
  onPress: () => void;
  onComplete: () => void;
}

const TaskCard: React.FC<TaskCardProps> = ({ task, onPress, onComplete }) => {
  const isDarkMode = useColorScheme() === 'dark';
  const theme = isDarkMode ? colors.dark : colors.light;

  const priorityColor = colors.priority[task.priority];
  const isCompleted = task.status === 'completed';

  const styles = StyleSheet.create({
    container: {
      backgroundColor: theme.card,
      borderRadius: 12,
      padding: 16,
      marginVertical: 6,
      borderLeftWidth: 4,
      borderLeftColor: priorityColor,
      shadowColor: theme.text,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: isDarkMode ? 0.3 : 0.1,
      shadowRadius: 4,
      elevation: 3,
      minHeight: 44,
    },
    content: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    leftContent: {
      flex: 1,
      marginRight: 12,
    },
    title: {
      fontSize: 16,
      fontWeight: '600',
      color: isCompleted ? theme.textTertiary : theme.text,
      textDecorationLine: isCompleted ? 'line-through' : 'none',
      marginBottom: 4,
    },
    description: {
      fontSize: 14,
      color: theme.textSecondary,
      marginTop: 4,
    },
    metadata: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: 8,
      gap: 12,
    },
    metaItem: {
      fontSize: 12,
      color: theme.textTertiary,
    },
    checkbox: {
      width: 24,
      height: 24,
      borderRadius: 12,
      borderWidth: 2,
      borderColor: isCompleted ? theme.success : theme.border,
      backgroundColor: isCompleted ? theme.success : 'transparent',
      alignItems: 'center',
      justifyContent: 'center',
      // Ensure minimum tap target
      padding: 10,
      margin: -10,
    },
    checkmark: {
      color: theme.primaryText,
      fontSize: 14,
      fontWeight: 'bold',
    },
    priorityBadge: {
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: 4,
      backgroundColor: `${priorityColor}20`,
    },
    priorityText: {
      fontSize: 10,
      fontWeight: '600',
      color: priorityColor,
      textTransform: 'uppercase',
    },
  });

  const accessibilityLabel = `${task.title}. Priority: ${task.priority}. Status: ${task.status}.${
    task.description ? ` Description: ${task.description}` : ''
  }`;

  const formattedDueDate = task.dueDate
    ? new Date(task.dueDate).toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
      })
    : null;

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={onPress}
      {...getAccessibleTouchableProps(
        accessibilityLabel,
        'button',
        'Double tap to view task details'
      )}
      accessibilityState={{
        selected: false,
        disabled: false,
        checked: isCompleted,
      }}
    >
      <View style={styles.content}>
        <View style={styles.leftContent}>
          <Text style={styles.title} numberOfLines={1}>
            {task.title}
          </Text>
          {task.description && (
            <Text style={styles.description} numberOfLines={2}>
              {task.description}
            </Text>
          )}
          <View style={styles.metadata}>
            <View style={styles.priorityBadge}>
              <Text style={styles.priorityText}>{task.priority}</Text>
            </View>
            {formattedDueDate && (
              <Text style={styles.metaItem}>{formattedDueDate}</Text>
            )}
          </View>
        </View>
        <TouchableOpacity
          style={styles.checkbox}
          onPress={onComplete}
          {...getAccessibleTouchableProps(
            isCompleted ? 'Mark as incomplete' : 'Mark as complete',
            'button',
            isCompleted
              ? 'Double tap to mark task as incomplete'
              : 'Double tap to mark task as complete'
          )}
          accessibilityState={{
            checked: isCompleted,
          }}
        >
          {isCompleted && <Text style={styles.checkmark}>✓</Text>}
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
};

export default TaskCard;