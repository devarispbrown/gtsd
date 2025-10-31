# Nutrition Plan UI/UX - Implementation Summary

**Date:** 2025-10-28
**Status:** Design Complete, Ready for Implementation

---

## Quick Links

- **Full Design Document:** `/apps/NUTRITION_PLAN_UX_DESIGN.md`
- **Backend API:** `/apps/api/src/services/science.ts`
- **iOS App:** `/apps/ios/GTSD/`

---

## Executive Summary

The comprehensive UI/UX design for the personalized nutrition plan feature is complete. This feature surfaces science-based calculations (BMR, TDEE, calorie/protein/water targets) from the backend `/api/science/compute-targets` endpoint into an intuitive, educational mobile experience.

### Design Philosophy

1. **Science First, Simplified**: Present complex formulas in plain language
2. **Progressive Disclosure**: Show essential metrics upfront, details on demand
3. **Trust Through Transparency**: Explain the "why" behind every calculation
4. **Action-Oriented**: Every screen leads to user action
5. **Thumb-Friendly**: Primary actions within easy reach on large iPhones

---

## Key Design Decisions

### 1. Navigation Strategy

**Decision:** Two-pronged entry approach

- **Primary:** Add nutrition overview card to Home screen (always visible)
- **Secondary:** Full plan accessible via modal sheet (detailed exploration)

**Rationale:**

- Home screen card provides at-a-glance daily targets
- Modal allows deep dive without disrupting main navigation
- Aligns with existing iOS patterns (Apple Health uses similar approach)

---

### 2. Information Architecture

**Three-Tab Structure:**

1. **Overview Tab** (Default)
   - Daily targets (calories, protein, water)
   - Timeline projection (weeks to goal)
   - Quick actions (log food, update weight)

2. **Why It Works Tab**
   - BMR explanation with formula
   - TDEE calculation breakdown
   - Calorie deficit/surplus rationale
   - Protein and water target science

3. **History Tab**
   - Timeline of plan changes
   - Weight progress chart (Swift Charts)
   - Before/after metric comparisons

**Rationale:**

- Separates "what" (targets) from "why" (explanations) from "when" (history)
- Prevents cognitive overload
- Allows users to focus on what matters most to them

---

### 3. Progressive Disclosure Pattern

**Collapsed State:** Show essential info only

```
🔥 BMR (Basal Metabolic Rate)
   1,650 cal/day

Your BMR is the energy your body burns at rest...
[ℹ️ Show Formula]
```

**Expanded State:** Reveal detailed explanations

```
🔥 BMR (Basal Metabolic Rate)
   1,650 cal/day

Your BMR is the energy your body burns at rest...
[ℹ️ Hide Details]

Formula (Mifflin-St Jeor):
BMR = (10 × weight) + (6.25 × height) - (5 × age) + gender offset

Your Calculation:
(10 × 82kg) + (6.25 × 178cm) - (5 × 32) + 5 = 1,650 cal/day

Why This Formula?
[Detailed scientific explanation...]
```

**Rationale:**

- Respects user's time (quick scan vs deep dive)
- Accommodates different learning styles
- Reduces perceived complexity

---

### 4. Visual Design System

**Color Coding:**

- 🎯 Orange: Calories (fire/energy metaphor)
- 💪 Purple: Protein (muscle building)
- 💧 Blue: Water (hydration)
- 🔥 Red: BMR (basal metabolism)
- ⚡ Green: TDEE (total energy)

**Typography:**

- Large numbers: 48pt bold for primary metrics
- Medium numbers: 32pt bold for secondary metrics
- Body text: 15pt regular for explanations
- Code blocks: 13pt monospaced for formulas

**Rationale:**

- Color-coded metrics enable quick visual scanning
- Large numbers emphasize what matters most (daily targets)
- Monospace for formulas signals "technical" content

---

### 5. Weight Update Flow

**Simplified Trigger:** Update weight → Automatic plan recalculation

**Flow:**

```
User Updates Weight (ProfileEditView)
  ↓
POST /api/profile/update-weight
  ↓
Backend automatically recomputes plan
  ↓
GET /api/science/compute-targets (returns new plan)
  ↓
UI updates all displayed metrics
  ↓
Show toast: "Weight updated! Your plan has been recalculated."
```

**Rationale:**

- Automatic recalculation removes friction
- No separate "recalculate" button needed
- Backend already has logic to trigger on weight change

---

## Component Specifications

### New Components to Build

1. **`NutritionOverviewCard`**
   - Purpose: Home screen summary
   - Props: calorie target, deficit, protein, water, timeline
   - Size: ~200pt height, full width minus padding

2. **`ExpandableMetricCard`**
   - Purpose: Collapsible explanations
   - State: Collapsed (default) ↔ Expanded
   - Animation: 0.3s ease-in-out

3. **`TimelineProgressCard`**
   - Purpose: Visual timeline with progress bar
   - Elements: Start weight → Current → Goal, progress bar, estimated weeks

4. **`WeightProgressChart`**
   - Purpose: Line chart showing weight over time
   - Library: Swift Charts (iOS 16+ native)
   - Features: Interactive tooltips, goal line overlay

5. **`PlanUpdateTimelineView`**
   - Purpose: Chronological list of plan changes
   - Format: Reverse chrono with date, event type, metric changes

---

## Screen Flow Diagram

```
┌─────────────┐
│  Home Tab   │
└──────┬──────┘
       │ User sees NutritionOverviewCard
       │
       ↓ (Tap card)
       │
┌──────────────────────┐
│ NutritionPlanView    │ (Modal Sheet)
│ ┌──────────────────┐ │
│ │ [Overview]       │ │ ← Default tab
│ │  - Daily Targets │ │
│ │  - Timeline      │ │
│ │  - Quick Actions │ │
│ └──────────────────┘ │
│ ┌──────────────────┐ │
│ │ [Why It Works]   │ │ ← Educational
│ │  - BMR           │ │
│ │  - TDEE          │ │
│ │  - Targets       │ │
│ └──────────────────┘ │
│ ┌──────────────────┐ │
│ │ [History]        │ │ ← Tracking
│ │  - Plan Changes  │ │
│ │  - Weight Chart  │ │
│ └──────────────────┘ │
└──────────────────────┘
       │
       ↓ User taps "Update Weight"
       │
┌──────────────────────┐
│ ProfileEditView      │
│ (Weight field)       │
│ ┌────────────────┐   │
│ │ Current Weight │   │
│ │ [  179  ] lbs  │   │
│ └────────────────┘   │
│ [Save]               │ → Triggers plan recalc
└──────────────────────┘
```

---

## Accessibility Highlights

### VoiceOver Support

**Example: NutritionOverviewCard**

```swift
.accessibilityElement(children: .combine)
.accessibilityLabel("Nutrition Plan. Daily calorie target: 1,975 calories with 500 calorie deficit. Protein target: 130 grams. Water target: 2,450 milliliters. 15 weeks to goal.")
.accessibilityHint("Double tap to view full nutrition plan")
```

### Dynamic Type

- All text scales with user's font size preference
- Test at largest accessibility size (xxxL)
- Ensure no text truncation
- Icons remain fixed size (decorative)

### Touch Targets

- Minimum 44pt × 44pt (Apple HIG)
- All buttons comply with padding
- Full card tappable area (not just "View Plan" button)

### Color Contrast

- WCAG AA compliant (4.5:1 for text, 3:1 for UI)
- Tested in light and dark modes
- All colors have dark mode variants

---

## Mobile-Specific Optimizations

### 1. Thumb-Friendly Layout

**Reachability Zones:**

- **Top 25%:** Navigation, tabs (read-only)
- **Middle 50%:** Scrollable content
- **Bottom 25%:** Primary CTAs (View Plan, Update Weight)

### 2. Performance

**Targets:** 60fps scrolling, <100ms tap response

**Strategies:**

- Lazy loading with `LazyVStack`
- SF Symbols (vector, GPU-accelerated)
- Cache plan data for 15 minutes
- Debounce API calls

### 3. Offline Behavior

**Works Offline:**

- View cached plan ✅
- Read explanations ✅

**Requires Network:**

- Update weight ❌ (show clear message)
- Refresh plan ❌ (show offline banner)

**Cache Duration:** 15 minutes with timestamp

---

## Implementation Roadmap

### Phase 1: Foundation (Week 1)

- [ ] Create Swift models matching backend API
- [ ] Build `ScienceService` for API integration
- [ ] Implement local caching
- [ ] Build core UI components

### Phase 2: Core Screens (Week 2)

- [ ] Build `NutritionPlanView` with 3 tabs
- [ ] Integrate nutrition card into HomeView
- [ ] Add loading/error states

### Phase 3: History & Weight Tracking (Week 3)

- [ ] Implement History tab with timeline
- [ ] Build weight progress chart
- [ ] Enhance ProfileEditView for weight updates
- [ ] Add automatic plan recalculation

### Phase 4: Polish & Accessibility (Week 4)

- [ ] Complete VoiceOver support
- [ ] Test Dynamic Type at all sizes
- [ ] Add animations and interactions
- [ ] Handle edge cases (offline, errors)

### Phase 5: Testing & Launch (Week 5)

- [ ] Write unit and UI tests
- [ ] QA testing
- [ ] TestFlight beta
- [ ] App Store submission

**Total Timeline:** 5 weeks

---

## API Integration

### Primary Endpoint

**Endpoint:** `GET /api/science/compute-targets`

**Response:**

```typescript
{
  bmr: 1650,                    // kcal/day
  tdee: 2475,                   // kcal/day
  calorieTarget: 1975,          // kcal/day
  proteinTarget: 130,           // grams/day
  waterTarget: 2450,            // ml/day
  weeklyRate: -0.5,             // kg/week (negative = loss)
  estimatedWeeks: 15,           // weeks to goal
  projectedDate: "2026-02-15"   // ISO date
}
```

### Educational Content

**Endpoint:** `GET /api/science/why-it-works`

Returns structured explanations for BMR, TDEE, calorie target, protein, water, and timeline with formulas and context.

---

## Key Files to Create

```
/apps/ios/GTSD/Features/Nutrition/
├── NutritionPlanView.swift
├── NutritionPlanViewModel.swift
├── Components/
│   ├── NutritionOverviewCard.swift
│   ├── ExpandableMetricCard.swift
│   ├── TimelineProgressCard.swift
│   ├── WeightProgressChart.swift
│   └── PlanUpdateTimelineView.swift
├── Tabs/
│   ├── OverviewTabView.swift
│   ├── WhyItWorksTabView.swift
│   └── HistoryTabView.swift
└── Models/
    ├── NutritionPlan.swift
    └── PlanUpdate.swift

/apps/ios/GTSD/Core/Services/
└── ScienceService.swift
```

**Files to Modify:**

- `/apps/ios/GTSD/Features/Home/HomeView.swift` - Add nutrition card
- `/apps/ios/GTSD/Features/Profile/ProfileEditView.swift` - Enhance weight section

---

## Success Metrics

### User Engagement

- 70%+ of users tap nutrition card within first week
- 40%+ expand at least one "Why It Works" explanation
- 60%+ check plan within 24 hours of weight update

### Education

- 50%+ read BMR/TDEE explanations
- 30s+ average time on "Why It Works" tab
- 10%+ reduction in support tickets about calculations

### Retention

- 15%+ increase in 7-day retention vs. control
- 20%+ increase in daily active usage
- 30%+ increase in weight logging frequency

---

## Future Enhancements (v2)

1. **Meal Planning**
   - Generate meal suggestions based on targets
   - Recipe database with macros
   - Shopping list generation

2. **Smart Notifications**
   - "You're 200 calories under target today"
   - "Time to log your weight - it's been a week!"
   - Milestone celebrations

3. **Goal Adjustments**
   - In-app goal changes without full profile edit
   - "What if" calculator for exploring scenarios

4. **Export & Sharing**
   - PDF export of plan
   - Share progress charts to social media
   - Email plan to accountability partner

---

## Questions for Product Team

1. **Frequency of Plan Updates:**
   - Should we auto-recalculate plan weekly based on weight trends?
   - Or only when user manually updates weight?

2. **Meal Logging:**
   - Is food logging coming in v1 or v2?
   - Should "Log Today's Food" button be disabled with "Coming Soon" label?

3. **Unit Preferences:**
   - Do we need lb/kg switcher for international users?
   - What about fl oz vs ml for water?

4. **Notifications:**
   - Do we want push notifications for plan updates?
   - E.g., "Your plan has been updated based on your progress!"

---

## Next Steps

1. **Review this document** with product and engineering teams
2. **Prioritize features** (MVP vs v2)
3. **Assign development** to iOS team
4. **Set up analytics** events for tracking
5. **Begin Phase 1** (Foundation week)

---

## Contact

For questions about this design:

- UI/UX: [Design team lead]
- iOS Implementation: [iOS tech lead]
- Backend API: [Backend team lead]

---

**Document Status:** ✅ Complete and Ready for Implementation
