# GTSD iOS App - Accessibility Testing Guide

## Overview

This guide provides comprehensive instructions for testing accessibility compliance in the GTSD iOS app. All features have been implemented following WCAG 2.1 AA guidelines and Apple's Human Interface Guidelines for accessibility.

---

## Table of Contents

1. [VoiceOver Testing](#voiceover-testing)
2. [Dynamic Type Testing](#dynamic-type-testing)
3. [Touch Target Verification](#touch-target-verification)
4. [Color Contrast Testing](#color-contrast-testing)
5. [Accessibility Inspector](#accessibility-inspector)
6. [Automated Testing](#automated-testing)
7. [Common Issues Checklist](#common-issues-checklist)

---

## VoiceOver Testing

### Enable VoiceOver

**Simulator:**
1. Open Simulator
2. Go to Settings > Accessibility > VoiceOver
3. Toggle VoiceOver ON
4. Or use shortcut: Settings > Accessibility > Accessibility Shortcut > VoiceOver

**Physical Device:**
1. Settings > Accessibility > VoiceOver > Toggle ON
2. Triple-click side button to enable/disable (after setting shortcut)

### VoiceOver Gestures

- **Swipe Right**: Move to next element
- **Swipe Left**: Move to previous element
- **Double Tap**: Activate element
- **Two-finger tap**: Pause/resume speaking
- **Three-finger swipe up**: Scroll up
- **Three-finger swipe down**: Scroll down
- **Rotor**: Two-finger rotation to change navigation mode

### Testing Checklist

#### Plan Summary View (`PlanSummaryView.swift`)

- [ ] Navigate through all sections with VoiceOver
- [ ] Verify refresh button announces "Refresh plan"
- [ ] Confirm metric rows announce both label and value (e.g., "BMI: 24.5")
- [ ] Test target rows announce "Daily [metric] target: [value]"
- [ ] Verify "Learn More" buttons announce correct expand/collapse state
- [ ] Test recalculate button announces full action
- [ ] Confirm decorative icons are hidden from VoiceOver
- [ ] Verify recomputation banner reads as single element

**Expected Announcements:**

```
"Refresh plan, button. Double tap to reload your nutrition plan from the server"
"BMI: 24.5, Healthy weight"
"Daily calories target: 1700 calories"
"Learn more about Calorie Target, button"
"Recalculate nutrition plan, button"
```

#### Plan Changes View (`PlanChangeSummaryView.swift`)

- [ ] Success icon is hidden from VoiceOver (decorative only)
- [ ] Title "Plan Updated!" is read
- [ ] All target changes announce before and after values
- [ ] "View Full Plan" button has clear label and hint
- [ ] "Done" button has 44pt minimum touch target

**Expected Announcements:**

```
"Plan Updated!"
"Calories: 1700 cal, decreased by 100 from 1800"
"View full nutrition plan, button. Double tap to see detailed breakdown"
"Done, button. Double tap to dismiss this screen"
```

#### Plan Widget (`PlanWidgetView.swift`)

- [ ] Entire widget announces as tappable element
- [ ] Target pills combine to single announcement per metric
- [ ] Hint explains tapping shows full plan

**Expected Announcements:**

```
"Today's nutrition targets, button. Tap to view full plan details"
"Calories: 1700 cal"
"Protein: 140 g"
"Water: 2500 ml"
```

#### Profile Edit View (`ProfileEditView.swift`)

- [ ] Photo picker button has clear label
- [ ] Text fields announce their purpose
- [ ] Validation errors are announced
- [ ] Save/Cancel buttons have contextual hints
- [ ] Disabled state is announced

**Expected Announcements:**

```
"Change profile photo, button. Double tap to select new photo"
"Full name, text field. Enter your full name"
"Email validation error: Please enter a valid email"
"Save profile changes, button disabled. Complete all required fields to save"
```

#### Home View (`HomeView.swift`)

- [ ] Stats cards announce title and value
- [ ] Profile button in toolbar accessible
- [ ] All navigation links have clear labels

**Expected Announcements:**

```
"Total Tasks: 12"
"Completed: 8"
"Profile, button. Double tap to view your profile and settings"
```

---

## Dynamic Type Testing

### Enable Dynamic Type

**Simulator:**
1. Settings > Accessibility > Display & Text Size > Larger Text
2. Drag slider to desired size (test at all sizes)

**Physical Device:**
1. Settings > Display & Brightness > Text Size
2. Or Settings > Accessibility > Display & Text Size > Larger Text

### Text Sizes to Test

1. **XS** (Extra Small) - Smallest
2. **S** (Small)
3. **M** (Medium) - Default
4. **L** (Large)
5. **XL** (Extra Large)
6. **XXL** (Extra Extra Large)
7. **XXXL** (Extra Extra Extra Large)
8. **AX1** (Accessibility 1) - Largest accessibility size
9. **AX2** (Accessibility 2)
10. **AX3** (Accessibility 3)
11. **AX4** (Accessibility 4)
12. **AX5** (Accessibility 5) - Largest

### Testing Checklist

For each view, test at **XXXL** and **AX5** sizes:

- [ ] All text is readable (no truncation)
- [ ] Buttons maintain minimum 44pt touch targets
- [ ] Cards don't overlap or clip content
- [ ] ScrollViews allow access to all content
- [ ] Numbers in AnimatedNumber components scale properly
- [ ] Multi-line text wraps correctly
- [ ] Icons scale appropriately

### Expected Behavior

All text should:
- Scale proportionally with system setting
- Never truncate critical information
- Wrap to multiple lines if needed
- Maintain readability at largest sizes

Buttons should:
- Expand vertically to accommodate larger text
- Maintain minimum 44x44pt touch target
- Never clip text content

---

## Touch Target Verification

### Minimum Requirements

All interactive elements must meet these minimums:
- **Width**: 44 points
- **Height**: 44 points
- **Spacing**: 8 points between adjacent targets

### Testing Method

**Accessibility Inspector:**
1. Open Xcode
2. Xcode > Open Developer Tool > Accessibility Inspector
3. Select your running app/simulator
4. Click "Audit" tab
5. Run audit to find undersized touch targets

**Manual Testing:**
1. Enable "Button Shapes" in Settings > Accessibility > Display & Text Size
2. Verify all buttons have visible tap areas
3. Test tapping at edges of buttons
4. Verify no accidental taps on adjacent elements

### Components with Guaranteed 44pt Targets

All these components use `.minimumTouchTarget()` modifier:

- `GTSDButton` (all styles)
- Navigation bar buttons (toolbar items)
- "Change Photo" button in ProfileEditView
- "Learn More" buttons in PlanSummaryView
- "Done" button in PlanChangeSummaryView
- All tab bar items (system-provided)

### Manual Verification Points

Test these specific elements:

- [ ] Refresh icon in PlanSummaryView navigation bar
- [ ] Profile icon in HomeView navigation bar
- [ ] All GTSDButton instances
- [ ] PhotoPicker button
- [ ] Expandable "Learn More" buttons
- [ ] Tab bar items at bottom

---

## Color Contrast Testing

### Requirements (WCAG 2.1 AA)

- **Normal text**: Minimum 4.5:1 contrast ratio
- **Large text** (18pt+): Minimum 3:1 contrast ratio
- **UI components**: Minimum 3:1 contrast ratio

### Testing Method

**Accessibility Inspector:**
1. Open Accessibility Inspector
2. Click "Color Contrast" calculator
3. Test foreground and background combinations

**Manual Color Combinations:**

Test these combinations meet requirements:

```swift
// Primary text on backgrounds
.textPrimary on .backgroundPrimary  // Should be ~21:1 (System provides)
.textPrimary on .backgroundSecondary  // Should be ~15:1
.textSecondary on .backgroundPrimary  // Should be ~7:1

// Colored elements
.primaryColor on .white  // Should be 4.5:1+
.errorColor on .white  // Should be 4.5:1+
.successColor on .white  // Should be 4.5:1+
.warningColor on .white  // Should be 4.5:1+
```

### High Contrast Mode

Test with increased contrast enabled:
1. Settings > Accessibility > Display & Text Size
2. Enable "Increase Contrast"
3. Verify all UI elements remain visible
4. Check that borders/separators are more prominent

---

## Accessibility Inspector

### Setup

1. Open Xcode
2. Run your app in Simulator or on device
3. Xcode > Open Developer Tool > Accessibility Inspector
4. Select your app from the target dropdown

### Inspection Mode

Click the crosshair icon to enable inspection:
- Hover over any UI element
- View accessibility properties:
  - Label
  - Value
  - Hint
  - Traits
  - Frame
  - Actions
  - Element hierarchy

### Audit Feature

1. Click "Audit" tab
2. Click "Run Audit"
3. Review findings:
   - Missing labels
   - Insufficient contrast
   - Small touch targets
   - Missing hints
   - Clipped text

**Expected Results:**
- 0 critical issues
- 0 warnings for implemented screens
- All elements have appropriate labels

### Common Issues to Check

- [ ] Elements without accessibility labels
- [ ] Decorative images not marked as hidden
- [ ] Interactive elements without hints
- [ ] Touch targets < 44x44 points
- [ ] Text with low contrast
- [ ] Dynamic Type not supported

---

## Automated Testing

### XCTest UI Tests

Create UI tests for accessibility:

```swift
func testPlanSummaryAccessibility() throws {
    let app = XCUIApplication()
    app.launch()

    // Navigate to plan
    app.tabBars.buttons["Plans"].tap()

    // Test refresh button exists and is accessible
    let refreshButton = app.buttons["Refresh plan"]
    XCTAssertTrue(refreshButton.exists)
    XCTAssertTrue(refreshButton.isHittable)

    // Test metric rows have labels
    let bmiLabel = app.staticTexts.matching(NSPredicate(format: "label CONTAINS 'BMI'")).firstMatch
    XCTAssertTrue(bmiLabel.exists)

    // Test recalculate button
    let recalculateButton = app.buttons["Recalculate nutrition plan"]
    XCTAssertTrue(recalculateButton.exists)
    XCTAssertTrue(recalculateButton.isHittable)
}

func testVoiceOverNavigationPlan() throws {
    let app = XCUIApplication()
    app.launch()

    // Enable VoiceOver simulation
    app.tabBars.buttons["Plans"].tap()

    // Verify elements can be focused
    let elements = app.descendants(matching: .any).allElementsBoundByIndex

    for element in elements {
        if element.exists && element.isHittable {
            XCTAssertFalse(element.label.isEmpty, "Element has no accessibility label")
        }
    }
}

func testDynamicTypeSupport() throws {
    // Test with different content sizes
    let sizes: [UIContentSizeCategory] = [
        .extraSmall,
        .medium,
        .extraExtraExtraLarge,
        .accessibilityExtraExtraExtraLarge
    ]

    for size in sizes {
        let app = XCUIApplication()
        app.launchArguments = ["-UIPreferredContentSizeCategory", size.rawValue]
        app.launch()

        // Verify all text is visible
        app.tabBars.buttons["Plans"].tap()

        let recalculateButton = app.buttons["Recalculate nutrition plan"]
        XCTAssertTrue(recalculateButton.exists)
        XCTAssertTrue(recalculateButton.isHittable)
    }
}
```

### Running Tests

```bash
# Run all UI tests
xcodebuild test \
  -project GTSD.xcodeproj \
  -scheme GTSD \
  -destination 'platform=iOS Simulator,name=iPhone 15 Pro' \
  -only-testing:GTSDUITests/AccessibilityTests

# Run with VoiceOver enabled
xcodebuild test \
  -project GTSD.xcodeproj \
  -scheme GTSD \
  -destination 'platform=iOS Simulator,name=iPhone 15 Pro' \
  -only-testing:GTSDUITests/VoiceOverTests
```

---

## Common Issues Checklist

### Before Submitting to App Store

- [ ] All buttons have accessibility labels
- [ ] All images have labels or are marked `accessibilityHidden`
- [ ] All form inputs have labels and hints
- [ ] All data displays have value announcements
- [ ] Touch targets meet 44x44pt minimum
- [ ] VoiceOver navigation is logical (top to bottom, left to right)
- [ ] Dynamic Type tested at XXXL and AX5
- [ ] Color contrast meets WCAG 2.1 AA (4.5:1 for text)
- [ ] Reduced motion respected for animations
- [ ] Dark mode support verified
- [ ] Landscape orientation tested (if supported)
- [ ] iPad layout tested (if supported)

### Testing Tools Summary

| Tool | Purpose | When to Use |
|------|---------|-------------|
| VoiceOver | Screen reader testing | Every build before release |
| Accessibility Inspector | Audit and inspection | During development |
| Dynamic Type | Text scaling | After UI changes |
| Color Contrast Calculator | Verify WCAG compliance | When adding colors |
| UI Tests | Automated validation | CI/CD pipeline |

---

## Accessibility Features Implemented

### Global Features

✅ **AccessibilityHelpers.swift**
- Centralized accessibility utilities
- Environment monitoring (VoiceOver, Bold Text, etc.)
- Reusable modifiers for labels, hints, and traits
- Dynamic Type support helpers
- VoiceOver announcements
- High contrast color support

✅ **All Buttons (GTSDButton)**
- Automatic accessibility labels
- State announcements (loading, disabled)
- 44pt minimum touch targets
- Clear button traits

✅ **Navigation Elements**
- Tab bar labels
- Toolbar button labels and hints
- Back button support (system-provided)

### View-Specific Features

✅ **PlanSummaryView**
- Metric row accessibility (BMI, BMR, TDEE)
- Target row accessibility (Calories, Protein, Water)
- Refresh button with hint
- Recalculate button with hint
- Expandable sections with state announcements
- Decorative icons hidden

✅ **PlanChangeSummaryView**
- Animated target cards with change announcements
- Action buttons with clear hints
- Success icon marked decorative

✅ **PlanWidgetView**
- Combined target announcements
- Tappable widget with hint
- Error and loading states accessible

✅ **ProfileEditView**
- Form field labels and hints
- Validation error announcements
- Photo picker accessibility
- Save/Cancel button states

✅ **HomeView**
- Stats card announcements
- Profile button accessibility
- Task navigation

✅ **Components**
- StatCard with combined announcements
- AnimatedNumber with value changes
- GTSDCard grouping

---

## Testing Schedule

### During Development
- Run Accessibility Inspector after each feature
- Test with VoiceOver weekly
- Verify touch targets on new buttons

### Before PR/Merge
- Full VoiceOver navigation test
- Dynamic Type at XXXL
- Accessibility Inspector audit (0 issues)

### Before Release
- Complete accessibility audit
- Test on physical device with VoiceOver
- Test all Dynamic Type sizes
- Verify color contrast
- Test with high contrast mode
- Test with reduced motion
- Test with bold text enabled

---

## Resources

### Apple Documentation
- [Accessibility Programming Guide](https://developer.apple.com/library/archive/documentation/UserExperience/Conceptual/iPhoneAccessibility/)
- [Human Interface Guidelines - Accessibility](https://developer.apple.com/design/human-interface-guidelines/accessibility)
- [WWDC Accessibility Videos](https://developer.apple.com/videos/frameworks/accessibility)

### WCAG Guidelines
- [WCAG 2.1 Quick Reference](https://www.w3.org/WAI/WCAG21/quickref/)
- [WebAIM Contrast Checker](https://webaim.org/resources/contrastchecker/)

### Testing Tools
- Xcode Accessibility Inspector
- VoiceOver (iOS built-in)
- Color Contrast Analyzer
- Accessibility Scanner

---

## Contact

For accessibility questions or issues:
- Review `AccessibilityHelpers.swift` for utilities
- Check this guide for testing procedures
- Reference WCAG 2.1 AA standards
