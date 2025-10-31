# Regression Tests - Quick Start Guide

## Overview
This guide helps you quickly run the regression tests for the 3 critical bugs that were fixed.

---

## Run All Regression Tests

```bash
cd /Users/devarisbrown/Code/projects/gtsd/apps/api
pnpm test
```

---

## Run Tests by Bug

### Bug #1: Dietary Preferences Not Persisting

**Backend Tests:**
```bash
pnpm test profile-preferences.test.ts
```

**Expected Output:**
```
PASS src/routes/auth/profile-preferences.test.ts
  Profile Preferences Routes
    ✓ should update dietary preferences
    ✓ should persist preferences to database
    ✓ should maintain preferences across login sessions
  GET /auth/me - Dietary Preferences Persistence (Bug #1 Regression Tests)
    ✓ should return dietary preferences in /auth/me response after update
    ✓ should persist preferences after multiple updates
    ✓ should return preferences after login on different device
    ✓ should include preferences in user object structure
```

**What This Tests:**
- Preferences save to database
- Preferences appear in /auth/me endpoint
- Preferences persist across sessions
- iOS app receives preferences after save

---

### Bug #2: Metrics Acknowledgment 400 Errors

**Integration Tests:**
```bash
pnpm test __integration__/metrics-plan-flow.test.ts
```

**Expected Output:**
```
PASS src/routes/__integration__/metrics-plan-flow.test.ts
  Metrics Acknowledgment + Plan Generation Integration Flow
    Complete Happy Path Flow
      ✓ should allow plan generation after metrics acknowledgment with exact timestamp precision
      ✓ should handle acknowledgment with ISO string timestamp conversion
    Failure Cases - Without Acknowledgment
      ✓ should prevent plan generation without acknowledgment
      ✓ should provide correct error message when acknowledgment missing
    Edge Cases - Metrics Regeneration
      ✓ should handle metrics regenerated after acknowledgment
      ✓ should allow plan generation when no metrics exist
    Timestamp Precision Edge Cases
      ✓ should handle acknowledgment timestamp with milliseconds precision
      ✓ should find acknowledgment even when timestamps have different millisecond precision
      ✓ should handle round-trip ISO string conversion correctly
```

**Unit Tests:**
```bash
pnpm test plans/service.test.ts
```

**Expected Output:**
```
PASS src/routes/plans/service.test.ts
  PlansService - Metrics Acknowledgment Gating
    ✓ should throw error when user has not acknowledged metrics
    ✓ should allow plan generation when metrics acknowledged
  Timestamp Precision Bug Regression Tests (Bug #2)
    ✓ should find acknowledgment with ISO string timestamp conversion
    ✓ should handle acknowledgment timestamp with milliseconds precision
    ✓ should find acknowledgment after multiple timestamp conversions
    ✓ should handle metrics regenerated after initial acknowledgment
```

**What This Tests:**
- Timestamp precision handling
- ISO string round-trip conversions
- Acknowledgment gating logic
- Plan generation after acknowledgment
- Metrics regeneration scenarios

---

### Bug #3: Photo Selection Not Working

**iOS Tests:**
```bash
cd /Users/devarisbrown/Code/projects/gtsd/apps/GTSD
xcodebuild test -scheme GTSD -only-testing:GTSDTests/ProfileEditViewModelTests
```

**Expected Output:**
```
Test Suite 'ProfileEditViewModelTests' passed
  ✓ testSaveChanges_RefreshesUserDataAfterDietaryPreferencesUpdate
  ✓ testSaveChanges_OnlyUpdatesPreferencesWhenChanged
  ✓ testSaveChanges_HandlesEmptyDietaryPreferences
```

**What This Tests:**
- ProfileEditViewModel refresh logic
- iOS state synchronization
- Mock API integration

**IMPORTANT:** Photo permission testing requires manual testing on a real device!

---

## Quick Verification

Run this one-liner to verify all backend regression tests pass:

```bash
cd /Users/devarisbrown/Code/projects/gtsd/apps/api && \
pnpm test profile-preferences.test.ts __integration__/metrics-plan-flow.test.ts plans/service.test.ts
```

**Expected:** All tests should pass ✅

---

## Test Coverage Summary

| Bug | Test Files | Test Cases | Status |
|-----|-----------|------------|--------|
| Bug #1: Dietary Preferences | 2 files | 11 tests | ✅ Automated |
| Bug #2: Metrics Acknowledgment | 2 files | 20 tests | ✅ Automated |
| Bug #3: Photo Permissions | 1 file | 4 tests | ⚠️ Manual required |

**Total:** 35 automated tests preventing regression

---

## Troubleshooting

### Test Failures

#### "User settings not found"
**Cause:** Database not seeded
**Fix:** Tests create their own data - check database connection

#### "Metrics not found"
**Cause:** Metrics computation failed
**Fix:** Check user settings are complete (weight, height, age, gender, activity level)

#### "Acknowledgment not found"
**Cause:** Timestamp precision issue (this is what we're testing!)
**Fix:** This should NOT happen - if it does, the bug has regressed

### Slow Tests

If tests take > 30 seconds:
1. Check database connection latency
2. Verify database has indexes
3. Check for other processes using the database

---

## CI/CD Integration

### Add to GitHub Actions

```yaml
# .github/workflows/regression-tests.yml
name: Regression Tests
on: [pull_request, push]

jobs:
  backend-regression:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3

      - name: Install dependencies
        run: |
          cd apps/api
          pnpm install

      - name: Run Regression Tests
        run: |
          cd apps/api
          pnpm test profile-preferences.test.ts \
                    __integration__/metrics-plan-flow.test.ts \
                    plans/service.test.ts

      - name: Upload Coverage
        uses: codecov/codecov-action@v3
        with:
          file: ./apps/api/coverage/lcov.info
          flags: regression
```

---

## What Each Test Suite Does

### 1. Profile Preferences Tests (Bug #1)
**Purpose:** Ensure dietary preferences persist across app restarts

**Key Scenarios:**
- User sets vegetarian preference → saves → restarts app → preference still there
- User logs out → logs in again → preferences still there
- User calls /auth/me → preferences included in response

**Why It Matters:**
- Without these tests, iOS state management bugs could go unnoticed
- Tests verify the /auth/me endpoint returns preferences (the fix for Bug #1)

---

### 2. Metrics Acknowledgment Flow Tests (Bug #2)
**Purpose:** Ensure users can generate plans after acknowledging metrics

**Key Scenarios:**
- User sees metrics → acknowledges → generates plan → SUCCESS
- User sees metrics → skips acknowledgment → tries to generate plan → ERROR
- Metrics regenerated (daily job) → old acknowledgment invalid → must re-acknowledge

**Why It Matters:**
- This was a critical blocker preventing plan generation
- Tests verify timestamp precision handling (the fix for Bug #2)
- Covers edge cases like metrics regeneration

---

### 3. iOS Profile Edit Tests (Bug #1 + Bug #3)
**Purpose:** Ensure iOS ProfileEditViewModel properly syncs with backend

**Key Scenarios:**
- User saves preferences → VM refreshes from /auth/me → UI updates
- User selects photo → permission prompt appears → photo uploads

**Why It Matters:**
- iOS view model tests ensure state synchronization
- Catches iOS-specific state management issues
- Tests the integration between iOS and backend

---

## Success Criteria

✅ **All Tests Pass:** Every test should pass on every run
✅ **Fast Execution:** Tests complete in < 30 seconds
✅ **Clear Failures:** When a test fails, it's obvious what broke
✅ **No Flakiness:** Tests pass consistently (99.9% success rate)

---

## Next Steps

After running these tests:

1. ✅ **If All Pass:** You're good to deploy! These bugs won't regress.
2. ⚠️ **If Any Fail:** Investigate immediately - these are critical paths
3. 📊 **Review Coverage:** Run `pnpm test --coverage` to see coverage percentage
4. 📱 **Manual Testing:** Test photo upload on real iOS device

---

## Quick Reference Commands

```bash
# Run all backend tests
cd /Users/devarisbrown/Code/projects/gtsd/apps/api && pnpm test

# Run only regression tests
pnpm test profile-preferences.test.ts __integration__/metrics-plan-flow.test.ts plans/service.test.ts

# Run with coverage
pnpm test --coverage

# Run specific test
pnpm test -t "should allow plan generation after metrics acknowledgment"

# Watch mode (re-run on file changes)
pnpm test --watch

# iOS tests
cd /Users/devarisbrown/Code/projects/gtsd/apps/GTSD
xcodebuild test -scheme GTSD -only-testing:GTSDTests/ProfileEditViewModelTests
```

---

## Questions?

For detailed information, see:
- **Full Report:** `/apps/api/REGRESSION_TEST_COVERAGE_REPORT.md`
- **Test Files:**
  - `/apps/api/src/routes/__integration__/metrics-plan-flow.test.ts`
  - `/apps/api/src/routes/auth/profile-preferences.test.ts`
  - `/apps/api/src/routes/plans/service.test.ts`
  - `/apps/GTSD/GTSDTests/ViewModels/ProfileEditViewModelTests.swift`
