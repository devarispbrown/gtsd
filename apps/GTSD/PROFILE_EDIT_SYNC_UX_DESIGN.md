# Profile Edit & Sync - UX Design Specification

**Product:** GTSD (Get Things Successfully Done)
**Feature:** Profile Edit & Sync
**Version:** 1.0
**Last Updated:** 2025-10-30
**Designer:** UX Design Team
**Status:** Ready for Implementation

---

## Table of Contents

1. [Design Philosophy](#design-philosophy)
2. [Section Organization](#section-organization)
3. [Complete Field Specifications](#complete-field-specifications)
4. [Helper Text & Copy](#helper-text--copy)
5. [Validation Messages](#validation-messages)
6. [Save Flow & Feedback](#save-flow--feedback)
7. [Plan Impact Communication](#plan-impact-communication)
8. [Empty States](#empty-states)
9. [Mobile-First Patterns](#mobile-first-patterns)
10. [Accessibility Specifications](#accessibility-specifications)
11. [Interaction Patterns & Animations](#interaction-patterns--animations)
12. [Edge Cases & Error Handling](#edge-cases--error-handling)
13. [Visual Mockups](#visual-mockups)
14. [Implementation Checklist](#implementation-checklist)

---

## 1. Design Philosophy

### Core Principles

**User Empowerment**

- Users should feel in control of their health data
- Clear explanation of what each field does and why it matters
- Transparent communication about how changes affect their plan

**Progressive Disclosure**

- Show complexity only when necessary
- Group related fields to reduce cognitive load
- Hide technical details (BMR, TDEE) unless user is interested

**Trust Through Transparency**

- Always explain what will happen before it happens
- Show before/after comparisons when values change
- Be explicit about timing ("changes apply tomorrow")

**Forgiveness**

- Allow users to correct mistakes easily
- Warn before data loss (navigation away with unsaved changes)
- Validate inline but don't block until submission

**Mobile-First**

- Touch-friendly input methods (pickers, steppers, not dropdowns)
- Keyboard handling that feels natural
- Minimize typing where possible

---

## 2. Section Organization

### Section Hierarchy

The profile edit form is organized into 7 logical sections that follow the user's mental model:

```
┌─────────────────────────────────────┐
│ 1. About You                        │  ← Demographics (rarely changed)
├─────────────────────────────────────┤
│ 2. Current Status                   │  ← Health metrics (frequently changed)
├─────────────────────────────────────┤
│ 3. Your Goal                        │  ← Goals & timeline (moderately changed)
├─────────────────────────────────────┤
│ 4. Activity & Lifestyle             │  ← Activity level (moderately changed)
├─────────────────────────────────────┤
│ 5. Diet & Preferences               │  ← Dietary preferences (frequently changed)
├─────────────────────────────────────┤
│ 6. Current Targets                  │  ← Read-only calculated values
├─────────────────────────────────────┤
│ 7. Save Changes                     │  ← Action button
└─────────────────────────────────────┘
```

### Section 1: About You

**Purpose:** Capture demographic information that affects metabolic calculations
**Change Frequency:** Rarely (maybe once or never)
**Plan Impact:** High (recalculates BMR/TDEE)

**Section Header:**

```
About You
Basic information that affects your metabolic calculations
```

**Badge:** 🔄 Affects your plan (shown in top-right of section header)

**Fields (in order):**

1. Date of Birth
2. Gender
3. Height

**Visual Treatment:**

- Slightly muted (gray background) to signal "less frequently changed"
- Confirmation modal required for edits (see Edge Cases)

---

### Section 2: Current Status

**Purpose:** Track current weight for progress monitoring
**Change Frequency:** High (weekly or more)
**Plan Impact:** High (recalculates targets if >1kg change)

**Section Header:**

```
Current Status
Track your current weight to monitor progress
```

**Badge:** 🔄 Affects your plan

**Fields (in order):**

1. Current Weight

**Visual Treatment:**

- Prominent placement (2nd section, right after demographics)
- Large, bold input for weight (most frequently updated field)
- Helper text always visible (not just on focus)

---

### Section 3: Your Goal

**Purpose:** Define what user wants to achieve and when
**Change Frequency:** Moderate (every few weeks)
**Plan Impact:** High (recalculates timeline and targets)

**Section Header:**

```
Your Goal
Define what you want to achieve and when
```

**Badge:** 🔄 Affects your plan

**Fields (in order):**

1. Primary Goal
2. Target Weight
3. Target Date

**Visual Treatment:**

- Goal change shows confirmation modal explaining impact
- Target date shows timeline calculator helper

---

### Section 4: Activity & Lifestyle

**Purpose:** Capture how active user is to calculate TDEE
**Change Frequency:** Moderate (every few weeks)
**Plan Impact:** High (affects calorie target)

**Section Header:**

```
Activity & Lifestyle
How active are you on a typical day?
```

**Badge:** 🔄 Affects your plan

**Fields (in order):**

1. Activity Level

**Visual Treatment:**

- Picker with detailed descriptions for each level
- Helper text explains each option clearly

---

### Section 5: Diet & Preferences

**Purpose:** Capture dietary restrictions and preferences
**Change Frequency:** High (can change often)
**Plan Impact:** Low (affects meal suggestions, not targets)

**Section Header:**

```
Diet & Preferences
Dietary restrictions and meal preferences
```

**Badge:** None (doesn't affect plan targets)

**Fields (in order):**

1. Dietary Preferences (tag input)
2. Allergies & Restrictions (tag input)
3. Meals Per Day (stepper)

**Visual Treatment:**

- Tag input with suggestions (common diets)
- No plan regeneration warning

---

### Section 6: Current Targets

**Purpose:** Show calculated nutrition targets (read-only)
**Change Frequency:** Never (system-managed)
**Plan Impact:** N/A (display only)

**Section Header:**

```
Current Targets
Your daily nutrition targets (automatically calculated)
```

**Badge:** None

**Fields (in order):**

1. BMR (Basal Metabolic Rate)
2. TDEE (Total Daily Energy Expenditure)
3. Daily Calorie Target
4. Daily Protein Target
5. Daily Water Target

**Visual Treatment:**

- Card-based layout (not form inputs)
- Grayed out to signal read-only
- Info icon with explanation of each metric
- Shows before/after when values change after save

---

### Section 7: Save Changes

**Purpose:** Primary action to persist edits
**Change Frequency:** N/A
**Plan Impact:** Triggers validation and save flow

**Visual Treatment:**

- Full-width primary button
- Sticky at bottom (always visible)
- Dynamic text based on state (see Save Flow)

---

## 3. Complete Field Specifications

### Field Specification Table

| Field Name             | Type        | Input Method               | Validation   | Required | Default Trigger | Plan Impact   |
| ---------------------- | ----------- | -------------------------- | ------------ | -------- | --------------- | ------------- |
| **dateOfBirth**        | Date        | Date Picker                | Age 13-120   | Yes      | On blur         | Yes (BMR)     |
| **gender**             | Enum        | Segmented Control          | Valid enum   | Yes      | On change       | Yes (BMR)     |
| **height**             | Number (cm) | Number Input + Unit Toggle | 50-300 cm    | Yes      | On blur         | Yes (BMR/BMI) |
| **currentWeight**      | Number (kg) | Number Input + Unit Toggle | 20-500 kg    | Yes      | On blur         | Yes (>1kg)    |
| **targetWeight**       | Number (kg) | Number Input + Unit Toggle | 20-500 kg    | Yes      | On blur         | Yes (always)  |
| **primaryGoal**        | Enum        | Picker                     | Valid enum   | Yes      | On change       | Yes (always)  |
| **targetDate**         | Date        | Date Picker                | Future date  | Yes      | On blur         | Yes (always)  |
| **activityLevel**      | Enum        | Picker                     | Valid enum   | Yes      | On change       | Yes (TDEE)    |
| **dietaryPreferences** | String[]    | Tag Input                  | Max 10 items | No       | On blur         | No            |
| **allergies**          | String[]    | Tag Input                  | Max 20 items | No       | On blur         | No            |
| **mealsPerDay**        | Integer     | Stepper                    | 1-10         | Yes      | On change       | No            |

---

### Detailed Field Specifications

#### Date of Birth

**User Label:** Date of Birth
**Placeholder:** Select your date of birth
**Input Type:** Date Picker (wheel style on iOS)
**Default Value:** None (user must select)

**Validation:**

- Age must be between 13 and 120 years
- Cannot be in the future
- Must be a valid date

**Helper Text:**

```
Your age affects calorie calculations. We use this to estimate your
basal metabolic rate (BMR) - the calories your body burns at rest.
```

**Accessibility:**

- Label: "Date of birth"
- Hint: "Select your date of birth. Used for metabolic calculations."
- Value announced: "Born on [formatted date]"

**Confirmation Required:** Yes (if changing existing value)

```
Confirm Date of Birth Change

Changing your date of birth will affect your baseline calorie calculations.

Previous: [old date] (Age: X)
New: [new date] (Age: Y)

This change will recalculate your BMR and update your plan tomorrow.

[Cancel] [Confirm]
```

---

#### Gender

**User Label:** Gender
**Input Type:** Segmented Control (Male, Female, Other)
**Default Value:** None (user must select)

**Validation:**

- Must select one of the three options
- Custom entry allowed for "Other" (max 20 chars)

**Helper Text:**

```
Used for accurate metabolic calculations. We support all gender identities.
For calorie calculations, we use male/female/other categories.
```

**Accessibility:**

- Label: "Gender"
- Hint: "Select your gender. Used for metabolic calculations."
- Value announced: "Selected: [gender]"

---

#### Height

**User Label:** Height
**Placeholder:** 0
**Input Type:** Number pad with unit toggle (cm/ft+in)
**Default Value:** None (user must enter)

**Unit Toggle:**

- Default: Metric (cm)
- Toggle: Imperial (ft + in)
- Conversion happens live

**Validation:**

- Metric: 50-300 cm
- Imperial: 1'8" - 9'10"
- Must be numeric

**Helper Text:**

```
Enter your height. This affects BMI and calorie calculations.

Metric: Centimeters (e.g., 175 cm = 5'9")
Imperial: Feet and inches (e.g., 5'9")
```

**Accessibility:**

- Label: "Height"
- Hint: "Enter your height in [current unit]"
- Value announced: "Height: [value] [unit]"

**Warning Trigger:**
If height changes by >5cm from previous value:

```
Large Height Change Detected

You're changing your height by [X] cm. For most adults, height doesn't
change significantly.

Please verify this is correct.

[Cancel] [Confirm]
```

---

#### Current Weight

**User Label:** Current Weight
**Placeholder:** 0
**Input Type:** Decimal number pad with unit toggle (kg/lbs)
**Default Value:** None (user must enter)

**Unit Toggle:**

- Default: Metric (kg)
- Toggle: Imperial (lbs)
- Conversion happens live with 1 decimal precision

**Validation:**

- Metric: 20-500 kg
- Imperial: 44-1102 lbs
- Must be numeric
- Decimals allowed (1 place)

**Helper Text:**

```
Weigh yourself in the morning before eating for the most accurate
measurement. This is your starting point for tracking progress.

💡 Tip: Same time, same conditions for consistency
```

**Accessibility:**

- Label: "Current weight"
- Hint: "Enter your current weight in [current unit]"
- Value announced: "Current weight: [value] [unit]"

**Warning Trigger:**
If weight changes by >10kg from previous value:

```
Large Weight Change Detected

You're changing your weight by [X] kg. This is a significant change.

Please verify:
✓ This is your current accurate weight
✓ You've weighed yourself properly (morning, before eating)

[Cancel] [Confirm]
```

**Success Feedback:**

```
✓ Weight updated to [X] kg

Great job! Your new weight has been recorded and your plan will
adjust accordingly starting tomorrow.
```

---

#### Target Weight

**User Label:** Target Weight
**Placeholder:** 0
**Input Type:** Decimal number pad with unit toggle (kg/lbs)
**Default Value:** None (user must enter)

**Unit Toggle:** Same as Current Weight

**Validation:**

- Metric: 20-500 kg
- Imperial: 44-1102 lbs
- Must be numeric
- Decimals allowed (1 decimal place)

**Helper Text:**

```
Your goal weight in [unit]. We'll help you reach it safely at
0.5-1kg (1-2 lbs) per week.

Healthy weight loss: 0.5-1kg per week
Healthy weight gain: 0.25-0.5kg per week
```

**Accessibility:**

- Label: "Target weight"
- Hint: "Enter your target weight in [current unit]"
- Value announced: "Target weight: [value] [unit]"

**Smart Helper:**
Show calculated timeline based on current weight and target weight:

```
Based on your current weight ([X] kg) and target weight ([Y] kg):

• To lose [Z] kg safely: [W] weeks (at 0.5-1kg/week)
• Recommended target date: [calculated date]

[Use This Date]
```

---

#### Primary Goal

**User Label:** Primary Goal
**Input Type:** Picker (iOS native wheel picker)
**Default Value:** None (user must select)

**Options:**

1. Lose Weight
2. Gain Muscle
3. Maintain Weight
4. Improve Health

**Validation:**

- Must select one option

**Helper Text:**

```
Your main fitness objective. This determines your calorie target and
macro split.

• Lose Weight: Calorie deficit for fat loss
• Gain Muscle: Calorie surplus for muscle building
• Maintain Weight: Calorie balance for maintenance
• Improve Health: Focus on nutrition quality
```

**Accessibility:**

- Label: "Primary goal"
- Hint: "Select your main fitness objective"
- Value announced: "Selected: [goal name]"

**Confirmation Required:** Yes

```
Change Your Goal?

Changing your goal will recalculate your daily calorie and protein targets.

Current goal: [old goal]
New goal: [new goal]

Your plan will be updated tomorrow to reflect this change.

[Cancel] [Change Goal]
```

**Success Feedback:**

```
✓ Goal updated to "[New Goal]"

Your daily targets have been recalculated to support your new goal.
Check your updated plan tomorrow!
```

---

#### Target Date

**User Label:** Target Date
**Input Type:** Date Picker (wheel style on iOS)
**Default Value:** None (user must select)

**Validation:**

- Must be in the future (at least tomorrow)
- Maximum: 2 years from now
- Must allow realistic progress (calculated from weight change needed)

**Helper Text:**

```
When you want to reach your goal. We'll calculate a realistic timeline
based on safe weight change rates.

Safe rates:
• Weight loss: 0.5-1kg per week
• Weight gain: 0.25-0.5kg per week
```

**Accessibility:**

- Label: "Target date"
- Hint: "Select when you want to reach your goal"
- Value announced: "Target date: [formatted date]"

**Warning Trigger:**
If timeline is unrealistic:

```
Unrealistic Timeline

To [lose/gain] [X] kg by [target date] requires [Y] kg per week,
which exceeds safe limits.

Safe rate: 0.5-1kg per week
Your rate: [Y] kg per week

Recommended target date: [calculated safe date]

[Adjust Date] [Keep Anyway]
```

---

#### Activity Level

**User Label:** Activity Level
**Input Type:** Picker with detailed descriptions
**Default Value:** None (user must select)

**Options:**

**Sedentary**

```
Sedentary
Desk job, little to no exercise
(1.2× BMR multiplier)
```

**Lightly Active**

```
Lightly Active
Light exercise 1-3 days/week
(1.375× BMR multiplier)
```

**Moderately Active**

```
Moderately Active
Moderate exercise 3-5 days/week
(1.55× BMR multiplier)
```

**Very Active**

```
Very Active
Hard exercise 6-7 days/week
(1.725× BMR multiplier)
```

**Extremely Active**

```
Extremely Active
Physical job + daily intense training
(1.9× BMR multiplier)
```

**Validation:**

- Must select one option

**Helper Text:**

```
How active are you on a typical day? This helps us calculate your TDEE
(Total Daily Energy Expenditure) - the total calories you burn daily.

If unsure, choose "Moderately Active" and adjust based on results.
```

**Accessibility:**

- Label: "Activity level"
- Hint: "Select how active you are on a typical day"
- Value announced: "Selected: [level name and description]"

**Suggestion Trigger:**
After changing activity level:

```
💡 Pro Tip

Activity level changes can affect your calorie target significantly.

Consider re-weighing yourself tomorrow morning to track progress
accurately with your new activity level.

[OK, Got It]
```

---

#### Dietary Preferences

**User Label:** Dietary Preferences
**Input Type:** Tag input field with suggestions
**Default Value:** Empty array
**Required:** No

**Validation:**

- Maximum 10 tags
- Each tag max 30 characters
- Duplicates removed automatically

**Common Suggestions:**

- Vegetarian
- Vegan
- Keto
- Paleo
- Low-carb
- Gluten-free
- Dairy-free
- Pescatarian
- Mediterranean
- Whole30

**Helper Text:**

```
Select all that apply. This helps us suggest appropriate meals.

💡 These affect meal suggestions but not calorie targets.
```

**Empty State:**

```
No dietary preferences selected
Tap to add (e.g., vegetarian, keto, paleo)
```

**Accessibility:**

- Label: "Dietary preferences"
- Hint: "Add any dietary preferences or restrictions. Maximum 10 items."
- Value announced: "[X] dietary preferences selected: [list]"

---

#### Allergies & Restrictions

**User Label:** Allergies & Restrictions
**Input Type:** Tag input field with suggestions
**Default Value:** Empty array
**Required:** No

**Validation:**

- Maximum 20 tags
- Each tag max 30 characters
- Duplicates removed automatically

**Common Suggestions:**

- Peanuts
- Tree nuts
- Shellfish
- Fish
- Eggs
- Dairy
- Soy
- Wheat
- Gluten
- Sesame

**Helper Text:**

```
Add foods you must avoid. We'll ensure they're not included in meal
suggestions.

⚠️ For severe allergies, always verify meal ingredients yourself.
```

**Empty State:**

```
No allergies or restrictions
Tap to add foods you must avoid
```

**Accessibility:**

- Label: "Allergies and restrictions"
- Hint: "Add any food allergies or sensitivities. Maximum 20 items."
- Value announced: "[X] allergies listed: [list]"

---

#### Meals Per Day

**User Label:** Meals Per Day
**Input Type:** Stepper (- and + buttons)
**Default Value:** 3
**Range:** 1-10

**Validation:**

- Integer only
- Must be between 1-10

**Helper Text:**

```
How many meals do you typically eat? This doesn't affect calorie targets,
just how they're distributed throughout the day.

Common: 3 meals + 2 snacks = 5 total
```

**Accessibility:**

- Label: "Meals per day"
- Hint: "Adjust the number of meals you prefer each day"
- Value announced: "[X] meals per day"

---

## 4. Helper Text & Copy

### General Guidelines

**Tone:**

- Friendly and encouraging, not clinical
- Use "we" and "you" (conversational)
- Explain the "why" not just the "what"
- Avoid jargon; explain technical terms

**Structure:**

1. What the field is for (1 sentence)
2. How it's used / why it matters (1 sentence)
3. Example or tip (optional, 1 sentence)

**Length:**

- Primary helper: 1-2 sentences (40-80 words)
- Extended helper (info icon): 2-3 sentences (80-120 words)

---

### Section Descriptions

#### About You

```
Basic information that affects your metabolic calculations. Your age,
gender, and height help us calculate how many calories your body burns
at rest.
```

#### Current Status

```
Track your current weight to monitor progress. Update this regularly
(ideally weekly) to keep your plan accurate and motivating.
```

#### Your Goal

```
Define what you want to achieve and when. Your goal determines your
calorie target, macro split, and projected timeline.
```

#### Activity & Lifestyle

```
How active are you on a typical day? Your activity level affects your
TDEE (Total Daily Energy Expenditure) - the total calories you burn.
```

#### Diet & Preferences

```
Dietary restrictions and meal preferences. These affect meal suggestions
but don't change your calorie or macro targets.
```

#### Current Targets

```
Your daily nutrition targets (automatically calculated). These update
whenever you change health metrics or activity level.
```

---

### Metric Explanations (Info Icons)

#### BMR (Basal Metabolic Rate)

```
Basal Metabolic Rate (BMR)

The calories your body burns at rest just to stay alive - breathing,
circulation, basic cellular functions.

Calculated from: Age, gender, height, and weight

This is your baseline. Even if you did nothing all day, you'd burn
this many calories.
```

#### TDEE (Total Daily Energy Expenditure)

```
Total Daily Energy Expenditure (TDEE)

The total calories you burn in a day including all activity - walking,
exercise, fidgeting, etc.

Calculated from: BMR × Activity Level Multiplier

This is your maintenance calories. Eat this amount to maintain your
current weight.
```

#### Daily Calorie Target

```
Daily Calorie Target

Your personalized daily calorie goal to reach your target weight safely.

Calculated from: TDEE adjusted for your goal
• Lose weight: TDEE - 500 (for ~0.5kg/week loss)
• Gain muscle: TDEE + 250 (for ~0.25kg/week gain)
• Maintain: TDEE

This is what you should aim to eat each day.
```

#### Daily Protein Target

```
Daily Protein Target

Your recommended protein intake to support your goal.

Calculated from: Body weight × protein ratio
• Lose weight: 2.0g per kg (preserve muscle)
• Gain muscle: 2.2g per kg (build muscle)
• Maintain: 1.6g per kg (maintain muscle)

Protein keeps you full and supports muscle maintenance.
```

#### Daily Water Target

```
Daily Water Target

Your recommended daily water intake for optimal hydration.

Calculated from: Body weight × 35ml per kg

Staying hydrated supports metabolism, recovery, and overall health.

💡 Drink more if you exercise or it's hot outside.
```

---

## 5. Validation Messages

### Validation Principles

**Be Specific**

- ❌ "Invalid input"
- ✅ "Height must be between 50-300 cm"

**Be Actionable**

- ❌ "Error"
- ✅ "Please enter a date in the future"

**Be Positive**

- ❌ "You failed to enter a valid email"
- ✅ "Please enter a valid email address (e.g., you@example.com)"

**Show Context**

- ❌ "Value too large"
- ✅ "Weight should be between 20-500 kg (44-1102 lbs)"

---

### Validation Message Table

| Field                  | Validation Rule | Error Message                                     |
| ---------------------- | --------------- | ------------------------------------------------- |
| **dateOfBirth**        | Age < 13        | You must be at least 13 years old to use GTSD     |
| **dateOfBirth**        | Age > 120       | Please enter a valid date of birth                |
| **dateOfBirth**        | Future date     | Date of birth cannot be in the future             |
| **gender**             | Empty           | Please select your gender                         |
| **height**             | < 50 cm         | Height must be at least 50 cm (1'8")              |
| **height**             | > 300 cm        | Height must be less than 300 cm (9'10")           |
| **height**             | Non-numeric     | Please enter a valid number                       |
| **currentWeight**      | < 20 kg         | Weight must be at least 20 kg (44 lbs)            |
| **currentWeight**      | > 500 kg        | Weight must be less than 500 kg (1102 lbs)        |
| **currentWeight**      | Non-numeric     | Please enter a valid number                       |
| **targetWeight**       | < 20 kg         | Target weight must be at least 20 kg (44 lbs)     |
| **targetWeight**       | > 500 kg        | Target weight must be less than 500 kg (1102 lbs) |
| **targetWeight**       | Non-numeric     | Please enter a valid number                       |
| **primaryGoal**        | Empty           | Please select your primary goal                   |
| **targetDate**         | Past date       | Target date must be in the future                 |
| **targetDate**         | > 2 years       | Target date must be within 2 years                |
| **activityLevel**      | Empty           | Please select your activity level                 |
| **dietaryPreferences** | > 10 items      | Maximum 10 dietary preferences allowed            |
| **allergies**          | > 20 items      | Maximum 20 allergies allowed                      |
| **mealsPerDay**        | < 1             | At least 1 meal per day required                  |
| **mealsPerDay**        | > 10            | Maximum 10 meals per day                          |

---

### Validation Timing

**Inline (On Blur):**

- All required fields
- Format validation (email, numbers)
- Range validation (min/max)

**On Submit:**

- Cross-field validation (e.g., realistic timeline)
- Final validation before API call

**Real-time (On Change):**

- Character count (approaching limit)
- Password strength
- Unit conversions

---

### Visual Error States

**Error Indicator:**

```
┌─────────────────────────────────────┐
│ Current Weight                      │
├─────────────────────────────────────┤  ← Red border (2px)
│ 600                           kg    │
└─────────────────────────────────────┘
  ⚠️ Weight must be between 20-500 kg   ← Red text, icon, below field
```

**Success Indicator:**

```
┌─────────────────────────────────────┐
│ Current Weight                      │
├─────────────────────────────────────┤  ← Green border (2px) [optional]
│ 82.5                          kg    │
└─────────────────────────────────────┘
  ✓ Valid weight                        ← Green text, icon, below field
```

**Accessibility:**

- Error announced via VoiceOver immediately
- Error persists until corrected
- Focus moves to first error on submit

---

## 6. Save Flow & Feedback

### Save Button States

**State Machine:**

```
Idle (No Changes) → Idle (Valid Changes) → Saving → Success → Idle
                  ↓
                  Invalid (Has Errors) ← Validation Error
                  ↓
                  Network Error → Retry
```

---

### State Specifications

#### State 1: Idle (No Changes)

**Button Appearance:**

```
┌───────────────────────────────────────────┐
│         Save Changes                      │  ← Gray background
└───────────────────────────────────────────┘  ← Disabled state
```

**Properties:**

- Background: Gray (#CCCCCC)
- Text: Gray (#666666)
- Disabled: true
- Haptic: None

**Accessibility:**

- Label: "Save changes"
- Hint: "No changes to save"
- Trait: "Button, dimmed"

---

#### State 2: Idle (Valid Changes)

**Button Appearance:**

```
┌───────────────────────────────────────────┐
│         Save Changes                      │  ← Primary blue
└───────────────────────────────────────────┘  ← Enabled state
```

**Properties:**

- Background: Primary Blue (#007AFF)
- Text: White (#FFFFFF)
- Disabled: false
- Haptic: Light impact on tap

**Accessibility:**

- Label: "Save changes"
- Hint: "Double tap to save your profile updates"
- Trait: "Button"

---

#### State 3: Saving

**Button Appearance:**

```
┌───────────────────────────────────────────┐
│    ⟳    Saving...                         │  ← Spinner + text
└───────────────────────────────────────────┘  ← Disabled state
```

**Properties:**

- Background: Primary Blue (#007AFF)
- Text: White (#FFFFFF)
- Disabled: true
- Spinner: Rotating animation
- Duration: 0.5-5 seconds typical

**Accessibility:**

- Label: "Saving profile changes"
- Hint: "Please wait"
- Trait: "Button, dimmed"
- Announcement: "Saving your profile changes"

**Timeout Handling:**
If saving takes >5 seconds:

```
┌───────────────────────────────────────────┐
│    ⟳    This is taking longer than       │
│         usual...                          │
└───────────────────────────────────────────┘
```

---

#### State 4: Success

**Button Appearance (2 seconds):**

```
┌───────────────────────────────────────────┐
│         ✓ Saved                           │  ← Green background
└───────────────────────────────────────────┘  ← Checkmark animation
```

**Properties:**

- Background: Success Green (#34C759)
- Text: White (#FFFFFF)
- Icon: Checkmark (animated scale in)
- Disabled: true
- Duration: 2 seconds
- Haptic: Success haptic (medium impact)

**Accessibility:**

- Label: "Changes saved successfully"
- Announcement: "Profile updated successfully"

**Transition:**
After 2 seconds, button returns to State 1 (Idle) or view dismisses

---

#### State 5: Error

**Button Appearance:**

```
┌───────────────────────────────────────────┐
│         Retry                             │  ← Red background
└───────────────────────────────────────────┘  ← Error state
```

**Properties:**

- Background: Error Red (#FF3B30)
- Text: White (#FFFFFF)
- Disabled: false
- Haptic: Error haptic (notification)

**Accessibility:**

- Label: "Retry saving changes"
- Hint: "Double tap to try saving again"
- Announcement: "Failed to save profile. [Error message]. Double tap to retry."

---

### Success Feedback Variations

**Base Success (No Plan Changes):**

```
┌─────────────────────────────────────────┐
│  ✓  Profile updated successfully        │  ← Toast (top)
└─────────────────────────────────────────┘
```

**Success with Plan Regeneration:**

```
┌─────────────────────────────────────────┐
│  ✓  Profile updated!                    │
│                                         │
│  Your plan will adapt tomorrow morning. │
└─────────────────────────────────────────┘
```

**Success with Specific Changes:**

```
┌─────────────────────────────────────────┐
│  ✓  Weight updated to 82.5 kg           │
│                                         │
│  Your targets will adjust tomorrow.     │
└─────────────────────────────────────────┘
```

**Success with Target Changes (Modal):**

```
┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃  Your Targets Have Been Updated        ┃
┃                                         ┃
┃  Daily Calories                         ┃
┃  1,850 → 1,700 (-150)                   ┃
┃                                         ┃
┃  Daily Protein                          ┃
┃  140g → 135g (-5g)                      ┃
┃                                         ┃
┃  These changes will be reflected        ┃
┃  starting tomorrow.                     ┃
┃                                         ┃
┃          [Got It]                       ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛
```

---

### Error Feedback Variations

**Validation Error:**

```
┌─────────────────────────────────────────┐
│  ⚠️  Please fix the errors below        │  ← Alert banner (top)
└─────────────────────────────────────────┘

[Scroll to first error field]
```

**Network Error:**

```
┌─────────────────────────────────────────┐
│  ⚠️  Unable to save changes             │
│                                         │
│  Please check your connection and       │
│  try again.                             │
│                                         │
│          [Retry]    [Dismiss]           │
└─────────────────────────────────────────┘
```

**Server Error:**

```
┌─────────────────────────────────────────┐
│  ⚠️  Something went wrong               │
│                                         │
│  Our servers are having issues.         │
│  Please try again in a moment.          │
│                                         │
│          [Retry]    [Dismiss]           │
└─────────────────────────────────────────┘
```

**Rate Limited:**

```
┌─────────────────────────────────────────┐
│  ⚠️  Too many updates                   │
│                                         │
│  You've updated your profile recently.  │
│  Please wait a moment before making     │
│  more changes.                          │
│                                         │
│  Try again in: 2m 15s                   │
│                                         │
│          [OK]                           │
└─────────────────────────────────────────┘
```

---

## 7. Plan Impact Communication

### Design Goals

**Transparency:** Always tell users what will happen before they save
**Timing:** Be explicit about when changes take effect
**Clarity:** Use simple language to explain complex concepts
**Reassurance:** Make users feel confident about their changes

---

### Plan Impact Indicators

#### Section Badge

**Visual:**

```
┌─────────────────────────────────────────┐
│  Current Status          🔄 Affects     │  ← Badge (top-right)
│                             your plan   │
│  Track your current weight...           │
└─────────────────────────────────────────┘
```

**Sections with Badge:**

- About You
- Current Status
- Your Goal
- Activity & Lifestyle

**Sections without Badge:**

- Diet & Preferences (only affects meal suggestions)
- Current Targets (read-only)

---

#### Field-Level Impact Indicators

**Weight Field:**

```
┌─────────────────────────────────────────┐
│  Current Weight                         │
├─────────────────────────────────────────┤
│  82.5                             kg    │
└─────────────────────────────────────────┘

  Weigh yourself in the morning before eating.

  🔄 Changes >1kg will update your plan targets.
```

**Goal Field:**

```
┌─────────────────────────────────────────┐
│  Primary Goal                           │
├─────────────────────────────────────────┤
│  Lose Weight                      ▼     │
└─────────────────────────────────────────┘

  Your main fitness objective.

  🔄 Changing your goal recalculates your daily
     calorie and protein targets.
```

---

### Pre-Save Communication

**Confirmation Modal (for high-impact changes):**

```
┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃  Change Your Goal?                      ┃
┃                                         ┃
┃  Changing your goal will recalculate    ┃
┃  your daily calorie and protein         ┃
┃  targets.                               ┃
┃                                         ┃
┃  Current goal: Maintain Weight          ┃
┃  New goal: Lose Weight                  ┃
┃                                         ┃
┃  Expected changes:                      ┃
┃  • Calories: 2,200 → ~1,700             ┃
┃  • Protein: 128g → ~135g                ┃
┃                                         ┃
┃  Your plan will be updated tomorrow.    ┃
┃                                         ┃
┃       [Cancel]    [Change Goal]         ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛
```

---

### Post-Save Communication

**Toast (Simple Update):**

```
┌─────────────────────────────────────────┐
│  ✓  Profile updated!                    │
│                                         │
│  Your plan will adapt tomorrow morning. │
└─────────────────────────────────────────┘
```

**Modal (Target Changes):**

```
┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃  ✓  Your Targets Have Been Updated      ┃
┃                                         ┃
┃  Daily Calories                         ┃
┃  1,850 → 1,700 (-150)                   ┃
┃  You'll consume 150 fewer calories      ┃
┃  to support weight loss                 ┃
┃                                         ┃
┃  Daily Protein                          ┃
┃  140g → 135g (-5g)                      ┃
┃  Protein adjusted to new weight         ┃
┃                                         ┃
┃  Daily Water                            ┃
┃  2,800ml → 2,625ml (-175ml)             ┃
┃  Hydration target updated               ┃
┃                                         ┃
┃  ────────────────────────────────       ┃
┃                                         ┃
┃  These changes will be reflected in     ┃
┃  tomorrow's daily plan, generated at    ┃
┃  midnight.                              ┃
┃                                         ┃
┃          [Got It]                       ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛
```

**Modal (No Changes):**

```
┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃  ✓  Dietary Preferences Updated         ┃
┃                                         ┃
┃  Your new dietary preferences:          ┃
┃  • Vegetarian                           ┃
┃  • Gluten-free                          ┃
┃                                         ┃
┃  These will appear in tomorrow's meal   ┃
┃  suggestions. Your calorie and macro    ┃
┃  targets remain unchanged.              ┃
┃                                         ┃
┃          [Got It]                       ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛
```

---

### Timing Communication

**Always include timing:**

- "Tomorrow morning" (not "next day")
- "Midnight" (not "soon")
- "Starting [date]" for future dates

**Examples:**

- ✅ "Your plan will adapt tomorrow morning at midnight"
- ✅ "Changes take effect starting tomorrow"
- ✅ "New targets will appear in your plan on [date]"
- ❌ "Your plan will update soon"
- ❌ "Changes will apply shortly"

---

## 8. Empty States

### First-Time User (No Profile)

**Scenario:** User has just signed up, hasn't completed onboarding

**Screen:**

```
┌─────────────────────────────────────────┐
│                                         │
│          🎯                             │
│                                         │
│      Complete Your Profile              │
│                                         │
│  Tell us about yourself so we can       │
│  create a personalized fitness plan.    │
│                                         │
│  This takes about 2-3 minutes.          │
│                                         │
│                                         │
│   [Get Started]                         │
│                                         │
└─────────────────────────────────────────┘
```

**Button Action:** Navigate to onboarding flow (not profile edit)

---

### Returning User (Profile Exists)

**Scenario:** User has completed onboarding, viewing profile for first time

**All fields pre-filled with onboarding data**

No empty state needed - show normal edit form

---

### Incomplete Profile (Some Fields Missing)

**Scenario:** User completed partial onboarding or skipped optional fields

**Screen:** Normal edit form with:

- Required fields: Show validation errors if empty
- Optional fields: Show placeholders

**Example:**

```
┌─────────────────────────────────────────┐
│  Dietary Preferences                    │
├─────────────────────────────────────────┤
│  No dietary preferences selected        │  ← Empty state
│  Tap to add (e.g., vegetarian, keto)    │
└─────────────────────────────────────────┘
```

---

### Empty Tag Fields

**Dietary Preferences (Empty):**

```
┌─────────────────────────────────────────┐
│  Dietary Preferences                    │
├─────────────────────────────────────────┤
│  🍽️  No preferences selected            │
│                                         │
│  Tap "+" to add                         │
└─────────────────────────────────────────┘

  Common: Vegetarian, Vegan, Keto, Paleo
```

**Allergies (Empty):**

```
┌─────────────────────────────────────────┐
│  Allergies & Restrictions               │
├─────────────────────────────────────────┤
│  ✓  No allergies listed                 │
│                                         │
│  Tap "+" to add                         │
└─────────────────────────────────────────┘

  Common: Peanuts, Dairy, Gluten, Shellfish
```

---

### Empty Current Targets (Loading)

**Scenario:** Profile exists but targets haven't been calculated yet

```
┌─────────────────────────────────────────┐
│  Current Targets                        │
├─────────────────────────────────────────┤
│                                         │
│          ⟳                              │
│                                         │
│     Calculating your targets...         │
│                                         │
└─────────────────────────────────────────┘
```

---

## 9. Mobile-First Patterns

### Keyboard Handling

#### Keyboard Types

| Field          | Keyboard Type | Screenshot               |
| -------------- | ------------- | ------------------------ |
| Name           | Default       | ABC...                   |
| Email          | Email Address | @ symbol prominent       |
| Height (cm)    | Number Pad    | 0-9 only                 |
| Weight (kg)    | Decimal Pad   | 0-9 + decimal point      |
| Meals Per Day  | Number Pad    | 0-9 only                 |
| Date of Birth  | None          | Use native date picker   |
| Gender         | None          | Use segmented control    |
| Goal           | None          | Use picker wheel         |
| Activity Level | None          | Use picker wheel         |
| Tags           | Default       | ABC... with autocomplete |

---

#### Keyboard Toolbar

**Number/Decimal Pad:**

```
┌─────────────────────────────────────────┐
│  [<]  [Previous]   [Next]   [Done]  [>] │  ← Toolbar above keyboard
└─────────────────────────────────────────┘
```

**Functions:**

- **Previous:** Move to previous field
- **Next:** Move to next field
- **Done:** Dismiss keyboard
- **< >:** Navigate between form sections

---

#### Auto-Advance

**Don't auto-advance:**

- User should control when to move between fields
- Exception: OTP/PIN codes (not applicable here)

**Do provide:**

- "Next" button in keyboard toolbar
- Return key action = "Next" (for text fields)
- Done button for last field in section

---

### Input Components

#### Unit Toggle

**Design:**

```
┌─────────────────────────────────────────┐
│  Current Weight                         │
├─────────────────────────────────────────┤
│  82.5                  ┌────┬────┐      │
│                        │ kg │lbs │      │  ← Toggle
│                        └────┴────┘      │
└─────────────────────────────────────────┘
```

**Behavior:**

- Tap to switch units
- Value converts instantly
- Preserves precision (1 decimal place)
- Haptic feedback on toggle

**Accessibility:**

- Label: "Unit: kilograms. Double tap to switch to pounds"
- Announcement: "Unit changed to pounds. Weight is now [converted value]"

---

#### Stepper (Meals Per Day)

**Design:**

```
┌─────────────────────────────────────────┐
│  Meals Per Day                          │
├─────────────────────────────────────────┤
│              ┌───┬────┬───┐             │
│              │ - │ 3  │ + │             │  ← Large touch targets
│              └───┴────┴───┘             │
└─────────────────────────────────────────┘
```

**Touch Targets:**

- Minimum 44×44 points
- Spacing: 12 points between buttons

**Behavior:**

- Tap "-" to decrement
- Tap "+" to increment
- Long press for continuous increment/decrement
- Haptic feedback on each step
- Disable at min/max

**Accessibility:**

- Label: "Meals per day, 3"
- Hint: "Swipe up to increase, swipe down to decrease"
- Adjustment trait enabled

---

#### Segmented Control (Gender)

**Design:**

```
┌─────────────────────────────────────────┐
│  Gender                                 │
├─────────────────────────────────────────┤
│  ┌─────────┬─────────┬─────────┐        │
│  │  Male   │ Female  │ Other   │        │  ← Equal width segments
│  └─────────┴─────────┴─────────┘        │
└─────────────────────────────────────────┘
```

**Behavior:**

- Tap to select
- Only one selection at a time
- Haptic feedback on selection
- Selected state: Filled background

**Accessibility:**

- Label: "Gender, [selected option]"
- Trait: "Segmented control"
- Hint: "Double tap to change selection"

---

#### Tag Input (Dietary Preferences)

**Design:**

```
┌─────────────────────────────────────────┐
│  Dietary Preferences                    │
├─────────────────────────────────────────┤
│  ┌────────────┐ ┌──────────┐ ┌────┐    │
│  │Vegetarian ×│ │Gluten-free│ │ +  │    │  ← Tags + Add button
│  └────────────┘ └──────────┘ └────┘    │
│                                         │
│  Suggestions: Vegan, Keto, Paleo        │  ← Tap to add
└─────────────────────────────────────────┘
```

**Behavior:**

- Tap "+" to add new tag
- Tap "×" to remove tag
- Tap suggestion to add instantly
- Keyboard appears when typing new tag
- Autocomplete from common suggestions

**Touch Targets:**

- Tag: 32pt height minimum
- Remove "×": 28×28pt minimum
- Add "+": 44×44pt

**Accessibility:**

- Label: "Dietary preferences, [X] selected"
- Hint: "Double tap to edit preferences"
- Each tag: "[name] tag, button. Double tap to remove"

---

#### Date Picker

**Design:** Use native iOS wheel picker

```
┌─────────────────────────────────────────┐
│  Date of Birth                          │
├─────────────────────────────────────────┤
│  Tap to select ▼                        │
└─────────────────────────────────────────┘

[Tapped]

┌─────────────────────────────────────────┐
│  ┌───────────────────────────────────┐  │
│  │   August  ║  15   ║  1990        │  │  ← Wheel picker
│  │   September  16      1991        │  │
│  │   October    17      1992        │  │
│  └───────────────────────────────────┘  │
│            [Done]                       │
└─────────────────────────────────────────┘
```

**Behavior:**

- Inline picker (expands in place)
- "Done" button to confirm
- Default: Today - 25 years
- Range: Today - 120 years to Today - 13 years

---

#### Picker Wheel (Goal, Activity Level)

**Design:**

```
┌─────────────────────────────────────────┐
│  Primary Goal                           │
├─────────────────────────────────────────┤
│  Lose Weight ▼                          │
└─────────────────────────────────────────┘

[Tapped]

┌─────────────────────────────────────────┐
│  ┌───────────────────────────────────┐  │
│  │   Maintain Weight                │  │
│  │   Lose Weight           ═        │  │  ← Selected
│  │   Gain Muscle                    │  │
│  │   Improve Health                 │  │
│  └───────────────────────────────────┘  │
│            [Done]                       │
└─────────────────────────────────────────┘
```

**Behavior:**

- Inline picker (expands in place)
- Shows all options
- "Done" button to confirm
- Haptic feedback on scroll

---

### Scroll Behavior

#### Smart Scroll

**On Error:**

1. Validation fails on submit
2. Scroll to first error field
3. Animate highlight (pulse red border 2x)
4. Focus field (keyboard appears if applicable)

**On Focus:**

1. User taps field
2. If keyboard covers field, scroll field into view
3. Position field at center of visible area (not edge)

---

#### Sticky Save Button

**Floating Action Button (FAB):**

```
┌─────────────────────────────────────────┐
│                                         │
│  [Form content]                         │
│                                         │
│                                         │
│                                         │
│                                         │
│  ┌─────────────────────────────────┐   │  ← Sticky at bottom
│  │      Save Changes               │   │
│  └─────────────────────────────────┘   │
│                                         │
└─────────────────────────────────────────┘
```

**Behavior:**

- Sticks to bottom of screen during scroll
- Safe area aware (above home indicator)
- Shadows to indicate elevation
- Hides when keyboard appears (to avoid overlap)

---

## 10. Accessibility Specifications

### VoiceOver Support

#### Field Labels

**Structure:**

```
Label: [Field name]
Value: [Current value]
Hint: [What to do / What it's for]
Trait: [Control type]
```

**Examples:**

**Date of Birth:**

```
Label: Date of birth
Value: Born on August 15, 1990
Hint: Select your date of birth. Used for metabolic calculations.
Trait: Button, adjustable
```

**Current Weight:**

```
Label: Current weight
Value: 82.5 kilograms
Hint: Enter your current weight. Double tap to edit.
Trait: Text field, number pad input
```

**Primary Goal:**

```
Label: Primary goal
Value: Lose weight
Hint: Select your main fitness objective. Double tap to change.
Trait: Button, picker
```

**Activity Level:**

```
Label: Activity level
Value: Moderately active. Moderate exercise 3-5 days per week.
Hint: Select how active you are. Double tap to change.
Trait: Button, picker
```

---

#### Validation Error Announcements

**On Error:**

```
VoiceOver: "Error. [Field name]. [Error message]"

Example: "Error. Current weight. Weight must be between 20 and 500 kilograms"
```

**On Correction:**

```
VoiceOver: "[Field name] valid"

Example: "Current weight valid"
```

**On Submit with Errors:**

```
VoiceOver: "Validation failed. [X] errors found. Scrolling to first error."
```

---

#### Save Button Announcements

**State Changes:**

**Idle → Saving:**

```
VoiceOver: "Saving your profile changes. Please wait."
```

**Saving → Success:**

```
VoiceOver: "Profile updated successfully. [Additional context if applicable]"
```

**Saving → Error:**

```
VoiceOver: "Failed to save profile. [Error message]. Double tap retry button to try again."
```

---

### Dynamic Type Support

#### Text Scaling

**Size Categories Supported:**

- Extra Small (XS)
- Small (S)
- Medium (M) ← Default
- Large (L)
- Extra Large (XL)
- Extra Extra Large (XXL)
- Extra Extra Extra Large (XXXL)
- Accessibility Medium
- Accessibility Large
- Accessibility Extra Large
- Accessibility Extra Extra Large
- Accessibility Extra Extra Extra Large

**Scaling Guidelines:**

| Element          | Default Size | Max Size | Behavior                      |
| ---------------- | ------------ | -------- | ----------------------------- |
| Section Header   | 17pt         | 34pt     | Scales, wraps if needed       |
| Field Label      | 15pt         | 30pt     | Scales, wraps if needed       |
| Input Text       | 17pt         | 34pt     | Scales, single line until max |
| Helper Text      | 13pt         | 26pt     | Scales, wraps (multi-line)    |
| Button Text      | 17pt         | 34pt     | Scales, wraps if needed       |
| Validation Error | 13pt         | 26pt     | Scales, wraps (multi-line)    |

---

#### Layout Adaptations

**At Accessibility Sizes (> XXL):**

**Before (Default):**

```
┌─────────────────────────────────────────┐
│  Current Weight:               82.5 kg  │  ← Horizontal layout
└─────────────────────────────────────────┘
```

**After (Accessibility):**

```
┌─────────────────────────────────────────┐
│  Current Weight:                        │
│  82.5 kg                                │  ← Vertical layout
└─────────────────────────────────────────┘
```

**Button Minimum Height:**

- Default: 44pt
- Accessibility sizes: 60pt minimum

---

### Touch Targets

#### Minimum Sizes

**Apple Guidelines:**

- Minimum: 44×44 points
- Recommended: 48×48 points

**GTSD Standard:**

- All buttons: 48×48pt minimum
- Stepper buttons: 52×52pt
- Tag remove "×": 32×32pt (larger than text)
- Toggle switches: 51×31pt (iOS standard)

---

#### Spacing

**Minimum Spacing:**

- Between buttons: 12pt
- Between form sections: 24pt
- Between field and helper text: 8pt
- Between field and validation error: 4pt

---

### Color Contrast

#### WCAG AA Compliance

**Normal Text (< 18pt):**

- Minimum contrast: 4.5:1
- GTSD standard: 5:1+

**Large Text (≥ 18pt):**

- Minimum contrast: 3:1
- GTSD standard: 4:1+

---

#### Color Pairs

| Element        | Foreground | Background | Contrast Ratio                          |
| -------------- | ---------- | ---------- | --------------------------------------- |
| Body text      | #1C1C1E    | #FFFFFF    | 16.1:1 ✓                                |
| Secondary text | #636366    | #FFFFFF    | 4.6:1 ✓                                 |
| Primary button | #FFFFFF    | #007AFF    | 4.5:1 ✓                                 |
| Error text     | #D32F2F    | #FFFFFF    | 5.4:1 ✓                                 |
| Success text   | #2E7D32    | #FFFFFF    | 4.8:1 ✓                                 |
| Disabled text  | #C7C7CC    | #FFFFFF    | 2.1:1 ✗ (acceptable for disabled state) |

---

#### Don't Rely on Color Alone

**Error States:**

- ❌ Color only: Red border
- ✅ Color + icon: Red border + ⚠️ icon + error text

**Success States:**

- ❌ Color only: Green border
- ✅ Color + icon: Green border + ✓ icon + success text

**Plan Impact:**

- ❌ Color only: Blue badge
- ✅ Color + icon + text: Blue badge + 🔄 icon + "Affects your plan"

---

### Focus Indicators

#### Keyboard Navigation (iPad)

**Focus Ring:**

- Color: System blue (#007AFF)
- Width: 3pt
- Style: Solid (not dashed)
- Corner radius: Matches element

**Focus Order:**

1. Section headers (skip, not focusable)
2. Form fields (in visual order)
3. Buttons (Save, Cancel)
4. Links (if any)

---

## 11. Interaction Patterns & Animations

### Animation Principles

**Duration:**

- Micro-interactions: 150-250ms
- Transitions: 300-400ms
- Modals: 350ms
- Never exceed 500ms

**Easing:**

- Default: Ease-in-out
- Entrances: Ease-out (decelerate)
- Exits: Ease-in (accelerate)
- Bounces: Spring animation (iOS native)

**Purpose:**

- Provide feedback
- Guide attention
- Indicate relationships
- Delight (sparingly)

---

### Microinteractions

#### Field Focus

**Trigger:** User taps text field

**Animation:**

```
1. Border color: Gray → Blue (150ms, ease-in-out)
2. Helper text: Fade in from 0 → 1 opacity (200ms, ease-out)
3. Haptic: Light impact (10ms)
```

**Code (SwiftUI):**

```swift
.focused($focusedField, equals: .currentWeight)
.animation(.easeInOut(duration: 0.15), value: focusedField)
.sensoryFeedback(.impact(flexibility: .soft), trigger: focusedField)
```

---

#### Field Blur (Valid)

**Trigger:** User leaves field with valid input

**Animation:**

```
1. Border color: Blue → Green (200ms, ease-in-out)
2. Checkmark icon: Scale from 0 → 1 with bounce (300ms, spring)
3. Haptic: Success notification (light, 20ms)
4. Wait 1 second
5. Border color: Green → Gray (300ms, ease-in-out)
6. Checkmark: Fade out (200ms)
```

---

#### Field Blur (Invalid)

**Trigger:** User leaves field with invalid input

**Animation:**

```
1. Border color: Blue → Red (200ms, ease-in-out)
2. Error message: Slide down from top (250ms, ease-out)
3. Field: Shake animation (300ms, 3× oscillation)
4. Haptic: Error notification (medium, 30ms)
```

**Shake Animation:**

```
X offset: 0 → -8 → 8 → -8 → 8 → 0 (100ms each)
Total: 300ms
```

---

#### Button Press

**Trigger:** User taps button

**Animation:**

```
1. Scale: 1.0 → 0.95 (100ms, ease-in)
2. Haptic: Light impact (5ms)
3. Scale: 0.95 → 1.0 (150ms, spring)
```

**Code (SwiftUI):**

```swift
.scaleEffect(isPressed ? 0.95 : 1.0)
.animation(.spring(response: 0.3, dampingFraction: 0.6), value: isPressed)
.sensoryFeedback(.impact(weight: .light), trigger: isPressed)
```

---

#### Save Button States

**Idle → Saving:**

```
1. Button text: Fade out (150ms)
2. Spinner: Fade in + rotate (200ms)
3. Button slightly expand (width +10pt, 200ms)
```

**Saving → Success:**

```
1. Spinner: Stop rotating, fade out (150ms)
2. Checkmark: Scale in from 0 → 1.2 → 1.0 (300ms, spring)
3. Background color: Blue → Green (300ms, ease-in-out)
4. Haptic: Success notification (medium, 30ms)
5. Wait 2 seconds
6. Dismiss or reset
```

**Saving → Error:**

```
1. Spinner: Stop rotating, fade out (150ms)
2. Button: Shake (300ms, 2× oscillation)
3. Background color: Blue → Red (300ms, ease-in-out)
4. Text change: "Saving..." → "Retry" (200ms)
5. Haptic: Error notification (heavy, 40ms)
```

---

### Toast Animations

#### Entrance

**Trigger:** Success/error message appears

**Animation:**

```
1. Position: Top edge (-100) → Final position (0) (350ms, ease-out)
2. Opacity: 0 → 1 (250ms)
3. Slight bounce at end (spring animation)
4. Haptic: Based on message type
```

**Code (SwiftUI):**

```swift
.transition(.move(edge: .top).combined(with: .opacity))
.animation(.spring(response: 0.35, dampingFraction: 0.75), value: showToast)
```

---

#### Exit

**Trigger:** User dismisses or auto-dismiss after 3-5 seconds

**Animation:**

```
1. Opacity: 1 → 0 (300ms, ease-in)
2. Position: Current → Top edge (-100) (300ms, ease-in)
```

---

### Modal Animations

#### Entrance (Bottom Sheet)

**Trigger:** Confirmation dialog appears

**Animation:**

```
1. Backdrop: Fade in from 0 → 0.4 opacity (300ms, ease-out)
2. Sheet: Slide up from bottom (350ms, ease-out with overshoot)
3. Content: Fade in after sheet (150ms delay, 200ms duration)
```

---

#### Exit (Bottom Sheet)

**Trigger:** User dismisses or confirms

**Animation:**

```
1. Content: Fade out (150ms)
2. Sheet: Slide down to bottom (300ms, ease-in)
3. Backdrop: Fade out to 0 opacity (300ms, ease-in)
```

---

### List Animations

#### Section Expand/Collapse

**Trigger:** User taps section header (if collapsible)

**Animation:**

```
1. Arrow icon: Rotate from 0° → 90° (200ms, ease-in-out)
2. Section content: Slide down + fade in (300ms, ease-out)
3. Other sections: Shift down smoothly (300ms, ease-out)
```

---

### Haptic Feedback

#### Haptic Palette

| Event              | Haptic Type  | Weight  | Duration |
| ------------------ | ------------ | ------- | -------- |
| Field focus        | Impact       | Light   | 10ms     |
| Toggle switch      | Selection    | -       | 15ms     |
| Stepper tap        | Selection    | -       | 15ms     |
| Button press       | Impact       | Light   | 10ms     |
| Validation success | Notification | Success | 30ms     |
| Validation error   | Notification | Error   | 40ms     |
| Save success       | Notification | Success | 30ms     |
| Save error         | Notification | Error   | 40ms     |
| Weight warning     | Notification | Warning | 35ms     |
| Unit toggle        | Selection    | -       | 15ms     |

---

#### Haptic Guidelines

**Do:**

- Use for confirmation (user did something)
- Use for errors (something went wrong)
- Use for significant state changes

**Don't:**

- Overuse (not for every interaction)
- Use for purely visual changes
- Use for animations alone

**Respect Settings:**

- Check if haptics are enabled in system settings
- Disable all haptics if user has reduced motion enabled

---

## 12. Edge Cases & Error Handling

### Edge Case Catalog

#### 1. Unsaved Changes

**Trigger:** User navigates away with unsaved changes

**Detection:**

- Compare current form state to saved state
- Trigger on: Back button, tab switch, app backgrounding

**Dialog:**

```
┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃  Discard Changes?                       ┃
┃                                         ┃
┃  You have unsaved changes to your       ┃
┃  profile. If you leave now, your        ┃
┃  changes will be lost.                  ┃
┃                                         ┃
┃       [Cancel]    [Discard]             ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛
```

**Button Actions:**

- **Cancel:** Stay on profile edit, keep changes
- **Discard:** Leave screen, revert changes

**Accessibility:**

- Announcement: "Warning. You have unsaved changes. Double tap cancel to stay, or discard to leave."

---

#### 2. Large Weight Change (>10kg)

**Trigger:** Weight difference >10kg from saved value

**Dialog:**

```
┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃  ⚠️ Large Weight Change Detected        ┃
┃                                         ┃
┃  You're changing your weight by 12 kg.  ┃
┃  This is a significant change.          ┃
┃                                         ┃
┃  Please verify:                         ┃
┃  ✓ This is your current accurate weight ┃
┃  ✓ You've weighed yourself properly     ┃
┃    (morning, before eating)             ┃
┃                                         ┃
┃  Previous: 95 kg                        ┃
┃  New: 83 kg                             ┃
┃                                         ┃
┃       [Cancel]    [Confirm]             ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛
```

**Button Actions:**

- **Cancel:** Revert to previous weight
- **Confirm:** Accept new weight, proceed with save

---

#### 3. Unrealistic Timeline

**Trigger:** Weight change / timeline exceeds 1kg per week

**Calculation:**

```
Required rate = |target weight - current weight| / weeks until target date
Safe rate = 0.5-1.0 kg/week (loss) or 0.25-0.5 kg/week (gain)

If required rate > safe rate → Show warning
```

**Dialog:**

```
┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃  ⚠️ Unrealistic Timeline                ┃
┃                                         ┃
┃  To lose 20 kg by March 1, 2026         ┃
┃  requires losing 2.5 kg per week.       ┃
┃                                         ┃
┃  This exceeds safe limits:              ┃
┃  • Your rate: 2.5 kg/week               ┃
┃  • Safe rate: 0.5-1 kg/week             ┃
┃                                         ┃
┃  Recommended target date:               ┃
┃  October 15, 2026 (20 weeks)            ┃
┃                                         ┃
┃    [Adjust Date]    [Keep Anyway]       ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛
```

**Button Actions:**

- **Adjust Date:** Auto-populate recommended date
- **Keep Anyway:** Accept user's timeline, log warning

---

#### 4. Network Timeout (>5 seconds)

**Trigger:** Save request exceeds 5 seconds

**UI Update:**

```
┌───────────────────────────────────────────┐
│    ⟳    This is taking longer than       │
│         usual...                          │
│                                           │
│    Checking your connection...            │
└───────────────────────────────────────────┘
```

**After 10 seconds:**

```
┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃  ⚠️ Connection Issue                    ┃
┃                                         ┃
┃  We're having trouble reaching our      ┃
┃  servers. This could be due to:         ┃
┃                                         ┃
┃  • Slow internet connection             ┃
┃  • Temporary server issues              ┃
┃                                         ┃
┃  Your changes are saved locally and     ┃
┃  will sync when connection is restored. ┃
┃                                         ┃
┃       [Retry Now]    [OK]               ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛
```

---

#### 5. Offline Mode

**Trigger:** No network connection detected

**Banner (Top of screen):**

```
┌─────────────────────────────────────────┐
│  ⚠️  You're offline                     │  ← Yellow banner
│                                         │
│  Changes will sync when you reconnect. │
└─────────────────────────────────────────┘
```

**Save Button State:**

```
┌───────────────────────────────────────────┐
│    💾 Save Locally                        │  ← Different text
└───────────────────────────────────────────┘
```

**On Save:**

```
✓ Changes saved locally

Your changes will sync automatically when
you reconnect to the internet.
```

**On Reconnect:**

```
🔄 Syncing changes...

[Progress indicator]
```

**Success:**

```
✓ Profile synced

Your offline changes have been saved to the server.
```

**Conflict (Server data newer):**

```
┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃  Sync Conflict                          ┃
┃                                         ┃
┃  Your profile was updated on another    ┃
┃  device while you were offline.         ┃
┃                                         ┃
┃  Current Weight:                        ┃
┃  • Local: 82 kg (edited offline)        ┃
┃  • Server: 83 kg (edited 10 min ago)    ┃
┃                                         ┃
┃  Which version would you like to keep?  ┃
┃                                         ┃
┃    [Keep Local]    [Use Server]         ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛
```

---

#### 6. No Changes Made

**Trigger:** User taps "Save Changes" without making any changes

**Behavior:**

- Save button should be disabled (preferred)
- If somehow triggered, show gentle message:

```
┌─────────────────────────────────────────┐
│  ℹ️  No Changes to Save                 │
│                                         │
│  You haven't made any changes to your   │
│  profile yet.                           │
└─────────────────────────────────────────┘
```

---

#### 7. API Rate Limit (429)

**Trigger:** User has updated profile >10 times in 1 hour

**Dialog:**

```
┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃  ⚠️ Too Many Updates                    ┃
┃                                         ┃
┃  You've updated your profile recently.  ┃
┃  Please wait a moment before making     ┃
┃  more changes.                          ┃
┃                                         ┃
┃  Try again in: 12m 45s                  ┃
┃                                         ┃
┃          [OK]                           ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛
```

**Timer:**

- Countdown updates every second
- Retry button becomes enabled when timer reaches 0

---

#### 8. Server Error (500)

**Trigger:** Server returns 500-level error

**Dialog:**

```
┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃  ⚠️ Something Went Wrong                ┃
┃                                         ┃
┃  Our servers are having issues. Your    ┃
┃  changes haven't been saved yet.        ┃
┃                                         ┃
┃  Please try again in a moment.          ┃
┃                                         ┃
┃  Error code: 500                        ┃
┃                                         ┃
┃       [Retry]    [Dismiss]              ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛
```

**Retry Logic:**

- Automatic retry after 2s (silent)
- If fails, show retry button
- Exponential backoff: 2s, 5s, 10s
- After 3 failures, manual retry only

---

#### 9. Validation Error (Multiple Fields)

**Trigger:** User submits form with multiple validation errors

**Behavior:**

1. Scroll to first error field
2. Show banner at top
3. Highlight all error fields

**Banner:**

```
┌─────────────────────────────────────────┐
│  ⚠️  Please fix 3 errors below          │  ← Red banner
└─────────────────────────────────────────┘

[Scroll to first error]
```

**Field Errors:**

```
┌─────────────────────────────────────────┐
│  Current Weight                         │
├─────────────────────────────────────────┤  ← Red border
│  [empty]                          kg    │
└─────────────────────────────────────────┘
  ⚠️ Weight must be between 20-500 kg       ← Error message

┌─────────────────────────────────────────┐
│  Target Date                            │
├─────────────────────────────────────────┤  ← Red border
│  January 1, 2024                  ▼     │
└─────────────────────────────────────────┘
  ⚠️ Target date must be in the future      ← Error message
```

---

#### 10. Extreme Values

**Height >250cm or <80cm:**

```
┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃  Verify Height                          ┃
┃                                         ┃
┃  You entered: 265 cm (8'8")             ┃
┃                                         ┃
┃  This is unusually tall. Please verify  ┃
┃  you entered the correct value.         ┃
┃                                         ┃
┃  Average height: 160-180 cm             ┃
┃                                         ┃
┃       [Edit]    [Confirm]               ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛
```

**Weight >200kg or <30kg:**

```
┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃  Verify Weight                          ┃
┃                                         ┃
┃  You entered: 25 kg (55 lbs)            ┃
┃                                         ┃
┃  This is below the typical healthy      ┃
┃  range. Please verify this is correct.  ┃
┃                                         ┃
┃  Typical range: 50-120 kg               ┃
┃                                         ┃
┃       [Edit]    [Confirm]               ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛
```

---

## 13. Visual Mockups

### Full Screen Layout (iPhone 14 Pro)

```
┌────────────────────────────────────────────────┐
│  ← Edit Profile                    Cancel Save │  ← Navigation bar
├────────────────────────────────────────────────┤
│                                                │
│  ┌──────────────────────────────────────────┐ │
│  │             SECTION 1                    │ │
│  │         About You  🔄 Affects your plan  │ │  ← Section header
│  │                                          │ │
│  │  Basic information that affects your    │ │  ← Description
│  │  metabolic calculations                 │ │
│  ├──────────────────────────────────────────┤ │
│  │  Date of Birth                          │ │
│  │  August 15, 1990                  ▼     │ │  ← Field
│  ├──────────────────────────────────────────┤ │
│  │  Your age affects calorie calculations │ │  ← Helper text
│  ├──────────────────────────────────────────┤ │
│  │  Gender                                 │ │
│  │  ┌──────┬──────┬──────┐                │ │
│  │  │ Male │Female│Other │                │ │  ← Segmented control
│  │  └──────┴──────┴──────┘                │ │
│  ├──────────────────────────────────────────┤ │
│  │  Height                                 │ │
│  │  175                    ┌────┬────┐    │ │
│  │                         │ cm │ ft │    │ │  ← Unit toggle
│  │                         └────┴────┘    │ │
│  └──────────────────────────────────────────┘ │
│                                                │
│  ┌──────────────────────────────────────────┐ │
│  │             SECTION 2                    │ │
│  │    Current Status  🔄 Affects your plan  │ │
│  │                                          │ │
│  │  Track your current weight to monitor   │ │
│  │  progress                               │ │
│  ├──────────────────────────────────────────┤ │
│  │  Current Weight                         │ │
│  │  82.5                   ┌────┬────┐    │ │
│  │                         │ kg │lbs │    │ │
│  │                         └────┴────┘    │ │
│  ├──────────────────────────────────────────┤ │
│  │  💡 Weigh yourself in the morning       │ │
│  │     before eating for accuracy          │ │
│  └──────────────────────────────────────────┘ │
│                                                │
│  ┌──────────────────────────────────────────┐ │
│  │             SECTION 3                    │ │
│  │      Your Goal  🔄 Affects your plan     │ │
│  │                                          │ │
│  │  Define what you want to achieve        │ │
│  ├──────────────────────────────────────────┤ │
│  │  Primary Goal                           │ │
│  │  Lose Weight                      ▼     │ │
│  ├──────────────────────────────────────────┤ │
│  │  Target Weight                          │ │
│  │  75                     ┌────┬────┐    │ │
│  │                         │ kg │lbs │    │ │
│  │                         └────┴────┘    │ │
│  ├──────────────────────────────────────────┤ │
│  │  Target Date                            │ │
│  │  June 1, 2026                     ▼     │ │
│  └──────────────────────────────────────────┘ │
│                                                │
│  ┌──────────────────────────────────────────┐ │
│  │             SECTION 4                    │ │
│  │  Activity & Lifestyle  🔄 Affects plan   │ │
│  │                                          │ │
│  │  How active are you on a typical day?   │ │
│  ├──────────────────────────────────────────┤ │
│  │  Activity Level                         │ │
│  │  Moderately Active                ▼     │ │
│  │  Moderate exercise 3-5 days/week        │ │
│  └──────────────────────────────────────────┘ │
│                                                │
│  ┌──────────────────────────────────────────┐ │
│  │             SECTION 5                    │ │
│  │          Diet & Preferences              │ │
│  │                                          │ │
│  │  Dietary restrictions and meal prefs    │ │
│  ├──────────────────────────────────────────┤ │
│  │  Dietary Preferences                    │ │
│  │  ┌────────────┐ ┌──────────┐ ┌────┐   │ │
│  │  │Vegetarian ×│ │Gluten-free│ │ +  │   │ │  ← Tags
│  │  └────────────┘ └──────────┘ └────┘   │ │
│  ├──────────────────────────────────────────┤ │
│  │  Allergies & Restrictions               │ │
│  │  ┌────────┐ ┌────┐                     │ │
│  │  │Peanuts│ │ +  │                     │ │
│  │  └────────┘ └────┘                     │ │
│  ├──────────────────────────────────────────┤ │
│  │  Meals Per Day                          │ │
│  │         ┌───┬────┬───┐                 │ │
│  │         │ - │ 3  │ + │                 │ │  ← Stepper
│  │         └───┴────┴───┘                 │ │
│  └──────────────────────────────────────────┘ │
│                                                │
│  ┌──────────────────────────────────────────┐ │
│  │             SECTION 6                    │ │
│  │          Current Targets                 │ │
│  │                                          │ │
│  │  Automatically calculated                │ │
│  ├──────────────────────────────────────────┤ │
│  │  BMR                        1,650 cal/day│ │
│  │  ℹ️ Basal Metabolic Rate                │ │
│  ├──────────────────────────────────────────┤ │
│  │  TDEE                       2,200 cal/day│ │
│  │  ℹ️ Total Daily Energy Expenditure      │ │
│  ├──────────────────────────────────────────┤ │
│  │  Daily Calories             1,700 cal    │ │
│  │  🎯 Your personalized target            │ │
│  ├──────────────────────────────────────────┤ │
│  │  Daily Protein                   135g    │ │
│  │  💪 Supports muscle maintenance         │ │
│  ├──────────────────────────────────────────┤ │
│  │  Daily Water                  2,625ml    │ │
│  │  💧 Stay hydrated for optimal health    │ │
│  └──────────────────────────────────────────┘ │
│                                                │
├────────────────────────────────────────────────┤
│                                                │
│  ┌──────────────────────────────────────────┐ │  ← Sticky bottom
│  │          Save Changes                    │ │
│  └──────────────────────────────────────────┘ │
│                                                │
└────────────────────────────────────────────────┘
```

---

### Confirmation Modal (Goal Change)

```
┌────────────────────────────────────────────────┐
│░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░│  ← Backdrop (40% opacity)
│░░░░                                    ░░░░░░░│
│░░░░  ┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓  ░░░░░░░│
│░░░░  ┃  Change Your Goal?          ┃  ░░░░░░░│  ← Modal
│░░░░  ┃                             ┃  ░░░░░░░│
│░░░░  ┃  Changing your goal will    ┃  ░░░░░░░│
│░░░░  ┃  recalculate your daily     ┃  ░░░░░░░│
│░░░░  ┃  calorie and protein        ┃  ░░░░░░░│
│░░░░  ┃  targets.                   ┃  ░░░░░░░│
│░░░░  ┃                             ┃  ░░░░░░░│
│░░░░  ┃  Current goal:              ┃  ░░░░░░░│
│░░░░  ┃  Maintain Weight            ┃  ░░░░░░░│
│░░░░  ┃                             ┃  ░░░░░░░│
│░░░░  ┃  New goal:                  ┃  ░░░░░░░│
│░░░░  ┃  Lose Weight                ┃  ░░░░░░░│
│░░░░  ┃                             ┃  ░░░░░░░│
│░░░░  ┃  Your plan will be updated  ┃  ░░░░░░░│
│░░░░  ┃  tomorrow to reflect this   ┃  ░░░░░░░│
│░░░░  ┃  change.                    ┃  ░░░░░░░│
│░░░░  ┃                             ┃  ░░░░░░░│
│░░░░  ┃  ┌──────────┬────────────┐ ┃  ░░░░░░░│
│░░░░  ┃  │  Cancel  │Change Goal │ ┃  ░░░░░░░│
│░░░░  ┃  └──────────┴────────────┘ ┃  ░░░░░░░│
│░░░░  ┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛  ░░░░░░░│
│░░░░                                    ░░░░░░░│
│░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░│
└────────────────────────────────────────────────┘
```

---

### Success Toast (Target Changes)

```
┌────────────────────────────────────────────────┐
│                                                │
│  ┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓  │  ← Toast (top)
│  ┃  ✓  Your Targets Have Been Updated    ┃  │
│  ┃                                        ┃  │
│  ┃  Daily Calories                        ┃  │
│  ┃  1,850 → 1,700 (-150)                  ┃  │
│  ┃                                        ┃  │
│  ┃  Daily Protein                         ┃  │
│  ┃  140g → 135g (-5g)                     ┃  │
│  ┃                                        ┃  │
│  ┃  These changes will be reflected       ┃  │
│  ┃  starting tomorrow.                    ┃  │
│  ┃                                        ┃  │
│  ┃          [Got It]                      ┃  │
│  ┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛  │
│                                                │
│  [Form content below]                          │
│                                                │
└────────────────────────────────────────────────┘
```

---

### Error State (Validation)

```
┌────────────────────────────────────────────────┐
│                                                │
│  ┌──────────────────────────────────────────┐ │
│  │  ⚠️  Please fix the errors below         │ │  ← Error banner
│  └──────────────────────────────────────────┘ │
│                                                │
│  [Other form sections...]                      │
│                                                │
│  ┌──────────────────────────────────────────┐ │
│  │  Current Weight                          │ │
│  ├══════════════════════════════════════════┤ │  ← Red border (thick)
│  │  [empty]                  ┌────┬────┐   │ │
│  │                           │ kg │lbs │   │ │
│  │                           └────┴────┘   │ │
│  └──────────────────────────────────────────┘ │
│   ⚠️ Weight must be between 20-500 kg         │  ← Error message
│                                                │
│  ┌──────────────────────────────────────────┐ │
│  │  Target Date                             │ │
│  ├══════════════════════════════════════════┤ │  ← Red border
│  │  January 1, 2024                   ▼    │ │
│  └──────────────────────────────────────────┘ │
│   ⚠️ Target date must be in the future        │  ← Error message
│                                                │
└────────────────────────────────────────────────┘
```

---

## 14. Implementation Checklist

### Phase 1: Foundation (Week 1)

**Data Layer:**

- [ ] Create ProfileEditViewModel with all fields
- [ ] Add validation logic for each field
- [ ] Implement form state management (dirty tracking)
- [ ] Add API client methods for profile endpoints
- [ ] Create model types matching API responses

**UI Components:**

- [ ] Build section container component
- [ ] Create field wrapper with label + helper text
- [ ] Build error message component
- [ ] Create unit toggle component
- [ ] Build tag input component
- [ ] Create stepper component

---

### Phase 2: Form Implementation (Week 2)

**Section 1: About You**

- [ ] Date picker for date of birth
- [ ] Segmented control for gender
- [ ] Height input with unit toggle
- [ ] Add confirmation modal for DOB changes
- [ ] Implement age validation

**Section 2: Current Status**

- [ ] Weight input with unit toggle
- [ ] Add large change warning (>10kg)
- [ ] Implement weight validation
- [ ] Add helper text

**Section 3: Your Goal**

- [ ] Primary goal picker
- [ ] Target weight input
- [ ] Target date picker
- [ ] Add unrealistic timeline warning
- [ ] Add goal change confirmation

**Section 4: Activity Level**

- [ ] Activity level picker with descriptions
- [ ] Add helper text
- [ ] Implement validation

**Section 5: Diet & Preferences**

- [ ] Dietary preferences tag input
- [ ] Allergies tag input
- [ ] Meals per day stepper
- [ ] Add empty states
- [ ] Implement tag validation (max items)

**Section 6: Current Targets**

- [ ] Read-only card layout
- [ ] Info icons with explanations
- [ ] Format numbers correctly
- [ ] Add before/after comparison view

---

### Phase 3: Save Flow (Week 3)

**Save Button States:**

- [ ] Implement idle state
- [ ] Implement saving state with spinner
- [ ] Implement success state with checkmark
- [ ] Implement error state
- [ ] Add state transitions with animations

**API Integration:**

- [ ] Call PUT /profile/health endpoint
- [ ] Call PUT /profile/goals endpoint
- [ ] Call PUT /profile/preferences endpoint
- [ ] Handle response with plan changes
- [ ] Parse before/after targets

**Feedback:**

- [ ] Toast for simple success
- [ ] Modal for target changes
- [ ] Alert for errors
- [ ] Retry logic for failures

---

### Phase 4: Edge Cases (Week 4)

**Warnings & Confirmations:**

- [ ] Unsaved changes dialog
- [ ] Large weight change warning
- [ ] Unrealistic timeline warning
- [ ] Extreme values warning
- [ ] Goal change confirmation

**Error Handling:**

- [ ] Network timeout (>5s)
- [ ] Offline mode
- [ ] Server errors (500)
- [ ] Rate limiting (429)
- [ ] Multiple validation errors

---

### Phase 5: Polish (Week 5)

**Animations:**

- [ ] Field focus/blur animations
- [ ] Button press feedback
- [ ] Save button transitions
- [ ] Toast animations
- [ ] Modal animations
- [ ] List animations

**Haptics:**

- [ ] Field focus
- [ ] Toggle/stepper
- [ ] Button press
- [ ] Validation errors
- [ ] Success/error notifications

**Accessibility:**

- [ ] VoiceOver labels
- [ ] Hints for all fields
- [ ] Dynamic Type support
- [ ] Touch target sizing
- [ ] Color contrast audit
- [ ] Keyboard navigation (iPad)

---

### Phase 6: Testing (Week 6)

**Unit Tests:**

- [ ] ViewModel validation logic
- [ ] State management
- [ ] API client methods
- [ ] Model encoding/decoding

**Integration Tests:**

- [ ] Profile load flow
- [ ] Save flow (all endpoints)
- [ ] Offline mode
- [ ] Error handling

**UI Tests:**

- [ ] Form navigation
- [ ] Field validation
- [ ] Modal interactions
- [ ] Toast dismissal
- [ ] Accessibility

**Manual Testing:**

- [ ] VoiceOver walkthrough
- [ ] Dynamic Type at all sizes
- [ ] Offline/online transitions
- [ ] All error scenarios
- [ ] All warning dialogs
- [ ] Cross-device sync

---

### Phase 7: Launch (Week 7)

**Final Checks:**

- [ ] Code review complete
- [ ] All tests passing
- [ ] Accessibility audit complete
- [ ] Performance testing (no lag)
- [ ] Analytics instrumentation
- [ ] Error logging setup
- [ ] Feature flag configured

**Documentation:**

- [ ] API integration guide
- [ ] Component usage guide
- [ ] Testing guide
- [ ] Accessibility notes
- [ ] Known issues/limitations

**Launch:**

- [ ] Beta test with 50+ users
- [ ] Monitor error rates
- [ ] Collect user feedback
- [ ] Iterate based on data
- [ ] General availability release

---

## Appendix: Quick Reference

### Color Palette

| Name            | Hex     | Usage                          |
| --------------- | ------- | ------------------------------ |
| Primary Blue    | #007AFF | Buttons, links, focused states |
| Success Green   | #34C759 | Success messages, valid states |
| Error Red       | #FF3B30 | Error messages, invalid states |
| Warning Yellow  | #FF9500 | Warning messages, caution      |
| Text Primary    | #1C1C1E | Body text, labels              |
| Text Secondary  | #636366 | Helper text, placeholders      |
| Background      | #FFFFFF | Screen background              |
| Card Background | #F2F2F7 | Section backgrounds            |
| Border Gray     | #C7C7CC | Default borders                |

---

### Typography Scale

| Style       | Size | Weight   | Line Height | Usage                  |
| ----------- | ---- | -------- | ----------- | ---------------------- |
| Large Title | 34pt | Regular  | 41pt        | Screen titles          |
| Title 1     | 28pt | Regular  | 34pt        | Section headers        |
| Title 2     | 22pt | Regular  | 28pt        | Subsection headers     |
| Title 3     | 20pt | Semibold | 25pt        | Card headers           |
| Body        | 17pt | Regular  | 22pt        | Form fields, body text |
| Callout     | 16pt | Regular  | 21pt        | Helper text            |
| Subhead     | 15pt | Regular  | 20pt        | Secondary labels       |
| Footnote    | 13pt | Regular  | 18pt        | Validation errors      |
| Caption 1   | 12pt | Regular  | 16pt        | Timestamps, metadata   |

---

### Spacing Scale

| Name | Points | Usage                        |
| ---- | ------ | ---------------------------- |
| xs   | 4pt    | Tight spacing (icon to text) |
| sm   | 8pt    | Between related elements     |
| md   | 16pt   | Between form fields          |
| lg   | 24pt   | Between sections             |
| xl   | 32pt   | Between major groups         |
| 2xl  | 48pt   | Screen padding               |

---

### Animation Durations

| Type     | Duration | Easing      |
| -------- | -------- | ----------- |
| Micro    | 150ms    | Ease-in-out |
| Standard | 300ms    | Ease-out    |
| Emphasis | 400ms    | Spring      |
| Slow     | 500ms    | Ease-in     |

---

**End of UX Design Specification**

For questions or clarifications, contact the UX Design Team.
