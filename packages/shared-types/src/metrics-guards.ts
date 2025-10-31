/**
 * Type guards and validation utilities for health metrics types
 * Provides runtime type checking for health metrics data
 *
 * @module metrics-guards
 * @packageDocumentation
 */

import type {
  HealthMetrics,
  MetricsExplanations,
  MetricsAcknowledgement,
  MetricsSummaryResponse,
  AcknowledgeMetricsRequest,
  AcknowledgeMetricsResponse,
} from './metrics';
import {
  METRICS_VALIDATION_RANGES,
  ISO_8601_PATTERN,
} from './metrics';

// ============================================================================
// Type Guards for Primitive Values
// ============================================================================

/**
 * Type guard to check if a value is a valid BMI
 *
 * @param value - Value to check
 * @returns True if value is a valid BMI number
 *
 * @public
 * @example
 * ```typescript
 * if (isValidBMI(userInput)) {
 *   // userInput is now typed as number and validated
 *   console.log('BMI:', userInput);
 * }
 * ```
 */
export function isValidBMI(value: unknown): value is number {
  return (
    typeof value === 'number' &&
    !isNaN(value) &&
    isFinite(value) &&
    value >= METRICS_VALIDATION_RANGES.bmi.min &&
    value <= METRICS_VALIDATION_RANGES.bmi.max
  );
}

/**
 * Type guard to check if a value is a valid BMR
 *
 * @param value - Value to check
 * @returns True if value is a valid BMR number
 *
 * @public
 * @example
 * ```typescript
 * if (isValidBMR(userInput)) {
 *   console.log('BMR:', userInput);
 * }
 * ```
 */
export function isValidBMR(value: unknown): value is number {
  return (
    typeof value === 'number' &&
    !isNaN(value) &&
    Number.isInteger(value) &&
    value >= METRICS_VALIDATION_RANGES.bmr.min &&
    value <= METRICS_VALIDATION_RANGES.bmr.max
  );
}

/**
 * Type guard to check if a value is a valid TDEE
 *
 * @param value - Value to check
 * @returns True if value is a valid TDEE number
 *
 * @public
 * @example
 * ```typescript
 * if (isValidTDEE(userInput)) {
 *   console.log('TDEE:', userInput);
 * }
 * ```
 */
export function isValidTDEE(value: unknown): value is number {
  return (
    typeof value === 'number' &&
    !isNaN(value) &&
    Number.isInteger(value) &&
    value >= METRICS_VALIDATION_RANGES.tdee.min &&
    value <= METRICS_VALIDATION_RANGES.tdee.max
  );
}

/**
 * Type guard to check if a value is a valid metrics version
 *
 * @param value - Value to check
 * @returns True if value is a valid version number
 *
 * @public
 * @example
 * ```typescript
 * if (isValidMetricsVersion(userInput)) {
 *   console.log('Version:', userInput);
 * }
 * ```
 */
export function isValidMetricsVersion(value: unknown): value is number {
  return (
    typeof value === 'number' &&
    !isNaN(value) &&
    Number.isInteger(value) &&
    value >= METRICS_VALIDATION_RANGES.version.min &&
    value <= METRICS_VALIDATION_RANGES.version.max
  );
}

/**
 * Type guard to check if a value is a valid ISO 8601 date string
 *
 * @param value - Value to check
 * @returns True if value is a valid ISO 8601 date string
 *
 * @public
 * @example
 * ```typescript
 * if (isValidISO8601Date(userInput)) {
 *   const date = new Date(userInput);
 *   console.log('Parsed date:', date);
 * }
 * ```
 */
export function isValidISO8601Date(value: unknown): value is string {
  if (typeof value !== 'string') {
    return false;
  }

  // Check format matches pattern
  if (!ISO_8601_PATTERN.test(value)) {
    return false;
  }

  // Check it's a valid date
  try {
    const date = new Date(value);
    return !isNaN(date.getTime());
  } catch {
    return false;
  }
}

// ============================================================================
// Type Guards for Complex Types
// ============================================================================

/**
 * Type guard to check if a value is a valid HealthMetrics object
 *
 * @param value - Value to check
 * @returns True if value is a valid HealthMetrics object
 *
 * @public
 * @example
 * ```typescript
 * if (isHealthMetrics(data)) {
 *   // data is now typed as HealthMetrics
 *   console.log('BMI:', data.bmi);
 *   console.log('BMR:', data.bmr);
 *   console.log('TDEE:', data.tdee);
 * }
 * ```
 */
export function isHealthMetrics(value: unknown): value is HealthMetrics {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const obj = value as Record<string, unknown>;

  return (
    isValidBMI(obj.bmi) &&
    isValidBMR(obj.bmr) &&
    isValidTDEE(obj.tdee) &&
    isValidISO8601Date(obj.computedAt) &&
    isValidMetricsVersion(obj.version) &&
    // TDEE should be >= BMR
    obj.tdee >= obj.bmr
  );
}

/**
 * Type guard to check if a value is a valid MetricsExplanations object
 *
 * @param value - Value to check
 * @returns True if value is a valid MetricsExplanations object
 *
 * @public
 * @example
 * ```typescript
 * if (isMetricsExplanations(data)) {
 *   // data is now typed as MetricsExplanations
 *   console.log('BMI explanation:', data.bmi);
 * }
 * ```
 */
export function isMetricsExplanations(value: unknown): value is MetricsExplanations {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const obj = value as Record<string, unknown>;

  return (
    typeof obj.bmi === 'string' &&
    obj.bmi.trim().length > 0 &&
    obj.bmi.length <= 1000 &&
    typeof obj.bmr === 'string' &&
    obj.bmr.trim().length > 0 &&
    obj.bmr.length <= 1000 &&
    typeof obj.tdee === 'string' &&
    obj.tdee.trim().length > 0 &&
    obj.tdee.length <= 1000
  );
}

/**
 * Type guard to check if a value is a valid MetricsAcknowledgement object
 *
 * @param value - Value to check
 * @returns True if value is a valid MetricsAcknowledgement object
 *
 * @public
 * @example
 * ```typescript
 * if (isMetricsAcknowledgement(data)) {
 *   // data is now typed as MetricsAcknowledgement
 *   console.log('Acknowledged at:', data.acknowledgedAt);
 *   console.log('Version:', data.version);
 * }
 * ```
 */
export function isMetricsAcknowledgement(value: unknown): value is MetricsAcknowledgement {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const obj = value as Record<string, unknown>;

  if (!isValidISO8601Date(obj.acknowledgedAt) || !isValidMetricsVersion(obj.version)) {
    return false;
  }

  // Check acknowledgedAt is in the past or present
  const acknowledgedAt = new Date(obj.acknowledgedAt);
  return acknowledgedAt.getTime() <= Date.now();
}

/**
 * Type guard to check if a value is a valid MetricsSummaryResponse object
 *
 * @param value - Value to check
 * @returns True if value is a valid MetricsSummaryResponse object
 *
 * @public
 * @example
 * ```typescript
 * if (isMetricsSummaryResponse(apiResponse)) {
 *   // apiResponse is now typed as MetricsSummaryResponse
 *   console.log('Metrics:', apiResponse.metrics);
 *   console.log('Acknowledged:', apiResponse.acknowledged);
 * }
 * ```
 */
export function isMetricsSummaryResponse(value: unknown): value is MetricsSummaryResponse {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const obj = value as Record<string, unknown>;

  // Check required fields
  if (
    !isHealthMetrics(obj.metrics) ||
    !isMetricsExplanations(obj.explanations) ||
    typeof obj.acknowledged !== 'boolean'
  ) {
    return false;
  }

  // If acknowledged is true, acknowledgement must be present and valid
  if (obj.acknowledged) {
    if (!isMetricsAcknowledgement(obj.acknowledgement)) {
      return false;
    }

    // Version must match between metrics and acknowledgement
    if (obj.acknowledgement.version !== obj.metrics.version) {
      return false;
    }

    // AcknowledgedAt must be after computedAt
    const computedAt = new Date(obj.metrics.computedAt);
    const acknowledgedAt = new Date(obj.acknowledgement.acknowledgedAt);
    if (acknowledgedAt < computedAt) {
      return false;
    }
  }

  // If acknowledged is false, acknowledgement should not be present
  if (!obj.acknowledged && obj.acknowledgement !== undefined) {
    return false;
  }

  return true;
}

/**
 * Type guard to check if a value is a valid AcknowledgeMetricsRequest object
 *
 * @param value - Value to check
 * @returns True if value is a valid AcknowledgeMetricsRequest object
 *
 * @public
 * @example
 * ```typescript
 * if (isAcknowledgeMetricsRequest(requestBody)) {
 *   // requestBody is now typed as AcknowledgeMetricsRequest
 *   console.log('Acknowledging version:', requestBody.version);
 * }
 * ```
 */
export function isAcknowledgeMetricsRequest(
  value: unknown
): value is AcknowledgeMetricsRequest {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const obj = value as Record<string, unknown>;

  return (
    isValidMetricsVersion(obj.version) &&
    isValidISO8601Date(obj.metricsComputedAt)
  );
}

/**
 * Type guard to check if a value is a valid AcknowledgeMetricsResponse object
 *
 * @param value - Value to check
 * @returns True if value is a valid AcknowledgeMetricsResponse object
 *
 * @public
 * @example
 * ```typescript
 * if (isAcknowledgeMetricsResponse(apiResponse)) {
 *   // apiResponse is now typed as AcknowledgeMetricsResponse
 *   console.log('Success:', apiResponse.success);
 *   console.log('Acknowledged at:', apiResponse.acknowledgedAt);
 * }
 * ```
 */
export function isAcknowledgeMetricsResponse(
  value: unknown
): value is AcknowledgeMetricsResponse {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const obj = value as Record<string, unknown>;

  if (typeof obj.success !== 'boolean' || !isValidISO8601Date(obj.acknowledgedAt)) {
    return false;
  }

  // Check acknowledgedAt is in the past or present
  const acknowledgedAt = new Date(obj.acknowledgedAt);
  if (acknowledgedAt.getTime() > Date.now()) {
    return false;
  }

  // success should always be true in valid responses
  return obj.success === true;
}

// ============================================================================
// Assertion Functions
// ============================================================================

/**
 * Assert that a value is a valid HealthMetrics object, throwing if not
 *
 * @param value - Value to assert
 * @param fieldName - Name of field for error message
 * @throws {TypeError} If value is not a valid HealthMetrics object
 *
 * @public
 * @example
 * ```typescript
 * assertHealthMetrics(data, 'metrics');
 * // If this doesn't throw, data is guaranteed to be HealthMetrics
 * console.log('Valid BMI:', data.bmi);
 * ```
 */
export function assertHealthMetrics(
  value: unknown,
  fieldName = 'value'
): asserts value is HealthMetrics {
  if (!isHealthMetrics(value)) {
    throw new TypeError(
      `${fieldName} must be a valid HealthMetrics object with bmi, bmr, tdee, computedAt, and version`
    );
  }
}

/**
 * Assert that a value is a valid MetricsSummaryResponse object, throwing if not
 *
 * @param value - Value to assert
 * @param fieldName - Name of field for error message
 * @throws {TypeError} If value is not a valid MetricsSummaryResponse object
 *
 * @public
 * @example
 * ```typescript
 * assertMetricsSummaryResponse(apiResponse, 'response');
 * // If this doesn't throw, apiResponse is guaranteed to be MetricsSummaryResponse
 * ```
 */
export function assertMetricsSummaryResponse(
  value: unknown,
  fieldName = 'value'
): asserts value is MetricsSummaryResponse {
  if (!isMetricsSummaryResponse(value)) {
    throw new TypeError(
      `${fieldName} must be a valid MetricsSummaryResponse object with metrics, explanations, acknowledged, and optional acknowledgement`
    );
  }
}

/**
 * Assert that a value is a valid AcknowledgeMetricsRequest object, throwing if not
 *
 * @param value - Value to assert
 * @param fieldName - Name of field for error message
 * @throws {TypeError} If value is not a valid AcknowledgeMetricsRequest object
 *
 * @public
 * @example
 * ```typescript
 * assertAcknowledgeMetricsRequest(requestBody, 'request');
 * // If this doesn't throw, requestBody is guaranteed to be AcknowledgeMetricsRequest
 * ```
 */
export function assertAcknowledgeMetricsRequest(
  value: unknown,
  fieldName = 'value'
): asserts value is AcknowledgeMetricsRequest {
  if (!isAcknowledgeMetricsRequest(value)) {
    throw new TypeError(
      `${fieldName} must be a valid AcknowledgeMetricsRequest object with version and metricsComputedAt`
    );
  }
}

/**
 * Assert that a value is a valid AcknowledgeMetricsResponse object, throwing if not
 *
 * @param value - Value to assert
 * @param fieldName - Name of field for error message
 * @throws {TypeError} If value is not a valid AcknowledgeMetricsResponse object
 *
 * @public
 * @example
 * ```typescript
 * assertAcknowledgeMetricsResponse(apiResponse, 'response');
 * // If this doesn't throw, apiResponse is guaranteed to be AcknowledgeMetricsResponse
 * ```
 */
export function assertAcknowledgeMetricsResponse(
  value: unknown,
  fieldName = 'value'
): asserts value is AcknowledgeMetricsResponse {
  if (!isAcknowledgeMetricsResponse(value)) {
    throw new TypeError(
      `${fieldName} must be a valid AcknowledgeMetricsResponse object with success and acknowledgedAt`
    );
  }
}
