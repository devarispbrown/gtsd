/**
 * Zod validation schemas for health metrics
 * Provides runtime validation with comprehensive error messages
 *
 * @module metrics-schemas
 * @packageDocumentation
 */

import { z } from 'zod';
import {
  METRICS_VALIDATION_RANGES,
  ISO_8601_PATTERN,
  type HealthMetrics,
  type MetricsSummaryResponse,
  type AcknowledgeMetricsRequest,
} from './metrics';

// ============================================================================
// Primitive Schemas
// ============================================================================

/**
 * Schema for BMI values
 * Validates BMI is within realistic human range
 *
 * @public
 * @remarks
 * - Valid range: 10-60 kg/m²
 * - Covers severe underweight to severe obesity
 * - Prevents invalid calculations
 */
export const bmiSchema = z
  .number({
    required_error: 'BMI is required',
    invalid_type_error: 'BMI must be a number',
  })
  .min(METRICS_VALIDATION_RANGES.bmi.min, {
    message: `BMI must be at least ${METRICS_VALIDATION_RANGES.bmi.min} kg/m²`,
  })
  .max(METRICS_VALIDATION_RANGES.bmi.max, {
    message: `BMI must be at most ${METRICS_VALIDATION_RANGES.bmi.max} kg/m²`,
  })
  .finite({
    message: 'BMI must be a finite number',
  });

/**
 * Schema for BMR values
 * Validates BMR is within realistic human range
 *
 * @public
 * @remarks
 * - Valid range: 500-5000 kcal/day
 * - Covers children to elite athletes
 * - Prevents invalid metabolic calculations
 */
export const bmrSchema = z
  .number({
    required_error: 'BMR is required',
    invalid_type_error: 'BMR must be a number',
  })
  .int({
    message: 'BMR must be a whole number (no decimals)',
  })
  .min(METRICS_VALIDATION_RANGES.bmr.min, {
    message: `BMR must be at least ${METRICS_VALIDATION_RANGES.bmr.min} kcal/day`,
  })
  .max(METRICS_VALIDATION_RANGES.bmr.max, {
    message: `BMR must be at most ${METRICS_VALIDATION_RANGES.bmr.max} kcal/day`,
  });

/**
 * Schema for TDEE values
 * Validates TDEE is within realistic human range
 *
 * @public
 * @remarks
 * - Valid range: 500-10000 kcal/day
 * - Covers sedentary to extreme athletes
 * - Prevents invalid energy expenditure calculations
 */
export const tdeeSchema = z
  .number({
    required_error: 'TDEE is required',
    invalid_type_error: 'TDEE must be a number',
  })
  .int({
    message: 'TDEE must be a whole number (no decimals)',
  })
  .min(METRICS_VALIDATION_RANGES.tdee.min, {
    message: `TDEE must be at least ${METRICS_VALIDATION_RANGES.tdee.min} kcal/day`,
  })
  .max(METRICS_VALIDATION_RANGES.tdee.max, {
    message: `TDEE must be at most ${METRICS_VALIDATION_RANGES.tdee.max} kcal/day`,
  });

/**
 * Schema for metrics version numbers
 * Validates version is a positive integer
 *
 * @public
 * @remarks
 * - Valid range: 1-1000
 * - Always a positive integer
 * - Used for change tracking
 */
export const metricsVersionSchema = z
  .number({
    required_error: 'Version is required',
    invalid_type_error: 'Version must be a number',
  })
  .int({
    message: 'Version must be a whole number',
  })
  .positive({
    message: 'Version must be a positive integer',
  })
  .min(METRICS_VALIDATION_RANGES.version.min, {
    message: `Version must be at least ${METRICS_VALIDATION_RANGES.version.min}`,
  })
  .max(METRICS_VALIDATION_RANGES.version.max, {
    message: `Version must be at most ${METRICS_VALIDATION_RANGES.version.max}`,
  });

/**
 * Schema for ISO 8601 date-time strings
 * Validates timestamp format and ensures it's in the past or present
 *
 * @public
 * @remarks
 * - Format: YYYY-MM-DDTHH:mm:ss.sssZ
 * - Must be valid UTC timestamp
 * - Used for computedAt and acknowledgedAt fields
 */
export const iso8601DateSchema = z
  .string({
    required_error: 'Date is required',
    invalid_type_error: 'Date must be a string',
  })
  .regex(ISO_8601_PATTERN, {
    message: 'Date must be in ISO 8601 format (YYYY-MM-DDTHH:mm:ss.sssZ)',
  })
  .refine(
    (date) => {
      try {
        const parsed = new Date(date);
        return !isNaN(parsed.getTime());
      } catch {
        return false;
      }
    },
    {
      message: 'Date must be a valid ISO 8601 timestamp',
    }
  );

/**
 * Schema for ISO 8601 date-time strings that must be in the past
 * Used for acknowledgedAt timestamps
 *
 * @public
 */
export const pastIso8601DateSchema = iso8601DateSchema.refine(
  (date) => {
    const parsed = new Date(date);
    return parsed.getTime() <= Date.now();
  },
  {
    message: 'Date must be in the past or present',
  }
);

// ============================================================================
// Complex Type Schemas
// ============================================================================

/**
 * Schema for HealthMetrics
 * Validates all core health metric fields
 *
 * @public
 * @example
 * ```typescript
 * const result = healthMetricsSchema.safeParse({
 *   bmi: 22.5,
 *   bmr: 1800,
 *   tdee: 2500,
 *   computedAt: '2025-10-28T12:00:00.000Z',
 *   version: 1
 * });
 *
 * if (!result.success) {
 *   console.error(result.error.issues);
 * }
 * ```
 */
export const healthMetricsSchema = z
  .object({
    bmi: bmiSchema,
    bmr: bmrSchema,
    tdee: tdeeSchema,
    computedAt: iso8601DateSchema,
    version: metricsVersionSchema,
  })
  .strict({
    message: 'Health metrics object contains unexpected fields',
  })
  .refine(
    (data) => {
      // TDEE should generally be greater than BMR
      return data.tdee >= data.bmr;
    },
    {
      message: 'TDEE must be greater than or equal to BMR',
      path: ['tdee'],
    }
  );

/**
 * Schema for MetricsExplanations
 * Validates explanation text for each metric
 *
 * @public
 * @remarks
 * - Each explanation must be non-empty string
 * - Should be informative and user-friendly
 * - Typically 50-500 characters
 */
export const metricsExplanationsSchema = z
  .object({
    bmi: z
      .string({
        required_error: 'BMI explanation is required',
        invalid_type_error: 'BMI explanation must be a string',
      })
      .min(1, {
        message: 'BMI explanation cannot be empty',
      })
      .max(1000, {
        message: 'BMI explanation must be at most 1000 characters',
      })
      .trim(),

    bmr: z
      .string({
        required_error: 'BMR explanation is required',
        invalid_type_error: 'BMR explanation must be a string',
      })
      .min(1, {
        message: 'BMR explanation cannot be empty',
      })
      .max(1000, {
        message: 'BMR explanation must be at most 1000 characters',
      })
      .trim(),

    tdee: z
      .string({
        required_error: 'TDEE explanation is required',
        invalid_type_error: 'TDEE explanation must be a string',
      })
      .min(1, {
        message: 'TDEE explanation cannot be empty',
      })
      .max(1000, {
        message: 'TDEE explanation must be at most 1000 characters',
      })
      .trim(),
  })
  .strict({
    message: 'Metrics explanations object contains unexpected fields',
  });

/**
 * Schema for MetricsAcknowledgement
 * Validates acknowledgement metadata
 *
 * @public
 * @remarks
 * - acknowledgedAt must be in the past
 * - version must match metrics version
 */
export const metricsAcknowledgementSchema = z
  .object({
    acknowledgedAt: pastIso8601DateSchema,
    version: metricsVersionSchema,
  })
  .strict({
    message: 'Metrics acknowledgement object contains unexpected fields',
  });

/**
 * Schema for MetricsSummaryResponse
 * Validates complete metrics summary API response
 *
 * @public
 * @remarks
 * - Ensures all required fields are present
 * - Validates acknowledgement is only present when acknowledged is true
 * - Validates version consistency between metrics and acknowledgement
 *
 * @example
 * ```typescript
 * const result = metricsSummaryResponseSchema.safeParse({
 *   metrics: { ... },
 *   explanations: { ... },
 *   acknowledged: true,
 *   acknowledgement: { ... }
 * });
 * ```
 */
export const metricsSummaryResponseSchema = z
  .object({
    metrics: healthMetricsSchema,
    explanations: metricsExplanationsSchema,
    acknowledged: z.boolean({
      required_error: 'Acknowledged flag is required',
      invalid_type_error: 'Acknowledged must be a boolean',
    }),
    acknowledgement: metricsAcknowledgementSchema.optional(),
  })
  .strict({
    message: 'Metrics summary response contains unexpected fields',
  })
  .refine(
    (data) => {
      // If acknowledged is true, acknowledgement must be present
      return data.acknowledged ? data.acknowledgement !== undefined : true;
    },
    {
      message: 'Acknowledgement metadata is required when acknowledged is true',
      path: ['acknowledgement'],
    }
  )
  .refine(
    (data) => {
      // If acknowledged is false, acknowledgement should not be present
      return !data.acknowledged ? data.acknowledgement === undefined : true;
    },
    {
      message: 'Acknowledgement metadata should not be present when acknowledged is false',
      path: ['acknowledgement'],
    }
  )
  .refine(
    (data) => {
      // If acknowledgement exists, versions must match
      if (data.acknowledgement) {
        return data.acknowledgement.version === data.metrics.version;
      }
      return true;
    },
    {
      message: 'Acknowledgement version must match metrics version',
      path: ['acknowledgement', 'version'],
    }
  )
  .refine(
    (data) => {
      // If acknowledgement exists, acknowledgedAt must be after computedAt
      if (data.acknowledgement) {
        const computedAt = new Date(data.metrics.computedAt);
        const acknowledgedAt = new Date(data.acknowledgement.acknowledgedAt);
        return acknowledgedAt >= computedAt;
      }
      return true;
    },
    {
      message: 'Acknowledgement timestamp must be after or equal to metrics computation timestamp',
      path: ['acknowledgement', 'acknowledgedAt'],
    }
  );

/**
 * Schema for AcknowledgeMetricsRequest
 * Validates metrics acknowledgement request body
 *
 * @public
 * @remarks
 * - version must be positive integer
 * - metricsComputedAt must be valid ISO 8601 timestamp
 * - Used to ensure user is acknowledging correct version
 *
 * @example
 * ```typescript
 * const result = acknowledgeMetricsRequestSchema.safeParse({
 *   version: 1,
 *   metricsComputedAt: '2025-10-28T12:00:00.000Z'
 * });
 * ```
 */
export const acknowledgeMetricsRequestSchema = z
  .object({
    version: metricsVersionSchema,
    metricsComputedAt: iso8601DateSchema,
  })
  .strict({
    message: 'Acknowledge metrics request contains unexpected fields',
  });

/**
 * Schema for AcknowledgeMetricsResponse
 * Validates metrics acknowledgement API response
 *
 * @public
 * @remarks
 * - success should always be true (errors throw before response)
 * - acknowledgedAt is server timestamp when saved
 *
 * @example
 * ```typescript
 * const result = acknowledgeMetricsResponseSchema.safeParse({
 *   success: true,
 *   acknowledgedAt: '2025-10-28T12:30:00.000Z'
 * });
 * ```
 */
export const acknowledgeMetricsResponseSchema = z
  .object({
    success: z.boolean({
      required_error: 'Success flag is required',
      invalid_type_error: 'Success must be a boolean',
    }),
    acknowledgedAt: pastIso8601DateSchema,
  })
  .strict({
    message: 'Acknowledge metrics response contains unexpected fields',
  })
  .refine(
    (data) => {
      // success should always be true in valid responses
      return data.success === true;
    },
    {
      message: 'Success must be true for valid acknowledgement',
      path: ['success'],
    }
  );

// ============================================================================
// Type Inference Helpers
// ============================================================================

/**
 * Inferred TypeScript type from healthMetricsSchema
 * @public
 */
export type HealthMetricsInput = z.infer<typeof healthMetricsSchema>;

/**
 * Inferred TypeScript type from metricsExplanationsSchema
 * @public
 */
export type MetricsExplanationsInput = z.infer<typeof metricsExplanationsSchema>;

/**
 * Inferred TypeScript type from metricsAcknowledgementSchema
 * @public
 */
export type MetricsAcknowledgementInput = z.infer<typeof metricsAcknowledgementSchema>;

/**
 * Inferred TypeScript type from metricsSummaryResponseSchema
 * @public
 */
export type MetricsSummaryResponseInput = z.infer<typeof metricsSummaryResponseSchema>;

/**
 * Inferred TypeScript type from acknowledgeMetricsRequestSchema
 * @public
 */
export type AcknowledgeMetricsRequestInput = z.infer<typeof acknowledgeMetricsRequestSchema>;

/**
 * Inferred TypeScript type from acknowledgeMetricsResponseSchema
 * @public
 */
export type AcknowledgeMetricsResponseInput = z.infer<typeof acknowledgeMetricsResponseSchema>;

// ============================================================================
// Validation Helper Functions
// ============================================================================

/**
 * Validation result type
 * @public
 */
export interface ValidationResult<T = unknown> {
  /**
   * Whether validation succeeded
   */
  readonly success: boolean;

  /**
   * Validated data if successful
   */
  readonly data?: T;

  /**
   * Array of validation error messages if failed
   */
  readonly errors?: readonly string[];
}

/**
 * Validate health metrics with detailed error messages
 *
 * @param data - Data to validate as HealthMetrics
 * @returns Validation result with typed data or errors
 *
 * @public
 * @example
 * ```typescript
 * const result = validateHealthMetrics({
 *   bmi: 22.5,
 *   bmr: 1800,
 *   tdee: 2500,
 *   computedAt: '2025-10-28T12:00:00.000Z',
 *   version: 1
 * });
 *
 * if (result.success) {
 *   console.log('Valid metrics:', result.data);
 * } else {
 *   console.error('Validation errors:', result.errors);
 * }
 * ```
 */
export function validateHealthMetrics(data: unknown): ValidationResult<HealthMetrics> {
  const result = healthMetricsSchema.safeParse(data);

  if (result.success) {
    return {
      success: true,
      data: result.data,
    };
  }

  return {
    success: false,
    errors: result.error.issues.map((issue) => {
      const path = issue.path.join('.');
      return path ? `${path}: ${issue.message}` : issue.message;
    }),
  };
}

/**
 * Validate metrics summary response with detailed error messages
 *
 * @param data - Data to validate as MetricsSummaryResponse
 * @returns Validation result with typed data or errors
 *
 * @public
 * @example
 * ```typescript
 * const result = validateMetricsSummary(apiResponse);
 * if (!result.success) {
 *   throw new Error(result.errors.join(', '));
 * }
 * ```
 */
export function validateMetricsSummary(
  data: unknown
): ValidationResult<MetricsSummaryResponse> {
  const result = metricsSummaryResponseSchema.safeParse(data);

  if (result.success) {
    return {
      success: true,
      data: result.data,
    };
  }

  return {
    success: false,
    errors: result.error.issues.map((issue) => {
      const path = issue.path.join('.');
      return path ? `${path}: ${issue.message}` : issue.message;
    }),
  };
}

/**
 * Validate acknowledgement request with detailed error messages
 *
 * @param data - Data to validate as AcknowledgeMetricsRequest
 * @returns Validation result with typed data or errors
 *
 * @public
 * @example
 * ```typescript
 * const result = validateAcknowledgementRequest(requestBody);
 * if (!result.success) {
 *   return res.status(400).json({ errors: result.errors });
 * }
 * ```
 */
export function validateAcknowledgementRequest(
  data: unknown
): ValidationResult<AcknowledgeMetricsRequest> {
  const result = acknowledgeMetricsRequestSchema.safeParse(data);

  if (result.success) {
    return {
      success: true,
      data: result.data,
    };
  }

  return {
    success: false,
    errors: result.error.issues.map((issue) => {
      const path = issue.path.join('.');
      return path ? `${path}: ${issue.message}` : issue.message;
    }),
  };
}
