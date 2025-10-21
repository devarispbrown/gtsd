# Mobile Authentication Implementation

## Overview

The GTSD mobile app implements a comprehensive authentication system with secure token storage, automatic session refresh, and onboarding flow management.

## Features

### Secure Token Storage
- Uses iOS Keychain and Android Keystore for secure token storage
- Falls back to AsyncStorage with encryption when secure storage is unavailable
- Automatic token expiration handling
- Secure refresh token management

### Authentication Flow
1. **Login/Signup**: Users authenticate with email and password
2. **Token Management**: JWT tokens are securely stored and automatically refreshed
3. **Session Persistence**: Authentication state persists across app restarts
4. **Onboarding Check**: Routes users to onboarding if not completed

### Onboarding Detection
- Automatically checks if user has completed onboarding
- Routes to appropriate screen based on authentication and onboarding status
- Prevents navigation to main app until onboarding is complete

## Architecture

### Components

#### 1. **AuthStore** (`src/stores/authStore.ts`)
Zustand store managing authentication state:
- User profile data
- Authentication status
- Onboarding requirements
- Error handling
- Deep link management

#### 2. **Secure Storage** (`src/utils/secureStorage.ts`)
Secure token storage utility:
- iOS: Uses Keychain Services
- Android: Uses Android Keystore
- Fallback: Encrypted AsyncStorage
- Token expiration validation

#### 3. **Auth API Client** (`src/api/auth.ts`)
Type-safe API client for authentication:
- Login/Signup endpoints
- Token refresh
- Session validation
- Error transformation

#### 4. **Navigation** (`src/navigation/RootNavigator.tsx`)
Authentication-aware navigation:
- Dynamic route configuration based on auth state
- Loading states during auth checks
- Protected route handling

#### 5. **Auth Hook** (`src/hooks/useAuth.ts`)
React hook for authentication operations:
- Auto token refresh on app foreground
- Network status monitoring
- Navigation helpers
- Protected screen requirements

## API Endpoints

### Currently Implemented (Mock)
The current implementation uses mock endpoints. Real endpoints need to be implemented on the backend:

```typescript
POST /auth/login
POST /auth/signup
POST /auth/logout
POST /auth/refresh
GET  /auth/me
```

### Request/Response Types
All types are defined in `@gtsd/shared-types/auth-types.ts`:
- `LoginRequest`/`LoginResponse`
- `SignupRequest`/`SignupResponse`
- `RefreshTokenRequest`/`RefreshTokenResponse`
- `GetCurrentUserResponse`

## Usage

### Login
```typescript
import { useAuthStore } from '@stores/authStore';

const { login, isLoading, error } = useAuthStore();

try {
  await login('user@example.com', 'password', true);
  // User is now authenticated
} catch (error) {
  // Handle login error
}
```

### Check Authentication
```typescript
import { useAuth } from '@hooks/useAuth';

const { isAuthenticated, requiresOnboarding } = useAuth();

if (isAuthenticated && !requiresOnboarding) {
  // User can access main app
}
```

### Protected Screens
```typescript
import { useRequireAuth } from '@hooks/useAuth';

const ProtectedScreen = () => {
  const { isReady } = useRequireAuth(true);

  if (!isReady) {
    return null; // Will redirect to login/onboarding
  }

  // Render protected content
};
```

### Logout
```typescript
const { logout } = useAuthStore();

await logout(); // Clears all tokens and redirects to login
```

## Security Features

### Token Security
- Tokens stored in platform secure storage
- Automatic token refresh before expiration
- Secure token transmission with HTTPS
- Token rotation on refresh

### Session Management
- Automatic session validation on app launch
- Background refresh when app returns to foreground
- Network-aware token refresh
- Graceful degradation on network failure

### Platform Security
- Certificate pinning (production)
- Jailbreak/root detection (production)
- Debugger detection (production)
- Secure storage with biometric protection

## Testing

### Unit Tests
- `__tests__/stores/authStore.test.ts`: Auth store logic
- `__tests__/navigation/RootNavigator.test.tsx`: Navigation routing

### Run Tests
```bash
cd apps/mobile
npm test
```

## Environment Configuration

### Development
```env
REACT_APP_API_URL=http://localhost:3000/api
DEV_AUTO_LOGIN=true
DEV_SKIP_ONBOARDING=true
```

### Production
```env
REACT_APP_API_URL=https://api.gtsd.app/api
ENABLE_BIOMETRIC_AUTH=true
```

## Migration Notes

### Backend Requirements
The backend needs to implement the following:

1. **Auth Endpoints**: Replace the mock `x-user-id` header system with proper JWT authentication
2. **User Model**: Ensure user table has `onboardingCompleted` and `onboardingCompletedAt` fields
3. **Token Management**: Implement JWT creation, validation, and refresh
4. **Password Security**: Add bcrypt/argon2 for password hashing

### Database Schema
Required fields on users table:
- `email` (unique)
- `password_hash`
- `name`
- `onboarding_completed`
- `onboarding_completed_at`

## Troubleshooting

### Common Issues

#### Tokens Not Persisting
- Check Keychain/Keystore permissions
- Verify AsyncStorage is installed
- Check for storage quota issues

#### Auto-Login Not Working
- Verify tokens haven't expired
- Check network connectivity
- Validate API endpoint configuration

#### Onboarding Loop
- Ensure `onboardingCompleted` is properly set after onboarding
- Check API response includes correct `requiresOnboarding` flag
- Verify navigation state updates

## Future Enhancements

- [ ] Biometric authentication
- [ ] Social login (Google, Apple, Facebook)
- [ ] Multi-factor authentication
- [ ] Remember device feature
- [ ] Password reset flow
- [ ] Email verification
- [ ] Session management across devices
- [ ] OAuth 2.0 implementation