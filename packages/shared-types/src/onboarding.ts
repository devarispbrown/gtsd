/**
 * Onboarding types for user registration and initial setup
 * Shared between API validation and mobile app forms
 */

import { Gender, ActivityLevel, PrimaryGoal } from './enums';

/**
 * Relationship types for accountability partners
 */
export enum RelationshipType {
  Spouse = 'spouse',
  Partner = 'partner',
  Friend = 'friend',
  Family = 'family',
  Coach = 'coach',
  Colleague = 'colleague',
  Other = 'other',
}

/**
 * Dietary preference options
 */
export enum DietaryPreference {
  None = 'none',
  Vegetarian = 'vegetarian',
  Vegan = 'vegan',
  Pescatarian = 'pescatarian',
  Keto = 'keto',
  Paleo = 'paleo',
  GlutenFree = 'gluten_free',
  DairyFree = 'dairy_free',
  Halal = 'halal',
  Kosher = 'kosher',
  Other = 'other',
}

/**
 * Accountability partner input
 */
export interface PartnerInput {
  name: string;
  email?: string;
  phone?: string;
  relationship?: string;
}

/**
 * Accountability partner with ID (from database)
 */
export interface AccountabilityPartner extends PartnerInput {
  id: string | number;
  relationship: RelationshipType | string;
}

/**
 * Complete onboarding data structure
 * Used by mobile app to collect user information
 */
export interface OnboardingData {
  // Account Basics
  dateOfBirth: Date | string;
  gender: Gender;

  // Goals
  primaryGoal: PrimaryGoal;
  targetWeight: number;
  targetDate: Date | string;

  // Health Metrics
  currentWeight: number;
  height: number; // in cm

  // Activity Level
  activityLevel: ActivityLevel;

  // Preferences
  dietaryPreferences: DietaryPreference[] | string[];
  allergies: string[];
  mealsPerDay: number;

  // Partners
  partners: AccountabilityPartner[] | PartnerInput[];
}

/**
 * Onboarding step identifier
 */
export type OnboardingStep =
  | 'welcome'
  | 'accountBasics'
  | 'goals'
  | 'healthMetrics'
  | 'activityLevel'
  | 'preferences'
  | 'partners'
  | 'review';

/**
 * Onboarding progress tracker
 * Used by mobile app to track user's progress through onboarding
 */
export interface OnboardingProgress {
  currentStep: OnboardingStep;
  completedSteps: OnboardingStep[];
  data: Partial<OnboardingData>;
  lastUpdated: string;
}

/**
 * API request format for onboarding submission
 * All dates are ISO strings for serialization
 */
export interface OnboardingApiRequest {
  dateOfBirth: string; // ISO string
  gender: Gender;
  primaryGoal: PrimaryGoal;
  targetWeight: number;
  targetDate: string; // ISO string
  currentWeight: number;
  height: number;
  activityLevel: ActivityLevel;
  dietaryPreferences: DietaryPreference[] | string[];
  allergies: string[];
  mealsPerDay: number;
  partners: PartnerInput[];
}

/**
 * API response for onboarding submission
 */
export interface OnboardingApiResponse {
  success: boolean;
  userId?: string | number;
  message?: string;
  errors?: Record<string, string>;
  calculatedMetrics?: {
    bmr?: number;
    tdee?: number;
    calorieTarget?: number;
    proteinTarget?: number;
    waterTarget?: number;
  };
}

/**
 * Calculated health metrics from onboarding data
 * BMR (Basal Metabolic Rate) and TDEE (Total Daily Energy Expenditure)
 */
export interface HealthCalculations {
  bmr: number; // calories per day
  tdee: number; // calories per day
  calorieTarget: number; // adjusted based on goal
  proteinTarget: number; // grams per day
  waterTarget: number; // ml per day
  weeklyWeightChangeRate?: number; // kg per week
  estimatedWeeks?: number;
  projectedCompletionDate?: string; // ISO string
}

/**
 * Type guard to check if onboarding data is complete
 */
export const isCompleteOnboardingData = (
  data: Partial<OnboardingData>
): data is OnboardingData => {
  return !!(
    data.dateOfBirth &&
    data.gender &&
    data.primaryGoal &&
    data.targetWeight &&
    data.targetDate &&
    data.currentWeight &&
    data.height &&
    data.activityLevel &&
    data.dietaryPreferences &&
    data.allergies &&
    typeof data.mealsPerDay === 'number' &&
    data.partners
  );
};

/**
 * Validation constants
 */
export const OnboardingValidation = {
  MIN_AGE: 13,
  MAX_AGE: 120,
  MIN_HEIGHT: 50, // cm
  MAX_HEIGHT: 300, // cm
  MIN_WEIGHT: 20, // kg
  MAX_WEIGHT: 500, // kg
  MIN_MEALS_PER_DAY: 1,
  MAX_MEALS_PER_DAY: 10,
} as const;
