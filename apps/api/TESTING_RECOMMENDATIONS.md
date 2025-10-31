# Testing Recommendations - GTSD API

## Critical Issue: Jest Configuration Fix Required

### Problem
Tests are failing to run due to Jest not transforming the `uuid` package (ESM module). The error:
```
SyntaxError: Unexpected token 'export'
```

### Solution
The Jest configuration has been updated but needs verification:

**File**: `/apps/api/jest.config.js`
```javascript
transformIgnorePatterns: [
  'node_modules/(?!(@gtsd/shared-types|uuid)/)',
],
```

### Alternative Solutions

1. **Use commonjs import for uuid**:
   ```typescript
   // Instead of: import { v4 as uuidv4 } from 'uuid';
   const { v4: uuidv4 } = require('uuid');
   ```

2. **Mock uuid in tests**:
   ```typescript
   jest.mock('uuid', () => ({
     v4: () => 'test-uuid-1234',
   }));
   ```

3. **Update package.json**:
   ```json
   {
     "jest": {
       "transformIgnorePatterns": [
         "node_modules/(?!(@gtsd/shared-types|uuid)/)"
       ]
     }
   }
   ```

---

## Manual Testing Guide

### 1. Password Reset Flow (End-to-End)

#### Step 1: Request Password Reset
```bash
curl -X POST http://localhost:3001/auth/forgot-password \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com"}'
```

**Expected Response** (200 OK):
```json
{
  "success": true,
  "message": "If an account exists with that email, you will receive a password reset link shortly."
}
```

**Check Console**: Look for password reset link in logs:
```
==============================================
PASSWORD RESET LINK (Development Mode):
http://localhost:3000/reset-password?token=abc123...
==============================================
```

#### Step 2: Reset Password with Token
```bash
curl -X POST http://localhost:3001/auth/reset-password \
  -H "Content-Type: application/json" \
  -d '{
    "token": "TOKEN_FROM_LOGS",
    "newPassword": "NewPassword123!"
  }'
```

**Expected Response** (200 OK):
```json
{
  "success": true,
  "message": "Password has been reset successfully. You can now log in with your new password."
}
```

#### Step 3: Verify New Password Works
```bash
curl -X POST http://localhost:3001/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "NewPassword123!"
  }'
```

**Expected Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "user": { ... },
    "accessToken": "...",
    "refreshToken": "..."
  }
}
```

#### Step 4: Verify Old Sessions Are Invalidated
```bash
# Try to use old refresh token (should fail)
curl -X POST http://localhost:3001/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{"refreshToken": "OLD_REFRESH_TOKEN"}'
```

**Expected Response** (401 Unauthorized):
```json
{
  "success": false,
  "error": "Invalid or expired refresh token"
}
```

---

### 2. Change Password Flow (Authenticated)

#### Step 1: Login to Get Token
```bash
curl -X POST http://localhost:3001/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "CurrentPassword123!"
  }'
```

Save the `accessToken` from response.

#### Step 2: Change Password
```bash
curl -X PATCH http://localhost:3001/auth/change-password \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -d '{
    "currentPassword": "CurrentPassword123!",
    "newPassword": "NewPassword456!"
  }'
```

**Expected Response** (200 OK):
```json
{
  "success": true,
  "message": "Password changed successfully. All sessions have been logged out. Please log in again."
}
```

#### Step 3: Verify Cannot Use Same Password
```bash
curl -X PATCH http://localhost:3001/auth/change-password \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -d '{
    "currentPassword": "NewPassword456!",
    "newPassword": "NewPassword456!"
  }'
```

**Expected Response** (400 Bad Request):
```json
{
  "success": false,
  "error": "New password must be different from current password"
}
```

---

### 3. Profile Preferences Flow

#### Step 1: Complete Onboarding First
```bash
curl -X POST http://localhost:3001/onboarding/submit \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -d '{
    "dateOfBirth": "1990-01-15",
    "gender": "male",
    "currentWeight": 80,
    "height": 175,
    "targetWeight": 75,
    "targetDate": "2025-04-15T00:00:00.000Z",
    "primaryGoal": "lose_weight",
    "activityLevel": "moderate"
  }'
```

#### Step 2: Update Dietary Preferences
```bash
curl -X PUT http://localhost:3001/auth/profile/preferences \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -d '{
    "dietaryPreferences": ["vegetarian", "gluten-free"],
    "allergies": ["peanuts", "shellfish"],
    "mealsPerDay": 4
  }'
```

**Expected Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "dietaryPreferences": ["vegetarian", "gluten-free"],
    "allergies": ["peanuts", "shellfish"],
    "mealsPerDay": 4
  }
}
```

#### Step 3: Clear Preferences
```bash
curl -X PUT http://localhost:3001/auth/profile/preferences \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -d '{
    "dietaryPreferences": [],
    "allergies": []
  }'
```

**Expected Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "dietaryPreferences": [],
    "allergies": [],
    "mealsPerDay": 4
  }
}
```

---

## iOS Manual Testing

### BMI Calculation Testing

**File**: `/apps/GTSD/GTSD/Features/Plans/PlanSummaryViewModel.swift`

**Test Cases**:

1. **Metric Units (cm, kg)**
   - Height: 175 cm, Weight: 80 kg
   - Expected BMI: 26.1

2. **Imperial Units (inches, lbs)**
   - Height: 69 inches (175 cm), Weight: 176 lbs (80 kg)
   - Expected BMI: 26.1

3. **Edge Cases**
   - Very tall: Height: 200 cm, Weight: 100 kg → BMI: 25.0
   - Very short: Height: 150 cm, Weight: 50 kg → BMI: 22.2
   - Underweight: Height: 175 cm, Weight: 50 kg → BMI: 16.3
   - Overweight: Height: 175 cm, Weight: 100 kg → BMI: 32.7

**Manual Test**:
1. Complete onboarding with test values
2. Navigate to Plan Summary
3. Verify BMI calculation matches expected values
4. Check that units display correctly (imperial vs metric)

---

### TagInputField Testing

**File**: `/apps/GTSD/GTSD/Features/Profile/Components/TagInputField.swift`

**Test Cases**:

1. **Basic Functionality**
   - Type "vegetarian" and press Enter
   - Verify tag bubble appears
   - Tap X button on tag
   - Verify tag is removed

2. **Multiple Tags**
   - Add 5 different tags
   - Verify all appear as bubbles
   - Verify wrapping works correctly

3. **Special Characters**
   - Add tag with unicode: "低糖"
   - Add tag with accents: "café"
   - Verify display correctly

4. **Long Tags**
   - Add very long tag (50+ characters)
   - Verify layout doesn't break
   - Verify ellipsis if needed

5. **Empty Input**
   - Press Enter with empty text
   - Verify no tag is added

6. **Duplicate Tags**
   - Add "vegan"
   - Try to add "vegan" again
   - Decision: allow or prevent?

**Manual Test**:
1. Navigate to Profile Edit screen
2. Test dietary preferences field
3. Test allergies field
4. Verify tags persist when saving

---

### Forgot Password Flow Testing

**File**: `/apps/GTSD/GTSD/Features/Auth/ForgotPasswordView.swift`

**Test Cases**:

1. **Valid Email**
   - Enter valid email
   - Tap "Send Reset Link"
   - Verify success screen shows
   - Verify email sent (check backend logs)

2. **Invalid Email Format**
   - Enter "notanemail"
   - Tap "Send Reset Link"
   - Verify validation error shows

3. **Empty Email**
   - Leave email blank
   - Tap "Send Reset Link"
   - Verify validation error shows

4. **Network Error**
   - Disconnect from network
   - Tap "Send Reset Link"
   - Verify error message shows

5. **Non-Existent Email**
   - Enter "doesnotexist@example.com"
   - Verify success message still shows (security)

**Manual Test**:
1. Navigate to Login screen
2. Tap "Forgot Password?"
3. Test all scenarios above
4. Verify success screen allows returning to login

---

### Change Password Flow Testing

**File**: `/apps/GTSD/GTSD/Features/Auth/ChangePasswordView.swift`

**Test Cases**:

1. **Valid Password Change**
   - Enter current password
   - Enter new valid password
   - Verify requirements checklist updates
   - Tap "Change Password"
   - Verify success and logout

2. **Wrong Current Password**
   - Enter incorrect current password
   - Enter new valid password
   - Verify error message shows

3. **Same Password**
   - Enter current password
   - Enter same password as new
   - Verify error shows

4. **Weak New Password**
   - Enter "weak"
   - Verify requirements checklist shows failures
   - Verify cannot submit

5. **Requirements Checklist**
   - Type password character by character
   - Verify checklist updates in real-time:
     - ✓ At least 8 characters
     - ✓ One uppercase letter
     - ✓ One lowercase letter
     - ✓ One number
     - ✓ One special character

**Manual Test**:
1. Login to app
2. Navigate to Settings → Security
3. Tap "Change Password"
4. Test all scenarios above
5. After successful change, verify must login again

---

### Profile Preferences Integration Testing

**Test Flow**:

1. **Complete Flow**
   - Login
   - Complete onboarding
   - Navigate to Profile → Edit
   - Add dietary preferences: "vegan", "organic"
   - Add allergies: "nuts", "soy"
   - Change meals per day to 5
   - Save changes
   - Navigate away
   - Return to Profile → Edit
   - Verify preferences still there

2. **Logout/Login Persistence**
   - Set preferences as above
   - Logout
   - Login again
   - Navigate to Profile → Edit
   - Verify preferences persist

3. **Network Error Handling**
   - Set preferences
   - Disconnect network
   - Try to save
   - Verify error message
   - Reconnect network
   - Retry save
   - Verify success

---

## Security Testing Recommendations

### 1. Email Enumeration Testing

**Goal**: Verify attackers cannot determine if email exists

**Test**:
```bash
# Request for existing email
time curl -X POST http://localhost:3001/auth/forgot-password \
  -H "Content-Type: application/json" \
  -d '{"email": "existing@example.com"}'

# Request for non-existing email
time curl -X POST http://localhost:3001/auth/forgot-password \
  -H "Content-Type: application/json" \
  -d '{"email": "nonexistent@example.com"}'
```

**Expected**:
- Both return 200 OK
- Both return same message
- Both take similar time (~±100ms)
- No way to distinguish between them

---

### 2. Token Security Testing

**Goal**: Verify tokens are secure and properly validated

**Tests**:

1. **Token Expiration**
   ```bash
   # Get token from logs
   # Wait 61 minutes
   # Try to use expired token
   curl -X POST http://localhost:3001/auth/reset-password \
     -H "Content-Type: application/json" \
     -d '{"token": "EXPIRED_TOKEN", "newPassword": "NewPass123!"}'
   ```
   **Expected**: 400 Bad Request - "Invalid or expired"

2. **Token Reuse**
   ```bash
   # Use token once
   curl -X POST http://localhost:3001/auth/reset-password \
     -H "Content-Type: application/json" \
     -d '{"token": "TOKEN", "newPassword": "NewPass123!"}'

   # Try to use same token again
   curl -X POST http://localhost:3001/auth/reset-password \
     -H "Content-Type: application/json" \
     -d '{"token": "TOKEN", "newPassword": "AnotherPass456!"}'
   ```
   **Expected**: Second request fails with 400

3. **Token Randomness**
   - Request 10 password resets for same email
   - Check logs for tokens
   - Verify all 10 tokens are different
   - Verify no patterns in tokens

---

### 3. Session Invalidation Testing

**Goal**: Verify password changes invalidate all sessions

**Test**:
```bash
# 1. Login and get tokens
curl -X POST http://localhost:3001/auth/login \
  -d '{"email": "test@example.com", "password": "OldPass123!"}'
# Save accessToken and refreshToken

# 2. Login from "another device" (get second set of tokens)
curl -X POST http://localhost:3001/auth/login \
  -d '{"email": "test@example.com", "password": "OldPass123!"}'
# Save accessToken2 and refreshToken2

# 3. Change password using first token
curl -X PATCH http://localhost:3001/auth/change-password \
  -H "Authorization: Bearer ACCESS_TOKEN_1" \
  -d '{"currentPassword": "OldPass123!", "newPassword": "NewPass456!"}'

# 4. Try to use second device's refresh token (should fail)
curl -X POST http://localhost:3001/auth/refresh \
  -d '{"refreshToken": "REFRESH_TOKEN_2"}'

# 5. Try to use first device's refresh token (should fail)
curl -X POST http://localhost:3001/auth/refresh \
  -d '{"refreshToken": "REFRESH_TOKEN_1"}'
```

**Expected**: Both refresh attempts fail with 401

---

### 4. Password Strength Testing

**Test Passwords**:

```bash
# Too short (< 8 characters)
curl -X POST http://localhost:3001/auth/reset-password \
  -d '{"token": "TOKEN", "newPassword": "Pass1!"}'
# Expected: 400 - "at least 8 characters"

# No uppercase
curl -X POST http://localhost:3001/auth/reset-password \
  -d '{"token": "TOKEN", "newPassword": "password123!"}'
# Expected: 400 - "uppercase letter"

# No lowercase
curl -X POST http://localhost:3001/auth/reset-password \
  -d '{"token": "TOKEN", "newPassword": "PASSWORD123!"}'
# Expected: 400 - "lowercase letter"

# No number
curl -X POST http://localhost:3001/auth/reset-password \
  -d '{"token": "TOKEN", "newPassword": "Password!"}'
# Expected: 400 - "number"

# No special character
curl -X POST http://localhost:3001/auth/reset-password \
  -d '{"token": "TOKEN", "newPassword": "Password123"}'
# Expected: 400 - "special character"

# Valid password
curl -X POST http://localhost:3001/auth/reset-password \
  -d '{"token": "TOKEN", "newPassword": "Password123!"}'
# Expected: 200 - Success
```

---

### 5. XSS and Injection Testing

**Goal**: Verify inputs are properly sanitized

**Test Inputs**:

```bash
# XSS in email
curl -X POST http://localhost:3001/auth/forgot-password \
  -d '{"email": "test@example.com<script>alert(1)</script>"}'
# Expected: 400 - Invalid email format

# SQL injection in email
curl -X POST http://localhost:3001/auth/forgot-password \
  -d '{"email": "test@example.com; DROP TABLE users;--"}'
# Expected: 400 - Invalid email format

# Header injection in email
curl -X POST http://localhost:3001/auth/forgot-password \
  -d '{"email": "test@example.com\nBcc: attacker@evil.com"}'
# Expected: 400 - Invalid email format

# XSS in dietary preferences
curl -X PUT http://localhost:3001/auth/profile/preferences \
  -H "Authorization: Bearer TOKEN" \
  -d '{"dietaryPreferences": ["<script>alert(1)</script>"]}'
# Expected: 200 - Accepted but properly encoded when displayed
```

---

## Performance Testing Recommendations

### 1. Response Time Testing

**Goal**: Verify all endpoints meet performance targets

**Tool**: Apache Bench or Artillery

```bash
# Test forgot password endpoint
ab -n 100 -c 10 -p forgot.json -T application/json \
  http://localhost:3001/auth/forgot-password

# Target: p95 < 500ms

# Test profile preferences endpoint
ab -n 100 -c 10 -p prefs.json -T application/json \
  -H "Authorization: Bearer TOKEN" \
  http://localhost:3001/auth/profile/preferences

# Target: p95 < 200ms
```

---

### 2. Concurrent Request Testing

**Goal**: Verify system handles concurrent requests

```bash
# 50 concurrent password reset requests
seq 1 50 | xargs -P 50 -I {} curl -X POST \
  http://localhost:3001/auth/forgot-password \
  -H "Content-Type: application/json" \
  -d '{"email": "test{}@example.com"}'
```

**Expected**:
- All requests succeed
- Database doesn't deadlock
- Redis connections don't exhaust

---

### 3. Load Testing

**Goal**: Verify system under sustained load

**Tool**: k6 or Artillery

```javascript
// k6 script
import http from 'k6/http';
import { check } from 'k6';

export let options = {
  vus: 50,  // 50 virtual users
  duration: '5m',  // 5 minutes
};

export default function () {
  let response = http.post('http://localhost:3001/auth/forgot-password',
    JSON.stringify({ email: 'test@example.com' }),
    { headers: { 'Content-Type': 'application/json' } }
  );

  check(response, {
    'status is 200': (r) => r.status === 200,
    'response time < 500ms': (r) => r.timings.duration < 500,
  });
}
```

---

## CI/CD Integration

### GitHub Actions Workflow

```yaml
name: API Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest

    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_USER: gtsd
          POSTGRES_PASSWORD: gtsd_dev_password
          POSTGRES_DB: gtsd_test
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 5434:5432

      redis:
        image: redis:7
        options: >-
          --health-cmd "redis-cli ping"
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 6379:6379

    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '20'

      - name: Install pnpm
        run: npm install -g pnpm

      - name: Install dependencies
        run: pnpm install

      - name: Run migrations
        run: pnpm --filter @gtsd/api db:migrate
        env:
          DATABASE_URL: postgresql://gtsd:gtsd_dev_password@localhost:5434/gtsd_test

      - name: Run tests
        run: pnpm --filter @gtsd/api test -- --coverage
        env:
          NODE_ENV: test
          DATABASE_URL: postgresql://gtsd:gtsd_dev_password@localhost:5434/gtsd_test
          REDIS_URL: redis://localhost:6379

      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          files: ./apps/api/coverage/lcov.info
```

---

## Monitoring and Alerting

### Key Metrics to Monitor

1. **Password Reset Metrics**
   - Reset requests per hour
   - Reset completion rate
   - Failed reset attempts
   - Token expiration rate

2. **Profile Preferences Metrics**
   - Update frequency
   - Update success rate
   - Response time (p50, p95, p99)
   - Validation error rate

3. **Security Metrics**
   - Failed login attempts
   - Password change frequency
   - Token reuse attempts
   - Session invalidations

### Recommended Alerts

```yaml
# Example: DataDog alerts
- name: High Password Reset Rate
  query: rate(password_reset_requests[5m]) > 100
  severity: warning
  message: "Unusual password reset activity detected"

- name: Slow Profile Updates
  query: p95(profile_preferences_duration) > 200ms
  severity: warning
  message: "Profile preferences updates exceeding p95 target"

- name: Token Reuse Attempts
  query: rate(password_reset_token_reuse[5m]) > 10
  severity: critical
  message: "Multiple token reuse attempts detected - possible attack"
```

---

## Documentation Updates

### Update API Documentation

1. **Add to OpenAPI/Swagger**:
   ```yaml
   /auth/forgot-password:
     post:
       summary: Request password reset
       description: Initiates password reset flow by sending email with reset link
       security: []
       requestBody:
         required: true
         content:
           application/json:
             schema:
               type: object
               properties:
                 email:
                   type: string
                   format: email
   ```

2. **Update Postman Collection**:
   - Add forgot-password request
   - Add reset-password request
   - Add change-password request
   - Add profile-preferences request

3. **Update README**:
   - Document new endpoints
   - Document password requirements
   - Document profile preferences schema

---

## Conclusion

### Priority Actions

1. **Critical** (Do First):
   - Fix Jest UUID configuration issue
   - Run full test suite
   - Verify all 107 tests pass

2. **High** (Do Soon):
   - Manual iOS testing
   - Security testing
   - Performance testing

3. **Medium** (Do Eventually):
   - CI/CD integration
   - Load testing
   - Monitoring setup

4. **Low** (Nice to Have):
   - Rate limiting tests
   - Telemetry tests
   - Email integration tests

### Success Criteria

✅ All 107 automated tests passing
✅ Manual iOS flows tested and working
✅ Security tests pass (no vulnerabilities)
✅ Performance targets met (p95 < 200ms)
✅ CI/CD pipeline integrated
✅ Documentation updated

