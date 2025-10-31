/**
 * API route types for health metrics endpoints
 * Provides Express-specific type definitions for metrics routes
 *
 * @module routes/profile/metrics.types
 */

import type { Request, Response } from 'express';
import type {
  MetricsSummaryResponse,
  AcknowledgeMetricsRequest,
  AcknowledgeMetricsResponse,
  HealthMetrics,
  MetricsAcknowledgement,
} from '@gtsd/shared-types';

// ============================================================================
// Express Request/Response Types
// ============================================================================

/**
 * Express request type for GET /v1/profile/metrics/summary
 * No request body or params needed - uses authenticated user from JWT
 *
 * @public
 * @remarks
 * - User ID extracted from req.user (set by auth middleware)
 * - No query parameters required
 * - Response includes metrics, explanations, and acknowledgement status
 */
export interface GetMetricsSummaryRequest extends Request {
  /**
   * Authenticated user from JWT token
   * Set by authentication middleware
   */
  user?: {
    userId: number;
    email: string;
  };
}

/**
 * Express response type for GET /v1/profile/metrics/summary
 * Returns complete metrics summary with explanations
 *
 * @public
 */
export type GetMetricsSummaryResponse = Response<MetricsSummaryResponse>;

/**
 * Express request type for POST /v1/profile/metrics/acknowledge
 * Request body contains version and timestamp to acknowledge
 *
 * @public
 * @remarks
 * - User ID extracted from req.user (set by auth middleware)
 * - Request body must include version and metricsComputedAt
 * - Used to confirm user has reviewed their metrics
 */
export interface AcknowledgeMetricsApiRequest extends Request {
  /**
   * Authenticated user from JWT token
   * Set by authentication middleware
   */
  user?: {
    userId: number;
    email: string;
  };

  /**
   * Request body with acknowledgement data
   */
  body: AcknowledgeMetricsRequest;
}

/**
 * Express response type for POST /v1/profile/metrics/acknowledge
 * Returns success status and server timestamp
 *
 * @public
 */
export type AcknowledgeMetricsApiResponse = Response<AcknowledgeMetricsResponse>;

// ============================================================================
// Database Query Result Types
// ============================================================================

/**
 * Database query result for user settings with metrics data
 * Raw data from database before computation
 *
 * @internal
 * @remarks
 * Used by service layer to fetch user data for metrics calculation
 * All numeric fields are returned as strings or Decimals from Drizzle
 */
export interface UserMetricsData {
  /**
   * User ID
   */
  readonly userId: number;

  /**
   * Current weight in kg (from user_settings)
   */
  readonly currentWeight: string | number | null;

  /**
   * Height in cm (from user_settings)
   */
  readonly height: string | number | null;

  /**
   * Date of birth (for age calculation)
   */
  readonly dateOfBirth: Date | null;

  /**
   * Biological gender for BMR calculation
   */
  readonly gender: string | null;

  /**
   * Activity level for TDEE calculation
   */
  readonly activityLevel: string | null;
}

/**
 * Database query result for metrics acknowledgement
 * Raw acknowledgement data from database
 *
 * @internal
 * @remarks
 * Used to check if user has acknowledged current metrics version
 */
export interface MetricsAcknowledgementRecord {
  /**
   * User ID
   */
  readonly userId: number;

  /**
   * Version that was acknowledged
   */
  readonly version: number;

  /**
   * Timestamp when metrics were computed
   */
  readonly metricsComputedAt: Date;

  /**
   * Timestamp when user acknowledged
   */
  readonly acknowledgedAt: Date;

  /**
   * Record creation timestamp
   */
  readonly createdAt: Date;
}

/**
 * Insert type for metrics acknowledgement
 * Data shape for inserting new acknowledgement record
 *
 * @internal
 */
export interface InsertMetricsAcknowledgement {
  /**
   * User ID
   */
  readonly userId: number;

  /**
   * Version being acknowledged
   */
  readonly version: number;

  /**
   * Timestamp of metrics being acknowledged
   */
  readonly metricsComputedAt: Date;

  /**
   * Timestamp when acknowledged (server time)
   */
  readonly acknowledgedAt: Date;
}

// ============================================================================
// Service Layer Types
// ============================================================================

/**
 * Computed metrics with metadata
 * Internal service type before formatting for API response
 *
 * @internal
 * @remarks
 * Used by service layer to pass computed metrics with metadata
 * Includes raw HealthMetrics and acknowledgement status
 */
export interface ComputedMetricsWithStatus {
  /**
   * Computed health metrics
   */
  readonly metrics: HealthMetrics;

  /**
   * Whether metrics have been acknowledged
   */
  readonly acknowledged: boolean;

  /**
   * Acknowledgement metadata if acknowledged
   */
  readonly acknowledgement?: MetricsAcknowledgement;
}

/**
 * BMI calculation result with interpretation
 * Intermediate type for BMI calculation
 *
 * @internal
 */
export interface BMICalculationResult {
  /**
   * Calculated BMI value
   */
  readonly bmi: number;

  /**
   * WHO category (underweight, normal, overweight, obese)
   */
  readonly category: string;

  /**
   * User-friendly description
   */
  readonly description: string;
}

/**
 * Metrics computation input
 * Validated input data for metrics calculation
 *
 * @internal
 * @remarks
 * All values are validated and converted from database types
 * Used as input to metrics calculation functions
 */
export interface MetricsComputationInput {
  /**
   * Current weight in kg
   */
  readonly weight: number;

  /**
   * Height in cm
   */
  readonly height: number;

  /**
   * Age in years
   */
  readonly age: number;

  /**
   * Biological gender
   */
  readonly gender: 'male' | 'female' | 'other';

  /**
   * Activity level
   */
  readonly activityLevel:
    | 'sedentary'
    | 'lightly_active'
    | 'moderately_active'
    | 'very_active'
    | 'extremely_active';
}

// ============================================================================
// Error Response Types
// ============================================================================

/**
 * Error response for metrics endpoints
 * Standardized error format
 *
 * @public
 */
export interface MetricsErrorResponse {
  /**
   * Error message
   */
  readonly error: string;

  /**
   * HTTP status code
   */
  readonly statusCode: number;

  /**
   * Detailed error messages (for validation errors)
   */
  readonly details?: readonly string[];

  /**
   * Error code for client handling
   */
  readonly code?: string;
}

/**
 * Specific error codes for metrics endpoints
 * @public
 */
export const MetricsErrorCodes = {
  /**
   * User settings not found or incomplete
   */
  INCOMPLETE_PROFILE: 'INCOMPLETE_PROFILE',

  /**
   * Metrics computation failed
   */
  COMPUTATION_FAILED: 'COMPUTATION_FAILED',

  /**
   * Version mismatch in acknowledgement
   */
  VERSION_MISMATCH: 'VERSION_MISMATCH',

  /**
   * Metrics timestamp mismatch
   */
  TIMESTAMP_MISMATCH: 'TIMESTAMP_MISMATCH',

  /**
   * Acknowledgement already exists
   */
  ALREADY_ACKNOWLEDGED: 'ALREADY_ACKNOWLEDGED',

  /**
   * Invalid request data
   */
  INVALID_REQUEST: 'INVALID_REQUEST',

  /**
   * Database error
   */
  DATABASE_ERROR: 'DATABASE_ERROR',
} as const;

/**
 * Type for metrics error codes
 * @public
 */
export type MetricsErrorCode = (typeof MetricsErrorCodes)[keyof typeof MetricsErrorCodes];

// ============================================================================
// Middleware Types
// ============================================================================

/**
 * Authenticated user type from JWT middleware
 * Standard user object attached to request
 *
 * @public
 */
export interface AuthenticatedUser {
  /**
   * User ID from JWT
   */
  readonly userId: number;

  /**
   * User email from JWT
   */
  readonly email: string;

  /**
   * Token issued at (unix timestamp)
   */
  readonly iat?: number;

  /**
   * Token expires at (unix timestamp)
   */
  readonly exp?: number;
}

// ============================================================================
// OpenAPI/Swagger Types
// ============================================================================

/**
 * OpenAPI example for MetricsSummaryResponse
 * Used in API documentation
 *
 * @public
 */
export const MetricsSummaryResponseExample: MetricsSummaryResponse = {
  metrics: {
    bmi: 22.5,
    bmr: 1800,
    tdee: 2500,
    computedAt: '2025-10-28T12:00:00.000Z',
    version: 1,
  },
  explanations: {
    bmi: 'Your BMI of 22.5 is in the normal weight range (18.5-24.9). This is considered healthy for most adults and is associated with lower risk of chronic diseases. BMI is calculated using your height and weight.',
    bmr: 'Your body burns 1,800 calories per day at complete rest. This is your Basal Metabolic Rate (BMR), which represents the energy needed for essential functions like breathing, circulation, and cell production.',
    tdee: 'You burn approximately 2,500 calories per day with your current activity level. This is your Total Daily Energy Expenditure (TDEE), which includes your BMR plus calories burned through activity and movement.',
  },
  acknowledged: true,
  acknowledgement: {
    acknowledgedAt: '2025-10-28T12:30:00.000Z',
    version: 1,
  },
};

/**
 * OpenAPI example for AcknowledgeMetricsRequest
 * Used in API documentation
 *
 * @public
 */
export const AcknowledgeMetricsRequestExample: AcknowledgeMetricsRequest = {
  version: 1,
  metricsComputedAt: '2025-10-28T12:00:00.000Z',
};

/**
 * OpenAPI example for AcknowledgeMetricsResponse
 * Used in API documentation
 *
 * @public
 */
export const AcknowledgeMetricsResponseExample: AcknowledgeMetricsResponse = {
  success: true,
  acknowledgedAt: '2025-10-28T12:30:00.000Z',
};

/**
 * OpenAPI example for error response
 * Used in API documentation
 *
 * @public
 */
export const MetricsErrorResponseExample: MetricsErrorResponse = {
  error: 'Profile incomplete. Please complete your onboarding to view metrics.',
  statusCode: 400,
  code: 'INCOMPLETE_PROFILE',
  details: [
    'Current weight is required',
    'Height is required',
    'Date of birth is required',
  ],
};
