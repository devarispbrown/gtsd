/**
 * Task metadata types for different task types
 * These provide strict typing for the flexible JSON metadata field
 */

import { MealType, PhotoType } from './enums';

/**
 * Base metadata interface that all task metadata types extend
 */
export interface BaseTaskMetadata {
  notes?: string;
  customFields?: Record<string, unknown>;
}

/**
 * Workout task metadata
 */
export interface WorkoutMetadata extends BaseTaskMetadata {
  exerciseName?: string;
  sets?: number;
  reps?: number;
  weight?: number; // kg
  duration?: number; // minutes
  restBetweenSets?: number; // seconds
  targetMuscleGroup?: string;
}

/**
 * Supplement task metadata
 */
export interface SupplementMetadata extends BaseTaskMetadata {
  supplementName: string;
  dosage: string;
  timing?: string; // e.g., "with breakfast", "before bed"
  instructions?: string;
}

/**
 * Meal task metadata
 */
export interface MealMetadata extends BaseTaskMetadata {
  mealType: MealType;
  targetCalories?: number;
  targetProtein?: number; // grams
  targetCarbs?: number; // grams
  targetFat?: number; // grams
  recipeName?: string;
  mealPlanUrl?: string;
}

/**
 * Hydration task metadata
 */
export interface HydrationMetadata extends BaseTaskMetadata {
  targetAmount: number; // ml
  completedAmount?: number; // ml
  reminderInterval?: number; // minutes
}

/**
 * Cardio task metadata
 */
export interface CardioMetadata extends BaseTaskMetadata {
  activityType: string; // running, cycling, swimming, etc.
  targetDuration?: number; // minutes
  targetDistance?: number; // km
  targetHeartRate?: number; // bpm
  targetCalories?: number;
}

/**
 * Weight log task metadata
 */
export interface WeightLogMetadata extends BaseTaskMetadata {
  previousWeight?: number; // kg
  targetWeight?: number; // kg
  trackBodyFat?: boolean;
  trackMuscleMass?: boolean;
}

/**
 * Progress photo task metadata
 */
export interface ProgressPhotoMetadata extends BaseTaskMetadata {
  photoType: PhotoType;
  instructions?: string;
  requiredAngles?: PhotoType[];
}

/**
 * Discriminated union type for all task metadata
 * Allows type narrowing based on task type
 */
export type TaskMetadata =
  | WorkoutMetadata
  | SupplementMetadata
  | MealMetadata
  | HydrationMetadata
  | CardioMetadata
  | WeightLogMetadata
  | ProgressPhotoMetadata
  | BaseTaskMetadata;