# Product Requirements Document: Profile Edit & Sync Feature

**Product:** GTSD (Get Things Successfully Done)
**Feature:** Editable Profile with Plan Synchronization
**Version:** 1.0
**Last Updated:** 2025-10-30
**Owner:** Product Management
**Status:** Ready for Implementation

---

## Table of Contents

1. [Feature Overview](#feature-overview)
2. [Field Model Specification](#field-model-specification)
3. [User Flows](#user-flows)
4. [Copy & Messaging](#copy--messaging)
5. [Audit Trail Specification](#audit-trail-specification)
6. [Technical Requirements](#technical-requirements)
7. [Success Metrics](#success-metrics)
8. [Open Questions](#open-questions)
9. [Acceptance Criteria](#acceptance-criteria)

---

## 1. Feature Overview

### Problem Statement

Users complete onboarding once but their health journey is dynamic. Weight changes, goals evolve, dietary preferences shift, and life circumstances vary. Currently, users have no way to update their profile after onboarding, forcing them to either:

- Live with outdated information that generates suboptimal plans
- Contact support for manual updates
- Create a new account and lose their progress

This creates friction, reduces plan accuracy, and hurts user retention.

### Solution

Build a comprehensive profile editing feature that allows users to update their health information, preferences, and goals. The system will:

- Validate changes against safe health ranges
- Automatically trigger plan regeneration when changes are significant
- Communicate clearly what will happen after saving
- Maintain an audit trail for debugging and compliance

### Success Definition

Users can independently update their profiles at any time, receive immediate feedback about plan impacts, and trust that their updated information will be reflected in their daily plans starting the next day. The system handles edge cases gracefully and provides transparency throughout the process.

---

## 2. Field Model Specification

### 2.1 Profile Field Categories

All fields map to the `user_settings` table in the database schema.

#### Demographics (Rarely Changed)

| Field Name    | Type         | Validation       | Required | Triggers Regeneration | User Label    | Helper Text                              |
| ------------- | ------------ | ---------------- | -------- | --------------------- | ------------- | ---------------------------------------- |
| `dateOfBirth` | ISO datetime | Age 13-120 years | Yes      | Yes (affects BMR)     | Date of Birth | Your age affects calorie calculations    |
| `gender`      | String       | Max 20 chars     | Yes      | Yes (affects BMR)     | Gender        | Used for accurate metabolic calculations |
| `height`      | Number (cm)  | 50-300 cm        | Yes      | Yes (affects BMR/BMI) | Height        | In centimeters (e.g., 175)               |

**Implementation Notes:**

- `dateOfBirth` changes are rare; add confirmation: "Are you sure? This affects your baseline calculations."
- `height` rarely changes in adults; flag unusual changes (>5cm) for review
- `gender` supports custom values but normalizes to male/female/other for calculations

#### Health Metrics (Frequently Changed)

| Field Name      | Type        | Validation | Required | Triggers Regeneration | User Label     | Helper Text                                 |
| --------------- | ----------- | ---------- | -------- | --------------------- | -------------- | ------------------------------------------- |
| `currentWeight` | Number (kg) | 20-500 kg  | Yes      | Yes (>1kg change)     | Current Weight | Weigh yourself in the morning before eating |
| `targetWeight`  | Number (kg) | 20-500 kg  | Yes      | Yes (always)          | Target Weight  | Your goal weight in kilograms               |

**Implementation Notes:**

- Weight changes >10kg in one update should trigger warning: "Large weight change detected. Please verify this is correct."
- `currentWeight` updates always recalculate BMI, BMR, TDEE
- `targetWeight` changes always recalculate projected timeline

#### Goals & Timeline (Moderately Changed)

| Field Name      | Type         | Validation                                                                            | Required | Triggers Regeneration     | User Label     | Helper Text                         |
| --------------- | ------------ | ------------------------------------------------------------------------------------- | -------- | ------------------------- | -------------- | ----------------------------------- |
| `primaryGoal`   | Enum         | `lose_weight`, `gain_muscle`, `maintain`, `improve_health`                            | Yes      | Yes (always)              | Primary Goal   | Your main fitness objective         |
| `targetDate`    | ISO datetime | Future date                                                                           | Yes      | Yes (affects weekly rate) | Target Date    | When you want to reach your goal    |
| `activityLevel` | Enum         | `sedentary`, `lightly_active`, `moderately_active`, `very_active`, `extremely_active` | Yes      | Yes (affects TDEE)        | Activity Level | How active you are on a typical day |

**Implementation Notes:**

- Changing `primaryGoal` has major implications; show modal explaining impact
- `targetDate` must be validated against realistic weight change rates
- `activityLevel` changes should suggest re-weighing next morning

#### Diet & Preferences (Frequently Changed)

| Field Name           | Type     | Validation   | Required | Triggers Regeneration | User Label               | Helper Text                      |
| -------------------- | -------- | ------------ | -------- | --------------------- | ------------------------ | -------------------------------- |
| `dietaryPreferences` | String[] | Max 10 items | No       | No                    | Dietary Preferences      | Vegetarian, vegan, keto, etc.    |
| `allergies`          | String[] | Max 20 items | No       | No                    | Allergies & Restrictions | Foods you must avoid             |
| `mealsPerDay`        | Integer  | 1-10         | Yes      | No                    | Meals Per Day            | How many meals you typically eat |

**Implementation Notes:**

- These affect meal plan generation but not calorie targets
- Changes don't trigger immediate recomputation
- Free-form tags with suggested common options

#### Calculated Fields (Read-Only, System Managed)

| Field Name      | Type    | Display              | Description                    |
| --------------- | ------- | -------------------- | ------------------------------ |
| `bmr`           | Integer | "1,650 calories/day" | Basal Metabolic Rate           |
| `tdee`          | Integer | "2,200 calories/day" | Total Daily Energy Expenditure |
| `calorieTarget` | Integer | "1,700 calories/day" | Adjusted daily calorie goal    |
| `proteinTarget` | Integer | "135g/day"           | Daily protein goal             |
| `waterTarget`   | Integer | "2,625ml/day"        | Daily hydration goal           |

**Implementation Notes:**

- Display in read-only "Current Targets" card
- Update immediately after save completes
- Show before/after comparison when values change

### 2.2 Field Grouping for UI

**Section 1: About You**

- Date of Birth
- Gender
- Height

**Section 2: Current Status**

- Current Weight

**Section 3: Your Goal**

- Primary Goal
- Target Weight
- Target Date

**Section 4: Activity & Lifestyle**

- Activity Level

**Section 5: Diet & Preferences**

- Dietary Preferences (tags)
- Allergies & Restrictions (tags)
- Meals Per Day (stepper: 1-10)

**Section 6: Current Targets** (Read-only)

- BMR
- TDEE
- Daily Calorie Target
- Daily Protein Target
- Daily Water Target

### 2.3 Regeneration Logic

Plan regeneration is triggered when:

1. **Weight Changes** (≥1kg difference)
2. **Goal Changes** (primaryGoal or targetWeight modified)
3. **Timeline Changes** (targetDate modified)
4. **Demographics Change** (age, gender, or height modified)
5. **Activity Level Changes**

Regeneration happens through `PlansService.recomputeForUser()`:

- Recalculates BMR, TDEE, targets
- Updates user_settings
- Updates initial_plan_snapshot
- Only persists if change is significant (>50 cal or >10g protein)
- Returns previous and new values for user communication

---

## 3. User Flows

### 3.1 Primary Flow: Edit Profile Successfully

**Preconditions:**

- User is authenticated
- User has completed onboarding
- User has existing settings in `user_settings` table

**Steps:**

1. **Navigate to Profile**
   - User taps "Profile" tab in navigation
   - System loads current profile data from GET `/v1/auth/profile`
   - Display loading state, then profile form with pre-filled values

2. **Review Current Information**
   - User sees all profile fields organized in sections
   - Current targets displayed in read-only card at bottom
   - All fields are editable except calculated targets

3. **Edit Fields**
   - User modifies one or more fields (e.g., updates current weight from 85kg to 82kg)
   - Inline validation shows errors immediately (e.g., "Weight must be between 20-500 kg")
   - Helper text appears on focus
   - Save button enables when form is valid and has changes

4. **Save Changes**
   - User taps "Save Changes" button
   - Button shows loading state: "Saving..."
   - System validates all fields
   - If validation fails, show inline errors and scroll to first error
   - If validation passes, proceed to API call

5. **API Processing**
   - PUT request to `/v1/auth/profile/health` (for health metrics)
   - PUT request to `/v1/auth/profile/preferences` (for diet preferences)
   - System determines if plan regeneration needed
   - If yes, triggers `PlansService.recomputeForUser()`
   - Returns success response with updated targets (if changed)

6. **Success Feedback**
   - Button changes to "Saved" with checkmark (2 seconds)
   - Toast appears: "Profile updated! Your plan will adapt tomorrow." (or custom message based on what changed)
   - If targets changed, show comparison card:

     ```
     Your Targets Have Been Updated

     Daily Calories: 1,850 → 1,700 (-150)
     Daily Protein: 140g → 135g (-5g)

     These changes will be reflected starting tomorrow.
     ```

   - Updated values displayed in form
   - Button returns to "Save Changes" (disabled until next edit)

7. **Next Steps**
   - User can continue editing or navigate away
   - Changes are immediately persisted
   - Tomorrow's plan (generated at 00:05 UTC) will use new values

**Success Criteria:**

- p95 response time <300ms for health updates
- p95 response time <200ms for preference updates
- User sees clear confirmation of what changed
- Form reflects updated values immediately
- No data loss if user navigates away after save

### 3.2 Alternative Flow: Validation Error

**Trigger:** User enters invalid data

**Steps:**

1. User enters invalid value (e.g., weight = "abc" or 600kg)
2. On blur, inline error appears below field: "Weight must be between 20-500 kg"
3. Field border turns red
4. Save button remains disabled
5. Error persists until user corrects value
6. Once valid, error disappears and save button enables

**Error Messages by Field:**

| Field         | Validation      | Error Message                              |
| ------------- | --------------- | ------------------------------------------ |
| currentWeight | <20 or >500     | "Weight must be between 20-500 kg"         |
| targetWeight  | <20 or >500     | "Target weight must be between 20-500 kg"  |
| height        | <50 or >300     | "Height must be between 50-300 cm"         |
| dateOfBirth   | Age <13 or >120 | "You must be between 13 and 120 years old" |
| targetDate    | In past         | "Target date must be in the future"        |
| mealsPerDay   | <1 or >10       | "Meals per day must be between 1-10"       |

**Success Criteria:**

- Validation runs on blur and on submit
- Errors are clear and actionable
- User can correct and retry without navigating away

### 3.3 Alternative Flow: Network Error

**Trigger:** API request fails due to network/server issue

**Steps:**

1. User taps "Save Changes"
2. Button shows "Saving..." for up to 10 seconds
3. Request times out or returns 5xx error
4. Button returns to "Save Changes"
5. Error toast appears: "Unable to save changes. Please check your connection and try again."
6. Form values preserved (not lost)
7. User can retry save

**Retry Behavior:**

- Exponential backoff: immediate, 2s, 5s
- After 3 failures, show persistent error message
- "Retry" button appears in error state

**Success Criteria:**

- No data loss on network failure
- Clear error messaging
- User can retry without re-entering data

### 3.4 Alternative Flow: Unsaved Changes

**Trigger:** User navigates away with unsaved changes

**Steps:**

1. User modifies fields but doesn't save
2. User attempts to navigate away (back button, tab change)
3. System detects unsaved changes
4. Alert appears:

   ```
   Discard Changes?

   You have unsaved changes to your profile. If you leave now, your changes will be lost.

   [Cancel] [Discard]
   ```

5. If user taps "Cancel", stays on profile page
6. If user taps "Discard", navigates away and resets form

**Success Criteria:**

- Prevents accidental data loss
- Clear consequence messaging
- Easy to cancel and return to editing

### 3.5 Edge Case Flow: Extreme Changes

**Trigger:** User makes large weight change (>10kg) or impossible target date

**Weight Change >10kg:**

1. User updates weight by >10kg (e.g., 85kg → 95kg)
2. On blur, warning modal appears:

   ```
   Large Weight Change Detected

   You're changing your weight by 10kg. This is a significant change.

   Please verify:
   - This is your current accurate weight
   - You've weighed yourself properly (morning, before eating)

   [Cancel] [Confirm]
   ```

3. If confirmed, value accepted and saved
4. If cancelled, reverts to previous value

**Unrealistic Target Date:**

1. User sets target date for 2 weeks but wants to lose 20kg
2. On blur or save, warning appears:

   ```
   Unrealistic Timeline

   To lose 20kg in 2 weeks requires losing 10kg per week, which exceeds safe limits (0.5-1kg per week).

   Recommended target date: [calculated date 20-40 weeks out]

   [Adjust Date] [Keep Anyway]
   ```

3. If "Adjust Date", auto-populates recommended date
4. If "Keep Anyway", accepts user's date but logs warning

**Success Criteria:**

- Prevents clearly erroneous data entry
- Educates users about safe rates
- Allows override for edge cases

---

## 4. Copy & Messaging

### 4.1 Section Headers & Descriptions

**About You**

> Basic information that affects your metabolic calculations

**Current Status**

> Track your current weight to monitor progress

**Your Goal**

> Define what you want to achieve and when

**Activity & Lifestyle**

> How active are you on a typical day?

**Diet & Preferences**

> Dietary restrictions and meal preferences

**Current Targets**

> Your daily nutrition targets (automatically calculated)

### 4.2 Button States

| State                | Text         | Style                         |
| -------------------- | ------------ | ----------------------------- |
| Default (no changes) | Save Changes | Gray, disabled                |
| Valid changes        | Save Changes | Primary blue, enabled         |
| Saving               | Saving...    | Primary blue, loading spinner |
| Success              | Saved ✓      | Green, disabled, 2s duration  |
| Error                | Save Changes | Primary blue, enabled         |

### 4.3 Success Messages

**Standard Update (No Plan Change):**

```
✓ Profile updated successfully
```

**Update with Plan Regeneration:**

```
✓ Profile updated! Your plan will adapt tomorrow.

Your new targets will be reflected in tomorrow's daily plan, generated at midnight.
```

**Targets Changed:**

```
✓ Your Targets Have Been Updated

Daily Calories: 1,850 → 1,700 (-150)
Daily Protein: 140g → 135g (-5g)

These changes will be reflected starting tomorrow.
```

**Weight Updated:**

```
✓ Weight updated to 82kg

Great job! Your new weight has been recorded and your plan will adjust accordingly.
```

**Goal Changed:**

```
✓ Goal updated to "Lose Weight"

Your daily targets have been recalculated to support your new goal. Check your updated plan tomorrow!
```

### 4.4 Error Messages

**Generic Error:**

```
Unable to save changes. Please check your connection and try again.
```

**Validation Error:**

```
Please fix the errors below before saving.
[Scroll to first error]
```

**Server Error:**

```
Something went wrong on our end. Please try again in a moment.
```

**Rate Limited:**

```
You've updated your profile recently. Please wait a moment before making more changes.
```

### 4.5 Helper Text

**Date of Birth:**

> Your age affects calorie calculations. We use this to estimate your basal metabolic rate.

**Gender:**

> Used for accurate metabolic calculations. We support all gender identities.

**Height:**

> Enter your height in centimeters (e.g., 175cm = 5'9"). This affects BMI and calorie calculations.

**Current Weight:**

> Weigh yourself in the morning before eating for the most accurate measurement.

**Target Weight:**

> Your goal weight in kilograms. We'll help you reach it safely at 0.5-1kg per week.

**Target Date:**

> When you want to reach your goal. We'll calculate a realistic timeline based on safe rates.

**Activity Level:**

- **Sedentary:** Desk job, little to no exercise
- **Lightly Active:** Light exercise 1-3 days/week
- **Moderately Active:** Moderate exercise 3-5 days/week
- **Very Active:** Hard exercise 6-7 days/week
- **Extremely Active:** Physical job + daily intense training

**Dietary Preferences:**

> Select all that apply. This helps us suggest appropriate meals.

**Allergies:**

> Add foods you must avoid. We'll ensure they're not included in meal suggestions.

**Meals Per Day:**

> How many meals do you typically eat? This doesn't affect calorie targets, just how they're distributed.

### 4.6 Confirmation Dialogs

**Large Weight Change:**

```
Large Weight Change Detected

You're changing your weight by [X]kg. This is a significant change.

Please verify:
• This is your current accurate weight
• You've weighed yourself properly (morning, before eating)

[Cancel] [Confirm]
```

**Goal Change:**

```
Change Your Goal?

Changing your goal will recalculate your daily calorie and protein targets.

Current goal: [old goal]
New goal: [new goal]

Your plan will be updated tomorrow to reflect this change.

[Cancel] [Change Goal]
```

**Discard Changes:**

```
Discard Changes?

You have unsaved changes to your profile. If you leave now, your changes will be lost.

[Cancel] [Discard]
```

### 4.7 Empty States

**No Dietary Preferences:**

> No dietary preferences selected. Tap to add.

**No Allergies:**

> No allergies or restrictions. Tap to add.

---

## 5. Audit Trail Specification

### 5.1 Data Model

Create new table `profile_change_audit`:

```sql
CREATE TABLE profile_change_audit (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Change tracking
  field_name VARCHAR(50) NOT NULL,
  old_value TEXT,
  new_value TEXT,

  -- Context
  changed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  ip_address INET,
  user_agent TEXT,

  -- Impact tracking
  triggered_plan_regeneration BOOLEAN DEFAULT FALSE,
  calories_before INTEGER,
  calories_after INTEGER,
  protein_before INTEGER,
  protein_after INTEGER,

  -- Indexes
  INDEX idx_profile_audit_user_id (user_id),
  INDEX idx_profile_audit_changed_at (changed_at),
  INDEX idx_profile_audit_field_name (field_name)
);
```

### 5.2 Fields to Audit

| Field Category | Fields                                                   | Rationale                          |
| -------------- | -------------------------------------------------------- | ---------------------------------- |
| Health Metrics | `currentWeight`, `targetWeight`, `height`, `dateOfBirth` | Medical/legal importance           |
| Goals          | `primaryGoal`, `targetDate`, `activityLevel`             | Plan impact                        |
| Preferences    | `dietaryPreferences`, `allergies`, `mealsPerDay`         | Allergy safety                     |
| Calculated     | `bmr`, `tdee`, `calorieTarget`, `proteinTarget`          | Audit trail of system calculations |

### 5.3 What to Store

**Required Fields:**

- `user_id`: User who made the change
- `field_name`: Name of field changed (e.g., "currentWeight")
- `old_value`: Previous value (as string for flexibility)
- `new_value`: New value (as string)
- `changed_at`: Timestamp of change

**Optional Context:**

- `ip_address`: For fraud detection
- `user_agent`: Device/platform information
- `triggered_plan_regeneration`: Boolean flag
- `calories_before`/`calories_after`: If regeneration occurred
- `protein_before`/`protein_after`: If regeneration occurred

### 5.4 PII & Privacy Considerations

**GDPR Compliance:**

- Audit records tied to user_id (cascade delete when user deleted)
- No storage of sensitive medical details beyond what's necessary
- Retention: 90 days for operational needs, then anonymize (keep counts only)
- User can request audit export via support

**Anonymization After 90 Days:**

```sql
UPDATE profile_change_audit
SET user_id = NULL,
    ip_address = NULL,
    user_agent = NULL
WHERE changed_at < NOW() - INTERVAL '90 days';
```

### 5.5 Use Cases

**Support Debugging:**

> "User says their calories jumped from 1,500 to 2,000 unexpectedly."

Query:

```sql
SELECT * FROM profile_change_audit
WHERE user_id = ?
AND field_name IN ('calorieTarget', 'currentWeight', 'activityLevel')
ORDER BY changed_at DESC
LIMIT 10;
```

**Compliance Audit:**

> "Show all profile changes for user in last 30 days."

Query:

```sql
SELECT field_name, old_value, new_value, changed_at
FROM profile_change_audit
WHERE user_id = ?
AND changed_at > NOW() - INTERVAL '30 days'
ORDER BY changed_at ASC;
```

**Product Analytics:**

> "What percentage of users change their weight within first 30 days?"

Query:

```sql
SELECT
  COUNT(DISTINCT user_id) AS users_who_changed_weight,
  (COUNT(DISTINCT user_id) * 100.0 / (SELECT COUNT(*) FROM users)) AS percentage
FROM profile_change_audit
WHERE field_name = 'currentWeight'
AND changed_at > NOW() - INTERVAL '30 days';
```

**Fraud Detection:**

> "Find users making >10 profile changes per day (potential abuse)."

Query:

```sql
SELECT user_id, COUNT(*) as change_count
FROM profile_change_audit
WHERE changed_at > NOW() - INTERVAL '1 day'
GROUP BY user_id
HAVING COUNT(*) > 10;
```

### 5.6 Implementation Notes

- Insert audit record AFTER successful database update (in same transaction)
- Use background job for non-critical fields (preferences) to avoid blocking
- Log errors if audit insert fails, but don't fail the user's save operation
- Batch insert for multi-field updates (one row per field changed)

---

## 6. Technical Requirements

### 6.1 API Endpoints

#### 6.1.1 GET /v1/auth/profile

**Purpose:** Fetch complete user profile

**Authentication:** Required (JWT)

**Response:**

```json
{
  "success": true,
  "profile": {
    "user": {
      "id": 123,
      "email": "user@example.com",
      "name": "John Doe"
    },
    "demographics": {
      "dateOfBirth": "1990-01-15T00:00:00.000Z",
      "gender": "male",
      "height": 175.0
    },
    "health": {
      "currentWeight": 82.5,
      "targetWeight": 75.0
    },
    "goals": {
      "primaryGoal": "lose_weight",
      "targetDate": "2026-03-01T00:00:00.000Z",
      "activityLevel": "moderately_active"
    },
    "preferences": {
      "dietaryPreferences": ["vegetarian", "gluten_free"],
      "allergies": ["peanuts"],
      "mealsPerDay": 3
    },
    "targets": {
      "bmr": 1650,
      "tdee": 2200,
      "calorieTarget": 1700,
      "proteinTarget": 135,
      "waterTarget": 2625
    }
  }
}
```

**Performance Target:** p95 < 100ms

**Error Codes:**

- 401: Unauthorized
- 404: User settings not found (onboarding incomplete)
- 500: Server error

#### 6.1.2 PUT /v1/auth/profile/health

**Purpose:** Update health metrics (weight, height, DOB)

**Authentication:** Required (JWT)

**Request Body:**

```json
{
  "currentWeight": 82.5,
  "targetWeight": 75.0,
  "height": 175.0,
  "dateOfBirth": "1990-01-15T00:00:00.000Z"
}
```

**Response:**

```json
{
  "success": true,
  "profile": {
    "currentWeight": "82.50",
    "targetWeight": "75.00",
    "height": "175.00",
    "dateOfBirth": "1990-01-15T00:00:00.000Z"
  },
  "planUpdated": true,
  "targets": {
    "calorieTarget": 1700,
    "proteinTarget": 135,
    "waterTarget": 2625
  },
  "changes": {
    "previousCalories": 1850,
    "newCalories": 1700,
    "previousProtein": 140,
    "newProtein": 135
  }
}
```

**Performance Target:** p95 < 300ms

**Validation:**

- `currentWeight`: 20-500 kg
- `targetWeight`: 20-500 kg
- `height`: 50-300 cm
- `dateOfBirth`: Age 13-120 years

**Rate Limiting:** 10 requests per hour per user

#### 6.1.3 PUT /v1/auth/profile/goals

**Purpose:** Update goals and timeline

**Authentication:** Required (JWT)

**Request Body:**

```json
{
  "primaryGoal": "lose_weight",
  "targetWeight": 75.0,
  "targetDate": "2026-03-01T00:00:00.000Z",
  "activityLevel": "moderately_active"
}
```

**Response:** Same structure as health endpoint

**Performance Target:** p95 < 300ms

**Validation:**

- `primaryGoal`: Must be valid enum value
- `targetDate`: Must be in future
- `activityLevel`: Must be valid enum value

**Rate Limiting:** 10 requests per hour per user

#### 6.1.4 PUT /v1/auth/profile/preferences

**Purpose:** Update dietary preferences

**Authentication:** Required (JWT)

**Request Body:**

```json
{
  "dietaryPreferences": ["vegetarian", "gluten_free"],
  "allergies": ["peanuts", "shellfish"],
  "mealsPerDay": 3
}
```

**Response:**

```json
{
  "success": true,
  "message": "Preferences updated successfully",
  "data": {
    "dietaryPreferences": ["vegetarian", "gluten_free"],
    "allergies": ["peanuts", "shellfish"],
    "mealsPerDay": 3
  }
}
```

**Performance Target:** p95 < 200ms

**Validation:**

- `dietaryPreferences`: Max 10 items
- `allergies`: Max 20 items
- `mealsPerDay`: 1-10

**Rate Limiting:** 20 requests per hour per user

**Note:** Does NOT trigger plan regeneration

### 6.2 Performance Requirements

| Operation                 | p50 Target | p95 Target | p99 Target |
| ------------------------- | ---------- | ---------- | ---------- |
| GET /profile              | 50ms       | 100ms      | 150ms      |
| PUT /profile/health       | 150ms      | 300ms      | 500ms      |
| PUT /profile/goals        | 150ms      | 300ms      | 500ms      |
| PUT /profile/preferences  | 100ms      | 200ms      | 300ms      |
| Plan regeneration (async) | -          | 200ms      | 400ms      |

**Database Query Optimization:**

- Index on `user_settings.userId`
- Use `LIMIT 1` for single user queries
- Batch audit inserts to avoid N+1 queries

**Caching Strategy:**

- Cache GET /profile response for 5 minutes
- Invalidate cache on any profile update
- Use Redis with user_id as key

### 6.3 Rate Limiting

**Profile Updates:**

- 10 updates per hour per user for health/goals
- 20 updates per hour per user for preferences
- 429 response with `Retry-After` header

**Error Response:**

```json
{
  "success": false,
  "error": "Rate limit exceeded",
  "message": "You've updated your profile recently. Please wait a moment before making more changes.",
  "retryAfter": 300
}
```

**Bypass Rate Limits:**

- Support role can bypass for customer service
- Admin role can bypass for testing

### 6.4 Accessibility Requirements

**iOS Implementation:**

1. **VoiceOver Support**
   - All form fields must have accessibility labels
   - Helper text read after label
   - Validation errors announced immediately
   - Success confirmations announced

2. **Dynamic Type**
   - All text scales with system font size
   - Minimum 17pt for body text
   - Maximum 34pt for headers
   - Layout doesn't break at largest size

3. **Keyboard Navigation**
   - Tab order follows visual layout
   - Return key advances to next field
   - Done button on numeric keyboards
   - Focus indicator visible

4. **Color Contrast**
   - 4.5:1 minimum for body text
   - 3:1 minimum for large text (18pt+)
   - Error states don't rely solely on color
   - Icons with text labels

5. **Touch Targets**
   - Minimum 44x44 points for all interactive elements
   - Adequate spacing between buttons
   - Stepper buttons easily tappable

**Accessibility Labels:**

| Element         | Label            | Hint                                     |
| --------------- | ---------------- | ---------------------------------------- |
| Weight field    | "Current weight" | "Enter your current weight in kilograms" |
| Save button     | "Save changes"   | "Save your profile updates"              |
| Date picker     | "Date of birth"  | "Select your date of birth"              |
| Activity picker | "Activity level" | "Select how active you are"              |

### 6.5 Offline Behavior

**iOS Implementation:**

1. **Read Mode (Offline)**
   - Show cached profile data
   - All fields display last known values
   - Banner: "You're offline. Changes will sync when you reconnect."
   - Save button disabled with offline indicator

2. **Edit Mode (Offline)**
   - Allow edits to form
   - Store changes locally
   - Show banner: "Changes saved locally. Will sync when online."
   - Queue updates for sync when network returns

3. **Sync on Reconnect**
   - Automatically POST queued changes
   - Show progress indicator
   - On success: "Profile synced"
   - On conflict: Show merge UI (server data vs local edits)

**Conflict Resolution:**

- Server timestamp wins by default
- User can choose "Keep Local" or "Use Server"
- Log conflicts for analysis

### 6.6 Error Handling

**Client-Side Validation:**

- Run on blur (field exit)
- Run on submit
- Block submit if validation fails
- Clear errors when corrected

**Server-Side Validation:**

- Duplicate all client-side validations
- Additional business logic checks
- Return 400 with detailed field errors

**Error Response Format:**

```json
{
  "success": false,
  "error": "Validation error",
  "message": "Please fix the errors below",
  "fieldErrors": {
    "currentWeight": "Weight must be between 20-500 kg",
    "targetDate": "Target date must be in the future"
  }
}
```

**Retry Logic:**

- Automatic retry on 5xx errors (3 attempts)
- Exponential backoff: 1s, 2s, 5s
- Manual retry button on persistent failure
- No retry on 4xx errors (client error)

### 6.7 Security Requirements

**Input Sanitization:**

- Strip HTML from all text inputs
- Validate numbers are actually numbers
- Prevent SQL injection (use parameterized queries)
- Prevent XSS (escape output)

**Authentication:**

- JWT required for all endpoints
- Token refresh if expired
- Invalid token returns 401

**Authorization:**

- Users can only edit their own profile
- Check `req.userId === profileUserId`
- Admin can edit any profile (audit logged)

**Data Validation:**

- Validate on client AND server
- Never trust client data
- Sanitize before database insert
- Audit all changes

---

## 7. Success Metrics

### 7.1 Adoption Metrics

| Metric             | Definition                                        | Target    | Measurement                               |
| ------------------ | ------------------------------------------------- | --------- | ----------------------------------------- |
| Profile Edit Rate  | % of users who edit profile in first 30 days      | 60%       | `(users_who_edited / total_users) * 100`  |
| Time to First Edit | Median days from onboarding to first profile edit | <7 days   | Track `MIN(changed_at) - user.created_at` |
| Edit Frequency     | Average profile edits per user per month          | 2-3 edits | `COUNT(edits) / COUNT(users) / months`    |
| Weight Update Rate | % of users who update weight weekly               | 70%       | Track weight changes per user per week    |

**Query for Profile Edit Rate:**

```sql
SELECT
  COUNT(DISTINCT user_id) AS users_who_edited,
  (SELECT COUNT(*) FROM users WHERE created_at > NOW() - INTERVAL '30 days') AS total_new_users,
  (COUNT(DISTINCT user_id) * 100.0 /
    (SELECT COUNT(*) FROM users WHERE created_at > NOW() - INTERVAL '30 days')
  ) AS edit_rate_percentage
FROM profile_change_audit
WHERE changed_at > NOW() - INTERVAL '30 days';
```

### 7.2 Engagement Metrics

| Metric                    | Definition                                       | Target     | Measurement                                  |
| ------------------------- | ------------------------------------------------ | ---------- | -------------------------------------------- |
| Fields Edited per Session | Average number of fields changed when user edits | 2-3 fields | `COUNT(field_changes) / COUNT(sessions)`     |
| Most Edited Fields        | Top 5 fields by edit frequency                   | -          | `GROUP BY field_name ORDER BY COUNT(*) DESC` |
| Multi-Field Updates       | % of edits that change >1 field                  | 40%        | Sessions with >1 field change                |
| Return to Edit            | % of users who edit profile multiple times       | 50%        | Users with >1 edit session                   |

**Query for Most Edited Fields:**

```sql
SELECT
  field_name,
  COUNT(*) AS edit_count,
  COUNT(DISTINCT user_id) AS unique_users
FROM profile_change_audit
WHERE changed_at > NOW() - INTERVAL '30 days'
GROUP BY field_name
ORDER BY edit_count DESC
LIMIT 5;
```

### 7.3 Performance Metrics

| Metric            | Definition                              | Target     | Measurement                                |
| ----------------- | --------------------------------------- | ---------- | ------------------------------------------ |
| API Response Time | p95 latency for profile endpoints       | <300ms     | Monitor via APM (OpenTelemetry)            |
| Error Rate        | % of profile save requests that fail    | <1%        | `(failed_requests / total_requests) * 100` |
| Time to Save      | User-perceived time from tap to success | <2 seconds | Client-side instrumentation                |
| Retry Rate        | % of users who retry after failure      | <5%        | Track retry button clicks                  |

**Monitoring:**

- Use OpenTelemetry spans already in place
- Alert if p95 > 300ms for 5 minutes
- Alert if error rate > 5% for 5 minutes

### 7.4 Plan Impact Metrics

| Metric                   | Definition                                     | Target      | Measurement                                  |
| ------------------------ | ---------------------------------------------- | ----------- | -------------------------------------------- |
| Plan Regeneration Rate   | % of profile edits that trigger regeneration   | 70%         | `triggered_plan_regeneration = true`         |
| Calorie Change Magnitude | Average absolute change in daily calories      | 100-200 cal | `AVG(ABS(calories_after - calories_before))` |
| Weight-Driven Changes    | % of regenerations triggered by weight updates | 60%         | Filter by `field_name = 'currentWeight'`     |
| Goal Changes             | % of users who change their primary goal       | 15%         | `field_name = 'primaryGoal'`                 |

**Query for Plan Impact:**

```sql
SELECT
  COUNT(*) AS total_edits,
  SUM(CASE WHEN triggered_plan_regeneration THEN 1 ELSE 0 END) AS regenerations,
  (SUM(CASE WHEN triggered_plan_regeneration THEN 1 ELSE 0 END) * 100.0 / COUNT(*)) AS regen_rate,
  AVG(ABS(calories_after - calories_before)) AS avg_calorie_change
FROM profile_change_audit
WHERE changed_at > NOW() - INTERVAL '30 days'
AND calories_before IS NOT NULL;
```

### 7.5 User Experience Metrics

| Metric                 | Definition                                     | Target        | Measurement                   |
| ---------------------- | ---------------------------------------------- | ------------- | ----------------------------- |
| Validation Error Rate  | % of save attempts that fail validation        | <10%          | Client-side analytics         |
| Time in Form           | Average time spent on profile page per session | 60-90 seconds | Session duration tracking     |
| Field Interaction Rate | % of fields user interacts with vs views       | >50%          | Track focus events            |
| Abandonment Rate       | % of users who start editing but don't save    | <20%          | Track form edits without save |

**Success Dashboard:**
Create Grafana dashboard with:

- Profile edit rate trend (last 30 days)
- Most edited fields (pie chart)
- API performance (p50, p95, p99 latency)
- Error rate by endpoint
- Plan regeneration rate over time

---

## 8. Open Questions

### 8.1 Product Questions

**Q1: Should we allow users to edit their profile on the same day they completed onboarding?**

- **Impact:** May lead to confusion or "buyer's remorse" changes
- **Options:**
  - A) Allow immediately (trust users)
  - B) Lock for 24 hours after onboarding
  - C) Show confirmation modal if <24h since onboarding
- **Recommendation:** Option A, but track this metric to see if pattern emerges
- **Owner:** Product Manager
- **Deadline:** Before dev sprint starts

**Q2: What happens if a user's target date has passed but they haven't reached their goal?**

- **Current State:** System continues with outdated target date
- **Options:**
  - A) Auto-extend target date by X weeks
  - B) Flag profile as "needs update" and show banner
  - C) Keep as-is and let user decide
- **Recommendation:** Option B - banner prompts user to update
- **Owner:** Product Manager
- **Deadline:** Before launch

**Q3: Should dietary preferences trigger any form of plan update?**

- **Current State:** No plan regeneration for preference changes
- **Issue:** User goes vegetarian but still sees meat in meal plans
- **Options:**
  - A) Keep current behavior (preferences apply to NEW plans only)
  - B) Trigger meal plan refresh (not calorie recalc)
  - C) Show banner: "Preferences will apply to tomorrow's plan"
- **Recommendation:** Option C for v1, Option B for v2
- **Owner:** Product Manager + Eng Lead
- **Deadline:** Before dev sprint starts

### 8.2 Technical Questions

**Q4: How do we handle race conditions if user edits profile while daily job is running?**

- **Scenario:** User saves profile at 00:04, daily job runs at 00:05
- **Risk:** Job overwrites user's changes OR user's changes overwrite job's calculations
- **Options:**
  - A) Add database lock during updates
  - B) Use `updated_at` timestamp to detect conflicts
  - C) Daily job runs at 00:05, profile edits queue for 00:10
- **Recommendation:** Option B with last-write-wins, log conflicts
- **Owner:** Backend Lead
- **Deadline:** Before dev sprint starts

**Q5: Should we cache the profile endpoint?**

- **Benefit:** Faster load times, less DB load
- **Risk:** Stale data after updates
- **Options:**
  - A) No cache (always fresh)
  - B) Cache for 5 minutes, invalidate on update
  - C) Cache for 1 minute, allow stale-while-revalidate
- **Recommendation:** Option B
- **Owner:** Backend Lead
- **Deadline:** During implementation

**Q6: How do we handle partial update failures?**

- **Scenario:** Health metrics save succeeds, preferences save fails
- **Options:**
  - A) Rollback health metrics (all-or-nothing)
  - B) Show partial success message
  - C) Retry failed portions automatically
- **Recommendation:** Option C with fallback to Option B if retry fails
- **Owner:** Backend + Frontend Leads
- **Deadline:** Before dev sprint starts

### 8.3 Design Questions

**Q7: Should we show a "before/after" comparison for all changes or only when targets change?**

- **Current Proposal:** Only show when calories or protein change
- **Alternative:** Show all changes in a summary modal
- **Tradeoff:** More information vs. simplicity
- **Recommendation:** V1 = only target changes, V2 = full change summary
- **Owner:** Design Lead + PM
- **Deadline:** Before design handoff

**Q8: Should the profile form be one long page or multiple tabs/sections?**

- **Options:**
  - A) Single scrollable page with sections
  - B) Multi-step wizard (like onboarding)
  - C) Tabbed interface (Demographics | Goals | Preferences)
- **Recommendation:** Option A for simplicity, revisit if >70% abandon before save
- **Owner:** Design Lead
- **Deadline:** Before design handoff

### 8.4 Compliance Questions

**Q9: Do we need explicit consent to store profile change history?**

- **Legal Context:** GDPR requires consent for non-essential data processing
- **Audit trail use:** Debugging, support, fraud detection
- **Options:**
  - A) Audit is "legitimate interest" (no consent needed)
  - B) Add consent checkbox on first profile edit
  - C) Include in privacy policy (no separate consent)
- **Recommendation:** Get legal review, likely Option C
- **Owner:** Legal + Product Manager
- **Deadline:** Before launch

**Q10: How long should we retain audit logs?**

- **Current Proposal:** 90 days, then anonymize
- **Alternatives:** 30 days, 180 days, forever (anonymized)
- **Tradeoff:** Compliance vs. analytics value
- **Recommendation:** 90 days for PII, 2 years for anonymized aggregates
- **Owner:** Legal + Data Lead
- **Deadline:** Before launch

---

## 9. Acceptance Criteria

### 9.1 Feature-Level Acceptance Criteria

**Must Have (Launch Blockers):**

- [ ] User can view complete profile with all fields
- [ ] User can edit any editable field
- [ ] User can save changes successfully
- [ ] System validates all inputs against specified ranges
- [ ] System shows inline validation errors
- [ ] System prevents saving invalid data
- [ ] System shows clear success confirmation
- [ ] System updates displayed values after save
- [ ] Profile changes trigger plan regeneration when appropriate
- [ ] System logs all profile changes to audit table
- [ ] GET /profile endpoint returns complete profile in <100ms (p95)
- [ ] PUT /profile endpoints complete in <300ms (p95)
- [ ] All endpoints require authentication
- [ ] Rate limiting prevents abuse (10 req/hr for health updates)
- [ ] Error messages are clear and actionable

**Should Have (Post-Launch Improvements):**

- [ ] Offline editing with sync on reconnect
- [ ] Before/after comparison for all changes
- [ ] User can export their profile change history
- [ ] Admin dashboard shows profile edit analytics
- [ ] System suggests optimal target dates based on goal
- [ ] Smart defaults based on user's previous patterns

**Nice to Have (Future Enhancements):**

- [ ] Profile templates for common scenarios
- [ ] Bulk import from fitness trackers
- [ ] Photo upload for progress tracking
- [ ] Share profile with coach/trainer
- [ ] Schedule future profile updates (e.g., "update weight every Monday")

### 9.2 Component-Level Acceptance Criteria

#### Profile View Screen

- [ ] Displays all profile sections in correct order
- [ ] All fields pre-populated with current values
- [ ] Read-only fields clearly distinguished (grayed out)
- [ ] Helper text appears on field focus
- [ ] Current targets card shows latest values
- [ ] Loads in <1 second on average
- [ ] Handles missing data gracefully (shows placeholders)
- [ ] VoiceOver reads all content correctly
- [ ] Supports Dynamic Type (font scaling)
- [ ] Save button disabled when no changes
- [ ] Save button enabled when form valid and has changes

#### Profile Edit Flow

- [ ] Inline validation runs on blur
- [ ] Errors displayed below field with red border
- [ ] Multiple errors shown simultaneously
- [ ] Errors clear when field corrected
- [ ] Form scrolls to first error on submit attempt
- [ ] Save button shows loading state during request
- [ ] Success toast appears after successful save
- [ ] Form values update to reflect saved data
- [ ] Unsaved changes warning on navigation
- [ ] Keyboard dismisses appropriately

#### Health Metrics Update

- [ ] Weight validation: 20-500 kg
- [ ] Height validation: 50-300 cm
- [ ] DOB validation: age 13-120
- [ ] Large weight change (>10kg) shows warning modal
- [ ] Weight change triggers BMI recalculation
- [ ] System calls PlansService.recomputeForUser()
- [ ] Response includes before/after targets
- [ ] Audit record created for each field
- [ ] p95 latency <300ms

#### Goals Update

- [ ] Primary goal enum validation
- [ ] Target date must be in future
- [ ] Unrealistic timeline shows warning
- [ ] Activity level enum validation
- [ ] Goal change shows impact explanation
- [ ] System recalculates projected timeline
- [ ] Response includes new weekly rate
- [ ] Audit record created
- [ ] p95 latency <300ms

#### Preferences Update

- [ ] Dietary preferences limited to 10 items
- [ ] Allergies limited to 20 items
- [ ] Meals per day: 1-10
- [ ] Free-form tag input works
- [ ] Does NOT trigger plan regeneration
- [ ] Success message different (no "plan adapts tomorrow")
- [ ] Audit record created
- [ ] p95 latency <200ms

#### Audit Trail

- [ ] Record created for each field change
- [ ] Includes old_value and new_value
- [ ] Includes timestamp and user_id
- [ ] Includes plan regeneration flag
- [ ] Includes before/after calories/protein if regenerated
- [ ] IP address captured
- [ ] User agent captured
- [ ] Query performance <50ms for last 30 days
- [ ] Anonymization job runs on schedule

### 9.3 Testing Acceptance Criteria

**Unit Tests:**

- [ ] Validation schemas have 100% coverage
- [ ] PlansService.recomputeForUser() tested with all scenarios
- [ ] Audit insertion tested
- [ ] Error handling tested

**Integration Tests:**

- [ ] GET /profile returns correct structure
- [ ] PUT /profile/health updates database
- [ ] PUT /profile/health triggers regeneration
- [ ] PUT /profile/preferences does NOT trigger regeneration
- [ ] Concurrent edits handled correctly
- [ ] Rate limiting blocks excessive requests

**End-to-End Tests:**

- [ ] User can complete full edit flow
- [ ] Validation errors prevent save
- [ ] Success confirmation appears
- [ ] Profile values update in UI
- [ ] Navigation warning works
- [ ] Offline behavior correct

**Performance Tests:**

- [ ] GET /profile p95 <100ms (load test with 100 concurrent users)
- [ ] PUT /profile/health p95 <300ms (load test with 100 concurrent users)
- [ ] No memory leaks during repeated edits
- [ ] Database queries optimized (no N+1)

**Accessibility Tests:**

- [ ] VoiceOver announces all content
- [ ] Dynamic Type scales correctly
- [ ] Keyboard navigation works
- [ ] Color contrast meets WCAG AA
- [ ] Touch targets ≥44x44 points

### 9.4 Documentation Acceptance Criteria

**API Documentation:**

- [ ] All endpoints documented with examples
- [ ] Request/response schemas defined
- [ ] Error codes listed
- [ ] Rate limits specified
- [ ] Authentication requirements clear

**Mobile Documentation:**

- [ ] Component usage guide
- [ ] State management explained
- [ ] Error handling patterns documented
- [ ] Accessibility implementation notes
- [ ] Offline sync architecture

**User Documentation:**

- [ ] Help article: "How to update your profile"
- [ ] FAQ: "Why did my calorie target change?"
- [ ] FAQ: "How often should I update my weight?"
- [ ] Video tutorial (optional)

### 9.5 Launch Readiness Criteria

**Before Beta Launch:**

- [ ] All "Must Have" acceptance criteria met
- [ ] Unit test coverage >80%
- [ ] Integration tests pass
- [ ] Performance targets met
- [ ] Security review complete
- [ ] Accessibility audit complete
- [ ] API documentation published
- [ ] Rollback plan documented
- [ ] Monitoring dashboards created
- [ ] Error alerting configured

**Before General Availability:**

- [ ] Beta testing complete (50+ users, 2+ weeks)
- [ ] No P0 or P1 bugs
- [ ] User feedback incorporated
- [ ] Help documentation published
- [ ] Support team trained
- [ ] Analytics instrumentation verified
- [ ] Load testing passed (10,000+ users)
- [ ] Disaster recovery plan documented

---

## Appendix A: Related Documents

- [GTSD iOS Architecture](/Users/devarisbrown/Code/projects/gtsd/apps/GTSD_iOS_ARCHITECTURE.md)
- [GTSD Product Spec](/Users/devarisbrown/Code/projects/gtsd/apps/GTSD_PRODUCT_SPEC.md)
- Database Schema: `/apps/api/src/db/schema.ts`
- Onboarding Schemas: `/apps/api/src/routes/onboarding/schemas.ts`
- Existing Profile Endpoints: `/apps/api/src/routes/auth/profile-*.ts`

## Appendix B: Revision History

| Version | Date       | Author             | Changes     |
| ------- | ---------- | ------------------ | ----------- |
| 1.0     | 2025-10-30 | Product Management | Initial PRD |

---

**End of Document**

_For questions or clarifications, contact the Product Manager._
