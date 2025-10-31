# Profile Edit & Sync UX Design - Quick Reference

**Full Specification:** `/apps/GTSD/PROFILE_EDIT_SYNC_UX_DESIGN.md`

---

## Document Overview

This is a comprehensive UX design specification covering every aspect of the Profile Edit & Sync feature, from field-level interactions to error handling and accessibility.

**Total Pages:** 140+ sections
**Implementation Time:** 6-7 weeks
**Audience:** iOS developers, designers, QA engineers, product managers

---

## Key Highlights

### 1. Section Organization (7 Sections)

The profile is organized into 7 logical sections following user mental models:

1. **About You** - Demographics (age, gender, height)
2. **Current Status** - Current weight tracking
3. **Your Goal** - Goal, target weight, target date
4. **Activity & Lifestyle** - Activity level
5. **Diet & Preferences** - Dietary preferences, allergies, meals per day
6. **Current Targets** - Read-only calculated values (BMR, TDEE, calories, protein, water)
7. **Save Changes** - Primary action button

**Design Principle:** Group related fields, show complexity only when needed, put frequently changed fields first.

---

### 2. Field Specifications (11 Editable Fields)

Every field has detailed specifications including:

- Input type (picker, stepper, text input, date picker)
- Validation rules and error messages
- Helper text explaining purpose
- Accessibility labels and hints
- Conditional logic (warnings, confirmations)

**Most Frequently Updated:**

- Current Weight (weekly)
- Dietary Preferences (as needed)
- Meals Per Day (occasional)

**Rarely Updated:**

- Date of Birth (almost never)
- Gender (almost never)
- Height (adults: never)

---

### 3. Helper Text Strategy

Every field includes helper text that:

- Explains what the field is for
- Provides context on how it's used
- Gives examples or tips
- Mentions plan impact if relevant

**Example:**

```
Current Weight
Helper: "Weigh yourself in the morning before eating for the most
accurate measurement. This is your starting point for tracking progress."
```

**Extended Help:** Info icons provide deeper explanations for complex metrics (BMR, TDEE, etc.)

---

### 4. Validation Messages (26 Rules)

All validation messages follow these principles:

- **Specific:** "Height must be between 50-300 cm" (not "Invalid height")
- **Actionable:** "Please enter a date in the future" (tells user how to fix)
- **Positive:** "Please enter a valid email" (not "You failed to...")
- **Contextual:** Shows both metric and imperial units when relevant

**Validation Timing:**

- **On blur:** All required fields, format validation
- **On submit:** Cross-field validation, final checks
- **Real-time:** Character counts approaching limits

---

### 5. Save Flow & Feedback (5 States)

The save button has 5 distinct states with specific animations and haptics:

1. **Idle (No Changes)** - Gray, disabled
2. **Idle (Valid Changes)** - Primary blue, enabled
3. **Saving** - Spinner, "Saving..." text
4. **Success** - Green, checkmark, 2-second display
5. **Error** - Red, "Retry" text

**Success Feedback Variations:**

- Simple update: Toast notification
- Target changes: Modal with before/after comparison
- Dietary preferences: Toast (no plan impact)

---

### 6. Plan Impact Communication

Users are always informed when changes will affect their plan:

**Pre-Save:**

- Section badges: "🔄 Affects your plan"
- Field-level indicators in helper text
- Confirmation modals for high-impact changes (goal change, large weight change)

**Post-Save:**

- Toast for simple updates: "Profile updated! Your plan will adapt tomorrow."
- Modal for target changes: Shows before/after calories, protein, water
- Clear timing: "Changes take effect starting tomorrow at midnight"

**Sections with Plan Impact:**

- About You (BMR calculation)
- Current Status (weight changes >1kg)
- Your Goal (always)
- Activity & Lifestyle (TDEE calculation)

**Sections without Plan Impact:**

- Diet & Preferences (only affects meal suggestions)

---

### 7. Mobile-First Patterns

Optimized for iPhone/iPad with native iOS patterns:

**Keyboard Types:**

- Number Pad: Weight, height
- Decimal Pad: Weight (allows decimals)
- Email: Email field
- Default: Name, tags

**Input Components:**

- **Unit Toggle:** kg/lbs, cm/ft+in (instant conversion)
- **Stepper:** Meals per day (large touch targets, 44×44pt)
- **Segmented Control:** Gender (3 options)
- **Picker Wheel:** Goal, activity level (native iOS picker)
- **Date Picker:** DOB, target date (inline wheel)
- **Tag Input:** Dietary preferences, allergies (with suggestions)

**Keyboard Toolbar:**

- Previous/Next buttons to navigate fields
- Done button to dismiss
- No auto-advance (user controls flow)

---

### 8. Accessibility (WCAG AA)

Comprehensive accessibility support:

**VoiceOver:**

- All fields have labels, values, hints, and traits
- Validation errors announced immediately
- State changes announced (saving, success, error)

**Dynamic Type:**

- Supports all 12 text size categories
- Layout adapts at accessibility sizes (vertical stacking)
- Minimum button height: 60pt at largest sizes

**Color Contrast:**

- All text meets WCAG AA (4.5:1 for normal, 3:1 for large)
- Error states use color + icon + text (not color alone)
- Success states use color + icon + text

**Touch Targets:**

- Minimum: 44×44pt (Apple guideline)
- GTSD standard: 48×48pt
- Stepper buttons: 52×52pt

---

### 9. Edge Cases & Error Handling (10 Scenarios)

Comprehensive handling for all edge cases:

1. **Unsaved Changes** - Confirmation dialog on navigation
2. **Large Weight Change (>10kg)** - Verification modal
3. **Unrealistic Timeline** - Warning with recommended date
4. **Network Timeout (>5s)** - Progress indicator, retry logic
5. **Offline Mode** - Save locally, sync on reconnect
6. **No Changes Made** - Save button disabled
7. **API Rate Limit** - Countdown timer, clear messaging
8. **Server Error** - Retry with exponential backoff
9. **Multiple Validation Errors** - Scroll to first, highlight all
10. **Extreme Values** - Verification for unusual heights/weights

---

### 10. Animations & Haptics

Delightful microinteractions throughout:

**Animations:**

- Field focus: Border color transition (150ms)
- Field blur (valid): Checkmark scale-in with bounce (300ms)
- Field blur (invalid): Shake animation (300ms, 3× oscillation)
- Button press: Scale down/up (100ms + 150ms)
- Toast entrance: Slide down + fade (350ms, spring)
- Modal entrance: Backdrop fade + sheet slide (300-350ms)

**Haptics:**

- Field focus: Light impact
- Toggle/stepper: Selection
- Button press: Light impact
- Validation success: Success notification
- Validation error: Error notification
- Save success: Medium impact
- Save error: Heavy impact

**Timing Guidelines:**

- Micro-interactions: 150-250ms
- Transitions: 300-400ms
- Never exceed 500ms

---

## Implementation Roadmap

### Week 1: Foundation

- Data layer (ViewModel, API client)
- UI components (section container, field wrapper, error message, toggle, tags, stepper)

### Week 2: Form Implementation

- Build all 6 form sections
- Implement field inputs and pickers
- Add validation logic

### Week 3: Save Flow

- Save button state machine
- API integration (3 endpoints)
- Success/error feedback

### Week 4: Edge Cases

- All confirmation dialogs
- Warning modals
- Error handling scenarios

### Week 5: Polish

- All animations
- Haptic feedback
- Accessibility features

### Week 6: Testing

- Unit tests
- Integration tests
- UI tests
- Manual testing (VoiceOver, Dynamic Type, offline)

### Week 7: Launch

- Beta testing
- Monitoring
- Iteration
- GA release

---

## Key Design Decisions

### 1. Why Inline Pickers vs. Navigation?

**Decision:** Use inline pickers (expand in place) for Goal and Activity Level
**Rationale:** Reduces navigation, keeps context, faster interaction
**Trade-off:** Takes more vertical space, but acceptable for mobile-first

### 2. Why Read-Only Health Metrics in Current Implementation?

**Note:** The PRD specifies health metrics SHOULD be editable, but current implementation shows them as read-only. The UX spec assumes they will be made editable per PRD requirements.
**Implementation:** Follow PRD - make weight, height, goals, and activity level fully editable with appropriate validations and confirmations.

### 3. Why Sticky Save Button?

**Decision:** Save button sticks to bottom of screen during scroll
**Rationale:** Always accessible, reduces scrolling back to top
**Alternative considered:** Only in section 7 (rejected - too much scrolling)

### 4. Why Separate Endpoints for Health/Goals/Preferences?

**Decision:** Follow API design with 3 separate PUT endpoints
**Rationale:** Different update frequencies, different plan impact, better error handling
**Benefit:** Can retry one category without re-sending all data

### 5. Why Tag Input for Dietary Preferences?

**Decision:** Use tag input with autocomplete vs. checkboxes
**Rationale:** More flexible (can add custom), less vertical space, modern UX
**Trade-off:** Slightly harder to discover options (mitigated by suggestions)

---

## Critical User Flows

### Flow 1: Weekly Weight Update

1. Open profile
2. Tap Current Weight field
3. Enter new weight (e.g., 82.5 kg)
4. Tap Save Changes
5. See success toast: "Weight updated to 82.5 kg"
6. If >1kg change: See modal with updated targets
7. Return to home

**Expected Time:** <30 seconds

---

### Flow 2: Goal Change (High Impact)

1. Open profile
2. Tap Primary Goal picker
3. Select new goal (e.g., "Lose Weight")
4. Confirmation modal appears
5. Review impact (calories, protein)
6. Tap "Change Goal"
7. Tap Save Changes
8. See modal with before/after targets
9. Tap "Got It"
10. Return to home

**Expected Time:** 45-60 seconds

---

### Flow 3: Add Dietary Preference

1. Open profile
2. Scroll to Diet & Preferences
3. Tap "+" button in Dietary Preferences
4. Type or select from suggestions (e.g., "Vegetarian")
5. Tap Save Changes
6. See toast: "Preferences updated. Changes apply tomorrow."
7. Return to home

**Expected Time:** 20-30 seconds

---

### Flow 4: Error Recovery (Network Issue)

1. Open profile
2. Make changes
3. Tap Save Changes
4. Network timeout (>5s)
5. See "This is taking longer than usual..."
6. After 10s, see error dialog
7. Tap "Retry Now"
8. Success or dismiss
9. Return to home

**Expected Time:** 15-30 seconds (depending on network)

---

## Copy Templates

### Success Messages

**Simple Update:**

```
✓ Profile updated successfully
```

**With Plan Impact:**

```
✓ Profile updated!
Your plan will adapt tomorrow morning.
```

**Weight Update:**

```
✓ Weight updated to [X] kg
Great job! Your new weight has been recorded and your plan will adjust accordingly.
```

**Goal Change:**

```
✓ Goal updated to "[Goal Name]"
Your daily targets have been recalculated to support your new goal. Check your updated plan tomorrow!
```

**Dietary Preferences:**

```
✓ Dietary preferences updated
Your new preferences will appear in tomorrow's meal suggestions.
```

---

### Error Messages

**Network Error:**

```
⚠️ Unable to save changes
Please check your connection and try again.
```

**Validation Error:**

```
⚠️ Please fix the errors below
[Scroll to first error]
```

**Server Error:**

```
⚠️ Something went wrong
Our servers are having issues. Please try again in a moment.
```

**Rate Limited:**

```
⚠️ Too many updates
You've updated your profile recently. Please wait a moment before making more changes.
Try again in: [countdown]
```

---

### Warning Messages

**Large Weight Change:**

```
⚠️ Large Weight Change Detected
You're changing your weight by [X] kg. This is a significant change.
Please verify this is correct.
```

**Unrealistic Timeline:**

```
⚠️ Unrealistic Timeline
To [lose/gain] [X] kg by [date] requires [Y] kg per week, which exceeds safe limits.
Recommended target date: [calculated date]
```

**Unsaved Changes:**

```
Discard Changes?
You have unsaved changes to your profile. If you leave now, your changes will be lost.
```

---

## Visual Design Tokens

### Colors

```swift
// Primary
Color.primaryColor = Color(hex: "#007AFF")
Color.successColor = Color(hex: "#34C759")
Color.errorColor = Color(hex: "#FF3B30")
Color.warningColor = Color(hex: "#FF9500")

// Text
Color.textPrimary = Color(hex: "#1C1C1E")
Color.textSecondary = Color(hex: "#636366")

// Background
Color.background = Color.white
Color.cardBackground = Color(hex: "#F2F2F7")
Color.borderGray = Color(hex: "#C7C7CC")
```

### Typography

```swift
Font.largeTitle = .system(size: 34, weight: .regular)
Font.title1 = .system(size: 28, weight: .regular)
Font.title2 = .system(size: 22, weight: .regular)
Font.title3 = .system(size: 20, weight: .semibold)
Font.body = .system(size: 17, weight: .regular)
Font.callout = .system(size: 16, weight: .regular)
Font.subhead = .system(size: 15, weight: .regular)
Font.footnote = .system(size: 13, weight: .regular)
Font.caption1 = .system(size: 12, weight: .regular)
```

### Spacing

```swift
enum Spacing {
    static let xs: CGFloat = 4
    static let sm: CGFloat = 8
    static let md: CGFloat = 16
    static let lg: CGFloat = 24
    static let xl: CGFloat = 32
    static let xxl: CGFloat = 48
}
```

### Animation

```swift
enum AnimationDuration {
    static let micro: TimeInterval = 0.15
    static let standard: TimeInterval = 0.3
    static let emphasis: TimeInterval = 0.4
    static let slow: TimeInterval = 0.5
}
```

---

## Testing Checklist

### Unit Tests

- [ ] ViewModel validation logic
- [ ] State management (dirty tracking)
- [ ] API client methods
- [ ] Model encoding/decoding

### Integration Tests

- [ ] Profile load flow
- [ ] Save flow (all 3 endpoints)
- [ ] Offline mode
- [ ] Error handling

### UI Tests

- [ ] Form navigation
- [ ] Field validation
- [ ] Modal interactions
- [ ] Toast dismissal

### Accessibility Tests

- [ ] VoiceOver walkthrough (all fields)
- [ ] Dynamic Type at all sizes
- [ ] Touch target sizing
- [ ] Color contrast audit
- [ ] Keyboard navigation (iPad)

### Manual Tests

- [ ] All warning dialogs
- [ ] All error scenarios
- [ ] Offline/online transitions
- [ ] Cross-device sync
- [ ] Performance (no lag)

---

## API Reference

### GET /v1/auth/profile

Returns complete user profile with all sections

**Response:**

```json
{
  "success": true,
  "profile": {
    "demographics": { ... },
    "health": { ... },
    "goals": { ... },
    "preferences": { ... },
    "targets": { ... }
  }
}
```

### PUT /v1/auth/profile/health

Updates health metrics (weight, height, DOB)

**Request:**

```json
{
  "currentWeight": 82.5,
  "targetWeight": 75.0,
  "height": 175.0,
  "dateOfBirth": "1990-08-15T00:00:00.000Z"
}
```

**Response includes plan updates if regenerated:**

```json
{
  "success": true,
  "planUpdated": true,
  "targets": { ... },
  "changes": {
    "previousCalories": 1850,
    "newCalories": 1700
  }
}
```

### PUT /v1/auth/profile/goals

Updates goals and timeline

**Request:**

```json
{
  "primaryGoal": "lose_weight",
  "targetWeight": 75.0,
  "targetDate": "2026-06-01T00:00:00.000Z",
  "activityLevel": "moderately_active"
}
```

### PUT /v1/auth/profile/preferences

Updates dietary preferences (does NOT trigger plan regeneration)

**Request:**

```json
{
  "dietaryPreferences": ["vegetarian", "gluten_free"],
  "allergies": ["peanuts"],
  "mealsPerDay": 3
}
```

**Response:**

```json
{
  "success": true,
  "message": "Preferences updated successfully"
}
```

---

## Frequently Asked Questions

### Q: Why are health metrics read-only in the current implementation?

A: The current implementation shows them as read-only, but the PRD specifies they should be editable. This UX spec assumes they will be made editable per PRD requirements. The editable version is fully specified in the main document.

### Q: What happens if the user's target date has already passed?

A: The PRD recommends showing a banner: "Target date passed. Please update your goal." This UX spec includes handling for this in the unrealistic timeline warning (adapted to show past dates).

### Q: Do dietary preference changes trigger plan regeneration?

A: No. Dietary preferences only affect meal suggestions, not calorie/macro targets. The PRD is clear about this, and the UX communicates it through the absence of the "Affects your plan" badge.

### Q: How long should success/error toasts display?

A:

- Success toasts: 3 seconds (auto-dismiss)
- Error toasts: 5 seconds or until user dismisses
- Modals: User must explicitly dismiss (no auto-dismiss)

### Q: What if the user makes changes offline?

A: Changes are saved locally and queued for sync. When connection is restored, changes sync automatically. If there's a conflict (server data is newer), the user chooses which version to keep.

### Q: How do we handle race conditions with the daily job?

A: The PRD recommends using `updated_at` timestamp for conflict detection (last-write-wins). The UX spec assumes this is implemented on the backend.

---

## Next Steps

1. **Review this summary** with the team
2. **Read the full spec** (`PROFILE_EDIT_SYNC_UX_DESIGN.md`) for implementation details
3. **Set up development environment** and dependencies
4. **Begin Phase 1** (Foundation) following the implementation checklist
5. **Schedule design review** after each phase
6. **Test incrementally** (don't wait until the end)

---

## Contact

For questions or clarifications:

- **UX Design Team:** [Contact info]
- **Product Manager:** [Contact info]
- **iOS Lead:** [Contact info]

**Full Specification:** `/apps/GTSD/PROFILE_EDIT_SYNC_UX_DESIGN.md`
**PRD Reference:** `/PRD_PROFILE_EDIT_SYNC.md`
