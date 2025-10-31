# Onboarding Redirect Bug - Root Cause Analysis and Fix

## Issue Summary

Users are being redirected back to the onboarding screen after:

1. Saving dietary preferences in profile settings
2. Selecting and saving photos
3. Any action that triggers a fresh user data fetch from the backend

## Root Cause

The `/auth/me` API endpoint does not return the `hasCompletedOnboarding` field, causing the iOS Swift app to default this value to `false` and redirect users back to onboarding.

### Technical Flow

1. **User Action**: User saves dietary preferences or selects a photo
   - File: `/apps/GTSD/GTSD/Features/Profile/ProfileEditViewModel.swift` (line 255-344)

2. **Profile Update**: App calls `/auth/profile/preferences` endpoint
   - Backend updates user settings successfully
   - Returns updated preferences data

3. **Fresh User Data Fetch**: App refreshes user data to get latest state
   - Calls: `apiClient.request(.currentUser)` (line 323 in ProfileEditViewModel.swift)
   - Endpoint: `GET /auth/me`

4. **Backend Response Missing Field**: `/auth/me` endpoint calls `getUserWithPreferences()`
   - File: `/apps/api/src/routes/auth/service.ts` (lines 286-307)
   - **Bug**: Method returns dietary preferences but NOT `hasCompletedOnboarding`
   - Even though it fetches `settings.onboardingCompleted`, it never includes it in response

5. **Swift Decodes with Default**: Swift User model receives response without `hasCompletedOnboarding`
   - File: `/apps/GTSD/GTSD/Core/Models/User.swift` (line 136)
   - Code: `self.hasCompletedOnboarding = (try? container.decode(Bool.self, forKey: .hasCompletedOnboarding)) ?? false`
   - **Defaults to `false`** when field is missing

6. **Navigation Check**: ContentView checks onboarding status
   - File: `/apps/GTSD/GTSD/GTSDApp.swift` (line 98)
   - Code: `if let user = authService.currentUser, !user.hasCompletedOnboarding`
   - Since `hasCompletedOnboarding` is `false`, shows `OnboardingCoordinator()`

7. **User Redirected**: App shows onboarding screen instead of continuing to main app

## The Fix

### File: `/apps/api/src/routes/auth/service.ts`

**Before** (lines 286-307):

```typescript
async getUserWithPreferences(userId: number): Promise<SelectUser & {
  dietaryPreferences?: string[];
  allergies?: string[];
  mealsPerDay?: number
}> {
  const [user] = await db.select().from(users).where(eq(users.id, userId));

  if (!user) {
    throw new AppError(404, 'User not found');
  }

  // Fetch dietary preferences from userSettings
  const [settings] = await db
    .select()
    .from(userSettings)
    .where(eq(userSettings.userId, userId));

  logger.debug({ userId, hasDietaryPreferences: !!settings?.dietaryPreferences }, 'Fetched user with preferences');

  return {
    ...user,
    dietaryPreferences: settings?.dietaryPreferences || [],
    allergies: settings?.allergies || [],
    mealsPerDay: settings?.mealsPerDay || 3,
    // MISSING: hasCompletedOnboarding field
  };
}
```

**After**:

```typescript
async getUserWithPreferences(userId: number): Promise<SelectUser & {
  dietaryPreferences?: string[];
  allergies?: string[];
  mealsPerDay?: number;
  hasCompletedOnboarding: boolean  // ADDED
}> {
  const [user] = await db.select().from(users).where(eq(users.id, userId));

  if (!user) {
    throw new AppError(404, 'User not found');
  }

  // Fetch dietary preferences from userSettings
  const [settings] = await db
    .select()
    .from(userSettings)
    .where(eq(userSettings.userId, userId));

  const hasCompletedOnboarding = settings?.onboardingCompleted ?? false;  // ADDED

  logger.debug({
    userId,
    hasDietaryPreferences: !!settings?.dietaryPreferences,
    hasCompletedOnboarding  // ADDED to logging
  }, 'Fetched user with preferences');

  return {
    ...user,
    dietaryPreferences: settings?.dietaryPreferences || [],
    allergies: settings?.allergies || [],
    mealsPerDay: settings?.mealsPerDay || 3,
    hasCompletedOnboarding,  // ADDED to response
  };
}
```

## Why This Fixes the Issue

1. **Backend now returns complete user data**: The `/auth/me` endpoint includes `hasCompletedOnboarding: true` for users who have completed onboarding

2. **Swift app receives correct value**: Instead of defaulting to `false`, the User model now receives the actual value from the backend

3. **Navigation works correctly**: ContentView's check `!user.hasCompletedOnboarding` now evaluates to `false` for completed users, so they stay in the main app

4. **Consistent with other auth endpoints**: The `signup()` and `login()` methods already return `hasCompletedOnboarding` in their responses (lines 85 and 152 in service.ts)

## Data Flow After Fix

```
User saves preferences
  → Backend updates preferences
  → App fetches fresh user data from /auth/me
  → Backend returns {
      ...user,
      dietaryPreferences: [...],
      allergies: [...],
      mealsPerDay: 3,
      hasCompletedOnboarding: true  ✅ Now included
    }
  → Swift decodes hasCompletedOnboarding: true
  → ContentView check: !true = false
  → User stays in main app ✅
```

## Testing Verification

### Manual Testing Steps:

1. Login as an existing user who has completed onboarding
2. Navigate to Profile > Edit Profile
3. Update dietary preferences (add/remove items)
4. Save changes
5. **Expected**: User remains in profile screen, sees success message
6. **Before fix**: User would be redirected to onboarding
7. **After fix**: User stays in main app

### API Response Verification:

```bash
# Test the /auth/me endpoint
curl -X GET http://localhost:3000/auth/me \
  -H "Authorization: Bearer <access_token>"

# Should return:
{
  "success": true,
  "data": {
    "id": 1,
    "email": "user@example.com",
    "name": "Test User",
    "emailVerified": true,
    "hasCompletedOnboarding": true,  // ✅ Now present
    "dietaryPreferences": ["vegetarian"],
    "allergies": [],
    "mealsPerDay": 3
  }
}
```

## Related Code Locations

### Backend:

- `/apps/api/src/routes/auth/service.ts` - AuthService class (FIXED)
- `/apps/api/src/routes/auth/index.ts` - Auth routes (uses AuthService)
- `/apps/api/src/db/schema.ts` - Database schema with `user_settings.onboarding_completed` field

### iOS App:

- `/apps/GTSD/GTSD/Core/Models/User.swift` - User model with hasCompletedOnboarding field
- `/apps/GTSD/GTSD/GTSDApp.swift` - ContentView navigation logic checking hasCompletedOnboarding
- `/apps/GTSD/GTSD/Features/Profile/ProfileEditViewModel.swift` - Profile save flow that triggers user data refresh
- `/apps/GTSD/GTSD/Core/Services/AuthenticationService.swift` - Authentication service managing currentUser state

## Impact

### Before Fix:

- ❌ Users redirected to onboarding after saving preferences
- ❌ Users redirected to onboarding after selecting photos
- ❌ Poor user experience - users couldn't update their profile
- ❌ Existing users forced to re-complete onboarding

### After Fix:

- ✅ Users stay in main app after saving preferences
- ✅ Users can update profile without interruption
- ✅ Consistent behavior across all profile actions
- ✅ hasCompletedOnboarding field properly tracked

## Deployment Notes

1. **Backend Change**: Single file change in `/apps/api/src/routes/auth/service.ts`
2. **No Migration Required**: Database schema already has `onboarding_completed` field
3. **No iOS Changes Required**: Swift app already expects and handles this field
4. **Backward Compatible**: Change only adds a field, doesn't modify existing behavior
5. **No Breaking Changes**: Existing API consumers will receive additional field

## Additional Improvements

This fix also ensures consistency with other auth endpoints:

- `POST /auth/signup` already returns `hasCompletedOnboarding`
- `POST /auth/login` already returns `hasCompletedOnboarding`
- `GET /auth/me` now also returns `hasCompletedOnboarding` ✅

All auth endpoints now provide complete user state information.
