# UI Refresh and Navigation Race Condition Fixes

## Summary
Fixed three critical issues preventing the iOS app from properly updating the UI after profile saves and causing navigation race conditions.

## Issues Fixed

### Issue 1: Navigation Race Condition - Unexpected Redirect to Onboarding
**Problem:** After saving profile changes, users briefly saw the onboarding screen before returning to the main app.

**Root Cause:** The `updateCurrentUser()` method in `AuthenticationService` was updating the `@Published currentUser` property without checking if the onboarding status was regressing. When profile updates triggered a user refresh, if the backend response had `hasCompletedOnboarding = false` (even temporarily), it would trigger navigation back to onboarding.

**Fix Applied:** Added protection in `AuthenticationService.updateCurrentUser()` to prevent onboarding status from reverting:

```swift
func updateCurrentUser(_ user: User) async {
    // Prevent unexpected onboarding redirects during profile updates
    if let current = currentUser,
       current.hasCompletedOnboarding && !user.hasCompletedOnboarding {
        Logger.warning("Onboarding status unexpectedly reverted - preserving current status to prevent navigation race condition")
        var updatedUser = user
        updatedUser = User(
            id: updatedUser.id,
            email: updatedUser.email,
            name: updatedUser.name,
            emailVerified: updatedUser.emailVerified,
            hasCompletedOnboarding: true, // Preserve the completed state
            createdAt: updatedUser.createdAt,
            updatedAt: updatedUser.updatedAt,
            dietaryPreferences: updatedUser.dietaryPreferences,
            allergies: updatedUser.allergies,
            mealsPerDay: updatedUser.mealsPerDay
        )
        currentUser = updatedUser
        return
    }

    currentUser = user
    Logger.info("Current user updated with hasCompletedOnboarding: \(user.hasCompletedOnboarding)")
}
```

**File Modified:** `/Users/devarisbrown/Code/projects/gtsd/apps/GTSD/GTSD/Core/Services/AuthenticationService.swift`

### Issue 2: ProfileViewModel Cached State - Stale User Data
**Problem:** `ProfileViewModel` held a cached copy of user data via `@Published var currentUser: User?` that wasn't updating when the auth service changed.

**Root Cause:** The `currentUser` was initialized once in the init method and then only manually updated in specific places. This meant observers wouldn't automatically see changes when the auth service updated the user.

**Fix Applied:** Converted `currentUser` from a stored property to a computed property that reads directly from the auth service:

```swift
@MainActor
class ProfileViewModel: ObservableObject {
    @Published var currentStreak: CurrentStreak?
    @Published var isLoading: Bool = false
    @Published var errorMessage: String?

    private let apiClient: any APIClientProtocol
    private let authService: any AuthenticationServiceProtocol

    /// Current user from auth service - always fresh
    /// This computed property ensures we always read the latest user state
    /// from the auth service, preventing stale cached data issues
    var currentUser: User? {
        authService.currentUser
    }

    init(
        apiClient: any APIClientProtocol = ServiceContainer.shared.apiClient,
        authService: any AuthenticationServiceProtocol = ServiceContainer.shared.authService
    ) {
        self.apiClient = apiClient
        self.authService = authService
    }
}
```

**Benefits:**
- Always reads fresh data from the source of truth (AuthenticationService)
- No need to manually synchronize cached state
- Simpler state management with fewer potential bugs

**File Modified:** `/Users/devarisbrown/Code/projects/gtsd/apps/GTSD/GTSD/Features/Profile/ProfileViewModel.swift`

### Issue 3: Dietary Preferences UI Not Updating After Save
**Problem:** After saving dietary preferences, the backend confirmed they were saved, but the UI didn't reflect the changes until app restart.

**Root Cause:** Multiple contributing factors:
1. `ProfileViewModel` was using cached state (fixed in Issue 2)
2. `ProfileEditViewModel` wasn't refreshing its local form state after save
3. `ProfileView` wasn't refreshing when the edit sheet dismissed

**Fix Applied - Part A:** Enhanced `ProfileEditViewModel.saveChanges()` to refresh local state after successful save:

```swift
// Fetch fresh user data from backend
Logger.info("Fetching fresh user data from backend after profile update")
let freshUser: User = try await apiClient.request(.currentUser)
Logger.info("Fresh user data received - Preferences: \(freshUser.dietaryPreferences?.count ?? 0), Allergies: \(freshUser.allergies?.count ?? 0)")

// Update auth service with fresh data
// This will trigger @Published updates in AuthenticationService
// which will cascade to all observers including ProfileViewModel
await authService.updateCurrentUser(freshUser)
Logger.info("Auth service updated with fresh user data")

// Update original user to reflect saved state
originalUser = freshUser

// Reload local form fields from fresh data to ensure UI is in sync
name = freshUser.name
email = freshUser.email
dietaryPreferences = freshUser.dietaryPreferences ?? []
allergies = freshUser.allergies ?? []
mealsPerDay = String(freshUser.mealsPerDay ?? 3)

Logger.info("Profile edit form refreshed with saved data - Preferences: \(dietaryPreferences.count), Allergies: \(allergies.count)")
```

**Fix Applied - Part B:** Added refresh trigger to `ProfileView` when edit sheet dismisses:

```swift
.sheet(isPresented: $showingEditProfile) {
    ProfileEditView()
        .onDisappear {
            // Refresh profile when edit sheet is dismissed
            // This ensures UI shows the latest saved changes
            _Concurrency.Task {
                await viewModel.loadProfile()
            }
        }
}
```

**Fix Applied - Part C:** Added environment object observer to ensure ProfileView reacts to auth service changes:

```swift
struct ProfileView: View {
    @StateObject private var viewModel = ProfileViewModel()
    @EnvironmentObject private var authService: AuthenticationService
    // ...
}
```

**Files Modified:**
- `/Users/devarisbrown/Code/projects/gtsd/apps/GTSD/GTSD/Features/Profile/ProfileEditViewModel.swift`
- `/Users/devarisbrown/Code/projects/gtsd/apps/GTSD/GTSD/Features/Profile/ProfileView.swift`

## State Management Flow After Fixes

### 1. User Saves Profile Changes
```
ProfileEditView → ProfileEditViewModel.saveChanges()
```

### 2. Backend Update and Fresh Data Fetch
```
ProfileEditViewModel.saveChanges()
  ↓
API: Update preferences/profile
  ↓
API: Fetch fresh user data (.currentUser)
  ↓
AuthenticationService.updateCurrentUser(freshUser)
  ↓
AuthenticationService.@Published currentUser = freshUser
```

### 3. UI Updates Cascade
```
AuthenticationService.currentUser changes
  ↓
ProfileViewModel.currentUser (computed property) reflects new value
  ↓
ProfileView observes @EnvironmentObject authService
  ↓
SwiftUI automatically re-renders ProfileView with fresh data
  ↓
ProfileEditViewModel local form state refreshed
```

### 4. Sheet Dismissal Refresh
```
ProfileEditView dismisses
  ↓
ProfileView.onDisappear { loadProfile() }
  ↓
ProfileViewModel.loadProfile() refreshes streak data
  ↓
UI shows all updated information
```

## Testing Recommendations

### Test Case 1: Dietary Preferences Update
1. Open Profile → Edit Profile
2. Add dietary preferences (e.g., "Vegetarian", "Gluten-Free")
3. Tap Save
4. **Expected:** Sheet dismisses, preferences immediately visible in profile
5. **Expected:** No navigation to onboarding screen

### Test Case 2: Multiple Field Update
1. Open Profile → Edit Profile
2. Change name, email, dietary preferences, allergies, meals per day
3. Tap Save
4. **Expected:** All changes persist and display immediately
5. **Expected:** No navigation to onboarding screen

### Test Case 3: Allergies Update
1. Open Profile → Edit Profile
2. Add allergies (e.g., "Peanuts", "Shellfish")
3. Tap Save
4. **Expected:** Allergies immediately visible after save
5. **Expected:** Backend logs confirm data saved and fetched

### Test Case 4: Navigation Stability
1. Complete any profile edit operation
2. Observe navigation behavior
3. **Expected:** No flicker or brief redirect to onboarding
4. **Expected:** Smooth dismissal back to profile view
5. **Expected:** All changes visible immediately

### Test Case 5: Error Handling
1. Turn off network connection
2. Try to save profile changes
3. **Expected:** Clear error message
4. **Expected:** No partial state updates
5. **Expected:** Form retains entered values for retry

## Key Improvements

### 1. Single Source of Truth
- `AuthenticationService.currentUser` is now the only source of truth
- All views read from this single source (directly or via computed property)
- No more state synchronization bugs

### 2. Reactive State Management
- SwiftUI's `@Published` and `@EnvironmentObject` handle propagation
- Computed properties ensure views always see fresh data
- No manual state synchronization needed

### 3. Race Condition Protection
- Onboarding status can't regress during profile updates
- Backend timing issues won't cause navigation problems
- Defensive programming protects user experience

### 4. Proper Refresh Flow
- Local form state refreshed after save
- Parent view refreshed on sheet dismissal
- Backend data fetched to ensure consistency

### 5. Clear Data Flow
- Explicit fetch of fresh data after mutations
- Auth service update triggers reactive updates
- UI automatically re-renders with new data

## Build Status

✅ Build successful after all fixes applied
✅ No compilation errors
✅ No SwiftLint warnings
✅ All type safety preserved

## Files Modified

1. `/Users/devarisbrown/Code/projects/gtsd/apps/GTSD/GTSD/Core/Services/AuthenticationService.swift`
   - Added race condition protection in `updateCurrentUser()`

2. `/Users/devarisbrown/Code/projects/gtsd/apps/GTSD/GTSD/Features/Profile/ProfileViewModel.swift`
   - Converted `currentUser` to computed property
   - Removed cached state management

3. `/Users/devarisbrown/Code/projects/gtsd/apps/GTSD/GTSD/Features/Profile/ProfileEditViewModel.swift`
   - Enhanced `saveChanges()` to refresh local state
   - Added comprehensive state synchronization

4. `/Users/devarisbrown/Code/projects/gtsd/apps/GTSD/GTSD/Features/Profile/ProfileView.swift`
   - Added `@EnvironmentObject` for auth service
   - Added `onDisappear` refresh handler for edit sheet

## Next Steps

1. **Test thoroughly** using the test cases above
2. **Monitor logs** for the warning: "Onboarding status unexpectedly reverted"
   - If this warning appears, investigate why backend is sending incomplete data
3. **Consider backend improvement:** Ensure `/auth/profile/preferences` endpoint returns complete user object
4. **Profile photo upload:** Re-enable photo upload when backend endpoint is ready
5. **Health metrics update:** Create dedicated endpoint for weight/height updates

## Notes

- Photo upload feature remains disabled (commented out in UI and ViewModel)
- Health metrics (weight, height) remain read-only pending backend endpoint
- All changes are backward compatible
- No database migrations required
- No API contract changes required
