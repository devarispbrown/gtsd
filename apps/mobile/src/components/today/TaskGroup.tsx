import React, { useState, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  useColorScheme,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  withTiming,
  useSharedValue,
  runOnJS,
} from 'react-native-reanimated';
import { TaskGroup as TaskGroupType, Task } from '../../types/tasks';
import { TaskTile } from './TaskTile';
import { colors } from '../../constants/colors';

interface TaskGroupProps {
  group: TaskGroupType;
  onTaskPress: (taskId: number) => void;
  onQuickComplete: (taskId: number) => void;
  themeColors: Record<string, string>;
}

export const TaskGroup: React.FC<TaskGroupProps> = ({
  group,
  onTaskPress,
  onQuickComplete,
  themeColors,
}) => {
  const isDarkMode = useColorScheme() === 'dark';
  const theme = isDarkMode ? colors.dark : colors.light;

  const [isExpanded, setIsExpanded] = useState(true);
  const rotateValue = useSharedValue(0);
  const heightValue = useSharedValue(1);

  const toggleExpanded = useCallback(() => {
    const newExpanded = !isExpanded;
    setIsExpanded(newExpanded);

    rotateValue.value = withTiming(newExpanded ? 0 : -90, { duration: 200 });
    heightValue.value = withTiming(newExpanded ? 1 : 0, { duration: 200 });
  }, [isExpanded]);

  const chevronAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotateValue.value}deg` }],
  }));

  const contentAnimatedStyle = useAnimatedStyle(() => ({
    opacity: heightValue.value,
    maxHeight: heightValue.value === 0 ? 0 : undefined,
  }));

  const groupColor = themeColors[group.type] || theme.primary;
  const completionPercentage = group.totalCount > 0
    ? (group.completedCount / group.totalCount) * 100
    : 0;

  const styles = StyleSheet.create({
    container: {
      marginHorizontal: 20,
      marginTop: 16,
      backgroundColor: theme.card,
      borderRadius: 12,
      overflow: 'hidden',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: isDarkMode ? 0.3 : 0.1,
      shadowRadius: 4,
      elevation: 3,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: 16,
      borderLeftWidth: 4,
      borderLeftColor: groupColor,
    },
    headerLeft: {
      flex: 1,
    },
    headerRight: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    title: {
      fontSize: 18,
      fontWeight: '600',
      color: theme.text,
      textTransform: 'capitalize',
    },
    subtitle: {
      fontSize: 14,
      color: theme.textSecondary,
      marginTop: 2,
    },
    badge: {
      backgroundColor: groupColor + '20',
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 12,
    },
    badgeText: {
      fontSize: 12,
      fontWeight: '600',
      color: groupColor,
    },
    chevron: {
      fontSize: 20,
      color: theme.textSecondary,
    },
    progressBar: {
      height: 3,
      backgroundColor: theme.separator,
    },
    progressFill: {
      height: '100%',
      backgroundColor: groupColor,
    },
    content: {
      paddingHorizontal: 16,
      paddingBottom: 16,
    },
    taskList: {
      marginTop: 8,
    },
    emptyState: {
      padding: 20,
      alignItems: 'center',
    },
    emptyText: {
      fontSize: 14,
      color: theme.textSecondary,
      textAlign: 'center',
    },
  });

  const formatGroupTitle = (type: string) => {
    return type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity
        onPress={toggleExpanded}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel={`${formatGroupTitle(group.type)} tasks group`}
        accessibilityState={{ expanded: isExpanded }}
        accessibilityHint={`${group.completedCount} of ${group.totalCount} completed. Tap to ${isExpanded ? 'collapse' : 'expand'}`}
      >
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.title}>{formatGroupTitle(group.type)}</Text>
            <Text style={styles.subtitle}>
              {group.completedCount} of {group.totalCount} completed
            </Text>
          </View>

          <View style={styles.headerRight}>
            {completionPercentage === 100 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>Complete!</Text>
              </View>
            )}
            <Animated.Text style={[styles.chevron, chevronAnimatedStyle]}>
              ›
            </Animated.Text>
          </View>
        </View>

        <View style={styles.progressBar}>
          <View
            style={[
              styles.progressFill,
              { width: `${completionPercentage}%` }
            ]}
          />
        </View>
      </TouchableOpacity>

      <Animated.View style={[styles.content, contentAnimatedStyle]}>
        {group.tasks.length > 0 ? (
          <View style={styles.taskList}>
            {group.tasks.map((task, index) => (
              <TaskTile
                key={task.id}
                task={task}
                onPress={() => onTaskPress(task.id)}
                onQuickComplete={() => onQuickComplete(task.id)}
                isLast={index === group.tasks.length - 1}
                groupColor={groupColor}
              />
            ))}
          </View>
        ) : (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>
              No {group.type} tasks for today
            </Text>
          </View>
        )}
      </Animated.View>
    </View>
  );
};