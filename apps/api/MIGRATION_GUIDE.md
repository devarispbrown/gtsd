# Authentication System Migration Guide

## Overview

This guide helps you migrate from the legacy `x-user-id` header authentication to the new JWT-based authentication system.

## Quick Start

### 1. Update Environment Variables

Add JWT secrets to your `.env` file:

```bash
# Generate secure secrets
openssl rand -base64 32

# Add to .env
JWT_SECRET=<generated-secret-1>
JWT_REFRESH_SECRET=<generated-secret-2>
```

### 2. Run Database Migration

```bash
cd apps/api

# Run migrations
pnpm db:migrate
```

This adds:
- `password_hash` column to users table
- `email_verified`, `email_verified_at`, `last_login_at` columns to users table
- New `refresh_tokens` table

### 3. Start the Server

```bash
pnpm dev
```

The API now supports both authentication methods:
- **New:** JWT tokens via `Authorization: Bearer <token>` header
- **Legacy:** User ID via `x-user-id` header (for backward compatibility)

## For API Clients

### New Applications

Use the JWT authentication flow:

```typescript
// 1. Signup
const signup = await fetch('http://localhost:3000/auth/signup', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'user@example.com',
    password: 'SecurePass123!',
    name: 'John Doe'
  })
});

const { accessToken, refreshToken } = (await signup.json()).data;

// 2. Make authenticated requests
const tasks = await fetch('http://localhost:3000/v1/tasks/today', {
  headers: {
    'Authorization': `Bearer ${accessToken}`
  }
});

// 3. Refresh tokens when access token expires (after 15 minutes)
const refresh = await fetch('http://localhost:3000/auth/refresh', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ refreshToken })
});

const { accessToken: newAccessToken, refreshToken: newRefreshToken } = (await refresh.json()).data;

// 4. Logout
await fetch('http://localhost:3000/auth/logout', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ refreshToken })
});
```

### Existing Applications

Continue using the `x-user-id` header during migration:

```typescript
// Legacy approach (still works)
const tasks = await fetch('http://localhost:3000/v1/tasks/today', {
  headers: {
    'x-user-id': '1'
  }
});
```

### Migration Path for Existing Users

Since existing users don't have passwords yet, you have two options:

#### Option 1: Gradual Migration (Recommended)

1. Keep using `x-user-id` header for existing functionality
2. Implement a "Set Password" feature for existing users
3. Once password is set, users can login with JWT
4. Eventually deprecate `x-user-id` support

#### Option 2: Force Migration

1. Create a password reset/setup flow
2. Require all users to set passwords
3. Switch all clients to JWT authentication
4. Remove `x-user-id` support

## Database Changes

### Users Table Changes

```sql
-- New columns added (all nullable for backward compatibility)
ALTER TABLE users ADD COLUMN password_hash text;
ALTER TABLE users ADD COLUMN email_verified boolean DEFAULT false NOT NULL;
ALTER TABLE users ADD COLUMN email_verified_at timestamp;
ALTER TABLE users ADD COLUMN last_login_at timestamp;
```

### New Refresh Tokens Table

```sql
CREATE TABLE refresh_tokens (
  id serial PRIMARY KEY,
  user_id integer NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token text NOT NULL UNIQUE,
  expires_at timestamp with time zone NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  revoked_at timestamp with time zone,
  replaced_by text
);

CREATE INDEX refresh_tokens_user_id_idx ON refresh_tokens(user_id);
CREATE UNIQUE INDEX refresh_tokens_token_idx ON refresh_tokens(token);
CREATE INDEX refresh_tokens_expires_at_idx ON refresh_tokens(expires_at);
```

## Rollback Plan

If you need to rollback the migration:

### 1. Revert Database Changes

```sql
-- Remove refresh_tokens table
DROP TABLE IF EXISTS refresh_tokens;

-- Remove new columns from users table
ALTER TABLE users DROP COLUMN IF EXISTS password_hash;
ALTER TABLE users DROP COLUMN IF EXISTS email_verified;
ALTER TABLE users DROP COLUMN IF EXISTS email_verified_at;
ALTER TABLE users DROP COLUMN IF EXISTS last_login_at;
```

### 2. Revert Code Changes

```bash
git revert <commit-hash>
```

### 3. Remove Environment Variables

Remove from `.env`:
```bash
JWT_SECRET
JWT_REFRESH_SECRET
```

## Testing the Migration

### 1. Test New User Signup

```bash
curl -X POST http://localhost:3000/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "SecurePass123!",
    "name": "Test User"
  }'
```

Expected response:
```json
{
  "success": true,
  "data": {
    "user": {
      "id": 1,
      "email": "test@example.com",
      "name": "Test User",
      "emailVerified": false
    },
    "accessToken": "eyJhbGciOiJIUzI1NiIs...",
    "refreshToken": "a1b2c3d4e5f6..."
  }
}
```

### 2. Test Login

```bash
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "SecurePass123!"
  }'
```

### 3. Test Protected Endpoint

```bash
# Save access token from signup/login response
TOKEN="eyJhbGciOiJIUzI1NiIs..."

curl http://localhost:3000/auth/me \
  -H "Authorization: Bearer $TOKEN"
```

### 4. Test Legacy Header (Backward Compatibility)

```bash
curl http://localhost:3000/v1/tasks/today \
  -H "x-user-id: 1"
```

## Troubleshooting

### Error: "JWT_SECRET is not configured"

**Cause:** Missing JWT secret in environment variables

**Solution:**
```bash
# Add to .env file
JWT_SECRET=$(openssl rand -base64 32)
JWT_REFRESH_SECRET=$(openssl rand -base64 32)
```

### Error: "password authentication failed for user"

**Cause:** Database credentials incorrect

**Solution:** Check your `DATABASE_URL` in `.env` file

### Error: "Invalid email or password"

**Cause:** Either user doesn't exist or password is wrong

**Solution:**
- Verify user exists in database
- Ensure password meets requirements
- Check password hash was created correctly

### Error: "Token expired"

**Cause:** Access token expired (15 minute lifetime)

**Solution:** Use refresh token to get new access token:
```bash
curl -X POST http://localhost:3000/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{"refreshToken": "your-refresh-token"}'
```

## Security Checklist

Before going to production:

- [ ] Generate unique JWT secrets (never reuse defaults)
- [ ] Store secrets securely (use secret management service)
- [ ] Enable HTTPS in production
- [ ] Configure CORS to allow only trusted origins
- [ ] Set up rate limiting for auth endpoints
- [ ] Enable logging for auth events
- [ ] Set up monitoring for failed login attempts
- [ ] Plan for periodic secret rotation
- [ ] Test token expiration and refresh flow
- [ ] Verify password requirements are enforced
- [ ] Check security headers are present
- [ ] Review and test error messages (don't leak information)

## Performance Considerations

### Token Cleanup

Set up a cron job to clean expired tokens:

```typescript
// Add to your worker or cron setup
import cron from 'node-cron';
import { AuthService } from './routes/auth/service';

const authService = new AuthService();

// Run daily at 3 AM
cron.schedule('0 3 * * *', async () => {
  const cleaned = await authService.cleanupExpiredTokens();
  console.log(`Cleaned ${cleaned} expired tokens`);
});
```

### Database Indexes

Ensure indexes are created (migration handles this):
- `refresh_tokens_user_id_idx` - Fast user token lookup
- `refresh_tokens_token_idx` - Fast token validation
- `refresh_tokens_expires_at_idx` - Efficient cleanup queries

## Support

For issues during migration:

1. Check server logs: `pnpm --filter @gtsd/api dev`
2. Verify database connection: `psql $DATABASE_URL`
3. Test with curl commands above
4. Review authentication documentation

## Timeline (Recommended)

**Week 1-2: Soft Launch**
- Deploy JWT authentication alongside legacy system
- Test with internal users
- Monitor for issues

**Week 3-4: User Migration**
- Encourage users to set passwords
- Provide migration incentives
- Support both auth methods

**Week 5-6: Gradual Deprecation**
- Announce legacy header deprecation
- Add warnings for legacy auth usage
- Begin migration of remaining users

**Week 7+: Full Migration**
- Remove legacy `x-user-id` support
- JWT-only authentication
- Monitor and optimize
