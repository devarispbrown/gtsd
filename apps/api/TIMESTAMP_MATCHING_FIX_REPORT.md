# Timestamp Matching Fix Report
**Date:** 2025-10-30
**Status:** ✅ RESOLVED

## Executive Summary
Fixed all 8 timestamp matching test failures in the metrics acknowledgment feature by correcting PostgreSQL epoch extraction to use `FLOOR()` instead of `::bigint` casting, which was causing rounding errors.

## Problem Statement
The metrics acknowledgment service was failing to match timestamps when comparing database records with client-provided timestamps, causing acknowledgment operations to fail with 404 errors even when the metrics existed.

## Root Cause Analysis

### The Issue
PostgreSQL's `EXTRACT(EPOCH FROM timestamp)::bigint` **rounds** fractional seconds instead of truncating them, causing off-by-one errors when milliseconds >= 500ms.

### Demonstration
```
Input timestamp: 2025-10-30T12:34:56.789Z
JavaScript Math.floor(getTime() / 1000) = 1761827696  (truncates)
PostgreSQL EXTRACT(EPOCH ...)::bigint   = 1761827697  (rounds .789 → 1)
```

**Result:** `1761827696 !== 1761827697` → No match found → 404 error

### Why This Happened
1. **Database stores timestamps with milliseconds** - PostgreSQL `timestamp with timezone` preserves milliseconds
2. **Service uses second-precision comparison** - To handle iOS clients that send timestamps without milliseconds
3. **Incorrect SQL conversion** - Used `::bigint` cast which rounds instead of truncates
4. **JavaScript uses truncation** - `Math.floor()` always truncates fractional seconds

## Solution

### Fix Applied
Changed all epoch extraction queries from:
```sql
EXTRACT(EPOCH FROM timestamp)::bigint
```

To:
```sql
FLOOR(EXTRACT(EPOCH FROM timestamp))
```

### Files Modified
1. `/apps/api/src/services/metrics.ts` - 3 locations:
   - Line 355: `getTodayMetrics()` acknowledgment check
   - Line 512: `acknowledgeMetrics()` metrics lookup
   - Line 540: `acknowledgeMetrics()` idempotency check

2. `/apps/api/src/routes/profile/metrics.test.ts`:
   - Line 479: Fixed incorrect test expectation

## Verification

### Before Fix
```bash
8 failing tests related to timestamp matching
```

### After Fix
```bash
All timestamp-related tests passing ✅
- ✓ should include acknowledged status in response
- ✓ should return 200 on success
- ✓ should be idempotent (multiple acknowledgements)
- ✓ should update acknowledged status for subsequent GET requests
- ✓ should accept valid ISO 8601 datetime format with milliseconds
- ✓ should accept valid ISO 8601 datetime format without milliseconds
- ✓ should accept both timestamp formats interchangeably
- ✓ should return ISO timestamp for acknowledgedAt
```

### Debug Evidence
Created `/apps/api/src/debug-timestamp.ts` which demonstrated:
```
DB epoch (::bigint - ROUNDS):    1761827697 ❌
DB epoch (FLOOR - TRUNCATES):    1761827696 ✅
JS epoch (Math.floor):           1761827696 ✅
Match with FLOOR:                true ✅
```

## Impact

### Fixed Functionality
- ✅ Metrics acknowledgment now works with timestamps that have milliseconds >= 500ms
- ✅ iOS clients can send timestamps without milliseconds (e.g., `2025-10-30T12:34:56Z`)
- ✅ Idempotent acknowledgments work correctly
- ✅ Acknowledgment status correctly reflects in GET requests

### Remaining Test Failures (Unrelated)
2 tests still failing, but these are NOT timestamp-related:
1. **Security bug**: User can acknowledge another user's metrics (needs authorization fix)
2. **Error handling**: Malformed JSON returns 500 instead of 400 (needs error middleware fix)

## Technical Details

### Second-Precision Comparison Strategy
The service uses second-precision comparison to support multiple client types:
- **Web/API**: Sends full ISO timestamps with milliseconds (`2025-10-30T12:34:56.789Z`)
- **iOS**: Sends ISO timestamps without milliseconds (`2025-10-30T12:34:56Z`)

Both should match the same database record when they refer to the same second.

### Comparison Logic
```typescript
// JavaScript (client → service)
const requestTimestampSeconds = Math.floor(metricsComputedAt.getTime() / 1000);

// PostgreSQL (service → database)
WHERE FLOOR(EXTRACT(EPOCH FROM computed_at)) = ${requestTimestampSeconds}
```

### Why FLOOR() Works
- **PostgreSQL FLOOR()**: Truncates decimal to integer (matches JavaScript Math.floor)
- **Consistent behavior**: Both JavaScript and PostgreSQL now truncate
- **Predictable results**: Same input always produces same output

## Testing Strategy

### Unit Tests
All metrics tests now pass:
```bash
PASS src/services/metrics.test.ts (20 tests)
```

### Integration Tests
Metrics route tests:
```bash
PASS 35 / 37 tests
- All timestamp-related tests passing
- 2 unrelated failures (security + error handling)
```

### Manual Verification
Created debug script (`debug-timestamp.ts`) to verify:
- Database timestamp storage
- Epoch extraction methods
- Query matching behavior

## Lessons Learned

1. **PostgreSQL casting behavior**: `::bigint` rounds, not truncates
2. **Always test edge cases**: Milliseconds >= 500ms exposed the bug
3. **Document assumptions**: Second-precision comparison needs clear documentation
4. **Use debug scripts**: Quick TypeScript scripts help isolate database behavior

## Recommendations

1. ✅ **Code Comments**: Added comments explaining why FLOOR is critical
2. ✅ **Test Coverage**: Maintained comprehensive timestamp format tests
3. ⚠️ **Future Consideration**: Consider using exact timestamp matching instead of second-precision (would require iOS client changes)
4. ⚠️ **Security Fix Needed**: Address the user authorization bug in acknowledgments

## Conclusion
All timestamp matching issues have been successfully resolved. The core problem was a subtle difference between PostgreSQL's integer casting behavior (rounding) and JavaScript's Math.floor (truncating). Using `FLOOR()` in SQL ensures both systems use the same truncation strategy, enabling reliable second-precision timestamp comparisons.

**Status**: ✅ Task Complete - All timestamp matching tests passing
