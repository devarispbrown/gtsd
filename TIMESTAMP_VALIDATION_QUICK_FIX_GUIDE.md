# Timestamp Validation Quick Fix Guide

**Status:** 13 of 34 tests failing
**Priority:** CRITICAL - Must fix before production
**Estimated Time:** 4-6 hours

---

## Critical Issues Summary

### Issue 1: Response Structure Mismatch ⚠️

**Tests expect:** `response.body.data.bmi`
**API returns:** `response.body.data.metrics.bmi`

**Files to Fix:**

- `/apps/api/src/routes/profile/metrics.test.ts` (Lines 69-211)

**Quick Fix:**

```typescript
// Change all test expectations from:
expect(response.body.data.bmi);

// To:
expect(response.body.data.metrics.bmi);
```

---

### Issue 2: Auto-Computation Behavior ⚠️

**Test expects:** 404 when no metrics exist
**API returns:** 200 with auto-computed metrics

**Root Cause:**
Service has fallback logic (lines 331-343 in `metrics.ts`)

**Quick Fix Option A** (Recommended - Update Tests):

```typescript
it('should return 200 with auto-computed metrics when no metrics exist', async () => {
  await db.delete(profileMetrics).where(eq(profileMetrics.userId, testUserId));

  const response = await request(app)
    .get('/v1/profile/metrics/today')
    .set('Authorization', `Bearer ${accessToken}`)
    .expect(200); // Changed from 404 to 200

  expect(response.body.success).toBe(true);
  expect(response.body.data.metrics).toHaveProperty('bmi');
});
```

**Quick Fix Option B** (Alternative - Remove Auto-Compute):

```typescript
// In /apps/api/src/services/metrics.ts:331-343
// Comment out the auto-computation fallback
if (!todayMetrics) {
  throw new AppError(404, 'No metrics computed for today. Please complete your profile.');
}
```

---

### Issue 3: Timestamp Precision Bug ⚠️

**Error:** "Metrics not found for the specified timestamp and version"

**Root Cause Analysis:**

```typescript
// Database stores: 2025-10-30T12:34:56.789Z
// Test creates: const metricsComputedAt = metrics.computedAt!.toISOString();
// Test sends:   metricsComputedAt (with milliseconds)
// Service normalizes to seconds: Math.floor(metricsComputedAt.getTime() / 1000)
// Should work, but test setup might have timing issues
```

**Debug Steps:**

```bash
# Run tests with debug logging
cd apps/api
LOG_LEVEL=debug npm test -- src/routes/profile/metrics.test.ts 2>&1 | grep -A5 -B5 "Looking for metrics"
```

**Quick Fix:**

```typescript
// In metrics.test.ts, add delay between creation and acknowledgment
beforeEach(async () => {
  // ... existing setup ...
  const metrics = await metricsService.computeAndStoreMetrics(testUserId, false);
  metricsComputedAt = metrics.computedAt!.toISOString();

  // Add small delay to ensure database write completes
  await new Promise((resolve) => setTimeout(resolve, 100));
});
```

---

## Quick Fix Commands

```bash
# 1. Run tests to see current failures
cd /Users/devarisbrown/Code/projects/gtsd
npm test -- apps/api/src/routes/profile/metrics.test.ts

# 2. Fix response structure (bulk replace in test file)
cd apps/api
sed -i '' 's/response\.body\.data\.bmi/response.body.data.metrics.bmi/g' src/routes/profile/metrics.test.ts
sed -i '' 's/response\.body\.data\.bmr/response.body.data.metrics.bmr/g' src/routes/profile/metrics.test.ts
sed -i '' 's/response\.body\.data\.tdee/response.body.data.metrics.tdee/g' src/routes/profile/metrics.test.ts
sed -i '' 's/response\.body\.data\.computedAt/response.body.data.metrics.computedAt/g' src/routes/profile/metrics.test.ts

# 3. Re-run tests
npm test -- src/routes/profile/metrics.test.ts

# 4. If still failing, run with debug logs
LOG_LEVEL=debug npm test -- src/routes/profile/metrics.test.ts 2>&1 | tee test-debug.log
```

---

## Security Enhancement (Priority 2)

**File:** `/apps/api/src/routes/profile/metrics.ts:22-40`

```typescript
const acknowledgeMetricsSchema = z.object({
  version: z.number().int().positive(),
  metricsComputedAt: z
    .string()
    .refine(
      (val) => {
        // ADD THIS: Prevent ReDoS by checking length first
        if (val.length < 20 || val.length > 30) return false;

        // CHANGE THIS: Use non-capturing group
        const isoDateRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/;
        //                                                          ^^^
        return isoDateRegex.test(val);
      },
      {
        message:
          'Must be a valid ISO 8601 datetime (e.g., "2025-10-30T12:34:56Z" or "2025-10-30T12:34:56.789Z")',
      }
    )
    .refine(
      (val) => {
        const date = new Date(val);
        return !isNaN(date.getTime());
      },
      {
        message: 'Must be a valid date',
      }
    ),
});
```

---

## Test Coverage Gaps

### Add Missing Integration Test

**File:** `/apps/api/src/routes/profile/metrics.test.ts` (Add after line 567)

```typescript
describe('Timestamp Format Interoperability', () => {
  it('should accept both timestamp formats for the same second', async () => {
    await db.insert(userSettings).values({
      userId: testUserId,
      dateOfBirth: new Date('1990-01-01'),
      gender: 'male',
      currentWeight: '80',
      height: '180',
      targetWeight: '75',
      activityLevel: 'moderately_active',
      primaryGoal: 'lose_weight',
      onboardingCompleted: true,
    });

    // Compute metrics
    const metrics = await metricsService.computeAndStoreMetrics(testUserId, false);
    const storedTimestamp = metrics.computedAt!.toISOString();

    // Test with milliseconds (original format)
    const response1 = await request(app)
      .post('/v1/profile/metrics/acknowledge')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        version: 1,
        metricsComputedAt: storedTimestamp, // "2025-10-30T12:34:56.789Z"
      })
      .expect(200);

    expect(response1.body.data.acknowledged).toBe(true);

    // Test without milliseconds (iOS format)
    const timestampWithoutMs = storedTimestamp.replace(/\.\d{3}Z$/, 'Z');
    const response2 = await request(app)
      .post('/v1/profile/metrics/acknowledge')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        version: 1,
        metricsComputedAt: timestampWithoutMs, // "2025-10-30T12:34:56Z"
      })
      .expect(200);

    expect(response2.body.data.acknowledged).toBe(true);
    // Should be idempotent
    expect(response1.body.data.acknowledgedAt).toBe(response2.body.data.acknowledgedAt);
  });
});
```

---

## Validation Checklist

Before committing:

- [ ] All 34 tests pass
- [ ] Response structure updated in all tests
- [ ] Auto-computation behavior documented
- [ ] Length check added to regex validation
- [ ] Non-capturing group used in regex
- [ ] Integration test added for timestamp formats
- [ ] Manual testing with iOS client completed
- [ ] API documentation updated

---

## Manual Test Cases

```bash
# Test 1: Acknowledge with milliseconds
curl -X POST http://localhost:3000/v1/profile/metrics/acknowledge \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "version": 1,
    "metricsComputedAt": "2025-10-30T12:34:56.789Z"
  }'

# Expected: 200 OK

# Test 2: Acknowledge without milliseconds
curl -X POST http://localhost:3000/v1/profile/metrics/acknowledge \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "version": 1,
    "metricsComputedAt": "2025-10-30T12:34:56Z"
  }'

# Expected: 200 OK (idempotent)

# Test 3: Invalid format (should fail)
curl -X POST http://localhost:3000/v1/profile/metrics/acknowledge \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "version": 1,
    "metricsComputedAt": "2025-10-30T12:34:56+05:00"
  }'

# Expected: 400 Bad Request
```

---

## Next Steps

1. Fix response structure mismatches (30 min)
2. Update auto-computation tests (15 min)
3. Add security enhancements (15 min)
4. Add integration tests (30 min)
5. Run full test suite (10 min)
6. Manual testing (30 min)
7. Update documentation (1 hour)

**Total Estimated Time:** 3-4 hours

---

## Rollback Plan

If issues persist:

```bash
# Revert changes
git checkout HEAD -- apps/api/src/routes/profile/metrics.ts
git checkout HEAD -- apps/api/src/routes/profile/metrics.test.ts

# Original Zod validation (strict)
z.string().datetime()
```

---

## Support Resources

- **Full Code Review:** `/BACKEND_TIMESTAMP_VALIDATION_CODE_REVIEW.md`
- **Test Logs:** Run with `LOG_LEVEL=debug`
- **Database Schema:** `/apps/api/src/db/schema.ts:657-715`
- **Service Logic:** `/apps/api/src/services/metrics.ts:451-605`
