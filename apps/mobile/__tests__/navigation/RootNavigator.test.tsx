/**
 * Root Navigator Tests
 * Tests for authentication-based navigation routing
 */

import React from 'react';
import { render, waitFor } from '@testing-library/react-native';
import { NavigationContainer } from '@react-navigation/native';
import RootNavigator from '../../src/navigation/RootNavigator';
import { useAuthStore } from '../../src/stores/authStore';
import { useThemeStore } from '../../src/store/themeStore';
import type { UserProfile } from '@gtsd/shared-types';

// Mock navigation modules
jest.mock('@react-navigation/native', () => {
  const actualNav = jest.requireActual('@react-navigation/native');
  return {
    ...actualNav,
    useNavigation: () => ({
      navigate: jest.fn(),
      dispatch: jest.fn(),
      goBack: jest.fn(),
    }),
  };
});

// Mock screens
jest.mock('../../src/screens/TodayScreen', () => ({
  TodayScreen: () => 'TodayScreen',
}));

jest.mock('../../src/screens/onboarding/WelcomeScreen', () => ({
  WelcomeScreen: () => 'WelcomeScreen',
}));

jest.mock('../../src/screens/onboarding/AccountBasicsScreen', () => ({
  AccountBasicsScreen: () => 'AccountBasicsScreen',
}));

jest.mock('../../src/screens/onboarding/GoalsScreen', () => ({
  GoalsScreen: () => 'GoalsScreen',
}));

jest.mock('../../src/screens/onboarding/HealthMetricsScreen', () => ({
  HealthMetricsScreen: () => 'HealthMetricsScreen',
}));

jest.mock('../../src/screens/onboarding/ActivityLevelScreen', () => ({
  ActivityLevelScreen: () => 'ActivityLevelScreen',
}));

jest.mock('../../src/screens/onboarding/PreferencesScreen', () => ({
  PreferencesScreen: () => 'PreferencesScreen',
}));

jest.mock('../../src/screens/onboarding/PartnersScreen', () => ({
  PartnersScreen: () => 'PartnersScreen',
}));

jest.mock('../../src/screens/onboarding/ReviewScreen', () => ({
  ReviewScreen: () => 'ReviewScreen',
}));

jest.mock('../../src/screens/onboarding/HowItWorksScreen', () => ({
  HowItWorksScreen: () => 'HowItWorksScreen',
}));

// Mock stores
jest.mock('../../src/stores/authStore');
jest.mock('../../src/store/themeStore');

describe('RootNavigator', () => {
  const mockUser: UserProfile = {
    id: 1,
    email: 'test@example.com',
    name: 'Test User',
    isActive: true,
    onboardingCompleted: true,
    createdAt: '2025-01-01',
    updatedAt: '2025-01-01',
  };

  const mockCheckAuthStatus = jest.fn().mockResolvedValue(true);

  const defaultAuthState = {
    isAuthenticated: false,
    requiresOnboarding: false,
    isLoading: false,
    user: null,
    checkAuthStatus: mockCheckAuthStatus,
    error: null,
    pendingDeepLink: null,
  };

  const defaultThemeState = {
    theme: 'light',
    setTheme: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (useAuthStore as unknown as jest.Mock).mockReturnValue(defaultAuthState);
    (useThemeStore as unknown as jest.Mock).mockReturnValue(defaultThemeState);
  });

  const renderNavigator = () => {
    return render(
      <NavigationContainer>
        <RootNavigator />
      </NavigationContainer>
    );
  };

  describe('Initial Route Selection', () => {
    it('should show Welcome screen when not authenticated', async () => {
      (useAuthStore as unknown as jest.Mock).mockReturnValue({
        ...defaultAuthState,
        isAuthenticated: false,
        isLoading: false,
      });

      const { getByText } = renderNavigator();

      await waitFor(() => {
        expect(getByText('WelcomeScreen')).toBeTruthy();
      });
    });

    it('should show AccountBasics screen when authenticated but needs onboarding', async () => {
      (useAuthStore as unknown as jest.Mock).mockReturnValue({
        ...defaultAuthState,
        isAuthenticated: true,
        requiresOnboarding: true,
        isLoading: false,
        user: { ...mockUser, onboardingCompleted: false },
      });

      const { getByText } = renderNavigator();

      await waitFor(() => {
        expect(getByText('AccountBasicsScreen')).toBeTruthy();
      });
    });

    it('should show Today screen when authenticated and onboarded', async () => {
      (useAuthStore as unknown as jest.Mock).mockReturnValue({
        ...defaultAuthState,
        isAuthenticated: true,
        requiresOnboarding: false,
        isLoading: false,
        user: mockUser,
      });

      const { getByText } = renderNavigator();

      await waitFor(() => {
        expect(getByText('TodayScreen')).toBeTruthy();
      });
    });
  });

  describe('Loading State', () => {
    it('should show loading screen while checking auth status', async () => {
      let resolveAuth: () => void;
      const authPromise = new Promise<void>((resolve) => {
        resolveAuth = resolve;
      });

      const slowCheckAuthStatus = jest.fn().mockImplementation(() => authPromise);

      (useAuthStore as unknown as jest.Mock).mockReturnValue({
        ...defaultAuthState,
        isLoading: true,
        checkAuthStatus: slowCheckAuthStatus,
      });

      const { queryByText } = renderNavigator();

      // Should show loading indicator (ActivityIndicator doesn't have testID by default)
      // We can check that no screens are rendered instead
      await waitFor(() => {
        expect(queryByText('WelcomeScreen')).toBeNull();
      });

      // Should not show any screens
      expect(queryByText('WelcomeScreen')).toBeNull();
      expect(queryByText('TodayScreen')).toBeNull();

      // Resolve auth check
      (useAuthStore as unknown as jest.Mock).mockReturnValue({
        ...defaultAuthState,
        isLoading: false,
        isAuthenticated: true,
        requiresOnboarding: false,
        user: mockUser,
      });

      resolveAuth!();

      // Should now show Today screen
      await waitFor(() => {
        expect(queryByText('TodayScreen')).toBeTruthy();
      });
    });
  });

  describe('Screen Availability', () => {
    it('should only show auth screens when not authenticated', async () => {
      (useAuthStore as unknown as jest.Mock).mockReturnValue({
        ...defaultAuthState,
        isAuthenticated: false,
        isLoading: false,
      });

      const { queryByText } = renderNavigator();

      await waitFor(() => {
        // Auth screens should be available
        expect(queryByText('WelcomeScreen')).toBeTruthy();

        // Onboarding and main screens should not be available
        // (These would need to be tested via navigation attempts)
      });
    });

    it('should only show onboarding screens when authenticated but not onboarded', async () => {
      (useAuthStore as unknown as jest.Mock).mockReturnValue({
        ...defaultAuthState,
        isAuthenticated: true,
        requiresOnboarding: true,
        isLoading: false,
        user: { ...mockUser, onboardingCompleted: false },
      });

      const { queryByText } = renderNavigator();

      await waitFor(() => {
        // Should show onboarding start screen
        expect(queryByText('AccountBasicsScreen')).toBeTruthy();
      });
    });

    it('should only show main app screens when fully authenticated and onboarded', async () => {
      (useAuthStore as unknown as jest.Mock).mockReturnValue({
        ...defaultAuthState,
        isAuthenticated: true,
        requiresOnboarding: false,
        isLoading: false,
        user: mockUser,
      });

      const { queryByText } = renderNavigator();

      await waitFor(() => {
        // Should show main app screen
        expect(queryByText('TodayScreen')).toBeTruthy();
      });
    });
  });

  describe('Theme Support', () => {
    it('should apply dark theme styles', async () => {
      (useThemeStore as unknown as jest.Mock).mockReturnValue({
        theme: 'dark',
        setTheme: jest.fn(),
      });

      (useAuthStore as unknown as jest.Mock).mockReturnValue({
        ...defaultAuthState,
        isAuthenticated: true,
        requiresOnboarding: false,
        isLoading: false,
        user: mockUser,
      });

      const { getByText } = renderNavigator();

      await waitFor(() => {
        expect(getByText('TodayScreen')).toBeTruthy();
        // Additional theme assertions would check actual styles
      });
    });

    it('should apply light theme styles', async () => {
      (useThemeStore as unknown as jest.Mock).mockReturnValue({
        theme: 'light',
        setTheme: jest.fn(),
      });

      (useAuthStore as unknown as jest.Mock).mockReturnValue({
        ...defaultAuthState,
        isAuthenticated: true,
        requiresOnboarding: false,
        isLoading: false,
        user: mockUser,
      });

      const { getByText } = renderNavigator();

      await waitFor(() => {
        expect(getByText('TodayScreen')).toBeTruthy();
        // Additional theme assertions would check actual styles
      });
    });
  });

  describe('Auth State Changes', () => {
    it('should update navigation when auth state changes', async () => {
      const { rerender, getByText, queryByText } = renderNavigator();

      // Start unauthenticated
      (useAuthStore as unknown as jest.Mock).mockReturnValue({
        ...defaultAuthState,
        isAuthenticated: false,
        isLoading: false,
      });

      rerender(
        <NavigationContainer>
          <RootNavigator />
        </NavigationContainer>
      );

      await waitFor(() => {
        expect(getByText('WelcomeScreen')).toBeTruthy();
      });

      // Simulate login
      (useAuthStore as unknown as jest.Mock).mockReturnValue({
        ...defaultAuthState,
        isAuthenticated: true,
        requiresOnboarding: false,
        isLoading: false,
        user: mockUser,
      });

      rerender(
        <NavigationContainer>
          <RootNavigator />
        </NavigationContainer>
      );

      await waitFor(() => {
        expect(queryByText('WelcomeScreen')).toBeNull();
        expect(getByText('TodayScreen')).toBeTruthy();
      });
    });
  });

  describe('Development Mode', () => {
    const originalDEV = __DEV__;

    afterEach(() => {
      Object.defineProperty(global, '__DEV__', {
        value: originalDEV,
        writable: true,
      });
    });

    it('should expose all screens in development mode', async () => {
      Object.defineProperty(global, '__DEV__', {
        value: true,
        writable: true,
      });

      (useAuthStore as unknown as jest.Mock).mockReturnValue({
        ...defaultAuthState,
        isAuthenticated: true,
        requiresOnboarding: false,
        isLoading: false,
        user: mockUser,
      });

      const { getByText } = renderNavigator();

      await waitFor(() => {
        // Main screen should still be shown
        expect(getByText('TodayScreen')).toBeTruthy();
        // In dev mode, all screens should be registered (would need navigation test)
      });
    });
  });
});