/**
 * Re-export task types from shared-types package
 * This maintains backward compatibility while using shared types
 */
export type {
  TaskType,
  TaskStatus,
  EvidenceType,
  DailyTask,
  Evidence,
  Streak,
  TaskWithEvidence,
  GetTodayTasksQuery,
  GetTodayTasksResponse,
  CreateEvidenceRequest,
  WorkoutMetadata,
  MealMetadata,
  SupplementMetadata,
  HydrationMetadata,
  CardioMetadata,
  WeightLogMetadata,
  ProgressPhotoMetadata,
  WorkoutMetrics,
  CardioMetrics,
  MealMetrics,
  WeightLogMetrics,
  HydrationMetrics,
  SupplementMetrics,
  StreakSummary,
} from '@gtsd/shared-types';

// Re-export enums for easy access
export {
  TaskType as TaskTypeEnum,
  TaskStatus as TaskStatusEnum,
  EvidenceType as EvidenceTypeEnum,
  isWorkoutTask,
  isMealTask,
  isSupplementTask,
  isWorkoutMetadata,
  isMealMetadata,
  isSupplementMetadata,
} from '@gtsd/shared-types';

// Local UI-specific types
import { TaskType, TaskWithEvidence, StreakSummary } from '@gtsd/shared-types';

export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';

// Type aliases for backward compatibility
export type Task = TaskWithEvidence;
export type StreakData = StreakSummary;
export type TasksQueryParams = import('@gtsd/shared-types').GetTodayTasksQuery;

/**
 * Task group for UI display
 * Groups tasks by type with completion tracking
 */
export interface TaskGroup {
  type: string;
  tasks: Task[];
  completedCount: number;
  totalCount: number;
}

/**
 * Today's tasks response with grouped tasks
 * Extends API response with UI-friendly structure
 */
export interface TodayTasksResponse {
  tasks: TaskGroup[];
  streaks: StreakData;
  completionRate: number;
  totalTasks: number;
  completedTasks: number;
}

// Icon mapping for task types (UI-specific)
export const TASK_TYPE_ICONS: Record<TaskType, string> = {
  [TaskType.Workout]: 'fitness-center',
  [TaskType.Supplement]: 'medication',
  [TaskType.Meal]: 'restaurant',
  [TaskType.Hydration]: 'water-drop',
  [TaskType.Cardio]: 'directions-run',
  [TaskType.WeightLog]: 'monitor-weight',
  [TaskType.ProgressPhoto]: 'photo-camera',
};

// Color mapping for task types (UI-specific)
export const TASK_TYPE_COLORS: Record<TaskType, string> = {
  [TaskType.Workout]: '#FF6B6B',
  [TaskType.Supplement]: '#4ECDC4',
  [TaskType.Meal]: '#45B7D1',
  [TaskType.Hydration]: '#96E6B3',
  [TaskType.Cardio]: '#FFA07A',
  [TaskType.WeightLog]: '#DDA15E',
  [TaskType.ProgressPhoto]: '#BC6C25',
};