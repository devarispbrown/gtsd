// Onboarding Types
export type Gender = 'male' | 'female' | 'other' | 'prefer_not_to_say';

export type ActivityLevel =
  | 'sedentary' // Little to no exercise
  | 'lightly_active' // Light exercise 1-3 days/week
  | 'moderately_active' // Moderate exercise 3-5 days/week
  | 'very_active' // Hard exercise 6-7 days/week
  | 'extremely_active'; // Very hard exercise & physical job

export type DietaryPreference =
  | 'none'
  | 'vegetarian'
  | 'vegan'
  | 'pescatarian'
  | 'keto'
  | 'paleo'
  | 'gluten_free'
  | 'dairy_free'
  | 'halal'
  | 'kosher'
  | 'other';

export type RelationshipType =
  | 'spouse'
  | 'partner'
  | 'friend'
  | 'family'
  | 'coach'
  | 'colleague'
  | 'other';

export interface AccountabilityPartner {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  relationship: RelationshipType;
}

export interface OnboardingData {
  // Account Basics
  dateOfBirth: Date;
  gender: Gender;

  // Goals
  primaryGoal: string;
  targetWeight: number;
  targetDate: Date;

  // Health Metrics
  currentWeight: number;
  height: number; // in cm

  // Activity Level
  activityLevel: ActivityLevel;

  // Preferences
  dietaryPreferences: DietaryPreference[];
  allergies: string[];
  mealsPerDay: number;

  // Partners
  partners: AccountabilityPartner[];
}

export type OnboardingStep =
  | 'welcome'
  | 'accountBasics'
  | 'goals'
  | 'healthMetrics'
  | 'activityLevel'
  | 'preferences'
  | 'partners'
  | 'review';

export interface OnboardingProgress {
  currentStep: OnboardingStep;
  completedSteps: OnboardingStep[];
  data: Partial<OnboardingData>;
  lastUpdated: string;
}

// API Request/Response Types
export interface OnboardingApiRequest {
  dateOfBirth: string; // ISO string
  gender: Gender;
  primaryGoal: string;
  targetWeight: number;
  targetDate: string; // ISO string
  currentWeight: number;
  height: number;
  activityLevel: ActivityLevel;
  dietaryPreferences: DietaryPreference[];
  allergies: string[];
  mealsPerDay: number;
  partners: Array<{
    name: string;
    email?: string;
    phone?: string;
    relationship: RelationshipType;
  }>;
}

export interface OnboardingApiResponse {
  success: boolean;
  userId?: string;
  message?: string;
  errors?: Record<string, string>;
}