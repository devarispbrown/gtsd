/**
 * Enhanced type-safe Zustand store for tasks
 * Provides strict typing with proper inference and discriminated unions
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type {
  TaskType,
  TaskStatus,
  GetTodayTasksResponse,
  LoadingState,
  TaskWithEvidence,
} from '@gtsd/shared-types';
import { api } from '../api/client';

/**
 * Task store state with discriminated union for loading states
 */
interface TaskStoreState {
  // Tasks data
  tasks: TaskWithEvidence[];
  selectedTaskId: number | null;

  // Loading states with discriminated unions
  todayTasksState: LoadingState<GetTodayTasksResponse>;

  // Computed getters
  getTodayTasks: () => TaskWithEvidence[];
  getTaskById: (id: number) => TaskWithEvidence | undefined;
  getTasksByType: (type: TaskType) => TaskWithEvidence[];
  getTasksByStatus: (status: TaskStatus) => TaskWithEvidence[];
  getCompletedTasksCount: () => number;
  getPendingTasksCount: () => number;

  // Actions
  fetchTodayTasks: (date?: string) => Promise<void>;
  selectTask: (id: number | null) => void;
  clearTasks: () => void;
  resetState: () => void;
}

/**
 * Initial state for the store
 */
const initialState = {
  tasks: [],
  selectedTaskId: null,
  todayTasksState: { status: 'idle', data: null, error: null } as LoadingState<GetTodayTasksResponse>,
};

/**
 * Enhanced task store with full type safety
 */
export const useTaskStore = create<TaskStoreState>()(
  persist(
    immer((set, get) => ({
      ...initialState,

      // Computed getters with proper type inference
      getTodayTasks: () => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        return get().tasks.filter((task) => {
          const taskDate = new Date(task.dueDate);
          return taskDate >= today && taskDate < tomorrow;
        });
      },

      getTaskById: (id: number) => {
        return get().tasks.find((task) => task.id === id);
      },

      getTasksByType: (type: TaskType) => {
        return get().tasks.filter((task) => task.taskType === type);
      },

      getTasksByStatus: (status: TaskStatus) => {
        return get().tasks.filter((task) => task.status === status);
      },

      getCompletedTasksCount: () => {
        return get().tasks.filter((task) => task.status === 'completed').length;
      },

      getPendingTasksCount: () => {
        return get().tasks.filter((task) => task.status === 'pending').length;
      },

      // Actions with proper error handling
      fetchTodayTasks: async (date?: string) => {
        set((state) => {
          state.todayTasksState = { status: 'loading', data: null, error: null };
        });

        try {
          const response = await api.tasks.getTodayTasks({
            date,
            limit: 100,
            offset: 0,
          });

          if (response.error) {
            set((state) => {
              state.todayTasksState = {
                status: 'error',
                data: null,
                error: new Error(response.error),
              };
            });
            return;
          }

          if (response.data) {
            // Extract all tasks from tasksByType
            const allTasks = Object.values(response.data.tasksByType).flat();

            set((state) => {
              state.tasks = allTasks;
              state.todayTasksState = {
                status: 'success',
                data: response.data!,
                error: null,
              };
            });
          }
        } catch (error) {
          set((state) => {
            state.todayTasksState = {
              status: 'error',
              data: null,
              error: error instanceof Error ? error : new Error('Unknown error'),
            };
          });
        }
      },

      selectTask: (id: number | null) => {
        set((state) => {
          state.selectedTaskId = id;
        });
      },

      clearTasks: () => {
        set((state) => {
          state.tasks = [];
          state.selectedTaskId = null;
        });
      },

      resetState: () => {
        set((state) => {
          Object.assign(state, initialState);
        });
      },
    })),
    {
      name: 'task-storage-enhanced',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        tasks: state.tasks,
        selectedTaskId: state.selectedTaskId,
      }),
    }
  )
);

/**
 * Selectors for accessing store state
 * These provide better performance through memoization
 */
export const taskSelectors = {
  /**
   * Select today's tasks
   */
  selectTodayTasks: (state: TaskStoreState) => state.getTodayTasks(),

  /**
   * Select task by ID
   */
  selectTaskById: (id: number) => (state: TaskStoreState) => state.getTaskById(id),

  /**
   * Select tasks by type
   */
  selectTasksByType: (type: TaskType) => (state: TaskStoreState) => state.getTasksByType(type),

  /**
   * Select tasks by status
   */
  selectTasksByStatus: (status: TaskStatus) => (state: TaskStoreState) => state.getTasksByStatus(status),

  /**
   * Select loading state
   */
  selectTodayTasksState: (state: TaskStoreState) => state.todayTasksState,

  /**
   * Select if loading
   */
  selectIsLoading: (state: TaskStoreState) => state.todayTasksState.status === 'loading',

  /**
   * Select error
   */
  selectError: (state: TaskStoreState) =>
    state.todayTasksState.status === 'error' ? state.todayTasksState.error : null,

  /**
   * Select completion stats
   */
  selectCompletionStats: (state: TaskStoreState) => ({
    completed: state.getCompletedTasksCount(),
    pending: state.getPendingTasksCount(),
    total: state.tasks.length,
    percentage:
      state.tasks.length > 0
        ? Math.round((state.getCompletedTasksCount() / state.tasks.length) * 100)
        : 0,
  }),
};

/**
 * Hook to use specific selectors
 * @example
 * const todayTasks = useTaskSelector(taskSelectors.selectTodayTasks);
 * const isLoading = useTaskSelector(taskSelectors.selectIsLoading);
 */
export const useTaskSelector = <T>(selector: (state: TaskStoreState) => T): T => {
  return useTaskStore(selector);
};