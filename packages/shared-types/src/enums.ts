/**
 * Shared enum types for GTSD application
 * These enums match the database schema and provide type safety across API and mobile
 */

/**
 * Plan status enum - Represents the lifecycle state of a plan
 */
export enum PlanStatus {
  Active = 'active',
  Completed = 'completed',
  Archived = 'archived',
  Draft = 'draft',
}

/**
 * Task type enum - Categorizes different types of daily tasks
 */
export enum TaskType {
  Workout = 'workout',
  Supplement = 'supplement',
  Meal = 'meal',
  Hydration = 'hydration',
  Cardio = 'cardio',
  WeightLog = 'weight_log',
  ProgressPhoto = 'progress_photo',
}

/**
 * Task status enum - Represents the current state of a task
 */
export enum TaskStatus {
  Pending = 'pending',
  InProgress = 'in_progress',
  Completed = 'completed',
  Skipped = 'skipped',
}

/**
 * Evidence type enum - Categorizes how task completion is documented
 */
export enum EvidenceType {
  TextLog = 'text_log',
  Metrics = 'metrics',
  PhotoReference = 'photo_reference',
}

/**
 * Streak type enum - Different categories for tracking streaks
 */
export enum StreakType {
  Workout = 'workout',
  Supplement = 'supplement',
  Meal = 'meal',
  Hydration = 'hydration',
  Cardio = 'cardio',
  WeightLog = 'weight_log',
  ProgressPhoto = 'progress_photo',
  Overall = 'overall',
}

/**
 * Primary goal enum - User's main fitness objective
 */
export enum PrimaryGoal {
  LoseWeight = 'lose_weight',
  GainMuscle = 'gain_muscle',
  Maintain = 'maintain',
  ImproveHealth = 'improve_health',
}

/**
 * Activity level enum - User's daily activity intensity
 */
export enum ActivityLevel {
  Sedentary = 'sedentary',
  LightlyActive = 'lightly_active',
  ModeratelyActive = 'moderately_active',
  VeryActive = 'very_active',
  ExtremelyActive = 'extremely_active',
}

/**
 * Gender enum
 */
export enum Gender {
  Male = 'male',
  Female = 'female',
  Other = 'other',
}

/**
 * Meal type enum - Categorizes meals throughout the day
 */
export enum MealType {
  Breakfast = 'breakfast',
  Lunch = 'lunch',
  Dinner = 'dinner',
  Snack = 'snack',
}

/**
 * Photo type enum - Different angles for progress photos
 */
export enum PhotoType {
  Front = 'front',
  Side = 'side',
  Back = 'back',
}

/**
 * Type guard to check if a value is a valid TaskType
 */
export const isTaskType = (value: unknown): value is TaskType => {
  return Object.values(TaskType).includes(value as TaskType);
};

/**
 * Type guard to check if a value is a valid TaskStatus
 */
export const isTaskStatus = (value: unknown): value is TaskStatus => {
  return Object.values(TaskStatus).includes(value as TaskStatus);
};

/**
 * Type guard to check if a value is a valid EvidenceType
 */
export const isEvidenceType = (value: unknown): value is EvidenceType => {
  return Object.values(EvidenceType).includes(value as EvidenceType);
};