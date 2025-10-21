/**
 * Authentication Store
 * Manages user authentication state and session management
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { authApi } from '../api/auth';
import tokenStorage from '../utils/secureStorage';
import {
  UserProfile,
  AuthError,
  AuthErrorCode,
  LoginRequest,
  SignupRequest,
} from '@gtsd/shared-types';

export interface AuthState {
  // State
  user: UserProfile | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: AuthError | null;
  pendingDeepLink: string | null;
  requiresOnboarding: boolean;

  // Actions
  login: (email: string, password: string, rememberMe?: boolean) => Promise<void>;
  signup: (email: string, password: string, name: string) => Promise<void>;
  logout: (allDevices?: boolean) => Promise<void>;
  checkAuthStatus: () => Promise<boolean>;
  refreshSession: () => Promise<boolean>;
  setUser: (user: UserProfile) => void;
  clearUser: () => void;
  clearError: () => void;
  setPendingDeepLink: (link: string | null) => void;
  clearPendingDeepLink: () => void;
}

/**
 * Auth store with persistence to AsyncStorage
 */
export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      // Initial state
      user: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
      pendingDeepLink: null,
      requiresOnboarding: false,

      // Login action
      login: async (email: string, password: string, rememberMe?: boolean) => {
        set({ isLoading: true, error: null });

        try {
          const request: LoginRequest = {
            email,
            password,
            rememberMe,
          };

          const response = await authApi.login(request);

          if (response.error) {
            set({
              isLoading: false,
              error: response.error,
              isAuthenticated: false,
            });
            throw response.error;
          }

          if (response.data) {
            set({
              user: response.data.user,
              isAuthenticated: true,
              requiresOnboarding: response.data.requiresOnboarding,
              isLoading: false,
              error: null,
            });
          }
        } catch (error) {
          // Error already set in the if block above
          if (!(error as AuthError)?.code) {
            set({
              isLoading: false,
              error: {
                code: AuthErrorCode.UNKNOWN_ERROR,
                message: 'An unexpected error occurred during login',
              },
            });
          }
          throw error;
        }
      },

      // Signup action
      signup: async (email: string, password: string, name: string) => {
        set({ isLoading: true, error: null });

        try {
          const request: SignupRequest = {
            email,
            password,
            name,
          };

          const response = await authApi.signup(request);

          if (response.error) {
            set({
              isLoading: false,
              error: response.error,
              isAuthenticated: false,
            });
            throw response.error;
          }

          if (response.data) {
            set({
              user: response.data.user,
              isAuthenticated: true,
              requiresOnboarding: response.data.requiresOnboarding,
              isLoading: false,
              error: null,
            });
          }
        } catch (error) {
          // Error already set in the if block above
          if (!(error as AuthError)?.code) {
            set({
              isLoading: false,
              error: {
                code: AuthErrorCode.UNKNOWN_ERROR,
                message: 'An unexpected error occurred during signup',
              },
            });
          }
          throw error;
        }
      },

      // Logout action
      logout: async (allDevices?: boolean) => {
        set({ isLoading: true, error: null });

        try {
          await authApi.logout({ allDevices });

          set({
            user: null,
            isAuthenticated: false,
            isLoading: false,
            pendingDeepLink: null,
            requiresOnboarding: false,
            error: null,
          });
        } catch (error) {
          // Even if logout fails on server, clear local state
          set({
            user: null,
            isAuthenticated: false,
            isLoading: false,
            pendingDeepLink: null,
            requiresOnboarding: false,
            error: null,
          });
        }
      },

      // Check authentication status
      checkAuthStatus: async () => {
        set({ isLoading: true, error: null });

        try {
          // Check if we have stored tokens
          const hasTokens = await tokenStorage.isAuthenticated();

          if (!hasTokens) {
            set({
              isAuthenticated: false,
              isLoading: false,
              user: null,
              requiresOnboarding: false,
            });
            return false;
          }

          // Validate tokens with API by fetching current user
          const response = await authApi.getCurrentUser();

          if (response.error) {
            // Token might be invalid or expired
            await tokenStorage.clearTokens();
            set({
              isAuthenticated: false,
              isLoading: false,
              user: null,
              requiresOnboarding: false,
              error: null, // Don't show error for session check
            });
            return false;
          }

          if (response.data) {
            set({
              user: response.data.user,
              isAuthenticated: true,
              requiresOnboarding: response.data.requiresOnboarding,
              isLoading: false,
              error: null,
            });
            return true;
          }

          set({
            isAuthenticated: false,
            isLoading: false,
            user: null,
            requiresOnboarding: false,
          });
          return false;
        } catch (error) {
          set({
            isAuthenticated: false,
            isLoading: false,
            user: null,
            requiresOnboarding: false,
            error: null, // Don't show error for session check
          });
          return false;
        }
      },

      // Refresh session
      refreshSession: async () => {
        try {
          const refreshToken = await tokenStorage.getRefreshToken();
          if (!refreshToken) return false;

          const response = await authApi.refreshToken({ refreshToken });

          if (response.error) {
            await tokenStorage.clearTokens();
            set({
              isAuthenticated: false,
              user: null,
              requiresOnboarding: false,
            });
            return false;
          }

          // Tokens are automatically updated in the API client
          return true;
        } catch {
          await tokenStorage.clearTokens();
          set({
            isAuthenticated: false,
            user: null,
            requiresOnboarding: false,
          });
          return false;
        }
      },

      // Set user
      setUser: (user: UserProfile) => {
        set({
          user,
          isAuthenticated: true,
          requiresOnboarding: !user.onboardingCompleted,
        });
      },

      // Clear user
      clearUser: () => {
        set({
          user: null,
          isAuthenticated: false,
          pendingDeepLink: null,
          requiresOnboarding: false,
          error: null,
        });
      },

      // Clear error
      clearError: () => {
        set({ error: null });
      },

      // Set pending deep link
      setPendingDeepLink: (link: string | null) => {
        set({ pendingDeepLink: link });
      },

      // Clear pending deep link
      clearPendingDeepLink: () => {
        set({ pendingDeepLink: null });
      },
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
        requiresOnboarding: state.requiresOnboarding,
      }),
    }
  )
);

// Selectors for common use cases
export const selectIsAuthenticated = (state: AuthState) => state.isAuthenticated;
export const selectUser = (state: AuthState) => state.user;
export const selectPendingDeepLink = (state: AuthState) => state.pendingDeepLink;
export const selectIsLoading = (state: AuthState) => state.isLoading;
export const selectError = (state: AuthState) => state.error;
export const selectRequiresOnboarding = (state: AuthState) => state.requiresOnboarding;
export const selectHasCompletedOnboarding = (state: AuthState) =>
  state.user?.onboardingCompleted ?? false;