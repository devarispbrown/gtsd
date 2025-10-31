# Comprehensive Test Plan - iOS GTSD Application
## Critical Issue Validation & Production Readiness

**Date**: October 28, 2025
**QA Lead**: QA Expert (Claude)
**Project**: GTSD iOS Application
**Version**: 1.0.0
**Status**: Ready for Execution

---

## Executive Summary

This test plan addresses **critical and high-priority issues** identified in the senior code review, validates recent fixes, and ensures production readiness. The plan covers 5 critical areas with 152 total test cases across accessibility, functionality, integration, performance, and regression testing.

### Issues Being Fixed

Based on Senior Code Review Report (October 27, 2025):

1. **CRITICAL**: Missing Accessibility Support (WCAG 2.1 AA compliance)
2. **CRITICAL**: Zero State Detection Logic (flawed heuristics)
3. **CRITICAL**: Race Condition in Metrics Summary Modal
4. **HIGH**: Missing "Maybe Later" Action Handler
5. **HIGH**: Backend Integration (health metrics endpoint)
6. **HIGH**: Deep Link Navigation
7. **HIGH**: Performance Validation

### Test Execution Priority

```
┌────────────────────────────────────────────────────┐
│ Phase 1: CRITICAL (Must Pass Before Any Deployment)│
├────────────────────────────────────────────────────┤
│ ✓ Accessibility Compliance (ACC-001 to ACC-004)   │
│ ✓ Zero State Detection (FUNC-003)                 │
│ ✓ Health Metrics Endpoint (FUNC-001)              │
│ ✓ Deep Link Navigation (FUNC-002)                 │
│ ✓ End-to-End Weight Update (INT-001)              │
│                                                    │
│ Phase 2: HIGH PRIORITY (Before Production)        │
├────────────────────────────────────────────────────┤
│ ✓ Performance Profiling (PERF-001)                │
│ ✓ Cache Behavior (INT-002)                        │
│ ✓ Error Recovery (INT-004)                        │
│ ✓ Metrics Summary Modal (FUNC-004)                │
│                                                    │
│ Phase 3: MEDIUM PRIORITY (Before App Store)       │
├────────────────────────────────────────────────────┤
│ ✓ Regression Suite (all existing features)        │
│ ✓ Device Compatibility Testing                    │
│ ✓ Offline Mode (INT-003)                          │
└────────────────────────────────────────────────────┘
```

---

## Table of Contents

1. [Accessibility Test Plan](#1-accessibility-test-plan)
2. [Functional Test Plan](#2-functional-test-plan)
3. [Integration Test Plan](#3-integration-test-plan)
4. [Performance Test Plan](#4-performance-test-plan)
5. [Regression Test Plan](#5-regression-test-plan)
6. [Test Execution Checklist](#6-test-execution-checklist)
7. [Production Readiness Criteria](#7-production-readiness-criteria)

---

## 1. Accessibility Test Plan

### Test Suite: ACC-001 - VoiceOver Navigation

**Priority**: CRITICAL
**Estimated Time**: 2 hours
**Blocking**: YES - App Store rejection risk

#### Prerequisites
- iOS device or simulator (iPhone 15 or later)
- VoiceOver enabled: Settings → Accessibility → VoiceOver → ON
- GTSD app installed and logged in
- Test user with completed profile

#### VoiceOver Test Environment Setup

```bash
# Enable VoiceOver via simulator menu
# Hardware → Accessibility → VoiceOver

# OR via command line:
xcrun simctl spawn booted notify_post com.apple.accessibility.voiceover.on
```

---

### ACC-001-01: Plan Summary Screen VoiceOver

**Objective**: Verify all elements in PlanSummaryView have proper accessibility labels

**File Under Test**: `/GTSD/Features/Plans/PlanSummaryView.swift`

**Steps**:
1. Open GTSD app with VoiceOver enabled
2. Navigate to "My Plan" tab
3. Swipe right to move through each element
4. Listen to announcements for each UI component
5. Verify reading order matches visual hierarchy

**Expected Accessibility Labels**:

| Element | Expected Label | Actual Label | Pass/Fail |
|---------|---------------|--------------|-----------|
| Navigation Title | "Your Plan, heading" | ❓ | ⬜ |
| Refresh Button | "Recalculate Plan, button, double tap to refresh" | ❓ | ⬜ |
| Last Updated | "Last updated 5 minutes ago" | ❓ | ⬜ |
| Outdated Warning | "Outdated, warning" | ❓ | ⬜ |
| Calorie Target | "Calories, 2000 calories target" | ❓ | ⬜ |
| Protein Target | "Protein, 120 grams target" | ❓ | ⬜ |
| Water Target | "Water, 2500 milliliters target" | ❓ | ⬜ |
| BMR Metric | "BMR, Basal Metabolic Rate, 1500 calories per day" | ❓ | ⬜ |
| TDEE Metric | "TDEE, Total Daily Energy Expenditure, 2000 calories per day" | ❓ | ⬜ |
| "Learn More" buttons | "Learn More about [topic], button" | ❓ | ⬜ |
| Expanded sections | Should read full science text | ❓ | ⬜ |
| Recomputation banner | "Plan Updated. Calories decreased by 150 calories" | ❓ | ⬜ |

**Reading Order Validation**:

Expected VoiceOver sequence (swipe right):
```
1. "Your Plan, heading"
2. "Recalculate Plan, button"
3. "Plan Updated, Calories decreased by 150 calories" (if banner present)
4. "Last updated 5 minutes ago"
5. "Welcome, John!"
6. "Your goal: Lose Weight"
7. "Health Metrics, heading"
8. "BMR, Basal Metabolic Rate, 1500 calories per day"
9. "TDEE, Total Daily Energy Expenditure, 2000 calories per day"
10. "Activity Level: Moderately Active"
11. "Daily Targets, heading"
12. "Calories, 2000 calories target"
13. "Protein, 120 grams target"
14. "Water, 2500 milliliters target"
15. "Weekly Rate: 1.5 pounds per week"
16. "Why It Works, heading"
17. [Continue through all sections...]
```

**Pass Criteria**:
- ✅ All interactive elements have labels
- ✅ Reading order is logical (follows visual hierarchy)
- ✅ Hints explain complex actions where needed
- ✅ No "Button" or "Image" without context
- ✅ Decorative icons hidden from VoiceOver
- ✅ Complex cards use `.accessibilityElement(children: .combine)`

**Required Fixes** (if failing):

```swift
// Example fixes needed in PlanSummaryView.swift

// Navigation Title (already has default label, verify it's announced)
.navigationTitle("Your Plan")

// Refresh Button
Button {
    // refresh action
} label: {
    Image(systemName: "arrow.clockwise")
}
.accessibilityLabel("Recalculate Plan")
.accessibilityHint("Double tap to refresh your nutrition plan")

// Last Updated Banner
HStack {
    Image(systemName: "clock")
    Text("Last updated \(timeSinceUpdate)")
}
.accessibilityElement(children: .combine)
.accessibilityLabel("Last updated \(timeSinceUpdate)")

// Outdated Warning
Text("• Outdated")
    .accessibilityLabel("Plan is outdated")
    .accessibilityAddTraits(.isStaticText)

// Calorie Target
targetRow(icon: "flame.fill", label: "Calories", value: "\(targets.calorieTarget) cal")
    .accessibilityElement(children: .combine)
    .accessibilityLabel("Calories, \(targets.calorieTarget) calories target")
    .accessibilityHint("Daily calorie intake goal")

// Protein Target
targetRow(icon: "leaf.fill", label: "Protein", value: "\(targets.proteinTarget)g")
    .accessibilityElement(children: .combine)
    .accessibilityLabel("Protein, \(targets.proteinTarget) grams target")
    .accessibilityHint("Daily protein intake goal")

// Water Target
targetRow(icon: "drop.fill", label: "Water", value: "\(targets.waterTarget)ml")
    .accessibilityElement(children: .combine)
    .accessibilityLabel("Water, \(targets.waterTarget) milliliters target")
    .accessibilityHint("Daily water intake goal")

// BMR Metric
metricRow(icon: "flame.fill", label: "BMR", value: "\(bmr) cal/day")
    .accessibilityElement(children: .combine)
    .accessibilityLabel("BMR, Basal Metabolic Rate, \(bmr) calories per day")
    .accessibilityHint("Calories your body burns at rest")

// TDEE Metric
metricRow(icon: "bolt.fill", label: "TDEE", value: "\(tdee) cal/day")
    .accessibilityElement(children: .combine)
    .accessibilityLabel("TDEE, Total Daily Energy Expenditure, \(tdee) calories per day")
    .accessibilityHint("Total calories your body burns daily including activity")

// Learn More Buttons
Button(action: { toggleSection(sectionId) }) {
    HStack {
        Image(systemName: "info.circle")
        Text(expandedSections.contains(sectionId) ? "Show Less" : "Learn More")
    }
}
.accessibilityLabel(expandedSections.contains(sectionId) ? "Show less about \(title)" : "Learn more about \(title)")
.accessibilityHint("Double tap to \(expandedSections.contains(sectionId) ? "collapse" : "expand") science explanation")

// Recomputation Banner
recomputationBanner
    .accessibilityElement(children: .combine)
    .accessibilityLabel("Plan Updated")
    .accessibilityValue(formatChangeSummary())  // e.g., "Calories decreased by 150 calories, Protein decreased by 10 grams"
    .accessibilityAddTraits(.isHeader)

// Decorative Icons (hide from VoiceOver)
Image(systemName: "flame.fill")
    .accessibilityHidden(true)  // Icon is already conveyed in label

// "Why It Works" Expanded Content
VStack {
    Text("The Science")
    Text(science)
}
.accessibilityElement(children: .combine)
.accessibilityLabel("The Science. \(science)")
```

---

### ACC-001-02: Profile Edit Screen VoiceOver

**Objective**: Verify weight update flow is accessible with VoiceOver

**File Under Test**: `/GTSD/Features/Profile/ProfileEditView.swift`

**Steps**:
1. Navigate to Profile tab with VoiceOver enabled
2. Tap "Edit" button
3. Navigate through edit form with swipe gestures
4. Focus on weight field
5. Listen to field announcement
6. Change weight value
7. Navigate to Save button
8. Listen to button announcement
9. Double tap to save
10. Verify success announcement

**Expected Accessibility Labels**:

| Element | Expected Label | Actual Label | Pass/Fail |
|---------|---------------|--------------|-----------|
| Navigation Title | "Edit Profile, heading" | ❓ | ⬜ |
| Cancel Button | "Cancel, button" | ❓ | ⬜ |
| Save Button | "Save, button, disabled" (when invalid) | ❓ | ⬜ |
| Profile Photo | "Profile photo, button, double tap to change" | ❓ | ⬜ |
| Name Field | "Full Name, John Doe, text field" | ❓ | ⬜ |
| Email Field | "Email, john@example.com, text field" | ❓ | ⬜ |
| Current Weight (read-only) | "Current Weight, 80 kilograms, text" | ❓ | ⬜ |
| Target Weight (read-only) | "Target Weight, 75 kilograms, text" | ❓ | ⬜ |
| Health Metrics Info | "Health metrics can only be updated during initial onboarding" | ❓ | ⬜ |
| Dietary Preferences | "Dietary Preferences, Vegetarian, text field" | ❓ | ⬜ |
| Meals Per Day | "Meals per Day, 3, text field" | ❓ | ⬜ |
| Save Changes Button | "Save Changes, button, double tap to save" | ❓ | ⬜ |

**Required Fixes** (if failing):

```swift
// Profile Photo
PhotosPicker(selection: $viewModel.selectedPhoto, matching: .images) {
    // content
}
.accessibilityLabel("Profile photo")
.accessibilityHint("Double tap to change your profile photo")
.accessibilityAddTraits(.isButton)

// Name Field
TextField("Full Name", text: $viewModel.name)
    .accessibilityLabel("Full Name")
    .accessibilityValue(viewModel.name)
    .accessibilityHint("Enter your full name")

// Email Field
TextField("Email", text: $viewModel.email)
    .accessibilityLabel("Email")
    .accessibilityValue(viewModel.email)
    .accessibilityHint("Enter your email address")

// Current Weight (Read-Only)
HStack {
    Text("Current Weight:")
    Spacer()
    Text("\(viewModel.currentWeight) kg")
        .fontWeight(.medium)
}
.accessibilityElement(children: .combine)
.accessibilityLabel("Current Weight, \(viewModel.currentWeight) kilograms")
.accessibilityAddTraits(.isStaticText)

// Target Weight (Read-Only)
HStack {
    Text("Target Weight:")
    Spacer()
    Text("\(viewModel.targetWeight) kg")
        .fontWeight(.medium)
}
.accessibilityElement(children: .combine)
.accessibilityLabel("Target Weight, \(viewModel.targetWeight) kilograms")
.accessibilityAddTraits(.isStaticText)

// Health Metrics Info Box
VStack {
    HStack {
        Image(systemName: "info.circle")
        Text("Health Metrics")
    }
    Text("Health metrics (weight, height, activity level) can only be updated during initial onboarding...")
}
.accessibilityElement(children: .combine)
.accessibilityLabel("Health Metrics Information")
.accessibilityValue("Health metrics can only be updated during initial onboarding. To make changes, please contact support or re-complete onboarding.")
.accessibilityAddTraits(.isStaticText)

// Save Button
GTSDButton("Save Changes", style: .primary, isDisabled: !viewModel.isValid)
    .accessibilityLabel("Save Changes")
    .accessibilityHint("Double tap to save your profile changes and recalculate your plan")
    .accessibilityAddTraits(viewModel.isValid ? .isButton : [.isButton, .notEnabled])

// Form Validation Errors
if let error = viewModel.nameError {
    Text(error)
        .accessibilityLabel("Name error: \(error)")
        .accessibilityAddTraits(.isStaticText)
}
```

**Pass Criteria**:
- ✅ All form fields have clear labels
- ✅ Field values are announced
- ✅ Hints explain what each field is for
- ✅ Validation errors are announced
- ✅ Read-only fields indicated as non-editable
- ✅ Success/error feedback announced after save

---

### ACC-001-03: Zero State Card VoiceOver

**Objective**: Verify ProfileZeroStateCard is accessible

**File Under Test**: `/GTSD/Features/Home/ProfileZeroStateCard.swift`

**Steps**:
1. Trigger zero state (user with incomplete profile)
2. Navigate to Home screen with VoiceOver
3. Swipe to zero state card
4. Listen to announcement
5. Navigate through card elements
6. Test "Complete Profile" button
7. Test "Maybe Later" button (if implemented)

**Expected Accessibility Labels**:

| Element | Expected Label | Actual Label | Pass/Fail |
|---------|---------------|--------------|-----------|
| Card Container | "Complete Your Health Profile" | ❓ | ⬜ |
| Emoji Icon | Hidden from VoiceOver (decorative) | ❓ | ⬜ |
| Title | "Complete Your Health Profile, heading" | ❓ | ⬜ |
| Description | "Unlock personalized nutrition goals..." | ❓ | ⬜ |
| Complete Button | "Complete Your Profile, button" | ❓ | ⬜ |
| Maybe Later | "Maybe Later, button, dismiss this card" | ❓ | ⬜ |

**Required Fixes** (if failing):

```swift
// Zero State Card Container
GTSDCard {
    VStack(spacing: Spacing.md) {
        // Emoji (decorative, hide from VoiceOver)
        Text("📊")
            .font(.system(size: 60))
            .accessibilityHidden(true)

        // Title
        Text("Complete Your Health Profile")
            .font(.titleLarge)
            .accessibilityAddTraits(.isHeader)

        // Description
        Text("Unlock personalized nutrition goals, calorie targets, and science-backed recommendations tailored just for you.")
            .font(.bodyMedium)
            .accessibilityAddTraits(.isStaticText)

        // Complete Button
        GTSDButton("Complete Your Profile", style: .primary) {
            onComplete()
        }
        .accessibilityLabel("Complete Your Profile")
        .accessibilityHint("Double tap to complete your health profile and get personalized recommendations")

        // Maybe Later Button
        Button(action: onDismiss) {
            Text("Maybe Later")
        }
        .accessibilityLabel("Maybe Later")
        .accessibilityHint("Dismiss this card. You can complete your profile later from settings")
    }
}
.accessibilityElement(children: .contain)  // Allow navigating to children
```

**Pass Criteria**:
- ✅ Card announced with title
- ✅ Description read aloud
- ✅ Both buttons announced with clear actions
- ✅ Emoji hidden (decorative)
- ✅ Hints explain consequences of actions

---

### ACC-001-04: Metrics Summary Modal VoiceOver

**Objective**: Verify MetricsSummaryView (post-onboarding modal) is accessible

**File Under Test**: `/GTSD/Features/Onboarding/MetricsSummaryView.swift`

**Expected Accessibility Labels**:

| Element | Expected Label | Actual Label | Pass/Fail |
|---------|---------------|--------------|-----------|
| Navigation Title | "How GTSD Works for You, heading" | ❓ | ⬜ |
| Close Button | "Close, button, dismiss metrics summary" | ❓ | ⬜ |
| BMR Card | "BMR, Basal Metabolic Rate, 1500 calories per day" | ❓ | ⬜ |
| BMR Learn More | "Learn More about BMR, button" | ❓ | ⬜ |
| TDEE Card | "TDEE, Total Daily Energy Expenditure, 2000 calories per day" | ❓ | ⬜ |
| TDEE Learn More | "Learn More about TDEE, button" | ❓ | ⬜ |
| Timeline Projection | "Estimated 12 weeks to reach your goal weight of 75 kilograms" | ❓ | ⬜ |
| Get Started Button | "Get Started, button, continue to the app" | ❓ | ⬜ |

**Required Fixes** (if failing):

```swift
// Close Button in Toolbar
ToolbarItem(placement: .navigationBarTrailing) {
    Button(action: onGetStarted) {
        Image(systemName: "xmark")
    }
    .accessibilityLabel("Close")
    .accessibilityHint("Dismiss metrics summary and continue to the app")
}

// BMR Card
ExpandableMetricCard(...) {
    // content
}
.accessibilityElement(children: .combine)
.accessibilityLabel("BMR, Basal Metabolic Rate, \(bmr) calories per day")
.accessibilityHint("Your body burns this many calories at rest. Double tap to learn more")

// TDEE Card
ExpandableMetricCard(...) {
    // content
}
.accessibilityElement(children: .combine)
.accessibilityLabel("TDEE, Total Daily Energy Expenditure, \(tdee) calories per day")
.accessibilityHint("Your total daily calorie burn including activity. Double tap to learn more")

// Timeline Projection
if let estimatedWeeks = summary.targets.estimatedWeeks, let projectedDate = summary.targets.projectedDate {
    VStack {
        Text("Timeline Projection")
        Text("Estimated \(estimatedWeeks) weeks to reach your goal")
    }
    .accessibilityElement(children: .combine)
    .accessibilityLabel("Timeline Projection")
    .accessibilityValue("Estimated \(estimatedWeeks) weeks to reach your goal weight of \(targetWeight) kilograms by \(projectedDate, format: .dateTime.month().day().year())")
}

// Get Started Button
GTSDButton("Get Started", style: .primary, action: onGetStarted)
    .accessibilityLabel("Get Started")
    .accessibilityHint("Continue to the app and start tracking your nutrition")
```

**Pass Criteria**:
- ✅ All metrics announced with explanations
- ✅ Learn More buttons have clear labels
- ✅ Timeline projection read aloud
- ✅ Get Started button has clear action
- ✅ Close button works and is announced

---

### Test Suite: ACC-002 - Dynamic Type

**Priority**: CRITICAL
**Estimated Time**: 1 hour
**Blocking**: YES - WCAG 2.1 AA requirement

#### Dynamic Type Test Sizes

Test on all 7 standard sizes:
1. Extra Small (xS)
2. Small (S)
3. **Medium (M)** - Default baseline
4. Large (L)
5. Extra Large (xL)
6. Extra Extra Large (xxL)
7. **Extra Extra Extra Large (xxxL)** - Most problematic

**How to Test**:
```
Device: Settings → Display & Brightness → Text Size
Simulator: Accessibility Inspector → Font Size slider
```

---

### ACC-002-01: Plan Summary at Default Size (Baseline)

**Settings**: Text Size → Medium (M)

**Steps**:
1. Set device to Medium text size
2. Open My Plan tab
3. Take screenshot for baseline
4. Verify all text is readable
5. Verify no truncation
6. Verify spacing is appropriate
7. Verify touch targets ≥ 44pt

**Expected Results**:
- ✅ All text readable
- ✅ No truncation
- ✅ Spacing appropriate
- ✅ Touch targets ≥ 44pt (all buttons/tappable areas)
- ✅ Icons properly sized
- ✅ Cards don't overlap

**Pass Criteria**: ✅ Baseline appearance looks good (reference for other sizes)

---

### ACC-002-02: Plan Summary at Extra Large

**Settings**: Text Size → Extra Large (xL)

**Steps**:
1. Set device to xL text size
2. Relaunch app (for size to take effect)
3. Navigate to My Plan tab
4. Scroll through entire screen
5. Verify all elements scale appropriately

**Expected Results**:
- ✅ Text scales proportionally (~1.5x larger than baseline)
- ✅ Layout adapts (may stack horizontally arranged elements)
- ✅ No overlapping text
- ✅ Still readable
- ✅ Touch targets still ≥ 44pt
- ✅ Icons scale with text

**Checkpoints**:
- [ ] Navigation title larger
- [ ] Card titles larger
- [ ] Body text larger
- [ ] Metric values larger
- [ ] Buttons readable
- [ ] "Why It Works" sections readable

**Pass Criteria**: ✅ Text larger, layout intact, all information visible

---

### ACC-002-03: Plan Summary at Extra Extra Extra Large (Stress Test)

**Settings**: Text Size → Extra Extra Extra Large (xxxL)

**Steps**:
1. Set device to xxxL text size
2. Relaunch app
3. Navigate to My Plan tab
4. **Carefully** scroll through entire screen
5. Document any layout issues

**Expected Results**:
- ✅ Text scales to xxxL (~2.4x larger than baseline)
- ✅ Layout may reflow significantly (HStacks → VStacks)
- ✅ Minimum 2 lines for labels (no single-line truncation)
- ✅ No critical information lost
- ✅ Horizontal scrolling NOT required
- ✅ Touch targets maintained ≥ 44pt

**Common Issues to Check**:
- [ ] Text truncation with "..." (BAD)
- [ ] Horizontal scrolling required (BAD)
- [ ] Buttons too small to tap (BAD)
- [ ] Overlapping text (BAD)
- [ ] Icons disappear (BAD)
- [ ] Card layouts break (BAD)

**Required Fixes** (if issues found):

```swift
// Use .minimumScaleFactor for long text that might truncate
Text(planData.plan.name)
    .font(.titleMedium)
    .minimumScaleFactor(0.8)  // Allow shrinking to 80% if needed
    .lineLimit(2)  // Allow wrapping to 2 lines

// Use adaptive layouts for side-by-side content
@Environment(\.sizeCategory) var sizeCategory

var body: some View {
    Group {
        if sizeCategory >= .accessibilityMedium {
            // Stack vertically at large sizes
            VStack(alignment: .leading, spacing: Spacing.sm) {
                metricLabel
                metricValue
            }
        } else {
            // Side by side at normal sizes
            HStack {
                metricLabel
                Spacer()
                metricValue
            }
        }
    }
}

// Ensure button minimum height
GTSDButton(...)
    .frame(minHeight: 44)  // Always maintain minimum touch target

// Use scaledToFit for icons
Image(systemName: "flame.fill")
    .font(.system(size: IconSize.md))
    .scaledToFit()
    .frame(maxWidth: IconSize.lg)  // Prevent icons from getting too large

// Add flexible spacing
VStack(spacing: Spacing.md) {
    // content
}
.dynamicTypeSize(...DesignSystem.maxDynamicTypeSize)  // Cap at xxxL if needed
```

**Pass Criteria**:
- ✅ All text visible (no truncation)
- ✅ Layout doesn't break
- ✅ Touch targets still tappable (≥ 44pt)
- ✅ No horizontal scrolling
- ✅ App remains usable (even if appearance is compromised)

---

### ACC-002-04: Profile Edit at xxxL

**Settings**: Text Size → Extra Extra Extra Large (xxxL)

**Steps**:
1. Set device to xxxL
2. Navigate to Profile → Edit
3. Verify form elements scale properly

**Expected Results**:
- ✅ Form fields readable
- ✅ Labels don't truncate
- ✅ Buttons remain tappable
- ✅ Error messages visible

**Pass Criteria**: ✅ Form usable at xxxL

---

### ACC-002-05: Zero State Card at xxxL

**Settings**: Text Size → Extra Extra Extra Large (xxxL)

**Steps**:
1. Set device to xxxL
2. Trigger zero state
3. Verify card scales properly

**Expected Results**:
- ✅ Emoji remains visible (or hidden at large sizes)
- ✅ Title readable
- ✅ Description readable (may need more lines)
- ✅ Buttons tappable

**Pass Criteria**: ✅ Zero state card usable at xxxL

---

### Test Suite: ACC-003 - Color Contrast (WCAG AA)

**Priority**: CRITICAL
**Estimated Time**: 1 hour
**Blocking**: YES - WCAG 2.1 AA requirement

#### Color Contrast Requirements

**WCAG AA Standards**:
| Text Size | Minimum Ratio |
|-----------|--------------|
| Normal text (< 18pt) | **4.5:1** |
| Large text (≥ 18pt bold or ≥ 24pt) | **3:1** |
| UI components & graphics | **3:1** |

#### Testing Method

**Use Xcode Accessibility Inspector**:
1. Xcode → Xcode menu → Open Developer Tool → Accessibility Inspector
2. Select GTSD app on simulator
3. Click "Audit" tab
4. Check "Color Contrast" rule
5. Click "Run Audit"
6. Review all failures

**Manual Testing**:
- Online contrast checker: https://webaim.org/resources/contrastchecker/
- Check each color pair used in the app

---

### ACC-003-01: Light Mode Contrast

**Objective**: Verify all text and UI elements meet WCAG AA in light mode

**Steps**:
1. Set device to Light Mode (Settings → Display & Brightness → Light)
2. Open Accessibility Inspector
3. Select GTSD app
4. Run "Color Contrast" audit
5. Document all failures

**Expected Color Pairs** (verify each):

| Element | Foreground | Background | Expected Ratio | Actual Ratio | Pass/Fail |
|---------|------------|------------|----------------|--------------|-----------|
| Card titles | `.textPrimary` | `.cardBackground` | ≥ 4.5:1 | ❓ | ⬜ |
| Body text | `.textSecondary` | `.cardBackground` | ≥ 4.5:1 | ❓ | ⬜ |
| Tertiary text | `.textTertiary` | `.cardBackground` | ≥ 4.5:1 | ❓ | ⬜ |
| Metric values | `.textPrimary` | `.cardBackground` | ≥ 4.5:1 | ❓ | ⬜ |
| Button text | `.white` | `.primaryColor` | ≥ 4.5:1 | ❓ | ⬜ |
| Orange icons | `.orange` | `.cardBackground` | ≥ 3:1 | ❓ | ⬜ |
| Green icons | `.green` | `.cardBackground` | ≥ 3:1 | ❓ | ⬜ |
| Blue icons | `.blue` | `.cardBackground` | ≥ 3:1 | ❓ | ⬜ |
| Error text | `.errorColor` | `.cardBackground` | ≥ 4.5:1 | ❓ | ⬜ |
| Stale warning | `.orange` | `.cardBackground` | ≥ 4.5:1 | ❓ | ⬜ |
| Link text | `.primaryColor` | `.cardBackground` | ≥ 4.5:1 | ❓ | ⬜ |

**Required Fixes** (if failures found):

```swift
// Example: If .textSecondary fails contrast in light mode
extension Color {
    static let textSecondary = Color(
        light: Color(hex: "4A5568"),  // Darker gray for better contrast
        dark: Color(hex: "CBD5E0")    // Lighter gray for dark mode
    )
}

// Verify new colors meet WCAG AA:
// Light mode: #4A5568 on #FFFFFF = 7.5:1 ✅
// Dark mode: #CBD5E0 on #1A202C = 10.8:1 ✅

// Use ColorPicker to test:
// https://webaim.org/resources/contrastchecker/
// Foreground: #4A5568
// Background: #FFFFFF
// Result: 7.5:1 (Pass for normal text)
```

**Pass Criteria**:
- ✅ Zero contrast failures in Xcode Inspector
- ✅ All ratios meet or exceed requirements
- ✅ Manual spot-checks confirm automated results

---

### ACC-003-02: Dark Mode Contrast

**Objective**: Verify all text and UI elements meet WCAG AA in dark mode

**Steps**:
1. Set device to Dark Mode (Settings → Display & Brightness → Dark)
2. Open Accessibility Inspector
3. Run "Color Contrast" audit
4. Document all failures

**Expected Color Pairs** (verify each):

| Element | Foreground | Background | Expected Ratio | Actual Ratio | Pass/Fail |
|---------|------------|------------|----------------|--------------|-----------|
| Card titles | `.textPrimary` | `.cardBackground` | ≥ 4.5:1 | ❓ | ⬜ |
| Body text | `.textSecondary` | `.cardBackground` | ≥ 4.5:1 | ❓ | ⬜ |
| Metric values | `.textPrimary` | `.cardBackground` | ≥ 4.5:1 | ❓ | ⬜ |
| Button text | `.white` | `.primaryColor` | ≥ 4.5:1 | ❓ | ⬜ |

**Pass Criteria**:
- ✅ Dark mode colors have adequate contrast
- ✅ No elements become invisible
- ✅ All ratios meet requirements

---

### Test Suite: ACC-004 - Touch Targets

**Priority**: HIGH
**Estimated Time**: 30 minutes
**Blocking**: NO (but strongly recommended)

#### Touch Target Requirements

**Apple Human Interface Guidelines**:
- All buttons: ≥ **44x44 pt**
- All tappable cards: ≥ **44pt height**
- Spacing between targets: ≥ **8pt**

#### ACC-004-01: Minimum Touch Target Size

**Objective**: Verify all interactive elements meet minimum size

**Tool**: Xcode Accessibility Inspector

**Steps**:
1. Open Accessibility Inspector
2. Enable "Show Hit Areas" (click crosshair icon)
3. Hover over each interactive element
4. Inspector shows hit area dimensions
5. Verify all ≥ 44x44pt

**Elements to Check**:

| Element | Expected Size | Actual Size | Pass/Fail |
|---------|--------------|-------------|-----------|
| Refresh button (toolbar) | ≥ 44x44pt | ❓ | ⬜ |
| "Recalculate Plan" button | ≥ 44pt height | ❓ | ⬜ |
| "Learn More" buttons | ≥ 44x44pt | ❓ | ⬜ |
| Card tap areas | ≥ 44pt height | ❓ | ⬜ |
| Tab bar icons | ≥ 44x44pt | ❓ | ⬜ |
| Close button (modal) | ≥ 44x44pt | ❓ | ⬜ |
| "Maybe Later" button | ≥ 44x44pt | ❓ | ⬜ |
| Save button | ≥ 44pt height | ❓ | ⬜ |

**Required Fixes** (if failing):

```swift
// Ensure button minimum size
Button(action: {}) {
    Text("Learn More")
        .font(.labelMedium)
}
.frame(minWidth: 44, minHeight: 44)  // Ensure minimum touch target

// Or use padding to expand hit area
Button(action: {}) {
    Image(systemName: "arrow.clockwise")
}
.padding(12)  // Expands hit area to 44x44pt (20pt icon + 12pt padding * 2)
.contentShape(Rectangle())  // Make entire padded area tappable

// For custom cards with tap gestures
GTSDCard {
    // content
}
.frame(minHeight: 44)
.onTapGesture {
    // action
}
```

**Pass Criteria**:
- ✅ All interactive elements ≥ 44x44pt
- ✅ No accidental taps on adjacent elements
- ✅ Spacing between elements ≥ 8pt

---

### Accessibility Test Summary Template

Use this template to document results:

```markdown
## Accessibility Test Results

**Date**: YYYY-MM-DD
**Tester**: [Name]
**Device**: iPhone 15, iOS 18.0
**Build**: GTSD v1.0.0 (build 123)

### Test Suite Results

| Test Suite | Total Tests | Passed | Failed | Blocked | Pass Rate |
|------------|-------------|--------|--------|---------|-----------|
| ACC-001 (VoiceOver) | 4 | ❓ | ❓ | ❓ | ❓ |
| ACC-002 (Dynamic Type) | 5 | ❓ | ❓ | ❓ | ❓ |
| ACC-003 (Color Contrast) | 2 | ❓ | ❓ | ❓ | ❓ |
| ACC-004 (Touch Targets) | 1 | ❓ | ❓ | ❓ | ❓ |
| **TOTAL** | **12** | **❓** | **❓** | **❓** | **❓%** |

### Critical Issues Found

1. [Issue description]
   - **Severity**: Critical/High/Medium/Low
   - **Test Case**: ACC-XXX-XX
   - **Steps to Reproduce**: ...
   - **Expected**: ...
   - **Actual**: ...
   - **Recommendation**: ...

### Overall Accessibility Score

**Score**: ❓ / 100

**Breakdown**:
- VoiceOver: ❓ / 25
- Dynamic Type: ❓ / 25
- Color Contrast: ❓ / 25
- Touch Targets: ❓ / 25

### Recommendation

- [ ] ✅ PASS - Ready for production
- [ ] ⚠️ CONDITIONAL PASS - Minor issues, can ship with known limitations
- [ ] ❌ FAIL - Critical issues, cannot ship

**Blocker Issues**: [List any blocking issues]

**Next Steps**: [Actions required before production]
```

---

## 2. Functional Test Plan

### Test Suite: FUNC-001 - Health Metrics Endpoint

**Priority**: CRITICAL
**Estimated Time**: 1 hour
**Blocking**: YES - Core functionality

#### Prerequisites
- Backend API running (localhost:3000 or staging)
- Valid test user with completed onboarding
- JWT token for authentication
- cURL or Postman installed

---

### FUNC-001-01: Update Weight Successfully

**Objective**: Verify weight can be updated and plan recomputes

**API Endpoint**: `PUT /v1/auth/profile/health`
**Authentication**: Required (Bearer token)

**Test Steps**:

1. **Get JWT Token**:
```bash
TOKEN=$(curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com", "password": "password123"}' \
  | jq -r '.data.accessToken')

echo $TOKEN  # Verify token received
```

2. **Update Weight**:
```bash
curl -X PUT http://localhost:3000/api/v1/auth/profile/health \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "currentWeight": 75.5
  }' \
  -w "\nHTTP Status: %{http_code}\n" \
  -s | jq '.'
```

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

**Verification Steps**:
3. **Verify in Database**:
```sql
SELECT "currentWeight", "updatedAt"
FROM users
WHERE email = 'test@example.com';
```

Expected: `currentWeight` = 75.5, `updatedAt` recently changed

4. **Verify Plan Recomputed**:
```sql
SELECT "calorieTarget", "proteinTarget", "updatedAt"
FROM plans
WHERE "userId" = (SELECT id FROM users WHERE email = 'test@example.com')
ORDER BY "updatedAt" DESC
LIMIT 1;
```

Expected: New plan entry with updated targets

**Pass Criteria**:
- ✅ 200 status code
- ✅ `success: true` in response
- ✅ `planUpdated: true` in response
- ✅ `targets` object contains all expected fields
- ✅ Profile `currentWeight` updated in database
- ✅ Plan `calorieTarget` recalculated based on new weight
- ✅ Plan `updatedAt` timestamp is recent (< 5 seconds ago)

**Expected Behavior**:
- Weight decreased (80kg → 75.5kg) → Calorie target should **decrease**
- Weight increased (80kg → 85kg) → Calorie target should **increase**

---

### FUNC-001-02: Validation Errors

**Objective**: Verify invalid weight inputs are rejected

**Test Cases**:

#### Test A: Weight Too Low
```bash
curl -X PUT http://localhost:3000/api/v1/auth/profile/health \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"currentWeight": -5}' \
  -w "\nHTTP Status: %{http_code}\n"
```

**Expected**: 400 Bad Request
```json
{
  "success": false,
  "error": "Validation failed: currentWeight must be between 30 and 300 kg"
}
```

#### Test B: Weight Too High
```bash
curl -X PUT http://localhost:3000/api/v1/auth/profile/health \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"currentWeight": 500}' \
  -w "\nHTTP Status: %{http_code}\n"
```

**Expected**: 400 Bad Request

#### Test C: Non-Numeric Weight
```bash
curl -X PUT http://localhost:3000/api/v1/auth/profile/health \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"currentWeight": "abc"}' \
  -w "\nHTTP Status: %{http_code}\n"
```

**Expected**: 400 Bad Request

#### Test D: Null Weight
```bash
curl -X PUT http://localhost:3000/api/v1/auth/profile/health \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"currentWeight": null}' \
  -w "\nHTTP Status: %{http_code}\n"
```

**Expected**: 400 Bad Request

#### Test E: Missing Weight Field
```bash
curl -X PUT http://localhost:3000/api/v1/auth/profile/health \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{}' \
  -w "\nHTTP Status: %{http_code}\n"
```

**Expected**: 400 Bad Request

**Pass Criteria** (for all invalid inputs):
- ✅ 400 status code
- ✅ `success: false` in response
- ✅ Clear error message explaining the issue
- ✅ No database changes (verify with SELECT query)
- ✅ No plan recomputation occurred

---

### FUNC-001-03: Unauthorized Access

**Objective**: Verify endpoint is protected

**Test Cases**:

#### Test A: No Token
```bash
curl -X PUT http://localhost:3000/api/v1/auth/profile/health \
  -H "Content-Type: application/json" \
  -d '{"currentWeight": 75.5}' \
  -w "\nHTTP Status: %{http_code}\n"
```

**Expected**: 401 Unauthorized
```json
{
  "success": false,
  "error": "No authorization token provided"
}
```

#### Test B: Expired Token
```bash
# Use an expired token (you may need to manually create one)
EXPIRED_TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.expired.token"

curl -X PUT http://localhost:3000/api/v1/auth/profile/health \
  -H "Authorization: Bearer $EXPIRED_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"currentWeight": 75.5}' \
  -w "\nHTTP Status: %{http_code}\n"
```

**Expected**: 401 Unauthorized
```json
{
  "success": false,
  "error": "Token expired"
}
```

#### Test C: Invalid Token
```bash
curl -X PUT http://localhost:3000/api/v1/auth/profile/health \
  -H "Authorization: Bearer invalid_token_12345" \
  -H "Content-Type: application/json" \
  -d '{"currentWeight": 75.5}' \
  -w "\nHTTP Status: %{http_code}\n"
```

**Expected**: 401 Unauthorized
```json
{
  "success": false,
  "error": "Invalid token"
}
```

**Pass Criteria**:
- ✅ All unauthorized requests return 401
- ✅ Error messages are clear
- ✅ No data leaked in error responses
- ✅ No database changes

---

### FUNC-001-04: Rate Limiting

**Objective**: Verify rate limiting is enforced

**Test Steps**:
```bash
# Send 100 requests in quick succession
for i in {1..100}; do
  curl -X PUT http://localhost:3000/api/v1/auth/profile/health \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d "{\"currentWeight\": $((75 + i / 10))}" \
    -w "Request $i - HTTP Status: %{http_code}\n" \
    -s -o /dev/null &
done

wait
```

**Expected**:
- First ~50 requests: 200 OK
- After limit exceeded: 429 Too Many Requests

**Expected Response** (429):
```json
{
  "success": false,
  "error": "Too many requests. Please try again later.",
  "retryAfter": 60
}
```

**Pass Criteria**:
- ✅ Rate limit enforced (e.g., 50 requests per minute)
- ✅ 429 status code after limit exceeded
- ✅ `Retry-After` header present (in seconds)
- ✅ Error message is user-friendly

---

### Test Suite: FUNC-002 - Deep Link Navigation

**Priority**: CRITICAL
**Estimated Time**: 45 minutes
**Blocking**: YES - Core feature for notifications

#### Prerequisites
- iOS app installed
- Deep link URL scheme registered: `gtsd://`
- Test user logged in

---

### FUNC-002-01: Notification Deep Link (Cold Start)

**Objective**: Verify notification deep link works when app is NOT running

**Test Steps**:

1. **Force Quit App**:
   - Swipe up from bottom (or double-press Home)
   - Swipe up on GTSD app to force quit
   - Verify app is not in app switcher

2. **Trigger Local Notification**:
```bash
# Use xcrun to trigger a notification (simulator only)
xcrun simctl push booted com.gtsd.app notification.apns

# OR use the Notifications debug panel in Xcode
# Debug → Simulate Notification → Custom notification
```

**Notification Payload** (notification.apns):
```json
{
  "aps": {
    "alert": {
      "title": "Plan Updated",
      "body": "Your nutrition plan has been recomputed based on your new weight."
    },
    "badge": 1,
    "sound": "default"
  },
  "deepLink": "gtsd://plan/updated"
}
```

3. **Tap Notification**:
   - Notification appears in Notification Center
   - Tap notification
   - App should launch

**Expected Behavior**:
- ✅ App launches (cold start)
- ✅ Navigates directly to "My Plan" tab
- ✅ Plan screen shows updated data
- ✅ Selection haptic plays (vibration feedback)
- ✅ Navigation is instant (< 500ms after launch)
- ✅ No intermediate screens shown (e.g., splash, onboarding)

**Pass Criteria**:
- ✅ Cold start navigation works
- ✅ Correct tab selected (My Plan)
- ✅ Data displayed correctly
- ✅ Haptic feedback plays
- ✅ User lands on correct screen within 2 seconds

**Debug**:
If deep link doesn't work, check:
```swift
// In GTSDApp.swift or SceneDelegate
.onOpenURL { url in
    print("Deep link received: \(url)")
    DeepLinkHandler.shared.handle(url)
}
```

---

### FUNC-002-02: Notification Deep Link (Warm Start)

**Objective**: Verify notification deep link works when app is in background

**Test Steps**:

1. **Open App**:
   - Launch GTSD app
   - Navigate to any tab (e.g., Home)

2. **Background App**:
   - Press Home button (or swipe up)
   - App goes to background

3. **Trigger Notification**:
   - Use same method as FUNC-002-01
   - Notification appears

4. **Tap Notification**:
   - Tap notification
   - App foregrounds

**Expected Behavior**:
- ✅ App foregrounds (does NOT restart)
- ✅ Switches to "My Plan" tab
- ✅ Haptic feedback plays
- ✅ Navigation is instant (< 200ms)
- ✅ Previous tab state is lost (switched to Plan tab)

**Pass Criteria**:
- ✅ Tab switching works
- ✅ No app restart
- ✅ Haptic feedback
- ✅ Correct screen displayed

---

### FUNC-002-03: URL Scheme Deep Link (Safari)

**Objective**: Verify URL scheme deep links work from external apps

**Test Steps**:

1. **Open Safari** (on simulator or device)

2. **Enter Deep Link URL** in address bar:
```
gtsd://plan/updated
```

3. **Navigate**:
   - Safari shows "Open in GTSD?" dialog
   - Tap "Open"

**Expected Behavior**:
- ✅ Dialog appears: "Open in GTSD?"
- ✅ Tapping "Open" launches/foregrounds app
- ✅ Navigates to Plan tab
- ✅ Works for both cold and warm start

**Additional Deep Links to Test**:

| Deep Link | Expected Destination | Pass/Fail |
|-----------|---------------------|-----------|
| `gtsd://plan/updated` | My Plan tab | ⬜ |
| `gtsd://plan/view` | My Plan tab | ⬜ |
| `gtsd://profile` | Profile tab | ⬜ |
| `gtsd://tasks` | Tasks tab (if exists) | ⬜ |
| `gtsd://streaks` | Streaks tab (if exists) | ⬜ |
| `gtsd://home` | Home tab | ⬜ |
| `gtsd://invalid` | Home tab (fallback) | ⬜ |

**Pass Criteria**:
- ✅ URL scheme registered (`Info.plist` contains `gtsd`)
- ✅ Deep link handled correctly
- ✅ Fallback to Home for invalid links
- ✅ No crashes or errors

**Verify URL Scheme Registration**:
```bash
# Check Info.plist in Xcode project
open /Users/devarisbrown/Code/projects/gtsd/apps/GTSD/GTSD.xcodeproj

# Look for CFBundleURLTypes
```

Expected in `Info.plist`:
```xml
<key>CFBundleURLTypes</key>
<array>
    <dict>
        <key>CFBundleURLSchemes</key>
        <array>
            <string>gtsd</string>
        </array>
        <key>CFBundleURLName</key>
        <string>com.gtsd.app</string>
    </dict>
</array>
```

---

### Test Suite: FUNC-003 - Zero State Detection

**Priority**: CRITICAL
**Estimated Time**: 1 hour
**Blocking**: YES - Flawed logic identified in senior review

**Reference**: Senior Code Review Report, Critical Issue #1

---

### FUNC-003-01: Zero State Shown for Incomplete Profile

**Objective**: Verify zero state card appears when user has placeholder values

**Issue**: Current implementation uses flawed heuristic (checks for `stats` field) instead of validating actual weight/height values.

**Test Scenario A**: User skips onboarding with weight=0, height=0

**Steps**:
1. Create test user with:
   - `hasCompletedOnboarding`: `true`
   - `currentWeight`: `0`
   - `targetWeight`: `0`
   - `height`: `0`

2. Database setup:
```sql
INSERT INTO users (email, "passwordHash", name, "hasCompletedOnboarding", "currentWeight", "targetWeight", height)
VALUES ('zero-state-test@example.com', '$2b$10$...', 'Test User', true, 0, 0, 0);
```

3. Login as this user
4. Navigate to Home screen

**Expected Behavior**:
- ✅ ProfileZeroStateCard is shown
- ✅ Card displays: "Complete Your Health Profile"
- ✅ "Complete Your Profile" button is visible
- ✅ Card is NOT dismissible until profile completed

**Actual Behavior** (before fix):
- ❌ Zero state card does NOT show (bug!)
- ❌ Backend may return stats even with weight=0

**Required Fix** in `/GTSD/Features/Home/HomeViewModel.swift`:

```swift
// BEFORE (lines 123-151) - FLAWED
private func checkForZeroState() {
    // ... existing code ...

    // ❌ PROBLEM: This checks for stats field, not actual values
    if let stats = profile.stats {
        shouldShowZeroState = false  // ← BUG: Stats may exist even with weight=0
    } else {
        shouldShowZeroState = true
    }
}

// AFTER - CORRECT
private func checkForZeroState() {
    guard let user = currentUser else {
        shouldShowZeroState = true
        return
    }

    // Don't show zero state if user hasn't completed onboarding at all
    if !user.hasCompletedOnboarding {
        shouldShowZeroState = false  // Let the onboarding flow handle this
        return
    }

    // Check if user completed onboarding with placeholder values
    guard let profile = userProfile else {
        shouldShowZeroState = true
        return
    }

    // ✅ FIX: Check for actual placeholder values in health settings
    let hasValidWeight = (profile.currentWeight ?? 0) > 0
    let hasValidHeight = (profile.height ?? 0) > 0

    shouldShowZeroState = !hasValidWeight || !hasValidHeight

    Logger.info("Zero state check: weight=\(profile.currentWeight ?? 0), height=\(profile.height ?? 0), shouldShow=\(shouldShowZeroState)")
}
```

**Pass Criteria**:
- ✅ Zero state shown when weight = 0
- ✅ Zero state shown when height = 0
- ✅ Zero state shown when both = 0
- ✅ Zero state NOT shown when both > 0

---

### FUNC-003-02: Zero State Hidden for Complete Profile

**Objective**: Verify zero state does NOT show for users with valid data

**Test Scenario**: User with complete profile

**Steps**:
1. Create/use test user with:
   - `hasCompletedOnboarding`: `true`
   - `currentWeight`: `80` (valid)
   - `targetWeight`: `75` (valid)
   - `height`: `175` (valid)

2. Login as this user
3. Navigate to Home screen

**Expected Behavior**:
- ✅ ProfileZeroStateCard is NOT shown
- ✅ Home screen shows normal content (tasks, widgets, etc.)

**Pass Criteria**:
- ✅ Zero state NOT shown for complete profiles
- ✅ No flickering (brief show then hide)

---

### FUNC-003-03: "Maybe Later" Button Functionality

**Objective**: Verify "Maybe Later" button dismisses card

**Issue**: Current implementation has no tap handler (Senior Review Critical Issue #4)

**Steps**:
1. Trigger zero state (user with incomplete profile)
2. Zero state card appears
3. Locate "Maybe Later" text/button
4. Tap "Maybe Later"

**Expected Behavior**:
- ✅ Card dismisses with animation
- ✅ Dismissal persisted to UserDefaults
- ✅ Card does NOT reappear on next Home screen visit
- ✅ Card CAN reappear after app restart (or after X days)

**Required Fix** in `/GTSD/Features/Home/ProfileZeroStateCard.swift`:

```swift
// BEFORE - NO ACTION
// Dismiss option
Text("Maybe Later")
    .font(.bodyMedium)
    .foregroundColor(.textTertiary)
    .padding(.bottom, Spacing.xs)

// AFTER - FUNCTIONAL BUTTON
struct ProfileZeroStateCard: View {
    let userName: String
    let onComplete: () -> Void
    let onDismiss: () -> Void  // ← ADD THIS

    var body: some View {
        // ... existing code ...

        // Dismiss option
        Button(action: onDismiss) {
            Text("Maybe Later")
                .font(.bodyMedium)
                .foregroundColor(.textTertiary)
        }
        .accessibilityLabel("Dismiss profile completion card")
        .accessibilityHint("You can complete your profile later from settings")
        .padding(.bottom, Spacing.xs)
    }
}
```

**In HomeView.swift**:
```swift
@State private var hasUserDismissedZeroState = false
@AppStorage("zeroStateDismissed") private var zeroStateDismissedDate: Double = 0

var body: some View {
    // ... existing code ...

    if viewModel.shouldShowZeroState && !hasUserDismissedZeroState && !isRecentlyDismissed {
        ProfileZeroStateCard(
            userName: viewModel.currentUser?.name ?? "there",
            onComplete: {
                showingOnboarding = true
            },
            onDismiss: {
                hasUserDismissedZeroState = true
                zeroStateDismissedDate = Date().timeIntervalSince1970
                // Optionally: HapticManager.shared.notification(.success)
            }
        )
    }
}

private var isRecentlyDismissed: Bool {
    let daysSinceDismiss = (Date().timeIntervalSince1970 - zeroStateDismissedDate) / 86400
    return daysSinceDismiss < 7  // Re-show after 7 days
}
```

**Pass Criteria**:
- ✅ "Maybe Later" is a functional button
- ✅ Tapping dismisses the card
- ✅ Dismissal persisted across app sessions
- ✅ Card can reappear after X days (configurable)

---

### FUNC-003-04: Zero State After Onboarding Skip

**Objective**: Verify zero state handling when user skips onboarding fields

**Test Scenario**: User taps "Skip" during onboarding health metrics step

**Steps**:
1. Start fresh onboarding
2. Proceed to health metrics screen
3. Tap "Skip" (if available)
4. Complete remaining onboarding steps
5. Land on Home screen

**Expected Behavior**:
- ✅ Zero state card appears immediately on Home
- ✅ Card prompts to complete health profile
- ✅ Tapping "Complete Your Profile" navigates back to onboarding health metrics

**Pass Criteria**:
- ✅ Zero state triggered by onboarding skip
- ✅ User can complete profile from zero state
- ✅ Flow works seamlessly

---

### Test Suite: FUNC-004 - Metrics Summary Modal

**Priority**: HIGH
**Estimated Time**: 30 minutes
**Blocking**: YES - Race condition identified

**Reference**: Senior Code Review Report, Critical Issue #3

---

### FUNC-004-01: Metrics Summary Modal Appears

**Objective**: Verify metrics summary modal shows after onboarding completion

**Issue**: Race condition where onboarding dismisses before modal can show.

**Steps**:
1. Complete onboarding flow
2. Reach final "Review" screen
3. Tap "Complete" button
4. Wait for API call to complete
5. Observe modal presentation

**Expected Behavior**:
- ✅ "Complete" button shows loading state
- ✅ API call completes successfully
- ✅ **Onboarding does NOT dismiss yet**
- ✅ Metrics summary modal appears
- ✅ Modal shows BMR, TDEE, timeline projection
- ✅ "Get Started" button is visible

**Actual Behavior** (before fix):
- ❌ Onboarding dismisses immediately after API call
- ❌ Modal never appears (race condition)

**Required Fix** in `/GTSD/Features/Onboarding/OnboardingCoordinator.swift`:

```swift
// BEFORE (lines 70-76) - RACE CONDITION
GTSDButton("Complete", style: .primary, isLoading: viewModel.isLoading, isDisabled: !viewModel.canProceed) {
    _Concurrency.Task {
        await viewModel.completeOnboarding()
        if viewModel.errorMessage == nil {
            dismiss()  // ⚠️ This dismisses BEFORE the sheet can show
        }
    }
}

// AFTER - FIXED
GTSDButton("Complete", style: .primary, isLoading: viewModel.isLoading, isDisabled: !viewModel.canProceed) {
    _Concurrency.Task {
        await viewModel.completeOnboarding()
        // Don't dismiss here - let the metrics summary sheet handle dismissal
    }
}
.sheet(isPresented: $viewModel.showMetricsSummary) {
    // On dismiss, close the onboarding flow
    dismiss()  // ← Move dismiss to sheet's onDismiss
} content: {
    if let summary = viewModel.metricsSummary {
        MetricsSummaryView(summary: summary) {
            viewModel.showMetricsSummary = false
            // Sheet will auto-dismiss, triggering the onDismiss closure above
        }
    }
}
```

**Pass Criteria**:
- ✅ Modal appears after onboarding completion
- ✅ Onboarding stays visible until modal dismissed
- ✅ "Get Started" dismisses both modal and onboarding
- ✅ No flickering or premature dismissal

---

### FUNC-004-02: Metrics Summary Dismissal

**Objective**: Verify modal can be dismissed correctly

**Steps**:
1. Complete onboarding (trigger metrics summary)
2. Modal appears
3. **Method A**: Tap "Get Started" button
4. **Method B**: Swipe down to dismiss (if allowed)
5. **Method C**: Tap close button (X)

**Expected Behavior**:
- ✅ All dismissal methods work
- ✅ Modal dismisses with animation
- ✅ Onboarding coordinator also dismisses
- ✅ User lands on Home screen
- ✅ No crashes or navigation errors

**Pass Criteria**:
- ✅ Multiple dismissal methods tested
- ✅ All methods work correctly
- ✅ Navigation state clean after dismissal

---

### Test Suite: FUNC-005 - Plan Recomputation

**Priority**: HIGH
**Estimated Time**: 45 minutes

---

### FUNC-005-01: Significant Changes Detection

**Objective**: Verify significant changes trigger recomputation banner

**Test Cases**:

#### Test A: Calorie Change > 50
**Steps**:
1. Note current calorie target (e.g., 2000 cal)
2. Update weight by -3kg (80kg → 77kg)
3. Save profile
4. Navigate to My Plan tab

**Expected**:
- ✅ Recomputation banner appears
- ✅ Banner shows: "Calories decreased by ~150 calories"
- ✅ Change is > 50 calories
- ✅ Banner is dismissible

#### Test B: Protein Change > 10g
**Steps**:
1. Note current protein target (e.g., 120g)
2. Update weight by -5kg (80kg → 75kg)
3. Save profile
4. Navigate to My Plan tab

**Expected**:
- ✅ Recomputation banner appears
- ✅ Banner shows: "Protein decreased by ~15g"
- ✅ Change is > 10 grams
- ✅ Banner is dismissible

#### Test C: Small Changes (No Alert)
**Steps**:
1. Update weight by -0.2kg (80kg → 79.8kg)
2. Save profile
3. Navigate to My Plan tab

**Expected**:
- ✅ **No banner shown** (change too small)
- ✅ Plan still updated (new data visible)
- ✅ Calorie change < 50
- ✅ Protein change < 10g

**Pass Criteria**:
- ✅ Calorie change > 50 → Banner shown
- ✅ Protein change > 10g → Banner shown
- ✅ Small changes → No banner (silent update)
- ✅ Banner accurate and dismissible

---

## 3. Integration Test Plan

### Test Suite: INT-001 - End-to-End Weight Update Flow

**Priority**: CRITICAL
**Estimated Time**: 30 minutes
**Blocking**: YES - Core user flow

---

### INT-001-01: Complete Weight Update Flow

**Objective**: Validate entire weight update → plan recomputation flow

**Prerequisites**:
- User logged in
- Onboarding completed
- Current weight: 80kg
- Current plan: 2000 cal target

**Test Steps**:

| Step | Action | Expected Result | Actual Result | Pass/Fail |
|------|--------|----------------|---------------|-----------|
| 1 | Open app | App launches to Home screen | ❓ | ⬜ |
| 2 | Navigate to Profile tab | Profile screen displays | ❓ | ⬜ |
| 3 | Verify current weight shows "80 kg" | Weight field shows 80 | ❓ | ⬜ |
| 4 | Tap "Edit" button | Edit mode activates, keyboard appears | ❓ | ⬜ |
| 5 | Change weight to "75 kg" | Weight field updates to 75 | ❓ | ⬜ |
| 6 | Tap "Save" button | Loading indicator appears on button | ❓ | ⬜ |
| 7 | Observe loading duration | Spinner shows 1-3s | ❓ Time: ___s | ⬜ |
| 8 | Wait for success modal | PlanChangeSummaryView modal appears | ❓ | ⬜ |
| 9 | Read plan changes | Shows before/after comparison | ❓ | ⬜ |
| 10 | Tap "Continue" | Modal dismisses, returns to Profile | ❓ | ⬜ |
| 11 | Navigate to My Plan tab | Plan view displays with new data | ❓ | ⬜ |
| 12 | Observe recomputation banner | "Plan Updated" banner shown | ❓ | ⬜ |
| 13 | Read banner text | Shows calorie/protein decreases | ❓ | ⬜ |
| 14 | Verify new calorie target | Should be < 2000 cal (weight decreased) | ❓ New: ___ | ⬜ |
| 15 | Verify new protein target | Should be < 120g (weight decreased) | ❓ New: ___ | ⬜ |
| 16 | Check "Last updated" time | Should show "Just now" | ❓ | ⬜ |
| 17 | Pull to refresh | Plan refreshes (cache invalidated) | ❓ | ⬜ |
| 18 | Verify data consistency | Same targets after refresh | ❓ | ⬜ |

**Expected Timings**:
- Save button tap → Success modal: **< 3 seconds**
- Modal dismiss → Plan screen update: **< 500ms**
- Total end-to-end: **< 3.5 seconds**

**Success Criteria**:
- ✅ All 18 steps pass
- ✅ No crashes or errors
- ✅ Calorie target decreases appropriately
- ✅ Protein target decreases appropriately
- ✅ UI updates within 3.5 seconds
- ✅ Banner displays change summary correctly
- ✅ Haptic feedback at appropriate points

**Failure Scenarios to Test**:

#### Test B: Backend Returns 500
**Steps**:
- Configure backend to return 500 error
- Attempt weight update
- **Expected**: Error message, keep old plan, retry available

#### Test C: Network Timeout
**Steps**:
- Enable slow network (Network Link Conditioner → 3G)
- Attempt weight update
- **Expected**: Timeout after 30s, error shown, retry available

#### Test D: Invalid Weight (0 kg)
**Steps**:
- Enter weight = 0
- Tap Save
- **Expected**: Validation error BEFORE save, no API call

---

### Test Suite: INT-002 - Cache Behavior Validation

**Priority**: HIGH
**Estimated Time**: 20 minutes

#### INT-002-01: First Load (Cache Miss)

**Steps**:
| Step | Action | Expected Result | Actual Result | Pass/Fail |
|------|--------|----------------|---------------|-----------|
| 1 | Fresh install app (or clear data) | Clean state | ❓ | ⬜ |
| 2 | Complete onboarding | User data saved | ❓ | ⬜ |
| 3 | Navigate to My Plan tab | Loading spinner appears | ❓ | ⬜ |
| 4 | Measure loading time (stopwatch) | Should take 0.5-2s (network call) | ❓ Time: ___s | ⬜ |
| 5 | Verify plan displays | All metrics visible | ❓ | ⬜ |
| 6 | Check "Last updated" | Should show "Just now" | ❓ | ⬜ |

**Pass Criteria**: ✅ Initial load works, data cached

#### INT-002-02: Second Load (Cache Hit)

**Steps**:
| Step | Action | Expected Result | Actual Result | Pass/Fail |
|------|--------|----------------|---------------|-----------|
| 7 | Navigate away from Plan tab | Other tab displays | ❓ | ⬜ |
| 8 | Navigate back to My Plan tab | Plan appears **instantly** | ❓ | ⬜ |
| 9 | Measure loading time | Should be < 50ms (cache hit) | ❓ Time: ___ms | ⬜ |
| 10 | Verify same data displayed | Matches previous load | ❓ | ⬜ |
| 11 | No loading spinner shown | Instant display | ❓ | ⬜ |

**Pass Criteria**: ✅ Cache hit < 50ms, instant display

#### INT-002-03: Stale Cache (30-60 minutes old)

**Steps**:
| Step | Action | Expected Result | Actual Result | Pass/Fail |
|------|--------|----------------|---------------|-----------|
| 12 | Change device time +35 minutes | Time updated | ❓ | ⬜ |
| 13 | Navigate to My Plan tab | Cached data shows immediately | ❓ | ⬜ |
| 14 | Observe background refresh | No loading spinner (silent) | ❓ | ⬜ |
| 15 | Wait 2-3 seconds | Data refreshes without blocking UI | ❓ | ⬜ |
| 16 | Check "Last updated" | Updates to "Just now" | ❓ | ⬜ |

**Pass Criteria**: ✅ Silent refresh doesn't block UI

#### INT-002-04: Expired Cache (> 1 hour old)

**Steps**:
| Step | Action | Expected Result | Actual Result | Pass/Fail |
|------|--------|----------------|---------------|-----------|
| 17 | Change device time +65 minutes | Time updated | ❓ | ⬜ |
| 18 | Kill and restart app | Fresh launch | ❓ | ⬜ |
| 19 | Navigate to My Plan tab | Loading spinner appears | ❓ | ⬜ |
| 20 | Verify "Outdated" warning shown | Orange "Outdated" text | ❓ | ⬜ |
| 21 | Wait for refresh | New data fetched | ❓ | ⬜ |
| 22 | "Outdated" warning disappears | Clean state | ❓ | ⬜ |

**Pass Criteria**: ✅ Expired cache triggers full refresh, warning shown

---

### Test Suite: INT-003 - Offline Mode Behavior

**Priority**: MEDIUM
**Estimated Time**: 15 minutes

#### INT-003-01: Offline with Cached Plan

**Steps**:
| Step | Action | Expected Result | Actual Result | Pass/Fail |
|------|--------|----------------|---------------|-----------|
| 1 | Load plan while online | Plan cached | ❓ | ⬜ |
| 2 | Enable Airplane Mode | Network disabled | ❓ | ⬜ |
| 3 | Kill and restart app | Fresh launch | ❓ | ⬜ |
| 4 | Navigate to My Plan tab | Cached plan displays | ❓ | ⬜ |
| 5 | Verify offline banner shown | "No internet connection" banner | ❓ | ⬜ |
| 6 | Attempt pull-to-refresh | Error: "No internet connection" | ❓ | ⬜ |
| 7 | Tap "Recalculate Plan" button | Error: "No internet connection" | ❓ | ⬜ |
| 8 | Error message has "Retry" button | Retry button visible | ❓ | ⬜ |
| 9 | Disable Airplane Mode | Network restored | ❓ | ⬜ |
| 10 | Tap "Retry" button | Loading spinner appears | ❓ | ⬜ |
| 11 | Plan refreshes successfully | New data loaded | ❓ | ⬜ |
| 12 | Offline banner removed | Clean state | ❓ | ⬜ |

**Pass Criteria**:
- ✅ Cached data accessible offline
- ✅ Clear offline indicators
- ✅ Retry mechanism works

---

### Test Suite: INT-004 - Error Recovery Flow

**Priority**: HIGH
**Estimated Time**: 30 minutes

#### INT-004-01: Backend 500 Error

**Steps**:
| Step | Action | Expected Result | Actual Result | Pass/Fail |
|------|--------|----------------|---------------|-----------|
| 1 | Configure backend to return 500 | Error mode enabled | ❓ | ⬜ |
| 2 | Attempt to load plan | Error state appears | ❓ | ⬜ |
| 3 | Verify error message | "Server error (500): [message]" | ❓ | ⬜ |
| 4 | Check if cached data shown | Old plan visible below error | ❓ | ⬜ |
| 5 | Verify "Retry" button present | Button available | ❓ | ⬜ |
| 6 | Tap "Retry" | Loading spinner appears | ❓ | ⬜ |
| 7 | Backend returns 500 again | Error message persists | ❓ | ⬜ |
| 8 | Fix backend (return 200) | Backend working | ❓ | ⬜ |
| 9 | Tap "Retry" again | Loading spinner appears | ❓ | ⬜ |
| 10 | Plan loads successfully | Error cleared, fresh data shown | ❓ | ⬜ |

**Pass Criteria**:
- ✅ Error handled gracefully
- ✅ Cached data preserved
- ✅ Retry mechanism works

---

## 4. Performance Test Plan

### Test Suite: PERF-001 - Performance Benchmarks

**Priority**: HIGH
**Estimated Time**: 2 hours
**Blocking**: NO (but strongly recommended)

---

### PERF-001-01: Weight Update Flow Performance

**Objective**: Measure end-to-end performance of weight update → plan refresh

**Target**: Total time < 2000ms (p95)

**Equipment**:
- Device: iPhone 15 (physical device preferred) or simulator
- Network: WiFi (consistent connection)
- Tool: Xcode Instruments Time Profiler

**Procedure**:

1. **Launch Instruments**:
```bash
# Open Instruments from Xcode
Xcode → Open Developer Tool → Instruments → Time Profiler
```

2. **Configure**:
   - Target: GTSD app
   - Device: iPhone 15 simulator (or physical device)
   - Template: Time Profiler

3. **Start Recording**:
   - Click red record button
   - Wait for app to launch

4. **Execute Test Scenario**:
   - Navigate to Profile tab
   - Tap Edit
   - Change weight from 80kg → 75kg
   - Note timestamp when Save tapped: `T0`
   - Tap Save
   - Wait for plan to refresh
   - Note timestamp when PlanSummaryView updates: `T1`
   - Calculate total time: `T1 - T0`

5. **Stop Recording**:
   - Click stop button in Instruments

6. **Repeat** 10 times:
   - Record each timing
   - Calculate average, p95, p99

**Measurement Points**:

```
┌───────────────────────────────────────────────────┐
│ Operation              │ Target   │ Measure From  │
├───────────────────────────────────────────────────┤
│ API Call (Backend)     │ < 300ms  │ HTTP request  │
│                        │          │ start to      │
│                        │          │ response recv │
├───────────────────────────────────────────────────┤
│ JSON Decoding          │ < 50ms   │ Data receive  │
│                        │          │ to model      │
│                        │          │ creation      │
├───────────────────────────────────────────────────┤
│ Cache Update           │ < 10ms   │ UserDefaults  │
│                        │          │ .set duration │
├───────────────────────────────────────────────────┤
│ UI Refresh             │ < 100ms  │ State change  │
│                        │          │ to view       │
│                        │          │ render        │
├───────────────────────────────────────────────────┤
│ **TOTAL END-TO-END**   │ < 2000ms │ Tap Save to   │
│                        │          │ visible       │
│                        │          │ update        │
└───────────────────────────────────────────────────┘
```

**Instruments Analysis**:

Filter Time Profiler by:
- `PlanService.generatePlan()` - Should be < 350ms
- `PlanStore.fetchPlan()` - Should be < 400ms
- `PlanSummaryView.body` - Should be < 50ms (UI render)
- `UserDefaults.set()` - Should be < 10ms

**Recording Template**:

| Run | Total Time | API Call | JSON Decode | Cache Update | UI Refresh | Pass/Fail |
|-----|-----------|----------|-------------|--------------|------------|-----------|
| 1   | ❓ ms     | ❓ ms    | ❓ ms       | ❓ ms        | ❓ ms      | ⬜ |
| 2   | ❓ ms     | ❓ ms    | ❓ ms       | ❓ ms        | ❓ ms      | ⬜ |
| 3   | ❓ ms     | ❓ ms    | ❓ ms       | ❓ ms        | ❓ ms      | ⬜ |
| ... | ...       | ...      | ...         | ...          | ...        | ... |
| 10  | ❓ ms     | ❓ ms    | ❓ ms       | ❓ ms        | ❓ ms      | ⬜ |

**Calculate Statistics**:
```
Average: SUM(times) / 10
p95: 95th percentile (9th slowest time)
p99: 99th percentile (10th slowest time, worst case)
```

**Pass/Fail Criteria**:
- ✅ PASS: p95 ≤ 2000ms
- ⚠️ WARNING: p95 2001-3000ms (acceptable but investigate)
- ❌ FAIL: p95 > 3000ms (unacceptable UX)

**If FAIL**, investigate:
- Backend API response time (check server logs)
- Network latency (check WiFi, use faster network)
- JSON decoding (optimize Codable models)
- Main thread blocking (move work to background)

---

### PERF-001-02: Cache Hit Performance

**Objective**: Measure plan retrieval time from cache

**Target**: < 50ms

**Procedure**:
1. Open Instruments → Time Profiler
2. Start recording
3. Navigate to My Plan tab (first time - populates cache)
4. Navigate to another tab
5. Navigate back to My Plan tab (should hit cache)
6. Stop recording

**Measurement**:
```
Expected trace:
PlanStore.fetchPlan()
  ├─ isCacheValid() → true (< 1ms)
  └─ return currentPlan (< 1ms)
Total: < 50ms (includes view render)
```

**Recording Template**:

| Run | Cache Hit Time | Pass/Fail |
|-----|---------------|-----------|
| 1   | ❓ ms         | ⬜ |
| 2   | ❓ ms         | ⬜ |
| 3   | ❓ ms         | ⬜ |
| Avg | ❓ ms         | ⬜ |

**Pass/Fail Criteria**:
- ✅ PASS: < 50ms
- ❌ FAIL: ≥ 50ms (investigate why cache is slow)

---

### PERF-001-03: Silent Background Refresh

**Objective**: Verify silent refresh doesn't block UI

**Target**: < 300ms, non-blocking

**Procedure**:
1. Set device time +35 minutes (to trigger silent refresh)
2. Open Instruments → Time Profiler
3. Navigate to My Plan tab
4. Observe:
   - View should render immediately (cache)
   - Background task should run in parallel
5. Monitor for:
   - Main thread blocking
   - UI jank or stuttering

**Measurement**:
```
Expected behavior:
Main Thread:
  └─ PlanStore.fetchPlan() returns immediately (cache)

Detached Task:
  └─ silentRefresh() runs in background
      └─ PlanService.generatePlan() [non-blocking]
      └─ Updates state on MainActor.run {}
```

**Pass/Fail Criteria**:
- ✅ PASS: UI responsive, refresh < 300ms
- ❌ FAIL: UI blocks or refresh > 300ms

---

## 5. Regression Test Plan

### Test Suite: REG-001 - Existing Features

**Priority**: MEDIUM
**Estimated Time**: 2 hours
**Blocking**: NO (but required before App Store)

#### Regression Checklist

**Authentication**:
- [ ] Login with valid credentials works
- [ ] Login with invalid credentials fails gracefully
- [ ] Logout works and clears tokens
- [ ] Token refresh works automatically
- [ ] Biometric authentication works (if enabled)
- [ ] Session timeout works

**Profile**:
- [ ] Profile view loads correctly
- [ ] Profile edit (non-weight fields) works
- [ ] Avatar upload works
- [ ] Dietary preferences save correctly
- [ ] Profile data persists across app restarts

**Plans**:
- [ ] Plan summary loads
- [ ] "Why It Works" sections expand/collapse
- [ ] Pull-to-refresh works
- [ ] Plan details display correctly
- [ ] Timeline projection shows (if available)

**Home**:
- [ ] Home screen loads
- [ ] Widgets display correctly
- [ ] Navigation to other tabs works
- [ ] Zero state card logic works (tested in FUNC-003)

**Onboarding**:
- [ ] Welcome screen appears for new users
- [ ] All onboarding steps accessible
- [ ] Form validation works
- [ ] Can skip optional fields
- [ ] Can go back to previous steps
- [ ] Completion triggers metrics summary (tested in FUNC-004)

**Settings**:
- [ ] Settings screen loads
- [ ] Preferences save correctly
- [ ] Notification toggle works
- [ ] Dark mode toggle works
- [ ] About screen displays correctly

**Tasks** (if implemented):
- [ ] Task list loads
- [ ] Task completion works
- [ ] Task detail view works
- [ ] Evidence upload works

**Streaks** (if implemented):
- [ ] Streaks view loads
- [ ] Streak count accurate
- [ ] Calendar heatmap displays
- [ ] Badge display works

---

## 6. Test Execution Checklist

### Phase 1: CRITICAL (Must Complete)

#### Accessibility Tests
- [ ] ACC-001-01: Plan Summary VoiceOver
- [ ] ACC-001-02: Profile Edit VoiceOver
- [ ] ACC-001-03: Zero State Card VoiceOver
- [ ] ACC-001-04: Metrics Summary Modal VoiceOver
- [ ] ACC-002-01: Plan Summary at Default Size
- [ ] ACC-002-02: Plan Summary at Extra Large
- [ ] ACC-002-03: Plan Summary at xxxL (Stress Test)
- [ ] ACC-002-04: Profile Edit at xxxL
- [ ] ACC-002-05: Zero State Card at xxxL
- [ ] ACC-003-01: Light Mode Contrast
- [ ] ACC-003-02: Dark Mode Contrast
- [ ] ACC-004-01: Minimum Touch Target Size

**Target**: 100% pass rate

#### Functional Tests
- [ ] FUNC-001-01: Update Weight Successfully
- [ ] FUNC-001-02: Validation Errors
- [ ] FUNC-001-03: Unauthorized Access
- [ ] FUNC-001-04: Rate Limiting
- [ ] FUNC-002-01: Notification Deep Link (Cold Start)
- [ ] FUNC-002-02: Notification Deep Link (Warm Start)
- [ ] FUNC-002-03: URL Scheme Deep Link
- [ ] FUNC-003-01: Zero State Shown for Incomplete Profile
- [ ] FUNC-003-02: Zero State Hidden for Complete Profile
- [ ] FUNC-003-03: "Maybe Later" Button Functionality
- [ ] FUNC-003-04: Zero State After Onboarding Skip
- [ ] FUNC-004-01: Metrics Summary Modal Appears
- [ ] FUNC-004-02: Metrics Summary Dismissal

**Target**: 100% pass rate

#### Integration Tests
- [ ] INT-001-01: Complete Weight Update Flow
- [ ] INT-002-01: First Load (Cache Miss)
- [ ] INT-002-02: Second Load (Cache Hit)
- [ ] INT-004-01: Backend 500 Error

**Target**: 100% pass rate

---

### Phase 2: HIGH PRIORITY

#### Performance Tests
- [ ] PERF-001-01: Weight Update Flow Performance (10 runs)
- [ ] PERF-001-02: Cache Hit Performance (3 runs)
- [ ] PERF-001-03: Silent Background Refresh

**Target**: p95 meets all benchmarks

#### Additional Integration Tests
- [ ] INT-002-03: Stale Cache (30-60 min old)
- [ ] INT-002-04: Expired Cache (> 1 hour)
- [ ] INT-003-01: Offline with Cached Plan
- [ ] INT-004-01: Backend 500 Error (full flow)

**Target**: 90%+ pass rate

---

### Phase 3: MEDIUM PRIORITY

#### Regression Tests
- [ ] Authentication (6 test cases)
- [ ] Profile (5 test cases)
- [ ] Plans (5 test cases)
- [ ] Home (4 test cases)
- [ ] Onboarding (6 test cases)
- [ ] Settings (5 test cases)

**Target**: 95%+ pass rate

---

## 7. Production Readiness Criteria

### Critical Requirements (Must Pass)

#### Accessibility (CRITICAL)
- [x] All VoiceOver tests pass (12/12)
- [x] All Dynamic Type tests pass (5/5)
- [x] All color contrast tests pass (2/2)
- [x] All touch target tests pass (1/1)
- [x] Zero accessibility violations in Xcode Inspector

**Status**: ❓ Not Tested
**Blocking**: YES

#### Functionality (CRITICAL)
- [x] Health metrics endpoint works (4/4 tests)
- [x] Deep link navigation works (3/3 tests)
- [x] Zero state detection works (4/4 tests)
- [x] Metrics summary modal works (2/2 tests)
- [x] All integration tests pass (8/8 tests)
- [x] No regressions detected (31/31 tests)

**Status**: ❓ Not Tested
**Blocking**: YES

#### Performance (HIGH)
- [x] Weight update flow < 2s (p95)
- [x] Cache hit < 50ms
- [x] Memory usage acceptable
- [x] Frame rate ≥ 60fps

**Status**: ❓ Not Tested
**Blocking**: NO (but strongly recommended)

#### Quality (MEDIUM)
- [ ] All unit tests pass (33/33 tests in GTSDTests/)
- [ ] Code coverage ≥ 80%
- [ ] No critical bugs in bug tracker
- [ ] Error monitoring configured

**Status**: Partially Complete
**Blocking**: NO

---

### Production Readiness Score

**Scoring Rubric**:
```
Accessibility:  ❓ / 25 points
Functionality:  ❓ / 25 points
Performance:    ❓ / 20 points
Integration:    ❓ / 15 points
Regression:     ❓ / 10 points
Documentation:  ❓ / 5 points
-------------------------
TOTAL SCORE:    ❓ / 100 points
```

**Interpretation**:
- **≥ 90**: Production-ready, green light to ship ✅
- **80-89**: Minor issues, can ship with known risks ⚠️
- **70-79**: Moderate issues, requires fixes before production ⚠️
- **< 70**: Critical issues, cannot ship ❌

---

### Go/No-Go Decision Matrix

**GO** if:
- ✅ Accessibility score ≥ 90%
- ✅ Functionality score = 100%
- ✅ No critical bugs open
- ✅ Performance targets met
- ✅ Senior reviewer approval

**NO-GO** if:
- ❌ Any accessibility violations
- ❌ Any functional test failures
- ❌ Critical bugs open
- ❌ Performance significantly below targets

---

## Test Execution Log Template

```markdown
# Test Execution Log - GTSD iOS

**Date**: YYYY-MM-DD
**Tester**: [Name]
**Build**: v1.0.0 (build 123)
**Device**: iPhone 15, iOS 18.0
**Environment**: Staging

## Session Summary

**Duration**: X hours
**Tests Executed**: X
**Passed**: X
**Failed**: X
**Blocked**: X
**Pass Rate**: X%

## Test Results

| Test ID | Test Name | Status | Notes |
|---------|-----------|--------|-------|
| ACC-001-01 | Plan Summary VoiceOver | ❓ | |
| ACC-001-02 | Profile Edit VoiceOver | ❓ | |
| ... | ... | ... | ... |

## Issues Found

### Issue #1: [Title]
- **Severity**: Critical/High/Medium/Low
- **Test Case**: ACC-XXX-XX
- **Steps to Reproduce**:
  1. ...
  2. ...
- **Expected**: ...
- **Actual**: ...
- **Screenshot**: [attach]
- **Log**: [attach]

## Overall Assessment

**Recommendation**: GO / NO-GO
**Confidence**: High / Medium / Low
**Next Steps**: ...
```

---

## Appendix A: Quick Reference

### Key Files to Test

- `/GTSD/Features/Plans/PlanSummaryView.swift` - Plan screen
- `/GTSD/Features/Profile/ProfileEditView.swift` - Profile edit
- `/GTSD/Features/Home/ProfileZeroStateCard.swift` - Zero state card
- `/GTSD/Features/Onboarding/MetricsSummaryView.swift` - Metrics summary
- `/GTSD/Features/Home/HomeViewModel.swift` - Zero state detection logic

### Key Endpoints

- `PUT /v1/auth/profile/health` - Update weight
- `POST /v1/science/generate-plan` - Recompute plan
- `GET /v1/auth/me` - Get user profile

### Tools Required

- Xcode 15+
- Xcode Instruments (Time Profiler, Allocations)
- Xcode Accessibility Inspector
- iOS Simulator (iPhone 15 or later)
- Physical iOS device (for final validation)
- cURL or Postman (for API testing)
- Backend API running (localhost or staging)

---

## Appendix B: Known Issues & Workarounds

### Issue 1: Xcode Build Configuration
**Problem**: Multiple commands produce Info.plist
**Workaround**: Remove Info.plist from "Copy Bundle Resources" in Xcode project
**Status**: Needs fix before testing

### Issue 2: Simulator Limitations
**Problem**: Some features (haptics, notifications) don't work in simulator
**Workaround**: Test on physical device for final validation
**Status**: Known limitation

---

**Document Version**: 1.0
**Last Updated**: October 28, 2025
**Next Review**: After Phase 1 test execution
