/**
 * Authentication Store Tests
 * Tests for authentication state management and API integration
 */

import { renderHook, act, waitFor } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuthStore } from '../../src/stores/authStore';
import { authApi } from '../../src/api/auth';
import tokenStorage from '../../src/utils/secureStorage';
import type { AuthErrorCode, UserProfile } from '@gtsd/shared-types';

// Mock dependencies
jest.mock('../../src/api/auth');
jest.mock('../../src/utils/secureStorage');
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

describe('AuthStore', () => {
  const mockUser: UserProfile = {
    id: 1,
    email: 'test@example.com',
    name: 'Test User',
    isActive: true,
    onboardingCompleted: true,
    createdAt: '2025-01-01',
    updatedAt: '2025-01-01',
  };

  const mockTokens = {
    accessToken: 'mock-access-token',
    refreshToken: 'mock-refresh-token',
    expiresIn: 3600,
    tokenType: 'Bearer' as const,
  };

  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();
    AsyncStorage.clear();

    // Reset store state
    useAuthStore.setState({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
      pendingDeepLink: null,
      requiresOnboarding: false,
    });
  });

  describe('Login', () => {
    it('should successfully login user', async () => {
      // Mock successful login
      (authApi.login as jest.Mock).mockResolvedValue({
        data: {
          user: mockUser,
          tokens: mockTokens,
          requiresOnboarding: false,
        },
      });

      const { result } = renderHook(() => useAuthStore());

      await act(async () => {
        await result.current.login('test@example.com', 'password', true);
      });

      expect(result.current.isAuthenticated).toBe(true);
      expect(result.current.user).toEqual(mockUser);
      expect(result.current.requiresOnboarding).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it('should handle login with onboarding required', async () => {
      const userWithoutOnboarding = {
        ...mockUser,
        onboardingCompleted: false,
      };

      (authApi.login as jest.Mock).mockResolvedValue({
        data: {
          user: userWithoutOnboarding,
          tokens: mockTokens,
          requiresOnboarding: true,
        },
      });

      const { result } = renderHook(() => useAuthStore());

      await act(async () => {
        await result.current.login('test@example.com', 'password');
      });

      expect(result.current.isAuthenticated).toBe(true);
      expect(result.current.requiresOnboarding).toBe(true);
    });

    it('should handle login failure', async () => {
      const mockError = {
        code: 'INVALID_CREDENTIALS' as AuthErrorCode,
        message: 'Invalid email or password',
      };

      (authApi.login as jest.Mock).mockResolvedValue({
        error: mockError,
      });

      const { result } = renderHook(() => useAuthStore());

      await expect(
        act(async () => {
          await result.current.login('test@example.com', 'wrong-password');
        })
      ).rejects.toEqual(mockError);

      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.user).toBeNull();
      expect(result.current.error).toEqual(mockError);
    });

    it('should set loading state during login', async () => {
      (authApi.login as jest.Mock).mockImplementation(
        () =>
          new Promise((resolve) =>
            setTimeout(
              () =>
                resolve({
                  data: {
                    user: mockUser,
                    tokens: mockTokens,
                    requiresOnboarding: false,
                  },
                }),
              100
            )
          )
      );

      const { result } = renderHook(() => useAuthStore());

      const loginPromise = act(async () => {
        await result.current.login('test@example.com', 'password');
      });

      // Check loading state is true immediately after calling login
      expect(result.current.isLoading).toBe(true);

      await loginPromise;

      // Check loading state is false after login completes
      expect(result.current.isLoading).toBe(false);
    });
  });

  describe('Signup', () => {
    it('should successfully create new user account', async () => {
      (authApi.signup as jest.Mock).mockResolvedValue({
        data: {
          user: mockUser,
          tokens: mockTokens,
          requiresVerification: false,
          requiresOnboarding: true,
        },
      });

      const { result } = renderHook(() => useAuthStore());

      await act(async () => {
        await result.current.signup('test@example.com', 'password', 'Test User');
      });

      expect(result.current.isAuthenticated).toBe(true);
      expect(result.current.user).toEqual(mockUser);
      expect(result.current.requiresOnboarding).toBe(true);
    });

    it('should handle signup failure for existing email', async () => {
      const mockError = {
        code: 'EMAIL_ALREADY_EXISTS' as AuthErrorCode,
        message: 'An account with this email already exists',
      };

      (authApi.signup as jest.Mock).mockResolvedValue({
        error: mockError,
      });

      const { result } = renderHook(() => useAuthStore());

      await expect(
        act(async () => {
          await result.current.signup('existing@example.com', 'password', 'Test User');
        })
      ).rejects.toEqual(mockError);

      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.error).toEqual(mockError);
    });
  });

  describe('Logout', () => {
    it('should clear user state on logout', async () => {
      // Set initial authenticated state
      useAuthStore.setState({
        user: mockUser,
        isAuthenticated: true,
        requiresOnboarding: false,
      });

      (authApi.logout as jest.Mock).mockResolvedValue({
        data: { success: true, message: 'Logged out successfully' },
      });

      const { result } = renderHook(() => useAuthStore());

      await act(async () => {
        await result.current.logout();
      });

      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.user).toBeNull();
      expect(result.current.pendingDeepLink).toBeNull();
    });

    it('should clear state even if logout API fails', async () => {
      useAuthStore.setState({
        user: mockUser,
        isAuthenticated: true,
      });

      (authApi.logout as jest.Mock).mockRejectedValue(new Error('Network error'));

      const { result } = renderHook(() => useAuthStore());

      await act(async () => {
        await result.current.logout();
      });

      // State should still be cleared
      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.user).toBeNull();
    });
  });

  describe('Check Auth Status', () => {
    it('should validate existing session', async () => {
      (tokenStorage.isAuthenticated as jest.Mock).mockResolvedValue(true);
      (authApi.getCurrentUser as jest.Mock).mockResolvedValue({
        data: {
          user: mockUser,
          requiresOnboarding: false,
        },
      });

      const { result } = renderHook(() => useAuthStore());

      let isAuthenticated = false;
      await act(async () => {
        isAuthenticated = await result.current.checkAuthStatus();
      });

      expect(isAuthenticated).toBe(true);
      expect(result.current.user).toEqual(mockUser);
      expect(result.current.isAuthenticated).toBe(true);
    });

    it('should handle no stored tokens', async () => {
      (tokenStorage.isAuthenticated as jest.Mock).mockResolvedValue(false);

      const { result } = renderHook(() => useAuthStore());

      let isAuthenticated = false;
      await act(async () => {
        isAuthenticated = await result.current.checkAuthStatus();
      });

      expect(isAuthenticated).toBe(false);
      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.user).toBeNull();
    });

    it('should handle invalid tokens', async () => {
      (tokenStorage.isAuthenticated as jest.Mock).mockResolvedValue(true);
      (authApi.getCurrentUser as jest.Mock).mockResolvedValue({
        error: {
          code: 'TOKEN_INVALID' as AuthErrorCode,
          message: 'Invalid token',
        },
      });
      (tokenStorage.clearTokens as jest.Mock).mockResolvedValue(undefined);

      const { result } = renderHook(() => useAuthStore());

      let isAuthenticated = false;
      await act(async () => {
        isAuthenticated = await result.current.checkAuthStatus();
      });

      expect(isAuthenticated).toBe(false);
      expect(tokenStorage.clearTokens).toHaveBeenCalled();
      expect(result.current.isAuthenticated).toBe(false);
    });
  });

  describe('Refresh Session', () => {
    it('should successfully refresh tokens', async () => {
      (tokenStorage.getRefreshToken as jest.Mock).mockResolvedValue('mock-refresh-token');
      (authApi.refreshToken as jest.Mock).mockResolvedValue({
        data: { tokens: mockTokens },
      });

      const { result } = renderHook(() => useAuthStore());

      let success = false;
      await act(async () => {
        success = await result.current.refreshSession();
      });

      expect(success).toBe(true);
    });

    it('should handle refresh token failure', async () => {
      (tokenStorage.getRefreshToken as jest.Mock).mockResolvedValue('mock-refresh-token');
      (authApi.refreshToken as jest.Mock).mockResolvedValue({
        error: {
          code: 'REFRESH_TOKEN_EXPIRED' as AuthErrorCode,
          message: 'Refresh token expired',
        },
      });
      (tokenStorage.clearTokens as jest.Mock).mockResolvedValue(undefined);

      const { result } = renderHook(() => useAuthStore());

      let success = false;
      await act(async () => {
        success = await result.current.refreshSession();
      });

      expect(success).toBe(false);
      expect(tokenStorage.clearTokens).toHaveBeenCalled();
      expect(result.current.isAuthenticated).toBe(false);
    });

    it('should return false when no refresh token available', async () => {
      (tokenStorage.getRefreshToken as jest.Mock).mockResolvedValue(null);

      const { result } = renderHook(() => useAuthStore());

      let success = false;
      await act(async () => {
        success = await result.current.refreshSession();
      });

      expect(success).toBe(false);
    });
  });

  describe('Deep Link Management', () => {
    it('should set and clear pending deep link', () => {
      const { result } = renderHook(() => useAuthStore());

      act(() => {
        result.current.setPendingDeepLink('gtsd://task/123');
      });

      expect(result.current.pendingDeepLink).toBe('gtsd://task/123');

      act(() => {
        result.current.clearPendingDeepLink();
      });

      expect(result.current.pendingDeepLink).toBeNull();
    });
  });

  describe('Error Management', () => {
    it('should clear error state', () => {
      useAuthStore.setState({
        error: {
          code: 'UNKNOWN_ERROR' as AuthErrorCode,
          message: 'Some error',
        },
      });

      const { result } = renderHook(() => useAuthStore());

      act(() => {
        result.current.clearError();
      });

      expect(result.current.error).toBeNull();
    });
  });

  describe('State Persistence', () => {
    it('should persist user and auth state', async () => {
      const { result } = renderHook(() => useAuthStore());

      act(() => {
        result.current.setUser(mockUser);
      });

      await waitFor(() => {
        expect(AsyncStorage.setItem).toHaveBeenCalled();
      });

      // Verify persisted data includes user and auth state
      const calls = (AsyncStorage.setItem as jest.Mock).mock.calls;
      const persistedData = calls.find((call) => call[0] === 'auth-storage');

      if (persistedData) {
        const data = JSON.parse(persistedData[1]);
        expect(data.state.user).toEqual(mockUser);
        expect(data.state.isAuthenticated).toBe(true);
      }
    });
  });
});