# Critical Code Reference - Features to Preserve

**DO NOT LOSE THESE IMPLEMENTATIONS**
This document highlights the critical code patterns and features that MUST be preserved during migration.

---

## 1. Non-Blocking Auth Hydration 🔴 CRITICAL

### Location

`/Users/devarisbrown/Code/projects/gtsd/apps/mobile-old/src/navigation/RootNavigator.tsx` (lines 64-79)

### Why Critical

Prevents app from hanging on splash screen when backend is down. Allows app to show Welcome screen even if auth check times out.

### Code to Preserve

```typescript
useEffect(() => {
  const initialize = async () => {
    try {
      // Check auth but DON'T block UI if it fails
      // This allows the app to show the Welcome screen even if backend is down
      await checkAuthStatus();
    } catch (error) {
      console.error('Auth check failed during init:', error);
      // Continue anyway - user will see Welcome screen
    } finally {
      setIsHydrated(true);  // ← CRITICAL: Always set hydrated, even on error
    }
  };

  initialize();
}, [checkAuthStatus]);

// Only show loading screen during initial hydration, NOT during auth checks
// This prevents blocking on network errors
if (!isHydrated) {
  return <LoadingScreen />;
}
```

### Test Criteria

- Kill backend
- Fresh app launch
- Should see Welcome screen within 5 seconds
- Should NOT hang indefinitely

---

## 2. 5-Second Auth Timeout 🔴 CRITICAL

### Location

`/Users/devarisbrown/Code/projects/gtsd/apps/mobile-old/src/stores/authStore.ts` (lines 175-246)

### Why Critical

Prevents infinite hanging when network is slow or backend is down. Combined with non-blocking hydration, this ensures app remains usable.

### Code to Preserve

```typescript
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
    // Add 5-second timeout to prevent hanging on network errors
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Auth check timeout after 5s')), 5000)
    );

    const apiPromise = authApi.getCurrentUser();
    const response = await Promise.race([apiPromise, timeoutPromise]);  // ← CRITICAL

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

    // ... rest of success handling
  } catch (error) {
    console.error('Auth check error:', error);
    // Clear tokens on any error and continue
    await tokenStorage.clearTokens();
    set({
      isAuthenticated: false,
      isLoading: false,
      user: null,
      requiresOnboarding: false,
      error: null, // Don't show error for session check ← CRITICAL: No blocking errors
    });
    return false;
  }
},
```

### Test Criteria

- Set backend to respond slowly (>5s)
- Auth check should timeout and continue
- User should see Welcome screen
- No infinite loading

---

## 3. Zustand Store Persistence Configuration

### Location

`/Users/devarisbrown/Code/projects/gtsd/apps/mobile-old/src/stores/authStore.ts` (lines 314-323)

### Why Critical

Ensures auth state persists across app restarts without blocking initial render.

### Code to Preserve

```typescript
export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      // ... store implementation
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        // Only persist these fields, not loading/error states
        user: state.user,
        isAuthenticated: state.isAuthenticated,
        requiresOnboarding: state.requiresOnboarding,
      }),
    }
  )
);
```

### Key Points

- Only persists user, isAuthenticated, requiresOnboarding
- Does NOT persist loading or error states (prevents stale UI)
- Uses AsyncStorage (React Native compatible)

---

## 4. API Client with Token Management

### Location

`/Users/devarisbrown/Code/projects/gtsd/apps/mobile-old/src/api/client.ts`

### Why Critical

Handles automatic token refresh, request/response interceptors, and secure token storage.

### Key Features

```typescript
// Axios interceptor for adding auth token
apiClient.interceptors.request.use(async (config) => {
  const token = await tokenStorage.getAccessToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor for token refresh
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // If 401 and not a refresh request, try to refresh token
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      const refreshToken = await tokenStorage.getRefreshToken();
      if (refreshToken) {
        const response = await authApi.refreshToken({ refreshToken });
        if (response.data) {
          return apiClient(originalRequest);
        }
      }
    }

    return Promise.reject(error);
  }
);
```

### Test Criteria

- Login stores tokens
- Requests include Authorization header
- Token refresh works on 401
- Logout clears tokens

---

## 5. Secure Token Storage

### Location

`/Users/devarisbrown/Code/projects/gtsd/apps/mobile-old/src/utils/secureStorage.ts`

### Why Critical

Uses react-native-keychain for secure token storage (encrypted on device).

### Key Features

```typescript
import * as Keychain from 'react-native-keychain';

const tokenStorage = {
  async setTokens(accessToken: string, refreshToken: string): Promise<void> {
    await Keychain.setGenericPassword('auth', JSON.stringify({ accessToken, refreshToken }), {
      service: 'com.gtsd.tokens',
      accessible: Keychain.ACCESSIBLE.WHEN_UNLOCKED,
    });
  },

  async getAccessToken(): Promise<string | null> {
    const credentials = await Keychain.getGenericPassword({ service: 'com.gtsd.tokens' });
    if (!credentials) return null;
    const tokens = JSON.parse(credentials.password);
    return tokens.accessToken;
  },

  async clearTokens(): Promise<void> {
    await Keychain.resetGenericPassword({ service: 'com.gtsd.tokens' });
  },
};
```

### Test Criteria

- Tokens stored securely
- Tokens survive app restart
- Tokens cleared on logout
- Works on both iOS and Android

---

## 6. Deep Link Configuration

### Location

`/Users/devarisbrown/Code/projects/gtsd/apps/mobile-old/App.tsx` (lines 17-53)

### Why Critical

Enables SMS nudges and external navigation to app screens.

### Code to Preserve

```typescript
const linking: LinkingOptions<RootStackParamList> = {
  prefixes: ['gtsd://', 'https://gtsd.app', 'https://www.gtsd.app'],
  config: {
    screens: {
      Today: {
        path: 'today',
        parse: {
          reminder: (reminder: string) => reminder as 'pending' | 'overdue',
          scrollToTask: (value: string) => value === 'true',
        },
      },
      TaskDetail: {
        path: 'task/:taskId',
        parse: {
          taskId: (taskId: string) => parseInt(taskId, 10),
        },
      },
      Settings: 'settings',
      Login: 'login',

      // Onboarding screens
      Welcome: 'welcome',
      AccountBasics: 'onboarding/account',
      Goals: 'onboarding/goals',
      HealthMetrics: 'onboarding/health',
      ActivityLevel: 'onboarding/activity',
      Preferences: 'onboarding/preferences',
      Partners: 'onboarding/partners',
      Review: 'onboarding/review',
      HowItWorks: 'onboarding/how-it-works',
    },
  },
};
```

### Test Criteria

- `gtsd://today` opens Today screen
- `gtsd://task/123` opens task 123
- URL params parsed correctly
- Universal links work (https://gtsd.app/today)

---

## 7. Navigation Based on Auth State

### Location

`/Users/devarisbrown/Code/projects/gtsd/apps/mobile-old/src/navigation/RootNavigator.tsx` (lines 87-99)

### Why Critical

Determines which screens to show based on auth and onboarding state.

### Code to Preserve

```typescript
// Determine initial route based on auth and onboarding status
let initialRouteName: keyof RootStackParamList;

if (!isAuthenticated) {
  // User is not authenticated, show welcome/login
  initialRouteName = 'Welcome';
} else if (requiresOnboarding) {
  // User is authenticated but needs to complete onboarding
  initialRouteName = 'AccountBasics';
} else {
  // User is authenticated and has completed onboarding
  initialRouteName = 'Today';
}
```

### Test Criteria

- Not logged in → Welcome screen
- Logged in, no onboarding → AccountBasics
- Logged in, onboarded → Today
- State persists across restarts

---

## 8. Environment Configuration

### Location

`/Users/devarisbrown/Code/projects/gtsd/apps/mobile-old/src/config/index.ts`

### Why Critical

Centralized config for API URLs, feature flags, and platform detection.

### Key Features

```typescript
const getApiUrl = (): string => {
  const configUrl = Config.REACT_APP_API_URL || process.env.REACT_APP_API_URL;
  if (configUrl) return configUrl;

  const environment = getEnvironment();
  if (environment === 'production') {
    return 'https://api.gtsd.app/api';
  }

  if (environment === 'staging') {
    return 'https://staging-api.gtsd.app/api';
  }

  // Development defaults
  if (Platform.OS === 'android') {
    // Android emulator uses 10.0.2.2 to access host machine
    return 'http://10.0.2.2:3000/api';
  }

  // iOS simulator and physical devices
  return 'http://localhost:3000/api';
};
```

### Test Criteria

- .env REACT_APP_API_URL loaded correctly
- Android emulator uses 10.0.2.2
- iOS simulator uses localhost
- Production uses api.gtsd.app

---

## 9. Error Boundary Component

### Location

`/Users/devarisbrown/Code/projects/gtsd/apps/mobile-old/src/components/ErrorBoundary.tsx`

### Why Critical

Prevents entire app crash from unhandled errors. Shows user-friendly error screen.

### Key Features

- Catches React component errors
- Displays fallback UI
- Provides reset button
- Logs errors for debugging
- Works with React Navigation

### Test Criteria

- Component error doesn't crash app
- Error screen shows with reset button
- Reset button clears error
- Navigation still works after error

---

## 10. TypeScript Path Aliases

### Location

- `babel.config.js`
- `tsconfig.json`
- `jest.config.js`

### Why Critical

Enables clean imports without relative paths hell.

### Code to Preserve

**babel.config.js:**

```javascript
alias: {
  '@': './src',
  '@components': './src/components',
  '@screens': './src/screens',
  '@navigation': './src/navigation',
  '@store': './src/store',
  '@stores': './src/stores',
  '@utils': './src/utils',
  '@constants': './src/constants',
  '@types': './src/types',
  '@hooks': './src/hooks',
  '@api': './src/api',
}
```

**tsconfig.json:**

```json
"paths": {
  "@/*": ["src/*"],
  "@components/*": ["src/components/*"],
  "@screens/*": ["src/screens/*"],
  "@navigation/*": ["src/navigation/*"],
  "@store/*": ["src/store/*"],
  "@stores/*": ["src/stores/*"],
  "@utils/*": ["src/utils/*"],
  "@constants/*": ["src/constants/*"],
  "@types/*": ["src/types/*"],
  "@hooks/*": ["src/hooks/*"],
  "@api/*": ["src/api/*"]
}
```

### Test Criteria

- Imports like `@components/TaskCard` work
- TypeScript doesn't complain
- Metro bundler resolves paths
- Jest tests resolve paths

---

## Pre-Migration Verification Checklist

Before migration, verify these features work in mobile-old:

- [ ] Non-blocking auth hydration (check RootNavigator.tsx)
- [ ] 5-second auth timeout (check authStore.ts)
- [ ] Zustand persistence config (check all stores)
- [ ] API client interceptors (check api/client.ts)
- [ ] Secure token storage (check utils/secureStorage.ts)
- [ ] Deep link configuration (check App.tsx)
- [ ] Navigation auth logic (check RootNavigator.tsx)
- [ ] Environment config (check config/index.ts)
- [ ] Error boundary (check components/ErrorBoundary.tsx)
- [ ] Path aliases (check babel/tsconfig/jest configs)

---

## Post-Migration Verification Checklist

After migration, test these features in the fresh project:

- [ ] App shows Welcome screen when backend is down
- [ ] Auth check times out after 5 seconds
- [ ] User state persists across app restarts
- [ ] Login stores tokens in keychain
- [ ] API requests include auth header
- [ ] Token refresh works on 401
- [ ] Logout clears tokens
- [ ] Deep links work (test gtsd://today)
- [ ] Navigation routes based on auth state
- [ ] .env variables load correctly
- [ ] Component errors show error boundary
- [ ] Path aliases work in imports

---

## Files with Critical Code

**Must review during migration:**

| File                               | Critical Feature       | Lines to Check |
| ---------------------------------- | ---------------------- | -------------- |
| `src/navigation/RootNavigator.tsx` | Non-blocking hydration | 64-79, 87-99   |
| `src/stores/authStore.ts`          | 5-second timeout       | 175-246        |
| `src/stores/authStore.ts`          | Persistence config     | 314-323        |
| `src/api/client.ts`                | Token management       | Entire file    |
| `src/utils/secureStorage.ts`       | Keychain storage       | Entire file    |
| `App.tsx`                          | Deep linking           | 17-53          |
| `src/config/index.ts`              | Environment config     | 96-122         |
| `src/components/ErrorBoundary.tsx` | Error handling         | Entire file    |
| `babel.config.js`                  | Path aliases           | 9-20           |
| `tsconfig.json`                    | Path aliases           | 28-39          |

---

## Quick Test Script

After migration, run this quick test to verify critical features:

```typescript
// Add to App.tsx temporarily for testing

useEffect(() => {
  const testCriticalFeatures = async () => {
    console.log('=== TESTING CRITICAL FEATURES ===');

    // 1. Test config loads
    console.log('API URL:', Config.REACT_APP_API_URL);

    // 2. Test AsyncStorage
    await AsyncStorage.setItem('test', 'value');
    const val = await AsyncStorage.getItem('test');
    console.log('AsyncStorage works:', val === 'value');

    // 3. Test Keychain
    await Keychain.setGenericPassword('test', 'password');
    const creds = await Keychain.getGenericPassword();
    console.log('Keychain works:', creds?.password === 'password');

    // 4. Test auth timeout (with backend down)
    const start = Date.now();
    await useAuthStore.getState().checkAuthStatus();
    const elapsed = Date.now() - start;
    console.log('Auth check time:', elapsed, 'ms (should be ~5000ms if backend down)');

    console.log('=== TESTS COMPLETE ===');
  };

  if (__DEV__) {
    testCriticalFeatures();
  }
}, []);
```

---

**Document Version**: 1.0
**Last Updated**: 2025-10-26
**Purpose**: Ensure critical features are not lost during migration
