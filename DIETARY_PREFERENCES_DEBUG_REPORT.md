# Dietary Preferences Display Issue - Debug Report

## Issue Summary

User dietary preferences and allergies are successfully saved in the database but were not showing in the iOS UI.

## Root Cause Identified

The ProfileView was missing UI components to display dietary preferences, allergies, and meals per day.

## Database Verification ✓

- **User ID 23**:
  - dietary_preferences = ["halal"]
  - allergies = ["fish", "pork"]
  - meals_per_day = 4
- **Status**: Data IS in the database correctly

## Data Flow Analysis

### 1. Backend API (/auth/me) ✓

**Location**: `/apps/api/src/routes/auth/index.ts:328`

```typescript
const userWithPreferences = await authService.getUserWithPreferences(req.userId!);
```

- Calls `getUserWithPreferences` method
- Returns user data with dietary preferences from `user_settings` table

### 2. Backend Service Method ✓

**Location**: `/apps/api/src/routes/auth/service.ts:288-316`

```typescript
async getUserWithPreferences(userId: number) {
  // ... fetches user
  const [settings] = await db.select().from(userSettings).where(eq(userSettings.userId, userId));
  return {
    ...user,
    dietaryPreferences: settings?.dietaryPreferences || [],
    allergies: settings?.allergies || [],
    mealsPerDay: settings?.mealsPerDay || 3,
    // ...
  };
}
```

- Properly joins `user_settings` table
- Returns dietary preferences, allergies, and mealsPerDay

### 3. iOS User Model ✓

**Location**: `/apps/GTSD/GTSD/Core/Models/User.swift`

- Lines 22-24: Properties defined
- Lines 139-141: Proper decoding implemented

```swift
self.dietaryPreferences = try? container.decodeIfPresent([String].self, forKey: .dietaryPreferences)
self.allergies = try? container.decodeIfPresent([String].self, forKey: .allergies)
self.mealsPerDay = try? container.decodeIfPresent(Int.self, forKey: .mealsPerDay)
```

### 4. iOS AuthenticationService ✓

**Location**: `/apps/GTSD/GTSD/Core/Services/AuthenticationService.swift:47`

- Fetches user via `.currentUser` endpoint (maps to `/auth/me`)
- Stores in `currentUser` property

### 5. iOS ProfileViewModel ✓

**Location**: `/apps/GTSD/GTSD/Features/Profile/ProfileViewModel.swift:23-25`

```swift
var currentUser: User? {
    authService.currentUser
}
```

- Gets currentUser from authService

### 6. iOS ProfileView ❌ → ✓ FIXED

**Location**: `/apps/GTSD/GTSD/Features/Profile/ProfileView.swift`

- **ISSUE**: Missing UI components to display dietary preferences
- **SOLUTION**: Added display section at lines 43-105

### 7. iOS ProfileEditView ✓

**Location**: `/apps/GTSD/GTSD/Features/Profile/ProfileEditView.swift`

- Lines 209-240: Has UI for editing preferences
- Properly loads and saves dietary preferences

## Solution Implemented

### 1. Created TagView Component

**File**: `/apps/GTSD/GTSD/Components/TagView.swift`

- Reusable tag display component
- Supports different styles for preferences vs allergies

### 2. Updated ProfileView

**File**: `/apps/GTSD/GTSD/Features/Profile/ProfileView.swift`
Added dietary information display section (lines 43-105):

- Shows dietary preferences as primary-styled tags
- Shows allergies as warning-styled tags
- Displays meals per day count
- Only shows section if user has any dietary information

### 3. Added Debug Logging

Enhanced logging in:

- `AuthenticationService.swift:51` - Logs preference counts when user is loaded
- `APIClient.swift:94-99` - Logs raw `/auth/me` response for debugging
- `ProfileEditViewModel.swift:144,211-213,256` - Logs preference updates

## Data Update Flow

### When User Edits Preferences:

1. **ProfileEditView** → User modifies tags
2. **ProfileEditViewModel.saveChanges()** → Calls API
3. **API Endpoint** `/auth/profile/preferences` → Updates database
4. **Fresh Data Fetch** → Gets updated user from `/auth/me`
5. **AuthService Update** → `authService.updateCurrentUser(freshUser)`
6. **UI Refresh** → ProfileView shows updated preferences

## Testing Recommendations

1. **Verify API Response**:

   ```bash
   curl -H "Authorization: Bearer <token>" http://localhost:3001/auth/me | jq
   ```

   Should return:

   ```json
   {
     "success": true,
     "data": {
       "id": 23,
       "dietaryPreferences": ["halal"],
       "allergies": ["fish", "pork"],
       "mealsPerDay": 4
       // ... other fields
     }
   }
   ```

2. **iOS App Testing**:
   - Build and run the app
   - Navigate to Profile tab
   - Should now see "Dietary Information" section
   - Edit profile to modify preferences
   - Changes should persist and display immediately

## Key Files Modified

1. `/apps/GTSD/GTSD/Features/Profile/ProfileView.swift` - Added dietary info display
2. `/apps/GTSD/GTSD/Components/TagView.swift` - Created tag component
3. `/apps/GTSD/GTSD/Core/Services/AuthenticationService.swift` - Added debug logging
4. `/apps/GTSD/GTSD/Core/Network/APIClient.swift` - Added response logging

## Potential Future Improvements

1. Add dietary preferences to ProfileHeader for quick visibility
2. Consider adding icons for common dietary preferences (vegetarian, vegan, etc.)
3. Add preference validation to prevent duplicates
4. Consider grouping related allergies (e.g., "Seafood" for fish/shellfish)

## Conclusion

The issue was a missing UI component in ProfileView. The data flow from backend to iOS was working correctly, but the ProfileView simply wasn't displaying the available data. The fix adds a new "Dietary Information" section that shows dietary preferences, allergies, and meals per day when available.
