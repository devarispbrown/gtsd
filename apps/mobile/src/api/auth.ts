/**
 * Authentication API client
 * Handles all authentication-related API calls with type safety
 */

import axios from 'axios';
import apiClient, { handleApiError, setAuthTokens, clearAuthTokens } from './client';
import type {
  LoginRequest,
  LoginResponse,
  SignupRequest,
  SignupResponse,
  RefreshTokenRequest,
  RefreshTokenResponse,
  LogoutRequest,
  LogoutResponse,
  GetCurrentUserResponse,
  ForgotPasswordRequest,
  ForgotPasswordResponse,
  ResetPasswordRequest,
  ResetPasswordResponse,
  VerifyEmailRequest,
  VerifyEmailResponse,
  AuthError,
} from '@gtsd/shared-types';
import { AuthErrorCode } from '@gtsd/shared-types';

/**
 * Transform API error to AuthError
 */
const transformToAuthError = (error: unknown): AuthError => {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data;

    // Check if it's already an AuthError
    if (data?.code && data?.message) {
      return {
        code: data.code as AuthErrorCode,
        message: data.message,
        details: data.details,
      };
    }

    // Map HTTP status codes to auth errors
    switch (error.response?.status) {
      case 401:
        return {
          code: AuthErrorCode.INVALID_CREDENTIALS,
          message: 'Invalid email or password',
        };
      case 403:
        return {
          code: AuthErrorCode.INSUFFICIENT_PERMISSIONS,
          message: 'You do not have permission to perform this action',
        };
      case 404:
        return {
          code: AuthErrorCode.USER_NOT_FOUND,
          message: 'User not found',
        };
      case 409:
        return {
          code: AuthErrorCode.EMAIL_ALREADY_EXISTS,
          message: 'An account with this email already exists',
        };
      case 429:
        return {
          code: AuthErrorCode.RATE_LIMIT_EXCEEDED,
          message: 'Too many attempts. Please try again later',
        };
      default:
        return {
          code: AuthErrorCode.UNKNOWN_ERROR,
          message: handleApiError(error),
        };
    }
  }

  if (!error) {
    return {
      code: AuthErrorCode.NETWORK_ERROR,
      message: 'Network connection failed. Please check your internet connection',
    };
  }

  return {
    code: AuthErrorCode.UNKNOWN_ERROR,
    message: error instanceof Error ? error.message : 'An unknown error occurred',
  };
};

/**
 * Authentication API methods
 */
export const authApi = {
  /**
   * POST /auth/login
   * Authenticate user with email and password
   */
  async login(request: LoginRequest): Promise<{ data?: LoginResponse; error?: AuthError }> {
    try {
      const response = await apiClient.post<LoginResponse>('/auth/login', request);

      // Store tokens on successful login
      if (response.data.tokens) {
        await setAuthTokens(
          response.data.tokens.accessToken,
          response.data.tokens.refreshToken
        );
      }

      return { data: response.data };
    } catch (error) {
      return { error: transformToAuthError(error) };
    }
  },

  /**
   * POST /auth/signup
   * Create a new user account
   */
  async signup(request: SignupRequest): Promise<{ data?: SignupResponse; error?: AuthError }> {
    try {
      const response = await apiClient.post<SignupResponse>('/auth/signup', request);

      // Store tokens on successful signup
      if (response.data.tokens) {
        await setAuthTokens(
          response.data.tokens.accessToken,
          response.data.tokens.refreshToken
        );
      }

      return { data: response.data };
    } catch (error) {
      return { error: transformToAuthError(error) };
    }
  },

  /**
   * POST /auth/logout
   * Log out the current user
   */
  async logout(request?: LogoutRequest): Promise<{ data?: LogoutResponse; error?: AuthError }> {
    try {
      const response = await apiClient.post<LogoutResponse>('/auth/logout', request || {});

      // Clear tokens on successful logout
      await clearAuthTokens();

      return { data: response.data };
    } catch (error) {
      // Clear tokens even if logout request fails
      await clearAuthTokens();
      return { error: transformToAuthError(error) };
    }
  },

  /**
   * POST /auth/refresh
   * Refresh access token using refresh token
   */
  async refreshToken(request: RefreshTokenRequest): Promise<{ data?: RefreshTokenResponse; error?: AuthError }> {
    try {
      const response = await apiClient.post<RefreshTokenResponse>('/auth/refresh', request);

      // Update tokens on successful refresh
      if (response.data.tokens) {
        await setAuthTokens(
          response.data.tokens.accessToken,
          response.data.tokens.refreshToken
        );
      }

      return { data: response.data };
    } catch (error) {
      return { error: transformToAuthError(error) };
    }
  },

  /**
   * GET /auth/me
   * Get current authenticated user
   */
  async getCurrentUser(): Promise<{ data?: GetCurrentUserResponse; error?: AuthError }> {
    try {
      const response = await apiClient.get<GetCurrentUserResponse>('/auth/me');
      return { data: response.data };
    } catch (error) {
      return { error: transformToAuthError(error) };
    }
  },

  /**
   * POST /auth/forgot-password
   * Request password reset email
   */
  async forgotPassword(request: ForgotPasswordRequest): Promise<{ data?: ForgotPasswordResponse; error?: AuthError }> {
    try {
      const response = await apiClient.post<ForgotPasswordResponse>('/auth/forgot-password', request);
      return { data: response.data };
    } catch (error) {
      return { error: transformToAuthError(error) };
    }
  },

  /**
   * POST /auth/reset-password
   * Reset password with token
   */
  async resetPassword(request: ResetPasswordRequest): Promise<{ data?: ResetPasswordResponse; error?: AuthError }> {
    try {
      const response = await apiClient.post<ResetPasswordResponse>('/auth/reset-password', request);
      return { data: response.data };
    } catch (error) {
      return { error: transformToAuthError(error) };
    }
  },

  /**
   * POST /auth/verify-email
   * Verify email address with token
   */
  async verifyEmail(request: VerifyEmailRequest): Promise<{ data?: VerifyEmailResponse; error?: AuthError }> {
    try {
      const response = await apiClient.post<VerifyEmailResponse>('/auth/verify-email', request);

      // Store tokens if provided (auto-login after verification)
      if (response.data.tokens) {
        await setAuthTokens(
          response.data.tokens.accessToken,
          response.data.tokens.refreshToken
        );
      }

      return { data: response.data };
    } catch (error) {
      return { error: transformToAuthError(error) };
    }
  },
};