# iOS App Dietary Preferences Persistence Issue - Root Cause Analysis

## Executive Summary

The iOS app successfully saves dietary preferences to the backend, but **fails to reload them** because it relies on the wrong data source. The app fetches user data from `authService.currentUser`, which is only updated during login/signup but **NOT** after profile updates.

## Evidence Analysis

### 1. Backend Works Correctly ✅

- `/auth/me` endpoint properly returns dietary preferences from `userSettings` table
- `/auth/profile/preferences` endpoint correctly updates and returns preferences
- Verified via curl testing - backend returns correct data

### 2. iOS App Save Operation ✅

```swift
// ProfileEditViewModel.swift lines 241-247
let _: UpdatePreferencesResponse = try await apiClient.request(
    .updatePreferences(
        dietaryPreferences: prefsChanged ? dietaryPreferences : nil,
        allergies: allergiesChanged ? allergies : nil,
        mealsPerDay: mealsChanged ? meals : nil
    )
)
```

- Successfully calls PUT `/auth/profile/preferences`
- Backend updates the data correctly
- Log shows: "Dietary preferences updated - Prefs: 1, Allergies: 1, Meals: 3"

### 3. iOS App Load Operation ❌ **ROOT CAUSE IDENTIFIED**

```swift
// ProfileEditViewModel.swift lines 128-139
func loadProfile() async {
    // Load user from auth service
    if let user = authService.currentUser {  // ❌ PROBLEM: Stale data source
        originalUser = user
        name = user.name
        email = user.email

        // Load dietary preferences and allergies
        dietaryPreferences = user.dietaryPreferences ?? []
        allergies = user.allergies ?? []
        mealsPerDay = String(user.mealsPerDay ?? 3)

        Logger.info("Profile loaded for editing - Preferences: \(dietaryPreferences.count), Allergies: \(allergies.count)")
    }
}
```

## The Core Problem

### Data Flow Issue:

1. **Initial Login:**
   - AuthenticationService calls `/auth/me`
   - Stores user data in `currentUser` property
   - This includes dietary preferences from backend

2. **Profile Update:**
   - ProfileEditViewModel updates preferences via `/auth/profile/preferences`
   - Backend successfully updates
   - **BUT** AuthenticationService's `currentUser` is NOT refreshed

3. **Next Profile Load:**
   - ProfileEditViewModel reads from `authService.currentUser`
   - Gets **stale data** from initial login
   - Shows empty arrays because initial user had no preferences

### Why This Happens:

The `AuthenticationService.currentUser` property is only updated in these scenarios:

- During login (line 124)
- During signup (line 84)
- During checkAuthentication (line 48)
- When explicitly calling `updateCurrentUser()` (line 221)

It is **NEVER** updated after profile or preference changes!

## Backend Response Analysis

### `/auth/me` Response Structure:

```javascript
// From auth/index.ts
const userWithPreferences = await authService.getUserWithPreferences(req.userId!);
res.status(200).json({
    success: true,
    data: userProfile  // Includes dietaryPreferences, allergies, mealsPerDay
});
```

### `/auth/profile/preferences` Response:

```javascript
// From profile-preferences.ts
{
    success: true,
    message: 'Preferences updated successfully',
    data: {
        dietaryPreferences: updatedSettings.dietaryPreferences || [],
        allergies: updatedSettings.allergies || [],
        mealsPerDay: updatedSettings.mealsPerDay || 3
    }
}
```

Both endpoints return the correct data, but the iOS app ignores the response.

## Solutions

### Option 1: Refresh User After Save (Recommended) ⭐

```swift
// In ProfileEditViewModel.saveChanges() after line 269:
// Reload profile
await loadProfile()

// Add this to actually refresh from backend:
let freshUser: User = try await apiClient.request(.currentUser)
await authService.updateCurrentUser(freshUser)
originalUser = freshUser
dietaryPreferences = freshUser.dietaryPreferences ?? []
allergies = freshUser.allergies ?? []
mealsPerDay = String(freshUser.mealsPerDay ?? 3)
```

### Option 2: Update AuthService During Save

```swift
// Modify updatePreferences endpoint to return full User object
// Then update authService.currentUser with the response
```

### Option 3: Always Fetch Fresh Data in loadProfile()

```swift
func loadProfile() async {
    isLoading = true
    errorMessage = nil
    defer { isLoading = false }

    // Always fetch fresh data from backend
    do {
        let user: User = try await apiClient.request(.currentUser)
        await authService.updateCurrentUser(user)

        originalUser = user
        name = user.name
        email = user.email
        dietaryPreferences = user.dietaryPreferences ?? []
        allergies = user.allergies ?? []
        mealsPerDay = String(user.mealsPerDay ?? 3)

        Logger.info("Profile loaded - Prefs: \(dietaryPreferences.count), Allergies: \(allergies.count)")
    } catch {
        errorMessage = "Failed to load profile"
        Logger.error("Failed to load profile: \(error)")
    }
}
```

## Recommended Fix Implementation

The cleanest solution is to modify `ProfileEditViewModel.saveChanges()` to fetch fresh user data after successful save:

```swift
// After line 269 in saveChanges():
successMessage = "Profile updated successfully"
Logger.info("Profile saved successfully")

// Fetch fresh user data from backend
do {
    let freshUser: User = try await apiClient.request(.currentUser)
    await authService.updateCurrentUser(freshUser)

    // Update local state with fresh data
    originalUser = freshUser
    dietaryPreferences = freshUser.dietaryPreferences ?? []
    allergies = freshUser.allergies ?? []
    mealsPerDay = String(freshUser.mealsPerDay ?? 3)

    Logger.info("Profile reloaded with fresh data - Prefs: \(dietaryPreferences.count), Allergies: \(allergies.count)")
} catch {
    Logger.warning("Failed to reload profile after save: \(error)")
}
```

## Testing Verification

After implementing the fix, test with these steps:

1. Login to the app
2. Navigate to Profile Edit
3. Add dietary preferences and allergies
4. Save changes
5. Navigate away from Profile Edit
6. Return to Profile Edit
7. **Verify:** Preferences should now persist and show correctly

## Additional Observations

1. **No API Response Parsing:** The app discards the response from `/auth/profile/preferences` which contains the updated data
2. **State Management Gap:** There's no central state management for user data updates
3. **Similar Issues May Exist:** Other profile fields might have the same persistence problem

## Conclusion

The issue is a **classic state synchronization problem**. The iOS app maintains a cached copy of user data that becomes stale after updates. The fix is straightforward: either always fetch fresh data or update the cache after modifications.

The backend is working perfectly - this is purely an iOS app state management issue.
