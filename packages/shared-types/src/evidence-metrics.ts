/**
 * Evidence metrics types for different evidence types
 * Provides strict typing for the flexible JSON metrics field
 */

/**
 * Base metrics interface
 */
export interface BaseMetrics {
  notes?: string;
  timestamp?: string; // ISO 8601
}

/**
 * Workout evidence metrics
 */
export interface WorkoutMetrics extends BaseMetrics {
  actualSets?: number;
  actualReps?: number;
  actualWeight?: number; // kg
  actualDuration?: number; // minutes
  difficulty?: 'easy' | 'moderate' | 'hard' | 'very_hard';
  formRating?: 1 | 2 | 3 | 4 | 5;
  personalRecord?: boolean;
}

/**
 * Weight log evidence metrics
 */
export interface WeightLogMetrics extends BaseMetrics {
  weight: number; // kg (required for weight logs)
  bodyFat?: number; // percentage
  muscleMass?: number; // kg
  bmi?: number;
  waistCircumference?: number; // cm
  chestCircumference?: number; // cm
  hipCircumference?: number; // cm
}

/**
 * Cardio evidence metrics
 */
export interface CardioMetrics extends BaseMetrics {
  distance?: number; // km
  duration: number; // minutes (required)
  avgHeartRate?: number; // bpm
  maxHeartRate?: number; // bpm
  caloriesBurned?: number;
  avgPace?: number; // min/km
  elevationGain?: number; // meters
}

/**
 * Meal evidence metrics
 */
export interface MealMetrics extends BaseMetrics {
  actualCalories: number; // required
  actualProtein: number; // grams (required)
  actualCarbs?: number; // grams
  actualFat?: number; // grams
  fiber?: number; // grams
  sugar?: number; // grams
  sodium?: number; // mg
  mealPhotoUrl?: string;
  foodItems?: string[]; // List of foods consumed
}

/**
 * Hydration evidence metrics
 */
export interface HydrationMetrics extends BaseMetrics {
  amount: number; // ml (required)
  cumulativeAmount?: number; // Total for the day
  beverageType?: 'water' | 'tea' | 'coffee' | 'sports_drink' | 'other';
}

/**
 * Supplement evidence metrics
 */
export interface SupplementMetrics extends BaseMetrics {
  taken: boolean; // required
  timeTaken: string; // ISO 8601 timestamp (required)
  missedReason?: string; // If not taken
  sideEffects?: string;
}

/**
 * Generic metrics for custom tracking
 */
export interface GenericMetrics extends BaseMetrics {
  [key: string]: string | number | boolean | undefined;
}

/**
 * Discriminated union type for all evidence metrics
 * Allows type narrowing based on evidence type
 */
export type EvidenceMetrics =
  | WorkoutMetrics
  | WeightLogMetrics
  | CardioMetrics
  | MealMetrics
  | HydrationMetrics
  | SupplementMetrics
  | GenericMetrics;