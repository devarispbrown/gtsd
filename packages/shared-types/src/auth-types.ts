/**
 * Authentication API types
 * Types for authentication, authorization, and user management
 */

import { User } from './entities';

// ============================================================================
// User Types
// ============================================================================

/**
 * User profile with additional details
 */
export interface UserProfile extends User {
  phoneNumber?: string;
  timezone?: string;
  notificationPreferences?: NotificationPreferences;
  onboardingCompleted?: boolean;
}

/**
 * Notification preferences
 */
export interface NotificationPreferences {
  push: boolean;
  email: boolean;
  sms: boolean;
  dailyReminder?: boolean;
  reminderTime?: string; // HH:mm format
}

// ============================================================================
// Authentication Tokens
// ============================================================================

/**
 * JWT token payload
 */
export interface TokenPayload {
  userId: number;
  email: string;
  iat: number; // Issued at
  exp: number; // Expiration time
}

/**
 * Authentication tokens
 */
export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number; // In seconds
  tokenType: 'Bearer';
}

// ============================================================================
// Authentication API Requests
// ============================================================================

/**
 * POST /auth/login request
 */
export interface LoginRequest {
  email: string;
  password: string;
  rememberMe?: boolean;
}

/**
 * POST /auth/signup request
 */
export interface SignupRequest {
  email: string;
  password: string;
  name: string;
}

/**
 * POST /auth/refresh request
 */
export interface RefreshTokenRequest {
  refreshToken: string;
}

/**
 * POST /auth/logout request
 */
export interface LogoutRequest {
  refreshToken?: string;
  allDevices?: boolean;
}

/**
 * POST /auth/forgot-password request
 */
export interface ForgotPasswordRequest {
  email: string;
}

/**
 * POST /auth/reset-password request
 */
export interface ResetPasswordRequest {
  token: string;
  newPassword: string;
}

/**
 * POST /auth/verify-email request
 */
export interface VerifyEmailRequest {
  token: string;
}

// ============================================================================
// Authentication API Responses
// ============================================================================

/**
 * POST /auth/login response
 */
export interface LoginResponse {
  user: UserProfile;
  tokens: AuthTokens;
  requiresOnboarding: boolean;
}

/**
 * POST /auth/signup response
 */
export interface SignupResponse {
  user: UserProfile;
  tokens: AuthTokens;
  requiresVerification: boolean;
  requiresOnboarding: boolean;
}

/**
 * POST /auth/refresh response
 */
export interface RefreshTokenResponse {
  tokens: AuthTokens;
}

/**
 * POST /auth/logout response
 */
export interface LogoutResponse {
  success: boolean;
  message: string;
}

/**
 * GET /auth/me response
 */
export interface GetCurrentUserResponse {
  user: UserProfile;
  requiresOnboarding: boolean;
}

/**
 * POST /auth/forgot-password response
 */
export interface ForgotPasswordResponse {
  success: boolean;
  message: string;
}

/**
 * POST /auth/reset-password response
 */
export interface ResetPasswordResponse {
  success: boolean;
  message: string;
}

/**
 * POST /auth/verify-email response
 */
export interface VerifyEmailResponse {
  success: boolean;
  user: UserProfile;
  tokens?: AuthTokens;
}

// ============================================================================
// Authentication Errors
// ============================================================================

/**
 * Authentication error codes
 */
export enum AuthErrorCode {
  INVALID_CREDENTIALS = 'INVALID_CREDENTIALS',
  USER_NOT_FOUND = 'USER_NOT_FOUND',
  USER_INACTIVE = 'USER_INACTIVE',
  EMAIL_NOT_VERIFIED = 'EMAIL_NOT_VERIFIED',
  TOKEN_EXPIRED = 'TOKEN_EXPIRED',
  TOKEN_INVALID = 'TOKEN_INVALID',
  REFRESH_TOKEN_EXPIRED = 'REFRESH_TOKEN_EXPIRED',
  INSUFFICIENT_PERMISSIONS = 'INSUFFICIENT_PERMISSIONS',
  EMAIL_ALREADY_EXISTS = 'EMAIL_ALREADY_EXISTS',
  PASSWORD_TOO_WEAK = 'PASSWORD_TOO_WEAK',
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  NETWORK_ERROR = 'NETWORK_ERROR',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
}

/**
 * Authentication error details
 */
export interface AuthError {
  code: AuthErrorCode;
  message: string;
  details?: Record<string, unknown>;
}

// ============================================================================
// Type Guards
// ============================================================================

/**
 * Check if user has completed onboarding
 * Accepts a user and their settings object
 */
export const hasCompletedOnboarding = (onboardingCompleted?: boolean | null): boolean => {
  return onboardingCompleted === true;
};

/**
 * Check if tokens are expired
 */
export const areTokensExpired = (expiresAt: number): boolean => {
  return Date.now() >= expiresAt * 1000;
};

/**
 * Check if error is an auth error
 */
export const isAuthError = (error: unknown): error is AuthError => {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    'message' in error &&
    Object.values(AuthErrorCode).includes((error as AuthError).code)
  );
};