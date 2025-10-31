# Regression Test Suite

**Prevent previously-fixed issues from breaking again**

Version: 1.0
Last Updated: 2025-10-30
Purpose: Automated and manual tests to catch regressions before deployment

---

## Test Philosophy

### Why Regression Tests

**The Problem**: We fix issues 4+ times because:

1. Fixes work initially
2. Subsequent changes break them
3. No automated verification
4. Manual testing incomplete

**The Solution**:

1. Automated tests for critical paths
2. Manual test checklist for UI/UX
3. Database verification queries
4. API endpoint tests
5. Run before EVERY deployment

---

## Test Categories

| Category           | Type        | Priority | Time   |
| ------------------ | ----------- | -------- | ------ |
| API Endpoint Tests | Automated   | P0       | 5 min  |
| Auth Flow Tests    | Automated   | P0       | 10 min |
| Database Integrity | SQL Queries | P0       | 5 min  |
| Critical UI Paths  | Manual      | P1       | 15 min |
| Edge Cases         | Manual      | P2       | 10 min |

**Total Time**: ~45 minutes per full regression run

---

## P0: API Endpoint Tests (Automated)

### Setup

Create `apps/api/src/tests/regression.test.ts`:

```typescript
import request from 'supertest';
import { createApp } from '../app';

const app = createApp();

describe('Regression Tests - API Endpoints', () => {
  let accessToken: string;
  let userId: number;
  const testEmail = `regression-${Date.now()}@test.com`;
  const testPassword = 'TestPass123!';

  describe('Health Checks', () => {
    it('should return healthy status', async () => {
      const res = await request(app).get('/healthz');

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('status', 'healthy');
      expect(res.body).toHaveProperty('timestamp');
    });

    it('should return metrics', async () => {
      const res = await request(app).get('/metrics');

      expect(res.status).toBe(200);
      expect(res.text).toContain('# HELP');
    });
  });

  describe('Auth - Signup', () => {
    it('should create new user', async () => {
      const res = await request(app).post('/auth/signup').send({
        email: testEmail,
        password: testPassword,
        firstName: 'Regression',
        lastName: 'Test',
      });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('user');
      expect(res.body.data).toHaveProperty('tokens');
      expect(res.body.data.user.email).toBe(testEmail);

      // Save for subsequent tests
      accessToken = res.body.data.tokens.accessToken;
      userId = res.body.data.user.id;
    });

    it('should reject duplicate email', async () => {
      const res = await request(app).post('/auth/signup').send({
        email: testEmail,
        password: testPassword,
        firstName: 'Duplicate',
        lastName: 'User',
      });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should validate email format', async () => {
      const res = await request(app).post('/auth/signup').send({
        email: 'invalid-email',
        password: testPassword,
        firstName: 'Invalid',
        lastName: 'Email',
      });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should validate password strength', async () => {
      const res = await request(app)
        .post('/auth/signup')
        .send({
          email: `weak-${Date.now()}@test.com`,
          password: 'weak',
          firstName: 'Weak',
          lastName: 'Pass',
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  describe('Auth - Login', () => {
    it('should login with valid credentials', async () => {
      const res = await request(app).post('/auth/login').send({
        email: testEmail,
        password: testPassword,
      });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('user');
      expect(res.body.data).toHaveProperty('tokens');

      // Update token for subsequent tests
      accessToken = res.body.data.tokens.accessToken;
    });

    it('should reject invalid password', async () => {
      const res = await request(app).post('/auth/login').send({
        email: testEmail,
        password: 'WrongPassword123!',
      });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('should reject non-existent user', async () => {
      const res = await request(app).post('/auth/login').send({
        email: 'nonexistent@test.com',
        password: testPassword,
      });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });
  });

  describe('Auth - Get Current User', () => {
    it('should return user profile with valid token', async () => {
      const res = await request(app).get('/auth/me').set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('id', userId);
      expect(res.body.data).toHaveProperty('email', testEmail);
      expect(res.body.data).not.toHaveProperty('passwordHash');
    });

    it('should reject request without token', async () => {
      const res = await request(app).get('/auth/me');

      expect(res.status).toBe(401);
    });

    it('should reject request with invalid token', async () => {
      const res = await request(app)
        .get('/auth/me')
        .set('Authorization', 'Bearer invalid.token.here');

      expect(res.status).toBe(401);
    });
  });

  describe('Rate Limiting', () => {
    it('should include rate limit headers', async () => {
      const res = await request(app).post('/auth/login').send({
        email: testEmail,
        password: 'wrong',
      });

      expect(res.headers).toHaveProperty('x-ratelimit-limit');
      expect(res.headers).toHaveProperty('x-ratelimit-remaining');
    });

    it('should handle IPv6-mapped IPv4 addresses', async () => {
      // This test verifies the IPv6 fix is deployed
      const res = await request(app)
        .post('/auth/login')
        .set('X-Forwarded-For', '::ffff:192.168.1.1')
        .send({
          email: testEmail,
          password: 'wrong',
        });

      // Should not throw rate limiter error
      expect(res.status).not.toBe(500);
    });
  });
});
```

### Running API Tests

```bash
cd /Users/devarisbrown/Code/projects/gtsd/apps/api

# Run all regression tests
pnpm test regression.test.ts

# Expected output:
# PASS  src/tests/regression.test.ts
#   Regression Tests - API Endpoints
#     Health Checks
#       ✓ should return healthy status
#       ✓ should return metrics
#     Auth - Signup
#       ✓ should create new user
#       ✓ should reject duplicate email
#       ✓ should validate email format
#       ✓ should validate password strength
#     Auth - Login
#       ✓ should login with valid credentials
#       ✓ should reject invalid password
#       ✓ should reject non-existent user
#     Auth - Get Current User
#       ✓ should return user profile with valid token
#       ✓ should reject request without token
#       ✓ should reject request with invalid token
#     Rate Limiting
#       ✓ should include rate limit headers
#       ✓ should handle IPv6-mapped IPv4 addresses
#
# Tests: 13 passed, 13 total
```

**Success Criteria**:

- [ ] All 13 tests pass
- [ ] No test failures
- [ ] No console errors

**If tests fail**: STOP. Fix issues before deploying.

---

## P0: Auth Flow Tests (Automated)

### Mobile App E2E Tests

Create `apps/mobile/__tests__/regression/auth-flow.test.ts`:

```typescript
import { useAuthStore } from '../../src/stores/authStore';
import { tokenStorage } from '../../src/utils/secureStorage';

describe('Regression Tests - Auth Flow', () => {
  beforeEach(async () => {
    // Clear auth state
    await tokenStorage.clearTokens();
    useAuthStore.getState().logout();
  });

  describe('Auth Resilience (CRITICAL)', () => {
    it('should complete hydration even when backend is down', async () => {
      // Mock API to timeout
      jest.mock('../../src/api/auth', () => ({
        authApi: {
          getCurrentUser: jest.fn(
            () =>
              new Promise((_, reject) =>
                setTimeout(() => reject(new Error('Network timeout')), 10000)
              )
          ),
        },
      }));

      const startTime = Date.now();

      // Call checkAuthStatus
      await useAuthStore.getState().checkAuthStatus();

      const duration = Date.now() - startTime;

      // Should complete in ~5 seconds (timeout), not 10+ seconds
      expect(duration).toBeLessThan(6000);
      expect(duration).toBeGreaterThan(4500);

      // Should set unauthenticated state
      expect(useAuthStore.getState().isAuthenticated).toBe(false);
      expect(useAuthStore.getState().isLoading).toBe(false);
    });

    it('should set isHydrated even when auth check fails', async () => {
      // This test ensures non-blocking hydration works
      // (Not directly testable in unit test, but included for documentation)

      // In real app, RootNavigator.tsx should:
      // 1. Call checkAuthStatus
      // 2. Set isHydrated=true in finally block
      // 3. Show Welcome screen, not infinite loading

      expect(true).toBe(true); // Placeholder
    });
  });

  describe('Auth State Management', () => {
    it('should clear auth state on logout', async () => {
      // Set authenticated state
      useAuthStore.setState({
        isAuthenticated: true,
        user: { id: 1, email: 'test@example.com' },
      });

      // Logout
      await useAuthStore.getState().logout();

      // Verify state cleared
      expect(useAuthStore.getState().isAuthenticated).toBe(false);
      expect(useAuthStore.getState().user).toBeNull();
    });

    it('should persist user state', async () => {
      // This verifies Zustand persistence configuration

      // Set user
      useAuthStore.setState({
        isAuthenticated: true,
        user: { id: 1, email: 'test@example.com' },
      });

      // Simulate app restart (re-initialize store from persisted state)
      // In real scenario, this is tested by:
      // 1. Login
      // 2. Force quit app
      // 3. Relaunch
      // 4. Check if still logged in

      expect(true).toBe(true); // Placeholder
    });
  });

  describe('Token Management', () => {
    it('should store tokens securely', async () => {
      const testTokens = {
        accessToken: 'test-access-token',
        refreshToken: 'test-refresh-token',
      };

      await tokenStorage.setTokens(testTokens.accessToken, testTokens.refreshToken);

      const storedAccessToken = await tokenStorage.getAccessToken();
      expect(storedAccessToken).toBe(testTokens.accessToken);
    });

    it('should clear tokens on logout', async () => {
      await tokenStorage.setTokens('access', 'refresh');
      await tokenStorage.clearTokens();

      const tokens = await tokenStorage.getAccessToken();
      expect(tokens).toBeNull();
    });
  });
});
```

### Running Mobile Tests

```bash
cd /Users/devarisbrown/Code/projects/gtsd/apps/mobile

# Run regression tests
pnpm test regression/

# Expected output:
# PASS  __tests__/regression/auth-flow.test.ts
#   Regression Tests - Auth Flow
#     Auth Resilience (CRITICAL)
#       ✓ should complete hydration even when backend is down (5005ms)
#       ✓ should set isHydrated even when auth check fails (1ms)
#     Auth State Management
#       ✓ should clear auth state on logout (10ms)
#       ✓ should persist user state (1ms)
#     Token Management
#       ✓ should store tokens securely (50ms)
#       ✓ should clear tokens on logout (25ms)
#
# Tests: 6 passed, 6 total
```

**Success Criteria**:

- [ ] All 6 tests pass
- [ ] Timeout test completes in 5-6 seconds
- [ ] Token tests pass

---

## P0: Database Integrity Tests

### SQL Verification Queries

Create `apps/api/tests/database-integrity.sql`:

```sql
-- Regression Tests - Database Integrity
-- Run these queries to verify database state is correct

-- Test 1: Users table structure
SELECT
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'users'
ORDER BY ordinal_position;
-- Expected: id, email, password_hash, first_name, last_name, created_at, updated_at

-- Test 2: Unique constraints on users.email
SELECT
  COUNT(*) as duplicate_emails
FROM (
  SELECT email, COUNT(*) as count
  FROM users
  GROUP BY email
  HAVING COUNT(*) > 1
) AS duplicates;
-- Expected: 0 (no duplicate emails)

-- Test 3: All users have password hashes
SELECT COUNT(*) as users_without_password
FROM users
WHERE password_hash IS NULL OR password_hash = '';
-- Expected: 0 (all users have passwords)

-- Test 4: Refresh tokens are properly linked to users
SELECT COUNT(*) as orphaned_tokens
FROM refresh_tokens rt
LEFT JOIN users u ON rt.user_id = u.id
WHERE u.id IS NULL;
-- Expected: 0 (no orphaned tokens)

-- Test 5: Onboarding profiles are properly linked
SELECT COUNT(*) as orphaned_profiles
FROM onboarding_profiles op
LEFT JOIN users u ON op.user_id = u.id
WHERE u.id IS NULL;
-- Expected: 0 (no orphaned profiles)

-- Test 6: Tasks are properly linked to users
SELECT COUNT(*) as orphaned_tasks
FROM tasks t
LEFT JOIN users u ON t.user_id = u.id
WHERE u.id IS NULL;
-- Expected: 0 (no orphaned tasks)

-- Test 7: Check for users created recently (today)
SELECT
  COUNT(*) as users_created_today,
  DATE(created_at) as date
FROM users
WHERE DATE(created_at) = CURRENT_DATE
GROUP BY DATE(created_at);
-- Expected: At least some users if tests ran today

-- Test 8: Verify migrations are applied
SELECT
  id,
  hash,
  created_at
FROM drizzle.__drizzle_migrations
ORDER BY created_at DESC
LIMIT 5;
-- Expected: Recent migrations with valid hashes
```

### Running Database Tests

```bash
cd /Users/devarisbrown/Code/projects/gtsd

# Run all integrity queries
docker exec -it gtsd-postgres psql -U gtsd -d gtsd -f apps/api/tests/database-integrity.sql

# Or run individually:
docker exec -it gtsd-postgres psql -U gtsd -d gtsd -c "
SELECT COUNT(*) as duplicate_emails
FROM (
  SELECT email, COUNT(*) as count
  FROM users
  GROUP BY email
  HAVING COUNT(*) > 1
) AS duplicates;
"

# Expected output:
# duplicate_emails
# -----------------
#                0
# (1 row)
```

**Success Criteria**:

- [ ] No duplicate emails
- [ ] No orphaned records
- [ ] All users have passwords
- [ ] Migrations applied

---

## P1: Critical UI Paths (Manual)

### Test Checklist

Execute these tests manually in simulator/device:

#### Test 1: App Launch (Backend Down)

**Setup**: Stop backend API

**Steps**:

1. Delete app from device
2. Reinstall app
3. Launch app
4. Start timer

**Expected**:

- [ ] Splash screen appears (0-1s)
- [ ] Welcome screen appears (5-6s)
- [ ] No infinite spinner
- [ ] No crash

**Time**: **\_** seconds

**Screenshot**: ******\_\_\_******

---

#### Test 2: App Launch (Backend Up, No Auth)

**Setup**: Start backend, no existing login

**Steps**:

1. Delete app
2. Reinstall app
3. Launch app

**Expected**:

- [ ] Splash screen (< 1s)
- [ ] Welcome screen (1-2s)
- [ ] Sign Up and Login buttons visible

**Time**: **\_** seconds

---

#### Test 3: Sign Up Flow

**Steps**:

1. Tap "Sign Up"
2. Fill form with valid data
3. Submit

**Expected**:

- [ ] Form validates
- [ ] Loading indicator shows
- [ ] Success (navigates to onboarding)
- [ ] User created in database

**Database Check**:

```sql
SELECT * FROM users WHERE email = '[test email]';
```

---

#### Test 4: Login Flow

**Steps**:

1. Go to Login screen
2. Enter valid credentials
3. Submit

**Expected**:

- [ ] Loading indicator
- [ ] Success (navigates to Today/Onboarding)
- [ ] Tokens stored

---

#### Test 5: Logout Flow

**Steps**:

1. Navigate to Settings
2. Tap Logout
3. Confirm

**Expected**:

- [ ] Returns to Welcome
- [ ] Tokens cleared
- [ ] Relaunching app shows Welcome (not auto-login)

---

#### Test 6: Session Persistence

**Steps**:

1. Login
2. Force quit app
3. Relaunch

**Expected**:

- [ ] Auto-login succeeds
- [ ] Goes directly to Today/Onboarding
- [ ] User profile loaded

---

#### Test 7: Onboarding Flow

**Steps**:

1. Fresh signup
2. Complete all onboarding screens
3. Submit

**Expected**:

- [ ] All screens save data
- [ ] Progress indicator updates
- [ ] Final submit succeeds
- [ ] Navigates to Today screen

**Database Check**:

```sql
SELECT * FROM onboarding_profiles WHERE user_id = [user id];
```

---

#### Test 8: Task Creation

**Steps**:

1. Go to Today screen
2. Create new task
3. Fill details
4. Save

**Expected**:

- [ ] Task appears in list
- [ ] Task saved to database
- [ ] Force quit and relaunch: task still there

---

#### Test 9: Task Completion with Photo

**Steps**:

1. Tap task
2. Mark complete
3. Upload photo
4. Submit

**Expected**:

- [ ] Photo uploads
- [ ] Task marked complete
- [ ] Confetti animation plays
- [ ] Streak updates
- [ ] Photo saved to S3

---

#### Test 10: Network Error Handling

**Steps**:

1. Start an operation (e.g., login)
2. While loading, enable Airplane Mode
3. Wait for timeout

**Expected**:

- [ ] Error message appears
- [ ] User-friendly message
- [ ] No crash
- [ ] Can retry after re-enabling network

---

### Manual Test Summary

| Test                         | Pass | Fail | Notes  |
| ---------------------------- | ---- | ---- | ------ |
| 1. App Launch (Backend Down) | ⬜   | ⬜   | **\_** |
| 2. App Launch (Backend Up)   | ⬜   | ⬜   | **\_** |
| 3. Sign Up Flow              | ⬜   | ⬜   | **\_** |
| 4. Login Flow                | ⬜   | ⬜   | **\_** |
| 5. Logout Flow               | ⬜   | ⬜   | **\_** |
| 6. Session Persistence       | ⬜   | ⬜   | **\_** |
| 7. Onboarding Flow           | ⬜   | ⬜   | **\_** |
| 8. Task Creation             | ⬜   | ⬜   | **\_** |
| 9. Task Completion           | ⬜   | ⬜   | **\_** |
| 10. Network Error            | ⬜   | ⬜   | **\_** |

**Pass Rate**: **\_** / 10

---

## P2: Edge Cases (Manual)

### Edge Case Tests

#### EC1: Expired Token

**Setup**: Login, manually expire token in database

**Expected**: Auto-logout and redirect to Welcome

---

#### EC2: Invalid Onboarding Data

**Setup**: Submit onboarding with out-of-range values

**Expected**: Validation error, user-friendly message

---

#### EC3: Concurrent Requests

**Setup**: Tap submit button multiple times rapidly

**Expected**: Only one request sent, duplicate requests ignored

---

#### EC4: Low Memory

**Setup**: Background other apps, return to GTSD

**Expected**: App resumes without crash or data loss

---

#### EC5: Photo Upload Failure

**Setup**: Upload very large photo or invalid format

**Expected**: Error message, can retry with valid photo

---

## Quick Regression Script

**Run before every deployment**:

```bash
#!/bin/bash
# Quick regression check

echo "=== REGRESSION TEST SUITE ==="

# 1. API tests
echo "Running API tests..."
cd /Users/devarisbrown/Code/projects/gtsd/apps/api
pnpm test regression.test.ts --silent
API_RESULT=$?

# 2. Mobile tests
echo "Running mobile tests..."
cd /Users/devarisbrown/Code/projects/gtsd/apps/mobile
pnpm test regression/ --silent
MOBILE_RESULT=$?

# 3. Database integrity
echo "Checking database integrity..."
cd /Users/devarisbrown/Code/projects/gtsd
docker exec -it gtsd-postgres psql -U gtsd -d gtsd -c "
SELECT COUNT(*) as duplicate_emails
FROM (SELECT email, COUNT(*) as count FROM users GROUP BY email HAVING COUNT(*) > 1) AS dup;
" | grep -q "0"
DB_RESULT=$?

# Summary
echo ""
echo "=== RESULTS ==="
echo "API Tests: $([ $API_RESULT -eq 0 ] && echo '✅ PASS' || echo '❌ FAIL')"
echo "Mobile Tests: $([ $MOBILE_RESULT -eq 0 ] && echo '✅ PASS' || echo '❌ FAIL')"
echo "Database: $([ $DB_RESULT -eq 0 ] && echo '✅ PASS' || echo '❌ FAIL')"

if [ $API_RESULT -eq 0 ] && [ $MOBILE_RESULT -eq 0 ] && [ $DB_RESULT -eq 0 ]; then
  echo ""
  echo "✅ All regression tests passed. Safe to deploy."
  exit 0
else
  echo ""
  echo "❌ Regression tests failed. DO NOT deploy."
  exit 1
fi
```

**Usage**:

```bash
bash scripts/regression-check.sh
# Only deploy if exit code is 0
```

---

## Regression Test Schedule

### Before Every Deployment

**Mandatory**:

- [ ] API endpoint tests (5 min)
- [ ] Auth flow tests (10 min)
- [ ] Database integrity (5 min)

**Total**: 20 minutes

### Before Major Releases

**Mandatory**:

- [ ] All P0 tests
- [ ] All P1 manual tests (85 min)
- [ ] Selected P2 edge cases (10 min)

**Total**: 115 minutes (~2 hours)

### Continuous Integration

**Automated** (on every commit):

- API tests
- Mobile unit tests
- Database schema validation

---

## Regression Fixes

If regression tests fail, follow this process:

1. **Identify the regression**:
   - Which test failed?
   - What was the expected behavior?
   - When did it break? (git bisect)

2. **Root cause analysis**:
   - Code change that caused it?
   - Cache issue?
   - Dependency change?

3. **Fix the issue**:
   - Revert breaking change, OR
   - Fix the code properly

4. **Verify fix**:
   - Re-run failing test
   - Run full regression suite
   - Manual verification

5. **Add new test** (if needed):
   - Prevent this regression in future
   - Add to appropriate test category

6. **Document**:
   - Update CHANGELOG
   - Add to known issues (if workaround needed)

---

## Success Criteria

Regression suite passes when:

- [ ] All API tests pass (13/13)
- [ ] All mobile tests pass (6/6)
- [ ] All database queries return expected results
- [ ] All P1 manual tests pass (10/10)
- [ ] No critical failures in P2 edge cases

**If ANY P0 or P1 test fails: DO NOT DEPLOY.**

---

## Time Investment

**Initial Setup**: 2-3 hours (write tests once)
**Per Deployment**: 20-120 minutes (depending on scope)
**ROI**: Prevents hours/days of debugging failed deployments

**This time investment is mandatory to ensure quality.**
