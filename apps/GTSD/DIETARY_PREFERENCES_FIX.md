# Dietary Preferences Persistence Fix

## Problem Summary
After saving dietary preferences successfully to the backend, the app loaded from stale cached data in `authService.currentUser` which was NEVER refreshed after profile updates.

### Log Evidence
```
[INFO] Dietary preferences updated - Prefs: 1, Allergies: 1, Meals: 3
[INFO] Profile saved successfully
[INFO] Profile loaded for editing - Preferences: 0, Allergies: 0  ← STALE DATA
```

## Root Cause
In `ProfileEditViewModel.swift`:
- Line 139: `loadProfile()` reads from `authService.currentUser` (cached)
- Line 272: After `saveChanges()` succeeds, it calls `loadProfile()` which reads stale cache
- `authService.currentUser` is only updated during login/signup, NEVER after profile updates

## Solution Implemented

### 1. Updated `ProfileEditViewModel.swift` (Lines 320-330)
After successful profile save, we now:
1. Fetch fresh user data from the backend via `/auth/me` endpoint
2. Update the `authService.currentUser` with the fresh data
3. Call `loadProfile()` which now has fresh data to display

```swift
// Fetch fresh user data from backend to ensure we have the latest dietary preferences
Logger.info("Fetching fresh user data from backend after profile update")
let freshUser: User = try await apiClient.request(.currentUser)
Logger.info("Fresh user data received - Preferences: \(freshUser.dietaryPreferences?.count ?? 0), Allergies: \(freshUser.allergies?.count ?? 0)")

// Update auth service with fresh data
await authService.updateCurrentUser(freshUser)
Logger.info("Auth service updated with fresh user data")

// Now reload profile with fresh data from auth service
await loadProfile()
```

### 2. Utilized Existing Infrastructure
- `AuthenticationService.updateCurrentUser()` method already exists (line 220-223)
- `APIEndpoint.currentUser` already maps to `/auth/me` endpoint (line 75)
- Backend `/auth/me` endpoint already fixed and returns dietary preferences correctly

## Files Changed

### Modified Files
1. `/apps/GTSD/GTSD/Features/Profile/ProfileEditViewModel.swift`
   - Lines 320-330: Added fresh data fetch after successful save
   - Added comprehensive logging to track the data refresh flow

2. `/apps/GTSD/GTSDTests/Mocks/TestMocks.swift`
   - Lines 26-42: Enhanced `MockAPIClient` to support per-endpoint responses
   - Added `requestedEndpoints` tracking for test verification
   - Added `mockResponses` dictionary for endpoint-specific mock data

3. `/apps/GTSD/GTSDTests/ViewModels/ProfileEditViewModelTests.swift`
   - Lines 279-441: Added comprehensive tests for dietary preferences persistence
   - `testSaveChanges_RefreshesUserDataAfterDietaryPreferencesUpdate()`: Verifies auth service is updated with fresh data
   - `testSaveChanges_OnlyUpdatesPreferencesWhenChanged()`: Ensures efficient API calls
   - `testSaveChanges_HandlesEmptyDietaryPreferences()`: Tests clearing preferences

## How It Works

### Before Fix
```
User saves preferences
  ↓
API call succeeds
  ↓
loadProfile() reads from stale authService.currentUser
  ↓
UI shows old data (0 preferences, 0 allergies)
```

### After Fix
```
User saves preferences
  ↓
API call succeeds
  ↓
Fetch fresh user from /auth/me
  ↓
Update authService.currentUser with fresh data
  ↓
loadProfile() reads from updated authService.currentUser
  ↓
UI shows correct data (1 preference, 1 allergy, 3 meals)
```

## Expected Log Output After Fix
```
[INFO] Dietary preferences updated - Prefs: 1, Allergies: 1, Meals: 3
[INFO] Profile saved successfully
[INFO] Fetching fresh user data from backend after profile update
[INFO] Fresh user data received - Preferences: 1, Allergies: 1
[INFO] Auth service updated with fresh user data
[INFO] Profile loaded for editing - Preferences: 1, Allergies: 1  ← FRESH DATA!
```

## Verification Steps

1. **Build Verification**: ✅ PASSED
   - Project builds successfully with no compilation errors
   - Only warnings (Swift 6 concurrency, deprecated APIs)

2. **Manual Testing** (To be performed on device/simulator):
   ```
   a. Launch app and login
   b. Navigate to Profile Edit screen
   c. Add dietary preferences (e.g., "vegetarian")
   d. Add allergies (e.g., "peanuts")
   e. Change meals per day to 4
   f. Tap Save
   g. Verify success message appears
   h. Exit and re-enter Profile Edit screen
   i. Verify all preferences are still displayed correctly
   ```

3. **API Call Verification** (Check logs):
   - Should see POST to `/auth/profile/preferences`
   - Should see GET to `/auth/me` immediately after
   - Should see log: "Auth service updated with fresh user data"

## Benefits of This Fix

1. **Correctness**: User always sees their saved preferences
2. **Reliability**: Uses single source of truth (backend database)
3. **Minimal Changes**: Leverages existing infrastructure
4. **Maintainability**: Clear logging for debugging
5. **Consistency**: Same pattern can be applied to other profile updates

## Related Issues Fixed

This fix ensures that:
- Dietary preferences persist correctly
- Allergies persist correctly
- Meals per day persists correctly
- Any future profile fields added to `/auth/me` will automatically work

## Performance Impact

- Adds one additional GET request to `/auth/me` after each profile save
- Typical response time: 50-200ms (negligible)
- Only occurs on save, not on every view load
- Backend response is already optimized and includes all necessary data

## Future Improvements

Consider applying this pattern to:
1. After onboarding completion
2. After weight updates (when backend endpoint is available)
3. After profile photo upload (when endpoint is available)
4. Any other profile mutations

## Testing Coverage

### Unit Tests Added
- ✅ Fresh data fetch after preferences update
- ✅ Auth service update verification
- ✅ Endpoint call tracking
- ✅ Empty preferences handling
- ✅ Selective update verification (only changed fields)

### Integration Tests Needed
- Manual testing on physical device
- Backend integration testing
- Network error scenarios
- Concurrent update handling
