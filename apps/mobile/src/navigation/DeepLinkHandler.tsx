/**
 * Deep Link Handler
 * Manages deep link routing with authentication awareness
 */

import React, { useEffect, useCallback } from 'react';
import { Linking } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useAuthStore } from '../stores/authStore';
import type { RootNavigationProp } from '../types/navigation';

interface DeepLinkHandlerProps {
  children: React.ReactNode;
}

/**
 * Component that handles deep link routing based on authentication state
 * Manages both cold start and warm start deep link scenarios
 */
export const DeepLinkHandler: React.FC<DeepLinkHandlerProps> = ({ children }) => {
  const navigation = useNavigation<RootNavigationProp>();
  const {
    isAuthenticated,
    pendingDeepLink,
    setPendingDeepLink,
    clearPendingDeepLink,
  } = useAuthStore();

  /**
   * Navigate to the appropriate screen based on the deep link path
   */
  const navigateToPath = useCallback(
    (path: string, params: Record<string, string>) => {
      switch (path) {
        case 'today': {
          // Navigate to Today screen with optional parameters
          const todayParams: {
            reminder?: 'pending' | 'overdue';
            scrollToTask?: boolean;
          } = {};

          if (params.reminder) {
            todayParams.reminder = params.reminder as 'pending' | 'overdue';
          }

          if (params.scrollToTask === 'true') {
            todayParams.scrollToTask = true;
          }

          navigation.navigate('Today', Object.keys(todayParams).length > 0 ? todayParams : undefined);
          break;
        }

        case 'task': {
          // Navigate to specific task if taskId provided
          if (params.id) {
            navigation.navigate('TaskDetail', { taskId: parseInt(params.id, 10) });
          }
          break;
        }

        case 'settings': {
          navigation.navigate('Settings');
          break;
        }

        default: {
          // Default to Today screen
          navigation.navigate('Today');
        }
      }

      // Clear any pending deep link after successful navigation
      clearPendingDeepLink();
    },
    [navigation, clearPendingDeepLink]
  );

  /**
   * Process a deep link URL
   * Handles authentication check and routing
   */
  const handleDeepLink = useCallback(
    (url: string | null) => {
      if (!url) return;

      // Parse the URL to extract the path and query params
      const { path, params } = parseDeepLink(url);

      if (!path) {
        return;
      }

      // Check authentication status
      if (!isAuthenticated) {
        // Store the deep link for after login
        setPendingDeepLink(url);

        // Navigate to Welcome screen for login
        navigation.navigate('Welcome');
        return;
      }

      // User is authenticated, handle the deep link
      navigateToPath(path, params);
    },
    [isAuthenticated, navigation, setPendingDeepLink, navigateToPath]
  );

  /**
   * Handle pending deep link after authentication
   */
  useEffect(() => {
    if (isAuthenticated && pendingDeepLink) {
      handleDeepLink(pendingDeepLink);
    }
  }, [isAuthenticated, pendingDeepLink, handleDeepLink]);

  /**
   * Set up deep link listeners for warm start
   */
  useEffect(() => {
    // Handle deep links when app is already open
    const subscription = Linking.addEventListener('url', (event) => {
      handleDeepLink(event.url);
    });

    // Handle initial URL (cold start)
    void Linking.getInitialURL().then((url) => {
      if (url) {
        // Small delay to ensure navigation is ready
        setTimeout(() => {
          handleDeepLink(url);
        }, 100);
      }
    });

    return () => {
      subscription.remove();
    };
  }, [handleDeepLink]);

  return <>{children}</>;
};

/**
 * Parse a deep link URL to extract path and query parameters
 * @param url The deep link URL (e.g., "gtsd://today?reminder=pending")
 * @returns Object with path and params
 */
function parseDeepLink(url: string): { path: string | null; params: Record<string, string> } {
  try {
    // Remove the scheme (gtsd://)
    const pathAndParams = url.replace(/^gtsd:\/\//, '');

    if (!pathAndParams) {
      return { path: null, params: {} };
    }

    // Split path and query string
    const [path, queryString] = pathAndParams.split('?');

    // Parse query parameters
    const params: Record<string, string> = {};
    if (queryString) {
      const searchParams = new URLSearchParams(queryString);
      searchParams.forEach((value, key) => {
        params[key] = value;
      });
    }

    return { path: path.toLowerCase(), params };
  } catch {
    return { path: null, params: {} };
  }
}

/**
 * Utility function to construct a deep link URL
 * Useful for testing and generating links
 */
export function createDeepLink(path: string, params?: Record<string, string | number | boolean>): string {
  let url = `gtsd://${path}`;

  if (params && Object.keys(params).length > 0) {
    const queryString = Object.entries(params)
      .map(([key, value]) => `${key}=${encodeURIComponent(String(value))}`)
      .join('&');
    url += `?${queryString}`;
  }

  return url;
}