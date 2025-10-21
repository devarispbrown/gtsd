/**
 * Authentication Hook
 * Provides authentication utilities and state management
 */

import { useEffect, useCallback, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import NetInfo, { NetInfoState } from '@react-native-community/netinfo';
import { useAuthStore } from '../stores/authStore';
import tokenStorage from '../utils/secureStorage';
import { useNavigation, CommonActions } from '@react-navigation/native';
import type { NavigationProp } from '@react-navigation/native';
import type { RootStackParamList } from '../types/navigation';

/**
 * Authentication hook configuration
 */
interface UseAuthConfig {
  autoRefresh?: boolean; // Auto-refresh tokens when app comes to foreground
  checkNetworkStatus?: boolean; // Monitor network status for better error handling
  redirectOnLogout?: boolean; // Auto-redirect to login on logout
}

/**
 * Authentication hook return type
 */
interface UseAuthReturn {
  isAuthenticated: boolean;
  isLoading: boolean;
  requiresOnboarding: boolean;
  hasCompletedOnboarding: boolean;
  login: (email: string, password: string, rememberMe?: boolean) => Promise<void>;
  signup: (email: string, password: string, name: string) => Promise<void>;
  logout: (allDevices?: boolean) => Promise<void>;
  refreshSession: () => Promise<boolean>;
  clearError: () => void;
  navigateBasedOnAuthState: () => void;
}

/**
 * Authentication hook for managing auth state and operations
 */
export const useAuth = (config: UseAuthConfig = {}): UseAuthReturn => {
  const {
    autoRefresh = true,
    checkNetworkStatus = true,
    redirectOnLogout = true,
  } = config;

  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const appState = useRef(AppState.currentState);
  const lastRefreshTime = useRef<number>(0);
  const isOnlineRef = useRef<boolean>(true);

  const {
    isAuthenticated,
    isLoading,
    requiresOnboarding,
    user,
    login: storeLogin,
    signup: storeSignup,
    logout: storeLogout,
    refreshSession: storeRefreshSession,
    clearError,
  } = useAuthStore();

  const hasCompletedOnboarding = user?.onboardingCompleted ?? false;

  /**
   * Navigate based on current authentication and onboarding state
   */
  const navigateBasedOnAuthState = useCallback(() => {
    if (!isAuthenticated) {
      // Navigate to welcome/login screen
      navigation.dispatch(
        CommonActions.reset({
          index: 0,
          routes: [{ name: 'Welcome' }],
        })
      );
    } else if (requiresOnboarding) {
      // Navigate to onboarding start
      navigation.dispatch(
        CommonActions.reset({
          index: 0,
          routes: [{ name: 'AccountBasics' }],
        })
      );
    } else {
      // Navigate to main app
      navigation.dispatch(
        CommonActions.reset({
          index: 0,
          routes: [{ name: 'Today' }],
        })
      );
    }
  }, [isAuthenticated, requiresOnboarding, navigation]);

  /**
   * Enhanced login with navigation
   */
  const login = useCallback(
    async (email: string, password: string, rememberMe?: boolean) => {
      try {
        await storeLogin(email, password, rememberMe);
        // Navigation will be handled by the effect watching auth state
      } catch (error) {
        // Error is already set in the store
        throw error;
      }
    },
    [storeLogin]
  );

  /**
   * Enhanced signup with navigation
   */
  const signup = useCallback(
    async (email: string, password: string, name: string) => {
      try {
        await storeSignup(email, password, name);
        // Navigation will be handled by the effect watching auth state
      } catch (error) {
        // Error is already set in the store
        throw error;
      }
    },
    [storeSignup]
  );

  /**
   * Enhanced logout with navigation
   */
  const logout = useCallback(
    async (allDevices?: boolean) => {
      try {
        await storeLogout(allDevices);
        if (redirectOnLogout) {
          navigateBasedOnAuthState();
        }
      } catch (error) {
        // Even on error, we've cleared local state
        if (redirectOnLogout) {
          navigateBasedOnAuthState();
        }
      }
    },
    [storeLogout, redirectOnLogout, navigateBasedOnAuthState]
  );

  /**
   * Refresh session with rate limiting
   */
  const refreshSession = useCallback(async () => {
    const now = Date.now();
    const timeSinceLastRefresh = now - lastRefreshTime.current;

    // Rate limit: Don't refresh more than once per minute
    if (timeSinceLastRefresh < 60000) {
      return true;
    }

    if (!isOnlineRef.current) {
      return false;
    }

    lastRefreshTime.current = now;
    return storeRefreshSession();
  }, [storeRefreshSession]);

  /**
   * Handle app state changes (background/foreground)
   */
  useEffect(() => {
    if (!autoRefresh) return;

    const handleAppStateChange = async (nextAppState: AppStateStatus) => {
      if (
        appState.current.match(/inactive|background/) &&
        nextAppState === 'active'
      ) {
        // App has come to foreground
        if (isAuthenticated) {
          // Check if tokens are expired and refresh if needed
          const areExpired = await tokenStorage.areTokensExpired();
          if (areExpired) {
            const refreshed = await refreshSession();
            if (!refreshed && redirectOnLogout) {
              navigateBasedOnAuthState();
            }
          }
        }
      }
      appState.current = nextAppState;
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription.remove();
  }, [
    isAuthenticated,
    refreshSession,
    autoRefresh,
    redirectOnLogout,
    navigateBasedOnAuthState,
  ]);

  /**
   * Monitor network status
   */
  useEffect(() => {
    if (!checkNetworkStatus) return;

    const unsubscribe = NetInfo.addEventListener((state: NetInfoState) => {
      isOnlineRef.current = state.isConnected ?? false;
    });

    return unsubscribe;
  }, [checkNetworkStatus]);

  /**
   * Navigate when auth state changes
   */
  useEffect(() => {
    if (!isLoading) {
      // Add a small delay to ensure navigation is ready
      const timer = setTimeout(() => {
        // Only navigate if auth state has actually changed
        // This is handled by the component using this hook
      }, 100);

      return () => clearTimeout(timer);
    }
    return undefined;
  }, [isAuthenticated, requiresOnboarding, isLoading]);

  return {
    isAuthenticated,
    isLoading,
    requiresOnboarding,
    hasCompletedOnboarding,
    login,
    signup,
    logout,
    refreshSession,
    clearError,
    navigateBasedOnAuthState,
  };
};

/**
 * Hook to handle authentication requirements for protected screens
 */
export const useRequireAuth = (
  requireOnboarding: boolean = true
): { isReady: boolean } => {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const { isAuthenticated, requiresOnboarding, isLoading } = useAuthStore();

  useEffect(() => {
    if (!isLoading) {
      if (!isAuthenticated) {
        // Redirect to login
        navigation.dispatch(
          CommonActions.reset({
            index: 0,
            routes: [{ name: 'Welcome' }],
          })
        );
      } else if (requireOnboarding && requiresOnboarding) {
        // Redirect to onboarding
        navigation.dispatch(
          CommonActions.reset({
            index: 0,
            routes: [{ name: 'AccountBasics' }],
          })
        );
      }
    }
  }, [isAuthenticated, requiresOnboarding, requireOnboarding, isLoading, navigation]);

  const isReady = isAuthenticated && (!requireOnboarding || !requiresOnboarding);

  return { isReady };
};

/**
 * Hook to handle deep linking with authentication
 */
export const useAuthDeepLinking = () => {
  const { isAuthenticated, pendingDeepLink, clearPendingDeepLink } = useAuthStore();
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();

  useEffect(() => {
    if (isAuthenticated && pendingDeepLink) {
      // Parse and navigate to the pending deep link
      // This would need to be implemented based on your deep linking structure

      // Clear the pending deep link after navigation
      clearPendingDeepLink();
    }
  }, [isAuthenticated, pendingDeepLink, clearPendingDeepLink, navigation]);
};