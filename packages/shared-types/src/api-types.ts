/**
 * API request and response types
 * These types define the shape of data exchanged between client and server
 */

import { DailyTask, Evidence } from './entities';
import { TaskType, EvidenceType } from './enums';
import { EvidenceMetrics } from './evidence-metrics';

// ============================================================================
// API Response Wrappers
// ============================================================================

/**
 * Standard API success response
 */
export interface ApiSuccessResponse<T> {
  success: true;
  data: T;
  message?: string;
  timestamp: string;
}

/**
 * Standard API error response
 */
export interface ApiErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
  timestamp: string;
}

/**
 * Union type for all API responses
 */
export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse;

/**
 * Type guard to check if response is successful
 */
export const isApiSuccess = <T>(response: ApiResponse<T>): response is ApiSuccessResponse<T> => {
  return response.success === true;
};

/**
 * Type guard to check if response is an error
 */
export const isApiError = <T>(response: ApiResponse<T>): response is ApiErrorResponse => {
  return response.success === false;
};

// ============================================================================
// Pagination Types
// ============================================================================

/**
 * Pagination metadata
 */
export interface PaginationMeta {
  limit: number;
  offset: number;
  total: number;
  hasMore: boolean;
}

/**
 * Paginated response wrapper
 */
export interface PaginatedResponse<T> {
  items: T[];
  pagination: PaginationMeta;
}

// ============================================================================
// Task API Types
// ============================================================================

/**
 * Task with evidence - enriched task object
 */
export interface TaskWithEvidence extends DailyTask {
  evidence: Evidence[];
}

/**
 * Grouped tasks by type
 */
export interface TasksByType {
  [taskType: string]: TaskWithEvidence[];
}

/**
 * Streak summary
 */
export interface StreakSummary {
  current: number;
  longest: number;
  totalDays: number;
}

/**
 * GET /v1/tasks/today query parameters
 */
export interface GetTodayTasksQuery {
  date?: string; // YYYY-MM-DD format
  limit?: number;
  offset?: number;
  type?: TaskType;
}

/**
 * GET /v1/tasks/today response
 */
export interface GetTodayTasksResponse {
  date: string;
  totalTasks: number;
  completedTasks: number;
  completionPercentage: number;
  tasksByType: TasksByType;
  streak: StreakSummary;
  pagination: PaginationMeta;
}

// ============================================================================
// Evidence API Types
// ============================================================================

/**
 * Text log evidence data
 */
export interface TextLogData {
  text: string;
}

/**
 * Metrics evidence data
 */
export interface MetricsData {
  metrics: EvidenceMetrics | Record<string, string | number | boolean>;
}

/**
 * Photo reference evidence data
 */
export interface PhotoReferenceData {
  photoUrl: string;
  photoStorageKey?: string;
}

/**
 * Discriminated union for evidence data
 */
export type EvidenceData = TextLogData | MetricsData | PhotoReferenceData;

/**
 * POST /v1/evidence request body
 */
export interface CreateEvidenceRequest {
  taskId: number;
  type: EvidenceType;
  data: EvidenceData;
  notes?: string;
}

/**
 * POST /v1/evidence response
 */
export interface CreateEvidenceResponse {
  task: TaskWithEvidence;
  evidence: Evidence;
  streakUpdated: boolean;
  newStreak: number;
}

// ============================================================================
// Type Guards for Evidence Data
// ============================================================================

/**
 * Type guard for text log data
 */
export const isTextLogData = (data: EvidenceData): data is TextLogData => {
  return 'text' in data;
};

/**
 * Type guard for metrics data
 */
export const isMetricsData = (data: EvidenceData): data is MetricsData => {
  return 'metrics' in data;
};

/**
 * Type guard for photo reference data
 */
export const isPhotoReferenceData = (data: EvidenceData): data is PhotoReferenceData => {
  return 'photoUrl' in data;
};

// ============================================================================
// Loading State Types
// ============================================================================

/**
 * Generic loading state with discriminated union
 */
export type LoadingState<T, E = Error> =
  | { status: 'idle'; data: null; error: null }
  | { status: 'loading'; data: null; error: null }
  | { status: 'success'; data: T; error: null }
  | { status: 'error'; data: null; error: E };

/**
 * Type guard for idle state
 */
export const isIdle = <T, E>(
  state: LoadingState<T, E>
): state is LoadingState<T, E> & { status: 'idle' } => {
  return state.status === 'idle';
};

/**
 * Type guard for loading state
 */
export const isLoading = <T, E>(
  state: LoadingState<T, E>
): state is LoadingState<T, E> & { status: 'loading' } => {
  return state.status === 'loading';
};

/**
 * Type guard for success state
 */
export const isSuccess = <T, E>(
  state: LoadingState<T, E>
): state is LoadingState<T, E> & { status: 'success'; data: T } => {
  return state.status === 'success';
};

/**
 * Type guard for error state
 */
export const isError = <T, E>(
  state: LoadingState<T, E>
): state is LoadingState<T, E> & { status: 'error'; error: E } => {
  return state.status === 'error';
};

// ============================================================================
// Utility Types
// ============================================================================

/**
 * Makes all properties of T and nested objects partial
 */
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

/**
 * Makes specific keys K of T required
 */
export type RequireKeys<T, K extends keyof T> = T & Required<Pick<T, K>>;

/**
 * Extracts keys from T where value is of type U
 */
export type KeysOfType<T, U> = {
  [K in keyof T]: T[K] extends U ? K : never;
}[keyof T];

/**
 * Creates a type with all keys from T but values set to type U
 */
export type MapValues<T, U> = {
  [K in keyof T]: U;
};
