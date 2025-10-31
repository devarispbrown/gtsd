# Post-Deployment Testing Protocol

**Execute AFTER pre-deployment checklist is 100% complete**

Version: 1.0
Last Updated: 2025-10-30
Purpose: Prove deployed code actually works in running application

---

## Testing Philosophy

**Previous Failures**: We tested features that appeared to work, but the code wasn't actually deployed due to build cache issues.

**New Approach**:

1. Start with **NEGATIVE tests** (backend down) to prove resilience fixes work
2. Execute **POSITIVE tests** (backend up) to prove features work
3. Document **ACTUAL behavior** with screenshots/videos
4. Compare **EXPECTED vs ACTUAL** at each step
5. Verify **DATABASE state** after each operation

---

## Test Environment Setup

### Prerequisites

Before starting tests:

```bash
# 1. Verify pre-deployment checklist is 100% complete
# Do NOT proceed until all pre-deployment checks pass!

# 2. Terminal 1: Start backend API
cd /Users/devarisbrown/Code/projects/gtsd/apps/api
docker-compose up -d postgres redis minio
pnpm dev

# Wait for: "Server running on port 3000"

# 3. Terminal 2: Start Metro bundler
cd /Users/devarisbrown/Code/projects/gtsd/apps/mobile
pnpm start --reset-cache

# Wait for: "Metro bundler ready"

# 4. Terminal 3: Monitor logs (CRITICAL for verification)
cd /Users/devarisbrown/Code/projects/gtsd/apps/mobile
pnpm ios
# Or for Android:
# pnpm android

# 5. Terminal 4: Available for commands
# Use this for curl tests and database queries
```

**Checklist**:

- [ ] Backend API running (healthz returns 200)
- [ ] Metro bundler running (no errors)
- [ ] iOS simulator/Android emulator launched
- [ ] App installed and ready
- [ ] Log terminal visible

---

## Priority 1: Critical Auth Resilience Tests

**THESE TESTS PROVE THE MAIN FIXES WORK**

### Test 1.1: Backend Down - Welcome Screen Appears

**Purpose**: Prove app doesn't hang when backend is unreachable

**Risk Level**: CRITICAL (this was the main bug)

**Setup**:

```bash
# STOP the backend API
# In Terminal 1 where API is running, press Ctrl+C

# Verify backend is down
curl http://localhost:3000/healthz
# Expected: Connection refused or timeout

# Delete app from simulator to force fresh launch
# iOS: Long press app icon > Delete App
# Android: Settings > Apps > GTSD > Uninstall
```

**Test Execution**:

1. Launch app from Xcode/Android Studio
2. Start timer when app launches
3. Observe splash screen
4. Wait for Welcome screen to appear
5. Stop timer when Welcome screen visible

**Expected Behavior**:

- **Timeline**:
  - 0s: App launches, shows splash screen
  - 0-5s: Auth check runs in background
  - ~5s: Auth check times out
  - 5-6s: Welcome screen appears
- **Console logs** (verify these appear):
  ```
  [VERIFICATION] RootNavigator initialize called
  [VERIFICATION] Calling checkAuthStatus...
  [VERIFICATION] checkAuthStatus called at: 2025-10-30T...
  [VERIFICATION] hasTokens: false
  [VERIFICATION] No tokens found, setting unauthenticated
  [VERIFICATION] Setting isHydrated = true
  ```
- **UI State**: Welcome screen with "Sign Up" and "Login" buttons
- **No errors**: No crash, no infinite spinner

**Actual Behavior** (document):

- **Timeline**:
  - 0s: ******\_\_\_******
  - 5s: ******\_\_\_******
  - 10s: ******\_\_\_******
- **Console logs** (paste actual logs):
  ```
  [Paste actual console output here]
  ```
- **Screenshot**: [Attach screenshot of Welcome screen]

**Success Criteria**:

- [ ] Welcome screen appears within 6 seconds
- [ ] No infinite loading spinner
- [ ] Console shows timeout at ~5 seconds
- [ ] App remains responsive (can tap buttons)

**Failure Indicators**:

- App hangs on splash screen > 10 seconds → Hydration not non-blocking
- No timeout log in console → Timeout code not deployed
- App crashes → Error boundary not working
- Blank screen → Navigation logic broken

**If Test Fails**: STOP. Do not proceed. Return to pre-deployment checklist.

---

### Test 1.2: Backend Down - Timeout Verification

**Purpose**: Prove 5-second timeout is actually enforced

**Risk Level**: CRITICAL

**Setup**:

```bash
# Backend should still be DOWN from Test 1.1
# If you restarted it, stop it again

# Clear app data again
# iOS: Delete app, reinstall
# Android: Clear data
```

**Test Execution**:

1. Launch app
2. Monitor console logs carefully
3. Use stopwatch to time auth check

**Expected Console Log Sequence**:

```
[VERIFICATION] RootNavigator initialize called
[VERIFICATION] Calling checkAuthStatus...
[VERIFICATION] checkAuthStatus called at: 2025-10-30T15:30:00.000Z
[VERIFICATION] hasTokens: false
[VERIFICATION] No tokens found, setting unauthenticated
[VERIFICATION] Setting isHydrated = true

Time between "checkAuthStatus called" and "Setting isHydrated": ~0.1s (no tokens)
```

**Now test WITH tokens but backend down**:

1. Start backend temporarily
2. Create account and login
3. Stop backend
4. Force quit app
5. Relaunch app

**Expected Console Log Sequence**:

```
[VERIFICATION] RootNavigator initialize called
[VERIFICATION] Calling checkAuthStatus...
[VERIFICATION] checkAuthStatus called at: 2025-10-30T15:30:00.000Z
[VERIFICATION] hasTokens: true
[VERIFICATION] Starting auth check race...
(5 second pause)
[VERIFICATION] Auth timeout triggered after 5s!
[VERIFICATION] Auth check error: Error: Auth check timeout after 5s
[VERIFICATION] Setting isHydrated = true

Time between "Starting auth check race" and "Auth timeout triggered": ~5.0s
```

**Actual Console Logs** (paste):

```
[Paste actual console output here]
```

**Success Criteria**:

- [ ] Timeout log appears at ~5 seconds (4.8-5.2s acceptable)
- [ ] "Auth timeout triggered" message appears
- [ ] isHydrated = true happens after timeout
- [ ] Welcome screen appears after timeout

**Failure Indicators**:

- No timeout log → Code not deployed
- Timeout at wrong time (not 5s) → Wrong timeout value
- App hangs > 10s → Timeout not working

---

### Test 1.3: Backend Down - Navigation Works

**Purpose**: Prove app remains functional when backend is down

**Setup**:

- Backend still DOWN
- App showing Welcome screen

**Test Execution**:

1. Tap "Sign Up" button
2. Observe behavior
3. Tap "Login" button
4. Observe behavior

**Expected Behavior**:

- Tapping "Sign Up":
  - Navigates to signup screen
  - Form is visible
  - Submitting shows error (cannot reach server)
- Tapping "Login":
  - Navigates to login screen
  - Form is visible
  - Submitting shows error (cannot reach server)
- Error messages:
  - User-friendly error (not crash)
  - "Cannot connect to server" or similar

**Actual Behavior**:

- Sign Up button tap: ******\_\_\_******
- Login button tap: ******\_\_\_******
- Error message: ******\_\_\_******
- **Screenshot**: [Attach]

**Success Criteria**:

- [ ] Navigation works (screens change)
- [ ] Forms are visible and functional
- [ ] Error messages are user-friendly
- [ ] No crashes or blank screens

---

## Priority 2: Backend Up - Full Auth Flow Tests

**Start backend for these tests**

```bash
# Terminal 1: Start backend
cd /Users/devarisbrown/Code/projects/gtsd/apps/api
pnpm dev

# Verify backend is up
curl http://localhost:3000/healthz
# Expected: {"status":"healthy"}
```

---

### Test 2.1: Sign Up - Account Creation

**Purpose**: Verify new user registration works end-to-end

**Setup**:

- Backend running
- App showing Welcome screen
- Fresh app install (no previous data)

**Test Execution**:

1. Tap "Sign Up" button
2. Fill in form:
   - Email: `test-qa-{timestamp}@example.com`
   - Password: `TestQA123!`
   - First Name: `QA`
   - Last Name: `Test`
3. Tap "Create Account"
4. Observe behavior

**Expected Behavior**:

- Form validation passes
- Loading indicator appears
- Request sent to API
- Account created
- Navigates to onboarding (AccountBasics screen)
- Tokens stored in secure storage

**Console Logs to Verify**:

```
[Signup request to /auth/signup]
[Response: 201 Created]
[User ID: ...]
[Tokens stored in keychain]
[Navigation: Welcome -> AccountBasics]
```

**Database Verification**:

```bash
# Check user was created
docker exec -it gtsd-postgres psql -U gtsd -d gtsd -c \
  "SELECT id, email, first_name, last_name, created_at
   FROM users
   WHERE email LIKE 'test-qa-%@example.com'
   ORDER BY created_at DESC
   LIMIT 1;"

# Expected: User record with recent timestamp
```

**Actual Results**:

- User created: YES / NO
- User ID: ******\_\_\_******
- Navigation: ******\_\_\_******
- Database record: ******\_\_\_******
- **Screenshot**: [Attach]

**Success Criteria**:

- [ ] Form submission succeeds
- [ ] HTTP 201 response received
- [ ] User appears in database
- [ ] Tokens stored (check keychain)
- [ ] Navigated to onboarding
- [ ] No errors in console

**Failure Indicators**:

- HTTP 404 → Signup endpoint not found
- HTTP 500 → Server error (check API logs)
- No database record → Data not persisting
- Stays on signup screen → Navigation broken

---

### Test 2.2: Login - Existing User Authentication

**Purpose**: Verify login works with correct credentials

**Setup**:

- Backend running
- User created in Test 2.1
- Logged out (or fresh app install)
- On Welcome screen

**Test Execution**:

1. Tap "Login" button
2. Fill in form:
   - Email: (from Test 2.1)
   - Password: `TestQA123!`
3. Tap "Login"
4. Observe behavior

**Expected Behavior**:

- Form validation passes
- Loading indicator appears
- Request sent to /auth/login
- HTTP 200 response with tokens
- User profile fetched
- Tokens stored
- Navigation based on onboarding status:
  - If onboarding incomplete: → AccountBasics
  - If onboarding complete: → Today screen

**Console Logs to Verify**:

```
[Login request to /auth/login]
[Response: 200 OK]
[User: {id: ..., email: ...}]
[Tokens stored]
[Checking onboarding status]
[Navigation: Login -> Today/AccountBasics]
```

**Actual Results**:

- Login success: YES / NO
- HTTP status: ******\_\_\_******
- User ID: ******\_\_\_******
- Navigation destination: ******\_\_\_******
- **Screenshot**: [Attach]

**Success Criteria**:

- [ ] Login succeeds with correct credentials
- [ ] HTTP 200 response
- [ ] Tokens stored
- [ ] User profile loaded
- [ ] Correct navigation based on onboarding status

---

### Test 2.3: Login - Invalid Credentials

**Purpose**: Verify error handling for wrong password

**Setup**:

- Backend running
- On Login screen

**Test Execution**:

1. Enter email: (from Test 2.1)
2. Enter password: `WrongPassword123!`
3. Tap "Login"
4. Observe behavior

**Expected Behavior**:

- Loading indicator appears
- Request sent to /auth/login
- HTTP 401 Unauthorized response
- Error message displayed: "Invalid email or password"
- User remains on login screen
- Form is still usable

**Actual Results**:

- HTTP status: ******\_\_\_******
- Error message: ******\_\_\_******
- **Screenshot**: [Attach error message]

**Success Criteria**:

- [ ] HTTP 401 response
- [ ] User-friendly error message
- [ ] No crash or blank screen
- [ ] Can retry login

---

### Test 2.4: Session Persistence - Auto-Login

**Purpose**: Prove tokens persist across app restarts

**Setup**:

- User logged in (from Test 2.2)
- Currently on Today screen or onboarding

**Test Execution**:

1. Force quit the app
   - iOS: Swipe up from bottom, swipe app away
   - Android: Recent apps, swipe away
2. Wait 5 seconds
3. Relaunch app
4. Observe behavior

**Expected Behavior**:

- App launches
- Shows splash screen briefly
- Auth check runs in background:
  - Loads tokens from keychain
  - Validates with /auth/me endpoint
  - Receives user profile
- Navigates directly to previous screen (Today/onboarding)
- NO Welcome screen shown
- Timeline: < 2 seconds to authenticated screen

**Console Logs to Verify**:

```
[VERIFICATION] RootNavigator initialize called
[VERIFICATION] checkAuthStatus called
[VERIFICATION] hasTokens: true
[VERIFICATION] Starting auth check race...
[Request: GET /auth/me]
[Response: 200 OK]
[User authenticated]
[VERIFICATION] Auth check completed successfully
[VERIFICATION] Setting isHydrated = true
[Navigation: -> Today/AccountBasics]
```

**Actual Results**:

- Time to authenticated screen: ******\_\_\_******
- Screen shown: ******\_\_\_******
- Tokens loaded: YES / NO
- **Screenshot**: [Attach]

**Success Criteria**:

- [ ] Auto-login succeeds
- [ ] Tokens loaded from storage
- [ ] /auth/me request succeeds
- [ ] Navigates to correct screen
- [ ] No Welcome screen shown
- [ ] Timeline < 3 seconds

**Failure Indicators**:

- Shows Welcome screen → Tokens not persisting
- Takes > 10 seconds → Timeout issue
- HTTP 401 on /auth/me → Token invalid

---

### Test 2.5: Logout - Clear Session

**Purpose**: Verify logout clears tokens and returns to Welcome

**Setup**:

- User logged in
- On Today screen or Settings

**Test Execution**:

1. Navigate to Settings
2. Tap "Logout" button
3. Confirm logout (if confirmation dialog)
4. Observe behavior

**Expected Behavior**:

- Logout request sent to /auth/logout
- Tokens cleared from keychain
- User state cleared from Zustand store
- Navigation: → Welcome screen
- If app is relaunched, stays on Welcome (no auto-login)

**Console Logs to Verify**:

```
[Logout request to /auth/logout]
[Response: 200 OK]
[Tokens cleared from keychain]
[User state cleared]
[Navigation: -> Welcome]
```

**Verify tokens are gone**:

```bash
# After logout, relaunch app
# Should go to Welcome screen, NOT auto-login
```

**Actual Results**:

- Logout success: YES / NO
- Tokens cleared: YES / NO
- Navigation: ******\_\_\_******
- After relaunch: ******\_\_\_******
- **Screenshot**: [Attach]

**Success Criteria**:

- [ ] Logout API call succeeds
- [ ] Tokens cleared from keychain
- [ ] Returns to Welcome screen
- [ ] Relaunch shows Welcome (no auto-login)

---

## Priority 3: Onboarding Flow Tests

### Test 3.1: Complete Onboarding Flow

**Purpose**: Verify user can complete full onboarding

**Setup**:

- Fresh signup (new user)
- On AccountBasics screen

**Test Execution**:

Complete all onboarding screens in sequence:

1. **AccountBasics**:
   - Enter date of birth
   - Select gender
   - Tap "Next"

2. **Goals**:
   - Select weight goal (e.g., "Lose weight")
   - Enter target weight
   - Select pace
   - Tap "Next"

3. **HealthMetrics**:
   - Enter current weight
   - Enter height
   - Tap "Next"

4. **ActivityLevel**:
   - Select activity level
   - Tap "Next"

5. **Preferences**:
   - Select preferences
   - Tap "Next"

6. **Partners** (optional):
   - Skip or add partner email
   - Tap "Next"

7. **Review**:
   - Review details
   - Tap "Complete Onboarding"

**Expected Behavior**:

- Each screen saves data to backend
- Progress indicator updates
- Final submit creates onboarding profile
- Navigation: Review → Today screen
- Today screen shows personalized plan

**Database Verification**:

```bash
# Check onboarding profile created
docker exec -it gtsd-postgres psql -U gtsd -d gtsd -c \
  "SELECT user_id, weight_goal, target_weight_kg, current_weight_kg, activity_level
   FROM onboarding_profiles
   WHERE user_id = [USER_ID_FROM_TEST];"

# Expected: Complete profile with all fields populated
```

**Actual Results**:

- Onboarding completed: YES / NO
- All screens saved: YES / NO
- Database profile: ******\_\_\_******
- Final navigation: ******\_\_\_******
- **Screenshots**: [Attach each screen]

**Success Criteria**:

- [ ] All screens accessible
- [ ] Each step saves to database
- [ ] Progress indicator updates
- [ ] Final submit succeeds
- [ ] Navigates to Today screen
- [ ] Onboarding profile in database

---

## Priority 4: Data Persistence Tests

### Test 4.1: Task Creation and Persistence

**Purpose**: Verify tasks save and persist

**Setup**:

- User logged in
- On Today screen

**Test Execution**:

1. Tap "Add Task" or similar
2. Fill in task details:
   - Title: `QA Test Task`
   - Description: `Verification test`
   - Due date: Today
3. Save task
4. Observe task appears in list

**Verify persistence**: 5. Force quit app 6. Relaunch app 7. Navigate to Today screen 8. Verify task still appears

**Database Verification**:

```bash
docker exec -it gtsd-postgres psql -U gtsd -d gtsd -c \
  "SELECT id, user_id, title, description, due_date, status
   FROM tasks
   WHERE title = 'QA Test Task';"
```

**Actual Results**:

- Task created: YES / NO
- Task visible after restart: YES / NO
- Database record: ******\_\_\_******
- **Screenshot**: [Attach]

**Success Criteria**:

- [ ] Task creation succeeds
- [ ] Task appears in list
- [ ] Task persists after app restart
- [ ] Database record exists

---

### Test 4.2: Task Completion and Evidence Upload

**Purpose**: Verify task completion and photo upload work

**Setup**:

- Task created in Test 4.1
- On Today screen

**Test Execution**:

1. Tap on task
2. Tap "Mark Complete"
3. Upload photo evidence:
   - Tap "Add Photo"
   - Select photo from gallery or take photo
   - Confirm photo
4. Submit completion
5. Observe behavior

**Expected Behavior**:

- Photo uploads to S3 (Minio locally)
- Task status changes to completed
- Completion time recorded
- Photo URL saved to database
- UI updates (confetti animation, streak update)

**Database Verification**:

```bash
# Check task completion
docker exec -it gtsd-postgres psql -U gtsd -d gtsd -c \
  "SELECT id, title, status, completed_at, evidence_photo_url
   FROM tasks
   WHERE title = 'QA Test Task';"

# Expected: status = 'completed', completed_at = recent, evidence_photo_url = S3 URL
```

**Verify S3 upload**:

```bash
# Check Minio (local S3)
docker exec -it gtsd-minio mc ls local/gtsd-evidence/

# Expected: Photo file appears in list
```

**Actual Results**:

- Photo uploaded: YES / NO
- Task status: ******\_\_\_******
- S3 URL: ******\_\_\_******
- Database record: ******\_\_\_******
- **Screenshot**: [Attach completion screen]

**Success Criteria**:

- [ ] Photo upload succeeds
- [ ] Task marked complete
- [ ] Database updated
- [ ] S3/Minio contains photo
- [ ] UI shows completion (animation, etc.)

---

## Priority 5: Edge Cases and Error Scenarios

### Test 5.1: Network Interruption During Operation

**Purpose**: Test app behavior when network fails mid-operation

**Test Execution**:

1. Start login process
2. While loading, enable Airplane Mode (iOS) or disable Wi-Fi/data
3. Observe behavior

**Expected Behavior**:

- Request times out gracefully
- Error message: "Network error" or "Cannot connect"
- No crash
- Can retry after re-enabling network

**Actual Results**:

- Error handling: ******\_\_\_******
- Error message: ******\_\_\_******
- **Screenshot**: [Attach]

**Success Criteria**:

- [ ] Graceful error handling
- [ ] User-friendly error message
- [ ] No crash
- [ ] Can retry

---

### Test 5.2: Invalid Token Handling

**Purpose**: Verify app handles expired/invalid tokens

**Test Execution**:

1. Login successfully
2. Manually invalidate token in database:
   ```bash
   docker exec -it gtsd-postgres psql -U gtsd -d gtsd -c \
     "DELETE FROM refresh_tokens WHERE user_id = [USER_ID];"
   ```
3. In app, make authenticated request (e.g., view Today screen)
4. Observe behavior

**Expected Behavior**:

- Request to /auth/me returns 401
- Token refresh attempted
- Refresh fails (token deleted)
- User logged out automatically
- Redirected to Welcome screen

**Actual Results**:

- Error handling: ******\_\_\_******
- Auto-logout: YES / NO
- Navigation: ******\_\_\_******

**Success Criteria**:

- [ ] 401 error detected
- [ ] Refresh attempted
- [ ] Auto-logout on refresh failure
- [ ] Redirect to Welcome

---

## Test Results Summary

### Test Execution Summary

| Test                              | Status            | Duration | Notes          |
| --------------------------------- | ----------------- | -------- | -------------- |
| 1.1 Backend Down - Welcome Screen | ⬜ PASS / ⬜ FAIL | **\_**s  | ******\_****** |
| 1.2 Backend Down - Timeout        | ⬜ PASS / ⬜ FAIL | **\_**s  | ******\_****** |
| 1.3 Backend Down - Navigation     | ⬜ PASS / ⬜ FAIL | **\_**s  | ******\_****** |
| 2.1 Sign Up                       | ⬜ PASS / ⬜ FAIL | **\_**s  | ******\_****** |
| 2.2 Login - Valid                 | ⬜ PASS / ⬜ FAIL | **\_**s  | ******\_****** |
| 2.3 Login - Invalid               | ⬜ PASS / ⬜ FAIL | **\_**s  | ******\_****** |
| 2.4 Session Persistence           | ⬜ PASS / ⬜ FAIL | **\_**s  | ******\_****** |
| 2.5 Logout                        | ⬜ PASS / ⬜ FAIL | **\_**s  | ******\_****** |
| 3.1 Onboarding Flow               | ⬜ PASS / ⬜ FAIL | **\_**s  | ******\_****** |
| 4.1 Task Creation                 | ⬜ PASS / ⬜ FAIL | **\_**s  | ******\_****** |
| 4.2 Task Completion               | ⬜ PASS / ⬜ FAIL | **\_**s  | ******\_****** |
| 5.1 Network Interruption          | ⬜ PASS / ⬜ FAIL | **\_**s  | ******\_****** |
| 5.2 Invalid Token                 | ⬜ PASS / ⬜ FAIL | **\_**s  | ******\_****** |

**Total Tests**: 13
**Passed**: **\_**
**Failed**: **\_**
**Pass Rate**: **\_**%

### Critical Tests (MUST Pass)

- [ ] Test 1.1: Backend Down - Welcome Screen
- [ ] Test 1.2: Backend Down - Timeout
- [ ] Test 2.1: Sign Up
- [ ] Test 2.2: Login
- [ ] Test 2.4: Session Persistence

**Critical Pass Rate**: **\_** / 5 (must be 5/5)

### Blocking Issues

**Issue 1**:

- Test: **\_**
- Symptom: **\_**
- Root Cause: **\_**
- Action: **\_**

**Issue 2**:

- Test: **\_**
- Symptom: **\_**
- Root Cause: **\_**
- Action: **\_**

### Screenshots and Evidence

Attach screenshots for:

- [ ] Welcome screen (Test 1.1)
- [ ] Login screen
- [ ] Signup screen
- [ ] Each onboarding screen
- [ ] Today screen
- [ ] Task completion with photo
- [ ] Error messages
- [ ] Console logs for critical tests

### Database State After Tests

```bash
# User count
docker exec -it gtsd-postgres psql -U gtsd -d gtsd -c \
  "SELECT COUNT(*) FROM users WHERE email LIKE 'test-qa-%@example.com';"

# Onboarding profiles
docker exec -it gtsd-postgres psql -U gtsd -d gtsd -c \
  "SELECT COUNT(*) FROM onboarding_profiles;"

# Tasks created
docker exec -it gtsd-postgres psql -U gtsd -d gtsd -c \
  "SELECT COUNT(*) FROM tasks WHERE title LIKE 'QA Test%';"
```

**Results**:

- Test users created: **\_**
- Onboarding profiles: **\_**
- Test tasks: **\_**

---

## Approval

### Test Sign-Off

**All critical tests passed**: YES / NO

**Blocking issues**: **\_** (must be 0 to approve)

**Tested by**: ******\_\_\_\_******
**Date**: ******\_\_\_\_******
**Time**: ******\_\_\_\_******

**Approval Status**: ⬜ APPROVED / ⬜ REJECTED

**Notes**:

---

## What Success Looks Like

### Perfect Test Run

All tests pass with these characteristics:

1. **Backend Down Tests**:
   - Welcome screen appears within 5-6 seconds
   - Console shows timeout at ~5 seconds
   - App remains responsive

2. **Backend Up Tests**:
   - Signup creates user in database
   - Login returns tokens and user profile
   - Session persists across restarts
   - Logout clears tokens

3. **Data Persistence**:
   - All data saves to database
   - Data survives app restarts
   - Photos upload to S3

4. **Error Handling**:
   - Network errors show friendly messages
   - Invalid tokens trigger auto-logout
   - No crashes or blank screens

### Red Flags (FAIL)

Stop testing and investigate if you see:

- App hangs > 10 seconds on launch
- No console logs with [VERIFICATION] prefix → Code not deployed
- HTTP 404 on any endpoint → Backend not running or routes missing
- Database records missing after operations → Data not persisting
- Any crashes or blank screens → Critical error
- Timeout not at 5 seconds → Wrong timeout value or code not deployed

**If ANY critical test fails**: Return to pre-deployment checklist and verify build artifacts.

---

## Time Estimates

| Test Category                | Time Required               |
| ---------------------------- | --------------------------- |
| Priority 1: Auth Resilience  | 15 minutes                  |
| Priority 2: Auth Flow        | 20 minutes                  |
| Priority 3: Onboarding       | 15 minutes                  |
| Priority 4: Data Persistence | 15 minutes                  |
| Priority 5: Edge Cases       | 10 minutes                  |
| Documentation                | 10 minutes                  |
| **Total**                    | **85 minutes (~1.5 hours)** |

**Note**: First-time execution may take longer. Subsequent runs will be faster.
