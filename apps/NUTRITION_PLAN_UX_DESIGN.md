# Personalized Nutrition Plan - iOS App UI/UX Design

**Document Version:** 1.0
**Date:** 2025-10-28
**Platform:** iOS (Swift/SwiftUI)
**Product:** GTSD Fitness Tracking App

---

## Executive Summary

This document provides comprehensive UI/UX design specifications for integrating science-based personalized nutrition plans into the GTSD iOS app. The backend `/api/science/compute-targets` endpoint calculates BMR, TDEE, calorie targets, protein targets, water targets, and timeline projections. This feature surfaces these calculations in an accessible, educational, and actionable way within the mobile experience.

### Key Design Principles

1. **Science First, Simplified**: Present complex calculations (BMR, TDEE) in plain language while maintaining scientific credibility
2. **Progressive Disclosure**: Show essential metrics upfront, detailed explanations on demand
3. **Trust Through Transparency**: Explain the "why" behind every number
4. **Action-Oriented**: Every screen should lead to user action (tracking, logging, understanding)
5. **Thumb-Friendly**: All primary interactions within easy thumb reach on large iPhones

---

## Table of Contents

1. [Information Architecture](#information-architecture)
2. [Screen Specifications](#screen-specifications)
3. [Component Library](#component-library)
4. [Visual Design System](#visual-design-system)
5. [Interaction Patterns](#interaction-patterns)
6. [Accessibility Guidelines](#accessibility-guidelines)
7. [Mobile-Specific Considerations](#mobile-specific-considerations)
8. [Implementation Roadmap](#implementation-roadmap)

---

## Information Architecture

### Navigation Structure

```
TabBarView
├── Home Tab
│   ├── HomeView (Enhanced)
│   │   ├── Stats Cards (existing)
│   │   ├── Nutrition Overview Card (NEW)
│   │   └── Today's Tasks
│   └── Tap Nutrition Card → NutritionPlanView
│
├── Tasks Tab (existing, unchanged)
│
├── Streaks Tab (existing, unchanged)
│
└── Profile Tab
    ├── ProfileView (Enhanced)
    │   ├── Profile Header
    │   ├── Health Metrics Card (NEW)
    │   ├── Quick Stats
    │   └── Settings Button
    └── ProfileEditView (Enhanced)
        ├── Basic Info
        ├── Body Metrics (Weight, Height)
        ├── Activity Level
        ├── Goals
        └── Save → Triggers Recomputation

New Dedicated Section:
├── NutritionPlanView (NEW - Modal/Sheet)
    ├── Plan Overview Tab
    │   ├── Daily Targets Summary
    │   ├── Timeline Projection
    │   └── Quick Actions
    ├── Why It Works Tab
    │   ├── BMR Explanation
    │   ├── TDEE Explanation
    │   ├── Calorie Target Rationale
    │   ├── Protein Target Science
    │   └── Water Target Logic
    └── Plan History Tab
        ├── Timeline of Changes
        └── Weight Progress Graph
```

### Information Hierarchy

**Level 1 (Always Visible):**

- Current calorie target (big number)
- Protein target (secondary metric)
- Water target (tertiary metric)

**Level 2 (One Tap):**

- BMR and TDEE values
- Timeline to goal (weeks)
- Projected completion date

**Level 3 (Progressive Disclosure):**

- Detailed formulas
- Scientific explanations
- Activity multipliers
- Calculation breakdowns

---

## Screen Specifications

### 1. Enhanced Home View (Primary Entry Point)

**File:** `/apps/ios/GTSD/Features/Home/HomeView.swift` (modification)

#### 1.1 Nutrition Overview Card (New Component)

**Placement:** Between "Streak Card" and "Today's Tasks" sections

**Visual Layout:**

```
┌─────────────────────────────────────────────────┐
│  Nutrition Plan                    [→]          │
├─────────────────────────────────────────────────┤
│                                                 │
│  🎯  Daily Calorie Target                      │
│       1,975 cal                                │
│       (500 cal deficit)                        │
│                                                 │
│  ─────────────────────────────────────────────  │
│                                                 │
│  💪  Protein: 130g    💧  Water: 2,450ml       │
│                                                 │
│  ─────────────────────────────────────────────  │
│                                                 │
│  📅  15 weeks to goal (Feb 15, 2026)           │
│                                                 │
│  [View Full Plan]                              │
│                                                 │
└─────────────────────────────────────────────────┘
```

**Component Breakdown:**

1. **Header Row:**
   - Title: "Nutrition Plan" (`.titleMedium`, `.textPrimary`)
   - Chevron: "chevron.right" SF Symbol (`.textSecondary`)
   - Tappable area: Full header

2. **Primary Metric (Calorie Target):**
   - Icon: 🎯 emoji (24pt)
   - Label: "Daily Calorie Target" (`.bodyMedium`, `.textSecondary`)
   - Value: "1,975 cal" (`.headlineLarge`, `.primaryColor`, bold)
   - Context: "(500 cal deficit)" (`.bodySmall`, `.textTertiary`)
   - Spacing: `Spacing.md` between elements

3. **Secondary Metrics Row:**
   - Two columns, equal width
   - **Left Column:**
     - Icon: 💪 emoji (20pt)
     - Label + Value: "Protein: 130g" (`.bodyMedium`, `.textPrimary`)
   - **Right Column:**
     - Icon: 💧 emoji (20pt)
     - Label + Value: "Water: 2,450ml" (`.bodyMedium`, `.textPrimary`)

4. **Timeline Projection:**
   - Icon: 📅 emoji (20pt)
   - Text: "15 weeks to goal (Feb 15, 2026)" (`.bodyMedium`, `.textSecondary`)

5. **CTA Button:**
   - Text: "View Full Plan"
   - Style: `.secondary` (outline with primary color)
   - Width: Full width minus card padding
   - Action: Opens `NutritionPlanView` as modal sheet

**Interaction:**

- **Tap anywhere on card** → Opens `NutritionPlanView`
- **"View Full Plan" button** → Opens `NutritionPlanView`
- **Animate on tap:** Subtle scale down (0.98) with spring animation

**States:**

1. **Loading:** Show skeleton loader with pulse animation
2. **Success:** Display metrics as shown above
3. **Error:** Show fallback message: "Unable to load nutrition plan" with retry button
4. **No Data:** If user hasn't completed profile, show CTA: "Complete your profile to see personalized nutrition targets"

**Edge Cases:**

- **Maintenance Goal:** Hide deficit/surplus text, show "at maintenance"
- **No Target Weight:** Show "Focus on consistency" instead of timeline
- **Very Long Timeline:** Cap display at "52+ weeks" to avoid overwhelming

---

### 2. Nutrition Plan View (New Modal Screen)

**File:** `/apps/ios/GTSD/Features/Nutrition/NutritionPlanView.swift` (new)

#### 2.1 Tab Structure

**Navigation:** Tab-based interface with 3 tabs at top

```
┌─────────────────────────────────────────────────┐
│  ← Nutrition Plan                         [×]   │
├─────────────────────────────────────────────────┤
│  [Overview]  [Why It Works]  [History]         │
├─────────────────────────────────────────────────┤
│                                                 │
│  Tab Content Area (Scrollable)                 │
│                                                 │
└─────────────────────────────────────────────────┘
```

**Tab Picker:**

- Style: Segmented control (iOS native)
- Font: `.titleSmall`
- Background: `.backgroundSecondary`
- Active tab: `.primaryColor` background, white text
- Inactive tab: `.textSecondary` text

---

#### 2.2 Overview Tab (Default View)

**Content Structure:**

```
┌─────────────────────────────────────────────────┐
│  [Overview]  Why It Works  History             │
├─────────────────────────────────────────────────┤
│                                                 │
│  ScrollView {                                   │
│    ┌───────────────────────────────────────┐  │
│    │  Your Daily Targets                   │  │
│    │  ───────────────────────────────────  │  │
│    │                                       │  │
│    │  🎯  Calories                         │  │
│    │       1,975 cal/day                   │  │
│    │       (500 cal deficit)               │  │
│    │                                       │  │
│    │  💪  Protein                          │  │
│    │       130g/day                        │  │
│    │       (2.2g per kg body weight)      │  │
│    │                                       │  │
│    │  💧  Water                            │  │
│    │       2,450ml/day                     │  │
│    │       (35ml per kg body weight)      │  │
│    └───────────────────────────────────────┘  │
│                                                 │
│    ┌───────────────────────────────────────┐  │
│    │  Your Timeline                        │  │
│    │  ───────────────────────────────────  │  │
│    │                                       │  │
│    │  Start Weight    →    Goal Weight     │  │
│    │    180 lbs      →      165 lbs        │  │
│    │                                       │  │
│    │  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━     │  │
│    │  Progress: 0 of 15 lbs (0%)          │  │
│    │                                       │  │
│    │  📆  Estimated: 15 weeks              │  │
│    │  🎯  Target Date: Feb 15, 2026        │  │
│    │  📉  Rate: 1 lb/week (safe)           │  │
│    └───────────────────────────────────────┘  │
│                                                 │
│    ┌───────────────────────────────────────┐  │
│    │  Quick Actions                        │  │
│    │  ───────────────────────────────────  │  │
│    │                                       │  │
│    │  [📊 Log Today's Food]                │  │
│    │  [⚖️  Update Weight]                  │  │
│    │  [🔍 Learn Why These Targets]         │  │
│    └───────────────────────────────────────┘  │
│  }                                             │
│                                                 │
└─────────────────────────────────────────────────┘
```

**Component Specifications:**

**1. Daily Targets Card (`GTSDCard`):**

- Padding: `Spacing.md`
- Corner Radius: `CornerRadius.md`
- Shadow: `.cardShadow()`

**Target Row Template:**

- Icon: Emoji, 32pt
- Label: (`.bodyMedium`, `.textSecondary`)
- Value: (`.headlineMedium`, `.textPrimary`, bold)
- Context: (`.bodySmall`, `.textTertiary`, italic)
- Vertical spacing: `Spacing.md` between rows

**2. Timeline Card:**

- **Weight Progression:**
  - Start and goal weights: (`.titleMedium`, `.textPrimary`)
  - Arrow: "→" (`.textSecondary`, 24pt)
  - Horizontal layout with equal spacing

- **Progress Bar:**
  - Height: 8pt
  - Background: `.backgroundTertiary`
  - Foreground: `.primaryColor` gradient
  - Corner radius: 4pt
  - Progress text below: (`.bodySmall`, `.textSecondary`)

- **Timeline Details:**
  - Three rows with icons and text
  - Icon: SF Symbol (16pt, `.primaryColor`)
  - Text: (`.bodyMedium`, `.textPrimary`)

**3. Quick Actions Card:**

- Three buttons stacked vertically
- Button style: Secondary with icon + text
- Icon: SF Symbol (20pt, leading)
- Text: (`.titleMedium`)
- Full width buttons with `Spacing.sm` between

**Interactions:**

1. **"Log Today's Food" Button:**
   - Action: Opens food logging flow (future feature)
   - For v1: Show toast: "Coming soon!"

2. **"Update Weight" Button:**
   - Action: Opens `ProfileEditView` with weight field focused
   - Closes modal, navigates to profile

3. **"Learn Why These Targets" Button:**
   - Action: Switches to "Why It Works" tab
   - Animated tab transition

**Empty States:**

- **No Plan Data:** Show message: "Complete your profile to generate a personalized nutrition plan" + CTA button
- **Loading:** Full-screen skeleton loader with pulse

**Pull-to-Refresh:**

- Enabled on ScrollView
- Action: Calls `/api/science/compute-targets` to recompute
- Shows loading indicator at top

---

#### 2.3 Why It Works Tab (Educational Content)

**Content Structure:**

```
┌─────────────────────────────────────────────────┐
│  Overview  [Why It Works]  History             │
├─────────────────────────────────────────────────┤
│                                                 │
│  ScrollView {                                   │
│    ┌───────────────────────────────────────┐  │
│    │  How We Calculate Your Plan           │  │
│    │                                       │  │
│    │  Your personalized nutrition targets  │  │
│    │  are based on proven science. Here's  │  │
│    │  the breakdown:                       │  │
│    └───────────────────────────────────────┘  │
│                                                 │
│    ┌───────────────────────────────────────┐  │
│    │  🔥  BMR (Basal Metabolic Rate)      │  │
│    │  ───────────────────────────────────  │  │
│    │                                       │  │
│    │      1,650 cal/day                    │  │
│    │                                       │  │
│    │  Your BMR is the energy your body    │  │
│    │  burns at complete rest just to keep  │  │
│    │  you alive. This includes breathing,  │  │
│    │  circulation, and cell production.    │  │
│    │                                       │  │
│    │  [ℹ️ Show Formula] (collapsed)        │  │
│    └───────────────────────────────────────┘  │
│                                                 │
│    ┌───────────────────────────────────────┐  │
│    │  ⚡  TDEE (Total Daily Energy)       │  │
│    │  ───────────────────────────────────  │  │
│    │                                       │  │
│    │      2,475 cal/day                    │  │
│    │                                       │  │
│    │  Your TDEE is your total calorie burn │  │
│    │  including all activity. We multiply  │  │
│    │  your BMR by 1.55 to account for your │  │
│    │  moderately active lifestyle.         │  │
│    │                                       │  │
│    │  [ℹ️ Show Details] (collapsed)        │  │
│    └───────────────────────────────────────┘  │
│                                                 │
│    ┌───────────────────────────────────────┐  │
│    │  🎯  Your Calorie Target              │  │
│    │  ───────────────────────────────────  │  │
│    │                                       │  │
│    │      1,975 cal/day                    │  │
│    │                                       │  │
│    │  To lose weight safely, you need a    │  │
│    │  500-calorie daily deficit. This      │  │
│    │  creates an energy gap that forces    │  │
│    │  your body to use fat stores. At this │  │
│    │  rate, you'll lose ~1 lb per week -   │  │
│    │  sustainable and muscle-preserving.   │  │
│    │                                       │  │
│    │  [ℹ️ Show Calculation] (collapsed)    │  │
│    └───────────────────────────────────────┘  │
│                                                 │
│    (continues for Protein and Water)           │
│  }                                             │
│                                                 │
└─────────────────────────────────────────────────┘
```

**Component Specifications:**

**Intro Card:**

- Background: `.backgroundSecondary`
- Padding: `Spacing.md`
- Corner radius: `CornerRadius.md`
- Font: (`.bodyMedium`, `.textSecondary`)

**Explanation Card Template (`ExpandableMetricCard`):**

**Collapsed State:**

- Icon: Emoji (40pt, centered)
- Title: (`.headlineSmall`, `.textPrimary`, bold)
- Divider: 1pt gray line
- Value: (`.displaySmall`, `.primaryColor`, bold, centered)
- Explanation: 2-3 sentences (`.bodyMedium`, `.textSecondary`, left-aligned)
- Expand button: "ℹ️ Show [Formula/Details/Calculation]" (`.bodySmall`, `.primaryColor`, with chevron.down)

**Expanded State:**

- All of the above, plus:
- Detailed explanation section with:
  - Formula display (monospace font, code block style)
  - Specific values used in calculation
  - Scientific rationale (2-3 additional paragraphs)
- Collapse button: "ℹ️ Hide Details" (with chevron.up)

**Example Expanded Content for BMR:**

```
┌───────────────────────────────────────┐
│  🔥  BMR (Basal Metabolic Rate)      │
│  ───────────────────────────────────  │
│                                       │
│      1,650 cal/day                    │
│                                       │
│  Your BMR is the energy your body... │
│                                       │
│  [ℹ️ Hide Details] ▲                 │
│                                       │
│  ───────────────────────────────────  │
│  Formula (Mifflin-St Jeor):          │
│                                       │
│  BMR = (10 × weight) +                │
│        (6.25 × height) -              │
│        (5 × age) + gender offset      │
│                                       │
│  Your Calculation:                    │
│  (10 × 82kg) + (6.25 × 178cm) -      │
│  (5 × 32) + 5 = 1,650 cal/day        │
│                                       │
│  Why This Formula?                    │
│  The Mifflin-St Jeor equation is the │
│  most accurate for modern populations │
│  and is endorsed by the Academy of    │
│  Nutrition and Dietetics. It accounts │
│  for your body composition and age-   │
│  related metabolic changes.           │
└───────────────────────────────────────┘
```

**Interactions:**

- **Tap "Show [Details]" button:** Expand card with animation (`.smooth`)
- **Tap "Hide Details" button:** Collapse card with animation
- **All cards independent:** Expanding one doesn't collapse others

**Scroll Performance:**

- Lazy loading for expanded content
- Keep collapsed state in view hierarchy for smooth animation

---

#### 2.4 Plan History Tab

**Content Structure:**

```
┌─────────────────────────────────────────────────┐
│  Overview  Why It Works  [History]             │
├─────────────────────────────────────────────────┤
│                                                 │
│  ScrollView {                                   │
│    ┌───────────────────────────────────────┐  │
│    │  Plan Updates                         │  │
│    │  ───────────────────────────────────  │  │
│    │                                       │  │
│    │  📅  Today - Oct 28, 2025             │  │
│    │  ⚖️   Weight: 180 lbs → 179 lbs       │  │
│    │  🎯  Target: 1,975 cal (unchanged)    │  │
│    │                                       │  │
│    │  ───────────────────────────────────  │  │
│    │                                       │  │
│    │  📅  Oct 21, 2025                     │  │
│    │  📝  Plan recalculated                │  │
│    │  🎯  Target: 1,950 → 1,975 cal        │  │
│    │  💪  Protein: 128g → 130g             │  │
│    │                                       │  │
│    │  ───────────────────────────────────  │  │
│    │                                       │  │
│    │  📅  Oct 1, 2025                      │  │
│    │  ✨  Plan created                     │  │
│    │  🎯  Calorie Target: 1,950 cal        │  │
│    │  💪  Protein: 128g                    │  │
│    │  💧  Water: 2,450ml                   │  │
│    │                                       │  │
│    └───────────────────────────────────────┘  │
│                                                 │
│    ┌───────────────────────────────────────┐  │
│    │  Weight Progress                      │  │
│    │  ───────────────────────────────────  │  │
│    │                                       │  │
│    │  [Line Chart: Weight over Time]      │  │
│    │  (Swift Charts)                       │  │
│    │                                       │  │
│    │  • Current: 179 lbs                   │  │
│    │  • Start: 180 lbs (Oct 1)             │  │
│    │  • Goal: 165 lbs                      │  │
│    │                                       │  │
│    └───────────────────────────────────────┘  │
│  }                                             │
│                                                 │
└─────────────────────────────────────────────────┘
```

**Component Specifications:**

**1. Timeline List:**

- Reverse chronological order (newest first)
- Timeline entry template:
  - Date: (`.titleSmall`, `.textPrimary`, bold)
  - Icon: SF Symbol or emoji (20pt, `.primaryColor`)
  - Event type: (`.bodyMedium`, `.textSecondary`)
  - Changes: Bullet list (`.bodySmall`, `.textPrimary`)
  - Separator: 1pt gray divider

**2. Weight Progress Chart:**

- Library: Swift Charts (native iOS 16+)
- Chart type: Line chart with gradient fill
- X-axis: Time (weekly intervals)
- Y-axis: Weight (lbs or kg based on user preference)
- Data points: Show markers on line
- Colors:
  - Line: `.primaryColor`
  - Gradient fill: `.primaryColor.opacity(0.2)`
  - Goal line: Dashed `.successColor`

**Empty State:**

- **No History:** "Start logging your weight to track progress over time"
- **No Chart Data:** Show placeholder with "Not enough data yet"

**Future Enhancement (v2):**

- Add filter: "Show last 30/60/90 days"
- Export data as CSV
- Share progress screenshot

---

### 3. Enhanced Profile Edit View

**File:** `/apps/ios/GTSD/Features/Profile/ProfileEditView.swift` (modification)

#### 3.1 Weight Update Flow

**Purpose:** Allow users to update weight, which triggers plan recomputation

**New Section in ProfileEditView:**

```
┌─────────────────────────────────────────────────┐
│  Body Metrics                                   │
├─────────────────────────────────────────────────┤
│                                                 │
│  Current Weight                                 │
│  [  179  ] lbs                                  │
│  Last updated: Oct 28, 2025                     │
│                                                 │
│  Height                                         │
│  [  5  ] ft  [  10  ] in                        │
│                                                 │
│  ───────────────────────────────────────────────│
│                                                 │
│  ℹ️  Updating your weight will recalculate your │
│      personalized nutrition targets.            │
│                                                 │
└─────────────────────────────────────────────────┘
```

**Implementation Notes:**

1. **Weight Input:**
   - Type: Decimal number pad
   - Unit switcher: lbs ↔ kg (segmented control)
   - Validation: 66-440 lbs (30-200 kg)
   - Auto-save: Update on field blur

2. **Save Behavior:**
   - On save, call `/api/science/compute-targets`
   - Show loading state: "Updating your plan..."
   - On success, show toast: "Your nutrition plan has been updated!"
   - Refresh HomeView nutrition card

3. **Settings Integration:**
   - Add "Update Weight" button in Settings → Health
   - Quick action from Nutrition Plan Overview

---

## Component Library

### New Components to Build

#### 1. `NutritionOverviewCard.swift`

**Purpose:** Summary card for Home screen

**Props:**

```swift
struct NutritionOverviewCard: View {
    let calorieTarget: Int
    let deficit: Int?
    let proteinTarget: Int
    let waterTarget: Int
    let estimatedWeeks: Int?
    let projectedDate: Date?
    let onTap: () -> Void
}
```

**Usage:**

```swift
NutritionOverviewCard(
    calorieTarget: 1975,
    deficit: 500,
    proteinTarget: 130,
    waterTarget: 2450,
    estimatedWeeks: 15,
    projectedDate: Date(),
    onTap: { showNutritionPlan = true }
)
```

---

#### 2. `ExpandableMetricCard.swift`

**Purpose:** Collapsible explanation card for "Why It Works" tab

**Props:**

```swift
struct ExpandableMetricCard: View {
    let icon: String // Emoji or SF Symbol
    let title: String
    let value: String
    let unit: String
    let shortExplanation: String
    let detailedExplanation: String?
    let formula: String?
    let calculation: String?
    @State private var isExpanded: Bool = false
}
```

**Usage:**

```swift
ExpandableMetricCard(
    icon: "🔥",
    title: "BMR (Basal Metabolic Rate)",
    value: "1,650",
    unit: "cal/day",
    shortExplanation: "Your BMR is the energy...",
    detailedExplanation: "The Mifflin-St Jeor equation...",
    formula: "BMR = (10 × weight) + ...",
    calculation: "(10 × 82kg) + (6.25 × 178cm) - ..."
)
```

---

#### 3. `TimelineProgressCard.swift`

**Purpose:** Visual timeline with progress bar

**Props:**

```swift
struct TimelineProgressCard: View {
    let startWeight: Double
    let currentWeight: Double
    let goalWeight: Double
    let unit: String // "lbs" or "kg"
    let estimatedWeeks: Int?
    let projectedDate: Date?
    let weeklyRate: Double
}
```

**UI Elements:**

- Weight progression (start → current → goal)
- Progress bar with percentage
- Timeline details (weeks, date, rate)

---

#### 4. `WeightProgressChart.swift`

**Purpose:** Line chart showing weight over time

**Props:**

```swift
struct WeightProgressChart: View {
    let dataPoints: [WeightEntry]
    let goalWeight: Double
    let unit: String
}

struct WeightEntry: Identifiable {
    let id = UUID()
    let date: Date
    let weight: Double
}
```

**Implementation:**

- Use Swift Charts library
- Configurable time range
- Interactive tooltips on tap

---

#### 5. `PlanUpdateTimelineView.swift`

**Purpose:** Chronological list of plan changes

**Props:**

```swift
struct PlanUpdateTimelineView: View {
    let updates: [PlanUpdate]
}

struct PlanUpdate: Identifiable {
    let id: Int
    let date: Date
    let eventType: EventType // created, updated, weightChange
    let changes: [Change]
}

struct Change {
    let metric: String // "Calorie Target", "Protein"
    let oldValue: String?
    let newValue: String
}
```

---

## Visual Design System

### Color Palette (Nutrition-Specific)

```swift
extension Color {
    // Nutrition Metrics Colors
    static let calorieColor = Color.orange        // 🔥 Fire/energy
    static let proteinColor = Color.purple        // 💪 Muscle building
    static let waterColor = Color.blue            // 💧 Hydration
    static let bmrColor = Color.red.opacity(0.8)  // Basal metabolism
    static let tdeeColor = Color.green            // Total energy

    // Timeline Colors
    static let goalColor = Color.successColor     // Achievement
    static let progressColor = Color.primaryColor // Current progress
}
```

### Typography Hierarchy

**Nutrition Plan Specific:**

```swift
extension Font {
    // Large numbers (calorie targets, etc.)
    static let metricLarge = Font.system(size: 48, weight: .bold)
    static let metricMedium = Font.system(size: 32, weight: .bold)

    // Labels for metrics
    static let metricLabel = Font.system(size: 14, weight: .medium)

    // Explanatory text
    static let explanationBody = Font.system(size: 15, weight: .regular)

    // Formula/code blocks
    static let formulaText = Font.system(size: 13, weight: .regular, design: .monospaced)
}
```

### Spacing & Layout

**Card Spacing:**

- Between cards: `Spacing.lg` (24pt)
- Card internal padding: `Spacing.md` (16pt)
- Section headers: `Spacing.xl` (32pt) top margin

**Metric Display:**

- Icon to value: `Spacing.sm` (8pt)
- Value to label: `Spacing.xs` (4pt)
- Between metric rows: `Spacing.md` (16pt)

### Icon System

**Metric Icons (Emoji):**

- 🎯 Calorie Target
- 🔥 BMR
- ⚡ TDEE
- 💪 Protein
- 💧 Water
- 📅 Timeline
- 📈 Progress
- ⚖️ Weight

**SF Symbols (Supplementary):**

- "chart.line.uptrend.xyaxis" - Progress charts
- "calendar.badge.clock" - Timeline events
- "info.circle" - Help/explanations
- "arrow.triangle.2.circlepath" - Recalculate
- "chevron.down" - Expand
- "chevron.up" - Collapse

### Animation Guidelines

**Card Interactions:**

```swift
.scaleEffect(isPressed ? 0.98 : 1.0)
.animation(.springy, value: isPressed)
```

**Expand/Collapse:**

```swift
.animation(.smooth, value: isExpanded)
```

**Loading States:**

```swift
.redacted(reason: .placeholder)
.shimmering(active: isLoading) // Custom shimmer modifier
```

**Number Animations:**

```swift
// Animate number changes (e.g., calorie target updates)
Text("\(animatedValue)")
    .animation(.easeInOut(duration: 0.5), value: animatedValue)
```

---

## Interaction Patterns

### 1. Pull-to-Refresh (Recompute Plan)

**Locations:**

- NutritionPlanView (all tabs)
- HomeView (nutrition card)

**Behavior:**

1. User pulls down on scroll view
2. Show refresh indicator
3. Call `/api/science/compute-targets`
4. Update all displayed metrics
5. Show success toast: "Plan updated!"

**Error Handling:**

- Show error alert if API fails
- Keep old data visible
- Offer retry button

---

### 2. Tap to Expand (Progressive Disclosure)

**Used in:** "Why It Works" tab

**Behavior:**

1. User taps "Show Details" button on collapsed card
2. Card expands with animation (0.3s ease-in-out)
3. Additional content slides in
4. Button changes to "Hide Details"
5. Tapping again collapses

**Accessibility:**

- Announce state change to VoiceOver
- Focus moves to newly revealed content

---

### 3. Weight Update Flow

**Entry Points:**

1. Profile → Edit Profile → Body Metrics
2. Nutrition Plan → Quick Actions → "Update Weight"
3. Settings → Health → "Update Weight"

**Flow:**

```
User taps "Update Weight"
  ↓
Present ProfileEditView with weight field focused
  ↓
User enters new weight
  ↓
User taps "Save"
  ↓
Show loading overlay: "Updating your plan..."
  ↓
POST /api/profile/update-weight
  ↓
On success: Call /api/science/compute-targets
  ↓
Update all nutrition UI components
  ↓
Show success toast: "Weight updated! Your plan has been recalculated."
  ↓
Dismiss ProfileEditView
```

**Optimization:**

- Debounce API calls (don't recompute on every keystroke)
- Cache previous plan to show diff of changes

---

### 4. Empty State Handling

**Scenario 1: Profile Not Complete**

Show in place of nutrition card:

```
┌─────────────────────────────────────────────────┐
│  Complete Your Profile                          │
├─────────────────────────────────────────────────┤
│                                                 │
│  🎯                                             │
│                                                 │
│  Get personalized nutrition targets based on   │
│  your goals, activity level, and body metrics. │
│                                                 │
│  [Complete Profile]                            │
│                                                 │
└─────────────────────────────────────────────────┘
```

**Scenario 2: API Error**

Show error state:

```
┌─────────────────────────────────────────────────┐
│  Unable to Load Nutrition Plan                  │
├─────────────────────────────────────────────────┤
│                                                 │
│  ⚠️                                             │
│                                                 │
│  We couldn't load your personalized plan.      │
│  Please try again.                             │
│                                                 │
│  [Retry]                                       │
│                                                 │
└─────────────────────────────────────────────────┘
```

---

### 5. Offline Behavior

**Strategy:** Cache last known plan locally

**Implementation:**

- Store plan data in UserDefaults (encrypted)
- Show cached data with indicator: "Last updated: Oct 28, 10:30 AM"
- Disable "Update" actions when offline
- Show banner: "You're offline. Some features are limited."

**Sync on Reconnect:**

- Automatically refresh when network returns
- Show subtle animation indicating sync

---

## Accessibility Guidelines

### VoiceOver Support

**NutritionOverviewCard:**

```swift
.accessibilityElement(children: .combine)
.accessibilityLabel("Nutrition Plan. Daily calorie target: 1,975 calories with 500 calorie deficit. Protein target: 130 grams. Water target: 2,450 milliliters. 15 weeks to goal.")
.accessibilityHint("Double tap to view full nutrition plan")
```

**ExpandableMetricCard:**

```swift
.accessibilityElement(children: .combine)
.accessibilityLabel("BMR, 1,650 calories per day. \(shortExplanation)")
.accessibilityHint(isExpanded ? "Double tap to hide details" : "Double tap to show detailed explanation")
.accessibilityAddTraits(.isButton)
```

**Weight Input:**

```swift
TextField("Weight", value: $weight, format: .number)
    .accessibilityLabel("Current weight")
    .accessibilityHint("Enter your current weight in pounds")
```

### Dynamic Type

**Scaling Strategy:**

- All text uses semantic font sizes (`.bodyMedium`, `.headlineLarge`, etc.)
- Container views use flexible sizing
- Test at largest accessibility size (xxxL)
- Ensure no text truncation

**Fixed Size Elements:**

- Icons: Don't scale (they're decorative)
- Charts: Fixed height, but labels scale
- Progress bars: Fixed height

### Color Contrast

**WCAG AA Compliance:**

- Text on background: 4.5:1 minimum
- Large text (≥18pt): 3:1 minimum
- Interactive elements: 3:1 minimum

**Test Cases:**

- Primary text on white: `.textPrimary` (passes)
- Calorie value on white: `.primaryColor` (passes)
- Secondary text on light gray: `.textSecondary` (passes)

**Dark Mode:**

- All colors have dark mode variants
- Re-test contrast ratios
- Chart colors adjust for dark backgrounds

### Touch Targets

**Minimum Size:** 44pt × 44pt (Apple HIG)

**Compliance:**

- All buttons: ≥44pt height with padding
- Expandable cards: Full card is tappable (≥44pt)
- Tab bar items: Default iOS sizing (compliant)
- Chevrons/icons: Wrapped in larger tappable area

---

## Mobile-Specific Considerations

### 1. Thumb-Friendly Layouts

**Reachability Zones:**

```
┌─────────────────────┐
│  Hard to Reach      │  ← Top 25% (avoid critical actions)
├─────────────────────┤
│  Easy Reach         │  ← Middle 50% (primary content)
├─────────────────────┤
│  Thumb Zone         │  ← Bottom 25% (primary actions)
└─────────────────────┘
```

**Applied to Nutrition Plan:**

- **Top:** Navigation bar, tabs (read-only)
- **Middle:** Metrics, charts (scrollable content)
- **Bottom:** Primary CTA buttons (View Plan, Update Weight)

**Large Phone Optimization:**

- Primary actions duplicated:
  - "View Full Plan" button in card
  - Entire card is tappable
- Navigation bar items avoid top corners

---

### 2. Performance Optimization

**Target:** 60fps scrolling, <100ms tap response

**Strategies:**

1. **Lazy Loading:**

```swift
ScrollView {
    LazyVStack {
        ForEach(planUpdates) { update in
            PlanUpdateRow(update: update)
        }
    }
}
```

2. **Image Optimization:**

- Use SF Symbols (vector, performant)
- Emoji render natively (no images)
- Chart rendering: SwiftUI native (GPU-accelerated)

3. **Animation Performance:**

- Use `.animation()` sparingly
- Prefer `withAnimation {}` for controlled animations
- Test on older devices (iPhone 11 baseline)

4. **Network Optimization:**

- Cache plan data for 15 minutes
- Use HTTP ETag caching
- Show stale data while refreshing

---

### 3. Landscape Orientation

**Support Level:** Partial (readable, not optimized)

**Behavior:**

- NutritionPlanView: Allow landscape, use wider layout
- Charts: Use full width in landscape
- Cards: Switch to 2-column grid when width > 600pt

**Not Supported:**

- HomeView: Portrait only (tab bar constraint)

---

### 4. Offline Experience

**Critical Path:**

- View cached plan: ✅ Works offline
- Read explanations: ✅ Works offline
- Update weight: ❌ Requires network (show clear message)
- Refresh plan: ❌ Requires network

**Cache Strategy:**

```swift
struct CachedNutritionPlan: Codable {
    let plan: ComputedTargets
    let timestamp: Date
    let expiresAt: Date
}

// Cache for 15 minutes
let expiresAt = Date().addingTimeInterval(15 * 60)
```

**Offline Indicator:**

```swift
if isOffline {
    HStack {
        Image(systemName: "wifi.slash")
        Text("You're offline. Showing last known plan.")
    }
    .font(.caption)
    .foregroundColor(.warningColor)
    .padding(.horizontal)
}
```

---

### 5. Device Size Considerations

**iPhone SE (Small Screen):**

- Reduce card padding to `Spacing.sm` (8pt)
- Scale down large numbers (48pt → 40pt)
- Shorter timeline cards
- Sticky footer buttons

**iPhone 15 Pro Max (Large Screen):**

- Use extra space for breathing room
- Larger charts
- Side-by-side layouts where appropriate

**iPad (Future):**

- Not in v1 scope
- Future: Split view with plan + history side-by-side

---

## Implementation Roadmap

### Phase 1: Foundation (Week 1)

**Days 1-2: Data Layer**

- [ ] Create `NutritionPlan` Swift model matching backend response
- [ ] Add `ScienceService` to fetch `/api/science/compute-targets`
- [ ] Implement local caching with UserDefaults
- [ ] Write unit tests for data parsing

**Days 3-5: UI Components**

- [ ] Build `NutritionOverviewCard` component
- [ ] Build `ExpandableMetricCard` component
- [ ] Build `TimelineProgressCard` component
- [ ] Add components to design system documentation

**Files to Create:**

```
/apps/ios/GTSD/Core/Models/NutritionPlan.swift
/apps/ios/GTSD/Core/Services/ScienceService.swift
/apps/ios/GTSD/Features/Nutrition/Components/NutritionOverviewCard.swift
/apps/ios/GTSD/Features/Nutrition/Components/ExpandableMetricCard.swift
/apps/ios/GTSD/Features/Nutrition/Components/TimelineProgressCard.swift
```

---

### Phase 2: Core Screens (Week 2)

**Days 1-3: NutritionPlanView**

- [ ] Create `NutritionPlanView` with tab structure
- [ ] Implement Overview tab with targets and timeline
- [ ] Implement "Why It Works" tab with expandable cards
- [ ] Add loading and error states

**Days 4-5: Home Integration**

- [ ] Add `NutritionOverviewCard` to HomeView
- [ ] Implement modal presentation of NutritionPlanView
- [ ] Test deep linking from home card

**Files to Create:**

```
/apps/ios/GTSD/Features/Nutrition/NutritionPlanView.swift
/apps/ios/GTSD/Features/Nutrition/NutritionPlanViewModel.swift
/apps/ios/GTSD/Features/Nutrition/Tabs/OverviewTabView.swift
/apps/ios/GTSD/Features/Nutrition/Tabs/WhyItWorksTabView.swift
```

---

### Phase 3: History & Weight Tracking (Week 3)

**Days 1-2: History Tab**

- [ ] Implement `PlanUpdateTimelineView`
- [ ] Build weight progress chart with Swift Charts
- [ ] Add to NutritionPlanView as third tab

**Days 3-5: Weight Update Flow**

- [ ] Enhance ProfileEditView with weight update section
- [ ] Add "Update Weight" quick action button
- [ ] Implement automatic plan recalculation on weight change
- [ ] Show before/after comparison when plan updates

**Files to Create:**

```
/apps/ios/GTSD/Features/Nutrition/Tabs/HistoryTabView.swift
/apps/ios/GTSD/Features/Nutrition/Components/WeightProgressChart.swift
/apps/ios/GTSD/Features/Nutrition/Components/PlanUpdateTimelineView.swift
```

---

### Phase 4: Polish & Accessibility (Week 4)

**Days 1-2: Accessibility**

- [ ] Add VoiceOver labels and hints to all components
- [ ] Test with VoiceOver enabled
- [ ] Test with Dynamic Type at all sizes
- [ ] Verify color contrast in light and dark modes

**Days 3-4: Animations & Interactions**

- [ ] Add spring animations to card interactions
- [ ] Implement smooth expand/collapse for metric cards
- [ ] Add number change animations for plan updates
- [ ] Test performance on iPhone 11 and older

**Day 5: Edge Cases**

- [ ] Handle offline state gracefully
- [ ] Test with incomplete profile data
- [ ] Test with network errors
- [ ] Test with extreme values (very high/low metrics)

---

### Phase 5: Testing & Launch (Week 5)

**Days 1-2: Unit Tests**

- [ ] Test `ScienceService` API integration
- [ ] Test caching logic
- [ ] Test plan update triggers
- [ ] Achieve 80%+ code coverage

**Days 3-4: UI Tests**

- [ ] Test full user flow from home to plan view
- [ ] Test weight update and plan recalculation
- [ ] Test offline behavior
- [ ] Test accessibility navigation

**Day 5: Beta & Launch**

- [ ] Deploy to TestFlight
- [ ] QA testing with team
- [ ] Fix critical bugs
- [ ] Submit to App Store

---

## API Integration Reference

### Backend Endpoint

**Endpoint:** `GET /api/science/compute-targets`
**Authentication:** Required (Bearer token)

**Response Schema:**

```typescript
interface ComputedTargets {
  bmr: number; // Basal Metabolic Rate (kcal/day)
  tdee: number; // Total Daily Energy Expenditure (kcal/day)
  calorieTarget: number; // Daily calorie goal (kcal/day)
  proteinTarget: number; // Daily protein goal (grams)
  waterTarget: number; // Daily water goal (ml)
  weeklyRate: number; // Expected weight change (kg/week)
  estimatedWeeks?: number; // Weeks to goal (undefined for maintenance)
  projectedDate?: Date; // Projected completion date
}
```

**Swift Model:**

```swift
struct ComputedTargets: Codable {
    let bmr: Int
    let tdee: Int
    let calorieTarget: Int
    let proteinTarget: Int
    let waterTarget: Int
    let weeklyRate: Double
    let estimatedWeeks: Int?
    let projectedDate: Date?
}
```

---

### Why It Works Endpoint

**Endpoint:** `GET /api/science/why-it-works`
**Authentication:** Required

**Response Schema:**

```typescript
interface WhyItWorks {
  bmr: {
    title: string;
    explanation: string;
    formula: string;
  };
  tdee: {
    title: string;
    explanation: string;
    activityMultiplier: number;
  };
  calorieTarget: {
    title: string;
    explanation: string;
    deficit: number;
  };
  proteinTarget: {
    title: string;
    explanation: string;
    gramsPerKg: number;
  };
  waterTarget: {
    title: string;
    explanation: string;
    mlPerKg: number;
  };
  timeline: {
    title: string;
    explanation: string;
    weeklyRate: number;
    estimatedWeeks: number;
  };
}
```

---

## Future Enhancements (v2)

### 1. Meal Planning Integration

- Generate meal suggestions based on calorie/protein targets
- Recipe database with macros
- Shopping list generation

### 2. Progress Photos with Nutrition

- Overlay weight changes on progress photos
- "Before/After" comparisons with metric changes
- Share achievements to social

### 3. Smart Notifications

- "You're 200 calories under target today"
- "Time to log your weight - it's been a week!"
- "Congrats! You've lost 5 lbs since starting"

### 4. Goal Adjustments

- In-app goal changes (lose weight → maintain)
- Recalculate plan without going through profile edit
- "What if" calculator: "What if I increased activity level?"

### 5. Export & Sharing

- Export plan as PDF
- Share progress chart to Instagram story
- Send plan to accountability partner

---

## Appendix A: File Structure

```
/apps/ios/GTSD/Features/Nutrition/
├── NutritionPlanView.swift           # Main modal screen
├── NutritionPlanViewModel.swift      # Business logic
├── Components/
│   ├── NutritionOverviewCard.swift   # Home screen card
│   ├── ExpandableMetricCard.swift    # "Why It Works" card
│   ├── TimelineProgressCard.swift    # Timeline with progress bar
│   ├── WeightProgressChart.swift     # Line chart
│   └── PlanUpdateTimelineView.swift  # History timeline
├── Tabs/
│   ├── OverviewTabView.swift         # Daily targets tab
│   ├── WhyItWorksTabView.swift       # Educational content tab
│   └── HistoryTabView.swift          # Plan changes tab
└── Models/
    ├── NutritionPlan.swift           # Data models
    └── PlanUpdate.swift              # History entry model

/apps/ios/GTSD/Core/Services/
└── ScienceService.swift              # API client for /science endpoints
```

---

## Appendix B: Design Tokens

```swift
// NutritionDesignSystem.swift

enum NutritionSpacing {
    static let metricIconSize: CGFloat = 32
    static let metricValueFontSize: CGFloat = 48
    static let cardVerticalSpacing: CGFloat = 24
    static let expandableContentPadding: CGFloat = 16
}

enum NutritionColors {
    static let calorie = Color.orange
    static let protein = Color.purple
    static let water = Color.blue
    static let bmr = Color.red.opacity(0.8)
    static let tdee = Color.green
}

enum NutritionAnimations {
    static let expandDuration: Double = 0.3
    static let numberChangeDuration: Double = 0.5
    static let cardTapScale: CGFloat = 0.98
}
```

---

## Appendix C: User Testing Scenarios

### Scenario 1: First-Time User

**Goal:** User completes profile and sees their first nutrition plan

**Steps:**

1. User signs up and completes onboarding
2. User navigates to Home screen
3. User sees nutrition overview card for first time
4. User taps "View Full Plan"
5. User explores all three tabs
6. User expands BMR explanation in "Why It Works"

**Success Criteria:**

- User understands what BMR and TDEE mean
- User knows their calorie target
- User finds timeline projection motivating

---

### Scenario 2: Weight Update

**Goal:** User logs new weight and sees plan update

**Steps:**

1. User opens Nutrition Plan
2. User taps "Update Weight" in Quick Actions
3. User enters new weight (179 lbs)
4. User saves
5. Plan recalculates and shows changes

**Success Criteria:**

- Update completes within 3 seconds
- User sees "Plan updated!" confirmation
- Calorie target adjusts correctly

---

### Scenario 3: Understanding the Science

**Goal:** User wants to know why their protein target is so high

**Steps:**

1. User opens Nutrition Plan → "Why It Works"
2. User scrolls to Protein card
3. User taps "Show Details"
4. User reads formula and rationale

**Success Criteria:**

- Explanation is clear and non-technical
- User feels confident in the recommendation
- User can collapse explanation easily

---

## Appendix D: Analytics Events

```swift
enum NutritionAnalyticsEvent {
    case nutritionCardViewed
    case nutritionPlanOpened
    case tabSwitched(tab: String) // "overview", "why_it_works", "history"
    case metricCardExpanded(metric: String) // "bmr", "tdee", etc.
    case weightUpdated(oldWeight: Double, newWeight: Double)
    case planRecalculated
    case quickActionTapped(action: String)
}
```

---

## Document Change Log

| Version | Date       | Author | Changes                      |
| ------- | ---------- | ------ | ---------------------------- |
| 1.0     | 2025-10-28 | Claude | Initial comprehensive design |

---

**END OF DOCUMENT**
