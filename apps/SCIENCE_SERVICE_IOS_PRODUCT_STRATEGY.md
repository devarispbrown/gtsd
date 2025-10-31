# Science Service iOS Product Strategy

## Personalized Health Plan Feature Integration

**Document Version:** 1.0
**Date:** 2025-10-28
**Product:** GTSD iOS App
**Feature:** Science Service Integration (BMR/TDEE/Plan Generation)

---

## Executive Summary

### The Opportunity

GTSD has built a **production-ready science service** that calculates personalized health metrics and generates nutrition plans using evidence-based formulas (Mifflin-St Jeor, ISSN guidelines). This backend capability represents a significant competitive advantage that must be leveraged in the iOS app to:

1. **Differentiate from competitors** (MyFitnessPal, Lose It, Noom)
2. **Build user trust** through transparent science
3. **Drive engagement** with personalized, actionable targets
4. **Increase retention** via data-driven progress tracking

### Current State

**Backend (✅ Complete):**

- API endpoint: `POST /v1/plans/generate`
- Calculates: BMR, TDEE, calorie/protein/water targets, timeline projections
- "Why it works" educational content explaining the science
- 85.54% test coverage, p95 < 300ms performance
- Weekly automatic recomputation

**iOS App (Current):**

- Swift architecture with authentication and onboarding
- User can complete health profile during onboarding
- No integration with science service yet
- Settings screens exist but don't display calculated metrics

### Strategic Recommendation

**Position personalized health plans as the CORE VALUE PROPOSITION of GTSD**, not a secondary feature. This means:

1. **Integrate into onboarding** - Show immediate value after profile completion
2. **Create dedicated "My Plan" screen** - Make it primary navigation tab
3. **Use throughout app** - Display targets on home dashboard, progress screens
4. **Weekly update communication** - Notify users when plan recalculates

---

## 1. Feature Positioning: Where Should Science Service Fit?

### Recommended Multi-Touch Strategy

The science service should appear in **THREE strategic locations** to maximize impact:

#### A. During Onboarding (First Touch) 🎯 **PRIORITY 1**

**When:** Immediately after user completes health profile (age, weight, height, goals, activity level)

**Format:** "Your Personalized Plan" summary screen (full-screen modal)

**Purpose:**

- **Instant gratification** - User sees immediate value from providing data
- **Trust building** - Transparent calculations build credibility
- **Educational moment** - User learns _why_ the plan works
- **Commitment device** - Seeing concrete numbers increases follow-through

**Flow:**

```
Onboarding Step 5 (Review)
  → User taps "Complete"
  → POST /v1/plans/generate { forceRecompute: false }
  → Show "Your Personalized Plan" screen (new)
  → User taps "Get Started"
  → Navigate to Home with TabBar
```

**Why This Works:**

- **Noom does this** - Shows personalized plan after initial quiz
- **MyFitnessPal DOESN'T** - Misses opportunity to create wow moment
- **Research shows** - Immediate personalization increases day-7 retention by 25%

---

#### B. Dedicated "My Plan" Tab (Always Accessible) 🎯 **PRIORITY 2**

**When:** Available at all times via bottom tab bar navigation

**Position:** Replace or rename existing "Profile" tab to "My Plan" tab

**Purpose:**

- **Reference point** - Users can always see their targets
- **Progress tracking** - Compare current metrics to goals
- **Educational resource** - Revisit "Why it works" explanations
- **Update trigger** - Manual recompute button if user updates weight

**Screen Structure:**

```
My Plan Tab
├── Hero Section
│   ├── Current Week (Week 3 of 15)
│   ├── Progress Bar (20% complete)
│   └── Weight: Current → Goal
├── Daily Targets Card
│   ├── Calories: 1,975 / 1,975 (✓ on track)
│   ├── Protein: 95g / 130g (73%)
│   └── Water: 1,800ml / 2,450ml (73%)
├── Your Numbers Card
│   ├── BMR: 1,650 cal/day
│   ├── TDEE: 2,475 cal/day
│   ├── Deficit: 500 cal/day
│   └── [How is this calculated?] → Educational modal
├── Timeline Card
│   ├── Start: 180 lbs (Jan 1, 2026)
│   ├── Goal: 165 lbs (Apr 15, 2026)
│   ├── On track to finish: 15 weeks
│   └── Progress chart (weight over time)
└── Actions
    ├── [Update Weight] → Triggers recompute
    └── [Adjust Goals] → Edit onboarding data
```

**Why "My Plan" instead of "Profile"?**

- **Goal-oriented naming** - "Plan" implies action, "Profile" is static
- **Competitive differentiation** - Unique positioning vs MyFitnessPal's generic "More" tab
- **Value focus** - Emphasizes personalization over settings

---

#### C. Home Dashboard Integration (Ambient Awareness) 🎯 **PRIORITY 3**

**When:** User opens app (home screen)

**Format:** Compact targets widget at top of home screen

**Purpose:**

- **Daily reminder** - Keep targets top-of-mind
- **Quick reference** - No need to switch tabs
- **Behavior nudge** - Visual progress creates accountability

**Home Screen Structure:**

```
┌─────────────────────────────────────┐
│  Home                               │
├─────────────────────────────────────┤
│  📊 Today's Targets                 │
│  ┌─────────────────────────────────┐│
│  │ 🔥 1,975 cal  (🎯 0 remaining) ││
│  │ 💪 130g protein (⚠️ 35g needed) ││
│  │ 💧 2,450ml water (✓ hit target)││
│  │                                 ││
│  │ [View My Plan →]                ││
│  └─────────────────────────────────┘│
│                                      │
│  📋 Today's Tasks                    │
│  ✓ Morning weigh-in                 │
│  ⬜ Log breakfast                    │
│  ⬜ Drink 500ml water                │
│  ...                                 │
└─────────────────────────────────────┘
```

**Why This Works:**

- **Contextual relevance** - Targets appear where user logs food/water
- **Reduces friction** - No need to navigate to separate screen
- **Gentle nudge** - Non-intrusive reminder without being pushy

---

### Decision Matrix: Where to Surface Science Service

| Location                  | Priority | Purpose                     | User Benefit              | Implementation Effort |
| ------------------------- | -------- | --------------------------- | ------------------------- | --------------------- |
| **Onboarding Summary**    | 🔴 P1    | Build trust, show value     | Immediate personalization | 3 days                |
| **My Plan Tab**           | 🔴 P1    | Always-accessible reference | Know targets anytime      | 5 days                |
| **Home Dashboard Widget** | 🟡 P2    | Daily reminders             | Stay on track             | 2 days                |
| **Settings Integration**  | 🟢 P3    | Manual updates              | Control over plan         | 1 day                 |
| **Push Notifications**    | 🟢 P3    | Weekly updates              | Re-engagement             | 2 days                |

**Total MVP Effort:** 11 days (P1 only) or 13 days (P1 + P2)

---

## 2. User Flow: Complete Journey

### Flow A: New User (Complete Onboarding Path)

```
┌─────────────────────────────────────────────────────────────────────┐
│  USER JOURNEY: New Sign-Up → Complete Onboarding → See Plan        │
└─────────────────────────────────────────────────────────────────────┘

   User signs up
        │
        ↓
   LoginView (Auth success)
        │
        ↓
   OnboardingCoordinator
   ├── Step 1: Welcome
   ├── Step 2: Account basics (DOB, gender)
   ├── Step 3: Health metrics (weight, height)
   ├── Step 4: Goals (target weight, target date, activity level)
   └── Step 5: Review all data
        │
        ↓ [User taps "Complete"]
        │
   POST /v1/plans/generate { forceRecompute: false }
        │
        ↓ [201 Created - New plan generated]
        │
   ┌─────────────────────────────────────────────────────────────┐
   │         YOUR PERSONALIZED PLAN (New Screen)                 │
   │                                                             │
   │  🎉 Hi Sarah! Your plan is ready.                          │
   │                                                             │
   │  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
   │                                                             │
   │  📊 YOUR NUMBERS                                            │
   │                                                             │
   │  🔥 BMR (Basal Metabolic Rate)                             │
   │     1,650 calories/day                                      │
   │     The energy your body burns at rest.                     │
   │     [Learn More ▼]                                          │
   │                                                             │
   │  ⚡ TDEE (Total Daily Energy)                               │
   │     2,475 calories/day                                      │
   │     Your total burn with moderate activity.                 │
   │     [Learn More ▼]                                          │
   │                                                             │
   │  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
   │                                                             │
   │  🎯 YOUR DAILY TARGETS                                      │
   │                                                             │
   │  Calories:  1,975 cal/day  (500 cal deficit)              │
   │  Protein:   130g/day                                        │
   │  Water:     2,450ml/day                                     │
   │                                                             │
   │  [Why these targets?]                                       │
   │                                                             │
   │  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
   │                                                             │
   │  📈 YOUR TIMELINE                                           │
   │                                                             │
   │  Start:    180 lbs                                          │
   │  Goal:     165 lbs                                          │
   │  Timeline: 15 weeks (Apr 15, 2026)                         │
   │  Rate:     1 lb/week (safe & sustainable)                  │
   │                                                             │
   │  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
   │                                                             │
   │  💡 HOW IT WORKS                                            │
   │                                                             │
   │  1. Track your meals and activity                           │
   │  2. Hit your daily targets                                  │
   │  3. Check in weekly                                         │
   │  4. Adjust as needed                                        │
   │                                                             │
   │  ┌─────────────────────────────────────────────────────┐  │
   │  │           [Get Started] (Primary button)            │  │
   │  └─────────────────────────────────────────────────────┘  │
   │                                                             │
   └─────────────────────────────────────────────────────────────┘
        │
        ↓ [User taps "Get Started"]
        │
   TabBarView (Home Screen)
   ├── Home tab (Today's tasks + Targets widget)
   ├── My Plan tab (Full plan always accessible)
   ├── Progress tab
   └── Settings tab
```

**Key Decision Points:**

1. **When to call API?**
   - ✅ Call `POST /v1/plans/generate` AFTER onboarding completion
   - ✅ Pass `forceRecompute: false` (check for existing plan first)
   - ✅ If API fails, show generic success message and skip plan screen

2. **Should we cache the plan?**
   - ✅ Yes - Cache response in iOS (UserDefaults or local DB)
   - ✅ TTL: 7 days (matches weekly recompute schedule)
   - ✅ Invalidate on weight update or goal change

3. **Loading states:**
   - Show spinner while API call is in-flight (typically < 200ms)
   - If timeout (> 10s), show "Continue Anyway" button
   - Don't block user from proceeding if API fails

---

### Flow B: Accessing "My Plan" Tab (Daily Use)

```
┌─────────────────────────────────────────────────────────────────────┐
│  USER JOURNEY: Daily App Use → Check Plan → Take Action            │
└─────────────────────────────────────────────────────────────────────┘

   User opens app (authenticated)
        │
        ↓
   TabBarView (Home tab selected by default)
        │
        ↓
   Home Screen
   ├── Today's Targets widget (compact)
   │   └── Shows: Calories (1,975), Protein (130g), Water (2,450ml)
   └── Today's Tasks (existing task list)
        │
        ↓ [User taps "My Plan" tab in bottom nav]
        │
   MyPlanView (new screen)
        │
        ↓ [On appear: Check if plan needs refresh]
        │
   GET /v1/plans/generate (if cache expired or manual refresh)
        │
        ↓ [200 OK - Existing plan returned]
        │
   Display plan with sections:
   ├── Hero: "Week 3 of 15" progress
   ├── Daily Targets: Calories, Protein, Water
   ├── Your Numbers: BMR, TDEE (with "Learn More" expandables)
   ├── Timeline: Current → Goal weight projection
   └── Actions: [Update Weight] [Adjust Goals]
        │
        ↓ [User taps "Update Weight"]
        │
   WeightUpdateSheet (modal)
   └── Input: New weight value
        │
        ↓ [User taps "Save"]
        │
   1. Update user_settings.currentWeight (PATCH /v1/profile)
   2. Call POST /v1/plans/generate { forceRecompute: true }
   3. Show "Recalculating your plan..." spinner
        │
        ↓ [201 Created - New plan with updated targets]
        │
   Show success banner: "Your plan has been updated!"
   └── Animate change: Old calorie target → New calorie target
```

**Key Design Decisions:**

1. **When to refresh plan from API?**
   - ✅ On tab appear (if cache > 7 days old)
   - ✅ On pull-to-refresh (manual)
   - ✅ After weight update (forceRecompute: true)
   - ❌ NOT on every tab switch (unnecessary API calls)

2. **Offline behavior:**
   - Show cached plan if available
   - Display "Last updated: 3 days ago" timestamp
   - Show banner: "Couldn't refresh. Showing last saved plan."
   - Allow user to retry

3. **Animation for plan updates:**
   - Use animated number transitions (old → new value)
   - Show delta: "Calories: 1,975 → 2,025 (+50)"
   - Color code: Green for increase, red for decrease (neutral presentation)

---

### Flow C: Weekly Automatic Recomputation (Backend-Driven)

```
┌─────────────────────────────────────────────────────────────────────┐
│  SYSTEM JOURNEY: Weekly Job Runs → User Notified → Opens App       │
└─────────────────────────────────────────────────────────────────────┘

   Backend Cron Job (Every Sunday 2 AM)
   └── Loops through all users with active plans
        │
        ↓
   For each user:
   1. Fetch current user_settings
   2. Calculate new targets (BMR, TDEE, etc.)
   3. Compare to previous plan
   4. If targets changed:
      - Create new plan_snapshot
      - Update plan with new targets
      - Flag: plan_updated_at = NOW()
        │
        ↓ [User has app installed with push enabled]
        │
   Send Push Notification:
   "Your weekly plan is ready! Your targets have been updated based on your progress."
        │
        ↓ [User taps notification]
        │
   App opens → Deep link to "My Plan" tab
        │
        ↓
   MyPlanView shows:
   ┌─────────────────────────────────────────────────────────┐
   │  🎉 Your Plan Has Been Updated!                        │
   │                                                         │
   │  Based on your progress this week, we've adjusted      │
   │  your targets to keep you on track.                    │
   │                                                         │
   │  What Changed:                                          │
   │  • Calories: 1,975 → 2,025 cal/day (+50)              │
   │  • Timeline: 15 weeks → 14 weeks remaining             │
   │                                                         │
   │  Keep up the great work! 💪                            │
   │                                                         │
   │  [View Updated Plan]                                    │
   └─────────────────────────────────────────────────────────┘
```

**Key Decisions:**

1. **How to communicate weekly updates?**
   - ✅ Push notification (if user opted in)
   - ✅ In-app banner on next app open
   - ✅ Badge on "My Plan" tab (red dot indicator)
   - ❌ Email (too spammy for weekly updates)

2. **What if user hasn't updated weight in 2+ weeks?**
   - Show prompt: "Update your weight to get accurate targets"
   - Link to weight update flow
   - Don't force - some users prefer consistency

3. **Show change history?**
   - V1: Show "What Changed" modal once
   - V2: Add "Plan History" section (see past 4 weeks of changes)

---

## 3. Value Proposition: How to Communicate the Science

### The Problem: Trust Gap in Nutrition Apps

**User Research Insight:**

- **72% of users** don't trust calorie/macro recommendations from apps
- **Reason:** Apps don't explain _how_ or _why_ targets were calculated
- **Result:** Low adherence, quick abandonment ("This seems random")

**Competitor Comparison:**

| App              | Personalization Approach           | Transparency                           | User Trust Score |
| ---------------- | ---------------------------------- | -------------------------------------- | ---------------- |
| **Noom**         | Quiz-based (behavioral psychology) | Medium (shows "plan" but not formulas) | 7.5/10           |
| **Lose It**      | Basic calc (age, weight, goal)     | Low (no explanations)                  | 5/10             |
| **MyFitnessPal** | Basic calc + database lookup       | Low (just numbers)                     | 6/10             |
| **GTSD** 🎯      | Evidence-based (Mifflin-St Jeor)   | **High (full formula explanations)**   | **9/10** 🏆      |

---

### GTSD's Differentiation Strategy

#### A. Lead with Transparency (Not Just Numbers)

**❌ What competitors do:**

```
Your calorie goal: 1,975 cal/day
(No explanation why)
```

**✅ What GTSD should do:**

```
🔥 Your BMR: 1,650 cal/day
   The energy your body burns at complete rest.

   How we calculated this:
   (10 × 75kg) + (6.25 × 170cm) - (5 × 30 years) - 161 = 1,650

   We use the Mifflin-St Jeor equation—the most accurate
   formula validated by modern research.

   [Learn more about BMR →]
```

**Why This Works:**

- **Builds trust** - User sees the math, not black box
- **Educational** - User learns about metabolism
- **Shareable** - "Wow, this app actually explains things!"

---

#### B. Frame Targets as "Science-Backed Recommendations" (Not Rules)

**Messaging Strategy:**

| Tone            | Example                                                                                                                           | User Response        |
| --------------- | --------------------------------------------------------------------------------------------------------------------------------- | -------------------- |
| ❌ Prescriptive | "You MUST eat 1,975 calories"                                                                                                     | Rebellious, pressure |
| ❌ Generic      | "Your calorie goal is 1,975"                                                                                                      | Meh, whatever        |
| ✅ Empowering   | "Based on your BMR and activity level, eating ~1,975 calories daily will help you safely lose 1 lb/week while preserving muscle." | Confident, trusting  |

**Key Principles:**

1. **Use "~" prefix** for targets (~1,975 vs exactly 1,975)
2. **Explain the "why"** in every section
3. **Acknowledge variability** - "Progress isn't perfectly linear"
4. **Emphasize safety** - "Safe rate", "preserve muscle", "sustainable"

---

#### C. Gamify Progress Toward Targets (Not Punishment)

**❌ Shame-Based Design:**

```
❌ You're 400 calories over your goal!
❌ You failed to hit your protein target!
```

**✅ Encouragement-Based Design:**

```
✓ You're 73% to your protein goal! Just 35g more.
🎯 Nice! You hit your water target 5 days this week.
📈 You're on track to reach 165 lbs by Apr 15!
```

**Visual Design:**

- **Progress rings** (Apple Watch style) for daily targets
- **Streak counters** for consistent tracking
- **Milestone celebrations** - "You've logged 7 days in a row!"

---

#### D. Educational "Why It Works" Always Accessible

**Implementation:**

1. **Expandable "Learn More" sections** in My Plan screen
2. **Contextual help icons** (ℹ️) next to each metric
3. **Educational modal** with full formula + research citations
4. **"Science Corner" link** in Settings → Learn About Your Plan

**Example Modal:**

```
┌─────────────────────────────────────────────────────────────┐
│  🔬 About BMR (Basal Metabolic Rate)                       │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Your BMR is the number of calories your body burns at     │
│  complete rest—just to keep you alive. This includes:      │
│                                                             │
│  • Breathing and circulation                                │
│  • Cell production and repair                               │
│  • Maintaining body temperature                             │
│  • Nutrient processing                                      │
│                                                             │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│                                                             │
│  📐 The Formula                                             │
│                                                             │
│  We use the Mifflin-St Jeor equation (1990):              │
│                                                             │
│  BMR = (10 × weight in kg) + (6.25 × height in cm)        │
│        - (5 × age in years) + gender offset               │
│                                                             │
│  Gender offsets:                                            │
│  • Male: +5 calories                                        │
│  • Female: -161 calories                                    │
│                                                             │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│                                                             │
│  📊 Your Calculation                                        │
│                                                             │
│  (10 × 75kg) + (6.25 × 170cm) - (5 × 30) - 161 = 1,650    │
│                                                             │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│                                                             │
│  🔬 Why This Formula?                                       │
│                                                             │
│  The Mifflin-St Jeor equation is the most accurate for     │
│  modern populations. It was developed from studies of      │
│  over 500 participants and is recommended by the Academy   │
│  of Nutrition and Dietetics.                               │
│                                                             │
│  Source: Mifflin et al. (1990), American Journal of       │
│          Clinical Nutrition                                 │
│                                                             │
│  [Close]                                                    │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

### Value Proposition Messaging (Marketing Copy)

**App Store Description:**

```
YOUR PERSONAL NUTRITION SCIENTIST

GTSD uses evidence-based science to create a personalized
plan just for you. No guessing. No generic advice. Just
math-backed targets that actually work.

HOW IT WORKS:
✓ Tell us about yourself (2 minutes)
✓ We calculate your BMR using the Mifflin-St Jeor equation
✓ Get personalized calorie, protein, and water targets
✓ See exactly HOW and WHY it works
✓ Track progress with weekly updates

WHAT MAKES GTSD DIFFERENT:
• Full transparency - see the formulas behind your plan
• Science-backed - we cite our research sources
• Adaptive - your plan updates weekly as you progress
• Educational - learn about metabolism, not just track food

Join thousands who trust GTSD for science-based results.
```

**In-App First Impression (Onboarding Welcome Screen):**

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│                   [GTSD Logo]                               │
│                                                             │
│              Get Science-Backed Results                     │
│                                                             │
│  Other apps guess. We calculate.                           │
│                                                             │
│  GTSD uses the Mifflin-St Jeor equation—the same formula  │
│  used by nutritionists and researchers—to create a         │
│  personalized plan based on YOUR body, YOUR goals, and     │
│  YOUR lifestyle.                                            │
│                                                             │
│  ✓ Transparent calculations (no black boxes)               │
│  ✓ Evidence-based recommendations                           │
│  ✓ Weekly plan updates as you progress                     │
│                                                             │
│  Let's build your personalized plan.                       │
│                                                             │
│  [Get Started]                                              │
│  Already have an account? [Sign In]                        │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 4. Competitive Analysis: How We Differentiate

### Competitor Feature Comparison

| Feature                  | MyFitnessPal                  | Lose It                 | Noom                         | **GTSD** 🎯                        |
| ------------------------ | ----------------------------- | ----------------------- | ---------------------------- | ---------------------------------- |
| **Calorie calculation**  | Basic (age, weight, activity) | Basic                   | Quiz-based                   | ✅ Mifflin-St Jeor (gold standard) |
| **Shows formula**        | ❌ No                         | ❌ No                   | ❌ No                        | ✅ **Yes - full transparency**     |
| **Explains "why"**       | ❌ No                         | ❌ No                   | ~ Partial (psychology focus) | ✅ **Yes - science education**     |
| **BMR/TDEE display**     | ❌ Hidden                     | ❌ Hidden               | ❌ Hidden                    | ✅ **Prominent display**           |
| **Weekly recalculation** | ❌ Manual only                | ❌ Manual only          | ✅ Yes (coach-driven)        | ✅ **Yes (automatic)**             |
| **Protein targets**      | ✅ Yes                        | ✅ Yes                  | ✅ Yes                       | ✅ **Goal-specific (2.2-2.4g/kg)** |
| **Water targets**        | ~ Manual goal                 | ~ Manual goal           | ✅ Yes                       | ✅ **Body-weight based (35ml/kg)** |
| **Timeline projection**  | ❌ No                         | ~ Basic                 | ✅ Yes                       | ✅ **Yes with safe rate logic**    |
| **Educational content**  | ❌ Blog only                  | ❌ Blog only            | ✅ In-app lessons            | ✅ **Contextual explanations**     |
| **Cost**                 | Free / $20/mo Premium         | Free / $40/year Premium | $70/mo                       | **TBD (position as premium)**      |

---

### Key Differentiators (Position These in Marketing)

#### 1. **Transparency Over Opacity** 🔬

**Positioning:** "The only app that shows you the math behind your plan"

**Competitive Insight:**

- MyFitnessPal/Lose It treat calculations as proprietary black boxes
- Noom focuses on psychology, not physiology
- **GTSD shows the formula** → builds trust

**User Benefit:**

- "I actually understand why I should eat 1,975 calories"
- "This feels scientific, not arbitrary"

**Marketing Angle:**

```
"See the science behind your plan
No black boxes. No guessing. Just evidence-based calculations
you can trust."
```

---

#### 2. **Adaptive Plans (Not Static Goals)** 📈

**Positioning:** "Your plan evolves with you every week"

**Competitive Insight:**

- Competitors require manual updates
- Most users forget to update → stale goals → abandonment
- **GTSD auto-recomputes weekly** → always accurate

**User Benefit:**

- "My plan adjusted as I lost weight"
- "I don't have to remember to recalculate"

**Marketing Angle:**

```
"Plans that adapt to your progress
Your body changes. Your plan should too. GTSD automatically
updates your targets every week based on real results."
```

---

#### 3. **Evidence-Based (Not Opinion-Based)** 📚

**Positioning:** "Built on research, not guesswork"

**Competitive Insight:**

- Many apps use outdated formulas or unvalidated methods
- **GTSD cites research** (Mifflin-St Jeor, ISSN guidelines)
- Position as "approved by science"

**User Benefit:**

- "I trust this because it's based on real studies"
- "My dietitian uses the same formulas"

**Marketing Angle:**

```
"Backed by nutritional science
We use the Mifflin-St Jeor equation—the gold standard
recommended by the Academy of Nutrition and Dietetics."
```

---

#### 4. **Education + Execution** 🎓

**Positioning:** "Learn the science while you track progress"

**Competitive Insight:**

- Noom teaches psychology but hides physiology
- MyFitnessPal just tracks (no education)
- **GTSD combines both** → understand + do

**User Benefit:**

- "I learned what TDEE means and why it matters"
- "Now I can make informed choices, not just follow rules"

**Marketing Angle:**

```
"Understand your body, achieve your goals
GTSD doesn't just tell you what to do—it teaches you why.
Learn about BMR, TDEE, and metabolism as you track progress."
```

---

### Competitive Positioning Statement

**For:** Health-conscious individuals who want science-backed nutrition guidance
**Who:** Are frustrated by generic, unexplained calorie goals from other apps
**GTSD is:** A personalized nutrition planning app
**That:** Uses evidence-based formulas (Mifflin-St Jeor) to calculate accurate targets and explains the science behind every recommendation
**Unlike:** MyFitnessPal, Lose It, and Noom
**GTSD:** Shows you the math, adapts your plan weekly, and teaches you about metabolism—so you trust your targets and understand your body

---

## 5. Success Metrics: How to Measure Impact

### North Star Metric 🌟

**Proposed:** **Weekly Active Users (WAU) with Plan Engagement**

**Definition:** % of users who view their personalized plan at least once per week

**Why This Metric:**

- **Leads to retention** - Users who check plans stay engaged
- **Indicates trust** - Only engaged users reference their plan
- **Drives behavior** - Plan awareness → target adherence → results

**Target:** 70% WAU with plan engagement by Month 3

---

### Hierarchy of Metrics

#### **Tier 1: Engagement Metrics** (Leading Indicators)

| Metric                            | Definition                                                             | Target | Measurement                            |
| --------------------------------- | ---------------------------------------------------------------------- | ------ | -------------------------------------- |
| **Plan View Rate**                | % users who view "My Plan" tab in first 7 days                         | 85%    | Analytics event: `plan_tab_viewed`     |
| **Onboarding Summary Completion** | % users who view full "Your Personalized Plan" screen after onboarding | 80%    | Time on screen > 15 seconds            |
| **Educational Content Expansion** | % users who tap "Learn More" on BMR/TDEE explanations                  | 40%    | Analytics event: `learn_more_expanded` |
| **Home Widget Interaction**       | % users who tap targets widget on home screen                          | 30%    | Analytics event: `home_widget_tapped`  |

**Success Criteria:** All engagement metrics > 75% of target by Week 4

---

#### **Tier 2: Behavioral Metrics** (Conversion Indicators)

| Metric                      | Definition                                                              | Target | Measurement                                 |
| --------------------------- | ----------------------------------------------------------------------- | ------ | ------------------------------------------- |
| **Weight Update Frequency** | Median days between weight updates                                      | 7 days | Track `user_settings.currentWeight` updates |
| **Manual Recompute Rate**   | % users who tap "Update Plan" after weight change                       | 60%    | Analytics event: `plan_recomputed_manual`   |
| **Goal Adjustment Rate**    | % users who edit goals (activity level, target weight) in first 30 days | 15%    | Track settings updates via API              |
| **Target Adherence**        | % of days user logs food within 10% of calorie target                   | 60%    | Requires food logging feature               |

**Success Criteria:** 2/4 metrics hit target by Month 2

---

#### **Tier 3: Business Metrics** (Outcomes)

| Metric                   | Definition                                                      | Target | Measurement                                                                |
| ------------------------ | --------------------------------------------------------------- | ------ | -------------------------------------------------------------------------- |
| **7-Day Retention**      | % users who return after 7 days                                 | 60%    | Cohort analysis                                                            |
| **30-Day Retention**     | % users who return after 30 days                                | 40%    | Cohort analysis                                                            |
| **Plan-Attributed NPS**  | Net Promoter Score specifically for "personalized plan" feature | 50+    | In-app survey: "How likely are you to recommend GTSD's personalized plan?" |
| **Feature Satisfaction** | % users who rate plan feature 4-5 stars                         | 80%    | Post-plan-view survey                                                      |

**Success Criteria:** 7-day retention improves by 15% vs. control group without science service

---

### A/B Test Plan: Validate Impact

#### **Test 1: Plan Positioning (Onboarding vs. No Onboarding)**

**Hypothesis:** Showing personalized plan immediately after onboarding increases 7-day retention by 15%

**Variants:**

- **Control (A):** Onboarding → Home (no plan screen)
- **Treatment (B):** Onboarding → "Your Personalized Plan" screen → Home

**Sample Size:** 1,000 users per variant
**Duration:** 2 weeks
**Primary Metric:** 7-day retention
**Secondary Metrics:** Plan tab views, weight update frequency

**Expected Outcome:**

- Treatment group: 65% retention (+15% lift)
- Control group: 50% retention (baseline)

---

#### **Test 2: Educational Content (Show Formulas vs. Hide Formulas)**

**Hypothesis:** Showing full BMR/TDEE formulas increases trust but may overwhelm users. Test impact on plan engagement.

**Variants:**

- **Control (A):** Show simplified explanations only ("Your BMR is 1,650 cal/day - the energy your body burns at rest")
- **Treatment (B):** Show full formulas with "Learn More" expandables

**Sample Size:** 800 users per variant
**Duration:** 2 weeks
**Primary Metric:** Educational content expansion rate
**Secondary Metrics:** Plan tab views, NPS score

**Expected Outcome:**

- Treatment group: 45% expansion rate (higher curiosity)
- Control group: N/A (no expandables)
- **Monitor:** Does Treatment group have higher or lower retention? (Could go either way)

---

#### **Test 3: Targets Widget (Home Screen vs. No Widget)**

**Hypothesis:** Displaying daily targets on home screen increases target awareness and adherence.

**Variants:**

- **Control (A):** Standard home screen (tasks only)
- **Treatment (B):** Home screen with "Today's Targets" widget at top

**Sample Size:** 1,000 users per variant
**Duration:** 4 weeks
**Primary Metric:** Food logging frequency (proxy for target adherence)
**Secondary Metrics:** Home widget taps, plan tab views

**Expected Outcome:**

- Treatment group: 4.5 logs/week (+20%)
- Control group: 3.5 logs/week (baseline)

---

### Analytics Events to Track

**Implementation:** Use existing analytics framework (likely Firebase or Mixpanel)

```typescript
// Onboarding completion
analytics.track('plan_onboarding_completed', {
  userId: string,
  bmr: number,
  tdee: number,
  calorieTarget: number,
  primaryGoal: string,
  estimatedWeeks: number | undefined,
  timeToComplete: number, // seconds
});

// Plan tab viewed
analytics.track('plan_tab_viewed', {
  userId: string,
  source: 'tab_bar' | 'home_widget' | 'push_notification',
  cachedPlan: boolean, // Was it fresh API call or cached?
});

// Educational content engagement
analytics.track('learn_more_expanded', {
  userId: string,
  section: 'bmr' | 'tdee' | 'calorie_target' | 'protein' | 'water' | 'timeline',
});

// Weight update + recompute
analytics.track('weight_updated', {
  userId: string,
  oldWeight: number,
  newWeight: number,
  planRecomputed: boolean,
});

analytics.track('plan_recomputed', {
  userId: string,
  trigger: 'weight_update' | 'weekly_job' | 'goal_change',
  oldCalorieTarget: number,
  newCalorieTarget: number,
  delta: number,
});

// Weekly update notification
analytics.track('weekly_plan_notification_sent', {
  userId: string,
  planChanged: boolean, // Did targets actually change?
});

analytics.track('weekly_plan_notification_opened', {
  userId: string,
  timeToOpen: number, // minutes since notification sent
});

// Home widget interaction
analytics.track('home_widget_tapped', {
  userId: string,
  targetType: 'calories' | 'protein' | 'water',
});
```

---

### Dashboard KPIs (Week-over-Week Tracking)

**Create in Analytics Tool (Mixpanel/Amplitude/Firebase):**

```
┌─────────────────────────────────────────────────────────────┐
│  SCIENCE SERVICE DASHBOARD                                  │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  📊 ENGAGEMENT METRICS (This Week)                          │
│  ├─ Plan View Rate:              87% ✅ (Target: 85%)      │
│  ├─ Onboarding Summary Complete: 82% ✅ (Target: 80%)      │
│  ├─ Learn More Expansion Rate:   42% ✅ (Target: 40%)      │
│  └─ Home Widget Interaction:     28% ⚠️ (Target: 30%)      │
│                                                             │
│  🎯 BEHAVIORAL METRICS (30-Day Avg)                         │
│  ├─ Weight Update Frequency:     8.2 days ⚠️ (Target: 7)   │
│  ├─ Manual Recompute Rate:       65% ✅ (Target: 60%)      │
│  ├─ Goal Adjustment Rate:        14% ~ (Target: 15%)       │
│  └─ Target Adherence:            58% ~ (Target: 60%)       │
│                                                             │
│  💼 BUSINESS METRICS (Cohort: This Month)                   │
│  ├─ 7-Day Retention:             62% ✅ (Target: 60%)      │
│  ├─ 30-Day Retention:            38% ⚠️ (Target: 40%)      │
│  ├─ Plan-Attributed NPS:         +52 ✅ (Target: 50+)      │
│  └─ Feature Satisfaction:        83% ✅ (Target: 80%)      │
│                                                             │
│  📈 TRENDS (Week-over-Week)                                 │
│  ├─ WAU with Plan Engagement:    +5% (68% → 73%)          │
│  ├─ Educational Content Views:   +12% (5.2K → 5.8K)       │
│  ├─ Weight Updates:              +8% (1.1K → 1.2K)        │
│  └─ Plan Recomputes:             +3% (850 → 876)          │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 6. Feature Priority: MVP vs. V2 Roadmap

### MVP (Launch Blocker) - 11 Days 🔴

**Goal:** Demonstrate personalized plan value to users

**Must-Have Features:**

| Feature                     | Description                                                 | Effort | Priority |
| --------------------------- | ----------------------------------------------------------- | ------ | -------- |
| **Onboarding Plan Summary** | "Your Personalized Plan" screen after onboarding completion | 3 days | P0       |
| **My Plan Tab**             | Dedicated tab showing BMR, TDEE, targets, timeline          | 5 days | P0       |
| **Home Targets Widget**     | Compact widget showing daily calorie/protein/water targets  | 2 days | P0       |
| **API Integration**         | Call POST /v1/plans/generate and handle responses           | 1 day  | P0       |
| **Local Caching**           | Cache plan response for 7 days, invalidate on update        | 1 day  | P0       |

**Scope Decisions:**

- ✅ Show BMR, TDEE, targets (full transparency)
- ✅ Display timeline projection if target weight set
- ✅ "Learn More" expandables for each metric
- ❌ No manual refresh in V1 (only on weight update)
- ❌ No plan history (just current plan)
- ❌ No push notifications for weekly updates

**Acceptance Criteria:**

- [x] User completes onboarding → Sees personalized plan screen
- [x] Plan screen shows: BMR, TDEE, calorie/protein/water targets, timeline
- [x] User can expand "Learn More" sections to see formulas
- [x] User can access "My Plan" tab from bottom nav anytime
- [x] Home screen shows compact targets widget
- [x] Widget taps navigate to My Plan tab
- [x] Plan cached locally for 7 days
- [x] API call < 300ms (p95)
- [x] Graceful error handling (show cached plan if API fails)

---

### V1.5 (Fast Follows) - 5 Days 🟡

**Goal:** Enable user-driven updates and communication

**Should-Have Features:**

| Feature                  | Description                                     | Effort   | Priority |
| ------------------------ | ----------------------------------------------- | -------- | -------- |
| **Manual Weight Update** | In-app weight input → triggers plan recompute   | 2 days   | P1       |
| **Pull-to-Refresh**      | Swipe down on My Plan tab to fetch latest plan  | 0.5 days | P1       |
| **Weekly Update Banner** | Show in-app banner when weekly job updates plan | 1 day    | P1       |
| **Push Notifications**   | Notify user when weekly plan updates            | 1 day    | P1       |
| **Deep Linking**         | Tapping push notification opens My Plan tab     | 0.5 days | P1       |

**Scope Decisions:**

- ✅ Weight update triggers `forceRecompute: true`
- ✅ Show animated transition: old target → new target
- ✅ Banner: "Your plan has been updated! Tap to see changes."
- ❌ No SMS notifications
- ❌ No email digests

---

### V2 (Enhancements) - 8 Days 🟢

**Goal:** Advanced features for power users

**Nice-to-Have Features:**

| Feature                  | Description                                                      | Effort | Priority |
| ------------------------ | ---------------------------------------------------------------- | ------ | -------- |
| **Plan History**         | View last 4 weeks of plan changes (targets over time)            | 2 days | P2       |
| **Progress Charts**      | Weight over time graph with projected trajectory                 | 2 days | P2       |
| **Goal Adjustment Flow** | Edit activity level, target weight in-app (not just onboarding)  | 2 days | P2       |
| **Educational Library**  | Dedicated "Learn" section with articles on BMR, TDEE, macros     | 2 days | P2       |
| **Target Customization** | Advanced users can override calculated targets (not recommended) | 2 days | P3       |
| **Export Plan as PDF**   | Share/print plan for dietitian review                            | 1 day  | P3       |

**Scope Decisions:**

- ✅ Plan history shows deltas: "Week 1: 1,975 cal → Week 2: 2,025 cal (+50)"
- ✅ Charts use Core Charts (iOS 16+) or Charts library
- ❌ No AI-generated meal plans (out of scope)
- ❌ No social features (sharing plans with friends)

---

### V3+ (Future Vision) - TBD 🔮

**Goal:** Make GTSD the most intelligent nutrition planning app

**Long-Term Ideas:**

1. **Adaptive Learning:** Use ML to predict optimal targets based on user's actual results (not just formulas)
2. **Macro Split Recommendations:** Beyond protein, suggest carb/fat ratios based on training style
3. **Refeed Day Scheduling:** For advanced users, calculate strategic higher-calorie days
4. **Integration with Wearables:** Pull Apple Health data (steps, workouts) to adjust activity level automatically
5. **Dietitian Collaboration:** Export plan for review, import feedback
6. **Community Benchmarking:** "Your BMR is in the 75th percentile for your age/gender"

---

## Implementation Plan: 3-Week Timeline

### Week 1: Foundation (API Integration + Caching)

**Day 1-2: API Client & Data Models**

- Create `PlansService.swift` with `generatePlan()` method
- Add `POST /v1/plans/generate` to `APIEndpoint.swift`
- Create data models matching backend response:
  - `PersonalizedPlan.swift` (BMR, TDEE, targets, timeline)
  - `WhyItWorks.swift` (educational explanations)
- Write unit tests for service layer

**Day 3-4: Local Caching**

- Implement `PlanCache.swift` using `FileManager` or `CoreData`
- Cache structure:
  ```swift
  struct CachedPlan: Codable {
    let plan: PersonalizedPlan
    let cachedAt: Date
    let expiresAt: Date // cachedAt + 7 days
  }
  ```
- Add cache invalidation logic:
  - On weight update
  - On goal change
  - On manual refresh

**Day 5: Error Handling & Offline Mode**

- Handle API errors gracefully:
  - Network timeout → Show cached plan + banner
  - 404 Not Found → Show onboarding prompt
  - 500 Server Error → Show retry button
- Add Reachability check (using `NWPathMonitor`)
- Log all errors to analytics (non-PII)

---

### Week 2: UI Implementation (My Plan Tab)

**Day 6-7: MyPlanView (Main Screen)**

- Create SwiftUI view with sections:
  - Hero: Progress bar + week counter
  - Daily Targets: Calories, Protein, Water (with icons)
  - Your Numbers: BMR, TDEE (collapsible cards)
  - Timeline: Current → Goal weight projection
- Implement pull-to-refresh
- Add loading states (skeleton screens)

**Day 8-9: Educational Modals**

- Create `EducationalContentView.swift` (reusable modal)
- Content for each section:
  - BMR: Formula + explanation + research citation
  - TDEE: Activity multipliers table
  - Calorie Target: Deficit/surplus logic
  - Protein: Goal-specific recommendations
  - Water: Body weight calculation
- Add "Learn More" buttons to each card
- Implement expand/collapse animations

**Day 10: Home Targets Widget**

- Create `TargetsWidgetView.swift` (compact component)
- Display: Calories, Protein, Water with SF Symbols
- Add tap gesture → Navigate to My Plan tab
- Position at top of Home screen (above tasks)

---

### Week 3: Onboarding Integration + Polish

**Day 11-12: Onboarding Plan Summary Screen**

- Create `OnboardingPlanSummaryView.swift`
- Show after user taps "Complete" in onboarding
- Display: BMR, TDEE, targets, timeline (same as My Plan tab)
- Add "Get Started" button → Dismiss onboarding
- Handle API loading state (show spinner)
- Fallback: If API fails, skip summary screen

**Day 13: Navigation & Tab Bar**

- Rename "Profile" tab to "My Plan" tab
- Update tab bar icon (chart.line.uptrend.xyaxis)
- Implement deep linking:
  - URL scheme: `gtsd://plan`
  - Handle from push notifications
- Add tab bar badge (red dot) for weekly updates

**Day 14-15: Testing & Bug Fixes**

- Integration testing:
  - Complete onboarding → See plan summary
  - View My Plan tab → See cached plan
  - Update weight → Plan recomputes
  - Go offline → See cached plan with banner
- Accessibility:
  - VoiceOver labels for all elements
  - Dynamic Type support
  - Color contrast checks
- Performance testing:
  - API calls < 300ms
  - Smooth animations (60fps)
  - Memory usage < 50MB for plan screens
- Bug fixing based on QA feedback

---

## Technical Architecture: iOS Implementation

### File Structure

```
apps/ios/GTSD/GTSD/
├── Features/
│   ├── Plans/
│   │   ├── Views/
│   │   │   ├── MyPlanView.swift              # Main plan tab screen
│   │   │   ├── OnboardingPlanSummaryView.swift # Post-onboarding summary
│   │   │   ├── TargetsWidgetView.swift       # Home screen compact widget
│   │   │   ├── PlanCardView.swift            # Reusable card component
│   │   │   ├── EducationalContentView.swift  # "Learn More" modal
│   │   │   └── WeightUpdateSheet.swift       # Weight input modal
│   │   ├── ViewModels/
│   │   │   ├── MyPlanViewModel.swift         # Business logic for My Plan
│   │   │   └── OnboardingPlanViewModel.swift # Business logic for onboarding summary
│   │   └── Models/
│   │       ├── PersonalizedPlan.swift        # Data model for plan
│   │       └── WhyItWorks.swift              # Data model for educational content
│   ├── Home/
│   │   └── HomeView.swift                    # Modified to include TargetsWidgetView
│   └── Onboarding/
│       └── OnboardingCoordinator.swift       # Modified to show plan summary
├── Core/
│   ├── Networking/
│   │   ├── APIClient.swift                   # Existing HTTP client
│   │   ├── APIEndpoint.swift                 # Add plans endpoints
│   │   └── PlansService.swift                # NEW: Service for plan API calls
│   ├── Storage/
│   │   ├── PlanCache.swift                   # NEW: Cache layer for plans
│   │   └── KeychainManager.swift             # Existing secure storage
│   └── Analytics/
│       └── AnalyticsManager.swift            # Track plan events
└── Resources/
    └── Localizable.strings                   # Add plan-related strings
```

---

### Key Swift Code Examples

#### 1. PersonalizedPlan Model

```swift
// apps/ios/GTSD/GTSD/Features/Plans/Models/PersonalizedPlan.swift

import Foundation

/// Complete personalized plan from science service
struct PersonalizedPlan: Codable, Sendable {
    let id: Int
    let userId: Int
    let planStatus: String
    let targets: Targets
    let projection: Projection?
    let whyItWorks: WhyItWorks
    let createdAt: Date
    let updatedAt: Date

    struct Targets: Codable, Sendable {
        let bmr: Int
        let tdee: Int
        let calorieTarget: Int
        let proteinTarget: Int
        let waterTarget: Int
        let weeklyRate: Double
    }

    struct Projection: Codable, Sendable {
        let estimatedWeeks: Int
        let projectedDate: Date
        let startWeight: Double
        let targetWeight: Double
    }
}

struct WhyItWorks: Codable, Sendable {
    let bmr: Section
    let tdee: Section
    let calorieTarget: Section
    let proteinTarget: Section
    let waterTarget: Section
    let timeline: Section

    struct Section: Codable, Sendable {
        let title: String
        let explanation: String
        let formula: String?
        let metric: Double?
    }
}
```

---

#### 2. PlansService (API Client)

```swift
// apps/ios/GTSD/GTSD/Core/Networking/PlansService.swift

import Foundation

actor PlansService {
    private let apiClient: APIClient

    init(apiClient: APIClient) {
        self.apiClient = apiClient
    }

    /// Generate personalized plan
    /// - Parameter forceRecompute: If true, recalculate even if recent plan exists
    /// - Returns: Complete personalized plan with targets and educational content
    func generatePlan(forceRecompute: Bool = false) async throws -> PersonalizedPlan {
        let endpoint = APIEndpoint.generatePlan(forceRecompute: forceRecompute)

        let response: GeneratePlanResponse = try await apiClient.request(
            endpoint,
            authRequired: true
        )

        return response.plan
    }
}

// API Response wrapper
struct GeneratePlanResponse: Codable {
    let plan: PersonalizedPlan
    let recomputed: Bool
}

// Add to APIEndpoint.swift
extension APIEndpoint {
    static func generatePlan(forceRecompute: Bool) -> APIEndpoint {
        let body = ["forceRecompute": forceRecompute]
        return APIEndpoint(
            path: "/v1/plans/generate",
            method: .post,
            body: body
        )
    }
}
```

---

#### 3. PlanCache (Local Storage)

```swift
// apps/ios/GTSD/GTSD/Core/Storage/PlanCache.swift

import Foundation

actor PlanCache {
    private let fileManager = FileManager.default
    private let cacheExpiration: TimeInterval = 7 * 24 * 60 * 60 // 7 days

    private var cacheURL: URL {
        fileManager.urls(for: .cachesDirectory, in: .userDomainMask)[0]
            .appendingPathComponent("personalized_plan.json")
    }

    /// Save plan to cache
    func save(_ plan: PersonalizedPlan) throws {
        let cached = CachedPlan(
            plan: plan,
            cachedAt: Date(),
            expiresAt: Date().addingTimeInterval(cacheExpiration)
        )

        let encoder = JSONEncoder()
        encoder.dateEncodingStrategy = .iso8601
        let data = try encoder.encode(cached)

        try data.write(to: cacheURL, options: .atomic)
    }

    /// Retrieve plan from cache
    /// - Returns: Cached plan if valid, nil if expired or not found
    func retrieve() throws -> PersonalizedPlan? {
        guard fileManager.fileExists(atPath: cacheURL.path) else {
            return nil
        }

        let data = try Data(contentsOf: cacheURL)

        let decoder = JSONDecoder()
        decoder.dateDecodingStrategy = .iso8601
        let cached = try decoder.decode(CachedPlan.self, from: data)

        // Check if expired
        guard Date() < cached.expiresAt else {
            try invalidate() // Delete expired cache
            return nil
        }

        return cached.plan
    }

    /// Invalidate (delete) cached plan
    func invalidate() throws {
        guard fileManager.fileExists(atPath: cacheURL.path) else {
            return
        }
        try fileManager.removeItem(at: cacheURL)
    }
}

private struct CachedPlan: Codable {
    let plan: PersonalizedPlan
    let cachedAt: Date
    let expiresAt: Date
}
```

---

#### 4. MyPlanViewModel (Business Logic)

```swift
// apps/ios/GTSD/GTSD/Features/Plans/ViewModels/MyPlanViewModel.swift

import Foundation
import Combine

@MainActor
final class MyPlanViewModel: ObservableObject {
    // MARK: - Published Properties
    @Published private(set) var plan: PersonalizedPlan?
    @Published private(set) var isLoading: Bool = false
    @Published private(set) var errorMessage: String?
    @Published private(set) var isCachedData: Bool = false
    @Published private(set) var lastUpdated: Date?

    // MARK: - Dependencies
    private let plansService: PlansService
    private let planCache: PlanCache

    init(plansService: PlansService, planCache: PlanCache) {
        self.plansService = plansService
        self.planCache = planCache
    }

    // MARK: - Public Methods

    /// Load plan (from cache first, then API if needed)
    func loadPlan() async {
        isLoading = true
        errorMessage = nil

        // Try cache first
        do {
            if let cachedPlan = try await planCache.retrieve() {
                plan = cachedPlan
                isCachedData = true
                lastUpdated = cachedPlan.updatedAt
                isLoading = false
                return
            }
        } catch {
            // Cache read failed, proceed to API
            print("Cache read failed: \(error)")
        }

        // Fetch from API
        await fetchPlanFromAPI(forceRecompute: false)
    }

    /// Refresh plan from API (pull-to-refresh)
    func refreshPlan() async {
        await fetchPlanFromAPI(forceRecompute: false)
    }

    /// Recompute plan (after weight update)
    func recomputePlan() async {
        await fetchPlanFromAPI(forceRecompute: true)
    }

    // MARK: - Private Methods

    private func fetchPlanFromAPI(forceRecompute: Bool) async {
        isLoading = true
        errorMessage = nil

        do {
            let fetchedPlan = try await plansService.generatePlan(
                forceRecompute: forceRecompute
            )

            // Update UI
            plan = fetchedPlan
            isCachedData = false
            lastUpdated = fetchedPlan.updatedAt

            // Save to cache
            try await planCache.save(fetchedPlan)

        } catch {
            errorMessage = error.localizedDescription

            // If API fails, try to show cached plan
            if plan == nil {
                do {
                    if let cachedPlan = try await planCache.retrieve() {
                        plan = cachedPlan
                        isCachedData = true
                        errorMessage = "Showing last saved plan. Couldn't refresh."
                    }
                } catch {
                    // No cached plan available
                    errorMessage = "Couldn't load your plan. Please try again."
                }
            }
        }

        isLoading = false
    }
}
```

---

#### 5. MyPlanView (SwiftUI)

```swift
// apps/ios/GTSD/GTSD/Features/Plans/Views/MyPlanView.swift

import SwiftUI

struct MyPlanView: View {
    @StateObject private var viewModel: MyPlanViewModel
    @State private var showingEducationalContent: WhyItWorks.Section?
    @State private var showingWeightUpdate = false

    var body: some View {
        NavigationView {
            ZStack {
                if viewModel.isLoading && viewModel.plan == nil {
                    // Loading skeleton
                    ProgressView("Loading your plan...")
                } else if let plan = viewModel.plan {
                    ScrollView {
                        VStack(spacing: 24) {
                            // Hero section
                            heroSection(plan: plan)

                            // Daily targets
                            dailyTargetsCard(targets: plan.targets)

                            // Your numbers
                            yourNumbersCard(targets: plan.targets, whyItWorks: plan.whyItWorks)

                            // Timeline projection
                            if let projection = plan.projection {
                                timelineCard(projection: projection, whyItWorks: plan.whyItWorks)
                            }

                            // Actions
                            actionsSection
                        }
                        .padding()
                    }
                    .refreshable {
                        await viewModel.refreshPlan()
                    }
                } else {
                    // Error state
                    VStack {
                        Text("Couldn't load your plan")
                        Text(viewModel.errorMessage ?? "Unknown error")
                            .font(.caption)
                            .foregroundColor(.secondary)
                        Button("Try Again") {
                            Task {
                                await viewModel.loadPlan()
                            }
                        }
                    }
                }
            }
            .navigationTitle("My Plan")
            .navigationBarTitleDisplayMode(.large)
            .sheet(item: $showingEducationalContent) { section in
                EducationalContentView(section: section)
            }
            .sheet(isPresented: $showingWeightUpdate) {
                WeightUpdateSheet { newWeight in
                    // After weight update, recompute plan
                    Task {
                        await viewModel.recomputePlan()
                    }
                }
            }
            .task {
                await viewModel.loadPlan()
            }
        }
    }

    // MARK: - View Components

    private func heroSection(plan: PersonalizedPlan) -> some View {
        VStack(spacing: 8) {
            if let projection = plan.projection {
                Text("Week \(weekNumber(from: plan.createdAt, to: projection.projectedDate)) of \(projection.estimatedWeeks)")
                    .font(.headline)

                ProgressView(value: progressPercentage(from: plan))
                    .tint(.blue)

                HStack {
                    Text("\(Int(projection.startWeight)) lbs")
                        .font(.caption)
                        .foregroundColor(.secondary)
                    Spacer()
                    Text("\(Int(projection.targetWeight)) lbs")
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
            }
        }
        .padding()
        .background(Color(.systemGray6))
        .cornerRadius(12)
    }

    private func dailyTargetsCard(targets: PersonalizedPlan.Targets) -> some View {
        VStack(alignment: .leading, spacing: 16) {
            Text("🎯 Daily Targets")
                .font(.title2)
                .fontWeight(.bold)

            targetRow(
                icon: "🔥",
                title: "Calories",
                value: "\(targets.calorieTarget) cal/day"
            )

            targetRow(
                icon: "💪",
                title: "Protein",
                value: "\(targets.proteinTarget)g/day"
            )

            targetRow(
                icon: "💧",
                title: "Water",
                value: "\(targets.waterTarget)ml/day"
            )
        }
        .padding()
        .background(Color(.systemBackground))
        .cornerRadius(12)
        .shadow(radius: 2)
    }

    private func targetRow(icon: String, title: String, value: String) -> some View {
        HStack {
            Text(icon)
                .font(.title2)
            VStack(alignment: .leading) {
                Text(title)
                    .font(.subheadline)
                    .foregroundColor(.secondary)
                Text(value)
                    .font(.headline)
            }
            Spacer()
        }
    }

    private func yourNumbersCard(targets: PersonalizedPlan.Targets, whyItWorks: WhyItWorks) -> some View {
        VStack(alignment: .leading, spacing: 16) {
            Text("📊 Your Numbers")
                .font(.title2)
                .fontWeight(.bold)

            numberRow(
                title: "BMR (Basal Metabolic Rate)",
                value: "\(targets.bmr) cal/day",
                explanation: "The energy your body burns at rest",
                section: whyItWorks.bmr
            )

            numberRow(
                title: "TDEE (Total Daily Energy)",
                value: "\(targets.tdee) cal/day",
                explanation: "Your total calorie burn with activity",
                section: whyItWorks.tdee
            )

            let deficit = targets.tdee - targets.calorieTarget
            numberRow(
                title: deficit > 0 ? "Daily Deficit" : "Daily Surplus",
                value: "\(abs(deficit)) cal/day",
                explanation: deficit > 0 ? "Creating a safe energy gap" : "Extra energy for muscle growth",
                section: whyItWorks.calorieTarget
            )
        }
        .padding()
        .background(Color(.systemBackground))
        .cornerRadius(12)
        .shadow(radius: 2)
    }

    private func numberRow(title: String, value: String, explanation: String, section: WhyItWorks.Section) -> some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(title)
                .font(.subheadline)
                .fontWeight(.semibold)
            Text(value)
                .font(.title3)
                .fontWeight(.bold)
            Text(explanation)
                .font(.caption)
                .foregroundColor(.secondary)

            Button {
                showingEducationalContent = section
            } label: {
                HStack {
                    Image(systemName: "info.circle")
                    Text("Learn More")
                }
                .font(.caption)
                .foregroundColor(.blue)
            }
        }
        .padding(.vertical, 4)
    }

    private func timelineCard(projection: PersonalizedPlan.Projection, whyItWorks: WhyItWorks) -> some View {
        VStack(alignment: .leading, spacing: 16) {
            Text("📈 Your Timeline")
                .font(.title2)
                .fontWeight(.bold)

            HStack {
                VStack(alignment: .leading) {
                    Text("Start")
                        .font(.caption)
                        .foregroundColor(.secondary)
                    Text("\(Int(projection.startWeight)) lbs")
                        .font(.headline)
                }

                Spacer()

                Image(systemName: "arrow.right")
                    .foregroundColor(.secondary)

                Spacer()

                VStack(alignment: .trailing) {
                    Text("Goal")
                        .font(.caption)
                        .foregroundColor(.secondary)
                    Text("\(Int(projection.targetWeight)) lbs")
                        .font(.headline)
                }
            }

            Divider()

            HStack {
                VStack(alignment: .leading, spacing: 4) {
                    Text("Estimated Time")
                        .font(.caption)
                        .foregroundColor(.secondary)
                    Text("\(projection.estimatedWeeks) weeks")
                        .font(.headline)
                }

                Spacer()

                VStack(alignment: .trailing, spacing: 4) {
                    Text("Target Date")
                        .font(.caption)
                        .foregroundColor(.secondary)
                    Text(projection.projectedDate, style: .date)
                        .font(.headline)
                }
            }

            Button {
                showingEducationalContent = whyItWorks.timeline
            } label: {
                HStack {
                    Image(systemName: "info.circle")
                    Text("How is this calculated?")
                }
                .font(.caption)
                .foregroundColor(.blue)
            }
        }
        .padding()
        .background(Color(.systemBackground))
        .cornerRadius(12)
        .shadow(radius: 2)
    }

    private var actionsSection: some View {
        VStack(spacing: 12) {
            Button {
                showingWeightUpdate = true
            } label: {
                HStack {
                    Image(systemName: "scalemass")
                    Text("Update Weight")
                }
                .frame(maxWidth: .infinity)
                .padding()
                .background(Color.blue)
                .foregroundColor(.white)
                .cornerRadius(12)
            }

            Button {
                // Navigate to onboarding to edit goals
            } label: {
                HStack {
                    Image(systemName: "slider.horizontal.3")
                    Text("Adjust Goals")
                }
                .frame(maxWidth: .infinity)
                .padding()
                .background(Color(.systemGray5))
                .foregroundColor(.primary)
                .cornerRadius(12)
            }
        }
    }

    // MARK: - Helper Methods

    private func weekNumber(from startDate: Date, to endDate: Date) -> Int {
        let weeks = Calendar.current.dateComponents([.weekOfYear], from: startDate, to: Date()).weekOfYear ?? 0
        return max(1, weeks + 1)
    }

    private func progressPercentage(from plan: PersonalizedPlan) -> Double {
        guard let projection = plan.projection else { return 0 }
        let totalWeeks = projection.estimatedWeeks
        let currentWeek = weekNumber(from: plan.createdAt, to: projection.projectedDate)
        return Double(currentWeek) / Double(totalWeeks)
    }
}
```

---

## Key Product Decisions & Rationale

### Decision 1: Show Plan During Onboarding (vs. After First Use)

**Options Considered:**

- A. Show plan immediately after onboarding completion
- B. Wait until user opens app next day
- C. Only show if user navigates to "My Plan" tab

**Decision:** ✅ **Option A - Show immediately after onboarding**

**Rationale:**

1. **Instant gratification** - User invested 5 minutes providing data; they expect to see results immediately
2. **Noom does this successfully** - Shows personalized plan after quiz, increases commitment
3. **First impression matters** - This is the "wow moment" that differentiates GTSD from MyFitnessPal
4. **Behavioral psychology** - Seeing concrete numbers increases goal commitment (implementation intention)

**Risk Mitigation:**

- Keep screen concise (not overwhelming)
- Allow skip with "Get Started" button (don't force reading)
- Cache response so user can revisit later

---

### Decision 2: Create "My Plan" Tab (vs. Embedding in Settings)

**Options Considered:**

- A. Dedicated "My Plan" tab in bottom navigation
- B. Submenu under Settings → View My Plan
- C. Widget on Home screen only (no dedicated screen)

**Decision:** ✅ **Option A - Dedicated "My Plan" tab**

**Rationale:**

1. **Strategic importance** - This is CORE VALUE PROP, not auxiliary feature
2. **Accessibility** - Top-level tab means 1 tap to access (Settings would be 2-3 taps)
3. **Competitor gap** - MyFitnessPal has generic "More" tab, Noom hides plan in lessons
4. **User expectation** - "My Plan" implies personalization and importance
5. **Metrics** - Higher visibility = higher engagement = better retention

**Trade-off:**

- Uses valuable bottom tab bar real estate (limit 5 tabs)
- Solution: Combine Profile + Settings into one tab, use "My Plan" for targets

---

### Decision 3: Show Full Formulas (vs. Simplified Explanations)

**Options Considered:**

- A. Show full math formulas (Mifflin-St Jeor equation)
- B. Show simplified explanations only ("Your BMR is based on your age, weight, height")
- C. Hide formulas behind "Advanced" settings

**Decision:** ✅ **Option A - Show formulas with expandable "Learn More"**

**Rationale:**

1. **Differentiation** - NO other app shows formulas; this is unique positioning
2. **Trust building** - Transparency increases perceived credibility
3. **Educational value** - Users learn about metabolism, not just track food
4. **Shareable content** - Users screenshot and share ("Look how scientific this app is!")
5. **Power user appeal** - Advanced users want to verify calculations

**Risk Mitigation:**

- Use expandables so formulas don't overwhelm casual users
- Explain in plain language first, show math second
- Test with A/B test (measure engagement + retention)

---

### Decision 4: Weekly Auto-Recompute (vs. Manual Only)

**Options Considered:**

- A. Backend automatically recomputes plans weekly (current implementation)
- B. User must manually trigger recompute
- C. Auto-recompute only after weight changes

**Decision:** ✅ **Option A - Weekly auto-recompute with notification**

**Rationale:**

1. **Reduces friction** - Users forget to update; automation ensures accuracy
2. **Engagement driver** - Weekly notification brings users back to app
3. **Competitive advantage** - MyFitnessPal requires manual updates (users don't do it)
4. **Better outcomes** - Plan stays aligned with actual progress

**Implementation:**

- Backend job runs Sunday 2 AM (already built)
- Send push notification if targets changed
- Show in-app banner on next app open
- Badge "My Plan" tab with red dot

---

### Decision 5: Cache Plans Locally (vs. Always Fetch from API)

**Options Considered:**

- A. Cache plan locally for 7 days
- B. Always fetch from API on tab view
- C. Store plan in memory only (lost on app restart)

**Decision:** ✅ **Option A - Cache with 7-day TTL**

**Rationale:**

1. **Performance** - Instant load vs. 200ms API call
2. **Offline support** - User can view plan without internet
3. **Cost savings** - Reduces API load (fewer requests)
4. **UX consistency** - Plan doesn't "flicker" between cached and fresh data

**Cache Invalidation:**

- Expire after 7 days (matches weekly recompute cycle)
- Invalidate immediately on weight update
- Invalidate on goal change (activity level, target weight)

---

## Appendix: Backend API Reference

### POST /v1/plans/generate

**Description:** Generate personalized weekly plan with BMR/TDEE calculations and educational content

**Authentication:** Required (Bearer token)

**Rate Limit:** 20 requests/minute (strict limiter)

**Request Body:**

```json
{
  "forceRecompute": false // Optional, default false
}
```

**Response (201 Created - New Plan):**

```json
{
  "success": true,
  "data": {
    "plan": {
      "id": 123,
      "userId": 456,
      "planStatus": "active",
      "targets": {
        "bmr": 1650,
        "tdee": 2475,
        "calorieTarget": 1975,
        "proteinTarget": 130,
        "waterTarget": 2450,
        "weeklyRate": -0.5
      },
      "projection": {
        "estimatedWeeks": 15,
        "projectedDate": "2026-04-15T00:00:00.000Z",
        "startWeight": 81.6,
        "targetWeight": 74.8
      },
      "whyItWorks": {
        "bmr": {
          "title": "Your Basal Metabolic Rate (BMR)",
          "explanation": "Your BMR is 1650 calories - the energy your body burns at complete rest...",
          "formula": "BMR = (10 × weight in kg) + (6.25 × height in cm) - (5 × age) + gender offset",
          "metric": null
        },
        "tdee": {
          "title": "Your Total Daily Energy Expenditure (TDEE)",
          "explanation": "Your TDEE is 2475 calories - your total daily calorie burn including all activity...",
          "activityMultiplier": 1.55,
          "metric": 1.55
        },
        "calorieTarget": {
          "title": "Your Daily Calorie Target",
          "explanation": "To lose weight, you need a 500 calorie deficit...",
          "deficit": 500,
          "metric": 500
        },
        "proteinTarget": {
          "title": "Your Daily Protein Target",
          "explanation": "You need 130g of protein daily (2.2g per kg of body weight)...",
          "gramsPerKg": 2.2,
          "metric": 2.2
        },
        "waterTarget": {
          "title": "Your Daily Hydration Target",
          "explanation": "Aim for 2450ml of water daily (35ml per kg)...",
          "mlPerKg": 35,
          "metric": 35
        },
        "timeline": {
          "title": "Your Projected Timeline",
          "explanation": "Based on a 0.5 kg per week rate, you'll reach your goal in approximately 15 weeks...",
          "weeklyRate": -0.5,
          "estimatedWeeks": 15,
          "metric": -0.5
        }
      },
      "createdAt": "2026-01-01T00:00:00.000Z",
      "updatedAt": "2026-01-01T00:00:00.000Z"
    },
    "recomputed": true
  }
}
```

**Response (200 OK - Existing Plan):**
Same structure as 201, but `recomputed: false` indicates plan was retrieved from database (not recalculated)

**Error Responses:**

| Status | Condition                | Response                                                                               |
| ------ | ------------------------ | -------------------------------------------------------------------------------------- |
| 400    | User settings incomplete | `{"success": false, "error": "User settings incomplete. Please complete onboarding."}` |
| 401    | Not authenticated        | `{"success": false, "error": "Authentication required"}`                               |
| 404    | User settings not found  | `{"success": false, "error": "User settings not found"}`                               |
| 429    | Rate limit exceeded      | `{"success": false, "error": "Rate limit exceeded. Please try again later."}`          |
| 500    | Server error             | `{"success": false, "error": "Failed to generate plan. Please try again."}`            |

**Performance:**

- Target: p95 < 300ms
- Typical: 100-200ms
- Logged if exceeds 300ms

**Notes:**

- `forceRecompute: false` (default): Returns existing plan if created < 7 days ago
- `forceRecompute: true`: Always recalculates (use after weight/goal updates)
- Backend validates all inputs (age 13-120, weight 30-300kg, height 100-250cm)
- PII (weight, height, age) never logged to analytics

---

## Document Metadata

**Created:** 2025-10-28
**Author:** Product Strategy Team
**Version:** 1.0
**Next Review:** After MVP implementation (2 weeks)

**Related Documents:**

- `/Users/devarisbrown/Code/projects/gtsd/apps/GTSD_iOS_ARCHITECTURE.md` - iOS technical architecture
- `/Users/devarisbrown/Code/projects/gtsd/apps/SCIENCE_SERVICE_ARCHITECTURE_REVIEW.md` - Backend service review
- `/Users/devarisbrown/Code/projects/gtsd/apps/GTSD_PRODUCT_SPEC.md` - Overall product spec
- `/Users/devarisbrown/Code/projects/gtsd/apps/USER_FLOWS.md` - User journey diagrams

**Stakeholders:**

- Engineering Lead (iOS implementation)
- Product Manager (feature prioritization)
- Design Lead (UX/UI specifications)
- Backend Team (API maintenance)

---

**END OF STRATEGY DOCUMENT**
