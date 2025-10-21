/**
 * Type-safe API client for GTSD mobile app
 * Provides strongly-typed methods for all API endpoints with runtime validation
 */

import axios, { AxiosInstance, AxiosError, AxiosRequestConfig } from 'axios';
import tokenStorage from '../utils/secureStorage';
import type {
  GetTodayTasksQuery,
  GetTodayTasksResponse,
  CreateEvidenceRequest,
  CreateEvidenceResponse,
} from '@gtsd/shared-types';

import appConfig from '../config';

// API base configuration
const API_BASE_URL = appConfig.apiUrl;
const API_TIMEOUT = appConfig.apiTimeout;

// Create axios instance with defaults
const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: API_TIMEOUT,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});

// Request interceptor to add auth token
apiClient.interceptors.request.use(
  async (config) => {
    try {
      const token = await tokenStorage.getAccessToken();
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (error) {
      console.error('Error getting auth token:', error);
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as AxiosRequestConfig & { _retry?: boolean };

    // Handle 401 errors (unauthorized)
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = await tokenStorage.getRefreshToken();
        if (refreshToken) {
          // Attempt to refresh the token
          const response = await axios.post(`${API_BASE_URL}/auth/refresh`, {
            refreshToken,
          });

          const { tokens } = response.data;
          await tokenStorage.storeTokens({
            accessToken: tokens.accessToken,
            refreshToken: tokens.refreshToken,
            expiresAt: Date.now() + (tokens.expiresIn * 1000),
          });

          // Retry the original request with new token
          if (originalRequest.headers) {
            originalRequest.headers.Authorization = `Bearer ${tokens.accessToken}`;
          }
          return apiClient(originalRequest);
        }
      } catch (refreshError) {
        // Refresh failed, redirect to login
        await tokenStorage.clearTokens();
        // Navigation to login will be handled by the app
      }
    }

    return Promise.reject(error);
  }
);

// Helper function to handle API errors
export const handleApiError = (error: unknown): string => {
  if (axios.isAxiosError(error)) {
    if (error.response) {
      // Server responded with error
      const message = error.response.data?.message || error.response.data?.error;
      if (message) return message;

      switch (error.response.status) {
        case 400:
          return 'Bad request. Please check your input.';
        case 401:
          return 'You are not authorized. Please login again.';
        case 403:
          return 'You do not have permission to perform this action.';
        case 404:
          return 'The requested resource was not found.';
        case 500:
          return 'Server error. Please try again later.';
        default:
          return `Error: ${error.response.status}`;
      }
    } else if (error.request) {
      // Request made but no response
      return 'Network error. Please check your connection.';
    }
    return error.message || 'An unexpected error occurred.';
  }

  if (error instanceof Error) {
    return error.message;
  }

  return 'An unknown error occurred.';
};

// Auth helper functions
export const setAuthTokens = async (accessToken: string, refreshToken?: string, expiresIn?: number) => {
  await tokenStorage.storeTokens({
    accessToken,
    refreshToken,
    expiresAt: expiresIn ? Date.now() + (expiresIn * 1000) : undefined,
  });
};

export const clearAuthTokens = async () => {
  await tokenStorage.clearTokens();
};

export const getAuthToken = async (): Promise<string | null> => {
  return tokenStorage.getAccessToken();
};

export const isAuthenticated = async (): Promise<boolean> => {
  return tokenStorage.isAuthenticated();
};

// Generic request wrapper for better error handling
export async function apiRequest<T>(
  request: () => Promise<{ data: T }>
): Promise<{ data?: T; error?: string }> {
  try {
    const response = await request();
    return { data: response.data };
  } catch (error) {
    return { error: handleApiError(error) };
  }
}

// ============================================================================
// TYPE-SAFE API METHODS
// ============================================================================

/**
 * Task API methods with full type safety
 */
export const taskApi = {
  /**
   * GET /v1/tasks/today
   * Fetch today's tasks with optional filters
   *
   * @param query - Query parameters for filtering and pagination
   * @returns Promise with today's tasks response
   *
   * @example
   * const response = await taskApi.getTodayTasks({ date: '2025-09-29', limit: 20 });
   * if (response.data) {
   *   console.log(response.data.tasksByType);
   * }
   */
  getTodayTasks: async (
    query?: GetTodayTasksQuery
  ): Promise<{ data?: GetTodayTasksResponse; error?: string }> => {
    const params = new URLSearchParams();

    if (query?.date) params.append('date', query.date);
    if (query?.limit) params.append('limit', query.limit.toString());
    if (query?.offset) params.append('offset', query.offset.toString());
    if (query?.type) params.append('type', query.type);

    const queryString = params.toString();
    const endpoint = `/v1/tasks/today${queryString ? `?${queryString}` : ''}`;

    return apiRequest(() => apiClient.get<GetTodayTasksResponse>(endpoint));
  },
};

/**
 * Evidence API methods with full type safety
 */
export const evidenceApi = {
  /**
   * POST /v1/evidence
   * Create evidence for task completion
   *
   * @param request - Evidence creation request body
   * @returns Promise with evidence creation response
   *
   * @example
   * const response = await evidenceApi.createEvidence({
   *   taskId: 123,
   *   type: 'metrics',
   *   data: { metrics: { actualSets: 3, actualReps: 10 } },
   *   notes: 'Great workout!'
   * });
   */
  createEvidence: async (
    request: CreateEvidenceRequest
  ): Promise<{ data?: CreateEvidenceResponse; error?: string }> => {
    return apiRequest(() =>
      apiClient.post<CreateEvidenceResponse>('/v1/evidence', request)
    );
  },
};

/**
 * Combined API export with all type-safe methods
 */
export const api = {
  tasks: taskApi,
  evidence: evidenceApi,

  // Authentication helpers
  auth: {
    setTokens: setAuthTokens,
    clearTokens: clearAuthTokens,
    getToken: getAuthToken,
    isAuthenticated,
  },
};

// Export configured client
export default apiClient;