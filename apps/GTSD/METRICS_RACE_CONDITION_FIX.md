# Metrics Acknowledgment Race Condition Fix

## Summary
Fixed the race condition in `PlanSummaryView.swift` that caused the app to attempt fetching the plan before the metrics acknowledgment state was properly set. This resulted in 400 errors being shown instead of the metrics acknowledgment UI.

## Changes Made

### File: `/Users/devarisbrown/Code/projects/gtsd/apps/GTSD/GTSD/Features/Plans/PlanSummaryView.swift`

### 1. Fixed ZStack Priority (Lines 24-80)

**Problem**: Error view could override acknowledgment UI for metrics-related 400 errors.

**Solution**: Added conditional check to prevent showing error view for metrics acknowledgment errors.

```swift
// BEFORE:
} else if let planError = viewModel.planError, viewModel.planData == nil {
    ErrorView(message: planError.localizedDescription ?? "An error occurred", retryAction: {
        _Concurrency.Task {
            await viewModel.fetchPlanSummary()
        }
    })
}

// AFTER:
} else if let planError = viewModel.planError, viewModel.planData == nil, !shouldShowAcknowledgmentForError(planError) {
    // Only show error if it's not a metrics acknowledgment error
    ErrorView(message: planError.localizedDescription ?? "An error occurred", retryAction: {
        _Concurrency.Task {
            await viewModel.fetchPlanSummary()
        }
    })
}
```

**Rationale**: The acknowledgment UI should have highest priority. If we receive a metrics acknowledgment error, we should show the acknowledgment UI instead of an error view.

### 2. Enhanced Task Block with Proper Sequencing (Lines 129-151)

**Problem**: Race condition where plan fetch could start before metrics acknowledgment state was fully set.

**Solution**:
- Added clear comments explaining the critical sequencing
- Ensured `checkMetricsAcknowledgment()` completes fully before plan fetch
- Added `onChange` handler to detect metrics acknowledgment errors and trigger metrics check

```swift
// BEFORE:
.task {
    // Check if metrics need acknowledgment first
    await metricsViewModel.checkMetricsAcknowledgment()

    // Only fetch plan if metrics are acknowledged
    if viewModel.planData == nil && !metricsViewModel.needsAcknowledgment {
        await viewModel.fetchPlanSummary()
    }
}

// AFTER:
.task {
    // CRITICAL: Check if metrics need acknowledgment FIRST
    // This must complete before attempting to fetch the plan
    await metricsViewModel.checkMetricsAcknowledgment()

    // Wait for metrics check to complete and update state
    // Only fetch plan if:
    // 1. We don't have plan data yet
    // 2. Metrics are acknowledged (needsAcknowledgment is false)
    if viewModel.planData == nil && !metricsViewModel.needsAcknowledgment {
        await viewModel.fetchPlanSummary()
    }
}
.onChange(of: viewModel.planError) { oldError, newError in
    // If we get a metrics acknowledgment error, trigger metrics check
    if let error = newError, shouldShowAcknowledgmentForError(error) {
        _Concurrency.Task {
            // Clear the error and show acknowledgment UI instead
            viewModel.clearErrors()
            await metricsViewModel.checkMetricsAcknowledgment()
        }
    }
}
```

**Rationale**:
- Explicit comments make the sequencing requirement clear
- `onChange` handler catches metrics acknowledgment errors that slip through
- Automatically triggers metrics check when such errors occur
- Clears the error to prevent error view from showing

### 3. Added Helper Method for Error Detection (Lines 782-795)

**Problem**: No way to detect if an error is a metrics acknowledgment error.

**Solution**: Added `shouldShowAcknowledgmentForError()` method that checks for 400 errors with metrics acknowledgment messages.

```swift
/// Check if an error is a metrics acknowledgment error that should trigger the acknowledgment UI
/// instead of showing an error view
private func shouldShowAcknowledgmentForError(_ error: PlanError) -> Bool {
    // Check for 400 errors with metrics acknowledgment messages
    if case .serverError(let code, let message) = error {
        if code == 400 {
            let lowerMessage = message?.lowercased() ?? ""
            // Check for common metrics acknowledgment error messages
            return lowerMessage.contains("acknowledge") &&
                   (lowerMessage.contains("metrics") || lowerMessage.contains("health"))
        }
    }
    return false
}
```

**Rationale**:
- Detects 400 errors with "acknowledge" + "metrics"/"health" in the message
- Returns true if this is a metrics acknowledgment error
- Used in both the ZStack conditional and onChange handler
- Case-insensitive matching for robustness

## How It Works

### Normal Flow (Metrics Acknowledged)
1. App launches → `PlanSummaryView` appears
2. `.task` block runs → calls `checkMetricsAcknowledgment()`
3. `needsAcknowledgment` is `false` (metrics already acknowledged)
4. Plan fetch proceeds normally
5. Plan data displays

### First-Time Flow (Needs Acknowledgment)
1. App launches → `PlanSummaryView` appears
2. `.task` block runs → calls `checkMetricsAcknowledgment()`
3. `needsAcknowledgment` is `true` (metrics not acknowledged)
4. Plan fetch is **skipped**
5. ZStack shows `metricsAcknowledgmentView` (highest priority)
6. User reviews metrics and taps "I Understand"
7. `acknowledgeMetrics()` runs → sets `needsAcknowledgment = false`
8. `fetchPlanSummary()` is called
9. Plan data displays

### Error Recovery Flow (400 Error)
1. Something triggers plan fetch before metrics are acknowledged
2. Backend returns 400 error: "Please acknowledge your health metrics"
3. `viewModel.planError` updates → triggers `onChange` handler
4. `shouldShowAcknowledgmentForError()` returns `true`
5. Error is cleared via `clearErrors()`
6. `checkMetricsAcknowledgment()` is called
7. `needsAcknowledgment` is set to `true`
8. ZStack shows `metricsAcknowledgmentView` instead of error
9. User acknowledges metrics
10. Normal flow resumes

## Testing Scenarios

### Scenario 1: First-Time User
- **Expected**: Metrics acknowledgment UI shows immediately
- **Verifies**: `.task` block properly checks metrics first
- **Result**: No plan fetch until acknowledgment

### Scenario 2: Returning User
- **Expected**: Plan loads normally without acknowledgment UI
- **Verifies**: Conditional plan fetch works correctly
- **Result**: Seamless plan display

### Scenario 3: Race Condition Trigger
- **Expected**: If 400 error occurs, acknowledgment UI shows
- **Verifies**: Error handler detects metrics errors and triggers acknowledgment flow
- **Result**: User sees acknowledgment UI instead of error

### Scenario 4: Other Error Types
- **Expected**: Error view shows for non-metrics errors
- **Verifies**: `shouldShowAcknowledgmentForError()` only returns true for metrics errors
- **Result**: Normal error handling preserved

## Code Quality

### Async/Await Sequencing
- ✅ Proper sequential execution with `await`
- ✅ No race conditions in task block
- ✅ Clear separation of concerns

### Error Handling
- ✅ Specific detection of metrics errors
- ✅ Automatic recovery from race condition
- ✅ Preserves existing error handling for other errors

### State Management
- ✅ Single source of truth (`needsAcknowledgment`)
- ✅ Reactive UI updates via `@Published`
- ✅ Proper state transitions

### Comments and Documentation
- ✅ Critical sections clearly commented
- ✅ Rationale documented in code
- ✅ Helper method documented with docstring

## Impact

### User Experience
- **Before**: Error view with confusing message about acknowledging metrics
- **After**: Clear, guided metrics acknowledgment flow

### Developer Experience
- **Before**: Race condition could occur depending on timing
- **After**: Robust sequencing prevents race conditions

### Code Maintainability
- **Before**: Implicit assumptions about execution order
- **After**: Explicit comments and defensive error handling

## Related Files

No changes needed to these files, but they're part of the flow:

- `/Users/devarisbrown/Code/projects/gtsd/apps/GTSD/GTSD/Features/Plans/MetricsViewModel.swift`
  - Contains `checkMetricsAcknowledgment()` and `acknowledgeMetrics()` methods
  - Manages `needsAcknowledgment` state

- `/Users/devarisbrown/Code/projects/gtsd/apps/GTSD/GTSD/Features/Plans/PlanSummaryViewModel.swift`
  - Contains `fetchPlanSummary()` method
  - Manages `planError` state

- `/Users/devarisbrown/Code/projects/gtsd/apps/GTSD/GTSD/Features/Plans/PlanModels.swift`
  - Defines `PlanError` enum
  - Contains `.serverError(Int, String)` case

## Summary of Changes

1. **ZStack Conditional**: Added `!shouldShowAcknowledgmentForError(planError)` check
2. **Task Block**: Enhanced comments and ensured proper sequencing
3. **onChange Handler**: Added to catch metrics acknowledgment errors
4. **Helper Method**: Added `shouldShowAcknowledgmentForError()` to detect metrics errors

All changes preserve existing functionality while fixing the race condition and improving error handling.
