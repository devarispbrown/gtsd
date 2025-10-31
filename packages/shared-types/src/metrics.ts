/**
 * Health metrics summary types
 * Provides comprehensive type safety for health metrics display and acknowledgement
 *
 * @module metrics
 * @packageDocumentation
 */

// ============================================================================
// Branded Types for Type Safety
// ============================================================================

/**
 * Brand for BMI values to prevent mixing with other numbers
 * @internal
 */
declare const __bmi: unique symbol;

/**
 * Brand for version numbers to prevent mixing with other numbers
 * @internal
 */
declare const __version: unique symbol;

/**
 * BMI (Body Mass Index) branded type
 * Range: 10-60 (covers extreme edge cases)
 *
 * @public
 * @example
 * ```typescript
 * const bmi: BMI = 22.5 as BMI;
 * ```
 */
export type BMI = number & { readonly [__bmi]: typeof __bmi };

/**
 * Version number branded type for metrics versioning
 * Always a positive integer
 *
 * @public
 * @example
 * ```typescript
 * const version: MetricsVersion = 1 as MetricsVersion;
 * ```
 */
export type MetricsVersion = number & { readonly [__version]: typeof __version };

// ============================================================================
// Core Metric Types
// ============================================================================

/**
 * Core health metrics computed from user data
 * All metrics are validated and derived from evidence-based formulas
 *
 * @public
 * @remarks
 * - BMI: Body Mass Index (kg/m²)
 * - BMR: Basal Metabolic Rate (kcal/day)
 * - TDEE: Total Daily Energy Expenditure (kcal/day)
 * - computedAt: ISO 8601 timestamp when metrics were calculated
 * - version: Metrics calculation version for change tracking
 *
 * @example
 * ```typescript
 * const metrics: HealthMetrics = {
 *   bmi: 22.5,
 *   bmr: 1800,
 *   tdee: 2500,
 *   computedAt: '2025-10-28T12:00:00.000Z',
 *   version: 1
 * };
 * ```
 */
export interface HealthMetrics {
  /**
   * Body Mass Index in kg/m²
   * @remarks
   * Valid range: 10-60
   * Formula: weight(kg) / (height(m))²
   * WHO classifications:
   * - < 18.5: Underweight
   * - 18.5-24.9: Normal weight
   * - 25-29.9: Overweight
   * - >= 30: Obese
   */
  readonly bmi: number;

  /**
   * Basal Metabolic Rate in kcal/day
   * @remarks
   * Valid range: 500-5000 kcal
   * Calculated using Mifflin-St Jeor equation
   * Represents calories burned at complete rest
   */
  readonly bmr: number;

  /**
   * Total Daily Energy Expenditure in kcal/day
   * @remarks
   * Valid range: 500-10000 kcal
   * BMR multiplied by activity level factor
   * Represents total daily calorie burn
   */
  readonly tdee: number;

  /**
   * ISO 8601 timestamp when metrics were computed
   * @remarks
   * Format: YYYY-MM-DDTHH:mm:ss.sssZ
   * Always in UTC timezone
   */
  readonly computedAt: string;

  /**
   * Metrics calculation version
   * @remarks
   * Positive integer incremented when formulas or calculations change
   * Used to track if user has seen the latest metrics
   */
  readonly version: number;
}

/**
 * User-friendly explanations for each metric
 * Provides educational context to help users understand their health data
 *
 * @public
 * @example
 * ```typescript
 * const explanations: MetricsExplanations = {
 *   bmi: 'Your BMI of 22.5 is in the normal weight range...',
 *   bmr: 'Your body burns 1800 calories at rest...',
 *   tdee: 'You burn approximately 2500 calories per day...'
 * };
 * ```
 */
export interface MetricsExplanations {
  /**
   * BMI explanation with interpretation
   * @remarks
   * Should include:
   * - Current BMI value
   * - WHO classification (underweight/normal/overweight/obese)
   * - Health implications
   * - Contextual guidance
   */
  readonly bmi: string;

  /**
   * BMR explanation with context
   * @remarks
   * Should include:
   * - Current BMR value
   * - What BMR represents
   * - Factors that affect it
   * - How it's used in calculations
   */
  readonly bmr: string;

  /**
   * TDEE explanation with context
   * @remarks
   * Should include:
   * - Current TDEE value
   * - What TDEE represents
   * - Activity level impact
   * - How it relates to goals
   */
  readonly tdee: string;
}

/**
 * Acknowledgement metadata for metrics
 * Tracks when user has reviewed their health metrics
 *
 * @public
 * @remarks
 * Used to determine if user needs to see updated metrics
 * Null/undefined if metrics have never been acknowledged
 *
 * @example
 * ```typescript
 * const acknowledgement: MetricsAcknowledgement = {
 *   acknowledgedAt: '2025-10-28T12:30:00.000Z',
 *   version: 1
 * };
 * ```
 */
export interface MetricsAcknowledgement {
  /**
   * ISO 8601 timestamp when user acknowledged the metrics
   * @remarks
   * Format: YYYY-MM-DDTHH:mm:ss.sssZ
   * Always in UTC timezone
   */
  readonly acknowledgedAt: string;

  /**
   * Version of metrics that was acknowledged
   * @remarks
   * Must match the version in HealthMetrics
   * Used to determine if new acknowledgement is needed
   */
  readonly version: number;
}

// ============================================================================
// API Request/Response Types
// ============================================================================

/**
 * Complete metrics summary response
 * Returned when fetching user's health metrics
 *
 * @public
 * @remarks
 * - metrics: Current computed health metrics
 * - explanations: User-friendly explanations for each metric
 * - acknowledged: Whether user has acknowledged current metrics version
 * - acknowledgement: Metadata if metrics have been acknowledged
 *
 * @example
 * ```typescript
 * const response: MetricsSummaryResponse = {
 *   metrics: {
 *     bmi: 22.5,
 *     bmr: 1800,
 *     tdee: 2500,
 *     computedAt: '2025-10-28T12:00:00.000Z',
 *     version: 1
 *   },
 *   explanations: {
 *     bmi: '...',
 *     bmr: '...',
 *     tdee: '...'
 *   },
 *   acknowledged: true,
 *   acknowledgement: {
 *     acknowledgedAt: '2025-10-28T12:30:00.000Z',
 *     version: 1
 *   }
 * };
 * ```
 */
export interface MetricsSummaryResponse {
  /**
   * Computed health metrics
   */
  readonly metrics: HealthMetrics;

  /**
   * User-friendly explanations for each metric
   */
  readonly explanations: MetricsExplanations;

  /**
   * Whether user has acknowledged current metrics version
   * @remarks
   * - true: User has seen and acknowledged current version
   * - false: User needs to review metrics (new version or never acknowledged)
   */
  readonly acknowledged: boolean;

  /**
   * Acknowledgement metadata if metrics have been acknowledged
   * @remarks
   * Present only if acknowledged is true
   * Contains timestamp and version information
   */
  readonly acknowledgement?: MetricsAcknowledgement;
}

/**
 * Request body for acknowledging metrics
 * Sent when user confirms they've reviewed their health metrics
 *
 * @public
 * @remarks
 * - version: Version of metrics being acknowledged
 * - metricsComputedAt: Timestamp of metrics being acknowledged
 *
 * Used to ensure user is acknowledging the correct version
 * Prevents race conditions if metrics are recomputed during viewing
 *
 * @example
 * ```typescript
 * const request: AcknowledgeMetricsRequest = {
 *   version: 1,
 *   metricsComputedAt: '2025-10-28T12:00:00.000Z'
 * };
 * ```
 */
export interface AcknowledgeMetricsRequest {
  /**
   * Version of metrics being acknowledged
   * @remarks
   * Must match current metrics version
   * Positive integer
   */
  readonly version: number;

  /**
   * Timestamp of metrics being acknowledged
   * @remarks
   * Must match metrics.computedAt from summary response
   * ISO 8601 format: YYYY-MM-DDTHH:mm:ss.sssZ
   * Used to prevent acknowledging stale metrics
   */
  readonly metricsComputedAt: string;
}

/**
 * Response from metrics acknowledgement
 * Confirms successful acknowledgement and provides timestamp
 *
 * @public
 * @remarks
 * - success: Whether acknowledgement was recorded
 * - acknowledgedAt: Server timestamp when acknowledgement was recorded
 *
 * @example
 * ```typescript
 * const response: AcknowledgeMetricsResponse = {
 *   success: true,
 *   acknowledgedAt: '2025-10-28T12:30:00.000Z'
 * };
 * ```
 */
export interface AcknowledgeMetricsResponse {
  /**
   * Whether acknowledgement was successfully recorded
   * @remarks
   * - true: Acknowledgement saved to database
   * - false: Acknowledgement failed (should not occur with proper error handling)
   */
  readonly success: boolean;

  /**
   * Server timestamp when acknowledgement was recorded
   * @remarks
   * ISO 8601 format: YYYY-MM-DDTHH:mm:ss.sssZ
   * Always in UTC timezone
   * May differ slightly from request time due to processing
   */
  readonly acknowledgedAt: string;
}

// ============================================================================
// Validation Ranges
// ============================================================================

/**
 * Valid ranges for health metrics
 * Used for validation to ensure realistic and safe values
 *
 * @public
 * @remarks
 * These ranges cover extreme edge cases while preventing invalid data
 * - BMI: 10-60 (covers severe underweight to severe obesity)
 * - BMR: 500-5000 kcal (covers infants to elite athletes)
 * - TDEE: 500-10000 kcal (covers sedentary to extreme athletes)
 */
export const METRICS_VALIDATION_RANGES = {
  /**
   * BMI range in kg/m²
   * @remarks
   * - min: 10 (severe underweight, medical edge case)
   * - max: 60 (severe obesity, medical edge case)
   * Normal human range: 15-50
   */
  bmi: { min: 10, max: 60 } as const,

  /**
   * BMR range in kcal/day
   * @remarks
   * - min: 500 (small children or medical conditions)
   * - max: 5000 (elite athletes or extreme body composition)
   * Normal adult range: 1200-2500
   */
  bmr: { min: 500, max: 5000 } as const,

  /**
   * TDEE range in kcal/day
   * @remarks
   * - min: 500 (very low activity or medical conditions)
   * - max: 10000 (extreme athletes like Tour de France cyclists)
   * Normal adult range: 1500-3500
   */
  tdee: { min: 500, max: 10000 } as const,

  /**
   * Version number range
   * @remarks
   * - min: 1 (first version)
   * - max: 1000 (reasonable upper bound)
   * Always a positive integer
   */
  version: { min: 1, max: 1000 } as const,
} as const;

// ============================================================================
// Constants
// ============================================================================

/**
 * Current metrics calculation version
 * Increment this when formulas or calculation logic changes
 *
 * @public
 * @remarks
 * Update this constant when:
 * - BMI calculation changes
 * - BMR formula updates (e.g., switching from Mifflin-St Jeor)
 * - TDEE multipliers change
 * - Explanation text significantly changes
 *
 * This triggers users to see and acknowledge updated metrics
 */
export const CURRENT_METRICS_VERSION = 1;

/**
 * ISO 8601 date-time format pattern
 * @public
 */
export const ISO_8601_PATTERN =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z$/;

// ============================================================================
// Helper Types
// ============================================================================

/**
 * BMI classification categories based on WHO standards
 * @public
 */
export type BMICategory =
  | 'underweight'
  | 'normal'
  | 'overweight'
  | 'obese_class_1'
  | 'obese_class_2'
  | 'obese_class_3';

/**
 * Map BMI value to WHO classification category
 *
 * @param bmi - BMI value to classify
 * @returns WHO BMI category
 *
 * @public
 * @example
 * ```typescript
 * const category = getBMICategory(22.5); // 'normal'
 * ```
 */
export function getBMICategory(bmi: number): BMICategory {
  if (bmi < 18.5) return 'underweight';
  if (bmi < 25) return 'normal';
  if (bmi < 30) return 'overweight';
  if (bmi < 35) return 'obese_class_1';
  if (bmi < 40) return 'obese_class_2';
  return 'obese_class_3';
}

/**
 * Get human-readable BMI category description
 *
 * @param category - BMI category
 * @returns User-friendly description
 *
 * @public
 * @example
 * ```typescript
 * const description = getBMICategoryDescription('normal'); // 'Normal Weight'
 * ```
 */
export function getBMICategoryDescription(category: BMICategory): string {
  const descriptions: Record<BMICategory, string> = {
    underweight: 'Underweight',
    normal: 'Normal Weight',
    overweight: 'Overweight',
    obese_class_1: 'Obese (Class I)',
    obese_class_2: 'Obese (Class II)',
    obese_class_3: 'Obese (Class III)',
  };

  return descriptions[category];
}
