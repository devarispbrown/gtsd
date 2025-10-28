/**
 * Type guards and validation utilities for science types
 * Provides runtime type checking and validation for health science data
 *
 * @module science-guards
 * @packageDocumentation
 */

import type {
  GenderValue,
  ActivityLevelValue,
  PrimaryGoalValue,
  ScienceInputs,
  ComputedTargets,
  WhyItWorks,
} from './science';
import { VALIDATION_RANGES, ACTIVITY_LEVELS, PRIMARY_GOALS, GENDERS } from './science';

// ============================================================================
// Type Guards for Literal Types
// ============================================================================

/**
 * Type guard to check if a value is a valid GenderValue
 *
 * @param value - Value to check
 * @returns True if value is a valid GenderValue
 *
 * @public
 * @example
 * ```typescript
 * if (isGenderValue(userInput)) {
 *   // userInput is now typed as GenderValue
 *   const bmr = calculateBMR(weight, height, age, userInput);
 * }
 * ```
 */
export function isGenderValue(value: unknown): value is GenderValue {
  return typeof value === 'string' && GENDERS.includes(value as GenderValue);
}

/**
 * Type guard to check if a value is a valid ActivityLevelValue
 *
 * @param value - Value to check
 * @returns True if value is a valid ActivityLevelValue
 *
 * @public
 * @example
 * ```typescript
 * if (isActivityLevelValue(userInput)) {
 *   // userInput is now typed as ActivityLevelValue
 *   const tdee = calculateTDEE(bmr, userInput);
 * }
 * ```
 */
export function isActivityLevelValue(value: unknown): value is ActivityLevelValue {
  return typeof value === 'string' && ACTIVITY_LEVELS.includes(value as ActivityLevelValue);
}

/**
 * Type guard to check if a value is a valid PrimaryGoalValue
 *
 * @param value - Value to check
 * @returns True if value is a valid PrimaryGoalValue
 *
 * @public
 * @example
 * ```typescript
 * if (isPrimaryGoalValue(userInput)) {
 *   // userInput is now typed as PrimaryGoalValue
 *   const calories = calculateCalorieTarget(tdee, userInput);
 * }
 * ```
 */
export function isPrimaryGoalValue(value: unknown): value is PrimaryGoalValue {
  return typeof value === 'string' && PRIMARY_GOALS.includes(value as PrimaryGoalValue);
}

// ============================================================================
// Validation Functions
// ============================================================================

/**
 * Validation result type
 * @public
 */
export interface ValidationResult {
  /**
   * Whether the validation passed
   */
  readonly valid: boolean;

  /**
   * Array of error messages if validation failed
   */
  readonly errors: readonly string[];
}

/**
 * Validate weight is within acceptable range
 *
 * @param weight - Weight in kg to validate
 * @returns Validation result
 *
 * @public
 * @example
 * ```typescript
 * const result = validateWeight(75.5);
 * if (!result.valid) {
 *   console.error(result.errors);
 * }
 * ```
 */
export function validateWeight(weight: number): ValidationResult {
  const errors: string[] = [];

  if (typeof weight !== 'number' || isNaN(weight)) {
    errors.push('Weight must be a valid number');
  } else if (weight < VALIDATION_RANGES.weight.min) {
    errors.push(`Weight must be at least ${VALIDATION_RANGES.weight.min} kg`);
  } else if (weight > VALIDATION_RANGES.weight.max) {
    errors.push(`Weight must be at most ${VALIDATION_RANGES.weight.max} kg`);
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Validate height is within acceptable range
 *
 * @param height - Height in cm to validate
 * @returns Validation result
 *
 * @public
 * @example
 * ```typescript
 * const result = validateHeight(175);
 * if (!result.valid) {
 *   console.error(result.errors);
 * }
 * ```
 */
export function validateHeight(height: number): ValidationResult {
  const errors: string[] = [];

  if (typeof height !== 'number' || isNaN(height)) {
    errors.push('Height must be a valid number');
  } else if (height < VALIDATION_RANGES.height.min) {
    errors.push(`Height must be at least ${VALIDATION_RANGES.height.min} cm`);
  } else if (height > VALIDATION_RANGES.height.max) {
    errors.push(`Height must be at most ${VALIDATION_RANGES.height.max} cm`);
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Validate age is within acceptable range
 *
 * @param age - Age in years to validate
 * @returns Validation result
 *
 * @public
 * @example
 * ```typescript
 * const result = validateAge(30);
 * if (!result.valid) {
 *   console.error(result.errors);
 * }
 * ```
 */
export function validateAge(age: number): ValidationResult {
  const errors: string[] = [];

  if (typeof age !== 'number' || isNaN(age)) {
    errors.push('Age must be a valid number');
  } else if (!Number.isInteger(age)) {
    errors.push('Age must be a whole number');
  } else if (age < VALIDATION_RANGES.age.min) {
    errors.push(`Age must be at least ${VALIDATION_RANGES.age.min} years`);
  } else if (age > VALIDATION_RANGES.age.max) {
    errors.push(`Age must be at most ${VALIDATION_RANGES.age.max} years`);
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Validate target weight is within acceptable range
 *
 * @param targetWeight - Target weight in kg to validate
 * @returns Validation result
 *
 * @public
 * @example
 * ```typescript
 * const result = validateTargetWeight(70);
 * if (!result.valid) {
 *   console.error(result.errors);
 * }
 * ```
 */
export function validateTargetWeight(targetWeight: number): ValidationResult {
  const errors: string[] = [];

  if (typeof targetWeight !== 'number' || isNaN(targetWeight)) {
    errors.push('Target weight must be a valid number');
  } else if (targetWeight < VALIDATION_RANGES.targetWeight.min) {
    errors.push(`Target weight must be at least ${VALIDATION_RANGES.targetWeight.min} kg`);
  } else if (targetWeight > VALIDATION_RANGES.targetWeight.max) {
    errors.push(`Target weight must be at most ${VALIDATION_RANGES.targetWeight.max} kg`);
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Validate complete ScienceInputs object
 *
 * @param inputs - Science inputs to validate
 * @returns Validation result with all errors
 *
 * @public
 * @example
 * ```typescript
 * const inputs = {
 *   weight: 75.5,
 *   height: 175,
 *   age: 30,
 *   gender: 'male',
 *   activityLevel: 'moderately_active',
 *   primaryGoal: 'lose_weight',
 *   targetWeight: 70
 * };
 *
 * const result = validateScienceInputs(inputs);
 * if (!result.valid) {
 *   console.error('Validation failed:', result.errors);
 * }
 * ```
 */
export function validateScienceInputs(inputs: unknown): ValidationResult {
  const errors: string[] = [];

  // Check if inputs is an object
  if (typeof inputs !== 'object' || inputs === null) {
    return {
      valid: false,
      errors: ['Inputs must be a valid object'],
    };
  }

  const obj = inputs as Record<string, unknown>;

  // Validate weight
  if (typeof obj.weight !== 'number') {
    errors.push('Weight is required and must be a number');
  } else {
    const weightResult = validateWeight(obj.weight);
    errors.push(...weightResult.errors);
  }

  // Validate height
  if (typeof obj.height !== 'number') {
    errors.push('Height is required and must be a number');
  } else {
    const heightResult = validateHeight(obj.height);
    errors.push(...heightResult.errors);
  }

  // Validate age
  if (typeof obj.age !== 'number') {
    errors.push('Age is required and must be a number');
  } else {
    const ageResult = validateAge(obj.age);
    errors.push(...ageResult.errors);
  }

  // Validate gender
  if (!isGenderValue(obj.gender)) {
    errors.push(`Gender must be one of: ${GENDERS.join(', ')}`);
  }

  // Validate activity level
  if (!isActivityLevelValue(obj.activityLevel)) {
    errors.push(`Activity level must be one of: ${ACTIVITY_LEVELS.join(', ')}`);
  }

  // Validate primary goal
  if (!isPrimaryGoalValue(obj.primaryGoal)) {
    errors.push(`Primary goal must be one of: ${PRIMARY_GOALS.join(', ')}`);
  }

  // Validate target weight (optional)
  if (obj.targetWeight !== undefined && obj.targetWeight !== null) {
    if (typeof obj.targetWeight !== 'number') {
      errors.push('Target weight must be a number if provided');
    } else {
      const targetWeightResult = validateTargetWeight(obj.targetWeight);
      errors.push(...targetWeightResult.errors);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

// ============================================================================
// Type Guards for Complex Types
// ============================================================================

/**
 * Type guard to check if a value is a valid ScienceInputs object
 *
 * @param value - Value to check
 * @returns True if value is a valid ScienceInputs object
 *
 * @public
 * @example
 * ```typescript
 * if (isScienceInputs(userInput)) {
 *   // userInput is now typed as ScienceInputs
 *   const targets = await computeAllTargets(userInput);
 * }
 * ```
 */
export function isScienceInputs(value: unknown): value is ScienceInputs {
  const result = validateScienceInputs(value);
  return result.valid;
}

/**
 * Type guard to check if a value is a valid ComputedTargets object
 *
 * @param value - Value to check
 * @returns True if value is a valid ComputedTargets object
 *
 * @public
 * @example
 * ```typescript
 * if (isComputedTargets(data)) {
 *   // data is now typed as ComputedTargets
 *   console.log('BMR:', data.bmr);
 * }
 * ```
 */
export function isComputedTargets(value: unknown): value is ComputedTargets {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const obj = value as Record<string, unknown>;

  return (
    typeof obj.bmr === 'number' &&
    typeof obj.tdee === 'number' &&
    typeof obj.calorieTarget === 'number' &&
    typeof obj.proteinTarget === 'number' &&
    typeof obj.waterTarget === 'number' &&
    typeof obj.weeklyRate === 'number' &&
    (obj.estimatedWeeks === undefined || typeof obj.estimatedWeeks === 'number') &&
    (obj.projectedDate === undefined || obj.projectedDate instanceof Date)
  );
}

/**
 * Type guard to check if a value is a valid WhyItWorks object
 *
 * @param value - Value to check
 * @returns True if value is a valid WhyItWorks object
 *
 * @public
 * @example
 * ```typescript
 * if (isWhyItWorks(data)) {
 *   // data is now typed as WhyItWorks
 *   console.log('BMR Explanation:', data.bmr.explanation);
 * }
 * ```
 */
export function isWhyItWorks(value: unknown): value is WhyItWorks {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const obj = value as Record<string, unknown>;

  // Check BMR explanation
  if (typeof obj.bmr !== 'object' || obj.bmr === null) {
    return false;
  }
  const bmr = obj.bmr as Record<string, unknown>;
  if (
    typeof bmr.title !== 'string' ||
    typeof bmr.explanation !== 'string' ||
    typeof bmr.formula !== 'string'
  ) {
    return false;
  }

  // Check TDEE explanation
  if (typeof obj.tdee !== 'object' || obj.tdee === null) {
    return false;
  }
  const tdee = obj.tdee as Record<string, unknown>;
  if (
    typeof tdee.title !== 'string' ||
    typeof tdee.explanation !== 'string' ||
    typeof tdee.activityMultiplier !== 'number' ||
    typeof tdee.metric !== 'number'
  ) {
    return false;
  }

  // Check calorie target explanation
  if (typeof obj.calorieTarget !== 'object' || obj.calorieTarget === null) {
    return false;
  }
  const calorieTarget = obj.calorieTarget as Record<string, unknown>;
  if (
    typeof calorieTarget.title !== 'string' ||
    typeof calorieTarget.explanation !== 'string' ||
    typeof calorieTarget.deficit !== 'number' ||
    typeof calorieTarget.metric !== 'number'
  ) {
    return false;
  }

  // Check protein target explanation
  if (typeof obj.proteinTarget !== 'object' || obj.proteinTarget === null) {
    return false;
  }
  const proteinTarget = obj.proteinTarget as Record<string, unknown>;
  if (
    typeof proteinTarget.title !== 'string' ||
    typeof proteinTarget.explanation !== 'string' ||
    typeof proteinTarget.gramsPerKg !== 'number' ||
    typeof proteinTarget.metric !== 'number'
  ) {
    return false;
  }

  // Check water target explanation
  if (typeof obj.waterTarget !== 'object' || obj.waterTarget === null) {
    return false;
  }
  const waterTarget = obj.waterTarget as Record<string, unknown>;
  if (
    typeof waterTarget.title !== 'string' ||
    typeof waterTarget.explanation !== 'string' ||
    typeof waterTarget.mlPerKg !== 'number' ||
    typeof waterTarget.metric !== 'number'
  ) {
    return false;
  }

  // Check timeline explanation
  if (typeof obj.timeline !== 'object' || obj.timeline === null) {
    return false;
  }
  const timeline = obj.timeline as Record<string, unknown>;
  if (
    typeof timeline.title !== 'string' ||
    typeof timeline.explanation !== 'string' ||
    typeof timeline.weeklyRate !== 'number' ||
    typeof timeline.estimatedWeeks !== 'number' ||
    typeof timeline.metric !== 'number'
  ) {
    return false;
  }

  return true;
}

// ============================================================================
// Assertion Functions
// ============================================================================

/**
 * Assert that a value is a valid GenderValue, throwing if not
 *
 * @param value - Value to assert
 * @param fieldName - Name of field for error message
 * @throws {TypeError} If value is not a valid GenderValue
 *
 * @public
 * @example
 * ```typescript
 * assertGenderValue(userInput, 'gender');
 * // If this doesn't throw, userInput is guaranteed to be a GenderValue
 * ```
 */
export function assertGenderValue(
  value: unknown,
  fieldName = 'value'
): asserts value is GenderValue {
  if (!isGenderValue(value)) {
    throw new TypeError(
      `${fieldName} must be a valid GenderValue (${GENDERS.join(', ')}), got: ${String(value)}`
    );
  }
}

/**
 * Assert that a value is a valid ActivityLevelValue, throwing if not
 *
 * @param value - Value to assert
 * @param fieldName - Name of field for error message
 * @throws {TypeError} If value is not a valid ActivityLevelValue
 *
 * @public
 * @example
 * ```typescript
 * assertActivityLevelValue(userInput, 'activityLevel');
 * // If this doesn't throw, userInput is guaranteed to be an ActivityLevelValue
 * ```
 */
export function assertActivityLevelValue(
  value: unknown,
  fieldName = 'value'
): asserts value is ActivityLevelValue {
  if (!isActivityLevelValue(value)) {
    throw new TypeError(
      `${fieldName} must be a valid ActivityLevelValue (${ACTIVITY_LEVELS.join(', ')}), got: ${String(value)}`
    );
  }
}

/**
 * Assert that a value is a valid PrimaryGoalValue, throwing if not
 *
 * @param value - Value to assert
 * @param fieldName - Name of field for error message
 * @throws {TypeError} If value is not a valid PrimaryGoalValue
 *
 * @public
 * @example
 * ```typescript
 * assertPrimaryGoalValue(userInput, 'primaryGoal');
 * // If this doesn't throw, userInput is guaranteed to be a PrimaryGoalValue
 * ```
 */
export function assertPrimaryGoalValue(
  value: unknown,
  fieldName = 'value'
): asserts value is PrimaryGoalValue {
  if (!isPrimaryGoalValue(value)) {
    throw new TypeError(
      `${fieldName} must be a valid PrimaryGoalValue (${PRIMARY_GOALS.join(', ')}), got: ${String(value)}`
    );
  }
}

/**
 * Assert that a value is valid ScienceInputs, throwing if not
 *
 * @param value - Value to assert
 * @throws {TypeError} If value is not valid ScienceInputs
 *
 * @public
 * @example
 * ```typescript
 * assertScienceInputs(userInput);
 * // If this doesn't throw, userInput is guaranteed to be ScienceInputs
 * ```
 */
export function assertScienceInputs(value: unknown): asserts value is ScienceInputs {
  const result = validateScienceInputs(value);
  if (!result.valid) {
    throw new TypeError(`Invalid ScienceInputs: ${result.errors.join(', ')}`);
  }
}
