# Pre-Deployment Verification Checklist

**CRITICAL: Execute ALL steps before claiming fixes are deployed**

Version: 1.0
Last Updated: 2025-10-30
Purpose: Verify changes exist in code and build artifacts BEFORE deployment

---

## Verification Philosophy

**The Problem**: We've deployed "fixes" 4+ times that weren't actually in the running app due to:

- Build cache serving old code
- Xcode not picking up file changes
- Metro bundler serving stale JavaScript
- Database migrations not applied
- Environment variables not loaded

**The Solution**: Multi-layer verification at each stage:

1. Code verification (source files contain changes)
2. Build verification (compiled artifacts contain changes)
3. Runtime verification (running app executes changes)
4. Data verification (database reflects changes)

---

## Stage 1: Source Code Verification

### 1.1 Verify File Changes Exist

**Purpose**: Confirm source files contain expected changes

```bash
# Change to project root
cd /Users/devarisbrown/Code/projects/gtsd

# Check git status for modified files
git status

# For each modified file, verify changes are present
git diff apps/mobile/src/stores/authStore.ts | grep -A 5 -B 5 "timeoutPromise"
git diff apps/mobile/src/navigation/RootNavigator.tsx | grep -A 5 -B 5 "setIsHydrated"
git diff apps/api/src/middleware/rateLimiter.ts | grep -A 5 -B 5 "replace"
```

**Success Criteria**:

- [ ] git diff shows expected code changes
- [ ] Line numbers match code review comments
- [ ] No unexpected modifications
- [ ] Timestamps are recent (within last hour)

**Red Flags**:

- Empty git diff output (changes not saved)
- Old file timestamps (cache issue)
- Changes missing critical lines

### 1.2 Verify Critical Auth Fixes

**5-Second Auth Timeout** (Most Critical):

```bash
# Verify timeout logic exists in authStore.ts
grep -n "setTimeout.*5000" apps/mobile/src/stores/authStore.ts

# Expected output:
# 193:  setTimeout(() => reject(new Error('Auth check timeout after 5s')), 5000)

# Verify Promise.race implementation
grep -n "Promise.race" apps/mobile/src/stores/authStore.ts

# Expected output:
# 197: const response = await Promise.race([apiPromise, timeoutPromise]);
```

**Non-Blocking Hydration**:

```bash
# Verify hydration always completes in finally block
grep -A 3 "} finally {" apps/mobile/src/navigation/RootNavigator.tsx | grep "setIsHydrated"

# Expected output:
# setIsHydrated(true);
```

**Success Criteria**:

- [ ] Timeout is exactly 5000ms
- [ ] Promise.race includes both apiPromise and timeoutPromise
- [ ] setIsHydrated(true) in finally block (always runs)

---

## Stage 2: Backend API Verification

### 2.1 Verify Backend Endpoints Exist

**Purpose**: Confirm API routes are registered and accessible

**Start Backend** (if not running):

```bash
cd /Users/devarisbrown/Code/projects/gtsd

# Start dependencies
docker-compose up -d postgres redis minio

# Start API in separate terminal
cd apps/api
pnpm dev

# Wait for startup message:
# "Server running on port 3000 in development mode"
```

**Health Check**:

```bash
# Verify API is running
curl -s http://localhost:3000/healthz | jq

# Expected output:
# {
#   "status": "healthy",
#   "timestamp": "2025-10-30T...",
#   "uptime": ...
# }
```

**Success Criteria**:

- [ ] Health check returns HTTP 200
- [ ] Response JSON contains "status": "healthy"
- [ ] No error messages in API logs

### 2.2 Test Auth Endpoints

**Signup Endpoint**:

```bash
# Test signup endpoint exists and validates
curl -X POST http://localhost:3000/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test-verify@example.com",
    "password": "TestPass123!",
    "firstName": "Test",
    "lastName": "User"
  }' | jq

# Expected response:
# {
#   "success": true,
#   "data": {
#     "user": { "id": ..., "email": "test-verify@example.com", ... },
#     "tokens": { "accessToken": "...", "refreshToken": "..." }
#   }
# }
```

**Login Endpoint**:

```bash
# Test login endpoint exists
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test-verify@example.com",
    "password": "TestPass123!"
  }' | jq

# Expected response:
# {
#   "success": true,
#   "data": {
#     "user": { "id": ..., "email": "test-verify@example.com" },
#     "tokens": { "accessToken": "...", "refreshToken": "..." }
#   }
# }
```

**Get Current User** (requires auth):

```bash
# First, login and extract token
TOKEN=$(curl -s -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test-verify@example.com",
    "password": "TestPass123!"
  }' | jq -r '.data.tokens.accessToken')

# Test /auth/me endpoint
curl -s http://localhost:3000/auth/me \
  -H "Authorization: Bearer $TOKEN" | jq

# Expected response:
# {
#   "success": true,
#   "data": {
#     "id": ...,
#     "email": "test-verify@example.com",
#     "firstName": "Test",
#     ...
#   }
# }
```

**Success Criteria**:

- [ ] Signup returns HTTP 201 with user object and tokens
- [ ] Login returns HTTP 200 with user object and tokens
- [ ] /auth/me returns HTTP 200 with user profile
- [ ] Invalid credentials return HTTP 401
- [ ] Missing auth header returns HTTP 401

**Red Flags**:

- HTTP 404 (endpoint doesn't exist)
- HTTP 500 (server error - check logs)
- Empty response body
- Tokens missing from response

### 2.3 Verify Rate Limiter IPv6 Fix

**Purpose**: Confirm rate limiter handles IPv6-mapped IPv4 addresses

```bash
# Check rate limiter implementation
grep -n "replace.*::ffff:" apps/api/src/middleware/rateLimiter.ts

# Expected output:
# 116: return ip.replace(/^::ffff:/, '');
```

**Test with actual request**:

```bash
# Make request (will use IPv6-mapped address in local dev)
curl -v http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"wrong"}' 2>&1 | grep -i "x-ratelimit"

# Expected headers:
# x-ratelimit-limit: 100
# x-ratelimit-remaining: 99
```

**Check API logs for IPv6 errors**:

```bash
# API should NOT log this error:
# "Custom keyGenerator appears to use request IP without calling the ipKeyGenerator helper"

# If you see this error, the fix is NOT applied
```

**Success Criteria**:

- [ ] Rate limiter code contains `.replace(/^::ffff:/, '')`
- [ ] No IPv6 validation errors in API logs
- [ ] Rate limit headers present in response

---

## Stage 3: iOS Build Verification

### 3.1 Clean Build Environment

**Purpose**: Ensure Xcode isn't using cached artifacts

**CRITICAL**: Always clean before verifying iOS changes

```bash
cd /Users/devarisbrown/Code/projects/gtsd/apps/mobile

# 1. Clean Metro bundler cache
watchman watch-del-all
rm -rf $TMPDIR/metro-*
rm -rf $TMPDIR/haste-map-*

# 2. Clean iOS build artifacts
rm -rf ios/build
rm -rf ios/Pods
rm -rf ios/Podfile.lock

# 3. Clean Xcode DerivedData (contains compiled code)
rm -rf ~/Library/Developer/Xcode/DerivedData/mobile-*

# 4. Clean node_modules (if dependency changes)
# ONLY if package.json changed
# rm -rf node_modules
# pnpm install

# 5. Reinstall CocoaPods
cd ios
pod install
cd ..
```

**Success Criteria**:

- [ ] All cache directories removed
- [ ] DerivedData folder empty or removed
- [ ] pod install completes without errors
- [ ] Build folder recreated

**Time Required**: 2-3 minutes

**Red Flags**:

- Pod install fails (dependency issue)
- DerivedData folder still contains old build
- Permission errors (need sudo)

### 3.2 Verify Metro Bundler Uses Latest Code

**Purpose**: Confirm JavaScript bundle contains your changes

```bash
cd /Users/devarisbrown/Code/projects/gtsd/apps/mobile

# Start Metro with cache reset
pnpm start --reset-cache

# In separate terminal, check bundle output
# Look for your changed files being processed
# Expected to see:
# "Building JavaScript bundle [100%]"
# "Transformed N files (X ms)"
```

**Verify specific files are bundled**:

```bash
# While Metro is running, search for critical strings in bundle
# This confirms your code made it into the bundle

# Connect to Metro on localhost:8081
curl -s "http://localhost:8081/index.bundle?platform=ios&dev=true" | \
  grep -c "Auth check timeout after 5s"

# Expected output: 1 or more (string found in bundle)
```

**Success Criteria**:

- [ ] Metro starts with --reset-cache flag
- [ ] Bundle builds without errors
- [ ] Critical code strings found in bundle
- [ ] No "Cannot find module" errors

---

## Stage 4: iOS App Code Verification

### 4.1 Check App Version/Build Number

**Purpose**: Confirm you're running a fresh build, not cached app

**Before building, increment version**:

```bash
# Edit ios/mobile/Info.plist
# Increment CFBundleVersion (build number)
# Example: 1 -> 2, 2 -> 3, etc.

cd /Users/devarisbrown/Code/projects/gtsd/apps/mobile/ios

# Find current version
/usr/libexec/PlistBuddy -c "Print CFBundleVersion" mobile/Info.plist

# Increment version
CURRENT_VERSION=$(/usr/libexec/PlistBuddy -c "Print CFBundleVersion" mobile/Info.plist)
NEW_VERSION=$((CURRENT_VERSION + 1))
/usr/libexec/PlistBuddy -c "Set CFBundleVersion $NEW_VERSION" mobile/Info.plist

echo "Build number: $CURRENT_VERSION -> $NEW_VERSION"
```

**Success Criteria**:

- [ ] Build number incremented
- [ ] Version visible in app (Settings screen or debug info)

### 4.2 Add Debug Verification Logs

**Purpose**: Prove specific code paths execute at runtime

**Add to authStore.ts** (temporarily):

```typescript
checkAuthStatus: async () => {
  console.log('[VERIFICATION] checkAuthStatus called at:', new Date().toISOString());

  set({ isLoading: true, error: null });

  try {
    const hasTokens = await tokenStorage.isAuthenticated();
    console.log('[VERIFICATION] hasTokens:', hasTokens);

    if (!hasTokens) {
      console.log('[VERIFICATION] No tokens found, setting unauthenticated');
      set({ isAuthenticated: false, isLoading: false, user: null, requiresOnboarding: false });
      return false;
    }

    // CRITICAL: Verify timeout is active
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => {
        console.log('[VERIFICATION] Auth timeout triggered after 5s!');
        reject(new Error('Auth check timeout after 5s'));
      }, 5000)
    );

    console.log('[VERIFICATION] Starting auth check race...');
    const apiPromise = authApi.getCurrentUser();
    const response = await Promise.race([apiPromise, timeoutPromise]);

    console.log('[VERIFICATION] Auth check completed successfully:', response);
    // ... rest of logic
  } catch (error) {
    console.log('[VERIFICATION] Auth check error:', error);
    // ... error handling
  }
};
```

**Add to RootNavigator.tsx** (temporarily):

```typescript
useEffect(() => {
  const initialize = async () => {
    console.log('[VERIFICATION] RootNavigator initialize called');
    try {
      console.log('[VERIFICATION] Calling checkAuthStatus...');
      await checkAuthStatus();
      console.log('[VERIFICATION] checkAuthStatus completed');
    } catch (error) {
      console.error('[VERIFICATION] Auth check failed during init:', error);
    } finally {
      console.log('[VERIFICATION] Setting isHydrated = true');
      setIsHydrated(true);
    }
  };
  initialize();
}, [checkAuthStatus]);
```

**Success Criteria**:

- [ ] Debug logs added to critical code paths
- [ ] Logs include timestamps and context
- [ ] Each verification log has unique prefix: `[VERIFICATION]`

**Remove after verification**: These logs should be removed once deployment is confirmed.

---

## Stage 5: Database Verification

### 5.1 Check Database Connection

**Purpose**: Verify app can connect to database

```bash
# Connect to Postgres
docker exec -it gtsd-postgres psql -U gtsd -d gtsd

# Check tables exist
\dt

# Expected output:
# List of relations
#  Schema |           Name           | Type  | Owner
# --------+--------------------------+-------+-------
#  public | users                    | table | gtsd
#  public | refresh_tokens           | table | gtsd
#  public | onboarding_profiles      | table | gtsd
#  ...

# Exit psql
\q
```

**Success Criteria**:

- [ ] Database connection succeeds
- [ ] All required tables exist
- [ ] No connection errors in API logs

### 5.2 Verify Database Schema

**Purpose**: Confirm migrations applied correctly

```bash
# Check migrations table
docker exec -it gtsd-postgres psql -U gtsd -d gtsd -c "SELECT * FROM drizzle.__drizzle_migrations ORDER BY created_at DESC LIMIT 5;"

# Expected output:
# List of applied migrations with recent timestamps
```

**Verify specific columns exist**:

```bash
# Check users table has required columns
docker exec -it gtsd-postgres psql -U gtsd -d gtsd -c "\d users"

# Expected columns:
# id, email, password_hash, first_name, last_name, created_at, updated_at, etc.
```

**Success Criteria**:

- [ ] Migrations table shows recent migrations
- [ ] All required columns exist in tables
- [ ] No migration errors in API logs

### 5.3 Test Data Persistence

**Purpose**: Verify data actually saves to database

```bash
# Create test user via API
curl -X POST http://localhost:3000/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "email": "persistence-test@example.com",
    "password": "TestPass123!",
    "firstName": "Persistence",
    "lastName": "Test"
  }' | jq

# Verify user exists in database
docker exec -it gtsd-postgres psql -U gtsd -d gtsd -c \
  "SELECT id, email, first_name, last_name, created_at FROM users WHERE email = 'persistence-test@example.com';"

# Expected output:
#  id | email                      | first_name  | last_name | created_at
# ----+----------------------------+-------------+-----------+------------
#  XX | persistence-test@example.com | Persistence | Test      | 2025-10-30...
```

**Success Criteria**:

- [ ] User created via API appears in database
- [ ] Timestamps are recent (within last minute)
- [ ] All fields populated correctly

---

## Stage 6: Environment Variables Verification

### 6.1 Backend Environment Variables

```bash
cd /Users/devarisbrown/Code/projects/gtsd/apps/api

# Check .env file exists
test -f .env && echo ".env exists" || echo "ERROR: .env missing!"

# Verify critical variables (without exposing secrets)
grep -q "DATABASE_URL" .env && echo "DATABASE_URL: set" || echo "DATABASE_URL: MISSING"
grep -q "JWT_SECRET" .env && echo "JWT_SECRET: set" || echo "JWT_SECRET: MISSING"
grep -q "JWT_REFRESH_SECRET" .env && echo "JWT_REFRESH_SECRET: set" || echo "JWT_REFRESH_SECRET: MISSING"
grep -q "REDIS_URL" .env && echo "REDIS_URL: set" || echo "REDIS_URL: MISSING"
```

**Success Criteria**:

- [ ] .env file exists
- [ ] All critical variables set
- [ ] No "MISSING" messages

### 6.2 Mobile Environment Variables

```bash
cd /Users/devarisbrown/Code/projects/gtsd/apps/mobile

# Check .env file exists
test -f .env && echo ".env exists" || echo "ERROR: .env missing!"

# Verify API URL
grep -q "REACT_APP_API_URL" .env && echo "REACT_APP_API_URL: set" || echo "REACT_APP_API_URL: MISSING"

# Show API URL (safe to display)
grep "REACT_APP_API_URL" .env
```

**Success Criteria**:

- [ ] .env file exists
- [ ] REACT_APP_API_URL set correctly
- [ ] For iOS simulator: http://localhost:3000/api
- [ ] For Android emulator: http://10.0.2.2:3000/api

---

## Pre-Flight Checklist

**Complete this checklist before deploying to simulator/device**

### Source Code

- [ ] git status shows modified files
- [ ] git diff shows expected changes
- [ ] File timestamps are recent (< 1 hour)
- [ ] 5-second timeout code present
- [ ] Non-blocking hydration code present
- [ ] Rate limiter IPv6 fix present

### Backend API

- [ ] Backend server running (health check passes)
- [ ] /auth/signup endpoint works
- [ ] /auth/login endpoint works
- [ ] /auth/me endpoint works (with token)
- [ ] Rate limiter headers present
- [ ] No IPv6 errors in logs

### iOS Build

- [ ] Metro cache cleared
- [ ] iOS build cache cleared
- [ ] Xcode DerivedData cleared
- [ ] CocoaPods reinstalled
- [ ] Build number incremented
- [ ] Metro bundler started with --reset-cache

### Database

- [ ] Database connection works
- [ ] Required tables exist
- [ ] Migrations applied
- [ ] Test data persists

### Environment

- [ ] Backend .env file exists and configured
- [ ] Mobile .env file exists and configured
- [ ] API URL correct for platform

### Debug Verification

- [ ] Debug logs added to critical paths
- [ ] Console.log statements include [VERIFICATION] prefix
- [ ] Logs will confirm code execution at runtime

---

## Troubleshooting Common Issues

### Issue: "Changes not in running app"

**Root Cause**: Build cache

**Solution**:

```bash
# Nuclear option - clean everything
cd /Users/devarisbrown/Code/projects/gtsd/apps/mobile
watchman watch-del-all
rm -rf $TMPDIR/metro-*
rm -rf ios/build ios/Pods ios/Podfile.lock
rm -rf ~/Library/Developer/Xcode/DerivedData/mobile-*
cd ios && pod install && cd ..
pnpm start --reset-cache
```

### Issue: "Endpoint returns 404"

**Root Cause**: Routes not registered or API not running

**Solution**:

```bash
# Check API logs for route registration
cd /Users/devarisbrown/Code/projects/gtsd/apps/api
pnpm dev

# Look for startup messages:
# "Server running on port 3000"

# Verify route in code
grep -r "router.post.*signup" apps/api/src/routes/
```

### Issue: "Database connection failed"

**Root Cause**: Postgres not running or wrong credentials

**Solution**:

```bash
# Check Postgres is running
docker ps | grep postgres

# If not running:
docker-compose up -d postgres

# Test connection
docker exec -it gtsd-postgres psql -U gtsd -d gtsd -c "SELECT 1;"
```

### Issue: "Metro bundler errors"

**Root Cause**: Module resolution or syntax errors

**Solution**:

```bash
# Check for TypeScript errors
cd /Users/devarisbrown/Code/projects/gtsd/apps/mobile
pnpm typecheck

# Clear all caches
pnpm start --reset-cache
```

---

## Time Estimates

| Step                     | Time Required  |
| ------------------------ | -------------- |
| Source code verification | 5 minutes      |
| Backend API verification | 10 minutes     |
| iOS build clean          | 3 minutes      |
| Build verification       | 5 minutes      |
| Database verification    | 5 minutes      |
| Environment verification | 2 minutes      |
| **Total**                | **30 minutes** |

**IMPORTANT**: These 30 minutes are REQUIRED before claiming deployment is complete. Skipping verification is why previous deployments failed.

---

## Sign-Off

Before proceeding to deployment:

**Verified by**: ******\_\_\_\_******
**Date**: ******\_\_\_\_******
**Time**: ******\_\_\_\_******

**Checklist completion**: **\_** / **\_** items checked

**Notes**:
