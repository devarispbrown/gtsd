# Verification Commands Reference

**Copy-paste commands for rapid verification**

Version: 1.0
Last Updated: 2025-10-30
Purpose: Quick reference for all verification commands

---

## Table of Contents

1. [Backend API Verification](#backend-api-verification)
2. [Database Verification](#database-verification)
3. [Mobile App Verification](#mobile-app-verification)
4. [Build Verification](#build-verification)
5. [Environment Verification](#environment-verification)
6. [Cache Clearing](#cache-clearing)
7. [Quick Health Checks](#quick-health-checks)

---

## Backend API Verification

### Start Backend

```bash
# Terminal 1: Start dependencies
cd /Users/devarisbrown/Code/projects/gtsd
docker-compose up -d postgres redis minio

# Terminal 2: Start API
cd /Users/devarisbrown/Code/projects/gtsd/apps/api
pnpm dev

# Wait for: "Server running on port 3000"
```

### Health Check

```bash
# Quick health check
curl -s http://localhost:3000/healthz | jq

# Expected:
# {
#   "status": "healthy",
#   "timestamp": "...",
#   "uptime": ...
# }

# Detailed health check
curl -s http://localhost:3000/healthz | jq '.status'
# Expected: "healthy"
```

### Test Auth Endpoints

```bash
# Test signup
curl -X POST http://localhost:3000/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "email": "verify@example.com",
    "password": "TestPass123!",
    "firstName": "Verify",
    "lastName": "User"
  }' | jq

# Test login
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "verify@example.com",
    "password": "TestPass123!"
  }' | jq

# Test /auth/me (get current user)
TOKEN=$(curl -s -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"verify@example.com","password":"TestPass123!"}' | \
  jq -r '.data.tokens.accessToken')

curl -s http://localhost:3000/auth/me \
  -H "Authorization: Bearer $TOKEN" | jq
```

### Test Rate Limiter

```bash
# Verify rate limit headers present
curl -I http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"wrong"}' | \
  grep -i ratelimit

# Expected:
# x-ratelimit-limit: 100
# x-ratelimit-remaining: 99
```

### Verify IPv6 Fix

```bash
# Check rate limiter code
grep -n "replace.*::ffff:" /Users/devarisbrown/Code/projects/gtsd/apps/api/src/middleware/rateLimiter.ts

# Expected:
# 116: return ip.replace(/^::ffff:/, '');

# Test with IPv6-mapped address
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -H "X-Forwarded-For: ::ffff:192.168.1.1" \
  -d '{"email":"test@example.com","password":"wrong"}' | jq

# Should NOT return 500 error
```

---

## Database Verification

### Connect to Database

```bash
# Connect to Postgres
docker exec -it gtsd-postgres psql -U gtsd -d gtsd

# Or run one-off query
docker exec -it gtsd-postgres psql -U gtsd -d gtsd -c "SELECT 1;"
```

### Check Tables

```bash
# List all tables
docker exec -it gtsd-postgres psql -U gtsd -d gtsd -c "\dt"

# Expected tables:
# users
# refresh_tokens
# onboarding_profiles
# tasks
# plans
# progress_photos
# streaks
# badges
```

### Check Users

```bash
# Count users
docker exec -it gtsd-postgres psql -U gtsd -d gtsd -c \
  "SELECT COUNT(*) as user_count FROM users;"

# List recent users
docker exec -it gtsd-postgres psql -U gtsd -d gtsd -c \
  "SELECT id, email, first_name, last_name, created_at
   FROM users
   ORDER BY created_at DESC
   LIMIT 5;"

# Find specific user
docker exec -it gtsd-postgres psql -U gtsd -d gtsd -c \
  "SELECT * FROM users WHERE email = 'verify@example.com';"
```

### Check Duplicate Emails

```bash
# Find duplicate emails (should be 0)
docker exec -it gtsd-postgres psql -U gtsd -d gtsd -c \
  "SELECT email, COUNT(*) as count
   FROM users
   GROUP BY email
   HAVING COUNT(*) > 1;"

# Expected: 0 rows
```

### Check Orphaned Records

```bash
# Orphaned refresh tokens
docker exec -it gtsd-postgres psql -U gtsd -d gtsd -c \
  "SELECT COUNT(*) as orphaned_tokens
   FROM refresh_tokens rt
   LEFT JOIN users u ON rt.user_id = u.id
   WHERE u.id IS NULL;"

# Orphaned onboarding profiles
docker exec -it gtsd-postgres psql -U gtsd -d gtsd -c \
  "SELECT COUNT(*) as orphaned_profiles
   FROM onboarding_profiles op
   LEFT JOIN users u ON op.user_id = u.id
   WHERE u.id IS NULL;"

# Orphaned tasks
docker exec -it gtsd-postgres psql -U gtsd -d gtsd -c \
  "SELECT COUNT(*) as orphaned_tasks
   FROM tasks t
   LEFT JOIN users u ON t.user_id = u.id
   WHERE u.id IS NULL;"

# All should return 0
```

### Check Migrations

```bash
# List applied migrations
docker exec -it gtsd-postgres psql -U gtsd -d gtsd -c \
  "SELECT id, hash, created_at
   FROM drizzle.__drizzle_migrations
   ORDER BY created_at DESC
   LIMIT 10;"
```

### Verify Test User

```bash
# Check test user exists
docker exec -it gtsd-postgres psql -U gtsd -d gtsd -c \
  "SELECT id, email, first_name, created_at
   FROM users
   WHERE email = 'verify@example.com';"

# Check onboarding profile
USER_ID=1  # Replace with actual user ID
docker exec -it gtsd-postgres psql -U gtsd -d gtsd -c \
  "SELECT *
   FROM onboarding_profiles
   WHERE user_id = $USER_ID;"
```

### Clean Test Data

```bash
# Delete test users (DANGEROUS - only in dev!)
docker exec -it gtsd-postgres psql -U gtsd -d gtsd -c \
  "DELETE FROM users WHERE email LIKE 'verify%@example.com';"

docker exec -it gtsd-postgres psql -U gtsd -d gtsd -c \
  "DELETE FROM users WHERE email LIKE 'test-qa%@example.com';"
```

---

## Mobile App Verification

### Check Mobile App Files

```bash
# Verify critical files exist
cd /Users/devarisbrown/Code/projects/gtsd/apps/mobile

ls -la src/stores/authStore.ts
ls -la src/navigation/RootNavigator.tsx
ls -la src/utils/secureStorage.ts
```

### Verify Critical Code

```bash
cd /Users/devarisbrown/Code/projects/gtsd/apps/mobile

# Check 5-second timeout
grep -n "setTimeout.*5000" src/stores/authStore.ts
# Expected: Line with timeout code

# Check Promise.race
grep -n "Promise.race" src/stores/authStore.ts
# Expected: Line with Promise.race call

# Check non-blocking hydration
grep -A 3 "} finally {" src/navigation/RootNavigator.tsx | grep "setIsHydrated"
# Expected: setIsHydrated(true);
```

### Check Package Versions

```bash
cd /Users/devarisbrown/Code/projects/gtsd/apps/mobile

# Check React Native version
grep "react-native" package.json | head -1

# Check critical dependencies
grep -E "(zustand|react-navigation|react-native-keychain)" package.json
```

### Start Mobile App

```bash
cd /Users/devarisbrown/Code/projects/gtsd/apps/mobile

# iOS
pnpm ios

# iOS with specific simulator
pnpm ios --simulator="iPhone 15 Pro"

# Android
pnpm android
```

### Metro Bundler

```bash
cd /Users/devarisbrown/Code/projects/gtsd/apps/mobile

# Start Metro with cache reset
pnpm start --reset-cache

# In separate terminal, check bundle
curl -s "http://localhost:8081/index.bundle?platform=ios&dev=true" > /tmp/bundle.js

# Verify critical code in bundle
grep -c "Auth check timeout after 5s" /tmp/bundle.js
# Expected: 1 or more

grep -c "setIsHydrated" /tmp/bundle.js
# Expected: 1 or more
```

---

## Build Verification

### iOS Build Number

```bash
cd /Users/devarisbrown/Code/projects/gtsd/apps/mobile/ios

# Get current build number
/usr/libexec/PlistBuddy -c "Print CFBundleVersion" mobile/Info.plist

# Increment build number
CURRENT=$(/usr/libexec/PlistBuddy -c "Print CFBundleVersion" mobile/Info.plist)
NEW=$((CURRENT + 1))
/usr/libexec/PlistBuddy -c "Set CFBundleVersion $NEW" mobile/Info.plist
echo "Build number: $CURRENT -> $NEW"
```

### Generate Build Version

```bash
cd /Users/devarisbrown/Code/projects/gtsd/apps/mobile

# Generate version file
bash scripts/generate-build-version.sh

# Verify version file created
cat src/version.ts
```

### Check CocoaPods

```bash
cd /Users/devarisbrown/Code/projects/gtsd/apps/mobile/ios

# Check Podfile.lock timestamp
ls -la Podfile.lock

# Check installed pods
pod list | grep -E "(RN|React)" | head -10

# Check for outdated pods
pod outdated
```

---

## Environment Verification

### Backend .env

```bash
cd /Users/devarisbrown/Code/projects/gtsd/apps/api

# Check .env exists
test -f .env && echo "✅ .env exists" || echo "❌ .env missing"

# Verify variables (without exposing secrets)
grep -q "DATABASE_URL" .env && echo "✅ DATABASE_URL set" || echo "❌ DATABASE_URL missing"
grep -q "JWT_SECRET" .env && echo "✅ JWT_SECRET set" || echo "❌ JWT_SECRET missing"
grep -q "REDIS_URL" .env && echo "✅ REDIS_URL set" || echo "❌ REDIS_URL missing"
```

### Mobile .env

```bash
cd /Users/devarisbrown/Code/projects/gtsd/apps/mobile

# Check .env exists
test -f .env && echo "✅ .env exists" || echo "❌ .env missing"

# Show API URL
grep "REACT_APP_API_URL" .env
# Expected: http://localhost:3000/api (iOS) or http://10.0.2.2:3000/api (Android)
```

---

## Cache Clearing

### Clear ALL Caches (Nuclear Option)

```bash
cd /Users/devarisbrown/Code/projects/gtsd/apps/mobile

# Stop Metro if running
pkill -f "react-native.*start" || true

# Clear Metro cache
rm -rf $TMPDIR/metro-*
rm -rf $TMPDIR/haste-map-*
rm -rf $TMPDIR/react-*
watchman watch-del-all

# Clear iOS build cache
rm -rf ios/build
rm -rf ios/Pods
rm -rf ios/Podfile.lock
rm -rf ~/Library/Developer/Xcode/DerivedData/mobile-*

# Clear React Native cache
rm -rf ~/.rncache

# Reinstall pods
cd ios
pod install
cd ..

# Restart Metro
pnpm start --reset-cache
```

### Clear Metro Cache Only

```bash
cd /Users/devarisbrown/Code/projects/gtsd/apps/mobile

pkill -f "react-native.*start" || true
rm -rf $TMPDIR/metro-*
watchman watch-del-all
pnpm start --reset-cache
```

### Clear Xcode Cache Only

```bash
cd /Users/devarisbrown/Code/projects/gtsd/apps/mobile

rm -rf ~/Library/Developer/Xcode/DerivedData/mobile-*
rm -rf ios/build
```

### Clear CocoaPods Cache Only

```bash
cd /Users/devarisbrown/Code/projects/gtsd/apps/mobile/ios

rm -rf Pods Podfile.lock
pod install
```

---

## Quick Health Checks

### Full System Health Check

```bash
#!/bin/bash
# Run from project root

cd /Users/devarisbrown/Code/projects/gtsd

echo "=== SYSTEM HEALTH CHECK ==="

# 1. Backend API
echo -n "Backend API: "
curl -s http://localhost:3000/healthz | grep -q "healthy" && echo "✅" || echo "❌"

# 2. Database
echo -n "Database: "
docker exec -it gtsd-postgres psql -U gtsd -d gtsd -c "SELECT 1;" &>/dev/null && echo "✅" || echo "❌"

# 3. Redis
echo -n "Redis: "
docker exec -it gtsd-redis redis-cli ping | grep -q "PONG" && echo "✅" || echo "❌"

# 4. Metro Bundler
echo -n "Metro Bundler: "
curl -s http://localhost:8081/status | grep -q "packager" && echo "✅" || echo "❌"

# 5. Mobile .env
echo -n "Mobile .env: "
test -f apps/mobile/.env && echo "✅" || echo "❌"

# 6. API .env
echo -n "API .env: "
test -f apps/api/.env && echo "✅" || echo "❌"

echo "======================="
```

### Backend Quick Test

```bash
# One-liner to test backend
curl -s http://localhost:3000/healthz && \
  echo "✅ Backend healthy" || \
  echo "❌ Backend down"
```

### Database Quick Test

```bash
# One-liner to test database
docker exec -it gtsd-postgres psql -U gtsd -d gtsd -c "SELECT COUNT(*) FROM users;" && \
  echo "✅ Database accessible" || \
  echo "❌ Database error"
```

### Metro Quick Test

```bash
# One-liner to test Metro
curl -s http://localhost:8081/status | grep -q "packager" && \
  echo "✅ Metro running" || \
  echo "❌ Metro not running"
```

---

## Pre-Deployment Quick Check

**Run this before every deployment:**

```bash
#!/bin/bash
cd /Users/devarisbrown/Code/projects/gtsd

echo "=== PRE-DEPLOYMENT CHECK ==="

# Backend
echo "1. Backend API..."
curl -s http://localhost:3000/healthz | grep -q "healthy" || { echo "❌ Backend failed"; exit 1; }
echo "   ✅ Backend healthy"

# Auth endpoints
echo "2. Auth endpoints..."
curl -s -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"wrong"}' | grep -q "success" || { echo "❌ Auth failed"; exit 1; }
echo "   ✅ Auth endpoints working"

# Database
echo "3. Database..."
docker exec -it gtsd-postgres psql -U gtsd -d gtsd -c "SELECT 1;" &>/dev/null || { echo "❌ Database failed"; exit 1; }
echo "   ✅ Database accessible"

# Critical code
echo "4. Critical code..."
cd apps/mobile
grep -q "setTimeout.*5000" src/stores/authStore.ts || { echo "❌ Timeout code missing"; exit 1; }
grep -q "Promise.race" src/stores/authStore.ts || { echo "❌ Promise.race missing"; exit 1; }
grep -q "setIsHydrated" src/navigation/RootNavigator.tsx || { echo "❌ Hydration code missing"; exit 1; }
echo "   ✅ Critical code present"

# Build version
echo "5. Build version..."
test -f src/version.ts || { echo "❌ Version file missing"; exit 1; }
BUILD_DATE=$(grep "timestamp:" src/version.ts | cut -d"'" -f2 | cut -d"-" -f1)
TODAY=$(date -u +"%Y%m%d")
if [ "$BUILD_DATE" != "$TODAY" ]; then
  echo "   ⚠️  WARNING: Build date ($BUILD_DATE) is not today ($TODAY)"
else
  echo "   ✅ Build version current"
fi

echo ""
echo "✅ All pre-deployment checks passed"
echo "Safe to proceed with deployment"
```

---

## Copy-Paste Test Scenarios

### Scenario 1: Test Backend Down (Critical)

```bash
# Stop backend
cd /Users/devarisbrown/Code/projects/gtsd/apps/api
# Press Ctrl+C in API terminal

# Verify backend is down
curl http://localhost:3000/healthz
# Expected: Connection refused

# Test app behavior:
# 1. Delete app from simulator
# 2. Reinstall and launch
# 3. Should see Welcome screen within 5-6 seconds
# 4. Check logs for timeout message
```

### Scenario 2: Test Signup Flow

```bash
# Ensure backend is running
curl -s http://localhost:3000/healthz | jq .status
# Expected: "healthy"

# Test signup via API
curl -X POST http://localhost:3000/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "email": "qa-test-'$(date +%s)'@example.com",
    "password": "TestPass123!",
    "firstName": "QA",
    "lastName": "Test"
  }' | jq

# Expected: 201 status, user object with tokens

# Verify in database
docker exec -it gtsd-postgres psql -U gtsd -d gtsd -c \
  "SELECT id, email, created_at FROM users ORDER BY created_at DESC LIMIT 1;"
```

### Scenario 3: Test Login Flow

```bash
# Create user first (from Scenario 2)
EMAIL="qa-test@example.com"
PASSWORD="TestPass123!"

# Test login
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d "{
    \"email\": \"$EMAIL\",
    \"password\": \"$PASSWORD\"
  }" | jq

# Expected: 200 status, user object with tokens

# Test with wrong password
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d "{
    \"email\": \"$EMAIL\",
    \"password\": \"WrongPassword123!\"
  }" | jq

# Expected: 401 status, error message
```

### Scenario 4: Test Token Validation

```bash
# Login and get token
TOKEN=$(curl -s -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"qa-test@example.com","password":"TestPass123!"}' | \
  jq -r '.data.tokens.accessToken')

echo "Token: $TOKEN"

# Test /auth/me with valid token
curl -s http://localhost:3000/auth/me \
  -H "Authorization: Bearer $TOKEN" | jq

# Expected: 200 status, user profile

# Test without token
curl -s http://localhost:3000/auth/me | jq

# Expected: 401 status

# Test with invalid token
curl -s http://localhost:3000/auth/me \
  -H "Authorization: Bearer invalid.token.here" | jq

# Expected: 401 status
```

---

## Troubleshooting Commands

### Port Already in Use

```bash
# Find process on port 3000 (API)
lsof -ti:3000

# Kill process on port 3000
lsof -ti:3000 | xargs kill -9

# Find process on port 8081 (Metro)
lsof -ti:8081

# Kill process on port 8081
lsof -ti:8081 | xargs kill -9
```

### Docker Issues

```bash
# Check Docker containers
docker ps

# Restart all containers
docker-compose restart

# Stop all containers
docker-compose down

# Start containers fresh
docker-compose up -d

# View container logs
docker logs gtsd-postgres
docker logs gtsd-redis
docker logs gtsd-minio
```

### iOS Simulator Issues

```bash
# List available simulators
xcrun simctl list devices

# Boot specific simulator
xcrun simctl boot "iPhone 15 Pro"

# Erase simulator (fresh install)
xcrun simctl erase "iPhone 15 Pro"

# Uninstall app from simulator
xcrun simctl uninstall booted com.gtsd.mobile
```

---

## Quick Reference Card

**Most Common Commands:**

```bash
# Start backend
cd apps/api && pnpm dev

# Start mobile
cd apps/mobile && pnpm ios

# Health check
curl http://localhost:3000/healthz

# Clear caches
rm -rf $TMPDIR/metro-* && watchman watch-del-all

# Database query
docker exec -it gtsd-postgres psql -U gtsd -d gtsd -c "SELECT COUNT(*) FROM users;"

# Check critical code
grep -n "setTimeout.*5000" apps/mobile/src/stores/authStore.ts
```

**Emergency Reset:**

```bash
# Nuclear option - reset everything
docker-compose down
rm -rf apps/mobile/ios/build
rm -rf apps/mobile/ios/Pods
rm -rf ~/Library/Developer/Xcode/DerivedData/mobile-*
docker-compose up -d
cd apps/mobile/ios && pod install && cd ../..
```

---

## Verification Checklist

Use this checklist before claiming "fixes are deployed":

- [ ] Backend health check passes
- [ ] Auth endpoints return expected responses
- [ ] Database queries return expected data
- [ ] Critical code present in source files
- [ ] Build version is current (today)
- [ ] Metro bundle contains critical code
- [ ] App displays current build version
- [ ] Verification logs appear with current timestamp
- [ ] Expected behavior observed (e.g., 5s timeout)
- [ ] No crashes or errors

**All items must be checked before deployment is considered verified.**
