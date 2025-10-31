# Metrics Acknowledgment Flow - Visual Mockups

This document provides ASCII-based visual representations of the metrics acknowledgment user experience across different states and screens.

---

## Screen 1: Home View - After Onboarding (Card Visible)

```
┌─────────────────────────────────────────┐
│ ← Home                          👤      │  Navigation Bar
├─────────────────────────────────────────┤
│                                         │
│  ┌───────────────────────────────────┐ │
│  │  ♥️                               │ │  MetricsAcknowledgmentCard
│  │  Your Health Metrics Are Ready!   │ │
│  │                                   │ │
│  │  Review your personalized         │ │
│  │  metrics                          │ │
│  │                                   │ │
│  │  ┌────┐ ┌────┐ ┌────┐            │ │  Metrics Preview Badges
│  │  │📏  │ │🔥  │ │⚡  │            │ │
│  │  │24.5│ │1650│ │2310│            │ │
│  │  │BMI │ │BMR │ │TDEE│            │ │
│  │  └────┘ └────┘ └────┘            │ │
│  │                                   │ │
│  │  These metrics power your         │ │
│  │  personalized nutrition plan.     │ │
│  │  Tap below to review and          │ │
│  │  confirm.                         │ │
│  │                                   │ │
│  │  ┌─────────────────────────────┐ │ │
│  │  │   View Your Plan            │ │ │  Primary CTA
│  │  └─────────────────────────────┘ │ │
│  │                                   │ │
│  │       Remind Me Later             │ │  Dismiss Link
│  └───────────────────────────────────┘ │
│                                         │
│  ┌───────────────────────────────────┐ │
│  │  Welcome back,                    │ │  Welcome Section
│  │  John                             │ │
│  └───────────────────────────────────┘ │
│                                         │
│  ┌──────────────┬──────────────┐      │
│  │ Total Tasks  │ Completed    │      │  Stats Grid
│  │     12       │      8       │      │
│  └──────────────┴──────────────┘      │
│  ┌──────────────┬──────────────┐      │
│  │ In Progress  │ Pending      │      │
│  │      3       │      1       │      │
│  └──────────────┴──────────────┘      │
│                                         │
│  ┌───────────────────────────────────┐ │
│  │  🔥 Current Streak                │ │  Streak Card
│  │                                   │ │
│  │  5 days                           │ │
│  │  Longest: 12 days                 │ │
│  └───────────────────────────────────┘ │
│                                         │
│  Today's Tasks                          │
│  ┌───────────────────────────────────┐ │
│  │ 💪 Log morning weight             │ │
│  │ Health • Today                    │ │
│  │                    [In Progress]  │ │
│  └───────────────────────────────────┘ │
│                                         │
└─────────────────────────────────────────┘
│  🏠    📊    📋    👤                  │  Tab Bar
└─────────────────────────────────────────┘
```

**Visual Notes**:
- Card appears at top for maximum visibility
- Positioned after ProfileZeroStateCard (if present)
- Border tint with primary color
- Subtle shadow for elevation
- Metrics preview shows actual computed values

---

## Screen 2: Home View - Loading State

```
┌─────────────────────────────────────────┐
│ ← Home                          👤      │
├─────────────────────────────────────────┤
│                                         │
│  ┌───────────────────────────────────┐ │
│  │  ♥️                               │ │
│  │  Your Health Metrics Are Ready!   │ │
│  │                                   │ │
│  │  Review your personalized         │ │
│  │  metrics                          │ │
│  │                                   │ │
│  │     ⏳ Loading your metrics...    │ │  Loading State
│  │                                   │ │
│  │                                   │ │
│  │  ┌─────────────────────────────┐ │ │
│  │  │   View Your Plan            │ │ │  (Disabled)
│  │  └─────────────────────────────┘ │ │
│  │                                   │ │
│  │       Remind Me Later             │ │
│  └───────────────────────────────────┘ │
│                                         │
│  [Rest of Home content...]             │
│                                         │
└─────────────────────────────────────────┘
```

**Visual Notes**:
- Progress spinner with loading text
- Button remains visible but disabled
- Clean, minimal loading state
- Card maintains same size to prevent layout shift

---

## Screen 3: Home View - Error State

```
┌─────────────────────────────────────────┐
│ ← Home                          👤      │
├─────────────────────────────────────────┤
│                                         │
│  ┌───────────────────────────────────┐ │
│  │  ♥️                               │ │
│  │  Your Health Metrics Are Ready!   │ │
│  │                                   │ │
│  │  Review your personalized         │ │
│  │  metrics                          │ │
│  │                                   │ │
│  │  ⚠️  Unable to load metrics.      │ │  Error State
│  │  Please try again.                │ │
│  │                                   │ │
│  │  ┌─────────────────────────────┐ │ │
│  │  │   View Your Plan            │ │ │  (Disabled)
│  │  └─────────────────────────────┘ │ │
│  │                                   │ │
│  │       Remind Me Later             │ │
│  └───────────────────────────────────┘ │
│                                         │
│  [Rest of Home content...]             │
│                                         │
└─────────────────────────────────────────┘
```

**Visual Notes**:
- Warning icon with error message
- Clear, actionable error text
- Button disabled in error state
- User can still dismiss to explore app
- Error doesn't block access to other features

---

## Screen 4: Home View - Default State (No Metrics Loaded)

```
┌─────────────────────────────────────────┐
│ ← Home                          👤      │
├─────────────────────────────────────────┤
│                                         │
│  ┌───────────────────────────────────┐ │
│  │  ♥️                               │ │
│  │  Your Health Metrics Are Ready!   │ │
│  │                                   │ │
│  │  Review your personalized         │ │
│  │  metrics                          │ │
│  │                                   │ │
│  │  We've calculated your BMI, BMR,  │ │  Default State
│  │  and TDEE based on your health    │ │
│  │  profile.                         │ │
│  │                                   │ │
│  │  ✓ Science-based                  │ │
│  │  ✓ Personalized                   │ │
│  │  ✓ Safe                           │ │
│  │                                   │ │
│  │  ┌─────────────────────────────┐ │ │
│  │  │   View Your Plan            │ │ │
│  │  └─────────────────────────────┘ │ │
│  │                                   │ │
│  │       Remind Me Later             │ │
│  └───────────────────────────────────┘ │
│                                         │
│  [Rest of Home content...]             │
│                                         │
└─────────────────────────────────────────┘
```

**Visual Notes**:
- Shows when metrics summary isn't loaded yet
- Emphasizes benefits instead of specific values
- Simple checkmark icons for trust signals
- Still actionable - navigates to Plans

---

## Screen 5: Plans Tab - Metrics Acknowledgment View

```
┌─────────────────────────────────────────┐
│              Your Plan            ↻     │  Navigation Bar
├─────────────────────────────────────────┤
│                                         │
│              🩺                         │  Large Icon
│                                         │
│      Review Your Health Metrics         │  Headline
│                                         │
│  Before we create your personalized     │
│  nutrition plan, let's review the       │  Subheadline
│  health metrics we've calculated        │
│  for you.                               │
│                                         │
│  ┌───────────────────────────────────┐ │
│  │ 📏 BMI (Body Mass Index)          │ │  BMI Card
│  │                                   │ │
│  │ 24.5 - Normal Weight              │ │
│  │                                   │ │
│  │ Your body mass index indicates    │ │
│  │ a healthy weight range based on   │ │
│  │ your height and weight.           │ │
│  └───────────────────────────────────┘ │
│                                         │
│  ┌───────────────────────────────────┐ │
│  │ 🔥 BMR (Basal Metabolic Rate)     │ │  BMR Card
│  │                                   │ │
│  │ 1,650 cal/day                     │ │
│  │                                   │ │
│  │ The number of calories your body  │ │
│  │ burns at rest to maintain basic   │ │
│  │ functions like breathing and      │ │
│  │ circulation.                      │ │
│  └───────────────────────────────────┘ │
│                                         │
│  ┌───────────────────────────────────┐ │
│  │ ⚡ TDEE (Total Daily Energy)      │ │  TDEE Card
│  │                                   │ │
│  │ 2,310 cal/day                     │ │
│  │                                   │ │
│  │ Your total daily calorie burn     │ │
│  │ including your activity level     │ │
│  │ (Moderately Active).              │ │
│  └───────────────────────────────────┘ │
│                                         │
│  These metrics form the foundation      │  Helper Text
│  of your personalized plan              │
│                                         │
│  ┌─────────────────────────────────┐   │
│  │ I Understand, Generate My Plan  │   │  Primary CTA
│  └─────────────────────────────────┘   │
│                                         │
└─────────────────────────────────────────┘
│  🏠    📊    📋    👤                  │  Tab Bar
└─────────────────────────────────────────┘
```

**Visual Notes**:
- Full-screen educational view
- Each metric gets its own card with explanation
- Clear value proposition
- Large, prominent CTA button
- This view already exists and works well

---

## Screen 6: Plans Tab - After Acknowledgment (Plan View)

```
┌─────────────────────────────────────────┐
│              Your Plan            ↻     │
├─────────────────────────────────────────┤
│                                         │
│  Welcome, John!                         │  Header
│  Your goal: Lose Weight                 │
│                                         │
│  ┌───────────────────────────────────┐ │
│  │ ♥️  Health Metrics                │ │  Health Metrics
│  │ ─────────────────────────────────│ │  Section
│  │                                   │ │
│  │ 📏 BMI                            │ │
│  │ 24.5 - Normal                     │ │
│  │                                   │ │
│  │ 🔥 BMR                            │ │
│  │ 1,650 cal/day                     │ │
│  │ Calories burned at rest           │ │
│  │                                   │ │
│  │ ⚡ TDEE                            │ │
│  │ 2,310 cal/day                     │ │
│  │ Total calories burned daily       │ │
│  └───────────────────────────────────┘ │
│                                         │
│  ┌───────────────────────────────────┐ │
│  │ 🎯 Daily Targets                  │ │  Daily Targets
│  │ ─────────────────────────────────│ │  Section
│  │                                   │ │
│  │ 🔥 Calories    1,810 cal          │ │
│  │ 🥗 Protein     140g               │ │
│  │ 💧 Water       2,800ml            │ │
│  │                                   │ │
│  │ Weekly Rate: 1.00 lbs/week        │ │
│  └───────────────────────────────────┘ │
│                                         │
│  ┌───────────────────────────────────┐ │
│  │ 💡 Why It Works                   │ │  Why It Works
│  │ ─────────────────────────────────│ │  Section
│  │                                   │ │
│  │ [Expandable explanations...]      │ │
│  └───────────────────────────────────┘ │
│                                         │
│  ┌─────────────────────────────────┐   │
│  │    Recalculate Plan             │   │  Refresh Button
│  └─────────────────────────────────┘   │
│                                         │
└─────────────────────────────────────────┘
```

**Visual Notes**:
- Plan view appears after successful acknowledgment
- Shows same metrics but in different context
- Includes daily targets calculated from metrics
- Educational "Why It Works" section
- Ability to recalculate if needed

---

## Screen 7: Home View - After Acknowledgment (Card Hidden)

```
┌─────────────────────────────────────────┐
│ ← Home                          👤      │
├─────────────────────────────────────────┤
│                                         │
│  ┌───────────────────────────────────┐ │
│  │  Welcome back,                    │ │  Welcome Section
│  │  John                             │ │  (No card above!)
│  └───────────────────────────────────┘ │
│                                         │
│  ┌──────────────┬──────────────┐      │
│  │ Total Tasks  │ Completed    │      │  Stats Grid
│  │     12       │      8       │      │
│  └──────────────┴──────────────┘      │
│  ┌──────────────┬──────────────┐      │
│  │ In Progress  │ Pending      │      │
│  │      3       │      1       │      │
│  └──────────────┴──────────────┘      │
│                                         │
│  ┌───────────────────────────────────┐ │
│  │  🔥 Current Streak                │ │  Streak Card
│  │                                   │ │
│  │  5 days                           │ │
│  │  Longest: 12 days                 │ │
│  └───────────────────────────────────┘ │
│                                         │
│  Today's Tasks                          │
│  ┌───────────────────────────────────┐ │
│  │ 💪 Log morning weight             │ │
│  │ Health • Today                    │ │
│  │                    [In Progress]  │ │
│  └───────────────────────────────────┘ │
│                                         │
│  ┌───────────────────────────────────┐ │
│  │ 🍎 Log breakfast                  │ │
│  │ Nutrition • Today                 │ │
│  │                       [Pending]   │ │
│  └───────────────────────────────────┘ │
│                                         │
└─────────────────────────────────────────┘
```

**Visual Notes**:
- Clean home view without acknowledgment card
- Standard content flow resumes
- User has completed the onboarding journey
- Focus shifts to daily tasks and progress

---

## Interaction Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                     USER JOURNEY                            │
└─────────────────────────────────────────────────────────────┘

   Complete Onboarding
          │
          ↓
   ┌──────────────┐
   │  Home View   │
   │  (Card Shows)│
   └──────┬───────┘
          │
          ├────────────────┬─────────────────┐
          │                │                 │
    [Tap Card]      [Tap Dismiss]    [Navigate Directly]
          │                │                 │
          ↓                ↓                 ↓
   ┌──────────────┐  Card Hides      ┌──────────────┐
   │  Plans Tab   │  (Temporarily)   │  Plans Tab   │
   │  (Metrics)   │                  │  (Metrics)   │
   └──────┬───────┘                  └──────┬───────┘
          │                                 │
          │◄────────────────────────────────┘
          │
    [Review Metrics]
          │
          ↓
    [Tap "I Understand"]
          │
          ├──────────────┬───────────────┐
          │              │               │
      API Call      Plan Generate   Update State
    (Acknowledge)    (API Call)    (needsAck=false)
          │              │               │
          └──────────────┴───────────────┘
                         │
                         ↓
                  ┌──────────────┐
                  │  Plans View  │
                  │  (Generated) │
                  └──────────────┘
                         │
                         ↓
                  ┌──────────────┐
                  │  Home View   │
                  │  (No Card)   │
                  └──────────────┘
                         │
                         ↓
                   Journey Complete
```

---

## State Transition Diagram

```
┌────────────────────────────────────────────────────────────┐
│                    CARD VISIBILITY STATES                  │
└────────────────────────────────────────────────────────────┘

   App Launch / Home Load
          │
          ↓
   Check Prerequisites
          │
          ├─── hasCompletedOnboarding? ──→ No ──→ [No Card]
          │                ↓ Yes
          │
          ├─── showZeroState? ──→ Yes ──→ [No Card - Zero State Priority]
          │                ↓ No
          │
          ↓
   Fetch Metrics Summary
          │
          ├─── API Success? ──→ No ──→ [Card with Error State]
          │                ↓ Yes
          │
          ├─── metrics.acknowledged? ──→ Yes ──→ [No Card]
          │                        ↓ No
          │
          ↓
   [SHOW CARD with Metrics Preview]
          │
          ├─────────────────┬─────────────────┐
          │                 │                 │
    User Dismisses   User Acknowledges   App Restart
          │                 │                 │
          ↓                 ↓                 ↓
    [Hide Card]      [Hide Card]        [Show Card Again]
    (Session Only)   (Permanent)        (If Not Ack'd)
```

---

## Responsive Layout Considerations

### iPhone SE (Small Screen)
```
┌────────────────────┐
│                    │  Card takes more vertical space
│  ┌──────────────┐ │  Metrics stack vertically
│  │  Metrics     │ │  Shorter explanatory text
│  │  Card        │ │  Compact padding
│  │  (Compact)   │ │
│  │              │ │
│  │  BMI: 24.5   │ │
│  │  BMR: 1650   │ │
│  │  TDEE: 2310  │ │
│  │              │ │
│  │  [Button]    │ │
│  └──────────────┘ │
│                    │
│  [Rest of Home]    │
└────────────────────┘
```

### iPhone 14/15 (Standard)
```
┌──────────────────────────┐
│                          │  Balanced layout
│  ┌────────────────────┐ │  Metrics in row
│  │  Metrics Card      │ │  Full explanations
│  │                    │ │  Standard padding
│  │  📏 BMI  🔥 BMR    │ │
│  │  24.5    1650      │ │
│  │          ⚡ TDEE    │ │
│  │          2310      │ │
│  │  [Button]          │ │
│  └────────────────────┘ │
│                          │
│  [Rest of Home]          │
└──────────────────────────┘
```

### iPhone Pro Max (Large Screen)
```
┌────────────────────────────────┐
│                                │  More breathing room
│  ┌──────────────────────────┐ │  Larger metrics preview
│  │  Metrics Card            │ │  Expanded explanations
│  │                          │ │  Generous padding
│  │  📏 BMI   🔥 BMR  ⚡ TDEE│ │
│  │  24.5     1650    2310   │ │
│  │                          │ │
│  │  Full explanation text   │ │
│  │  with more context...    │ │
│  │                          │ │
│  │  [Button]                │ │
│  └──────────────────────────┘ │
│                                │
│  [Rest of Home]                │
└────────────────────────────────┘
```

---

## Dark Mode Variations

### Light Mode
```
┌─────────────────────────────────────┐
│  ┌───────────────────────────────┐ │
│  │ ♥️ Your Health Metrics...     │ │  White background
│  │                               │ │  Dark text
│  │ (Blue border, subtle shadow)  │ │  Blue accents
│  │                               │ │
│  │ 📏 BMI  🔥 BMR  ⚡ TDEE       │ │  Colored badges
│  │ 24.5    1650    2310          │ │
│  └───────────────────────────────┘ │
└─────────────────────────────────────┘
```

### Dark Mode
```
┌─────────────────────────────────────┐
│  ┌───────────────────────────────┐ │
│  │ ♥️ Your Health Metrics...     │ │  Dark background
│  │                               │ │  Light text
│  │ (Blue border, deeper shadow)  │ │  Bright blue accents
│  │                               │ │
│  │ 📏 BMI  🔥 BMR  ⚡ TDEE       │ │  Vibrant badges
│  │ 24.5    1650    2310          │ │
│  └───────────────────────────────┘ │
└─────────────────────────────────────┘
```

---

## Animation Sequences

### Card Appearance (On Load)
```
Frame 1 (0ms):      Frame 2 (150ms):    Frame 3 (300ms):
┌─────────┐         ┌─────────┐         ┌─────────┐
│         │         │  ┌───┐  │         │  ┌───┐  │
│         │    →    │  │ ♥ │  │    →    │  │ ♥ │  │
│         │         │  └───┘  │         │  │...│  │
│ [Home]  │         │ [Scale] │         │  └───┘  │
└─────────┘         └─────────┘         └─────────┘
  Hidden            Fading In          Fully Visible

Animation: Scale + Fade
Duration: 300ms
Easing: Spring (response: 0.3, damping: 0.8)
```

### Card Dismissal (On "Remind Me Later")
```
Frame 1 (0ms):      Frame 2 (200ms):    Frame 3 (400ms):
┌─────────┐         ┌─────────┐         ┌─────────┐
│  ┌───┐  │         │  ┌───┐  │         │         │
│  │ ♥ │  │    →    │  │...│  │    →    │         │
│  │...│  │         │  └───┘  │         │         │
│  └───┘  │         │ [Fade]  │         │ [Home]  │
└─────────┘         └─────────┘         └─────────┘
  Visible           Fading Out            Hidden

Animation: Opacity only
Duration: 400ms
Easing: Ease-out
```

### Navigation Transition (To Plans Tab)
```
Home Tab              Plans Tab (Metrics)
┌─────────┐           ┌─────────┐
│  Card   │           │         │
│ [Tapped]│     →     │ Metrics │
│         │           │ Review  │
│         │           │         │
└─────────┘           └─────────┘
    │                     ↑
    └──────→ Slide ←──────┘

Animation: Tab switch (system default)
Haptic: Light impact on tap
```

---

## Copy Variations for A/B Testing

### Version A (Current - Informative)
```
Headline: "Your Health Metrics Are Ready!"
Body: "Review your personalized metrics"
Button: "View Your Plan"
```

### Version B (Action-Oriented)
```
Headline: "Your Health Plan is Ready to Generate"
Body: "Review and confirm your metrics to unlock your plan"
Button: "Review My Metrics"
```

### Version C (Benefit-Focused)
```
Headline: "Unlock Your Personalized Nutrition Plan"
Body: "Quick review of your health metrics (2 minutes)"
Button: "Get My Plan"
```

### Version D (Urgency)
```
Headline: "One Step Away from Your Custom Plan"
Body: "Confirm your health metrics to get started"
Button: "Complete Setup"
```

**Recommendation**: Test Version B (action-oriented) against current version

---

## Accessibility Annotations

### VoiceOver Navigation Order
```
┌─────────────────────────────────────┐
│  ┌───────────────────────────────┐ │
│  │ 1️⃣ [Container]                │ │  "Action required: Review health metrics"
│  │    "Metrics acknowledgment"   │ │
│  │                               │ │
│  │ 2️⃣ [Heading]                  │ │  "Your Health Metrics Are Ready!"
│  │                               │ │
│  │ 3️⃣ [Text]                     │ │  "Review your personalized metrics"
│  │                               │ │
│  │ 4️⃣ [Group]                    │ │  "Metrics included: BMI 24.5,
│  │    BMI  BMR  TDEE            │ │   BMR 1650, TDEE 2310"
│  │                               │ │
│  │ 5️⃣ [Button]                   │ │  "View your plan. Navigate to Plans
│  │    View Your Plan            │ │   tab to review metrics"
│  │                               │ │
│  │ 6️⃣ [Button]                   │ │  "Remind me later. Dismiss reminder"
│  └───────────────────────────────┘ │
└─────────────────────────────────────┘
```

### Dynamic Type Scaling
```
Standard Size:          Largest Size:
┌─────────────┐         ┌──────────────┐
│  ♥️          │         │  ♥️           │
│  Metrics    │         │              │
│  Ready!     │         │  Your        │
│             │         │  Health      │
│  Review...  │    →    │  Metrics     │
│             │         │  Are         │
│  [BMI]      │         │  Ready!      │
│  [BMR]      │         │              │
│  [TDEE]     │         │  Review      │
│             │         │  your...     │
│  [Button]   │         │              │
└─────────────┘         │  [Button]    │
                        └──────────────┘
                        (Scrollable if needed)
```

---

## Error Message Copy

### Network Error
```
⚠️ Unable to load metrics.
   Check your connection and try again.
```

### No Metrics Yet (After Fresh Onboarding)
```
⏳ We're calculating your metrics.
   This usually takes a few moments.
```

### API Server Error
```
⚠️ Something went wrong.
   Please try again in a moment.
```

### Metrics Already Acknowledged (Shouldn't happen, but defensive)
```
✓ Metrics already confirmed!
  View your plan in the Plans tab.
```

---

## Success Patterns

### After Acknowledgment - Toast Message
```
┌─────────────────────────────────────┐
│                                     │
│  ┌───────────────────────────────┐ │
│  │  ✓ Plan generated successfully│ │  Toast (3 seconds)
│  └───────────────────────────────┘ │
│                                     │
│  [Plan View Content]                │
│                                     │
└─────────────────────────────────────┘
```

### Confetti Animation (Optional Enhancement)
```
        ✨    *    ✨
    *        🎉         *
         ✨      *   ✨
    *                    *
   ┌─────────────────────────┐
   │  Plan Generated!        │
   │  ✓ Metrics Confirmed    │
   └─────────────────────────┘
         *    ✨    *
     ✨           ✨
```

---

**Document Version**: 1.0
**Last Updated**: 2025-10-29
**Purpose**: Visual reference for implementation and design review
**Status**: Mockups based on current implementation
