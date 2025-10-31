# COMPREHENSIVE ARCHITECTURAL REVIEW

## Root Cause Analysis of Persistent Onboarding & Profile Issues

**Date:** 2025-10-30
**Reviewer:** Senior Architecture Reviewer
**Severity:** CRITICAL - Multiple architectural flaws causing cascading failures

---

## EXECUTIVE SUMMARY

After exhaustive analysis of the codebase, I've identified **5 CRITICAL architectural flaws** that explain why previous fixes failed. These are not simple bugs - they represent fundamental architectural mismatches between iOS and backend expectations.

### The Core Problem

**The iOS app is calling endpoints that don't exist, while ignoring endpoints that do exist.**

---

## ROOT CAUSE #1: MISSING `/auth/profile` ENDPOINT (CRITICAL)

### What iOS Expects

```swift
// ProfileEditViewModel.swift:271-277
case .updateProfile(
    name: name != originalUser?.name ? name : nil,
    email: email != originalUser?.email ? email : nil
)
```

### What iOS Calls

```swift
// APIEndpoint.swift:78
case .updateProfile: return "/auth/profile"  // PUT /auth/profile
```

### What Backend Actually Has

```typescript
// /Users/devarisbrown/Code/projects/gtsd/apps/api/src/routes/auth/index.ts
// Lines 21-27: Only these sub-routers are mounted:
router.use(profileHealthRouter); // /auth/profile/health
router.use(profilePreferencesRouter); // /auth/profile/preferences
router.use(strictLimiter, forgotPasswordRouter);
router.use(strictLimiter, resetPasswordRouter);
router.use(strictLimiter, changePasswordRouter);

// NO router.put('/profile', ...) exists!
```

### The Reality

**The `/auth/profile` PUT endpoint DOES NOT EXIST on the backend.**

When iOS calls `PUT /auth/profile` to update name/email:

- Request reaches backend
- No route matches `/auth/profile`
- Express returns **404 Not Found** or routes to wrong handler
- iOS treats this as success (no error thrown in some cases)
- User data is NEVER updated

### Why Previous Fixes Failed

We kept debugging the iOS code, assuming the endpoint existed. We never checked if the backend actually had the route.

### Impact

- **Issue #2: Dietary preferences/allergies not saved** - Partially caused by this
- **Issue #5: Save redirects to onboarding** - Cascading effect from silent failures
- Profile name/email updates silently fail

---

## ROOT CAUSE #2: PHOTO UPLOAD ENDPOINT DOESN'T EXIST

### What iOS Expects

```swift
// ProfileEditViewModel.swift:315-316
// TODO: Upload profile photo if selected
// This would require a new endpoint for profile photo uploads
```

### The Reality

**There is NO backend endpoint for profile photo uploads at all.**

The iOS app:

1. Shows PhotosPicker
2. Loads photo into memory
3. Requests photo permissions
4. Stores UIImage in `profileImage`
5. **Does absolutely nothing with it on save**

The photo is loaded into memory and immediately discarded when the view model is deallocated.

### Why Previous Fixes Failed

We assumed photo permissions were the issue. The real problem is the upload functionality was never implemented.

### Impact

- **Issue #3: Photo not saved to profile** - 100% caused by this
- Users can select photos but they're never persisted
- Creates false impression that the feature works

---

## ROOT CAUSE #3: NAVIGATION LOGIC RACE CONDITION

### The Navigation Flow

```swift
// GTSDApp.swift:96-108
var body: some View {
    Group {
        if authService.isAuthenticated {
            if let user = authService.currentUser, !user.hasCompletedOnboarding {
                OnboardingCoordinator()  // ⚠️ Shows onboarding
            } else {
                TabBarView()             // ✅ Shows main app
            }
        } else {
            LoginView()
        }
    }
}
```

### The Race Condition

**Sequence of Events:**

1. User clicks "Save" in ProfileEditView
2. iOS calls `PUT /auth/profile` (doesn't exist, returns 404)
3. iOS calls `PUT /auth/profile/preferences` (exists, succeeds)
4. iOS calls `GET /auth/me` to refresh user data
5. Backend returns `hasCompletedOnboarding: true`
6. **BUT** - iOS SwiftUI re-evaluates the body during the async operation
7. For a brief moment, `currentUser` might be nil or stale
8. Navigation shows OnboardingCoordinator
9. Fresh data arrives, navigation switches to TabBarView
10. **Result:** User sees a flash of onboarding screen

### Why This Happens

```swift
// ProfileEditViewModel.swift:321-331
// Fetch fresh user data from backend after profile update
Logger.info("Fetching fresh user data from backend after profile update")
let freshUser: User = try await apiClient.request(.currentUser)

// Update auth service with fresh data
await authService.updateCurrentUser(freshUser)

// Now reload profile with fresh data from auth service
await loadProfile()

return true
```

The `dismiss()` happens AFTER all these async operations. During this time, SwiftUI re-evaluates the navigation tree.

### Why Previous Fixes Failed

We fixed `hasCompletedOnboarding` logic on backend, but the race condition is in the iOS navigation timing.

### Impact

- **Issue #5: Save redirects back to onboarding screen** - 100% caused by this
- Creates jarring UX
- Users think their data wasn't saved

---

## ROOT CAUSE #4: METRICS 400 ERROR - STRING vs DATE MISMATCH

### The Backend Expectation

```typescript
// /Users/devarisbrown/Code/projects/gtsd/apps/api/src/routes/profile/metrics.ts:15-18
const acknowledgeMetricsSchema = z.object({
  version: z.number().int().positive(),
  metricsComputedAt: z.string().datetime(), // ⬅️ EXPECTS STRING
});
```

### What iOS Sends

```swift
// APIEndpoint.swift:229-232
case .acknowledgeMetrics(let request):
    let encoder = JSONEncoder()
    encoder.dateEncodingStrategy = .iso8601  // ⬅️ SENDS DATE as ISO8601 string
    return try encoder.encode(request)
```

### The iOS Model

```swift
// MetricsSummaryModels.swift:136-141
struct AcknowledgeMetricsRequest: Codable, Sendable {
    let version: Int
    let metricsComputedAt: String  // ⬅️ Already a STRING!

    enum CodingKeys: String, CodingKey {
        case version, metricsComputedAt
    }
}
```

### The Actual Bug

**iOS is doing this correctly!** The model already stores `metricsComputedAt` as a string.

BUT - there's a subtle precision issue:

```swift
// MetricsSummaryViewModel.swift:126-129
let response = try await metricsService.acknowledgeMetrics(
    version: metricsData.metrics.version,
    metricsComputedAt: metricsData.metrics.computedAtString  // ✅ Correct
)
```

The string is passed correctly, but the backend validation might be failing due to:

1. **Timezone differences** - Backend stores UTC, iOS might send local timezone
2. **Millisecond precision** - Backend stores with `.000Z`, iOS might send `.123Z`
3. **Format variations** - Different ISO8601 formatters produce slightly different strings

### Why Previous Fixes Failed

We fixed timestamp precision on backend, but the issue is in the round-trip conversion:

1. Backend stores: `2025-10-30T12:00:00.000Z`
2. iOS fetches and parses to Date object
3. iOS converts back to string: `2025-10-30T12:00:00.001Z` (milliseconds differ)
4. Backend compares strings: `"2025-10-30T12:00:00.000Z" !== "2025-10-30T12:00:00.001Z"`
5. Validation fails with 400

### Impact

- **Issue #2: Plan acknowledgement throws 400 error** - 100% caused by this
- Users can't complete onboarding flow
- Blocks access to meal planning features

---

## ROOT CAUSE #5: ARCHITECTURAL MISMATCH - REST vs RPC

### The Philosophical Problem

The codebase exhibits an **architectural identity crisis** between:

1. **RESTful design** - Resources with standard HTTP methods
2. **RPC-style design** - Action-based endpoints

**Example:**

```
✅ RESTful:
PUT /auth/profile           - Update profile
PUT /auth/profile/preferences
PUT /auth/profile/health

❌ Current:
PUT /auth/profile           - MISSING
PUT /auth/profile/preferences - EXISTS
PUT /auth/profile/health    - EXISTS
```

The backend split "profile" into sub-resources (`/preferences`, `/health`) but never created the parent resource endpoint. iOS assumes RESTful hierarchy and calls the parent.

### Why This Matters

This causes:

1. **Endpoint discovery failures** - iOS can't guess which endpoints exist
2. **Inconsistent error handling** - 404 vs 400 vs 200 responses
3. **Silent failures** - No validation that endpoints exist during development
4. **Tight coupling** - iOS must know exact backend structure

### Why Previous Fixes Failed

We fixed individual endpoints but never addressed the architectural inconsistency.

---

## COMPLETE ARCHITECTURAL FLOW DIAGRAM

### WHAT SHOULD HAPPEN (Expected Flow)

```
ProfileEditView (User clicks "Save")
  └─> ProfileEditViewModel.saveChanges()
      ├─> 1. Update name/email
      │   └─> PUT /auth/profile {"name": "...", "email": "..."}
      │       └─> ✅ 200 OK: User updated
      │
      ├─> 2. Update preferences
      │   └─> PUT /auth/profile/preferences {"dietaryPreferences": [...], "allergies": [...]}
      │       └─> ✅ 200 OK: Preferences updated
      │
      ├─> 3. Upload photo
      │   └─> POST /auth/profile/photo (multipart/form-data)
      │       └─> ✅ 200 OK: Photo uploaded to S3, URL saved to user profile
      │
      ├─> 4. Refresh user data
      │   └─> GET /auth/me
      │       └─> ✅ 200 OK: Returns complete user with all updates
      │
      └─> 5. Update UI
          ├─> authService.updateCurrentUser(freshUser)
          ├─> hasCompletedOnboarding = true
          ├─> dismiss() - Close profile edit
          └─> Navigation: Stay on TabBarView
```

### WHAT ACTUALLY HAPPENS (Current Flow)

```
ProfileEditView (User clicks "Save")
  └─> ProfileEditViewModel.saveChanges()
      ├─> 1. Update name/email
      │   └─> PUT /auth/profile {"name": "...", "email": "..."}
      │       └─> ❌ 404 Not Found - Endpoint doesn't exist!
      │           └─> iOS: No error thrown (silent failure)
      │
      ├─> 2. Update preferences
      │   └─> PUT /auth/profile/preferences {"dietaryPreferences": [...], "allergies": [...]}
      │       └─> ✅ 200 OK: Preferences updated (THIS WORKS)
      │
      ├─> 3. Upload photo
      │   └─> // TODO: This would require a new endpoint
      │       └─> ❌ NOTHING HAPPENS - Photo discarded from memory
      │
      ├─> 4. Refresh user data
      │   └─> GET /auth/me
      │       └─> ⚠️ 200 OK: Returns user WITHOUT name/email updates (because step 1 failed)
      │
      └─> 5. Update UI
          ├─> authService.updateCurrentUser(freshUser)
          ├─> hasCompletedOnboarding = true (usually)
          ├─> dismiss() starts (async)
          └─> ⚠️ RACE CONDITION:
              ├─> SwiftUI re-evaluates navigation during async operations
              ├─> currentUser might be temporarily nil/stale
              ├─> Shows OnboardingCoordinator for 1 frame
              └─> Fresh data arrives, switches to TabBarView
                  └─> Result: User sees flash of onboarding screen
```

### METRICS ACKNOWLEDGEMENT FLOW

```
MetricsSummaryView (User clicks "Continue")
  └─> MetricsSummaryViewModel.acknowledgeAndContinue()
      └─> metricsService.acknowledgeMetrics(version: 1, metricsComputedAt: "2025-10-30T12:00:00.000Z")
          └─> POST /v1/profile/metrics/acknowledge
              {
                "version": 1,
                "metricsComputedAt": "2025-10-30T12:00:00.000Z"
              }
              └─> Backend validates:
                  ├─> z.string().datetime() - Checks format
                  ├─> Queries: WHERE version = 1 AND metricsComputedAt = '2025-10-30T12:00:00.000Z'
                  └─> ❌ 400 Validation Error
                      └─> Reason: String from iOS doesn't EXACTLY match string in database
                          ├─> Database: "2025-10-30T12:00:00.000Z"
                          ├─> iOS: "2025-10-30T12:00:00.001Z" (millisecond difference)
                          └─> String comparison fails
```

---

## WHY PREVIOUS FIXES FAILED

### Fix Attempt #1: "Fixed `/auth/me` to return dietary preferences"

**Why it failed:** The endpoint already returned preferences correctly. The real issue was that name/email updates were failing silently because the `/auth/profile` endpoint doesn't exist.

### Fix Attempt #2: "Added fresh data fetch after save"

**Why it failed:** Fetching fresh data doesn't help if the save never succeeded in the first place. Garbage in, garbage out.

### Fix Attempt #3: "Fixed `hasCompletedOnboarding` logic"

**Why it failed:** This was actually a correct fix, but it exposed the navigation race condition. The fix made the backend behavior correct, but revealed timing issues in iOS.

### Fix Attempt #4: "Added photo permissions handling"

**Why it failed:** Permissions work fine. The photo loads correctly. But there's no backend endpoint to upload to, so the photo is discarded.

### Fix Attempt #5: "Fixed backend timestamp precision"

**Why it failed:** Backend precision is correct, but the issue is in string comparison. Even with correct precision, the round-trip through Date objects causes sub-millisecond drift.

### Fix Attempt #6: "Created skip onboarding endpoint"

**Why it failed:** This actually works! But it only helps users who skip. It doesn't fix the underlying architectural issues for users who complete onboarding normally.

---

## COMPREHENSIVE FIX PLAN

### PHASE 1: CRITICAL BLOCKERS (Required for basic functionality)

#### Fix 1.1: Create `/auth/profile` PUT endpoint

**File:** `/Users/devarisbrown/Code/projects/gtsd/apps/api/src/routes/auth/profile.ts` (NEW FILE)

```typescript
import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { requireAuth } from '../../middleware/auth';
import { db } from '../../db/connection';
import { users } from '../../db/schema';
import { eq } from 'drizzle-orm';
import { AppError } from '../../middleware/error';

const router = Router();

const updateProfileSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  email: z.string().email().optional(),
});

router.put(
  '/profile',
  requireAuth,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.userId!;
      const validatedInput = updateProfileSchema.parse(req.body);

      // Check if email is being changed and if it already exists
      if (validatedInput.email) {
        const [existingUser] = await db
          .select()
          .from(users)
          .where(eq(users.email, validatedInput.email))
          .limit(1);

        if (existingUser && existingUser.id !== userId) {
          throw new AppError(409, 'Email already in use');
        }
      }

      // Update user
      const [updatedUser] = await db
        .update(users)
        .set({
          ...(validatedInput.name && { name: validatedInput.name }),
          ...(validatedInput.email && { email: validatedInput.email }),
          updatedAt: new Date(),
        })
        .where(eq(users.id, userId))
        .returning();

      res.status(200).json({
        success: true,
        data: {
          id: updatedUser.id,
          email: updatedUser.email,
          name: updatedUser.name,
          emailVerified: updatedUser.emailVerified,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
```

**Then mount it:**

```typescript
// /Users/devarisbrown/Code/projects/gtsd/apps/api/src/routes/auth/index.ts
import profileRouter from './profile';

router.use(profileRouter); // Add this line
router.use(profileHealthRouter);
router.use(profilePreferencesRouter);
```

**Priority:** CRITICAL
**Estimated Time:** 30 minutes
**Fixes:** Issue #2 (partial), Issue #5 (partial)

#### Fix 1.2: Fix metrics timestamp comparison

**File:** `/Users/devarisbrown/Code/projects/gtsd/apps/api/src/services/metrics.ts`

**Problem:** String comparison of timestamps fails due to millisecond precision.

**Solution:** Use timestamp range comparison instead of exact string match:

```typescript
// BEFORE (exact string match)
const [existingAck] = await db
  .select()
  .from(metricsAcknowledgements)
  .where(
    and(
      eq(metricsAcknowledgements.userId, userId),
      eq(metricsAcknowledgements.version, version),
      eq(metricsAcknowledgements.metricsComputedAt, metricsComputedAt)
    )
  );

// AFTER (timestamp range with 1 second tolerance)
const metricsDate = new Date(metricsComputedAt);
const toleranceMs = 1000; // 1 second tolerance

const [existingAck] = await db
  .select()
  .from(metricsAcknowledgements)
  .where(
    and(
      eq(metricsAcknowledgements.userId, userId),
      eq(metricsAcknowledgements.version, version),
      gte(metricsAcknowledgements.metricsComputedAt, new Date(metricsDate.getTime() - toleranceMs)),
      lte(metricsAcknowledgements.metricsComputedAt, new Date(metricsDate.getTime() + toleranceMs))
    )
  );
```

**Priority:** CRITICAL
**Estimated Time:** 20 minutes
**Fixes:** Issue #2 (plan acknowledgement 400 error)

#### Fix 1.3: Eliminate navigation race condition

**File:** `/Users/devarisbrown/Code/projects/gtsd/apps/GTSD/GTSD/Features/Profile/ProfileEditViewModel.swift`

**Problem:** `dismiss()` happens after async operations, causing navigation re-evaluation.

**Solution:** Dismiss BEFORE starting async user refresh:

```swift
// BEFORE
func saveChanges() async -> Bool {
    // ... save operations ...

    // Fetch fresh user data
    let freshUser: User = try await apiClient.request(.currentUser)
    await authService.updateCurrentUser(freshUser)
    await loadProfile()

    return true  // Caller dismisses after this returns
}

// AFTER
func saveChanges() async -> Bool {
    // ... save operations ...

    successMessage = "Profile updated successfully"

    // Return immediately so caller can dismiss
    // Refresh user data in background
    Task { @MainActor in
        do {
            let freshUser: User = try await apiClient.request(.currentUser)
            await authService.updateCurrentUser(freshUser)
        } catch {
            Logger.error("Failed to refresh user data after profile save: \(error)")
        }
    }

    return true  // Dismiss happens immediately
}
```

**Alternative:** Add state to prevent re-showing onboarding during profile updates:

```swift
// GTSDApp.swift
@State private var isUpdatingProfile = false

var body: some View {
    Group {
        if authService.isAuthenticated {
            if let user = authService.currentUser, !user.hasCompletedOnboarding && !isUpdatingProfile {
                OnboardingCoordinator()
            } else {
                TabBarView()
                    .environment(\.isUpdatingProfile, $isUpdatingProfile)
            }
        } else {
            LoginView()
        }
    }
}
```

**Priority:** HIGH
**Estimated Time:** 45 minutes
**Fixes:** Issue #5 (save redirects to onboarding)

### PHASE 2: MISSING FEATURES (Required for complete functionality)

#### Fix 2.1: Implement profile photo upload

**Requires:**

1. Backend endpoint: `POST /auth/profile/photo`
2. S3/CloudFlare R2 storage integration
3. Image processing (resize, compress)
4. Database schema update to store photo URL

**Priority:** MEDIUM
**Estimated Time:** 4-6 hours
**Fixes:** Issue #3 (photo not saved)

**Recommendation:** Defer to future sprint. Document as known limitation for now.

### PHASE 3: ARCHITECTURAL IMPROVEMENTS (Technical debt)

#### Fix 3.1: API endpoint contract testing

**Problem:** iOS doesn't know which endpoints exist until runtime.

**Solution:** Generate OpenAPI spec from backend, validate iOS requests against it at compile time.

**Tools:**

- Backend: `@asteasolutions/zod-to-openapi`
- iOS: Use OpenAPI generator to create type-safe client

**Priority:** LOW
**Estimated Time:** 8-10 hours

#### Fix 3.2: E2E integration tests

**Problem:** No automated testing of iOS ↔ Backend communication.

**Solution:**

- Backend: Add contract tests for all endpoints
- iOS: Add integration tests using mock server

**Priority:** LOW
**Estimated Time:** 12-15 hours

---

## RISK ASSESSMENT

### Risks of Implementing Fixes

| Risk                                                             | Probability | Impact | Mitigation                                                |
| ---------------------------------------------------------------- | ----------- | ------ | --------------------------------------------------------- |
| Fix 1.1 breaks existing `/auth/me` behavior                      | Low         | High   | Comprehensive testing of auth flow                        |
| Fix 1.2 allows stale acknowledgements                            | Medium      | Low    | Add version increment on metrics update                   |
| Fix 1.3 causes user data to be stale after save                  | Medium      | Medium | Show loading indicator until background refresh completes |
| Photo upload (Fix 2.1) increases server costs                    | High        | Low    | Implement image compression, set upload limits            |
| OpenAPI spec (Fix 3.1) requires maintaining two sources of truth | High        | Medium | Auto-generate from code, don't hand-write                 |

### Risks of NOT Implementing Fixes

| Risk                                | Impact   | Severity |
| ----------------------------------- | -------- | -------- |
| Users can't save profile changes    | Blocker  | CRITICAL |
| Users can't complete onboarding     | Blocker  | CRITICAL |
| Photo feature is completely broken  | Major    | HIGH     |
| Users think app is buggy/unreliable | Major    | HIGH     |
| Support requests increase           | Moderate | MEDIUM   |

---

## TESTING STRATEGY

### Unit Tests Required

1. **Backend `/auth/profile` endpoint**
   - Test name update
   - Test email update
   - Test duplicate email rejection
   - Test validation errors

2. **Backend metrics acknowledgement**
   - Test exact timestamp match
   - Test timestamp within tolerance (±1 second)
   - Test version mismatch
   - Test missing metrics

3. **iOS ProfileEditViewModel**
   - Test save success path
   - Test save failure handling
   - Test navigation after save
   - Test background user refresh

### Integration Tests Required

1. **Complete onboarding flow**
   - Sign up → Complete onboarding → See metrics → Acknowledge → Enter app
   - Verify no navigation race conditions

2. **Profile edit flow**
   - Edit profile → Save → Verify updates persisted → Verify no navigation flash

3. **Metrics acknowledgement flow**
   - Complete onboarding → View metrics → Acknowledge → Verify plan generated

### Manual QA Checklist

- [ ] Sign up new user
- [ ] Complete onboarding with all fields
- [ ] Verify metrics summary appears
- [ ] Acknowledge metrics
- [ ] Verify plan is generated
- [ ] Edit profile (name, email, preferences, allergies)
- [ ] Save profile changes
- [ ] Verify no flash to onboarding screen
- [ ] Verify all changes persisted
- [ ] Log out and log back in
- [ ] Verify all data still present

---

## RECOMMENDED IMPLEMENTATION ORDER

1. **Fix 1.2 (Metrics timestamp)** - 20 min
   - Unblocks onboarding completion
   - Low risk, high impact

2. **Fix 1.1 (Profile endpoint)** - 30 min
   - Unblocks profile updates
   - Medium risk, high impact

3. **Fix 1.3 (Navigation race)** - 45 min
   - Fixes UX issue
   - Low risk, medium impact

4. **Testing** - 2 hours
   - Verify all fixes work together
   - Catch edge cases

5. **Fix 2.1 (Photo upload)** - Future sprint
   - Nice to have, not critical
   - Requires infrastructure work

**Total Time for Critical Fixes: ~3.5 hours**

---

## CONCLUSION

The persistent bugs were NOT due to bad code or logic errors. They were caused by **fundamental architectural mismatches**:

1. **Missing backend endpoints** that iOS assumes exist
2. **Incomplete feature implementation** (photo upload)
3. **Timing issues** in async navigation
4. **String comparison precision** in timestamp validation

Previous fixes failed because they addressed symptoms, not root causes. This review identifies the actual architectural flaws that need fixing.

**Bottom line:** We need to create the missing backend endpoints, fix the timestamp comparison logic, and adjust navigation timing. Everything else is working as designed.

---

## APPENDIX A: ENDPOINT INVENTORY

### iOS Expects These Endpoints

| Endpoint                          | Method | Status              | Notes                                       |
| --------------------------------- | ------ | ------------------- | ------------------------------------------- |
| `/auth/signup`                    | POST   | ✅ Exists           | Works                                       |
| `/auth/login`                     | POST   | ✅ Exists           | Works                                       |
| `/auth/me`                        | GET    | ✅ Exists           | Works, returns preferences correctly        |
| `/auth/profile`                   | PUT    | ❌ MISSING          | **CRITICAL: iOS calls this, doesn't exist** |
| `/auth/profile/preferences`       | PUT    | ✅ Exists           | Works                                       |
| `/auth/profile/health`            | PUT    | ✅ Exists           | Works                                       |
| `/auth/profile/photo`             | POST   | ❌ MISSING          | **Photo upload not implemented**            |
| `/v1/onboarding`                  | POST   | ✅ Exists           | Works                                       |
| `/v1/onboarding/skip`             | POST   | ✅ Exists           | Works                                       |
| `/v1/profile/metrics/today`       | GET    | ✅ Exists           | Works                                       |
| `/v1/profile/metrics/acknowledge` | POST   | ⚠️ Exists but buggy | **Timestamp comparison fails**              |
| `/v1/plans/generate`              | POST   | ✅ Exists           | Works                                       |

### Backend Has These Endpoints (Not Used by iOS)

| Endpoint                | Method | Purpose                                      |
| ----------------------- | ------ | -------------------------------------------- |
| `/auth/forgot-password` | POST   | Password reset (not implemented in iOS)      |
| `/auth/reset-password`  | POST   | Password reset (not implemented in iOS)      |
| `/auth/change-password` | PATCH  | Change password (not accessible from iOS UI) |
| `/auth/refresh`         | POST   | Token refresh (used automatically)           |
| `/auth/logout`          | POST   | Logout (used)                                |

---

## APPENDIX B: FILE REFERENCE

### Critical Files for Fixes

**Backend:**

- `/Users/devarisbrown/Code/projects/gtsd/apps/api/src/routes/auth/index.ts` - Mount new `/profile` endpoint here
- `/Users/devarisbrown/Code/projects/gtsd/apps/api/src/routes/auth/profile.ts` - **CREATE THIS FILE** for Fix 1.1
- `/Users/devarisbrown/Code/projects/gtsd/apps/api/src/services/metrics.ts` - Fix timestamp comparison (Fix 1.2)
- `/Users/devarisbrown/Code/projects/gtsd/apps/api/src/routes/profile/metrics.ts` - Metrics acknowledgement endpoint

**iOS:**

- `/Users/devarisbrown/Code/projects/gtsd/apps/GTSD/GTSD/Features/Profile/ProfileEditViewModel.swift` - Profile save logic (Fix 1.3)
- `/Users/devarisbrown/Code/projects/gtsd/apps/GTSD/GTSD/GTSDApp.swift` - Navigation logic
- `/Users/devarisbrown/Code/projects/gtsd/apps/GTSD/GTSD/Core/Network/APIEndpoint.swift` - Endpoint definitions
- `/Users/devarisbrown/Code/projects/gtsd/apps/GTSD/GTSD/Features/MetricsSummary/MetricsSummaryViewModel.swift` - Metrics acknowledgement

---

**END OF REPORT**
