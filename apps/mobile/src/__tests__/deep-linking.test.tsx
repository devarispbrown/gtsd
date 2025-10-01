/**
 * Deep Linking Tests
 * Tests for deep link parsing, navigation, and auth-aware routing
 */

import React from 'react';
import { Linking } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { render, waitFor, act } from '@testing-library/react-native';
import { DeepLinkHandler, createDeepLink } from '../navigation/DeepLinkHandler';
import { useAuthStore } from '../stores/authStore';

// Mock modules
jest.mock('react-native/Libraries/Linking/Linking', () => ({
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  openURL: jest.fn(),
  canOpenURL: jest.fn(),
  getInitialURL: jest.fn(),
  emit: jest.fn(),
}));

jest.mock('../stores/authStore', () => ({
  useAuthStore: jest.fn(),
}));

jest.mock('@react-navigation/native', () => {
  const actual = jest.requireActual('@react-navigation/native') as Record<string, unknown>;
  return {
    ...actual,
    useNavigation: () => ({
      navigate: jest.fn(),
      goBack: jest.fn(),
      reset: jest.fn(),
    }),
  };
});

// Test helper to create deep link URL parser
function parseDeepLink(url: string): { path: string | null; params: Record<string, string> } {
  try {
    const pathAndParams = url.replace(/^gtsd:\/\//, '');
    if (!pathAndParams) {
      return { path: null, params: {} };
    }

    const [path, queryString] = pathAndParams.split('?');
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

interface MockAuthStore {
  isAuthenticated: boolean;
  pendingDeepLink: string | null;
  setPendingDeepLink: jest.Mock;
  clearPendingDeepLink: jest.Mock;
}

describe('Deep Linking', () => {
  const mockAuthStore: MockAuthStore = {
    isAuthenticated: false,
    pendingDeepLink: null,
    setPendingDeepLink: jest.fn(),
    clearPendingDeepLink: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (Linking.getInitialURL as jest.Mock).mockResolvedValue(null);
    (useAuthStore as unknown as jest.Mock).mockReturnValue(mockAuthStore);
  });

  describe('URL Parsing', () => {
    it('should parse simple deep link', () => {
      const result = parseDeepLink('gtsd://today');
      expect(result.path).toBe('today');
      expect(result.params).toEqual({});
    });

    it('should parse deep link with single parameter', () => {
      const result = parseDeepLink('gtsd://today?reminder=pending');
      expect(result.path).toBe('today');
      expect(result.params).toEqual({ reminder: 'pending' });
    });

    it('should parse deep link with multiple parameters', () => {
      const result = parseDeepLink('gtsd://today?reminder=pending&scrollToTask=true');
      expect(result.path).toBe('today');
      expect(result.params).toEqual({
        reminder: 'pending',
        scrollToTask: 'true',
      });
    });

    it('should parse task detail deep link', () => {
      const result = parseDeepLink('gtsd://task/123');
      expect(result.path).toBe('task/123');
      expect(result.params).toEqual({});
    });

    it('should handle invalid URLs gracefully', () => {
      const result = parseDeepLink('invalid-url');
      expect(result.path).toBe('invalid-url');
      expect(result.params).toEqual({});
    });

    it('should handle empty URLs', () => {
      const result = parseDeepLink('');
      expect(result.path).toBe(null);
      expect(result.params).toEqual({});
    });
  });

  describe('Deep Link Creation', () => {
    it('should create simple deep link', () => {
      const url = createDeepLink('today');
      expect(url).toBe('gtsd://today');
    });

    it('should create deep link with parameters', () => {
      const url = createDeepLink('today', {
        reminder: 'pending',
        scrollToTask: true,
      });
      expect(url).toBe('gtsd://today?reminder=pending&scrollToTask=true');
    });

    it('should encode special characters in parameters', () => {
      const url = createDeepLink('search', {
        query: 'test & special',
      });
      expect(url).toBe('gtsd://search?query=test%20%26%20special');
    });
  });

  describe('Authentication-Aware Routing', () => {
    beforeEach(() => {
      mockAuthStore.isAuthenticated = false;
      mockAuthStore.pendingDeepLink = null;
      mockAuthStore.setPendingDeepLink.mockClear();
      mockAuthStore.clearPendingDeepLink.mockClear();
    });

    it('should store deep link when user is not authenticated', async () => {
      mockAuthStore.isAuthenticated = false;
      const testUrl = 'gtsd://today?reminder=pending';

      render(
        <NavigationContainer>
          <DeepLinkHandler>
            <></>
          </DeepLinkHandler>
        </NavigationContainer>
      );

      // Simulate receiving a deep link
      act(() => {
        Linking.emit('url', { url: testUrl });
      });

      await waitFor(() => {
        expect(mockAuthStore.setPendingDeepLink).toHaveBeenCalledWith(testUrl);
      });
    });

    it('should navigate directly when user is authenticated', async () => {
      mockAuthStore.isAuthenticated = true;
      const testUrl = 'gtsd://today';

      const mockNavigate = jest.fn();
      jest.spyOn(require('@react-navigation/native'), 'useNavigation').mockReturnValue({
        navigate: mockNavigate,
        goBack: jest.fn(),
        reset: jest.fn(),
      });

      render(
        <NavigationContainer>
          <DeepLinkHandler>
            <></>
          </DeepLinkHandler>
        </NavigationContainer>
      );

      // Simulate receiving a deep link
      act(() => {
        Linking.emit('url', { url: testUrl });
      });

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('Today', undefined);
      });
    });

    it('should process pending deep link after authentication', async () => {
      const mockNavigate = jest.fn();
      jest.spyOn(require('@react-navigation/native'), 'useNavigation').mockReturnValue({
        navigate: mockNavigate,
        goBack: jest.fn(),
        reset: jest.fn(),
      });

      // Start with user not authenticated and a pending link
      mockAuthStore.isAuthenticated = false;
      mockAuthStore.pendingDeepLink = 'gtsd://today?reminder=pending';

      const { rerender } = render(
        <NavigationContainer>
          <DeepLinkHandler>
            <></>
          </DeepLinkHandler>
        </NavigationContainer>
      );

      // Simulate user logging in
      mockAuthStore.isAuthenticated = true;

      rerender(
        <NavigationContainer>
          <DeepLinkHandler>
            <></>
          </DeepLinkHandler>
        </NavigationContainer>
      );

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('Today', { reminder: 'pending' });
        expect(mockAuthStore.clearPendingDeepLink).toHaveBeenCalled();
      });
    });
  });

  describe('Cold Start Handling', () => {
    it('should handle initial URL on app launch', async () => {
      const initialUrl = 'gtsd://today?reminder=pending';
      (Linking.getInitialURL as jest.Mock).mockResolvedValue(initialUrl);

      mockAuthStore.isAuthenticated = true;
      const mockNavigate = jest.fn();
      jest.spyOn(require('@react-navigation/native'), 'useNavigation').mockReturnValue({
        navigate: mockNavigate,
        goBack: jest.fn(),
        reset: jest.fn(),
      });

      render(
        <NavigationContainer>
          <DeepLinkHandler>
            <></>
          </DeepLinkHandler>
        </NavigationContainer>
      );

      await waitFor(
        () => {
          expect(mockNavigate).toHaveBeenCalledWith('Today', { reminder: 'pending' });
        },
        { timeout: 1000 }
      );
    });
  });

  describe('Navigation Mapping', () => {
    interface TestCase {
      url: string;
      expectedRoute: string;
      expectedParams: Record<string, unknown> | undefined;
    }

    const testCases: TestCase[] = [
      {
        url: 'gtsd://today',
        expectedRoute: 'Today',
        expectedParams: undefined,
      },
      {
        url: 'gtsd://today?reminder=pending',
        expectedRoute: 'Today',
        expectedParams: { reminder: 'pending' },
      },
      {
        url: 'gtsd://today?reminder=pending&scrollToTask=true',
        expectedRoute: 'Today',
        expectedParams: { reminder: 'pending', scrollToTask: true },
      },
      {
        url: 'gtsd://task?id=123',
        expectedRoute: 'TaskDetail',
        expectedParams: { taskId: 123 },
      },
      {
        url: 'gtsd://settings',
        expectedRoute: 'Settings',
        expectedParams: undefined,
      },
    ];

    testCases.forEach(({ url, expectedRoute, expectedParams }) => {
      it(`should navigate to ${expectedRoute} for ${url}`, async () => {
        mockAuthStore.isAuthenticated = true;
        const mockNavigate = jest.fn();
        jest.spyOn(require('@react-navigation/native'), 'useNavigation').mockReturnValue({
          navigate: mockNavigate,
          goBack: jest.fn(),
          reset: jest.fn(),
        });

        render(
          <NavigationContainer>
            <DeepLinkHandler>
              <></>
            </DeepLinkHandler>
          </NavigationContainer>
        );

        act(() => {
          Linking.emit('url', { url });
        });

        await waitFor(() => {
          expect(mockNavigate).toHaveBeenCalledWith(expectedRoute, expectedParams);
        });
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid deep link paths gracefully', async () => {
      mockAuthStore.isAuthenticated = true;
      const mockNavigate = jest.fn();
      jest.spyOn(require('@react-navigation/native'), 'useNavigation').mockReturnValue({
        navigate: mockNavigate,
        goBack: jest.fn(),
        reset: jest.fn(),
      });

      render(
        <NavigationContainer>
          <DeepLinkHandler>
            <></>
          </DeepLinkHandler>
        </NavigationContainer>
      );

      act(() => {
        Linking.emit('url', { url: 'gtsd://nonexistent' });
      });

      await waitFor(() => {
        // Should default to Today screen for unknown paths
        expect(mockNavigate).toHaveBeenCalledWith('Today');
      });
    });

    it('should handle malformed URLs without crashing', async () => {
      render(
        <NavigationContainer>
          <DeepLinkHandler>
            <></>
          </DeepLinkHandler>
        </NavigationContainer>
      );

      // This should not throw
      expect(() => {
        act(() => {
          Linking.emit('url', { url: 'gtsd:/malformed//url' });
        });
      }).not.toThrow();
    });
  });
});
