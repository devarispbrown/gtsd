import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { subscribeWithSelector } from 'zustand/middleware';
import {
  Task,
  TaskGroup,
  TodayTasksResponse,
  StreakData,
  TasksQueryParams,
} from '../types/tasks';
import { TaskType, TaskStatus } from '@gtsd/shared-types';
import { taskApi } from '../api/taskService';
import type { GetTodayTasksResponse } from '@gtsd/shared-types';

/**
 * Transform API response to mobile UI format
 * Converts tasksByType to TaskGroup array structure
 */
const transformApiResponse = (apiResponse: GetTodayTasksResponse): TodayTasksResponse => {
  const taskGroups: TaskGroup[] = Object.entries(apiResponse.tasksByType).map(([type, tasks]) => ({
    type,
    tasks,
    completedCount: tasks.filter(t => t.status === 'completed').length,
    totalCount: tasks.length,
  }));

  return {
    tasks: taskGroups,
    streaks: apiResponse.streak,
    completionRate: apiResponse.completionPercentage,
    totalTasks: apiResponse.totalTasks,
    completedTasks: apiResponse.completedTasks,
  };
};

interface TodayState {
  // Data
  taskGroups: TaskGroup[];
  streaks: StreakData | null;
  completionRate: number;
  totalTasks: number;
  completedTasks: number;
  selectedTaskId: number | null;
  selectedTask: Task | null;

  // UI State
  isLoading: boolean;
  isRefreshing: boolean;
  error: string | null;
  lastFetchTime: number | null;

  // Filter/Query state
  currentDate: string; // YYYY-MM-DD
  filterType: TaskType | null;

  // Cache management
  cacheExpiry: number; // 5 minutes default

  // Actions
  fetchTodayTasks: (params?: TasksQueryParams) => Promise<void>;
  refreshTasks: () => Promise<void>;
  selectTask: (taskId: number | null) => void;
  updateTaskStatus: (taskId: number, status: TaskStatus) => Promise<void>;
  completeTask: (taskId: number) => Promise<void>;
  skipTask: (taskId: number, reason?: string) => Promise<void>;
  setFilterType: (type: TaskType | null) => void;
  setCurrentDate: (date: string) => void;
  clearError: () => void;

  // Optimistic updates
  optimisticUpdateTask: (taskId: number, updates: Partial<Task>) => void;
  rollbackOptimisticUpdate: (taskId: number, originalTask: Task) => void;

  // Cache helpers
  isCacheValid: () => boolean;
  clearCache: () => void;

  // Computed getters
  getTaskById: (taskId: number) => Task | undefined;
  getFilteredTasks: () => TaskGroup[];
  getPendingTasksCount: () => number;
  getCompletedTasksCount: () => number;
}

const CACHE_EXPIRY_MS = 5 * 60 * 1000; // 5 minutes

export const useTodayStore = create<TodayState>()(
  subscribeWithSelector(
    persist(
      (set, get) => ({
        // Initial state
        taskGroups: [],
        streaks: null,
        completionRate: 0,
        totalTasks: 0,
        completedTasks: 0,
        selectedTaskId: null,
        selectedTask: null,
        isLoading: false,
        isRefreshing: false,
        error: null,
        lastFetchTime: null,
        currentDate: new Date().toISOString().split('T')[0],
        filterType: null,
        cacheExpiry: CACHE_EXPIRY_MS,

        // Fetch today's tasks
        fetchTodayTasks: async (params?: TasksQueryParams) => {
          const state = get();

          // Check cache validity
          if (state.isCacheValid() && !params) {
            return;
          }

          set({ isLoading: true, error: null });

          try {
            const queryParams: TasksQueryParams = {
              date: params?.date || state.currentDate,
              type: params?.type || state.filterType || undefined,
              limit: params?.limit || 50,
              offset: params?.offset || 0,
            };

            const result = await taskApi.getTodayTasks(queryParams);

            if (result.data) {
              const transformed = transformApiResponse(result.data);
              set({
                taskGroups: transformed.tasks,
                streaks: transformed.streaks,
                completionRate: transformed.completionRate,
                totalTasks: transformed.totalTasks,
                completedTasks: transformed.completedTasks,
                lastFetchTime: Date.now(),
                isLoading: false,
              });
            } else {
              set({
                error: result.error || 'Failed to fetch tasks',
                isLoading: false,
              });
            }
          } catch (error) {
            set({
              error: 'An unexpected error occurred',
              isLoading: false,
            });
          }
        },

        // Refresh tasks (pull-to-refresh)
        refreshTasks: async () => {
          set({ isRefreshing: true });
          const state = get();

          try {
            const result = await taskApi.getTodayTasks({
              date: state.currentDate,
              type: state.filterType || undefined,
            });

            if (result.data) {
              const transformed = transformApiResponse(result.data);
              set({
                taskGroups: transformed.tasks,
                streaks: transformed.streaks,
                completionRate: transformed.completionRate,
                totalTasks: transformed.totalTasks,
                completedTasks: transformed.completedTasks,
                lastFetchTime: Date.now(),
                isRefreshing: false,
                error: null,
              });
            } else {
              set({
                error: result.error || 'Failed to refresh tasks',
                isRefreshing: false,
              });
            }
          } catch (error) {
            set({
              error: 'Failed to refresh tasks',
              isRefreshing: false,
            });
          }
        },

        // Select a task
        selectTask: (taskId: number | null) => {
          if (!taskId) {
            set({ selectedTaskId: null, selectedTask: null });
            return;
          }

          const task = get().getTaskById(taskId);
          set({ selectedTaskId: taskId, selectedTask: task || null });
        },

        // Update task status
        updateTaskStatus: async (taskId: number, status: TaskStatus) => {
          const originalTask = get().getTaskById(taskId);
          if (!originalTask) return;

          // Optimistic update
          get().optimisticUpdateTask(taskId, { status });

          try {
            const result = await taskApi.updateTaskStatus(taskId, status);

            if (result.error) {
              // Rollback on error
              get().rollbackOptimisticUpdate(taskId, originalTask);
              set({ error: result.error });
            }
          } catch (error) {
            // Rollback on error
            get().rollbackOptimisticUpdate(taskId, originalTask);
            set({ error: 'Failed to update task status' });
          }
        },

        // Complete task
        completeTask: async (taskId: number) => {
          await get().updateTaskStatus(taskId, TaskStatus.Completed);
        },

        // Skip task
        skipTask: async (taskId: number, reason?: string) => {
          const originalTask = get().getTaskById(taskId);
          if (!originalTask) return;

          // Optimistic update
          get().optimisticUpdateTask(taskId, { status: TaskStatus.Skipped });

          try {
            const result = await taskApi.skipTask(taskId, reason);

            if (result.error) {
              // Rollback on error
              get().rollbackOptimisticUpdate(taskId, originalTask);
              set({ error: result.error });
            }
          } catch (error) {
            // Rollback on error
            get().rollbackOptimisticUpdate(taskId, originalTask);
            set({ error: 'Failed to skip task' });
          }
        },

        // Optimistic update
        optimisticUpdateTask: (taskId: number, updates: Partial<Task>) => {
          set((state) => ({
            taskGroups: state.taskGroups.map((group) => ({
              ...group,
              tasks: group.tasks.map((task) =>
                task.id === taskId
                  ? { ...task, ...updates, updatedAt: new Date().toISOString() }
                  : task
              ),
              completedCount:
                updates.status === 'completed'
                  ? group.tasks.filter((t) => t.id === taskId).length > 0
                    ? group.completedCount + 1
                    : group.completedCount
                  : group.completedCount,
            })),
            completedTasks:
              updates.status === 'completed'
                ? state.completedTasks + 1
                : state.completedTasks,
            completionRate:
              updates.status === 'completed'
                ? ((state.completedTasks + 1) / state.totalTasks) * 100
                : state.completionRate,
          }));
        },

        // Rollback optimistic update
        rollbackOptimisticUpdate: (taskId: number, originalTask: Task) => {
          set((state) => ({
            taskGroups: state.taskGroups.map((group) => ({
              ...group,
              tasks: group.tasks.map((task) =>
                task.id === taskId ? originalTask : task
              ),
            })),
          }));
        },

        // Set filter type
        setFilterType: (type: TaskType | null) => {
          set({ filterType: type });
          get().fetchTodayTasks();
        },

        // Set current date
        setCurrentDate: (date: string) => {
          set({ currentDate: date });
          get().fetchTodayTasks();
        },

        // Clear error
        clearError: () => set({ error: null }),

        // Check cache validity
        isCacheValid: () => {
          const state = get();
          if (!state.lastFetchTime) return false;
          return Date.now() - state.lastFetchTime < state.cacheExpiry;
        },

        // Clear cache
        clearCache: () => {
          set({
            taskGroups: [],
            lastFetchTime: null,
          });
        },

        // Get task by ID
        getTaskById: (taskId: number) => {
          const state = get();
          for (const group of state.taskGroups) {
            const task = group.tasks.find((t) => t.id === taskId);
            if (task) return task;
          }
          return undefined;
        },

        // Get filtered tasks
        getFilteredTasks: () => {
          const state = get();
          if (!state.filterType) return state.taskGroups;

          return state.taskGroups.filter((group) => group.type === state.filterType);
        },

        // Get pending tasks count
        getPendingTasksCount: () => {
          const state = get();
          return state.taskGroups.reduce(
            (count, group) =>
              count + group.tasks.filter((t) => t.status === 'pending').length,
            0
          );
        },

        // Get completed tasks count
        getCompletedTasksCount: () => {
          const state = get();
          return state.taskGroups.reduce(
            (count, group) =>
              count + group.tasks.filter((t) => t.status === 'completed').length,
            0
          );
        },
      }),
      {
        name: 'today-tasks-storage',
        storage: createJSONStorage(() => AsyncStorage),
        partialize: (state) => ({
          taskGroups: state.taskGroups,
          streaks: state.streaks,
          completionRate: state.completionRate,
          totalTasks: state.totalTasks,
          completedTasks: state.completedTasks,
          lastFetchTime: state.lastFetchTime,
          currentDate: state.currentDate,
        }),
      }
    )
  )
);