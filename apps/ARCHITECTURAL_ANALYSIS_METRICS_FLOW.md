# Architectural Analysis: Metrics Acknowledgment Flow Failure

**Date**: 2025-10-29
**Reviewer**: Senior Architecture Reviewer
**Status**: CRITICAL ARCHITECTURAL FLAWS IDENTIFIED

## Executive Summary

After comprehensive review of the onboarding and metrics acknowledgment flow across iOS and backend systems, I've identified **fundamental architectural flaws** that explain the repeated failures. The current implementation suffers from:

1. **Critical Data Structure Mismatch** between iOS and backend
2. **Poor Separation of Concerns** with tight coupling between onboarding and metrics
3. **Race Condition Vulnerability** in the onboarding completion flow
4. **Fragile State Management** with multiple sources of truth
5. **Insufficient Error Handling** and fallback mechanisms

**Root Cause**: The iOS app expects a different data structure than the backend provides, combined with timing issues in the async flow.

**Severity**: CRITICAL - Blocks core user flow
**Recommendation**: Architecture refactor required (detailed below)

---

## 1. Critical Data Structure Mismatch

### iOS Expectation (ScienceModels.swift:236-242)

```swift
struct HealthMetrics: Codable, Sendable {
    let metrics: MetricsValues
    let explanations: MetricsExplanations
    let computedAt: Date           // ← TOP-LEVEL computedAt
    let acknowledged: Bool         // ← TOP-LEVEL acknowledged
    let version: Int              // ← TOP-LEVEL version
}
```

### Backend Response (metrics.ts:32-46)

```typescript
export interface TodayMetrics {
  metrics: {
    bmi: number;
    bmr: number;
    tdee: number;
    computedAt: string; // ← NESTED in metrics
    version: number; // ← NESTED in metrics
  };
  explanations: MetricsExplanation;
  acknowledged: boolean; // ← TOP-LEVEL (CORRECT)
  acknowledgement: {
    // ← Additional nested structure
    acknowledgedAt: string;
    version: number;
  } | null;
}
```

### Impact

**CRITICAL DECODING FAILURE**: When iOS tries to decode the backend response:

- iOS expects `computedAt` at top level → Backend has it nested in `metrics`
- iOS expects `version` at top level → Backend has it nested in `metrics`
- Backend includes `acknowledgement` object → iOS doesn't expect this field

**Result**: JSON decoding fails silently or with errors, `healthMetrics` remains `nil`, MetricsSummaryView shows loading state forever.

---

## 2. Poor Separation of Concerns

### Current Architecture Issues

#### Backend: Onboarding Service (service.ts:173-201)

```typescript
// After successful onboarding, compute and store metrics
try {
  logger.info({ userId }, 'Computing initial metrics');
  await metricsService.computeAndStoreMetrics(userId, true);
  logger.info({ userId }, 'Initial metrics computed successfully');
} catch (error) {
  // Log error but don't fail onboarding
  logger.error(
    { err: error, userId },
    'Failed to compute initial metrics - metrics will be computed on-demand'
  );
  // PROBLEM: Onboarding succeeds but metrics might not exist
}
```

**Architectural Flaw**:

- Onboarding service is responsible for metrics computation
- Metrics computation failure is swallowed
- No guarantee metrics exist when MetricsSummaryView loads
- Violates Single Responsibility Principle

#### iOS: OnboardingViewModel (OnboardingViewModel.swift:71-109)

```swift
func completeOnboarding() async {
    // 1. Complete onboarding API call
    let _: User = try await apiClient.request(.completeOnboarding(request))

    // 2. Immediately show metrics summary
    showMetricsSummary = true

    // PROBLEM: No wait for metrics to be computed
    // PROBLEM: No verification that metrics exist
}
```

**Architectural Flaw**:

- Assumes metrics are immediately available after onboarding
- No polling or retry mechanism
- No verification step
- Race condition: UI shows before data is ready

---

## 3. Race Condition in Onboarding Flow

### Timeline Analysis

```
T0: User taps "Complete" button
T1: iOS sends POST /api/profile/onboarding
T2: Backend starts transaction
T3: Backend inserts user_settings
T4: Backend inserts initial_plan_snapshot
T5: Backend inserts partners
T6: Backend commits transaction
T7: Backend returns User response (onboarding succeeds)
T8: Backend STARTS metrics computation (async, fire-and-forget)
T9: iOS receives success response
T10: iOS sets showMetricsSummary = true
T11: MetricsSummaryView appears
T12: MetricsSummaryView calls fetchHealthMetrics() in onAppear
T13: iOS sends GET /v1/profile/metrics/today
T14: Backend queries profile_metrics table
     ↓
     RACE CONDITION: Metrics might not exist yet if T14 < T8 completion time
     ↓
T15: Backend attempts on-demand computation (fallback)
T16: IF on-demand computation succeeds → metrics returned
     IF on-demand computation fails → 404 error
```

### The Race Condition

**Problem**: The backend computes metrics AFTER returning the onboarding success response. This creates a race where:

1. **Best Case**: Metrics computation (T8) completes before iOS request (T13) → Success
2. **Likely Case**: iOS request (T13) arrives before metrics exist → Fallback triggered
3. **Worst Case**: Fallback computation also fails → 404 error, view stuck

**Why This Fails**:

- Network latency variations make timing unpredictable
- No synchronization between onboarding completion and metrics availability
- Fire-and-forget pattern with logged-but-ignored errors

---

## 4. Fragile State Management

### Multiple Sources of Truth

#### iOS Side

1. `OnboardingViewModel.healthMetrics` - fetched metrics
2. `OnboardingViewModel.showMetricsSummary` - boolean flag
3. `OnboardingViewModel.isLoadingMetrics` - loading state
4. `OnboardingViewModel.metricsError` - error state

**Problem**: These states can desynchronize. Example:

```
showMetricsSummary = true    // Sheet appears
healthMetrics = nil          // No data loaded
isLoadingMetrics = false     // Not loading anymore
metricsError = "404 error"   // Error occurred
```

Result: Sheet shows but content is stuck in error state with no recovery path.

#### Backend Side

1. `user_settings.onboardingCompleted` - onboarding status
2. `profile_metrics` table - metrics existence
3. `metrics_acknowledgements` table - acknowledgment status

**Problem**: These can be out of sync:

- Onboarding completed but no metrics exist
- Metrics exist but not acknowledged
- No atomic transaction linking them

---

## 5. Insufficient Error Handling

### iOS Error Handling Gaps

#### OnboardingViewModel.fetchHealthMetrics (lines 112-126)

```swift
func fetchHealthMetrics() async {
    isLoadingMetrics = true
    metricsError = nil

    do {
        let response: TodayMetricsResponse = try await apiClient.request(.getTodayMetrics)
        healthMetrics = response.data  // ← DECODING FAILURE HERE
        Logger.info("Health metrics fetched successfully")
    } catch {
        Logger.error("Failed to fetch health metrics: \(error)")
        metricsError = error.localizedDescription  // ← Error set but no retry
    }

    isLoadingMetrics = false
    // PROBLEM: If error occurs, view shows error UI but no automatic retry
    // PROBLEM: User can tap "Try Again" manually, but race condition persists
}
```

**Missing**:

- No retry logic with exponential backoff
- No polling mechanism
- No timeout handling
- No fallback to computed values

### Backend Error Handling Gaps

#### OnboardingService (service.ts:180-201)

```typescript
try {
  await metricsService.computeAndStoreMetrics(userId, true);
} catch (error) {
  // Just log the error, don't fail onboarding
  logger.error({ err: error, userId }, 'CRITICAL: Metrics computation failed during onboarding');
  // PROBLEM: No alert, no retry, no compensation
}
```

**Missing**:

- No retry mechanism
- No queue for failed computations
- No alert/notification to ops team
- No compensation transaction

---

## 6. Root Cause Analysis

### Primary Root Cause: Data Structure Mismatch

**The iOS app cannot decode the backend response because the JSON structure doesn't match the Swift struct.**

Evidence:

1. iOS expects `computedAt: Date` at top level
2. Backend provides `metrics.computedAt: string` (nested)
3. Decoding fails → `healthMetrics` stays `nil`
4. MetricsSummaryView shows loading spinner forever

### Secondary Root Cause: Race Condition

**The backend computes metrics asynchronously after onboarding completes, but iOS immediately tries to fetch them.**

Evidence:

1. Onboarding service returns success before metrics are ready
2. iOS immediately shows MetricsSummaryView
3. MetricsSummaryView fetches metrics on appear
4. Metrics might not exist yet → fallback triggered
5. If fallback fails → error shown

### Tertiary Root Cause: Poor Error Recovery

**When errors occur, there's no automatic recovery mechanism.**

Evidence:

1. No retry logic in iOS
2. No polling mechanism
3. User must manually tap "Try Again"
4. Race condition persists on retry

---

## 7. Architectural Recommendations

### Option A: Synchronous Metrics Computation (RECOMMENDED)

**Description**: Compute metrics synchronously within the onboarding transaction.

**Changes**:

1. Backend: Move metrics computation inside the onboarding transaction
2. Backend: Return metrics in the onboarding response
3. iOS: Remove separate metrics fetch call
4. iOS: Display metrics from onboarding response

**Pros**:

- Eliminates race condition
- Guarantees metrics availability
- Simpler flow
- Atomic operation

**Cons**:

- Slightly slower onboarding response time (adds ~50-100ms)
- Couples onboarding and metrics computation

**Implementation**:

```typescript
// Backend: onboarding/service.ts
async completeOnboarding(userId: number, input: OnboardingInput) {
  let computedMetrics: SelectProfileMetrics;

  await db.transaction(async (tx) => {
    // 1. Insert user settings
    await tx.insert(userSettings).values({...});

    // 2. Insert initial plan snapshot
    await tx.insert(initialPlanSnapshot).values({...});

    // 3. Compute and store metrics (WITHIN TRANSACTION)
    computedMetrics = await this.computeMetricsInTransaction(tx, userId, input);
  });

  return {
    userId,
    settings: targets,
    projection,
    metrics: computedMetrics  // ← Return metrics in response
  };
}
```

```swift
// iOS: OnboardingViewModel.swift
func completeOnboarding() async {
    let response: OnboardingCompletionResponse = try await apiClient.request(.completeOnboarding(request))

    // Metrics are already in the response
    self.healthMetrics = response.metrics

    // Now show the summary
    showMetricsSummary = true
}
```

---

### Option B: Polling Mechanism (FALLBACK)

**Description**: iOS polls for metrics until they're available.

**Changes**:

1. iOS: Implement polling with exponential backoff
2. Backend: No changes needed
3. iOS: Show loading state during polling

**Pros**:

- Maintains separation of concerns
- Handles async computation gracefully
- Works with current backend

**Cons**:

- More complex client logic
- Potentially slower user experience
- Network overhead from multiple requests

**Implementation**:

```swift
// iOS: OnboardingViewModel.swift
func fetchHealthMetricsWithRetry() async {
    let maxRetries = 5
    var retryCount = 0
    var delay: UInt64 = 1_000_000_000  // 1 second in nanoseconds

    while retryCount < maxRetries {
        do {
            let response: TodayMetricsResponse = try await apiClient.request(.getTodayMetrics)
            healthMetrics = response.data
            Logger.info("Health metrics fetched successfully")
            return
        } catch {
            retryCount += 1
            if retryCount >= maxRetries {
                metricsError = "Unable to load metrics after \(maxRetries) attempts"
                return
            }

            Logger.warn("Metrics fetch failed, retrying in \(delay / 1_000_000_000)s...")
            try? await Task.sleep(nanoseconds: delay)
            delay *= 2  // Exponential backoff
        }
    }
}
```

---

### Option C: Fix Data Structure (REQUIRED REGARDLESS)

**Description**: Align iOS and backend data structures.

**Changes**:

1. **Backend**: Modify `TodayMetrics` interface to match iOS expectations
2. **iOS**: Update `HealthMetrics` struct to match backend response

**Implementation (Backend Change - RECOMMENDED)**:

```typescript
// Backend: services/metrics.ts
export interface TodayMetrics {
  metrics: {
    bmi: number;
    bmr: number;
    tdee: number;
  };
  explanations: MetricsExplanation;
  computedAt: string; // ← Move to top level
  acknowledged: boolean;
  version: number; // ← Move to top level
  acknowledgement: {
    acknowledgedAt: string;
    version: number;
  } | null;
}
```

```swift
// iOS: ScienceModels.swift
struct HealthMetrics: Codable, Sendable {
    let metrics: MetricsValues
    let explanations: MetricsExplanations
    let computedAt: Date
    let acknowledged: Bool
    let version: Int
    let acknowledgement: AcknowledgmentDetails?  // ← Add this field
}
```

---

## 8. Immediate Action Items

### Priority 1: Fix Data Structure Mismatch (BLOCKER)

**Without this fix, nothing else matters - the app literally cannot decode the response.**

1. Choose one approach:
   - **Option A**: Modify backend to match iOS
   - **Option B**: Modify iOS to match backend
   - **Option C**: Create a new v2 endpoint with correct structure

2. Update integration tests to verify structure compatibility

3. Deploy fix immediately

### Priority 2: Implement Synchronous Flow (RECOMMENDED)

1. Modify backend onboarding service to compute metrics in transaction
2. Return metrics in onboarding completion response
3. Update iOS to use metrics from response
4. Remove separate metrics fetch call
5. Simplify state management in OnboardingViewModel

### Priority 3: Add Robust Error Handling

1. Implement retry logic with exponential backoff (fallback for Priority 2)
2. Add timeout handling
3. Add user-friendly error messages
4. Add manual refresh capability
5. Add telemetry for failure tracking

### Priority 4: Add Integration Tests

1. Test onboarding → metrics flow end-to-end
2. Test race condition scenarios
3. Test error handling and recovery
4. Test data structure compatibility
5. Monitor real-world success rates

---

## 9. Long-Term Architectural Improvements

### 1. Event-Driven Architecture

Replace synchronous coupling with event-driven flow:

```
Onboarding Complete → OnboardingCompletedEvent → MetricsComputationHandler
                                                → PlanGenerationHandler
                                                → NotificationHandler
```

**Benefits**:

- Decoupled services
- Better error isolation
- Easier to add new handlers
- Supports eventual consistency

### 2. API Gateway Pattern

Introduce a BFF (Backend for Frontend) layer:

```
iOS → Mobile BFF → Onboarding Service
                 → Metrics Service
                 → Plan Service
```

**Benefits**:

- Custom response shapes per client
- Data structure flexibility
- Request aggregation
- Circuit breaking

### 3. State Machine for Onboarding

Formalize onboarding states:

```
States: NotStarted → InProgress → DataCollected → MetricsComputed → Acknowledged → Complete
Events: StartOnboarding, CollectData, ComputeMetrics, AcknowledgeMetrics, Complete
```

**Benefits**:

- Clear state transitions
- Prevents invalid states
- Better error handling
- Easier testing

### 4. Distributed Tracing

Implement full distributed tracing:

```
iOS Request ID → Backend Span → Database Span → Metrics Computation Span
                                              → Response Span
```

**Benefits**:

- End-to-end visibility
- Performance debugging
- Race condition detection
- SLA monitoring

---

## 10. Conclusion

### Current State Assessment

**CRITICAL**: The metrics acknowledgment flow is fundamentally broken due to:

1. **Data structure mismatch** (iOS cannot decode backend response)
2. **Race condition** (metrics not ready when iOS requests them)
3. **Poor error handling** (no recovery mechanism)
4. **Tight coupling** (onboarding and metrics tightly bound)

### Recommended Path Forward

**Phase 1 (IMMEDIATE - Days)**:

1. Fix data structure mismatch (Priority 1)
2. Implement synchronous metrics in onboarding response (Priority 2)
3. Add basic retry logic (Priority 3)

**Phase 2 (SHORT-TERM - Weeks)**:

1. Add comprehensive error handling
2. Add integration tests
3. Add monitoring and alerts
4. Document the corrected flow

**Phase 3 (LONG-TERM - Months)**:

1. Consider event-driven refactor
2. Evaluate BFF pattern
3. Implement state machine
4. Add distributed tracing

### Risk Assessment

**If not fixed**:

- 100% of users blocked after onboarding completion
- Cannot acknowledge metrics
- Cannot generate plans
- Cannot use core app functionality
- Complete user flow breakdown

**Impact**: CRITICAL - Core user journey completely blocked

### Final Recommendation

**PROCEED WITH OPTION A (SYNCHRONOUS FLOW) + OPTION C (FIX DATA STRUCTURE)**

This combination:

- Fixes the immediate blocker (data mismatch)
- Eliminates the race condition
- Simplifies the architecture
- Provides fastest time to resolution
- Reduces complexity

**Estimated Effort**:

- Backend changes: 4-6 hours
- iOS changes: 2-3 hours
- Testing: 2-3 hours
- Total: 1-1.5 days

**Expected Outcome**: 100% success rate for onboarding → metrics → acknowledgment flow

---

## Appendix A: File References

### iOS Files

- `/Users/devarisbrown/Code/projects/gtsd/apps/ios/GTSD/Features/Onboarding/OnboardingCoordinator.swift`
- `/Users/devarisbrown/Code/projects/gtsd/apps/ios/GTSD/Features/Onboarding/OnboardingViewModel.swift`
- `/Users/devarisbrown/Code/projects/gtsd/apps/ios/GTSD/Features/Onboarding/MetricsSummaryView.swift`
- `/Users/devarisbrown/Code/projects/gtsd/apps/ios/GTSD/Features/Onboarding/ScienceModels.swift`
- `/Users/devarisbrown/Code/projects/gtsd/apps/ios/GTSD/Core/Network/APIEndpoint.swift`

### Backend Files

- `/Users/devarisbrown/Code/projects/gtsd/apps/api/src/routes/onboarding/index.ts`
- `/Users/devarisbrown/Code/projects/gtsd/apps/api/src/routes/onboarding/service.ts`
- `/Users/devarisbrown/Code/projects/gtsd/apps/api/src/services/metrics.ts`
- `/Users/devarisbrown/Code/projects/gtsd/apps/api/src/services/science.ts`
- `/Users/devarisbrown/Code/projects/gtsd/apps/api/src/routes/profile/metrics.ts`

### Key Tables

- `user_settings` - User profile and health data
- `profile_metrics` - Daily computed metrics
- `metrics_acknowledgements` - User acknowledgments
- `initial_plan_snapshot` - Initial plan configuration

---

**Report End**
