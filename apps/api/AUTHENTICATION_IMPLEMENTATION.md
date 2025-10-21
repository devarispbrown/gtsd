# Authentication and Security Implementation

## Overview

This document describes the comprehensive authentication and security system implemented for the GTSD API. The implementation replaces the insecure mock `x-user-id` header with a production-ready JWT-based authentication system.

## Security Features Implemented

### 1. JWT Authentication System

**Location:** `/apps/api/src/utils/auth.ts`, `/apps/api/src/middleware/auth.ts`

**Features:**
- **Access Tokens**: Short-lived JWT tokens (15 minutes) for API authentication
- **Refresh Tokens**: Long-lived tokens (7 days) for obtaining new access tokens
- **Token Rotation**: Refresh tokens are automatically rotated on each use for enhanced security
- **Backward Compatibility**: Continues to support legacy `x-user-id` header during migration period

**Key Functions:**
- `generateAccessToken(payload)`: Creates signed JWT with user data
- `verifyAccessToken(token)`: Validates and decodes JWT tokens
- `generateRefreshToken()`: Creates cryptographically secure random tokens
- `extractTokenFromHeader(authHeader)`: Extracts Bearer token from Authorization header

### 2. Password Hashing with bcrypt

**Location:** `/apps/api/src/utils/auth.ts`

**Features:**
- **bcrypt Hashing**: Industry-standard password hashing with automatic salting
- **Salt Rounds**: 12 rounds for strong security without excessive performance impact
- **Password Strength Validation**: Enforces strong password requirements
  - Minimum 8 characters
  - At least one uppercase letter
  - At least one lowercase letter
  - At least one number
  - At least one special character

**Key Functions:**
- `hashPassword(password)`: Hash passwords with bcrypt
- `comparePassword(password, hash)`: Verify passwords against hashes
- `validatePasswordStrength(password)`: Validate password meets requirements

### 3. Security Headers with Helmet

**Location:** `/apps/api/src/middleware/security.ts`

**Features:**
- **Content Security Policy (CSP)**: Prevents XSS attacks
- **HSTS**: Enforces HTTPS connections (1 year max-age with preload)
- **X-Frame-Options**: Prevents clickjacking (DENY)
- **X-Content-Type-Options**: Prevents MIME sniffing (nosniff)
- **X-XSS-Protection**: Legacy XSS protection for older browsers
- **Referrer-Policy**: Controls referrer information leakage
- **Permissions-Policy**: Restricts browser features and APIs
- **CORS**: Configurable cross-origin resource sharing

**Middleware:**
- `helmetMiddleware`: Helmet configuration for security headers
- `corsMiddleware`: CORS configuration
- `additionalSecurityHeaders`: Additional custom security headers

### 4. Database Schema Updates

**Location:** `/apps/api/src/db/schema.ts`, `/apps/api/src/db/migrations/0007_add_auth_fields.sql`

**Changes to Users Table:**
- `password_hash`: Stores bcrypt hashed passwords (nullable for backward compatibility)
- `email_verified`: Boolean flag for email verification status
- `email_verified_at`: Timestamp of email verification
- `last_login_at`: Tracks user login activity

**New Refresh Tokens Table:**
- `id`: Primary key
- `user_id`: Foreign key to users table
- `token`: Unique refresh token string
- `expires_at`: Token expiration timestamp
- `created_at`: Token creation timestamp
- `revoked_at`: Timestamp when token was revoked (nullable)
- `replaced_by`: Token that replaced this one (for rotation tracking)

**Indexes:**
- `refresh_tokens_user_id_idx`: Fast user lookup
- `refresh_tokens_token_idx`: Unique constraint and fast token lookup
- `refresh_tokens_expires_at_idx`: Efficient expiration queries

## API Endpoints

### Authentication Routes

All authentication routes are under `/auth` prefix and are public (no authentication required).

#### POST /auth/signup
Register a new user account.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "SecurePass123!",
  "name": "John Doe",
  "phone": "+1234567890" // optional
}
```

**Response (201):**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": 1,
      "email": "user@example.com",
      "name": "John Doe",
      "emailVerified": false
    },
    "accessToken": "eyJhbGciOiJIUzI1NiIs...",
    "refreshToken": "a1b2c3d4e5f6..."
  }
}
```

#### POST /auth/login
Authenticate existing user.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "SecurePass123!"
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": 1,
      "email": "user@example.com",
      "name": "John Doe",
      "emailVerified": false
    },
    "accessToken": "eyJhbGciOiJIUzI1NiIs...",
    "refreshToken": "a1b2c3d4e5f6..."
  }
}
```

#### POST /auth/refresh
Obtain new access token using refresh token.

**Request Body:**
```json
{
  "refreshToken": "a1b2c3d4e5f6..."
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIs...",
    "refreshToken": "g7h8i9j0k1l2..." // New rotated token
  }
}
```

#### POST /auth/logout
Revoke refresh token and logout user.

**Request Body:**
```json
{
  "refreshToken": "a1b2c3d4e5f6..."
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

#### GET /auth/me
Get current user profile (requires authentication).

**Headers:**
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "email": "user@example.com",
    "name": "John Doe",
    "phone": "+1234567890",
    "emailVerified": false,
    "isActive": true,
    "createdAt": "2025-01-01T00:00:00Z",
    "updatedAt": "2025-01-01T00:00:00Z"
  }
}
```

## Authentication Flow

### 1. User Registration
```
Client -> POST /auth/signup
       -> Password validation
       -> Password hashing (bcrypt)
       -> User creation in database
       -> Access token generation
       -> Refresh token generation
       -> Refresh token storage
       <- Return tokens and user data
```

### 2. User Login
```
Client -> POST /auth/login
       -> User lookup by email
       -> Password verification
       -> Access token generation
       -> Refresh token generation
       -> Refresh token storage
       -> Update last_login_at
       <- Return tokens and user data
```

### 3. Protected API Request
```
Client -> GET /v1/tasks/today
       -> Authorization: Bearer {access_token}
       -> JWT verification
       -> Extract userId from token
       -> Execute request logic
       <- Return response
```

### 4. Token Refresh
```
Client -> POST /auth/refresh
       -> Refresh token validation
       -> Check expiration
       -> Check revocation status
       -> Generate new tokens
       -> Revoke old refresh token
       -> Store new refresh token
       <- Return new tokens
```

### 5. Logout
```
Client -> POST /auth/logout
       -> Revoke refresh token
       -> Mark revoked_at timestamp
       <- Confirm logout
```

## Environment Variables

Add these to your `.env` file:

```bash
# JWT Authentication
# Generate secure random strings using: openssl rand -base64 32
JWT_SECRET=your-super-secret-jwt-key-at-least-32-characters-long-change-this
JWT_REFRESH_SECRET=your-super-secret-refresh-key-at-least-32-characters-long-change-this
```

**Important:**
- Never commit actual secrets to version control
- Use different secrets for development and production
- Rotate secrets periodically
- Each environment should have unique secrets

## Security Best Practices Implemented

### 1. Password Security
- ✅ bcrypt hashing with 12 salt rounds
- ✅ Strong password requirements enforced
- ✅ Never log or expose passwords in responses
- ✅ Passwords stored as hashes only

### 2. Token Security
- ✅ Short-lived access tokens (15 minutes)
- ✅ Refresh token rotation on each use
- ✅ Tokens revoked on logout
- ✅ Expiration tracking and cleanup
- ✅ Cryptographically secure random generation

### 3. HTTP Security
- ✅ Helmet middleware for security headers
- ✅ HSTS for HTTPS enforcement
- ✅ CSP to prevent XSS
- ✅ Clickjacking protection
- ✅ MIME sniffing prevention
- ✅ CORS configuration

### 4. Authentication Flow
- ✅ JWT-based stateless authentication
- ✅ Refresh token rotation (prevents replay attacks)
- ✅ Token revocation capability
- ✅ Account deactivation support
- ✅ Last login tracking

### 5. Database Security
- ✅ Password fields nullable (backward compatible)
- ✅ Foreign key constraints
- ✅ Indexed queries for performance
- ✅ Cascading deletes for cleanup
- ✅ Unique constraints on critical fields

## Migration Guide

### For New Users
New users should use the JWT authentication system:

```typescript
// 1. Signup
const signupResponse = await fetch('/auth/signup', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'user@example.com',
    password: 'SecurePass123!',
    name: 'John Doe'
  })
});

const { accessToken, refreshToken } = await signupResponse.json();

// 2. Use access token for API requests
const tasksResponse = await fetch('/v1/tasks/today', {
  headers: {
    'Authorization': `Bearer ${accessToken}`
  }
});

// 3. Refresh when access token expires
const refreshResponse = await fetch('/auth/refresh', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ refreshToken })
});

const { accessToken: newAccessToken } = await refreshResponse.json();
```

### For Existing Users (Legacy Header)
The API maintains backward compatibility with the `x-user-id` header during the migration period:

```typescript
// Legacy approach (still works)
const response = await fetch('/v1/tasks/today', {
  headers: {
    'x-user-id': '1'
  }
});
```

**Migration Path:**
1. Existing users continue using `x-user-id` header
2. Add password to existing accounts via password reset flow (to be implemented)
3. Gradually migrate users to JWT authentication
4. Eventually deprecate `x-user-id` header support

## Testing

Comprehensive test suites have been created:

### Unit Tests
- `/apps/api/src/utils/auth.test.ts`: Auth utility functions
  - Password hashing and verification
  - JWT token generation and validation
  - Password strength validation
  - Token extraction from headers

### Integration Tests
- `/apps/api/src/routes/auth/index.test.ts`: Auth API endpoints
  - User signup flow
  - User login flow
  - Token refresh flow
  - Logout flow
  - Protected route access
  - Security headers validation

**Run Tests:**
```bash
cd apps/api
pnpm test
```

## Maintenance Tasks

### 1. Token Cleanup
Periodically clean up expired refresh tokens:

```typescript
import { AuthService } from './routes/auth/service';

const authService = new AuthService();
await authService.cleanupExpiredTokens();
```

Consider setting up a cron job:
```typescript
import cron from 'node-cron';

// Run daily at 3 AM
cron.schedule('0 3 * * *', async () => {
  await authService.cleanupExpiredTokens();
});
```

### 2. Security Monitoring
Monitor for:
- Failed login attempts
- Token refresh patterns
- Unusual access patterns
- Expired token usage attempts

### 3. Secret Rotation
Plan for periodic secret rotation:
1. Generate new JWT secrets
2. Support both old and new secrets temporarily
3. Invalidate all tokens using old secret
4. Remove old secret support

## Files Changed/Created

### New Files
- `/apps/api/src/utils/auth.ts` - Authentication utilities
- `/apps/api/src/utils/auth.test.ts` - Auth utility tests
- `/apps/api/src/middleware/security.ts` - Security middleware
- `/apps/api/src/routes/auth/index.ts` - Auth route handlers
- `/apps/api/src/routes/auth/index.test.ts` - Auth route tests
- `/apps/api/src/routes/auth/service.ts` - Auth business logic
- `/apps/api/src/routes/auth/schemas.ts` - Validation schemas
- `/apps/api/src/db/migrations/0007_add_auth_fields.sql` - Database migration

### Modified Files
- `/apps/api/src/db/schema.ts` - Added auth fields and refresh_tokens table
- `/apps/api/src/middleware/auth.ts` - Updated to use JWT validation
- `/apps/api/src/app.ts` - Added security middleware and auth routes
- `/apps/api/src/config/env.ts` - Added JWT secret configuration
- `/apps/api/.env.example` - Added JWT secret examples
- `/apps/api/package.json` - Added security dependencies

## Next Steps

### Recommended Enhancements

1. **Email Verification**
   - Send verification emails on signup
   - Implement email verification endpoint
   - Restrict certain features until verified

2. **Password Reset**
   - Forgot password flow
   - Password reset tokens
   - Email notifications

3. **Two-Factor Authentication (2FA)**
   - TOTP-based 2FA
   - SMS-based 2FA
   - Backup codes

4. **Rate Limiting Enhancements**
   - Per-user rate limiting
   - Login attempt limiting
   - CAPTCHA for repeated failures

5. **Session Management**
   - Multiple device support
   - Active session listing
   - Remote session revocation

6. **Audit Logging**
   - Login history
   - Password change tracking
   - Security event logging

7. **OAuth2 Integration**
   - Google Sign-In
   - Apple Sign-In
   - GitHub Sign-In

## Support

For questions or issues related to authentication:
1. Check this documentation
2. Review test files for usage examples
3. Check application logs for error details
4. Ensure environment variables are properly configured

## Security Disclosure

If you discover a security vulnerability, please email security@example.com instead of using the issue tracker.
