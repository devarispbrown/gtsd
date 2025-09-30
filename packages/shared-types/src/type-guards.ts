/**
 * Type guards for runtime type checking
 * These functions help validate data at runtime and provide type narrowing
 */

import { TaskType, TaskStatus, EvidenceType, MealType, PhotoType } from './enums';
import { DailyTask, Evidence } from './entities';
import {
  WorkoutMetadata,
  SupplementMetadata,
  MealMetadata,
  HydrationMetadata,
  CardioMetadata,
  WeightLogMetadata,
  ProgressPhotoMetadata,
  TaskMetadata,
} from './task-metadata';
import {
  WorkoutMetrics,
  WeightLogMetrics,
  CardioMetrics,
  MealMetrics,
  HydrationMetrics,
  SupplementMetrics,
  EvidenceMetrics,
} from './evidence-metrics';

// ============================================================================
// Task Type Guards
// ============================================================================

/**
 * Type guard for workout tasks
 */
export const isWorkoutTask = (
  task: DailyTask
): task is DailyTask & { taskType: TaskType.Workout } => {
  return task.taskType === TaskType.Workout;
};

/**
 * Type guard for supplement tasks
 */
export const isSupplementTask = (
  task: DailyTask
): task is DailyTask & { taskType: TaskType.Supplement } => {
  return task.taskType === TaskType.Supplement;
};

/**
 * Type guard for meal tasks
 */
export const isMealTask = (task: DailyTask): task is DailyTask & { taskType: TaskType.Meal } => {
  return task.taskType === TaskType.Meal;
};

/**
 * Type guard for hydration tasks
 */
export const isHydrationTask = (
  task: DailyTask
): task is DailyTask & { taskType: TaskType.Hydration } => {
  return task.taskType === TaskType.Hydration;
};

/**
 * Type guard for cardio tasks
 */
export const isCardioTask = (
  task: DailyTask
): task is DailyTask & { taskType: TaskType.Cardio } => {
  return task.taskType === TaskType.Cardio;
};

/**
 * Type guard for weight log tasks
 */
export const isWeightLogTask = (
  task: DailyTask
): task is DailyTask & { taskType: TaskType.WeightLog } => {
  return task.taskType === TaskType.WeightLog;
};

/**
 * Type guard for progress photo tasks
 */
export const isProgressPhotoTask = (
  task: DailyTask
): task is DailyTask & { taskType: TaskType.ProgressPhoto } => {
  return task.taskType === TaskType.ProgressPhoto;
};

// ============================================================================
// Metadata Type Guards
// ============================================================================

/**
 * Type guard for workout metadata
 */
export const isWorkoutMetadata = (
  metadata: TaskMetadata | null | undefined
): metadata is WorkoutMetadata => {
  if (!metadata) return false;
  return 'exerciseName' in metadata || 'sets' in metadata || 'reps' in metadata;
};

/**
 * Type guard for supplement metadata
 */
export const isSupplementMetadata = (
  metadata: TaskMetadata | null | undefined
): metadata is SupplementMetadata => {
  if (!metadata) return false;
  return 'supplementName' in metadata && typeof metadata.supplementName === 'string';
};

/**
 * Type guard for meal metadata
 */
export const isMealMetadata = (
  metadata: TaskMetadata | null | undefined
): metadata is MealMetadata => {
  if (!metadata) return false;
  return 'mealType' in metadata && Object.values(MealType).includes(metadata.mealType);
};

/**
 * Type guard for hydration metadata
 */
export const isHydrationMetadata = (
  metadata: TaskMetadata | null | undefined
): metadata is HydrationMetadata => {
  if (!metadata) return false;
  return 'targetAmount' in metadata && typeof metadata.targetAmount === 'number';
};

/**
 * Type guard for cardio metadata
 */
export const isCardioMetadata = (
  metadata: TaskMetadata | null | undefined
): metadata is CardioMetadata => {
  if (!metadata) return false;
  return 'activityType' in metadata && typeof metadata.activityType === 'string';
};

/**
 * Type guard for weight log metadata
 */
export const isWeightLogMetadata = (
  metadata: TaskMetadata | null | undefined
): metadata is WeightLogMetadata => {
  if (!metadata) return false;
  return 'previousWeight' in metadata || 'trackBodyFat' in metadata;
};

/**
 * Type guard for progress photo metadata
 */
export const isProgressPhotoMetadata = (
  metadata: TaskMetadata | null | undefined
): metadata is ProgressPhotoMetadata => {
  if (!metadata) return false;
  return 'photoType' in metadata && Object.values(PhotoType).includes(metadata.photoType);
};

// ============================================================================
// Evidence Metrics Type Guards
// ============================================================================

/**
 * Type guard for workout metrics
 */
export const isWorkoutMetrics = (
  metrics: EvidenceMetrics | null | undefined
): metrics is WorkoutMetrics => {
  if (!metrics) return false;
  return 'actualSets' in metrics || 'actualReps' in metrics || 'actualWeight' in metrics;
};

/**
 * Type guard for weight log metrics
 */
export const isWeightLogMetrics = (
  metrics: EvidenceMetrics | null | undefined
): metrics is WeightLogMetrics => {
  if (!metrics) return false;
  return 'weight' in metrics && typeof metrics.weight === 'number';
};

/**
 * Type guard for cardio metrics
 */
export const isCardioMetrics = (
  metrics: EvidenceMetrics | null | undefined
): metrics is CardioMetrics => {
  if (!metrics) return false;
  return (
    'duration' in metrics &&
    typeof metrics.duration === 'number' &&
    ('distance' in metrics || 'avgHeartRate' in metrics)
  );
};

/**
 * Type guard for meal metrics
 */
export const isMealMetrics = (
  metrics: EvidenceMetrics | null | undefined
): metrics is MealMetrics => {
  if (!metrics) return false;
  return 'actualCalories' in metrics && 'actualProtein' in metrics;
};

/**
 * Type guard for hydration metrics
 */
export const isHydrationMetrics = (
  metrics: EvidenceMetrics | null | undefined
): metrics is HydrationMetrics => {
  if (!metrics) return false;
  return 'amount' in metrics && typeof metrics.amount === 'number' && !('duration' in metrics);
};

/**
 * Type guard for supplement metrics
 */
export const isSupplementMetrics = (
  metrics: EvidenceMetrics | null | undefined
): metrics is SupplementMetrics => {
  if (!metrics) return false;
  return 'taken' in metrics && 'timeTaken' in metrics;
};

// ============================================================================
// Evidence Type Guards
// ============================================================================

/**
 * Type guard for text log evidence
 */
export const isTextLogEvidence = (
  evidence: Evidence
): evidence is Evidence & { evidenceType: EvidenceType.TextLog } => {
  return evidence.evidenceType === EvidenceType.TextLog;
};

/**
 * Type guard for metrics evidence
 */
export const isMetricsEvidence = (
  evidence: Evidence
): evidence is Evidence & { evidenceType: EvidenceType.Metrics } => {
  return evidence.evidenceType === EvidenceType.Metrics;
};

/**
 * Type guard for photo reference evidence
 */
export const isPhotoReferenceEvidence = (
  evidence: Evidence
): evidence is Evidence & { evidenceType: EvidenceType.PhotoReference } => {
  return evidence.evidenceType === EvidenceType.PhotoReference;
};

// ============================================================================
// Status Type Guards
// ============================================================================

/**
 * Type guard for completed tasks
 */
export const isCompletedTask = (
  task: DailyTask
): task is DailyTask & { status: TaskStatus.Completed } => {
  return task.status === TaskStatus.Completed;
};

/**
 * Type guard for pending tasks
 */
export const isPendingTask = (
  task: DailyTask
): task is DailyTask & { status: TaskStatus.Pending } => {
  return task.status === TaskStatus.Pending;
};

/**
 * Type guard for in-progress tasks
 */
export const isInProgressTask = (
  task: DailyTask
): task is DailyTask & { status: TaskStatus.InProgress } => {
  return task.status === TaskStatus.InProgress;
};

/**
 * Type guard for skipped tasks
 */
export const isSkippedTask = (
  task: DailyTask
): task is DailyTask & { status: TaskStatus.Skipped } => {
  return task.status === TaskStatus.Skipped;
};

// ============================================================================
// Utility Type Guards
// ============================================================================

/**
 * Type guard to check if a value is a valid ISO date string
 */
export const isISODateString = (value: unknown): value is string => {
  if (typeof value !== 'string') return false;
  const date = new Date(value);
  return !isNaN(date.getTime()) && date.toISOString() === value;
};

/**
 * Type guard to check if a value is a positive number
 */
export const isPositiveNumber = (value: unknown): value is number => {
  return typeof value === 'number' && value > 0 && !isNaN(value);
};

/**
 * Type guard to check if a value is a non-empty string
 */
export const isNonEmptyString = (value: unknown): value is string => {
  return typeof value === 'string' && value.trim().length > 0;
};

/**
 * Type guard to check if an object has a specific property
 */
export const hasProperty = <K extends string>(obj: unknown, key: K): obj is Record<K, unknown> => {
  return typeof obj === 'object' && obj !== null && key in obj;
};
