# CRITICAL FIXES NEEDED - GTSD iOS App

**URGENT: Unit Conversion Missing - Blocks US Users from Onboarding**

---

## Critical Bug: Missing Unit Conversion

### The Problem

iOS app collects data in **imperial units** (lbs/inches) but sends to API in **imperial units** without converting to **metric units** (kg/cm).

**User Experience:**
```
User enters: 200 lbs, 72 inches
App sends:   200 lbs, 72 inches (NO CONVERSION!)
API expects: 90.7 kg, 182.9 cm
API rejects: "Height must be at least 100 cm"
```

### The Fix

**File:** `/Users/devarisbrown/Code/projects/gtsd/apps/GTSD/GTSD/Features/Onboarding/OnboardingViewModel.swift`

**Add conversion functions (line 74):**

```swift
// MARK: - Unit Conversion Helpers

private func poundsToKilograms(_ pounds: Double) -> Double {
    return pounds * 0.453592
}

private func inchesToCentimeters(_ inches: Double) -> Double {
    return inches * 2.54
}

private func kilogramsToPounds(_ kg: Double) -> Double {
    return kg / 0.453592
}

private func centimetersToInches(_ cm: Double) -> Double {
    return cm / 2.54
}
```

**Update completeOnboarding function (replace lines 103-115):**

```swift
let request = CompleteOnboardingRequest(
    dateOfBirth: isoFormatter.string(from: dateOfBirth),
    gender: genderValue,
    primaryGoal: primaryGoal.rawValue,
    targetWeight: poundsToKilograms(targetWeight),      // ✅ CONVERT lbs → kg
    targetDate: isoFormatter.string(from: targetDate),
    activityLevel: activityLevel.rawValue,
    currentWeight: poundsToKilograms(currentWeight),    // ✅ CONVERT lbs → kg
    height: inchesToCentimeters(height),                // ✅ CONVERT in → cm
    dietaryPreferences: onboardingData.dietaryPreferences ?? [],
    allergies: onboardingData.allergies ?? [],
    mealsPerDay: onboardingData.mealsPerDay
)
```

**Also update skipOnboarding function (lines 153-165):**

```swift
// Use realistic default values in metric
let defaultRequest = CompleteOnboardingRequest(
    dateOfBirth: ISO8601DateFormatter().string(from: Calendar.current.date(byAdding: .year, value: -25, to: Date()) ?? Date()),
    gender: "prefer_not_to_say",
    primaryGoal: "improve_health",
    targetWeight: 70.0,              // ✅ 70 kg (154 lbs)
    targetDate: ISO8601DateFormatter().string(from: Calendar.current.date(byAdding: .month, value: 3, to: Date()) ?? Date()),
    activityLevel: "moderately_active",
    currentWeight: 70.0,             // ✅ 70 kg (154 lbs)
    height: 170.0,                   // ✅ 170 cm (67 inches)
    dietaryPreferences: [],
    allergies: [],
    mealsPerDay: 3
)
```

---

## High Priority Bug: Profile Decoding Error

### The Problem

ProfileView crashes with "The data couldn't be read because it is missing" when streak data is incomplete or missing.

### The Fix

**File:** `/Users/devarisbrown/Code/projects/gtsd/apps/GTSD/GTSD/Features/Profile/ProfileViewModel.swift`

**Replace loadProfile function (lines 30-49):**

```swift
func loadProfile() async {
    isLoading = true
    errorMessage = nil

    defer { isLoading = false }

    do {
        // Load user data from auth service
        currentUser = authService.currentUser

        // Load streak data with defensive error handling
        do {
            let streak: CurrentStreak = try await apiClient.request(.getCurrentStreak)
            currentStreak = streak
            Logger.info("Profile loaded successfully with streak data")
        } catch let apiError as APIError {
            // Handle specific API errors gracefully
            switch apiError {
            case .httpError(404, _):
                // New user or no streak data yet - this is OK
                Logger.info("No streak data found - likely new user")
                currentStreak = nil

            case .decodingError(let underlyingError):
                // API returned data but it's malformed - log for debugging
                Logger.error("Streak data decoding failed: \(underlyingError)")
                Logger.error("This indicates API response doesn't match CurrentStreak model")
                currentStreak = nil

                // Show non-blocking warning to user
                errorMessage = "Some profile statistics are temporarily unavailable"

            default:
                // Other API errors (network, server, etc)
                Logger.warning("Failed to load streak data: \(apiError)")
                currentStreak = nil
                errorMessage = "Unable to load activity statistics. Pull down to refresh."
            }
        }

        // Always log successful user load
        if currentUser != nil {
            Logger.info("Profile loaded - user data available, streak: \(currentStreak != nil)")
        }

    } catch {
        // Unexpected errors
        Logger.error("Unexpected error loading profile: \(error)")
        errorMessage = "Failed to load profile. Please try again."
    }
}
```

---

## Medium Priority: Add Validation Constants

### The Problem

ProfileEditViewModel uses hardcoded validation (0-1000) that doesn't match backend ranges.

### The Fix

**File:** `/Users/devarisbrown/Code/projects/gtsd/apps/GTSD/GTSD/Features/Profile/ProfileEditViewModel.swift`

**Add validation constants (after line 12):**

```swift
// MARK: - Validation Constants

private enum ValidationLimits {
    // Backend validation ranges (in metric units)
    static let minWeightKg: Double = 30.0      // 66 lbs
    static let maxWeightKg: Double = 300.0     // 661 lbs
    static let minHeightCm: Double = 100.0     // 39 inches
    static let maxHeightCm: Double = 250.0     // 98 inches

    // Convert to imperial for US users
    static let minWeightLbs: Double = minWeightKg / 0.453592  // 66.1 lbs
    static let maxWeightLbs: Double = maxWeightKg / 0.453592  // 661.4 lbs
    static let minHeightIn: Double = minHeightCm / 2.54       // 39.4 inches
    static let maxHeightIn: Double = maxHeightCm / 2.54       // 98.4 inches
}
```

**Update isValid (replace lines 94-103):**

```swift
// Weight validation (if provided) - assuming input is in pounds
if !currentWeight.isEmpty {
    guard let weightLbs = Double(currentWeight),
          weightLbs >= ValidationLimits.minWeightLbs,
          weightLbs <= ValidationLimits.maxWeightLbs else {
        return false
    }
}

if !targetWeight.isEmpty {
    guard let weightLbs = Double(targetWeight),
          weightLbs >= ValidationLimits.minWeightLbs,
          weightLbs <= ValidationLimits.maxWeightLbs else {
        return false
    }
}
```

**Update error messages (replace lines 298-328):**

```swift
var currentWeightError: String? {
    guard !currentWeight.isEmpty else { return nil }

    if let weight = Double(currentWeight) {
        if weight < ValidationLimits.minWeightLbs {
            return "Weight must be at least \(Int(ValidationLimits.minWeightLbs)) lbs"
        }
        if weight > ValidationLimits.maxWeightLbs {
            return "Weight must not exceed \(Int(ValidationLimits.maxWeightLbs)) lbs"
        }
    } else {
        return "Invalid weight value"
    }
    return nil
}

var targetWeightError: String? {
    guard !targetWeight.isEmpty else { return nil }

    if let weight = Double(targetWeight) {
        if weight < ValidationLimits.minWeightLbs {
            return "Target weight must be at least \(Int(ValidationLimits.minWeightLbs)) lbs"
        }
        if weight > ValidationLimits.maxWeightLbs {
            return "Target weight must not exceed \(Int(ValidationLimits.maxWeightLbs)) lbs"
        }
    } else {
        return "Invalid weight value"
    }
    return nil
}
```

---

## Testing After Fixes

### Test 1: Normal US User
```swift
Input:
  Weight: 200 lbs
  Height: 72 inches
  Target: 180 lbs

Expected API call:
  currentWeight: 90.7 kg
  height: 182.9 cm
  targetWeight: 81.6 kg

Backend validation: ✅ PASS
```

### Test 2: Edge Case - Maximum Values
```swift
Input:
  Weight: 600 lbs
  Height: 96 inches

Expected API call:
  currentWeight: 272.2 kg
  height: 243.8 cm

Backend validation: ✅ PASS (within 30-300 kg, 100-250 cm)
```

### Test 3: Profile View - New User
```swift
Scenario: User just signed up, no tasks completed yet

Expected:
  - User profile loads ✅
  - Streak data = nil ✅
  - No error message ✅
  - Profile displays without crash ✅
```

### Test 4: Profile View - Network Error
```swift
Scenario: API unavailable

Expected:
  - Show cached user data (if available)
  - Error message: "Unable to load activity statistics. Pull down to refresh."
  - Profile doesn't crash
  - Retry available via pull-to-refresh
```

---

## Additional Documentation Fix

**File:** `/Users/devarisbrown/Code/projects/gtsd/apps/GTSD/GTSD/Features/Onboarding/OnboardingModels.swift`

**Add documentation to CompleteOnboardingRequest (line 87):**

```swift
// MARK: - Onboarding Request

/// Request to complete user onboarding
///
/// ⚠️ CRITICAL: All measurements must be in METRIC units before sending to API
///
/// The UI collects data in US imperial units (lbs/inches) but the API expects
/// metric units (kg/cm). Always convert before creating this request.
///
/// Conversions:
/// - Weight: pounds × 0.453592 = kilograms
/// - Height: inches × 2.54 = centimeters
///
/// Example:
/// ```swift
/// // UI shows: 200 lbs, 72 inches
/// let request = CompleteOnboardingRequest(
///     currentWeight: 200 * 0.453592,  // 90.7 kg
///     height: 72 * 2.54,              // 182.9 cm
///     // ...
/// )
/// ```
struct CompleteOnboardingRequest: Codable {
    let dateOfBirth: String         // ISO 8601 format
    let gender: String
    let primaryGoal: String
    let targetWeight: Double        // ⚠️ MUST be in kilograms
    let targetDate: String          // ISO 8601 format
    let activityLevel: String
    let currentWeight: Double       // ⚠️ MUST be in kilograms
    let height: Double              // ⚠️ MUST be in centimeters
    let dietaryPreferences: [String]
    let allergies: [String]
    let mealsPerDay: Int
}
```

---

## Verification Checklist

After implementing fixes, verify:

- [ ] Onboarding with 200 lbs, 72 inches completes successfully
- [ ] Onboarding with 600 lbs, 96 inches completes successfully
- [ ] Profile view loads for new users without crash
- [ ] Profile view shows error gracefully when API fails
- [ ] Profile view displays streak data when available
- [ ] All conversions are accurate (test with calculator)
- [ ] Error messages are user-friendly
- [ ] No hardcoded validation numbers remain

---

## Files to Modify

1. **OnboardingViewModel.swift** (CRITICAL)
   - Add conversion helpers
   - Update completeOnboarding()
   - Update skipOnboarding()

2. **ProfileViewModel.swift** (HIGH)
   - Improve error handling in loadProfile()
   - Handle missing/invalid streak data

3. **ProfileEditViewModel.swift** (MEDIUM)
   - Add ValidationLimits constants
   - Update isValid property
   - Update error messages

4. **OnboardingModels.swift** (LOW)
   - Add documentation comments
   - Clarify unit expectations

---

## Estimated Time

- Critical fixes (1 & 2): **3-4 hours**
- Medium fixes (3): **1-2 hours**
- Documentation (4): **30 minutes**
- Testing: **2 hours**

**Total: 6-8 hours**

---

## Notes

- All conversions tested against online calculators
- Backend validation ranges verified in shared-types
- API endpoint documentation reviewed
- User experience flows mapped
- Error handling improved for production readiness
