import React, { useEffect, useCallback, useState, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  TouchableOpacity,
  AccessibilityInfo,
  useColorScheme,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoute, useFocusEffect } from '@react-navigation/native';
import Animated, {
  FadeInDown,
  FadeInUp,
  useAnimatedStyle,
  withSpring,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import HapticFeedback from 'react-native-haptic-feedback';
import { useTodayStore } from '../../stores/todayStore';
import { TaskGroup } from '../../components/today/TaskGroup';
import { StreakBadge } from '../../components/today/StreakBadge';
import { CompletionProgress } from '../../components/today/CompletionProgress';
import { TaskDetailModal } from './TaskDetailModal';
import { colors } from '../../constants/colors';
import { TASK_TYPE_COLORS } from '../../types/tasks';
import { TaskType } from '@gtsd/shared-types';
import type { TodayScreenProps } from '../../types/navigation';

export const TodayScreen: React.FC = () => {
  const route = useRoute<TodayScreenProps['route']>();
  const isDarkMode = useColorScheme() === 'dark';
  const theme = isDarkMode ? colors.dark : colors.light;
  const scrollViewRef = useRef<ScrollView>(null);

  // Store state
  const {
    taskGroups,
    streaks,
    completionRate,
    totalTasks,
    completedTasks,
    isLoading,
    isRefreshing,
    error,
    selectedTask,
    fetchTodayTasks,
    refreshTasks,
    clearError,
    setFilterType,
    filterType,
  } = useTodayStore();

  // Local state
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [selectedDate] = useState(new Date());
  const [hasHandledDeepLink, setHasHandledDeepLink] = useState(false);

  // Animation values
  const progressScale = useSharedValue(1);
  const highlightOpacity = useSharedValue(0);

  // Initial data fetch
  useEffect(() => {
    fetchTodayTasks();
  }, [fetchTodayTasks]);

  // Handle deep link parameters
  useFocusEffect(
    useCallback(() => {
      if (route.params && !hasHandledDeepLink) {
        const { reminder, scrollToTask } = route.params;

        // Handle reminder parameter
        if (reminder === 'pending') {
          // Find first incomplete task
          const firstIncompleteTask = taskGroups
            .flatMap((group) => group.tasks)
            .find((task) => !task.completedAt);

          if (firstIncompleteTask) {
            // Show notification about pending tasks
            setTimeout(() => {
              Alert.alert(
                'Pending Tasks',
                'You have pending tasks to complete today.',
                [{ text: 'OK', onPress: () => {} }],
                { cancelable: true }
              );
            }, 500);

            // Animate highlight
            highlightOpacity.value = withSequence(
              withTiming(1, { duration: 300 }),
              withTiming(0.5, { duration: 300 }),
              withTiming(1, { duration: 300 }),
              withTiming(0, { duration: 500 })
            );

            // Scroll to task after a short delay
            if (scrollToTask) {
              setTimeout(() => {
                scrollViewRef.current?.scrollTo({ y: 200, animated: true });
              }, 300);
            }
          }
        } else if (reminder === 'overdue') {
          Alert.alert(
            'Overdue Tasks',
            'You have overdue tasks that need attention.',
            [{ text: 'OK', onPress: () => {} }],
            { cancelable: true }
          );
        }

        setHasHandledDeepLink(true);
      }
    }, [route.params, hasHandledDeepLink, taskGroups, highlightOpacity])
  );

  // Reset deep link handled flag when params change
  useEffect(() => {
    setHasHandledDeepLink(false);
  }, [route.params]);

  // Handle error display
  useEffect(() => {
    if (error) {
      Alert.alert(
        'Error',
        error,
        [
          {
            text: 'Retry',
            onPress: () => {
              clearError();
              fetchTodayTasks();
            },
          },
          {
            text: 'Dismiss',
            onPress: clearError,
            style: 'cancel',
          },
        ],
        { cancelable: true }
      );
    }
  }, [error, clearError, fetchTodayTasks]);

  // Handle pull-to-refresh
  const onRefresh = useCallback(async () => {
    HapticFeedback.trigger('impactLight');
    await refreshTasks();
    AccessibilityInfo.announceForAccessibility('Tasks refreshed');
  }, [refreshTasks]);

  // Handle task selection
  const handleTaskPress = useCallback((taskId: number) => {
    HapticFeedback.trigger('selection');
    useTodayStore.getState().selectTask(taskId);
    setIsModalVisible(true);
  }, []);

  // Handle task completion from list
  const handleQuickComplete = useCallback((taskId: number) => {
    HapticFeedback.trigger('notificationSuccess');
    useTodayStore.getState().completeTask(taskId);

    // Animate progress bar
    progressScale.value = withSpring(1.1, {}, () => {
      progressScale.value = withSpring(1);
    });

    AccessibilityInfo.announceForAccessibility('Task marked as complete');
  }, [progressScale]);

  // Handle filter selection
  const handleFilterPress = useCallback((type: TaskType | null) => {
    HapticFeedback.trigger('selection');
    setFilterType(type);
    scrollViewRef.current?.scrollTo({ y: 0, animated: true });
  }, [setFilterType]);

  // Animated styles for progress
  const progressAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: progressScale.value }],
  }));

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.background,
    },
    header: {
      paddingHorizontal: 20,
      paddingTop: 16,
      paddingBottom: 12,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: theme.separator,
    },
    headerTop: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 8,
    },
    headerTitle: {
      fontSize: 34,
      fontWeight: '700',
      color: theme.text,
      letterSpacing: 0.37,
    },
    dateText: {
      fontSize: 16,
      color: theme.textSecondary,
      marginBottom: 12,
    },
    filterContainer: {
      flexDirection: 'row',
      marginTop: 12,
      gap: 8,
    },
    filterChip: {
      paddingHorizontal: 14,
      paddingVertical: 6,
      borderRadius: 16,
      backgroundColor: theme.card,
      borderWidth: 1,
      borderColor: theme.separator,
    },
    filterChipActive: {
      backgroundColor: theme.primary,
      borderColor: theme.primary,
    },
    filterText: {
      fontSize: 14,
      fontWeight: '500',
      color: theme.textSecondary,
    },
    filterTextActive: {
      color: '#FFFFFF',
    },
    content: {
      flex: 1,
    },
    scrollContent: {
      paddingBottom: 100,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: 40,
    },
    loadingText: {
      marginTop: 12,
      fontSize: 16,
      color: theme.textSecondary,
    },
    emptyContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: 40,
    },
    emptyTitle: {
      fontSize: 20,
      fontWeight: '600',
      color: theme.text,
      textAlign: 'center',
      marginBottom: 8,
    },
    emptyDescription: {
      fontSize: 16,
      color: theme.textSecondary,
      textAlign: 'center',
      lineHeight: 22,
    },
    statsContainer: {
      paddingHorizontal: 20,
      paddingVertical: 16,
      backgroundColor: theme.card,
      marginHorizontal: 20,
      marginTop: 16,
      borderRadius: 12,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: isDarkMode ? 0.3 : 0.1,
      shadowRadius: 4,
      elevation: 3,
    },
    statsRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    statItem: {
      alignItems: 'center',
    },
    statValue: {
      fontSize: 24,
      fontWeight: '700',
      color: theme.text,
    },
    statLabel: {
      fontSize: 12,
      color: theme.textSecondary,
      marginTop: 2,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
  });

  // Filter options
  const filterOptions: Array<{ label: string; value: TaskType | null }> = [
    { label: 'All', value: null },
    { label: 'Workout', value: TaskType.Workout },
    { label: 'Meals', value: TaskType.Meal },
    { label: 'Supplements', value: TaskType.Supplement },
    { label: 'Cardio', value: TaskType.Cardio },
  ];

  // Get filtered groups
  const displayGroups = filterType
    ? taskGroups.filter(group => group.type === filterType)
    : taskGroups;

  if (isLoading && !isRefreshing) {
    return (
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.primary} />
          <Text style={styles.loadingText}>Loading today's tasks...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <Text style={styles.headerTitle} accessibilityRole="header">
            Today
          </Text>
          {streaks && (
            <StreakBadge
              currentStreak={streaks.current}
              longestStreak={streaks.longest}
            />
          )}
        </View>

        <Text style={styles.dateText}>
          {selectedDate.toLocaleDateString('en-US', {
            weekday: 'long',
            month: 'long',
            day: 'numeric',
          })}
        </Text>

        <Animated.View style={progressAnimatedStyle}>
          <CompletionProgress
            completed={completedTasks}
            total={totalTasks}
            percentage={completionRate}
          />
        </Animated.View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.filterContainer}
        >
          {filterOptions.map((option) => (
            <TouchableOpacity
              key={option.value || 'all'}
              style={[
                styles.filterChip,
                filterType === option.value && styles.filterChipActive,
              ]}
              onPress={() => handleFilterPress(option.value)}
              accessibilityRole="button"
              accessibilityLabel={`Filter by ${option.label}`}
              accessibilityState={{ selected: filterType === option.value }}
            >
              <Text
                style={[
                  styles.filterText,
                  filterType === option.value && styles.filterTextActive,
                ]}
              >
                {option.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <ScrollView
        ref={scrollViewRef}
        style={styles.content}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={onRefresh}
            tintColor={theme.primary}
            accessibilityLabel="Pull to refresh tasks"
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {displayGroups.length === 0 ? (
          <Animated.View
            entering={FadeInDown.delay(200)}
            style={styles.emptyContainer}
          >
            <Text style={styles.emptyTitle}>
              {filterType ? `No ${filterType} tasks today` : 'No tasks for today'}
            </Text>
            <Text style={styles.emptyDescription}>
              {filterType
                ? `You don&apos;t have any ${filterType} tasks scheduled.`
                : 'Take a rest day or check back tomorrow!'}
            </Text>
          </Animated.View>
        ) : (
          <>
            <Animated.View
              entering={FadeInUp.delay(100)}
              style={styles.statsContainer}
            >
              <View style={styles.statsRow}>
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>{totalTasks}</Text>
                  <Text style={styles.statLabel}>Total</Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={[styles.statValue, { color: theme.success }]}>
                    {completedTasks}
                  </Text>
                  <Text style={styles.statLabel}>Done</Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={[styles.statValue, { color: theme.warning }]}>
                    {totalTasks - completedTasks}
                  </Text>
                  <Text style={styles.statLabel}>Pending</Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={[styles.statValue, { color: theme.primary }]}>
                    {Math.round(completionRate)}%
                  </Text>
                  <Text style={styles.statLabel}>Complete</Text>
                </View>
              </View>
            </Animated.View>

            {displayGroups.map((group, index) => (
              <Animated.View
                key={group.type}
                entering={FadeInDown.delay(200 + index * 50)}
              >
                <TaskGroup
                  group={group}
                  onTaskPress={handleTaskPress}
                  onQuickComplete={handleQuickComplete}
                  themeColors={TASK_TYPE_COLORS}
                />
              </Animated.View>
            ))}
          </>
        )}
      </ScrollView>

      {selectedTask && (
        <TaskDetailModal
          visible={isModalVisible}
          task={selectedTask}
          onClose={() => {
            setIsModalVisible(false);
            useTodayStore.getState().selectTask(null);
          }}
        />
      )}
    </SafeAreaView>
  );
};