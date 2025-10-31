import { z } from 'zod';
import { PRIMARY_GOALS, ACTIVITY_LEVELS } from './science';

/**
 * Validation ranges for profile fields
 */
export const PROFILE_VALIDATION = {
  weight: { min: 20, max: 500 }, // kg
  height: { min: 50, max: 300 }, // cm
  age: { min: 13, max: 120 }, // years
  mealsPerDay: { min: 1, max: 10 },
  dietaryPreferences: { max: 10 },
  allergies: { max: 20 },
} as const;

/**
 * Schema for updating profile demographics
 */
export const updateDemographicsSchema = z.object({
  dateOfBirth: z
    .string()
    .datetime({ message: 'Date of birth must be a valid ISO 8601 datetime' })
    .refine(
      (date) => {
        const dob = new Date(date);
        const today = new Date();
        let age = today.getFullYear() - dob.getFullYear();
        const monthDiff = today.getMonth() - dob.getMonth();
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
          age--;
        }
        return age >= PROFILE_VALIDATION.age.min && age <= PROFILE_VALIDATION.age.max;
      },
      {
        message: `You must be between ${PROFILE_VALIDATION.age.min} and ${PROFILE_VALIDATION.age.max} years old`,
      }
    )
    .optional(),
  gender: z.string().max(20).optional(),
  height: z
    .number()
    .min(
      PROFILE_VALIDATION.height.min,
      `Height must be at least ${PROFILE_VALIDATION.height.min} cm`
    )
    .max(
      PROFILE_VALIDATION.height.max,
      `Height must not exceed ${PROFILE_VALIDATION.height.max} cm`
    )
    .optional(),
});

/**
 * Schema for updating health metrics
 */
export const updateHealthMetricsSchema = z.object({
  currentWeight: z
    .number()
    .min(
      PROFILE_VALIDATION.weight.min,
      `Weight must be at least ${PROFILE_VALIDATION.weight.min} kg`
    )
    .max(
      PROFILE_VALIDATION.weight.max,
      `Weight must not exceed ${PROFILE_VALIDATION.weight.max} kg`
    )
    .optional(),
  targetWeight: z
    .number()
    .min(
      PROFILE_VALIDATION.weight.min,
      `Target weight must be at least ${PROFILE_VALIDATION.weight.min} kg`
    )
    .max(
      PROFILE_VALIDATION.weight.max,
      `Target weight must not exceed ${PROFILE_VALIDATION.weight.max} kg`
    )
    .optional(),
});

/**
 * Schema for updating goals and timeline
 */
export const updateGoalsSchema = z.object({
  primaryGoal: z
    .enum(PRIMARY_GOALS, {
      errorMap: () => ({ message: 'Invalid primary goal' }),
    })
    .optional(),
  targetDate: z
    .string()
    .datetime({ message: 'Target date must be a valid ISO 8601 datetime' })
    .refine(
      (date) => {
        return new Date(date) > new Date();
      },
      {
        message: 'Target date must be in the future',
      }
    )
    .optional(),
  activityLevel: z
    .enum(ACTIVITY_LEVELS, {
      errorMap: () => ({ message: 'Invalid activity level' }),
    })
    .optional(),
});

/**
 * Schema for updating dietary preferences
 */
export const updatePreferencesSchema = z.object({
  dietaryPreferences: z
    .array(z.string())
    .max(
      PROFILE_VALIDATION.dietaryPreferences.max,
      `Cannot have more than ${PROFILE_VALIDATION.dietaryPreferences.max} dietary preferences`
    )
    .optional(),
  allergies: z
    .array(z.string())
    .max(
      PROFILE_VALIDATION.allergies.max,
      `Cannot have more than ${PROFILE_VALIDATION.allergies.max} allergies`
    )
    .optional(),
  mealsPerDay: z
    .number()
    .int()
    .min(
      PROFILE_VALIDATION.mealsPerDay.min,
      `Meals per day must be at least ${PROFILE_VALIDATION.mealsPerDay.min}`
    )
    .max(
      PROFILE_VALIDATION.mealsPerDay.max,
      `Meals per day must not exceed ${PROFILE_VALIDATION.mealsPerDay.max}`
    )
    .optional(),
});

/**
 * Unified schema for profile updates (partial updates supported)
 */
export const updateProfileSchema = z
  .object({
    // Demographics
    dateOfBirth: updateDemographicsSchema.shape.dateOfBirth,
    gender: updateDemographicsSchema.shape.gender,
    height: updateDemographicsSchema.shape.height,

    // Health metrics
    currentWeight: updateHealthMetricsSchema.shape.currentWeight,
    targetWeight: updateHealthMetricsSchema.shape.targetWeight,

    // Goals
    primaryGoal: updateGoalsSchema.shape.primaryGoal,
    targetDate: updateGoalsSchema.shape.targetDate,
    activityLevel: updateGoalsSchema.shape.activityLevel,

    // Preferences
    dietaryPreferences: updatePreferencesSchema.shape.dietaryPreferences,
    allergies: updatePreferencesSchema.shape.allergies,
    mealsPerDay: updatePreferencesSchema.shape.mealsPerDay,
  })
  .partial()
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field must be provided for update',
  });

/**
 * TypeScript types for profile updates
 */
export type UpdateDemographicsInput = z.infer<typeof updateDemographicsSchema>;
export type UpdateHealthMetricsInput = z.infer<typeof updateHealthMetricsSchema>;
export type UpdateGoalsInput = z.infer<typeof updateGoalsSchema>;
export type UpdatePreferencesInput = z.infer<typeof updatePreferencesSchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;

/**
 * Profile data structure returned by GET /v1/profile
 */
export interface ProfileData {
  user: {
    id: number;
    email: string;
    name: string;
  };
  demographics: {
    dateOfBirth: string | null;
    gender: string | null;
    height: number | null;
  };
  health: {
    currentWeight: number | null;
    targetWeight: number | null;
  };
  goals: {
    primaryGoal: string | null;
    targetDate: string | null;
    activityLevel: string | null;
  };
  preferences: {
    dietaryPreferences: string[];
    allergies: string[];
    mealsPerDay: number;
  };
  targets: {
    bmr: number | null;
    tdee: number | null;
    calorieTarget: number | null;
    proteinTarget: number | null;
    waterTarget: number | null;
  };
}

/**
 * Response structure for profile GET endpoint
 */
export interface GetProfileResponse {
  success: boolean;
  profile: ProfileData;
}

/**
 * Response structure for profile PUT endpoint
 */
export interface UpdateProfileResponse {
  success: boolean;
  profile: Partial<ProfileData>;
  planUpdated?: boolean;
  targets?: {
    calorieTarget: number;
    proteinTarget: number;
    waterTarget: number;
  };
  changes?: {
    previousCalories?: number;
    newCalories?: number;
    previousProtein?: number;
    newProtein?: number;
  };
}

/**
 * Fields that trigger plan regeneration when changed
 */
export const IMPACTFUL_FIELDS = [
  'currentWeight',
  'targetWeight',
  'targetDate',
  'primaryGoal',
  'activityLevel',
  'height',
  'dateOfBirth',
  'gender',
] as const;

export type ImpactfulField = (typeof IMPACTFUL_FIELDS)[number];

/**
 * Helper function to determine if field is impactful
 */
export function isImpactfulField(fieldName: string): boolean {
  return IMPACTFUL_FIELDS.includes(fieldName as ImpactfulField);
}

/**
 * Helper function to check if changes require plan regeneration
 */
export function shouldRegeneratePlan(changes: Record<string, any>): boolean {
  return Object.keys(changes).some((key) => isImpactfulField(key));
}
