# MetricsViewModel Fix - Action Items

**Status**: ⚠️ Approved with Required Changes
**File**: `/Users/devarisbrown/Code/projects/gtsd/apps/GTSD/GTSD/Features/Plans/MetricsViewModel.swift`
**Deadline**: Before production deployment

---

## Critical Issues (MUST FIX)

### 1. Add Consistent 400 Handling in acknowledgeMetrics()

**Location**: Lines 128-138
**Current**: 400 errors fall into generic `else` case
**Fix**: Add explicit 400 handling

```swift
case .httpError(let statusCode, let message):
    Logger.error("HTTP Error \(statusCode): \(message ?? "Unknown error")")
    if statusCode == 401 || statusCode == 403 {
        metricsError = "Your session has expired. Please log in again."
        needsAcknowledgment = false
        // TODO: Trigger logout flow
    } else if statusCode == 404 {
        metricsError = "Metrics have been updated. Please refresh and try again."
        metricsSummary = nil
        needsAcknowledgment = false
    } else if statusCode == 400 {
        // NEW: Explicit 400 handling for validation errors
        metricsError = message ?? "Unable to acknowledge metrics. Please verify your data and try again."
        // Keep needsAcknowledgment = true to allow retry
    } else if statusCode >= 500 {
        metricsError = "Server error. Please try again in a few moments."
    } else {
        metricsError = message ?? "An error occurred. Please try again."
    }
```

### 2. Fix Misleading Error Message in fetchHealthMetrics()

**Location**: Line 69
**Current**: `"Failed to acknowledge metrics. Please try again."`
**Fix**: Use context-appropriate message

```swift
} else if statusCode == 400 {
    // 400 is a validation error - show error but allow retry
    Logger.error("HTTP Error 400 during metrics fetch: \(message ?? "Unknown error")")
    metricsError = message ?? "Unable to load metrics. Please try again."
    // Don't set needsAcknowledgment = false - preserve state to allow retry
}
```

### 3. Add Authentication Error Handling

**Location**: Lines 58-73 in fetchHealthMetrics()
**Fix**: Add 401/403 handling BEFORE 404 check

```swift
case .httpError(let statusCode, let message):
    if statusCode == 401 || statusCode == 403 {
        // NEW: Authentication/authorization error
        Logger.error("Authentication error during metrics fetch: \(statusCode)")
        metricsError = "Your session has expired. Please log in again."
        needsAcknowledgment = false
        // TODO: Trigger logout flow via NotificationCenter or delegate
    } else if statusCode == 404 {
        // ... existing 404 handling
    } else if statusCode == 400 {
        // ... existing 400 handling
    } else {
        metricsError = message ?? "Failed to load metrics. Please try again."
    }
```

### 4. Create Comprehensive Unit Tests

**New File**: `GTSDTests/ViewModels/MetricsViewModelTests.swift`

**Required Tests**:

```swift
@MainActor
final class MetricsViewModelTests: XCTestCase {

    // MUST HAVE: Test 404 vs 400 distinction
    func testFetchMetrics_404Error_HidesAcknowledgmentUI() async {
        // Verify needsAcknowledgment = false on 404
    }

    func testFetchMetrics_400Error_PreservesAcknowledgmentUI() async {
        // Verify needsAcknowledgment stays true on 400
    }

    func testAcknowledgeMetrics_404Error_ClearsState() async {
        // Verify state cleared on 404 during acknowledgment
    }

    func testAcknowledgeMetrics_400Error_PreservesState() async {
        // Verify state preserved on 400 during acknowledgment
    }

    // Authentication tests
    func testFetchMetrics_401Error_TriggersLogout() async {
        // Verify 401 clears state and triggers logout
    }

    func testAcknowledgeMetrics_401Error_TriggersLogout() async {
        // Verify 401 during acknowledgment triggers logout
    }

    // Error message tests
    func testFetchMetrics_400Error_ShowsCorrectMessage() async {
        // Verify error message doesn't say "Failed to acknowledge"
    }
}
```

---

## High Priority Issues (SHOULD FIX)

### 5. Add Network Error Differentiation

**Location**: Lines 74-75
**Current**: Generic "Network error" message
**Fix**: Differentiate timeout vs no connection

```swift
case .networkError(let error):
    let nsError = error as NSError
    if nsError.code == NSURLErrorTimedOut {
        metricsError = "Request timed out. The server may be slow. Please try again."
    } else if nsError.code == NSURLErrorNotConnectedToInternet {
        metricsError = "No internet connection. Please check your network and try again."
    } else {
        metricsError = "Network error: \(error.localizedDescription)"
    }
```

### 6. Add Acknowledgment Retry Limiting

**Location**: New properties and logic in acknowledgeMetrics()
**Fix**: Prevent infinite loops

```swift
// Add to class properties (line 22)
@Published private(set) var acknowledgmentRetryCount: Int = 0
private let maxAcknowledgmentRetries = 3

// In acknowledgeMetrics() method (after guard, ~line 95)
acknowledgmentRetryCount += 1

if acknowledgmentRetryCount > maxAcknowledgmentRetries {
    Logger.error("Max acknowledgment retries exceeded")
    metricsError = "Unable to acknowledge metrics after multiple attempts. Please contact support."
    acknowledgmentRetryCount = 0
    isAcknowledgingMetrics = false
    return
}

// On success (after line 122)
acknowledgmentRetryCount = 0  // Reset counter
```

### 7. Extract Shared Error Handling Logic

**New Methods**: Add to class

```swift
private func handleHTTPError(
    statusCode: Int,
    message: String?,
    context: MetricsOperationContext
) {
    Logger.error("HTTP Error \(statusCode) during \(context): \(message ?? "Unknown")")

    if statusCode == 401 || statusCode == 403 {
        metricsError = "Your session has expired. Please log in again."
        needsAcknowledgment = false
        // TODO: Trigger logout
    } else if statusCode == 404 {
        if context == .fetch {
            metricsError = "Your health metrics are being calculated. Please check back in a few moments."
        } else {
            metricsError = "Metrics have been updated. Please refresh and try again."
            metricsSummary = nil
        }
        needsAcknowledgment = false
    } else if statusCode == 400 {
        if context == .fetch {
            metricsError = message ?? "Unable to load metrics. Please try again."
        } else {
            metricsError = message ?? "Unable to acknowledge metrics. Please verify your data and try again."
        }
        // Preserve needsAcknowledgment state
    } else if statusCode >= 500 {
        metricsError = "Server error. Please try again in a few moments."
    } else {
        metricsError = message ?? "An error occurred. Please try again."
    }
}

enum MetricsOperationContext {
    case fetch
    case acknowledge
}
```

---

## Implementation Checklist

### Phase 1: Critical Fixes (Required for Production)

- [ ] Add explicit 400 handling in `acknowledgeMetrics()` method
- [ ] Fix error message in `fetchHealthMetrics()` line 69
- [ ] Add 401/403 authentication error handling in both methods
- [ ] Create test file `MetricsViewModelTests.swift`
- [ ] Write test: `testFetchMetrics_404Error_HidesAcknowledgmentUI`
- [ ] Write test: `testFetchMetrics_400Error_PreservesAcknowledgmentUI`
- [ ] Write test: `testAcknowledgeMetrics_404Error_ClearsState`
- [ ] Write test: `testAcknowledgeMetrics_400Error_PreservesState`
- [ ] Write test: `testFetchMetrics_401Error_TriggersLogout`
- [ ] Write test: `testFetchMetrics_400Error_ShowsCorrectMessage`
- [ ] All tests passing

### Phase 2: High Priority Improvements (Before Production)

- [ ] Add network error type differentiation (timeout, no connection)
- [ ] Implement acknowledgment retry limiting
- [ ] Extract shared error handling logic into helper methods
- [ ] Add integration tests for full acknowledgment flow
- [ ] Add test: `testFullAcknowledgmentFlow_MetricsUpdatedDuringAcknowledgment`

### Phase 3: Documentation & Monitoring (Before Production)

- [ ] Add docstring to `checkMetricsAcknowledgment()` explaining state behavior
- [ ] Update `METRICS_ACKNOWLEDGMENT_IMPLEMENTATION_SUMMARY.md`
- [ ] Add analytics tracking for error frequencies
- [ ] Add Sentry/error tracking for 5xx errors
- [ ] Document error code reference in project docs

---

## Testing Scenarios

### Manual Testing Required

1. **404 During Fetch (Metrics Not Yet Computed)**
   - Action: Launch app, go to Plans tab
   - Expected: See "Your health metrics are being calculated" message
   - Expected: Acknowledgment UI does NOT appear
   - Expected: needsAcknowledgment = false

2. **400 During Fetch (Validation Error)**
   - Action: Mock 400 error from API
   - Expected: See error message WITHOUT "acknowledge" in text
   - Expected: Acknowledgment UI STAYS visible (if was already visible)
   - Expected: needsAcknowledgment state PRESERVED

3. **404 During Acknowledgment (Metrics Updated)**
   - Action: Start acknowledgment, trigger metrics regeneration
   - Expected: See "Metrics have been updated. Please refresh" message
   - Expected: Metrics data cleared
   - Expected: needsAcknowledgment = false

4. **400 During Acknowledgment (Validation Error)**
   - Action: Send invalid acknowledgment request
   - Expected: See error message from backend
   - Expected: Acknowledgment UI STAYS visible
   - Expected: User can retry

5. **401 During Any Operation (Token Expired)**
   - Action: Invalidate auth token, perform any metrics operation
   - Expected: See "Your session has expired" message
   - Expected: Automatic logout triggered
   - Expected: Redirect to login screen

6. **Network Timeout**
   - Action: Simulate slow network (Charles Proxy)
   - Expected: See "Request timed out. The server may be slow" message
   - Expected: Can retry

7. **No Internet Connection**
   - Action: Turn off WiFi and cellular
   - Expected: See "No internet connection" message
   - Expected: Can retry when connection restored

---

## Code Review Checklist

Before submitting PR:

- [ ] All Phase 1 items complete
- [ ] All Phase 2 items complete (recommended)
- [ ] All unit tests passing
- [ ] Manual testing scenarios validated
- [ ] Code follows Swift API Design Guidelines
- [ ] No new compiler warnings
- [ ] Logging added for all error paths
- [ ] Error messages are user-friendly
- [ ] State transitions documented in comments
- [ ] No security vulnerabilities introduced

---

## Estimated Effort

**Phase 1 (Critical)**: 4-6 hours

- Code changes: 2 hours
- Unit tests: 2-3 hours
- Manual testing: 1 hour

**Phase 2 (High Priority)**: 3-4 hours

- Retry limiting: 1 hour
- Network error differentiation: 1 hour
- Refactor error handling: 1-2 hours

**Phase 3 (Documentation)**: 1-2 hours

**Total**: 8-12 hours

---

## Questions to Resolve

1. **Logout Flow**: How should we trigger logout on 401/403?
   - NotificationCenter?
   - Delegate pattern?
   - Directly call AuthenticationService?

2. **Error Tracking**: Do we have Sentry or similar set up?
   - Need to log 5xx errors for monitoring

3. **Retry Strategy**: Should 400 errors be retryable?
   - Current: Yes (state preserved)
   - Alternative: Treat as permanent failure

4. **Metrics Regeneration Frequency**: How often do metrics regenerate?
   - Affects whether retry limiting is needed

---

## Success Criteria

### Definition of Done

1. ✅ 404 errors hide acknowledgment UI with "being calculated" message
2. ✅ 400 errors preserve acknowledgment UI with clear error message
3. ✅ Error messages are context-appropriate (no "Failed to acknowledge" during fetch)
4. ✅ 401/403 errors trigger logout flow
5. ✅ All unit tests passing (>80% coverage on error paths)
6. ✅ Manual testing scenarios validated
7. ✅ No regression in existing functionality
8. ✅ Code review approved by senior developer
9. ✅ QA sign-off

### Production Metrics to Track

- 404 error rate (should be <5% of requests)
- 400 error rate (should be <1% of requests)
- Acknowledgment success rate (should be >95%)
- Average time to first metrics fetch
- Retry attempt distribution

---

**Document Version**: 1.0
**Last Updated**: 2025-10-30
**Owner**: Development Team
**Reviewers**: Senior Code Reviewer
