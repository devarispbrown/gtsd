/**
 * Authentication Store
 * Manages user authentication state and session management
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface User {
  id: number;
  email: string;
  name: string;
  onboardingCompleted: boolean;
}

interface AuthState {
  // State
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  pendingDeepLink: string | null;

  // Actions
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  checkAuthStatus: () => Promise<boolean>;
  setUser: (user: User) => void;
  clearUser: () => void;
  setPendingDeepLink: (link: string | null) => void;
  clearPendingDeepLink: () => void;
}

/**
 * Auth store with persistence to AsyncStorage
 */
export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      // Initial state
      user: null,
      isAuthenticated: false,
      isLoading: false,
      pendingDeepLink: null,

      // Login action
      login: async (email: string, _password: string) => {
        set({ isLoading: true });

        try {
          // TODO: Replace with actual API call
          // For now, simulate a successful login
          await new Promise(resolve => setTimeout(resolve, 1000));

          const mockUser: User = {
            id: 1,
            email,
            name: email.split('@')[0],
            onboardingCompleted: true,
          };

          set({
            user: mockUser,
            isAuthenticated: true,
            isLoading: false,
          });
        } catch (error) {
          set({ isLoading: false });
          throw error;
        }
      },

      // Logout action
      logout: async () => {
        set({ isLoading: true });

        try {
          // TODO: Call logout API endpoint
          await new Promise(resolve => setTimeout(resolve, 500));

          set({
            user: null,
            isAuthenticated: false,
            isLoading: false,
            pendingDeepLink: null,
          });
        } catch (error) {
          set({ isLoading: false });
          throw error;
        }
      },

      // Check authentication status
      checkAuthStatus: async () => {
        set({ isLoading: true });

        try {
          // Check if we have a stored user
          const state = get();

          if (state.user) {
            // TODO: Validate token with API
            // For now, assume valid if user exists
            set({
              isAuthenticated: true,
              isLoading: false,
            });
            return true;
          }

          set({
            isAuthenticated: false,
            isLoading: false,
          });
          return false;
        } catch (error) {
          set({
            isAuthenticated: false,
            isLoading: false,
          });
          return false;
        }
      },

      // Set user
      setUser: (user: User) => {
        set({
          user,
          isAuthenticated: true,
        });
      },

      // Clear user
      clearUser: () => {
        set({
          user: null,
          isAuthenticated: false,
          pendingDeepLink: null,
        });
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
      }),
    }
  )
);

// Selectors for common use cases
export const selectIsAuthenticated = (state: AuthState) => state.isAuthenticated;
export const selectUser = (state: AuthState) => state.user;
export const selectPendingDeepLink = (state: AuthState) => state.pendingDeepLink;
export const selectIsLoading = (state: AuthState) => state.isLoading;