/**
 * Science module types for BMR/TDEE calculations and plan generation
 * Provides comprehensive type safety for health science calculations
 */

/**
 * Input parameters for science calculations
 */
export interface ScienceInputs {
  weight: number;        // kg
  height: number;        // cm
  age: number;           // years
  gender: 'male' | 'female' | 'other';
  activityLevel: 'sedentary' | 'lightly_active' | 'moderately_active' | 'very_active' | 'extremely_active';
  primaryGoal: 'lose_weight' | 'gain_muscle' | 'maintain' | 'improve_health';
  targetWeight?: number; // kg, optional
}

/**
 * Computed health targets based on science calculations
 */
export interface ComputedTargets {
  bmr: number;              // Basal Metabolic Rate (kcal/day)
  tdee: number;             // Total Daily Energy Expenditure (kcal/day)
  calorieTarget: number;    // Daily calorie target (kcal/day)
  proteinTarget: number;    // Daily protein target (g/day)
  waterTarget: number;      // Daily water target (ml/day)
  weeklyRate: number;       // Weight change rate (kg/week, negative for loss)
  estimatedWeeks?: number;  // Estimated weeks to goal (optional)
  projectedDate?: Date;     // Projected completion date (optional)
}

/**
 * Educational explanation of why calculations work
 */
export interface WhyItWorks {
  bmr: {
    title: string;
    explanation: string;
    formula: string;
  };
  tdee: {
    title: string;
    explanation: string;
    activityMultiplier: number;
  };
  calorieTarget: {
    title: string;
    explanation: string;
    deficit: number;  // positive for surplus, negative for deficit
  };
  proteinTarget: {
    title: string;
    explanation: string;
    gramsPerKg: number;
  };
  waterTarget: {
    title: string;
    explanation: string;
    mlPerKg: number;
  };
  timeline: {
    title: string;
    explanation: string;
    weeklyRate: number;
    estimatedWeeks: number;
  };
}

/**
 * Request to generate a plan
 */
export interface PlanGenerationRequest {
  userId: number;
  forceRecompute?: boolean;  // Force recomputation even if recent
}

/**
 * Response from plan generation
 */
export interface PlanGenerationResponse {
  plan: {
    id: number;
    userId: number;
    name: string;
    description: string;
    startDate: Date;
    endDate: Date;
    status: string;
  };
  targets: ComputedTargets;
  whyItWorks: WhyItWorks;
  recomputed: boolean;
  previousTargets?: ComputedTargets;  // If recomputed, show diff
}

/**
 * Result of weekly recomputation batch job
 */
export interface WeeklyRecomputeResult {
  totalUsers: number;
  successCount: number;
  errorCount: number;
  updates: Array<{
    userId: number;
    previousCalories: number;
    newCalories: number;
    previousProtein: number;
    newProtein: number;
    reason: string;  // Why targets changed
  }>;
}
