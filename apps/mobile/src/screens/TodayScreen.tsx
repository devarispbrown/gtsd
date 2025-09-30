import React, { useCallback, useMemo } from 'react';
import {
  StyleSheet,
  Text,
  View,
  FlatList,
  ListRenderItem,
  RefreshControl,
  AccessibilityInfo,
  useColorScheme,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { TodayScreenProps } from '../types/navigation';
import { useTaskStore } from '@store/taskStore';
import { Task } from '../types/task';
import { colors } from '@constants/colors';
import TaskCard from '@components/TaskCard';
import EmptyState from '@components/EmptyState';
import FloatingActionButton from '@components/FloatingActionButton';

export const TodayScreen: React.FC<TodayScreenProps> = () => {
  const isDarkMode = useColorScheme() === 'dark';
  const theme = isDarkMode ? colors.dark : colors.light;

  const { getTodayTasks, toggleTaskComplete } = useTaskStore();
  const todayTasks = useMemo(() => getTodayTasks(), [getTodayTasks]);

  const [refreshing, setRefreshing] = React.useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    // Simulate refresh - in real app, this would sync with backend
    await new Promise(resolve => setTimeout(resolve, 1000));
    setRefreshing(false);

    // Announce refresh completion for screen readers
    AccessibilityInfo.announceForAccessibility('Tasks refreshed');
  }, []);

  const handleTaskPress = useCallback((task: Task) => {
    // Navigate to task detail or handle task interaction
    console.log('Task pressed:', task.id);
  }, []);

  const handleTaskComplete = useCallback((taskId: string) => {
    toggleTaskComplete(taskId);
    AccessibilityInfo.announceForAccessibility('Task marked as complete');
  }, [toggleTaskComplete]);

  const handleAddTask = useCallback(() => {
    // Navigate to add task screen
    console.log('Add new task');
  }, []);

  const renderTask: ListRenderItem<Task> = ({ item }) => (
    <TaskCard
      task={item}
      onPress={() => handleTaskPress(item)}
      onComplete={() => handleTaskComplete(item.id)}
    />
  );

  const keyExtractor = (item: Task) => item.id;

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.background,
    },
    header: {
      paddingHorizontal: 20,
      paddingVertical: 16,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: theme.separator,
    },
    title: {
      fontSize: 34,
      fontWeight: '700',
      color: theme.text,
      letterSpacing: 0.37,
      // Ensure large text meets 3:1 contrast ratio
      textShadowColor: isDarkMode ? 'rgba(0,0,0,0.3)' : 'rgba(255,255,255,0.3)',
      textShadowOffset: { width: 0, height: 0 },
      textShadowRadius: 0,
    },
    subtitle: {
      fontSize: 16,
      color: theme.textSecondary,
      marginTop: 4,
      letterSpacing: 0.32,
    },
    content: {
      flex: 1,
    },
    taskList: {
      paddingHorizontal: 20,
      paddingTop: 16,
    },
    statsContainer: {
      flexDirection: 'row',
      paddingHorizontal: 20,
      paddingVertical: 12,
      gap: 16,
    },
    statItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    statLabel: {
      fontSize: 14,
      color: theme.textTertiary,
      fontWeight: '500',
    },
    statValue: {
      fontSize: 16,
      color: theme.text,
      fontWeight: '600',
    },
  });

  const completedCount = todayTasks.filter(task => task.status === 'completed').length;
  const pendingCount = todayTasks.filter(task => task.status === 'pending').length;

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <View style={styles.header}>
        <Text
          style={styles.title}
          accessibilityRole="header"
          accessibilityLabel="Today"
        >
          Today
        </Text>
        <Text
          style={styles.subtitle}
          accessibilityLabel={`${new Date().toLocaleDateString('en-US', {
            weekday: 'long',
            month: 'long',
            day: 'numeric'
          })}`}
        >
          {new Date().toLocaleDateString('en-US', {
            weekday: 'long',
            month: 'long',
            day: 'numeric'
          })}
        </Text>
      </View>

      <View style={styles.statsContainer}>
        <View
          style={styles.statItem}
          accessibilityRole="text"
          accessibilityLabel={`${pendingCount} tasks pending`}
        >
          <Text style={styles.statValue}>{pendingCount}</Text>
          <Text style={styles.statLabel}>Pending</Text>
        </View>
        <View
          style={styles.statItem}
          accessibilityRole="text"
          accessibilityLabel={`${completedCount} tasks completed`}
        >
          <Text style={styles.statValue}>{completedCount}</Text>
          <Text style={styles.statLabel}>Completed</Text>
        </View>
      </View>

      <FlatList
        style={styles.content}
        contentContainerStyle={styles.taskList}
        data={todayTasks}
        renderItem={renderTask}
        keyExtractor={keyExtractor}
        ListEmptyComponent={
          <EmptyState
            title="No tasks for today"
            description="Add your first task to get started"
            actionLabel="Add Task"
            onAction={handleAddTask}
          />
        }
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={theme.primary}
            accessibilityLabel="Pull to refresh tasks"
          />
        }
        showsVerticalScrollIndicator={false}
        accessibilityRole="list"
        accessibilityLabel="Today's tasks"
      />

      <FloatingActionButton
        onPress={handleAddTask}
        accessibilityLabel="Add new task"
        accessibilityHint="Double tap to create a new task for today"
      />
    </SafeAreaView>
  );
};