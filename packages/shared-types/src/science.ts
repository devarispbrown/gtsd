/**
 * Science module types for BMR/TDEE calculations and plan generation
 * Provides comprehensive type safety for health science calculations
 *
 * @module science
 * @packageDocumentation
 */

// ============================================================================
// Branded Types for Type Safety
// ============================================================================

/**
 * Brand for kilograms to prevent mixing with other numbers
 * @internal
 */
declare const __kilogram: unique symbol;

/**
 * Brand for centimeters to prevent mixing with other numbers
 * @internal
 */
declare const __centimeter: unique symbol;

/**
 * Brand for years (age) to prevent mixing with other numbers
 * @internal
 */
declare const __years: unique symbol;

/**
 * Brand for calories to prevent mixing with other numbers
 * @internal
 */
declare const __calorie: unique symbol;

/**
 * Brand for milliliters to prevent mixing with other numbers
 * @internal
 */
declare const __milliliter: unique symbol;

/**
 * Kilograms branded type for weight measurements
 * @public
 * @example
 * ```typescript
 * const weight: Kilograms = 75.5 as Kilograms;
 * ```
 */
export type Kilograms = number & { readonly [__kilogram]: typeof __kilogram };

/**
 * Centimeters branded type for height measurements
 * @public
 * @example
 * ```typescript
 * const height: Centimeters = 175 as Centimeters;
 * ```
 */
export type Centimeters = number & { readonly [__centimeter]: typeof __centimeter };

/**
 * Years branded type for age
 * @public
 * @example
 * ```typescript
 * const age: Years = 30 as Years;
 * ```
 */
export type Years = number & { readonly [__years]: typeof __years };

/**
 * Calories branded type for energy measurements
 * @public
 * @example
 * ```typescript
 * const bmr: Calories = 1800 as Calories;
 * ```
 */
export type Calories = number & { readonly [__calorie]: typeof __calorie };

/**
 * Milliliters branded type for liquid volume measurements
 * @public
 * @example
 * ```typescript
 * const water: Milliliters = 2500 as Milliliters;
 * ```
 */
export type Milliliters = number & { readonly [__milliliter]: typeof __milliliter };

/**
 * Grams branded type for protein and nutrient measurements
 * @public
 */
export type Grams = number;

// ============================================================================
// Type Aliases from Enums
// ============================================================================

/**
 * User's biological gender for BMR calculations
 * Uses Mifflin-St Jeor gender-specific offsets
 *
 * @public
 * @remarks
 * - male: +5 offset
 * - female: -161 offset
 * - other: average of both (-78 offset)
 */
export type GenderValue = 'male' | 'female' | 'other';

/**
 * User's daily activity level for TDEE calculation
 * Maps to standard activity multipliers
 *
 * @public
 * @remarks
 * Activity multipliers:
 * - sedentary: 1.2 (little or no exercise)
 * - lightly_active: 1.375 (1-3 days/week)
 * - moderately_active: 1.55 (3-5 days/week)
 * - very_active: 1.725 (6-7 days/week)
 * - extremely_active: 1.9 (2x per day, very intense)
 */
export type ActivityLevelValue =
  | 'sedentary'
  | 'lightly_active'
  | 'moderately_active'
  | 'very_active'
  | 'extremely_active';

/**
 * User's primary fitness goal
 * Determines calorie deficit/surplus and protein requirements
 *
 * @public
 * @remarks
 * Goal-specific parameters:
 * - lose_weight: -500 kcal deficit, 2.2g/kg protein, -0.5kg/week
 * - gain_muscle: +400 kcal surplus, 2.4g/kg protein, +0.4kg/week
 * - maintain: maintenance, 1.8g/kg protein, 0kg/week
 * - improve_health: maintenance, 1.8g/kg protein, 0kg/week
 */
export type PrimaryGoalValue = 'lose_weight' | 'gain_muscle' | 'maintain' | 'improve_health';

/**
 * Readonly tuple of all valid activity levels
 * @public
 */
export const ACTIVITY_LEVELS = [
  'sedentary',
  'lightly_active',
  'moderately_active',
  'very_active',
  'extremely_active',
] as const;

/**
 * Readonly tuple of all valid primary goals
 * @public
 */
export const PRIMARY_GOALS = ['lose_weight', 'gain_muscle', 'maintain', 'improve_health'] as const;

/**
 * Readonly tuple of all valid genders
 * @public
 */
export const GENDERS = ['male', 'female', 'other'] as const;

// ============================================================================
// Input and Output Types
// ============================================================================

/**
 * Input parameters for science calculations
 * All values must be positive and within realistic human ranges
 *
 * @public
 * @example
 * ```typescript
 * const inputs: ScienceInputs = {
 *   weight: 75.5,
 *   height: 175,
 *   age: 30,
 *   gender: 'male',
 *   activityLevel: 'moderately_active',
 *   primaryGoal: 'lose_weight',
 *   targetWeight: 70
 * };
 * ```
 */
export interface ScienceInputs {
  /**
   * Body weight in kilograms
   * @remarks Valid range: 30-300 kg
   */
  readonly weight: number;

  /**
   * Height in centimeters
   * @remarks Valid range: 100-250 cm
   */
  readonly height: number;

  /**
   * Age in years
   * @remarks Valid range: 13-120 years
   */
  readonly age: number;

  /**
   * Biological gender for BMR calculation
   */
  readonly gender: GenderValue;

  /**
   * Daily activity level
   */
  readonly activityLevel: ActivityLevelValue;

  /**
   * Primary fitness goal
   */
  readonly primaryGoal: PrimaryGoalValue;

  /**
   * Target weight in kilograms (optional)
   * @remarks
   * Required for weight loss/gain goals to calculate timeline
   * Valid range: 30-300 kg
   */
  readonly targetWeight?: number;
}

/**
 * Computed health targets based on science calculations
 * All values are derived from validated inputs using evidence-based formulas
 *
 * @public
 * @example
 * ```typescript
 * const targets: ComputedTargets = {
 *   bmr: 1800,
 *   tdee: 2500,
 *   calorieTarget: 2000,
 *   proteinTarget: 165,
 *   waterTarget: 2600,
 *   weeklyRate: -0.5,
 *   estimatedWeeks: 10,
 *   projectedDate: new Date('2025-01-01')
 * };
 * ```
 */
export interface ComputedTargets {
  /**
   * Basal Metabolic Rate in kcal/day
   * @remarks
   * Calculated using Mifflin-St Jeor equation
   * Represents calories burned at complete rest
   */
  bmr: number;

  /**
   * Total Daily Energy Expenditure in kcal/day
   * @remarks
   * BMR multiplied by activity level factor
   * Represents total daily calorie burn
   */
  tdee: number;

  /**
   * Daily calorie target in kcal/day
   * @remarks
   * Adjusted from TDEE based on goal
   * - Weight loss: TDEE - 500
   * - Muscle gain: TDEE + 400
   * - Maintenance: TDEE
   */
  calorieTarget: number;

  /**
   * Daily protein target in grams
   * @remarks
   * Calculated based on body weight and goal
   * - Weight loss: 2.2 g/kg
   * - Muscle gain: 2.4 g/kg
   * - Maintenance: 1.8 g/kg
   */
  proteinTarget: number;

  /**
   * Daily water target in milliliters
   * @remarks
   * Standard recommendation: 35 ml/kg body weight
   * Rounded to nearest 100ml for practicality
   */
  waterTarget: number;

  /**
   * Expected weekly weight change rate in kg/week
   * @remarks
   * - Negative values indicate weight loss
   * - Positive values indicate weight gain
   * - Zero for maintenance goals
   */
  weeklyRate: number;

  /**
   * Estimated weeks to reach target weight
   * @remarks
   * Only present if targetWeight is set and weeklyRate is non-zero
   * Calculated as: abs(targetWeight - currentWeight) / abs(weeklyRate)
   */
  estimatedWeeks?: number;

  /**
   * Projected completion date for reaching target weight
   * @remarks
   * Only present if estimatedWeeks is calculated
   * Assumes consistent adherence to targets
   */
  projectedDate?: Date;
}

// ============================================================================
// Educational Types
// ============================================================================

/**
 * Explanation component with title, explanation text, and relevant metric
 * @public
 */
interface ExplanationComponent<T = number> {
  /**
   * Short title for the metric
   */
  readonly title: string;

  /**
   * User-friendly explanation of the calculation and its importance
   */
  readonly explanation: string;

  /**
   * Key metric or multiplier used in the calculation
   */
  readonly metric: T;
}

/**
 * BMR explanation with formula details
 * @public
 */
export interface BMRExplanation extends Omit<ExplanationComponent<never>, 'metric'> {
  /**
   * The Mifflin-St Jeor equation formula
   */
  readonly formula: string;
}

/**
 * TDEE explanation with activity multiplier
 * @public
 */
export interface TDEEExplanation extends ExplanationComponent<number> {
  /**
   * Activity level multiplier applied to BMR
   */
  readonly activityMultiplier: number;
  readonly metric: number;
}

/**
 * Calorie target explanation with deficit/surplus
 * @public
 */
export interface CalorieTargetExplanation extends ExplanationComponent<number> {
  /**
   * Calorie deficit (negative) or surplus (positive)
   */
  readonly deficit: number;
  readonly metric: number;
}

/**
 * Protein target explanation with grams per kg ratio
 * @public
 */
export interface ProteinTargetExplanation extends ExplanationComponent<number> {
  /**
   * Protein requirement in grams per kg of body weight
   */
  readonly gramsPerKg: number;
  readonly metric: number;
}

/**
 * Water target explanation with ml per kg ratio
 * @public
 */
export interface WaterTargetExplanation extends ExplanationComponent<number> {
  /**
   * Water requirement in milliliters per kg of body weight
   */
  readonly mlPerKg: number;
  readonly metric: number;
}

/**
 * Timeline projection explanation
 * @public
 */
export interface TimelineExplanation extends ExplanationComponent<number> {
  /**
   * Weekly weight change rate
   */
  readonly weeklyRate: number;

  /**
   * Estimated weeks to reach goal (0 if maintenance)
   */
  readonly estimatedWeeks: number;
  readonly metric: number;
}

/**
 * Educational explanation of why calculations work
 * Provides user-friendly science education for each computed metric
 *
 * @public
 * @remarks
 * Used to help users understand the science behind their personalized plan
 * All explanations are evidence-based and reference industry standards
 */
export interface WhyItWorks {
  /**
   * BMR calculation explanation with Mifflin-St Jeor formula
   */
  readonly bmr: BMRExplanation;

  /**
   * TDEE calculation explanation with activity multiplier
   */
  readonly tdee: TDEEExplanation;

  /**
   * Calorie target explanation with deficit/surplus reasoning
   */
  readonly calorieTarget: CalorieTargetExplanation;

  /**
   * Protein target explanation with goal-specific requirements
   */
  readonly proteinTarget: ProteinTargetExplanation;

  /**
   * Water target explanation with hydration importance
   */
  readonly waterTarget: WaterTargetExplanation;

  /**
   * Timeline projection explanation (if applicable)
   */
  readonly timeline: TimelineExplanation;
}

// ============================================================================
// Plan Generation Types
// ============================================================================

/**
 * Request to generate a personalized plan
 *
 * @public
 * @example
 * ```typescript
 * const request: PlanGenerationRequest = {
 *   userId: 123,
 *   forceRecompute: false
 * };
 * ```
 */
export interface PlanGenerationRequest {
  /**
   * User ID to generate plan for
   * @remarks Must be a valid user with completed onboarding
   */
  readonly userId: number;

  /**
   * Force recomputation even if recent plan exists
   * @remarks
   * - Default: false
   * - If true, ignores 7-day plan check and creates new plan
   * - Useful for testing or when user data has significantly changed
   */
  readonly forceRecompute?: boolean;
}

/**
 * Plan summary returned in generation response
 * @public
 */
export interface PlanSummary {
  /**
   * Unique plan identifier
   */
  readonly id: number;

  /**
   * User ID this plan belongs to
   */
  readonly userId: number;

  /**
   * Plan name (typically includes week start date)
   */
  readonly name: string;

  /**
   * Detailed plan description with goals and targets
   */
  readonly description: string;

  /**
   * Week start date (typically Monday)
   */
  readonly startDate: Date;

  /**
   * Week end date (typically Sunday)
   */
  readonly endDate: Date;

  /**
   * Plan status
   */
  readonly status: string;
}

/**
 * Response from plan generation
 * Contains the generated plan, computed targets, and educational content
 *
 * @public
 * @example
 * ```typescript
 * const response: PlanGenerationResponse = {
 *   plan: {
 *     id: 1,
 *     userId: 123,
 *     name: 'Weekly Plan - week of Jan 1, 2025',
 *     description: '...',
 *     startDate: new Date('2025-01-01'),
 *     endDate: new Date('2025-01-07'),
 *     status: 'active'
 *   },
 *   targets: { ... },
 *   whyItWorks: { ... },
 *   recomputed: true,
 *   previousTargets: { ... }
 * };
 * ```
 */
export interface PlanGenerationResponse {
  /**
   * Generated plan summary
   */
  readonly plan: PlanSummary;

  /**
   * Computed health targets for this plan
   */
  readonly targets: ComputedTargets;

  /**
   * Educational explanation of calculations
   */
  readonly whyItWorks: WhyItWorks;

  /**
   * Whether plan was recomputed or returned from cache
   * @remarks
   * - true: New plan created with fresh calculations
   * - false: Existing recent plan returned
   */
  readonly recomputed: boolean;

  /**
   * Previous targets before recomputation (if recomputed)
   * @remarks
   * Only present when recomputed is true
   * Useful for showing user what changed
   */
  readonly previousTargets?: ComputedTargets;
}

// ============================================================================
// Batch Processing Types
// ============================================================================

/**
 * Result of a single user's target recomputation
 * @public
 */
export interface UserRecomputeUpdate {
  /**
   * User ID that was updated
   */
  readonly userId: number;

  /**
   * Previous calorie target before update
   */
  readonly previousCalories: number;

  /**
   * New calorie target after update
   */
  readonly newCalories: number;

  /**
   * Previous protein target before update
   */
  readonly previousProtein: number;

  /**
   * New protein target after update
   */
  readonly newProtein: number;

  /**
   * Human-readable reason for target changes
   * @example "calories changed by 150kcal, protein changed by 15g"
   */
  readonly reason: string;
}

/**
 * Result of weekly recomputation batch job
 * Tracks statistics and individual updates for all users
 *
 * @public
 * @example
 * ```typescript
 * const result: WeeklyRecomputeResult = {
 *   totalUsers: 100,
 *   successCount: 98,
 *   errorCount: 2,
 *   updates: [
 *     {
 *       userId: 123,
 *       previousCalories: 2000,
 *       newCalories: 1950,
 *       previousProtein: 150,
 *       newProtein: 155,
 *       reason: 'calories changed by 50kcal'
 *     }
 *   ]
 * };
 * ```
 */
export interface WeeklyRecomputeResult {
  /**
   * Total number of users processed
   */
  totalUsers: number;

  /**
   * Number of successful recomputations
   */
  successCount: number;

  /**
   * Number of failed recomputations
   */
  errorCount: number;

  /**
   * Detailed updates for users with significant changes
   * @remarks
   * Only includes users where targets changed by >50 calories OR >10g protein
   */
  updates: UserRecomputeUpdate[];
}

// ============================================================================
// Constants and Configuration
// ============================================================================

/**
 * Activity level multipliers for TDEE calculation
 * Based on standard exercise physiology research
 *
 * @public
 */
export const ACTIVITY_MULTIPLIERS: Readonly<Record<ActivityLevelValue, number>> = {
  sedentary: 1.2,
  lightly_active: 1.375,
  moderately_active: 1.55,
  very_active: 1.725,
  extremely_active: 1.9,
} as const;

/**
 * Protein requirements by goal (grams per kg of body weight)
 * Based on International Society of Sports Nutrition guidelines
 *
 * @public
 */
export const PROTEIN_PER_KG: Readonly<Record<PrimaryGoalValue, number>> = {
  lose_weight: 2.2,
  gain_muscle: 2.4,
  maintain: 1.8,
  improve_health: 1.8,
} as const;

/**
 * Weekly weight change rates by goal (kg per week)
 * Safe and sustainable rates for body composition changes
 *
 * @public
 */
export const WEEKLY_RATES: Readonly<Record<PrimaryGoalValue, number>> = {
  lose_weight: -0.5,
  gain_muscle: 0.4,
  maintain: 0,
  improve_health: 0,
} as const;

/**
 * Standard water intake recommendation (ml per kg of body weight)
 * @public
 */
export const WATER_ML_PER_KG = 35;

/**
 * Calorie deficit for weight loss (kcal per day)
 * @public
 */
export const WEIGHT_LOSS_DEFICIT = 500;

/**
 * Calorie surplus for muscle gain (kcal per day)
 * @public
 */
export const MUSCLE_GAIN_SURPLUS = 400;

// ============================================================================
// Validation Ranges
// ============================================================================

/**
 * Valid ranges for science input parameters
 * Used for validation to ensure realistic human values
 *
 * @public
 */
export const VALIDATION_RANGES = {
  weight: { min: 30, max: 300 },
  height: { min: 100, max: 250 },
  age: { min: 13, max: 120 },
  targetWeight: { min: 30, max: 300 },
} as const;

/**
 * Significant change thresholds for recomputation
 * Used to determine if targets should be updated
 *
 * @public
 */
export const RECOMPUTE_THRESHOLDS = {
  calories: 50,
  protein: 10,
} as const;
