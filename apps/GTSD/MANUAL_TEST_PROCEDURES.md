# Manual Test Procedures - iOS GTSD Application
## Step-by-Step Testing Guide for Human QA Testers

**Document Purpose**: This guide provides detailed, step-by-step instructions for manually executing all test cases when automated testing is not available.

**Target Audience**: QA Testers, Developers, Product Managers
**Estimated Time**: 8-10 hours for complete execution
**Prerequisites**: iOS device or simulator, GTSD app installed, backend API running

---

## Table of Contents

1. [Environment Setup](#environment-setup)
2. [Accessibility Tests](#accessibility-tests)
3. [Functional Tests](#functional-tests)
4. [Integration Tests](#integration-tests)
5. [Performance Tests](#performance-tests)
6. [Recording Results](#recording-results)

---

## Environment Setup

### Step 1: Verify Prerequisites

**Checklist**:
- [ ] iOS device or simulator available (iPhone 15 or later recommended)
- [ ] GTSD app installed and can launch
- [ ] Backend API running at http://localhost:3000 (or staging URL)
- [ ] Test users created in database
- [ ] Accessibility Inspector installed (part of Xcode)
- [ ] Stopwatch or timer available (for performance tests)
- [ ] Spreadsheet or form for recording results

### Step 2: Create Test Users

**User 1: Complete Profile**
```sql
-- Execute in database
INSERT INTO users (email, "passwordHash", name, "hasCompletedOnboarding", "currentWeight", "targetWeight", height, "activityLevel")
VALUES (
  'complete-user@test.com',
  '$2b$10$...', -- Generate proper hash
  'Complete User',
  true,
  80.0,  -- currentWeight
  75.0,  -- targetWeight
  175,   -- height in cm
  'MODERATELY_ACTIVE'
);
```

**User 2: Incomplete Profile (Zero State)**
```sql
INSERT INTO users (email, "passwordHash", name, "hasCompletedOnboarding", "currentWeight", "targetWeight", height)
VALUES (
  'zero-state@test.com',
  '$2b$10$...',
  'Zero State User',
  true,
  0,  -- Placeholder weight
  0,  -- Placeholder target
  0   -- Placeholder height
);
```

### Step 3: Launch App

1. Open GTSD app on device/simulator
2. If prompted to log in, use `complete-user@test.com`
3. Verify app reaches Home screen
4. Take screenshot for baseline

---

## Accessibility Tests

### ACC-001-01: Plan Summary VoiceOver Navigation

**Objective**: Verify all elements in Plan Summary screen have proper accessibility labels

**Duration**: 20 minutes

**Steps**:

1. **Enable VoiceOver**:
   - **On Device**: Settings → Accessibility → VoiceOver → ON
   - **On Simulator**: Hardware menu → Accessibility → VoiceOver

2. **Navigate to Plan Screen**:
   - Launch GTSD app
   - Tap "My Plan" tab at bottom
   - Plan Summary screen appears

3. **VoiceOver Gestures**:
   - **Swipe Right**: Move to next element
   - **Swipe Left**: Move to previous element
   - **Double Tap**: Activate element
   - **Two-finger swipe down**: Read all from current position

4. **Test Element-by-Element**:

   Start at top of screen, swipe right through each element and record what VoiceOver announces:

   | Element | Expected Announcement | Actual Announcement | Pass/Fail |
   |---------|----------------------|---------------------|-----------|
   | Navigation Title | "Your Plan, heading" or "My Plan, heading" | _________________ | ⬜ |
   | Refresh Button | "Recalculate Plan, button" + hint | _________________ | ⬜ |
   | Last Updated | "Last updated [time]" | _________________ | ⬜ |
   | Outdated Warning | "Outdated, warning" (if present) | _________________ | ⬜ |
   | Welcome Text | "Welcome, [Name]" | _________________ | ⬜ |
   | Goal Text | "Your goal: [Goal]" | _________________ | ⬜ |
   | Health Metrics Header | "Health Metrics, heading" | _________________ | ⬜ |
   | BMR Card | "BMR, Basal Metabolic Rate, [value] calories per day" | _________________ | ⬜ |
   | TDEE Card | "TDEE, Total Daily Energy Expenditure, [value] calories per day" | _________________ | ⬜ |
   | Activity Level | "Activity Level: [level]" | _________________ | ⬜ |
   | Daily Targets Header | "Daily Targets, heading" | _________________ | ⬜ |
   | Calorie Target | "Calories, [value] calories target" | _________________ | ⬜ |
   | Protein Target | "Protein, [value] grams target" | _________________ | ⬜ |
   | Water Target | "Water, [value] milliliters target" | _________________ | ⬜ |
   | Weekly Rate | "Weekly Rate: [value] pounds per week" | _________________ | ⬜ |
   | Why It Works Header | "Why It Works, heading" | _________________ | ⬜ |
   | Learn More Button | "Learn More about [topic], button" + hint | _________________ | ⬜ |

5. **Test "Learn More" Expansion**:
   - Double-tap on any "Learn More" button
   - Section should expand
   - VoiceOver should read expanded content
   - Content should be intelligible (not just "text, text, text")

6. **Test Reading Order**:
   - From top of screen, swipe right continuously
   - Verify elements are announced in logical visual order
   - Top → Bottom, Left → Right
   - No jumping around randomly

7. **Test Decorative Elements**:
   - Icons (flame, leaf, drop) should be HIDDEN from VoiceOver
   - They should be skipped when swiping
   - Their meaning should be conveyed in labels

**Pass Criteria**:
- ✅ All interactive elements have labels (no "Button" or "Image" alone)
- ✅ Reading order is logical and matches visual hierarchy
- ✅ Hints explain what actions do
- ✅ Decorative elements hidden from VoiceOver
- ✅ No unlabeled elements encountered

**Common Failures**:
- ❌ Element announced as just "Button" (no label)
- ❌ Icons not hidden, announced as "Image" (confusing)
- ❌ Reading order jumps around randomly
- ❌ Expanded text not readable
- ❌ Hints missing on complex actions

**Screenshot**: Take screenshot of Plan Summary screen with VoiceOver enabled (shows focus box)

**Notes**: _______________________________________________________

---

### ACC-001-02: Profile Edit VoiceOver Navigation

**Objective**: Verify weight update flow is accessible with VoiceOver

**Duration**: 20 minutes

**Steps**:

1. **Navigate to Profile Edit**:
   - VoiceOver still enabled
   - Navigate to Profile tab
   - Find and double-tap "Edit" button
   - Profile Edit screen appears

2. **Test Form Elements**:

   Swipe through each form field and record announcements:

   | Element | Expected Announcement | Actual Announcement | Pass/Fail |
   |---------|----------------------|---------------------|-----------|
   | Navigation Title | "Edit Profile, heading" | _________________ | ⬜ |
   | Cancel Button | "Cancel, button" | _________________ | ⬜ |
   | Save Button | "Save, button" + enabled/disabled state | _________________ | ⬜ |
   | Profile Photo | "Profile photo, button, double tap to change" | _________________ | ⬜ |
   | Name Field | "Full Name, [value], text field" | _________________ | ⬜ |
   | Email Field | "Email, [value], text field" | _________________ | ⬜ |
   | Current Weight | "Current Weight, [value] kilograms" + read-only | _________________ | ⬜ |
   | Target Weight | "Target Weight, [value] kilograms" + read-only | _________________ | ⬜ |
   | Health Info Box | "Health metrics can only be updated..." | _________________ | ⬜ |
   | Dietary Prefs | "Dietary Preferences, [value], text field" | _________________ | ⬜ |
   | Meals Per Day | "Meals per Day, [value], text field" | _________________ | ⬜ |

3. **Test Field Editing**:
   - Navigate to "Full Name" field
   - Double-tap to activate
   - Keyboard should appear
   - Type new name
   - Verify VoiceOver reads what you type

4. **Test Read-Only Fields**:
   - Navigate to "Current Weight"
   - Double-tap to activate
   - Field should NOT allow editing
   - VoiceOver should indicate it's read-only or static

5. **Test Save Button State**:
   - Make no changes: Save button should be "disabled"
   - Make a change: Save button should be "button" (enabled)
   - VoiceOver should announce state

**Pass Criteria**:
- ✅ All form fields have clear labels
- ✅ Field values are announced
- ✅ Read-only fields indicated as non-editable
- ✅ Save button state announced correctly
- ✅ Keyboard input accessible

**Screenshot**: Profile Edit screen with VoiceOver focus

**Notes**: _______________________________________________________

---

### ACC-001-03: Zero State Card VoiceOver

**Objective**: Verify zero state card is accessible

**Duration**: 15 minutes

**Prerequisites**: Log in as `zero-state@test.com` (user with weight=0)

**Steps**:

1. **Trigger Zero State**:
   - Log out if needed
   - Log in as zero-state@test.com
   - Navigate to Home tab
   - Zero state card should appear

2. **Test Card Elements**:

   | Element | Expected Announcement | Actual Announcement | Pass/Fail |
   |---------|----------------------|---------------------|-----------|
   | Card Title | "Complete Your Health Profile, heading" | _________________ | ⬜ |
   | Emoji | Should be HIDDEN (not announced) | _________________ | ⬜ |
   | Description | Full description text read aloud | _________________ | ⬜ |
   | Complete Button | "Complete Your Profile, button" + hint | _________________ | ⬜ |
   | Maybe Later | "Maybe Later, button" + hint | _________________ | ⬜ |

3. **Test Button Actions**:
   - Navigate to "Complete Your Profile" button
   - VoiceOver should explain it will open profile setup
   - Navigate to "Maybe Later" button
   - VoiceOver should explain it dismisses the card

**Pass Criteria**:
- ✅ Card title announced as heading
- ✅ Emoji hidden from VoiceOver
- ✅ Description fully readable
- ✅ Both buttons have clear labels and hints
- ✅ Actions are understandable

**Screenshot**: Zero state card with VoiceOver focus

**Notes**: _______________________________________________________

---

### ACC-001-04: Metrics Summary Modal VoiceOver

**Objective**: Verify post-onboarding metrics modal is accessible

**Duration**: 15 minutes

**Prerequisites**: Complete onboarding or trigger modal manually

**Steps**:

1. **Trigger Modal**:
   - Complete onboarding flow
   - Metrics summary modal appears
   - (Or if already completed, you may need to re-onboard with a new user)

2. **Test Modal Elements**:

   | Element | Expected Announcement | Actual Announcement | Pass/Fail |
   |---------|----------------------|---------------------|-----------|
   | Navigation Title | "How GTSD Works for You, heading" | _________________ | ⬜ |
   | Close Button | "Close, button, dismiss metrics summary" | _________________ | ⬜ |
   | BMR Card | "BMR, Basal Metabolic Rate, [value] calories per day" | _________________ | ⬜ |
   | BMR Learn More | "Learn More about BMR, button" | _________________ | ⬜ |
   | TDEE Card | "TDEE, Total Daily Energy Expenditure, [value]" | _________________ | ⬜ |
   | TDEE Learn More | "Learn More about TDEE, button" | _________________ | ⬜ |
   | Timeline | "Estimated [X] weeks to reach your goal" | _________________ | ⬜ |
   | Get Started | "Get Started, button, continue to the app" | _________________ | ⬜ |

3. **Test Learn More Buttons**:
   - Double-tap "Learn More about BMR"
   - Section should expand
   - VoiceOver should read science explanation
   - Should be comprehensible

**Pass Criteria**:
- ✅ All metrics have clear labels and values
- ✅ Learn More buttons clearly labeled
- ✅ Get Started button explains action
- ✅ Close button accessible
- ✅ Modal can be dismissed via VoiceOver

**Screenshot**: Metrics modal with VoiceOver focus

**Notes**: _______________________________________________________

---

### ACC-002-01 to ACC-002-05: Dynamic Type Tests

**Objective**: Verify app adapts to different text sizes

**Duration**: 10 minutes per size (5 sizes = 50 minutes total)

**Steps for Each Size**:

1. **Change Text Size**:
   - Exit GTSD app
   - Open Settings app
   - Display & Brightness → Text Size
   - Adjust slider to target size:
     - Test 1: Medium (M) - Default baseline
     - Test 2: Extra Large (xL)
     - Test 3: Extra Extra Extra Large (xxxL) - Stress test
     - Test 4: xxxL on Profile Edit
     - Test 5: xxxL on Zero State Card
   - Close Settings

2. **Relaunch App**:
   - Force quit GTSD app
   - Relaunch app
   - Text size changes take effect

3. **Navigate to Test Screen**:
   - For tests 1-3: Navigate to "My Plan" tab
   - For test 4: Navigate to Profile → Edit
   - For test 5: Trigger zero state card

4. **Visual Inspection**:

   **Checklist for Each Screen**:
   - [ ] All text is visible (no truncation with "...")
   - [ ] No overlapping text
   - [ ] No horizontal scrolling required
   - [ ] Buttons still readable
   - [ ] Icons appropriately sized
   - [ ] Cards don't overlap
   - [ ] Spacing looks reasonable
   - [ ] Touch targets still tappable (≥ 44pt)
   - [ ] Layout may reflow (HStack → VStack) at xxxL
   - [ ] No information is lost

5. **Take Screenshots**:
   - Capture entire screen for each size
   - Label screenshot: `ACC-002-[test-number]-[size].png`
   - Compare to baseline (Medium size)

6. **Document Issues**:

   | Issue | Location | Description | Severity |
   |-------|----------|-------------|----------|
   | Truncation | Plan title | Text shows "My Long Pla..." | HIGH |
   | Overlap | Metric cards | BMR and TDEE overlap | CRITICAL |
   | Small button | Save button | Button too small to tap | HIGH |
   | Horizontal scroll | Plan screen | Must scroll horizontally | CRITICAL |

**Pass Criteria for ALL Sizes**:
- ✅ No text truncation
- ✅ No overlapping elements
- ✅ No horizontal scrolling
- ✅ All buttons tappable
- ✅ Layout adapts gracefully

**Special Notes for xxxL**:
- Layout MAY reflow significantly
- Elements MAY stack vertically
- This is ACCEPTABLE as long as:
  - All information visible
  - No horizontal scrolling
  - Still usable (even if appearance is compromised)

**Screenshots**: 5 screenshots total (one per test)

**Notes**: _______________________________________________________

---

### ACC-003-01 and ACC-003-02: Color Contrast Tests

**Objective**: Verify all text and UI elements meet WCAG 2.1 AA contrast requirements

**Duration**: 30 minutes per mode (60 minutes total)

**Tool**: Xcode Accessibility Inspector

**Steps**:

1. **Launch Accessibility Inspector**:
   ```bash
   open -a "Accessibility Inspector"
   ```
   - Tool opens in separate window

2. **Select Target**:
   - Top dropdown: Select GTSD app (on simulator/device)
   - Ensure app is running and visible

3. **Run Color Contrast Audit**:
   - Click "Audit" tab (second tab)
   - Enable "Color Contrast" checkbox
   - Click "Run Audit" button
   - Wait for scan to complete (5-10 seconds)

4. **Review Results**:
   - Audit shows all color contrast violations
   - Each violation lists:
     - Element location
     - Foreground color
     - Background color
     - Current ratio
     - Required ratio
     - Pass/Fail status

5. **Document Each Violation**:

   **Test 1: Light Mode**

   Set device to Light Mode:
   - Settings → Display & Brightness → Light
   - Rerun audit

   | Element | Foreground | Background | Current Ratio | Required | Pass/Fail |
   |---------|-----------|------------|---------------|----------|-----------|
   | Card title | #4A5568 | #FFFFFF | ___:1 | 4.5:1 | ⬜ |
   | Body text | #718096 | #FFFFFF | ___:1 | 4.5:1 | ⬜ |
   | Tertiary text | #A0AEC0 | #FFFFFF | ___:1 | 4.5:1 | ⬜ |
   | Button text | #FFFFFF | #FF6B35 | ___:1 | 4.5:1 | ⬜ |
   | Orange icon | #F59E0B | #FFFFFF | ___:1 | 3:1 | ⬜ |
   | Green icon | #10B981 | #FFFFFF | ___:1 | 3:1 | ⬜ |
   | Error text | #EF4444 | #FFFFFF | ___:1 | 4.5:1 | ⬜ |
   | Link text | #3B82F6 | #FFFFFF | ___:1 | 4.5:1 | ⬜ |

   **Test 2: Dark Mode**

   Set device to Dark Mode:
   - Settings → Display & Brightness → Dark
   - Rerun audit

   | Element | Foreground | Background | Current Ratio | Required | Pass/Fail |
   |---------|-----------|------------|---------------|----------|-----------|
   | Card title | #E2E8F0 | #1A202C | ___:1 | 4.5:1 | ⬜ |
   | Body text | #CBD5E0 | #1A202C | ___:1 | 4.5:1 | ⬜ |
   | Tertiary text | #A0AEC0 | #1A202C | ___:1 | 4.5:1 | ⬜ |
   | Button text | #1A202C | #FF6B35 | ___:1 | 4.5:1 | ⬜ |

6. **Manual Verification** (if needed):
   - Use online contrast checker: https://webaim.org/resources/contrastchecker/
   - Enter foreground and background hex colors
   - Verify ratio matches Inspector results

**Pass Criteria**:
- ✅ Zero violations in Light Mode
- ✅ Zero violations in Dark Mode
- ✅ Normal text (< 18pt): ≥ 4.5:1
- ✅ Large text (≥ 18pt): ≥ 3:1
- ✅ UI components: ≥ 3:1

**Common Violations**:
- ❌ Gray text on white/light background (insufficient contrast)
- ❌ Light icons on white background (invisible or low contrast)
- ❌ Colored text without enough contrast

**Screenshots**:
- Screenshot of Accessibility Inspector with violations (if any)
- Screenshot of app in Light Mode
- Screenshot of app in Dark Mode

**Notes**: _______________________________________________________

---

### ACC-004-01: Touch Target Size Test

**Objective**: Verify all interactive elements meet minimum touch target size (44x44 pt)

**Duration**: 30 minutes

**Tool**: Xcode Accessibility Inspector

**Steps**:

1. **Launch Accessibility Inspector**:
   ```bash
   open -a "Accessibility Inspector"
   ```

2. **Enable Hit Areas**:
   - Click crosshair icon in Inspector toolbar
   - This enables "Show Hit Areas" mode

3. **Hover Over Elements**:
   - Move mouse cursor over each interactive element in app
   - Inspector shows hit area dimensions
   - Note: Red box = insufficient hit area

4. **Test All Interactive Elements**:

   **Plan Summary Screen**:
   | Element | Expected Size | Actual Size | Pass/Fail |
   |---------|--------------|-------------|-----------|
   | Refresh button (toolbar) | ≥ 44x44 pt | ___x___ pt | ⬜ |
   | "Recalculate Plan" button | ≥ 44pt height | ___x___ pt | ⬜ |
   | "Learn More" buttons | ≥ 44x44 pt | ___x___ pt | ⬜ |
   | Expandable section headers | ≥ 44pt height | ___x___ pt | ⬜ |
   | Tab bar icons | ≥ 44x44 pt | ___x___ pt | ⬜ |

   **Profile Edit Screen**:
   | Element | Expected Size | Actual Size | Pass/Fail |
   |---------|--------------|-------------|-----------|
   | Cancel button | ≥ 44x44 pt | ___x___ pt | ⬜ |
   | Save button | ≥ 44pt height | ___x___ pt | ⬜ |
   | Profile photo button | ≥ 44x44 pt | ___x___ pt | ⬜ |

   **Zero State Card**:
   | Element | Expected Size | Actual Size | Pass/Fail |
   |---------|--------------|-------------|-----------|
   | "Complete Your Profile" | ≥ 44pt height | ___x___ pt | ⬜ |
   | "Maybe Later" button | ≥ 44x44 pt | ___x___ pt | ⬜ |

   **Metrics Summary Modal**:
   | Element | Expected Size | Actual Size | Pass/Fail |
   |---------|--------------|-------------|-----------|
   | Close button (X) | ≥ 44x44 pt | ___x___ pt | ⬜ |
   | "Learn More" buttons | ≥ 44x44 pt | ___x___ pt | ⬜ |
   | "Get Started" button | ≥ 44pt height | ___x___ pt | ⬜ |

5. **Manual Touch Test**:
   - On physical device or simulator, try tapping each element
   - Elements should be easy to tap
   - Should not accidentally tap adjacent elements

**Pass Criteria**:
- ✅ ALL interactive elements ≥ 44x44 pt
- ✅ No red boxes in Inspector
- ✅ Elements easy to tap (no mis-taps)
- ✅ Spacing between elements ≥ 8pt

**Common Violations**:
- ❌ Small toolbar icons (< 44x44 pt)
- ❌ Text links without padding
- ❌ Close buttons too small
- ❌ Elements too close together (accidental taps)

**Screenshot**: Inspector showing hit areas for all screens

**Notes**: _______________________________________________________

---

## Functional Tests

### FUNC-001-01: Update Weight Successfully (API Test)

**Objective**: Verify weight can be updated via API and plan recomputes

**Duration**: 15 minutes

**Tool**: Terminal with cURL

**Steps**:

1. **Ensure Backend Running**:
   ```bash
   # Check backend health
   curl http://localhost:3000/health
   # Expected: 200 OK or similar
   ```

2. **Login to Get Token**:
   ```bash
   TOKEN=$(curl -X POST http://localhost:3000/api/auth/login \
     -H "Content-Type: application/json" \
     -d '{"email": "complete-user@test.com", "password": "password123"}' \
     | jq -r '.data.accessToken')

   echo $TOKEN
   # Should print JWT token
   ```

3. **Update Weight**:
   ```bash
   curl -X PUT http://localhost:3000/api/v1/auth/profile/health \
     -H "Authorization: Bearer $TOKEN" \
     -H "Content-Type: application/json" \
     -d '{"currentWeight": 75.5}' \
     -w "\nHTTP Status: %{http_code}\n" | jq '.'
   ```

4. **Verify Response**:

   **Expected Response** (200 OK):
   ```json
   {
     "success": true,
     "profile": {
       "currentWeight": "75.5"
     },
     "planUpdated": true,
     "targets": {
       "calorieTarget": 1850,
       "proteinTarget": 140,
       "waterTarget": 2625,
       "bmr": 1550,
       "tdee": 2100,
       "weeklyRate": 1.5
     }
   }
   ```

   **Checklist**:
   - [ ] HTTP status code: 200
   - [ ] `success`: true
   - [ ] `planUpdated`: true
   - [ ] `targets` object present
   - [ ] `calorieTarget` is a number
   - [ ] `proteinTarget` is a number
   - [ ] `waterTarget` is a number
   - [ ] `bmr` is a number
   - [ ] `tdee` is a number
   - [ ] `weeklyRate` is a number

5. **Verify in Database** (optional):
   ```sql
   SELECT "currentWeight", "updatedAt"
   FROM users
   WHERE email = 'complete-user@test.com';
   ```
   - Weight should be 75.5
   - `updatedAt` should be recent (within last minute)

**Pass Criteria**:
- ✅ 200 status code
- ✅ `planUpdated`: true
- ✅ All targets returned
- ✅ Database updated

**Result**: ⬜ PASS / ⬜ FAIL

**Notes**: _______________________________________________________

---

### FUNC-001-02: Validation Errors (API Test)

**Objective**: Verify invalid weight inputs are rejected

**Duration**: 20 minutes

**Steps**:

Test each invalid input and record result:

**Test A: Weight Too Low (-5kg)**
```bash
curl -X PUT http://localhost:3000/api/v1/auth/profile/health \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"currentWeight": -5}' \
  -w "\nHTTP Status: %{http_code}\n"
```
- Expected: 400 Bad Request
- Error message: "Weight must be between 30 and 300 kg" (or similar)
- Result: ⬜ PASS / ⬜ FAIL

**Test B: Weight Too High (500kg)**
```bash
curl -X PUT http://localhost:3000/api/v1/auth/profile/health \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"currentWeight": 500}' \
  -w "\nHTTP Status: %{http_code}\n"
```
- Expected: 400 Bad Request
- Result: ⬜ PASS / ⬜ FAIL

**Test C: Non-Numeric Weight**
```bash
curl -X PUT http://localhost:3000/api/v1/auth/profile/health \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"currentWeight": "abc"}' \
  -w "\nHTTP Status: %{http_code}\n"
```
- Expected: 400 Bad Request
- Result: ⬜ PASS / ⬜ FAIL

**Test D: Null Weight**
```bash
curl -X PUT http://localhost:3000/api/v1/auth/profile/health \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"currentWeight": null}' \
  -w "\nHTTP Status: %{http_code}\n"
```
- Expected: 400 Bad Request
- Result: ⬜ PASS / ⬜ FAIL

**Test E: Missing Weight Field**
```bash
curl -X PUT http://localhost:3000/api/v1/auth/profile/health \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{}' \
  -w "\nHTTP Status: %{http_code}\n"
```
- Expected: 400 Bad Request
- Result: ⬜ PASS / ⬜ FAIL

**Pass Criteria for ALL Tests**:
- ✅ 400 status code
- ✅ `success`: false
- ✅ Clear error message
- ✅ No database changes

**Overall Result**: ⬜ PASS / ⬜ FAIL

**Notes**: _______________________________________________________

---

### FUNC-002-01: Deep Link Navigation - Cold Start

**Objective**: Verify notification deep link works when app is not running

**Duration**: 15 minutes

**Steps**:

1. **Force Quit App**:
   - Swipe up from bottom (or double-press Home)
   - Swipe up on GTSD app card
   - Verify app disappears from app switcher

2. **Trigger Deep Link**:

   **Option A: Via Safari (easiest)**
   - Open Safari on device/simulator
   - In address bar, type: `gtsd://plan/updated`
   - Press Go
   - Safari shows dialog: "Open in GTSD?"
   - Tap "Open"

   **Option B: Via Terminal (simulator only)**
   ```bash
   xcrun simctl openurl booted "gtsd://plan/updated"
   ```

3. **Observe App Launch**:
   - App should launch (cold start)
   - Splash screen may appear briefly
   - App should navigate to Plan tab

4. **Verify Destination**:
   - App lands on "My Plan" tab
   - Plan Summary screen is visible
   - Bottom tab bar shows Plan tab selected
   - Navigation is instant (< 500ms after launch)

5. **Check for Haptic Feedback** (physical device only):
   - Should feel a vibration when navigating
   - Indicates selection haptic played

**Pass Criteria**:
- ✅ App launches from cold start
- ✅ Navigates to Plan tab
- ✅ Plan screen displays correctly
- ✅ Haptic feedback plays (device only)
- ✅ No crashes or errors

**Timing**:
- App launch to screen display: ____ milliseconds
- Target: < 2000ms

**Result**: ⬜ PASS / ⬜ FAIL

**Screenshot**: Plan screen after deep link navigation

**Notes**: _______________________________________________________

---

### FUNC-003-01: Zero State Shown for Incomplete Profile

**Objective**: Verify zero state card appears for users with placeholder weight=0

**Duration**: 15 minutes

**Prerequisites**: User with weight=0 (zero-state@test.com)

**Steps**:

1. **Log Out** (if needed):
   - Navigate to Profile tab
   - Tap "Log Out"
   - Confirm logout

2. **Log In as Zero State User**:
   - Login screen appears
   - Email: `zero-state@test.com`
   - Password: (test password)
   - Tap "Log In"

3. **Navigate to Home**:
   - App should land on Home screen after login
   - Observe Home screen content

4. **Verify Zero State Card**:
   - Zero state card should be VISIBLE
   - Card should display:
     - Title: "Complete Your Health Profile"
     - Description text about personalized nutrition
     - "Complete Your Profile" button
     - "Maybe Later" text/button

5. **Verify Card Cannot Be Missed**:
   - Card should be prominent
   - Should appear near top of Home screen
   - Should be visually distinct (card style, icon)

**Pass Criteria**:
- ✅ Zero state card is visible
- ✅ Card appears on Home screen
- ✅ Title and description correct
- ✅ "Complete Your Profile" button present
- ✅ "Maybe Later" option present

**Result**: ⬜ PASS / ⬜ FAIL

**Screenshot**: Home screen showing zero state card

**Notes**: _______________________________________________________

---

### FUNC-003-03: "Maybe Later" Button Functionality

**Objective**: Verify "Maybe Later" button dismisses zero state card

**Duration**: 15 minutes

**Prerequisites**: Zero state card visible (FUNC-003-01 must pass)

**Steps**:

1. **Locate "Maybe Later"**:
   - Zero state card visible on Home screen
   - Find "Maybe Later" text at bottom of card
   - Should be tappable (button or interactive text)

2. **Tap "Maybe Later"**:
   - Tap on "Maybe Later"
   - Observe card behavior

3. **Verify Card Dismissal**:
   - Card should animate out (fade or slide)
   - Card should disappear
   - Home screen should show remaining content

4. **Verify Persistence**:
   - Navigate to another tab (e.g., Profile)
   - Navigate back to Home tab
   - Zero state card should NOT reappear
   - Dismissal persisted

5. **Test App Restart**:
   - Force quit app
   - Relaunch app
   - Navigate to Home tab
   - Zero state card should NOT reappear immediately
   - (It MAY reappear after X days, but not in same session)

**Pass Criteria**:
- ✅ "Maybe Later" is tappable
- ✅ Card dismisses with animation
- ✅ Card does not reappear in same session
- ✅ Dismissal persists across tab switches
- ✅ Dismissal persists across app restarts (at least for same day)

**Result**: ⬜ PASS / ⬜ FAIL

**Screenshot**: Home screen after card dismissed

**Notes**: _______________________________________________________

---

### FUNC-004-01: Metrics Summary Modal Appears

**Objective**: Verify metrics summary modal appears after onboarding completion

**Duration**: 15 minutes

**Prerequisites**: New user account or ability to re-onboard

**Steps**:

1. **Complete Onboarding**:
   - Create new test user or reset existing user
   - Go through all onboarding steps:
     - Welcome screen
     - Personal info
     - Goals
     - Health metrics (weight, height, activity)
     - Review screen
   - Reach final "Review" screen

2. **Tap "Complete" Button**:
   - Tap the final "Complete" or "Get Started" button
   - Observe button state

3. **Observe Loading**:
   - Button should show loading spinner
   - Indicates API call in progress
   - Duration: 1-3 seconds

4. **Verify Modal Appears**:
   - Onboarding should NOT dismiss yet
   - Metrics summary modal should appear over onboarding
   - Modal should show:
     - Title: "How GTSD Works for You"
     - BMR card with value
     - TDEE card with value
     - Timeline projection
     - "Get Started" button

5. **Verify No Premature Dismissal**:
   - Onboarding screen should still be visible behind modal
   - Modal should be in foreground
   - No flickering or instant dismissal

**Pass Criteria**:
- ✅ Modal appears after completion
- ✅ Onboarding does not dismiss prematurely
- ✅ Modal shows all expected content
- ✅ BMR and TDEE values populated
- ✅ "Get Started" button present

**Result**: ⬜ PASS / ⬜ FAIL

**Screenshot**: Metrics summary modal

**Notes**: _______________________________________________________

---

## Integration Tests

### INT-001-01: Complete Weight Update Flow

**Objective**: Test entire end-to-end flow from weight update to plan refresh

**Duration**: 30 minutes

**Prerequisites**: User with current weight 80kg, calorie target 2000

**Steps**:

Follow this checklist step-by-step:

| Step | Action | Expected Result | Actual Result | Pass/Fail | Timing |
|------|--------|----------------|---------------|-----------|---------|
| 1 | Open app | Launches to Home | _____________ | ⬜ | ___ ms |
| 2 | Navigate to Profile | Profile screen displays | _____________ | ⬜ | ___ ms |
| 3 | Verify current weight | Shows "80 kg" | _____________ | ⬜ | N/A |
| 4 | Tap "Edit" | Edit mode, keyboard appears | _____________ | ⬜ | ___ ms |
| 5 | Change weight to 75kg | Field updates | _____________ | ⬜ | N/A |
| 6 | Tap "Save" | Loading indicator on button | _____________ | ⬜ | N/A |
| 7 | Wait for API call | Spinner shows 1-3s | _____________ | ⬜ | ___ ms |
| 8 | Success modal appears | Plan changes modal shows | _____________ | ⬜ | ___ ms |
| 9 | Read before/after | Comparison correct | _____________ | ⬜ | N/A |
| 10 | Tap "Continue" | Modal dismisses | _____________ | ⬜ | ___ ms |
| 11 | Navigate to My Plan | Plan view displays | _____________ | ⬜ | ___ ms |
| 12 | Observe banner | "Plan Updated" banner shown | _____________ | ⬜ | N/A |
| 13 | Read banner text | Shows calorie/protein changes | _____________ | ⬜ | N/A |
| 14 | Check calorie target | New value < 2000 | _____________ | ⬜ | N/A |
| 15 | Check protein target | New value < 120g | _____________ | ⬜ | N/A |
| 16 | Check "Last updated" | Shows "Just now" | _____________ | ⬜ | N/A |
| 17 | Pull to refresh | Plan refreshes | _____________ | ⬜ | ___ ms |
| 18 | Verify consistency | Same targets after refresh | _____________ | ⬜ | N/A |

**Pass Criteria**:
- ✅ All 18 steps pass
- ✅ Total time < 3.5 seconds (save to plan update)
- ✅ Calorie target decreased (weight decreased)
- ✅ No errors or crashes

**Overall Result**: ⬜ PASS / ⬜ FAIL

**Total Duration**: ________ seconds

**Notes**: _______________________________________________________

---

### INT-002-02: Cache Hit Performance

**Objective**: Verify cached plan loads instantly

**Duration**: 10 minutes

**Steps**:

1. **First Load (Populate Cache)**:
   - Navigate to My Plan tab
   - Plan loads from network (1-2s)
   - Plan displays

2. **Navigate Away**:
   - Tap on different tab (e.g., Home)
   - Leave for 10 seconds

3. **Navigate Back**:
   - Tap on My Plan tab again
   - Start stopwatch when tapping
   - Stop stopwatch when plan displays

4. **Verify Cache Hit**:
   - Plan should appear INSTANTLY
   - No loading spinner
   - Same data as before
   - Time should be < 50ms (instant to human eye)

5. **Repeat 3 Times**:
   - Run 1: ___ ms
   - Run 2: ___ ms
   - Run 3: ___ ms
   - Average: ___ ms

**Pass Criteria**:
- ✅ Average < 50ms
- ✅ No loading spinner
- ✅ Instant to human perception

**Result**: ⬜ PASS / ⬜ FAIL

**Notes**: _______________________________________________________

---

## Performance Tests

### PERF-001-01: Weight Update Flow Performance

**Objective**: Measure end-to-end performance of weight update to plan refresh

**Duration**: 45 minutes (10 runs)

**Tool**: Stopwatch or time tracking

**Steps**:

1. **Prepare**:
   - Log in as test user
   - Navigate to Profile screen
   - Have stopwatch ready

2. **Execute Test Run**:
   - Tap "Edit"
   - Change weight (alternate between 80kg and 75kg)
   - **START STOPWATCH** when tapping "Save"
   - Wait for plan to update
   - Navigate to My Plan tab
   - **STOP STOPWATCH** when new plan displays
   - Record time

3. **Repeat 10 Times**:

   | Run | Start Weight | End Weight | Duration (ms) | Pass/Fail |
   |-----|-------------|------------|---------------|-----------|
   | 1 | 80 kg | 75 kg | _______ ms | ⬜ |
   | 2 | 75 kg | 80 kg | _______ ms | ⬜ |
   | 3 | 80 kg | 75 kg | _______ ms | ⬜ |
   | 4 | 75 kg | 80 kg | _______ ms | ⬜ |
   | 5 | 80 kg | 75 kg | _______ ms | ⬜ |
   | 6 | 75 kg | 80 kg | _______ ms | ⬜ |
   | 7 | 80 kg | 75 kg | _______ ms | ⬜ |
   | 8 | 75 kg | 80 kg | _______ ms | ⬜ |
   | 9 | 80 kg | 75 kg | _______ ms | ⬜ |
   | 10 | 75 kg | 80 kg | _______ ms | ⬜ |

4. **Calculate Statistics**:
   - Average: _______ ms
   - Minimum (fastest): _______ ms
   - Maximum (slowest): _______ ms
   - p95 (9th slowest): _______ ms
   - p99 (10th slowest): _______ ms

**Pass Criteria**:
- ✅ PASS: p95 ≤ 2000ms
- ⚠️ WARNING: p95 2001-3000ms
- ❌ FAIL: p95 > 3000ms

**Result**: ⬜ PASS / ⬜ WARNING / ⬜ FAIL

**Notes**: _______________________________________________________

---

## Recording Results

### Test Summary Sheet

After completing all tests, fill in this summary:

| Category | Total Tests | Passed | Failed | Blocked | Pass Rate |
|----------|-------------|--------|--------|---------|-----------|
| **Accessibility** | 12 | ___ | ___ | ___ | ___% |
| **Functional** | 19 | ___ | ___ | ___ | ___% |
| **Integration** | 18 | ___ | ___ | ___ | ___% |
| **Performance** | 12 | ___ | ___ | ___ | ___% |
| **TOTAL** | **61** | **___** | **___** | **___** | **___%** |

### Critical Issues Found

| Issue ID | Severity | Test Case | Description | Status |
|----------|----------|-----------|-------------|--------|
| BUG-001 | CRITICAL | ACC-001-01 | VoiceOver can't read button labels | OPEN |
| BUG-002 | HIGH | ACC-002-03 | Text truncation at xxxL size | OPEN |
| BUG-003 | CRITICAL | FUNC-003-01 | Zero state doesn't appear | OPEN |
| ... | ... | ... | ... | ... |

### Production Readiness Decision

Based on test results:

**Overall Score**: _____ / 100

**Breakdown**:
- Accessibility: ___% (___/12 passed)
- Functionality: ___% (___/19 passed)
- Integration: ___% (___/18 passed)
- Performance: ___% (___/12 passed)

**Decision**: ⬜ GO / ⬜ NO-GO

**Confidence**: ⬜ High / ⬜ Medium / ⬜ Low

**Reasoning**: _______________________________________________________

**Blockers** (if NO-GO): _______________________________________________________

**Next Steps**: _______________________________________________________

---

## Tips for Effective Testing

### General Tips

1. **Take Your Time**: Don't rush through tests. Accuracy is more important than speed.

2. **Document Everything**: Write down observations, even if they seem minor. Details matter.

3. **Take Screenshots**: Visual evidence is invaluable for bug reports.

4. **Test on Multiple Devices**: If possible, test on both simulator and physical device. Some issues only appear on one or the other.

5. **Test in Different Conditions**:
   - Good WiFi vs. slow 3G
   - Light mode vs. dark mode
   - Different text sizes
   - Different battery levels (device testing)

6. **Follow the Order**: Tests are ordered to build on each other. Complete accessibility before functional, etc.

7. **Restart If Needed**: If app gets into a weird state, force quit and restart rather than trying to recover.

8. **Compare to Test Plan**: Always cross-reference with `COMPREHENSIVE_TEST_PLAN.md` for detailed pass criteria.

### Common Pitfalls

- **Skipping Steps**: Each step verifies something specific. Don't skip.
- **Assuming Pass**: If you're not sure, mark as FAIL and investigate.
- **Not Restarting App**: Many bugs only appear on fresh launch.
- **Ignoring Edge Cases**: The edge cases are where bugs hide.
- **Not Recording Timings**: Performance matters. Time everything.

### When in Doubt

If you encounter unexpected behavior:
1. Document it (screenshot, description)
2. Mark test as FAIL
3. Try to reproduce it
4. Continue with other tests
5. Report in final summary

---

**Document Version**: 1.0
**Author**: QA Expert (Claude)
**Last Updated**: October 28, 2025
**For Use With**: COMPREHENSIVE_TEST_PLAN.md v1.0
