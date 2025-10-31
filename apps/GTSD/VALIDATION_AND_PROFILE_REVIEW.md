# GTSD iOS App - Validation & Profile Fix Review

**Review Date:** 2025-10-28
**Reviewer:** Mobile App Developer Expert
**App:** GTSD iOS Native App (Swift)

---

## Executive Summary

This review assesses two critical fixes in the GTSD iOS app:
1. **Validation ranges for weight and height inputs**
2. **Profile view decoding error ("data couldn't be read because it is missing")**

### Overall Assessment: CRITICAL ISSUES FOUND

**Status:**
- Validation Ranges: **INCORRECT - MAJOR BUG**
- Profile Decoding: **ROOT CAUSE IDENTIFIED**
- Unit Conversion: **MISSING - CRITICAL DEFECT**

---

## Issue 1: Validation Range Review

### Current Backend Validation (TypeScript)

**File:** `/Users/devarisbrown/Code/projects/gtsd/packages/shared-types/src/science.ts`

```typescript
export const VALIDATION_RANGES = {
  weight: { min: 30, max: 300 },      // kg
  height: { min: 100, max: 250 },     // cm
  age: { min: 13, max: 120 },
  targetWeight: { min: 30, max: 300 }, // kg
} as const;
```

### Assessment: RANGES ARE CORRECT FOR METRIC

The backend validation ranges are appropriate and evidence-based:

**Weight (30-300 kg):**
- Min: 30 kg = 66 lbs (appropriate minimum for teens/small adults)
- Max: 300 kg = 661 lbs (covers extreme obesity cases)
- **COVERS** the requested 600 lbs (272 kg) - this is WITHIN range

**Height (100-250 cm):**
- Min: 100 cm = 39 inches (appropriate for teens)
- Max: 250 cm = 98 inches (covers extremely tall individuals)
- **COVERS** the requested 96 inches (244 cm) - this is WITHIN range

**Conversion Verification:**
- 600 lbs = 272.16 kg (CORRECT conversion, within 30-300 kg range)
- 96 inches = 243.84 cm (CORRECT conversion, within 100-250 cm range)

### CRITICAL BUG: iOS App Missing Unit Conversion

**Problem Location:** `/Users/devarisbrown/Code/projects/gtsd/apps/GTSD/GTSD/Features/Onboarding/HealthMetricsView.swift`

Lines 37-76 show the app collecting weight in **pounds** and height in **inches**:

```swift
// Weight field
Text("Current Weight (lbs)")  // UI shows POUNDS

TextField("Enter weight", text: $weightText)
    .onChange(of: weightText) { _, newValue in
        viewModel.onboardingData.currentWeight = Double(newValue)  // ⚠️ STORES AS-IS
    }

// Height field
Text("Height (inches)")  // UI shows INCHES

TextField("Enter height", text: $heightText)
    .onChange(of: heightText) { _, newValue in
        viewModel.onboardingData.height = Double(newValue)  // ⚠️ STORES AS-IS
    }
```

**File:** `/Users/devarisbrown/Code/projects/gtsd/apps/GTSD/GTSD/Features/Onboarding/OnboardingViewModel.swift`

Line 103-115 sends data to API without conversion:

```swift
let request = CompleteOnboardingRequest(
    // ... other fields ...
    currentWeight: currentWeight,  // ⚠️ SENT IN POUNDS (should be kg)
    height: height,                // ⚠️ SENT IN INCHES (should be cm)
    // ...
)
```

### Impact: VALIDATION REJECTING VALID US VALUES

**Example Scenario:**
1. US user enters: 200 lbs, 72 inches
2. iOS app sends: `currentWeight: 200, height: 72` (NO CONVERSION)
3. Backend validates against: `weight: 30-300 kg, height: 100-250 cm`
4. Backend sees: 200 kg (valid), 72 cm (INVALID - below 100 cm minimum)
5. **Result:** Validation fails with "Height must be at least 100 cm"

**This explains why users are getting validation errors!**

---

## Issue 2: Profile Decoding Error Review

### Error Message Analysis

**Error:** "The data couldn't be read because it is missing"

This is Swift's generic decoding error when:
1. Expected property is not present in JSON
2. Expected property is null when non-optional
3. Type mismatch between JSON and Swift model

### Root Cause Investigation

**File:** `/Users/devarisbrown/Code/projects/gtsd/apps/GTSD/GTSD/Features/Profile/ProfileViewModel.swift`

Line 39 attempts to decode streak data:

```swift
let streak: CurrentStreak = try await apiClient.request(.getCurrentStreak)
currentStreak = streak
```

**Streak Model:** `/Users/devarisbrown/Code/projects/gtsd/apps/GTSD/GTSD/Core/Models/Streak.swift`

The `CurrentStreak` model expects these fields (lines 12-21):

```swift
struct CurrentStreak: Codable, Sendable {
    let streak: StreakData              // REQUIRED
    let todayCompliance: DailyCompliance?  // Optional
    let canIncrementToday: Bool         // REQUIRED
}
```

**Nested StreakData requires (lines 32-47):**

```swift
struct StreakData: Codable, Sendable {
    let id: Int                    // REQUIRED
    let userId: Int                // REQUIRED
    let currentStreak: Int         // REQUIRED
    let longestStreak: Int         // REQUIRED
    let totalCompliantDays: Int    // REQUIRED
    let lastComplianceDate: Date?  // Optional
    let streakStartDate: Date?     // Optional
    let createdAt: Date            // REQUIRED
    let updatedAt: Date            // REQUIRED
}
```

### Likely Causes

**Scenario 1: New User - No Streak Data**
If user hasn't completed any tasks, the API might return:
```json
{
  "streak": null,  // ⚠️ NULL instead of object
  "canIncrementToday": false
}
```

**Scenario 2: Missing Required Fields**
API returns incomplete data:
```json
{
  "streak": {
    "currentStreak": 0,
    "longestStreak": 0
    // ⚠️ Missing: id, userId, createdAt, updatedAt
  },
  "canIncrementToday": false
}
```

**Scenario 3: Type Mismatch**
API returns different types:
```json
{
  "streak": {
    "createdAt": "2025-10-28",  // ⚠️ Wrong format (should be ISO8601)
    "updatedAt": "2025-10-28"
  }
}
```

### Current Error Handling

**ProfileViewModel.swift (lines 43-45):**

```swift
} catch {
    Logger.error("Failed to load profile: \(error)")
    errorMessage = error.localizedDescription  // Generic Swift error
}
```

**Problem:** `localizedDescription` on decoding errors gives unhelpful message: "The data couldn't be read because it is missing"

---

## Issue 3: ProfileEditViewModel Validation

**File:** `/Users/devarisbrown/Code/projects/gtsd/apps/GTSD/GTSD/Features/Profile/ProfileEditViewModel.swift`

Lines 94-103 show validation for weight updates:

```swift
// Weight validation (if provided)
if !currentWeight.isEmpty {
    guard let weight = Double(currentWeight), weight > 0, weight < 1000 else {
        return false
    }
}
```

**Problem:** Hardcoded validation `weight < 1000` doesn't match backend ranges:
- If user enters pounds: 600 lbs is valid (< 1000)
- But backend expects kg: 600 kg is INVALID (> 300 kg max)

**Lines 186-189 show the endpoint is disabled:**

```swift
if !currentWeight.isEmpty || !targetWeight.isEmpty {
    Logger.warning("Health metrics update attempted but endpoint not available")
    throw ProfileEditError.healthMetricsUpdateNotSupported
}
```

This is actually good - prevents data corruption from unit conversion issues!

---

## Recommendations

### Priority 1: CRITICAL - Fix Unit Conversion

**Location:** `/Users/devarisbrown/Code/projects/gtsd/apps/GTSD/GTSD/Features/Onboarding/OnboardingViewModel.swift`

**Required Changes:**

```swift
// Add conversion functions
extension OnboardingViewModel {
    private func poundsToKilograms(_ pounds: Double) -> Double {
        return pounds * 0.453592
    }

    private func inchesToCentimeters(_ inches: Double) -> Double {
        return inches * 2.54
    }
}

// Update completeOnboarding (line 103-115)
let request = CompleteOnboardingRequest(
    dateOfBirth: isoFormatter.string(from: dateOfBirth),
    gender: genderValue,
    primaryGoal: primaryGoal.rawValue,
    targetWeight: poundsToKilograms(targetWeight),      // ✅ CONVERT
    targetDate: isoFormatter.string(from: targetDate),
    activityLevel: activityLevel.rawValue,
    currentWeight: poundsToKilograms(currentWeight),    // ✅ CONVERT
    height: inchesToCentimeters(height),                // ✅ CONVERT
    dietaryPreferences: onboardingData.dietaryPreferences ?? [],
    allergies: onboardingData.allergies ?? [],
    mealsPerDay: onboardingData.mealsPerDay
)
```

### Priority 2: HIGH - Improve Profile Error Handling

**Location:** `/Users/devarisbrown/Code/projects/gtsd/apps/GTSD/GTSD/Features/Profile/ProfileViewModel.swift`

**Required Changes:**

```swift
func loadProfile() async {
    isLoading = true
    errorMessage = nil

    do {
        // Load user data from auth service
        currentUser = authService.currentUser

        // Load streak data with better error handling
        do {
            let streak: CurrentStreak = try await apiClient.request(.getCurrentStreak)
            currentStreak = streak
            Logger.info("Profile loaded successfully")
        } catch let error as APIError {
            // Handle API errors gracefully
            switch error {
            case .httpError(404, _):
                // New user - no streak data yet
                Logger.info("No streak data found - new user")
                currentStreak = nil
            case .decodingError(let underlyingError):
                Logger.error("Streak decoding failed: \(underlyingError)")
                // Don't block profile view for streak errors
                currentStreak = nil
                // Show user-friendly message
                errorMessage = "Some profile data is unavailable. Please try refreshing."
            default:
                throw error
            }
        }

    } catch {
        Logger.error("Failed to load profile: \(error)")
        errorMessage = "Failed to load profile. Please try again."
    }

    isLoading = false
}
```

### Priority 3: MEDIUM - Add Client-Side Validation

**Location:** `/Users/devarisbrown/Code/projects/gtsd/apps/GTSD/GTSD/Features/Onboarding/HealthMetricsView.swift`

**Add validation feedback:**

```swift
@State private var weightError: String?
@State private var heightError: String?

// Add validation helpers
private func validateWeight(_ pounds: Double) -> String? {
    let kg = pounds * 0.453592
    if kg < 30 {
        return "Weight must be at least 66 lbs"
    } else if kg > 300 {
        return "Weight must not exceed 661 lbs"
    }
    return nil
}

private func validateHeight(_ inches: Double) -> String? {
    let cm = inches * 2.54
    if cm < 100 {
        return "Height must be at least 39 inches"
    } else if cm > 250 {
        return "Height must not exceed 98 inches"
    }
    return nil
}

// Update text field onChange
.onChange(of: weightText) { _, newValue in
    if let weight = Double(newValue) {
        viewModel.onboardingData.currentWeight = weight
        weightError = validateWeight(weight)
    }
}

// Add error text below field
if let error = weightError {
    Text(error)
        .font(.labelSmall)
        .foregroundColor(.errorColor)
}
```

### Priority 4: LOW - Add Unit Display Helpers

**Create utility for showing both units:**

```swift
extension Double {
    func formatWeight() -> String {
        let kg = self * 0.453592
        return String(format: "%.1f lbs (%.1f kg)", self, kg)
    }

    func formatHeight() -> String {
        let cm = self * 2.54
        let feet = Int(self / 12)
        let inches = Int(self.truncatingRemainder(dividingBy: 12))
        return "\(feet)'\(inches)\" (\(Int(cm)) cm)"
    }
}
```

---

## API Integration Issues

### Backend Endpoint Review

**File:** `/Users/devarisbrown/Code/projects/gtsd/apps/api/src/routes/auth/profile-health.ts`

The backend properly validates using `VALIDATION_RANGES`:

```typescript
export const updateHealthMetricsSchema = z.object({
  currentWeight: z.number()
    .min(VALIDATION_RANGES.weight.min)      // 30 kg
    .max(VALIDATION_RANGES.weight.max),     // 300 kg
  height: z.number()
    .min(VALIDATION_RANGES.height.min)      // 100 cm
    .max(VALIDATION_RANGES.height.max)      // 250 cm
    .optional(),
  // ...
});
```

**Issue:** Backend expects metric (kg/cm), iOS sends imperial (lbs/inches)

### Missing API Documentation

The iOS app should document expected units in API calls:

```swift
/// CompleteOnboardingRequest
///
/// ⚠️ IMPORTANT: All measurements must be in metric units
/// - currentWeight: kilograms (kg)
/// - height: centimeters (cm)
/// - targetWeight: kilograms (kg)
///
/// UI shows imperial units (lbs/inches) but must convert before API call
struct CompleteOnboardingRequest: Codable {
    let currentWeight: Double  // kg (not lbs!)
    let height: Double         // cm (not inches!)
    let targetWeight: Double   // kg (not lbs!)
    // ...
}
```

---

## Mobile UX Concerns

### 1. No Conversion Feedback

Users see "200 lbs" in UI but API receives "200 kg" (440 lbs) - confusing!

**Recommendation:** Show both units during data entry:
```
Current Weight
200 lbs (90.7 kg)
```

### 2. Generic Error Messages

"The data couldn't be read because it is missing" - not helpful!

**Recommendation:** Context-aware error messages:
- Network error: "Connection lost. Please check your internet."
- Validation error: "Please enter valid weight (66-661 lbs)"
- Server error: "Server unavailable. Please try again later."

### 3. No Offline Handling

Profile view fails completely if API call fails.

**Recommendation:**
- Cache user data locally
- Show cached data with "Last updated" timestamp
- Allow offline viewing with sync indicator

### 4. No Loading States

Users don't know if profile is loading or broken.

**Recommendation:**
- Skeleton screens during load
- Pull-to-refresh for manual reload
- Error state with retry button

---

## Testing Recommendations

### Test Case 1: US User Onboarding
```
Input: 200 lbs, 72 inches
Expected: Convert to 90.7 kg, 182.9 cm
Backend validation: PASS
```

### Test Case 2: Edge Case - Maximum Weight
```
Input: 600 lbs, 96 inches
Expected: Convert to 272.2 kg, 243.8 cm
Backend validation: PASS (within 30-300 kg, 100-250 cm)
```

### Test Case 3: Invalid Input
```
Input: 800 lbs, 50 inches
Expected:
- 800 lbs = 363 kg (FAIL: exceeds 300 kg max)
- 50 inches = 127 cm (PASS: within 100-250 cm)
Error: "Weight must not exceed 661 lbs"
```

### Test Case 4: New User Profile
```
API returns: No streak data (404 or null)
Expected: Show profile without streak stats
Actual: "data couldn't be read because it is missing"
```

### Test Case 5: Existing User Profile
```
API returns: Complete streak data
Expected: Show profile with streak stats
Actual: Should work correctly
```

---

## Performance Considerations

### Current Issues

1. **No caching:** Every profile view loads from network
2. **No offline support:** App unusable without internet
3. **Synchronous API calls:** UI blocks during load

### Recommendations

1. **Add CoreData/SwiftData caching:**
```swift
// Cache user profile locally
func loadProfile() async {
    // 1. Show cached data immediately
    if let cached = try? await loadCachedProfile() {
        currentUser = cached.user
        currentStreak = cached.streak
    }

    // 2. Fetch fresh data in background
    await refreshProfile()
}
```

2. **Implement retry with exponential backoff:**
```swift
func loadWithRetry(maxAttempts: Int = 3) async {
    for attempt in 1...maxAttempts {
        do {
            try await loadProfile()
            return
        } catch {
            if attempt < maxAttempts {
                let delay = pow(2.0, Double(attempt))
                try? await Task.sleep(nanoseconds: UInt64(delay * 1_000_000_000))
            }
        }
    }
}
```

---

## Summary of Critical Fixes Needed

### Fix 1: Unit Conversion (CRITICAL - P0)
- **File:** `OnboardingViewModel.swift`
- **Change:** Convert lbs→kg and inches→cm before API call
- **Impact:** Fixes validation rejection for all US users
- **Effort:** 1 hour

### Fix 2: Profile Error Handling (HIGH - P1)
- **File:** `ProfileViewModel.swift`
- **Change:** Handle missing/invalid streak data gracefully
- **Impact:** Fixes "data couldn't be read" error
- **Effort:** 2 hours

### Fix 3: Validation Constants (MEDIUM - P2)
- **File:** `ProfileEditViewModel.swift`
- **Change:** Update validation to use backend ranges with conversion
- **Impact:** Prevents future inconsistencies
- **Effort:** 1 hour

### Fix 4: User Experience (LOW - P3)
- **File:** `HealthMetricsView.swift`
- **Change:** Add real-time validation and dual-unit display
- **Impact:** Better UX and fewer submission errors
- **Effort:** 3 hours

---

## Validation Matrix

| Input Type | UI Units | API Units | Min UI | Max UI | Min API | Max API | Status |
|------------|----------|-----------|--------|--------|---------|---------|--------|
| Weight | lbs | kg | 66 | 661 | 30 | 300 | ⚠️ NEEDS CONVERSION |
| Height | inches | cm | 39 | 98 | 100 | 250 | ⚠️ NEEDS CONVERSION |
| Target Weight | lbs | kg | 66 | 661 | 30 | 300 | ⚠️ NEEDS CONVERSION |

---

## Conclusion

**Validation Ranges:** Backend ranges are CORRECT and appropriate. The issue is not with the ranges themselves.

**Root Cause:** iOS app is sending imperial units (lbs/inches) directly to API that expects metric units (kg/cm), causing validation to fail for perfectly valid US measurements.

**Profile Decoding Error:** Caused by missing/incomplete streak data in API response. App needs defensive decoding and better error handling.

**Recommended Action Plan:**
1. Immediately add unit conversion (1-2 hours, blocks onboarding)
2. Fix profile error handling (2-3 hours, improves UX)
3. Add client-side validation (3-4 hours, prevents errors)
4. Improve error messages (2-3 hours, better UX)

**Total Effort:** ~10 hours to fully resolve all issues

**Risk if not fixed:**
- US users cannot complete onboarding (CRITICAL)
- Profile view crashes for new users (HIGH)
- Poor user experience with cryptic errors (MEDIUM)
