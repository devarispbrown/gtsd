# Backend Authentication Implementation Guide

## Overview
The mobile app authentication has been implemented and requires corresponding backend endpoints. Currently, the API uses a simple `x-user-id` header for authentication, which needs to be replaced with proper JWT-based authentication.

## Required Endpoints

### 1. POST /auth/login
**Purpose**: Authenticate user and return tokens

**Request Body**:
```typescript
{
  email: string;
  password: string;
  rememberMe?: boolean;
}
```

**Response**:
```typescript
{
  user: {
    id: number;
    email: string;
    name: string;
    isActive: boolean;
    onboardingCompleted: boolean;
    onboardingCompletedAt?: string;
    createdAt: string;
    updatedAt: string;
  },
  tokens: {
    accessToken: string;
    refreshToken: string;
    expiresIn: number; // seconds
    tokenType: 'Bearer';
  },
  requiresOnboarding: boolean;
}
```

### 2. POST /auth/signup
**Purpose**: Create new user account

**Request Body**:
```typescript
{
  email: string;
  password: string;
  name: string;
}
```

**Response**:
```typescript
{
  user: UserProfile;
  tokens: AuthTokens;
  requiresVerification: boolean;
  requiresOnboarding: boolean;
}
```

### 3. POST /auth/logout
**Purpose**: Invalidate user session

**Request Body**:
```typescript
{
  refreshToken?: string;
  allDevices?: boolean;
}
```

**Response**:
```typescript
{
  success: boolean;
  message: string;
}
```

### 4. POST /auth/refresh
**Purpose**: Refresh access token using refresh token

**Request Body**:
```typescript
{
  refreshToken: string;
}
```

**Response**:
```typescript
{
  tokens: {
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
    tokenType: 'Bearer';
  }
}
```

### 5. GET /auth/me
**Purpose**: Get current authenticated user

**Headers**:
```
Authorization: Bearer <accessToken>
```

**Response**:
```typescript
{
  user: UserProfile;
  requiresOnboarding: boolean;
}
```

## Implementation Steps

### 1. Install Dependencies
```bash
npm install --save \
  jsonwebtoken \
  bcrypt \
  @types/jsonwebtoken \
  @types/bcrypt
```

### 2. Update User Model
The users table already has the necessary fields:
- `onboarding_completed` (boolean)
- `onboarding_completed_at` (timestamp)

Add password field:
```sql
ALTER TABLE users ADD COLUMN password_hash TEXT;
```

### 3. Create JWT Service
```typescript
// src/services/jwt.service.ts
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
const JWT_EXPIRES_IN = '1h';
const REFRESH_TOKEN_EXPIRES_IN = '30d';

export interface TokenPayload {
  userId: number;
  email: string;
}

export const generateTokens = (payload: TokenPayload) => {
  const accessToken = jwt.sign(payload, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
  });

  const refreshToken = jwt.sign(payload, JWT_SECRET, {
    expiresIn: REFRESH_TOKEN_EXPIRES_IN,
  });

  return {
    accessToken,
    refreshToken,
    expiresIn: 3600, // 1 hour in seconds
    tokenType: 'Bearer' as const,
  };
};

export const verifyToken = (token: string): TokenPayload => {
  return jwt.verify(token, JWT_SECRET) as TokenPayload;
};
```

### 4. Create Auth Routes
```typescript
// src/routes/auth/index.ts
import { Router } from 'express';
import bcrypt from 'bcrypt';
import { db } from '../../db';
import { generateTokens, verifyToken } from '../../services/jwt.service';

const router = Router();

router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  // Find user by email
  const user = await db.query.users.findFirst({
    where: eq(users.email, email),
  });

  if (!user || !await bcrypt.compare(password, user.passwordHash)) {
    return res.status(401).json({
      code: 'INVALID_CREDENTIALS',
      message: 'Invalid email or password',
    });
  }

  const tokens = generateTokens({
    userId: user.id,
    email: user.email,
  });

  res.json({
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      isActive: user.isActive,
      onboardingCompleted: user.onboardingCompleted,
      onboardingCompletedAt: user.onboardingCompletedAt,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    },
    tokens,
    requiresOnboarding: !user.onboardingCompleted,
  });
});

// Add other endpoints...
```

### 5. Update Auth Middleware
```typescript
// src/middleware/auth.ts
import { verifyToken } from '../services/jwt.service';

export function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;

  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice(7);

    try {
      const payload = verifyToken(token);
      req.userId = payload.userId;
    } catch (error) {
      return next(new AppError(401, 'Invalid or expired token'));
    }
  }

  next();
}
```

### 6. Add to App Routes
```typescript
// src/app.ts
import authRouter from './routes/auth';

// Add auth routes (no auth middleware needed)
app.use('/auth', authRouter);
```

## Security Considerations

### Password Requirements
- Minimum 8 characters
- At least one uppercase letter
- At least one lowercase letter
- At least one number
- Hash using bcrypt with salt rounds >= 10

### Token Security
- Use strong JWT secret (min 32 characters)
- Store refresh tokens in database for revocation
- Implement token rotation on refresh
- Add rate limiting to auth endpoints

### Environment Variables
Add to `.env`:
```env
JWT_SECRET=your-very-long-random-string-here
JWT_EXPIRES_IN=1h
REFRESH_TOKEN_EXPIRES_IN=30d
BCRYPT_SALT_ROUNDS=10
```

## Database Migrations

### Add Password and Token Tables
```sql
-- Add password to users
ALTER TABLE users
ADD COLUMN password_hash TEXT,
ADD COLUMN email_verified BOOLEAN DEFAULT false,
ADD COLUMN email_verification_token TEXT,
ADD COLUMN password_reset_token TEXT,
ADD COLUMN password_reset_expires TIMESTAMP;

-- Create refresh tokens table
CREATE TABLE refresh_tokens (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token TEXT NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(token)
);

CREATE INDEX idx_refresh_tokens_user_id ON refresh_tokens(user_id);
CREATE INDEX idx_refresh_tokens_token ON refresh_tokens(token);
```

## Testing

### Manual Testing with cURL
```bash
# Login
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'

# Get current user
curl -X GET http://localhost:3000/auth/me \
  -H "Authorization: Bearer <access_token>"

# Refresh token
curl -X POST http://localhost:3000/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{"refreshToken":"<refresh_token>"}'
```

### Integration Tests
Create tests in `__tests__/routes/auth.test.ts`:
- Test successful login
- Test invalid credentials
- Test token refresh
- Test protected routes
- Test signup flow

## Migration Path

1. **Phase 1**: Implement auth endpoints (keep x-user-id for backwards compatibility)
2. **Phase 2**: Test with mobile app in development
3. **Phase 3**: Migrate existing users (generate temporary passwords)
4. **Phase 4**: Deploy to staging for testing
5. **Phase 5**: Remove x-user-id header support

## Error Codes

Standardize error responses:
```typescript
enum AuthErrorCode {
  INVALID_CREDENTIALS = 'INVALID_CREDENTIALS',
  USER_NOT_FOUND = 'USER_NOT_FOUND',
  USER_INACTIVE = 'USER_INACTIVE',
  EMAIL_NOT_VERIFIED = 'EMAIL_NOT_VERIFIED',
  TOKEN_EXPIRED = 'TOKEN_EXPIRED',
  TOKEN_INVALID = 'TOKEN_INVALID',
  REFRESH_TOKEN_EXPIRED = 'REFRESH_TOKEN_EXPIRED',
  EMAIL_ALREADY_EXISTS = 'EMAIL_ALREADY_EXISTS',
  PASSWORD_TOO_WEAK = 'PASSWORD_TOO_WEAK',
}
```

## Monitoring

Add logging for:
- Failed login attempts
- Token refresh requests
- Password reset requests
- Unusual login patterns
- Multiple device sessions

## Next Steps

1. Review and approve implementation plan
2. Create feature branch for auth implementation
3. Implement endpoints with tests
4. Update API documentation
5. Test with mobile app
6. Deploy to staging
7. Perform security audit
8. Deploy to production