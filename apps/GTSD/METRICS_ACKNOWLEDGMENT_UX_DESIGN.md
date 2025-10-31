# Metrics Acknowledgment UX Design Specification

## Executive Summary

This document provides a comprehensive UX design for guiding users to acknowledge their health metrics (BMI, BMR, TDEE) after completing onboarding in the GTSD iOS app. The design ensures a seamless, intuitive flow that encourages user engagement while respecting their attention and avoiding intrusive patterns.

## Current Implementation Analysis

### What Exists
1. **PlanSummaryView**: Shows metrics acknowledgment screen when `needsAcknowledgment = true`
2. **MetricsViewModel**: Handles checking and acknowledging metrics
3. **HomeView**: Dashboard with zero-state card for incomplete profiles
4. **User Flow**: Onboarding → Dashboard → (missing link) → Plans → Acknowledge → Plan Generated

### The Problem
The current implementation has a **critical UX gap**:
- Users complete onboarding and return to the dashboard
- The dashboard shows standard content (tasks, streaks, stats)
- There's **no clear guidance** to navigate to the Plans tab to acknowledge metrics
- Users who navigate to Plans see the acknowledgment screen (this part works)
- But users might not know they need to go there

## Design Principles

1. **Progressive Disclosure**: Guide users step-by-step without overwhelming
2. **Clear Value Proposition**: Explain why acknowledgment matters
3. **Non-Blocking**: Don't prevent access to other features
4. **Contextual**: Show the prompt in the right place at the right time
5. **Respectful**: Allow dismissal but with clear consequences
6. **Mobile-First**: Optimize for thumb-friendly interactions

## Recommended Solution: Hybrid Approach

### Strategy: "Action Card + Empty State"

Combine two UX patterns for maximum effectiveness:

1. **Dashboard Action Card** (Primary): Prominent, actionable card on the Home screen
2. **Plans Empty State** (Secondary): Educational screen when accessing Plans directly

This hybrid approach ensures users are guided from wherever they start.

---

## Detailed Design Specification

### 1. Dashboard Action Card (Home Screen)

#### Visual Design

```
┌─────────────────────────────────────────┐
│  🎯 (Heart icon)                        │
│                                         │
│  Your Health Plan is Ready to Generate │
│                                         │
│  We've calculated your personalized    │
│  health metrics based on your profile. │
│  Review and confirm them to unlock     │
│  your custom nutrition plan.           │
│                                         │
│  ✓ BMI: Body Mass Index                │
│  ✓ BMR: Calories burned at rest        │
│  ✓ TDEE: Total daily energy            │
│                                         │
│  ┌───────────────────────────────────┐ │
│  │   Review My Metrics               │ │ (Primary button)
│  └───────────────────────────────────┘ │
│                                         │
│  Not now                                │ (Text link)
└─────────────────────────────────────────┘
```

#### Placement
- **Position**: Top of Home screen, **above** the welcome message and stats
- **Priority**: Higher than ProfileZeroStateCard (only shows after onboarding is complete)
- **Visibility**: Full-width card with elevation (shadow)

#### Copy Specification

**Headline** (Title Medium, Bold)
```
"Your Health Plan is Ready to Generate"
```

**Body** (Body Medium, Secondary Color)
```
"We've calculated your personalized health metrics based on your profile. Review and confirm them to unlock your custom nutrition plan."
```

**Checklist Items** (Body Small, Secondary Color)
```
✓ BMI: Body Mass Index
✓ BMR: Calories burned at rest
✓ TDEE: Total daily energy
```

**Primary CTA** (Primary Button)
```
"Review My Metrics"
```

**Secondary Action** (Text Link, Tertiary Color)
```
"Not now"
```

#### Interaction Patterns

**On "Review My Metrics" Tap:**
- Navigate to Plans tab
- Plans tab shows MetricsAcknowledgmentView
- Smooth push animation
- Optional: Add haptic feedback (light impact)

**On "Not now" Tap:**
- Hide card temporarily (for this session only)
- Show subtle toast: "You can review metrics anytime in the Plans tab"
- Card reappears on next app launch
- Store dismissal state in UserDefaults (session-based)

**Accessibility:**
```swift
.accessibilityLabel("Action required: Review your health metrics")
.accessibilityHint("Your personalized health metrics are ready. Double tap to review and confirm.")
.accessibilityElement(children: .combine)
```

#### Visual Hierarchy
- **Background**: Card with `.primaryColor.opacity(0.05)` tint
- **Border**: 1pt `.primaryColor.opacity(0.2)`
- **Icon**: 48pt heart.text.square.fill, `.primaryColor`
- **Shadow**: Subtle elevation (y: 2, blur: 8, opacity: 0.08)
- **Corner Radius**: 16pt (matches design system)
- **Padding**: 20pt internal padding

---

### 2. Plans Tab Empty State

#### When to Show
This screen displays when:
- User navigates directly to Plans tab
- `needsAcknowledgment == true`
- No prior acknowledgment exists

#### Visual Design

```
┌─────────────────────────────────────────┐
│                                         │
│              🩺 (Large icon)            │
│                                         │
│      Review Your Health Metrics         │
│                                         │
│  Before we create your personalized     │
│  nutrition plan, let's review the       │
│  health metrics we've calculated        │
│  for you.                               │
│                                         │
│  ┌─────────────────────────────────┐   │
│  │ 📏 BMI                          │   │
│  │ 25.3 - Normal Weight            │   │
│  │ Your body mass index indicates  │   │
│  │ a healthy weight range          │   │
│  └─────────────────────────────────┘   │
│                                         │
│  ┌─────────────────────────────────┐   │
│  │ 🔥 BMR                          │   │
│  │ 1,650 cal/day                   │   │
│  │ Calories your body burns at     │   │
│  │ rest for basic functions        │   │
│  └─────────────────────────────────┘   │
│                                         │
│  ┌─────────────────────────────────┐   │
│  │ ⚡ TDEE                          │   │
│  │ 2,310 cal/day                   │   │
│  │ Total daily energy including    │   │
│  │ your activity level             │   │
│  └─────────────────────────────────┘   │
│                                         │
│  These metrics form the foundation      │
│  of your personalized plan              │
│                                         │
│  ┌───────────────────────────────────┐ │
│  │  I Understand, Generate My Plan   │ │ (Primary)
│  └───────────────────────────────────┘ │
└─────────────────────────────────────────┘
```

This already exists and is well-designed. No changes needed.

---

### 3. Post-Acknowledgment Experience

#### Success State
After user taps "I Understand, Generate My Plan":

1. **Immediate Feedback**
   - Show loading state on button: "Generating Plan..."
   - Disable button to prevent double-tap
   - Optional: Skeleton loading for plan content

2. **Transition**
   - Smooth crossfade from acknowledgment view to plan view
   - Duration: 300ms ease-in-out
   - No jarring full-screen replace

3. **Success Confirmation**
   - Brief toast (3 seconds): "Plan generated successfully!"
   - Plan view appears with actual data
   - Scroll to top automatically

4. **Dashboard Update**
   - Action card **immediately disappears** from Home
   - No re-fetch required (state updated in MetricsViewModel)
   - Clean state synchronization

---

## User Flows

### Flow 1: New User (Just Completed Onboarding)

```
Onboarding Complete
    ↓
Dashboard (Home Tab)
    ↓
[Action Card Appears at Top]
"Your Health Plan is Ready to Generate"
    ↓
User taps "Review My Metrics"
    ↓
Navigate to Plans Tab
    ↓
MetricsAcknowledgmentView shows
    ↓
User reviews metrics
    ↓
User taps "I Understand, Generate My Plan"
    ↓
API call: acknowledge metrics
    ↓
API call: generate plan
    ↓
Plan appears
    ↓
[Action Card removed from Home]
    ✓ Flow Complete
```

### Flow 2: User Dismisses Card

```
Dashboard (Home Tab)
    ↓
[Action Card Visible]
    ↓
User taps "Not now"
    ↓
Card hides (with animation)
    ↓
Toast: "You can review metrics anytime..."
    ↓
User continues using app
    ↓
User closes app
    ↓
User reopens app
    ↓
[Action Card reappears]
    ↓
(Cycle continues until acknowledged)
```

### Flow 3: Direct Navigation to Plans

```
User taps Plans tab (before acknowledging)
    ↓
Plans tab becomes active
    ↓
MetricsAcknowledgmentView appears
    ↓
User reviews and acknowledges
    ↓
Plan generates
    ↓
[Action Card removed from Home]
    ✓ Flow Complete
```

---

## Implementation Guidance

### Code Changes Required

#### 1. Create MetricsActionCard Component

**File**: `/GTSD/Features/Home/MetricsActionCard.swift`

```swift
struct MetricsActionCard: View {
    let onReview: () -> Void
    let onDismiss: () -> Void

    var body: some View {
        GTSDCard(padding: Spacing.md) {
            VStack(spacing: Spacing.md) {
                // Icon
                Image(systemName: "heart.text.square.fill")
                    .font(.system(size: 48))
                    .foregroundColor(.primaryColor)
                    .accessibilityHidden(true)

                // Headline
                Text("Your Health Plan is Ready to Generate")
                    .font(.titleMedium)
                    .fontWeight(.semibold)
                    .foregroundColor(.textPrimary)
                    .multilineTextAlignment(.center)

                // Body
                Text("We've calculated your personalized health metrics based on your profile. Review and confirm them to unlock your custom nutrition plan.")
                    .font(.bodyMedium)
                    .foregroundColor(.textSecondary)
                    .multilineTextAlignment(.center)
                    .padding(.horizontal, Spacing.sm)

                // Checklist
                VStack(alignment: .leading, spacing: Spacing.sm) {
                    checklistItem(icon: "checkmark.circle.fill", text: "BMI: Body Mass Index")
                    checklistItem(icon: "checkmark.circle.fill", text: "BMR: Calories burned at rest")
                    checklistItem(icon: "checkmark.circle.fill", text: "TDEE: Total daily energy")
                }
                .padding(.vertical, Spacing.sm)

                // Primary CTA
                GTSDButton("Review My Metrics", style: .primary) {
                    onReview()
                }
                .accessibilityLabel("Review your health metrics")
                .accessibilityHint("Opens the Plans screen to review and confirm your personalized health metrics")

                // Secondary action
                Button(action: onDismiss) {
                    Text("Not now")
                        .font(.bodyMedium)
                        .foregroundColor(.textTertiary)
                }
                .accessibilityLabel("Dismiss metrics review")
                .accessibilityHint("Hide this reminder for now. You can review metrics later in the Plans tab")
            }
        }
        .overlay(
            RoundedRectangle(cornerRadius: 16)
                .stroke(Color.primaryColor.opacity(0.2), lineWidth: 1)
        )
        .background(Color.primaryColor.opacity(0.05))
    }

    private func checklistItem(icon: String, text: String) -> some View {
        HStack(spacing: Spacing.sm) {
            Image(systemName: icon)
                .font(.system(size: IconSize.sm))
                .foregroundColor(.successColor)
                .frame(width: 20)

            Text(text)
                .font(.bodySmall)
                .foregroundColor(.textSecondary)

            Spacer()
        }
    }
}
```

#### 2. Update HomeViewModel

**File**: `/GTSD/Features/Home/HomeViewModel.swift`

Add properties:
```swift
@Published var needsMetricsAcknowledgment = false
@Published var metricsCardDismissed = false

private let metricsViewModel: MetricsViewModel
```

Add method to check metrics status:
```swift
private func checkMetricsStatus() async {
    await metricsViewModel.checkMetricsAcknowledgment()
    needsMetricsAcknowledgment = metricsViewModel.needsAcknowledgment

    // Check if dismissed in this session
    if needsMetricsAcknowledgment {
        metricsCardDismissed = UserDefaults.standard.bool(
            forKey: "gtsd.metricsCardDismissedThisSession"
        )
    }
}

func dismissMetricsCard() {
    metricsCardDismissed = true
    // Store in UserDefaults but session-based
    // Clear on app restart by using a timestamp-based key
    UserDefaults.standard.set(true, forKey: "gtsd.metricsCardDismissedThisSession")
}
```

Update `loadData()`:
```swift
func loadData() async {
    isLoading = true
    errorMessage = nil

    await withTaskGroup(of: Void.self) { group in
        group.addTask { await self.loadTasks() }
        group.addTask { await self.loadStreak() }
        group.addTask { await self.loadSummary() }
        group.addTask { await self.checkMetricsStatus() } // NEW
    }

    isLoading = false
}
```

#### 3. Update HomeView

**File**: `/GTSD/Features/Home/HomeView.swift`

Add state for navigation:
```swift
@State private var navigateToPlans = false
```

Add card in body (before ProfileZeroStateCard):
```swift
// Metrics Acknowledgment Card (if needed)
if viewModel.needsMetricsAcknowledgment && !viewModel.metricsCardDismissed {
    MetricsActionCard(
        onReview: {
            // Navigate to Plans tab
            // If using TabView, switch to Plans tab
            navigateToPlans = true
        },
        onDismiss: {
            viewModel.dismissMetricsCard()
            // Show toast (optional)
        }
    )
}

// Zero State Card (if profile is incomplete)
if viewModel.shouldShowZeroState {
    ProfileZeroStateCard(...)
}
```

Handle navigation (if using TabView with selection binding):
```swift
.onChange(of: navigateToPlans) { _, newValue in
    if newValue {
        // Switch to Plans tab
        // This assumes parent view manages tab selection
        // Implementation depends on tab structure
    }
}
```

#### 4. Update App-Level Tab Management

**Assumption**: App uses TabView for navigation

Create a custom environment value for tab selection:
```swift
// In a shared file or AppEnvironment.swift
struct SelectedTabKey: EnvironmentKey {
    static let defaultValue: Binding<Int> = .constant(0)
}

extension EnvironmentValues {
    var selectedTab: Binding<Int> {
        get { self[SelectedTabKey.self] }
        set { self[SelectedTabKey.self] = newValue }
    }
}
```

Update MetricsActionCard to use environment:
```swift
@Environment(\.selectedTab) var selectedTab

// In onReview:
selectedTab.wrappedValue = 2 // Plans tab index
```

---

## State Management

### States to Track

1. **needsMetricsAcknowledgment** (MetricsViewModel)
   - Source: API check on app launch
   - True if: metrics exist AND not acknowledged
   - False if: acknowledged OR no metrics

2. **metricsCardDismissed** (HomeViewModel)
   - Source: UserDefaults (session-based)
   - True if: user tapped "Not now" in current session
   - Reset: On app relaunch

3. **metricsSummary** (MetricsViewModel)
   - Source: API `/metrics/today`
   - Contains: HealthMetrics + Explanations + Acknowledgment status

### Synchronization Points

1. **On App Launch**
   - Clear session-based dismissal flag
   - Check metrics acknowledgment status
   - Update HomeViewModel state

2. **After Acknowledgment**
   - Update `needsAcknowledgment = false` in MetricsViewModel
   - HomeViewModel automatically hides card (reactive binding)
   - No manual refresh needed

3. **After Onboarding**
   - Backend computes metrics
   - App checks status on next Home screen load
   - Card appears automatically

---

## Visual Design Details

### Color Palette

**Action Card:**
- Background: `Color.primaryColor.opacity(0.05)`
- Border: `Color.primaryColor.opacity(0.2)`
- Icon: `Color.primaryColor` (full opacity)
- Headline: `Color.textPrimary`
- Body: `Color.textSecondary`
- Checklist icons: `Color.successColor`
- Checklist text: `Color.textSecondary`
- Primary button: Standard `.primary` style
- "Not now" link: `Color.textTertiary`

**Shadow:**
```swift
.shadow(
    color: Color.black.opacity(0.08),
    radius: 8,
    x: 0,
    y: 2
)
```

### Typography

Following existing design system:
- **Headline**: `.titleMedium` (20pt, semibold)
- **Body**: `.bodyMedium` (16pt, regular)
- **Checklist**: `.bodySmall` (14pt, regular)
- **Button**: Default button typography
- **Link**: `.bodyMedium` (16pt, regular)

### Spacing

- **Card padding**: 20pt (Spacing.md)
- **Internal spacing**: 16pt between sections (Spacing.md)
- **Icon to headline**: 12pt (Spacing.sm)
- **Checklist item spacing**: 8pt (Spacing.sm)
- **Button top margin**: 16pt (Spacing.md)

### Animations

**Card Appearance:**
```swift
.transition(.asymmetric(
    insertion: .scale.combined(with: .opacity),
    removal: .opacity
))
```

**Card Dismissal:**
```swift
withAnimation(.spring(response: 0.3, dampingFraction: 0.8)) {
    viewModel.dismissMetricsCard()
}
```

**Navigation Transition:**
- Use default SwiftUI navigation transition
- Or custom push animation if using custom navigator

---

## Error Handling

### Scenario 1: Metrics Fetch Fails

**Problem**: API call to check acknowledgment status fails

**Solution**:
- Don't show the action card
- Log error silently
- Retry on next app launch
- User can still access Plans tab directly

**UX**: No error shown to user (graceful degradation)

### Scenario 2: Acknowledgment API Fails

**Problem**: User taps "I Understand" but API call fails

**Solution**:
- Show error alert: "Unable to generate plan. Please try again."
- Keep acknowledgment view visible
- Provide "Retry" button
- Don't mark as acknowledged locally

**UX**: Standard error alert with retry option

### Scenario 3: Plan Generation Fails After Acknowledgment

**Problem**: Metrics acknowledged but plan generation fails

**Solution**:
- Show error state in Plans view
- Provide "Try Again" button
- Don't show dashboard card (metrics already acknowledged)
- User can manually refresh plan

**UX**: Error view with clear explanation and retry

---

## Testing Scenarios

### Manual Test Cases

1. **New User Flow**
   - Complete onboarding
   - Return to Home
   - Verify action card appears at top
   - Tap "Review My Metrics"
   - Verify navigation to Plans
   - Acknowledge metrics
   - Verify card disappears from Home

2. **Dismissal Flow**
   - Show action card
   - Tap "Not now"
   - Verify card disappears with animation
   - Verify toast appears
   - Navigate away and back
   - Verify card stays hidden
   - Close and reopen app
   - Verify card reappears

3. **Direct Navigation**
   - Don't tap card
   - Navigate to Plans directly
   - Verify acknowledgment screen shows
   - Acknowledge metrics
   - Return to Home
   - Verify card is gone

4. **Already Acknowledged**
   - User who already acknowledged
   - Open app
   - Verify no action card
   - Navigate to Plans
   - Verify plan shows (not acknowledgment)

### Edge Cases

1. **Rapid Tab Switching**
   - Switch tabs while card is animating
   - Verify no crashes or state corruption

2. **Network Timeout**
   - Disconnect network
   - Tap acknowledgment
   - Verify error handling

3. **Multiple Sessions**
   - Dismiss card
   - Don't close app
   - Wait extended period
   - Verify card stays dismissed

4. **Onboarding Incomplete**
   - User with incomplete profile
   - Verify ProfileZeroStateCard shows instead
   - Not metrics card

---

## Metrics & Analytics

### Events to Track

1. **Card Impressions**
   - Event: `metrics_acknowledgment_card_viewed`
   - Properties: `user_id`, `session_id`, `timestamp`

2. **Card Interactions**
   - Event: `metrics_acknowledgment_card_tapped`
   - Properties: `user_id`, `action` (review | dismiss), `timestamp`

3. **Dismissals**
   - Event: `metrics_acknowledgment_card_dismissed`
   - Properties: `user_id`, `session_id`, `timestamp`

4. **Acknowledgment Success**
   - Event: `metrics_acknowledged`
   - Properties: `user_id`, `metrics_version`, `timestamp`

5. **Time to Acknowledgment**
   - Track: Time from onboarding complete to acknowledgment
   - Measure: Effectiveness of guidance

### Success Metrics

- **Acknowledgment Rate**: % of users who acknowledge within 24 hours
- **Dismissal Rate**: % who dismiss vs. engage
- **Time to Acknowledge**: Average time from card view to acknowledgment
- **Navigation Method**: Dashboard card vs. direct Plans navigation
- **Error Rate**: Failed acknowledgment attempts

---

## Accessibility

### VoiceOver Support

**Action Card:**
```swift
.accessibilityElement(children: .combine)
.accessibilityLabel("Action required: Review your health metrics")
.accessibilityHint("Your personalized health metrics are ready. They include BMI, BMR, and TDEE. Double tap to review and confirm them.")
.accessibilityAddTraits(.isButton)
```

**Checklist Items:**
```swift
.accessibilityElement(children: .ignore)
.accessibilityLabel("Metrics included: BMI, body mass index; BMR, calories burned at rest; TDEE, total daily energy")
```

**Primary Button:**
```swift
.accessibilityLabel("Review my health metrics")
.accessibilityHint("Opens the Plans screen where you can review and confirm your personalized health metrics to generate your nutrition plan")
```

**Dismiss Button:**
```swift
.accessibilityLabel("Not now")
.accessibilityHint("Dismiss this reminder. You can review metrics later from the Plans tab")
```

### Dynamic Type Support

- All text uses semantic font styles (`.titleMedium`, `.bodyMedium`, etc.)
- Layout adjusts for larger text sizes
- Test at largest accessibility size
- Ensure buttons remain tappable
- Card may expand vertically for larger text

### Color Contrast

- Verify WCAG AA compliance (4.5:1 for body text)
- Test in light and dark modes
- Icon + text combinations meet contrast requirements
- Button states clearly visible

### Motor Accessibility

- Minimum touch target: 44x44 points
- Adequate spacing between interactive elements
- Buttons use `.minimumTouchTarget()` modifier
- Support for Switch Control and Voice Control

---

## Internationalization (i18n)

### Strings to Localize

```swift
// Card headline
"Your Health Plan is Ready to Generate"

// Card body
"We've calculated your personalized health metrics based on your profile. Review and confirm them to unlock your custom nutrition plan."

// Checklist items
"BMI: Body Mass Index"
"BMR: Calories burned at rest"
"TDEE: Total daily energy"

// Buttons
"Review My Metrics"
"Not now"

// Toast
"You can review metrics anytime in the Plans tab"

// Success toast
"Plan generated successfully!"
```

### Localization Considerations

- **Line Length**: Copy may expand in German, contract in Chinese
- **Layout**: Use flexible layouts, not fixed widths
- **Icon Meanings**: Ensure icons are culturally appropriate
- **Date/Time**: Use locale-specific formatting for `computedAt` timestamps

---

## Alternative Approaches Considered

### 1. Modal/Sheet Approach

**Concept**: Show metrics acknowledgment as a modal immediately after onboarding

**Pros:**
- Impossible to miss
- Forces acknowledgment
- Clear, focused experience

**Cons:**
- Disruptive and annoying
- Blocks access to app
- Feels pushy
- Poor UX if user wants to explore first

**Verdict**: ❌ Rejected - Too aggressive

---

### 2. Tab Badge Approach

**Concept**: Show a red notification badge on Plans tab

**Pros:**
- Non-intrusive
- Familiar pattern
- Persistent reminder

**Cons:**
- Easily overlooked
- Doesn't explain what's needed
- No context or value prop
- Relies on user curiosity

**Verdict**: ❌ Rejected - Too passive, no education

---

### 3. Banner Approach (Top of Screen)

**Concept**: Slim banner at top of Home screen

**Pros:**
- Less space than full card
- Always visible
- Non-blocking

**Cons:**
- Easy to ignore
- Not enough space for explanation
- Feels like an error/warning
- Can't show value proposition

**Verdict**: ❌ Rejected - Insufficient context

---

### 4. Onboarding Continuation

**Concept**: Add metrics acknowledgment as final onboarding step

**Pros:**
- Natural flow continuation
- Users expect more steps
- High completion rate

**Cons:**
- Lengthens onboarding
- Metrics may not be computed yet (async)
- Can't generate plan without metrics
- Technical complexity (timing)

**Verdict**: ⚠️ Possible future enhancement, but not primary solution

---

### 5. Persistent Bottom Sheet

**Concept**: Slide-up sheet from bottom with dismissible header

**Pros:**
- Modern iOS pattern
- Partial screen coverage
- Swipe to dismiss

**Cons:**
- Partially obscures content
- Requires manual dismissal
- Feels intrusive
- Difficult to re-discover if dismissed

**Verdict**: ❌ Rejected - Too disruptive

---

## Why the Hybrid Approach Wins

### Dashboard Action Card Benefits

1. **High Visibility**: Impossible to miss at top of Home
2. **Educational**: Space to explain value and what's included
3. **Actionable**: Clear CTA that leads to next step
4. **Respectful**: Dismissible but persistent across sessions
5. **Contextual**: Shows exactly when needed, hides when complete
6. **Familiar**: Similar to ProfileZeroStateCard pattern

### Plans Empty State Benefits

1. **Backstop**: Catches users who navigate directly
2. **Educational**: Full screen to explain each metric
3. **Non-blocking**: Only shows when accessing Plans
4. **Already Built**: Existing implementation works well

### Together They Ensure

- **Discovery**: Users can't miss the prompt
- **Flexibility**: Multiple paths to acknowledgment
- **Education**: Clear explanation of metrics and value
- **Completion**: High likelihood of acknowledgment
- **Respect**: User control and understanding

---

## Implementation Checklist

### Phase 1: Core Implementation
- [ ] Create `MetricsActionCard.swift` component
- [ ] Add `MetricsViewModel` to `HomeViewModel` dependencies
- [ ] Add `needsMetricsAcknowledgment` and `metricsCardDismissed` state
- [ ] Implement `checkMetricsStatus()` in HomeViewModel
- [ ] Implement `dismissMetricsCard()` in HomeViewModel
- [ ] Add card to HomeView layout (before ProfileZeroStateCard)
- [ ] Handle navigation to Plans tab on "Review" tap

### Phase 2: Navigation
- [ ] Set up tab selection environment value (if needed)
- [ ] Test navigation from Home to Plans
- [ ] Verify Plans shows acknowledgment view
- [ ] Test acknowledgment flow end-to-end

### Phase 3: State Management
- [ ] Clear session dismissal flag on app launch
- [ ] Sync acknowledgment state across views
- [ ] Test state updates after acknowledgment
- [ ] Verify card disappears after acknowledgment

### Phase 4: Polish
- [ ] Add card appearance/dismissal animations
- [ ] Add haptic feedback to button taps
- [ ] Add success toast after plan generation
- [ ] Test all animations and transitions

### Phase 5: Accessibility
- [ ] Add VoiceOver labels and hints
- [ ] Test with VoiceOver enabled
- [ ] Test with Dynamic Type at largest size
- [ ] Verify color contrast in light/dark modes
- [ ] Test minimum touch targets

### Phase 6: Testing
- [ ] Test new user flow (onboarding → card → acknowledgment)
- [ ] Test dismissal flow (dismiss → relaunch → card reappears)
- [ ] Test direct Plans navigation
- [ ] Test already acknowledged users
- [ ] Test error scenarios
- [ ] Test edge cases (rapid switching, network issues)

### Phase 7: Analytics
- [ ] Add analytics events
- [ ] Test event firing
- [ ] Set up dashboard for tracking

### Phase 8: Localization
- [ ] Extract strings to Localizable.strings
- [ ] Test layout with longer translations
- [ ] Verify RTL language support (Arabic, Hebrew)

---

## Future Enhancements

### 1. Progressive Metric Education

Show one metric at a time with detailed explanations, quizzes, or interactive elements to increase understanding and engagement.

### 2. Personalized Messaging

Customize card copy based on user's goal:
- "Let's calculate your weight loss targets"
- "See your muscle gain recommendations"
- etc.

### 3. Metric Change Notifications

If metrics are recomputed (e.g., after weight update), show a different card:
- "Your Metrics Have Been Updated"
- Side-by-side comparison of old vs. new
- Explain why they changed

### 4. Gamification

Add achievement/badge for acknowledging metrics:
- "Health Scholar" badge
- Points for completing acknowledgment
- Progress bar showing profile completion

### 5. Social Proof

Show statistics to encourage engagement:
- "Join 10,000+ users who've generated their plan"
- "Users who acknowledge see 3x better results"

### 6. Preview Mode

Allow users to preview metrics without full acknowledgment:
- "Quick Peek" button on card
- Shows metrics in a sheet
- Still requires formal acknowledgment later

---

## Conclusion

The **Hybrid Approach** (Dashboard Action Card + Plans Empty State) provides the optimal balance of:

- **Discoverability**: Users can't miss it
- **Education**: Clear value proposition
- **Flexibility**: Multiple entry points
- **Respect**: User control and choice
- **Effectiveness**: High completion rate expected

This design ensures users understand the value of acknowledging metrics, know exactly how to do it, and feel guided rather than forced through the process.

### Next Steps

1. Review this specification with the development team
2. Confirm technical feasibility of tab navigation approach
3. Create design mockups/prototypes if needed
4. Implement Phase 1 (Core Implementation)
5. Test with real users and gather feedback
6. Iterate based on analytics and user feedback

---

**Document Version**: 1.0
**Last Updated**: 2025-10-29
**Author**: Claude (UX Designer)
**Status**: Ready for Implementation
