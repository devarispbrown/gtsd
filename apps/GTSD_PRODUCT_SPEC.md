# GTSD Product Specification: Onboarding Enhancement Features

**Document Version:** 1.0
**Date:** 2025-10-27
**Product:** GTSD iOS App
**Features:** Zero State for Skipped Onboarding & Metrics Summary After Onboarding

---

## Executive Summary

This specification defines two critical user experience enhancements for GTSD's onboarding flow:

1. **Zero State for Skipped Onboarding** - Encourages profile completion for users who skip onboarding
2. **Metrics Summary After Onboarding** - Builds trust by transparently showing personalized calculations

### Current State Analysis

**User Flow:**

- User signs up → Optional onboarding → Home screen with tasks
- Backend endpoint exists: `GET /v1/summary/how-it-works` (already implemented)
- Skip functionality sends default values (age: 25, weight: 0, height: 0, goal: improve_health)

**Problems:**

1. Users who skip see no health metrics or personalized guidance
2. Users who complete onboarding never see what was calculated or why
3. No incentive to complete profile after skipping
4. Lack of transparency reduces trust in personalized recommendations

---

## Feature 1: Zero State for Skipped Onboarding

### Problem Statement

**User Story:** As a user who skipped onboarding, I want to understand the value of completing my profile so that I'm motivated to provide my health information.

**Current Behavior:**

- User skips onboarding → sent to Home screen with generic task functionality
- No indication that personalized features are unavailable
- No easy path to complete profile later
- User doesn't understand what they're missing

**Impact:** Reduced engagement, no personalized health tracking, lower retention

### Solution Overview

Display contextual zero states in health-related screens when profile data is incomplete, encouraging users to complete their profile with clear value propositions.

### User Experience Design

#### 1.1 Where to Show Zero States

**Primary Location: Profile Tab**

- Most intuitive place for profile completion
- Low friction - user is already exploring their profile
- Can show both zero state AND edit profile CTA

**Secondary Locations (Future Consideration):**

- Home screen (if/when we add health metrics widgets)
- Dedicated "Health" or "Progress" tab (if added later)

#### 1.2 Zero State Screen Design

**Location:** ProfileView.swift (modify existing)

**Visual Hierarchy:**

```
┌─────────────────────────────────┐
│       Profile (Navigation)      │
├─────────────────────────────────┤
│                                 │
│    [Icon: figure.mixed.cardio]  │
│         (SF Symbol, 80pt)       │
│                                 │
│   Complete Your Health Profile  │
│         (Headline Bold)         │
│                                 │
│  Unlock personalized nutrition  │
│  goals, calorie targets, and    │
│  science-backed recommendations │
│     tailored just for you.      │
│         (Body Medium)           │
│                                 │
│  ┌───────────────────────────┐  │
│  │  Complete Profile (CTA)   │  │
│  └───────────────────────────┘  │
│                                 │
│         Maybe Later (Link)      │
│                                 │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│                                 │
│     What You'll Get:            │
│                                 │
│  🎯 Daily calorie target        │
│  💪 Protein & water goals       │
│  📊 Science-based calculations  │
│  📈 Personalized progress plan  │
│                                 │
└─────────────────────────────────┘
```

#### 1.3 Microcopy & Messaging

**Primary Headline:**

- "Complete Your Health Profile"
- Alternative: "Set Up Your Health Goals"

**Body Copy:**

- "Unlock personalized nutrition goals, calorie targets, and science-backed recommendations tailored just for you."

**Primary CTA:**

- "Complete Profile" (Primary button style)

**Secondary CTA:**

- "Maybe Later" (Text link, subtle)

**Benefits List:**

- 🎯 Daily calorie target based on your goals
- 💪 Protein & water intake recommendations
- 📊 BMR and TDEE calculations explained
- 📈 Personalized weight projection timeline

**Tone:** Encouraging, benefit-focused, non-judgmental

#### 1.4 User Flow

```
┌─────────────┐
│ User Skips  │
│ Onboarding  │
└──────┬──────┘
       │
       ↓
┌─────────────┐
│  Home Tab   │ (Works normally with tasks)
└──────┬──────┘
       │
       ↓
┌─────────────┐
│Profile Tab  │ ← User navigates
└──────┬──────┘
       │
       ↓
┌─────────────────────┐
│ Zero State Detected │ (hasCompletedOnboarding = false OR
│                     │  userSettings.height = 0)
└──────┬──────────────┘
       │
       ↓
┌──────────────────────┐
│ Show Zero State View │
└──────┬───────────────┘
       │
       ├─────→ "Complete Profile" → Open OnboardingCoordinator
       │                            (Start at step 1: AccountBasicsView)
       │
       └─────→ "Maybe Later" → Dismiss (stay on Profile)
```

#### 1.5 Detection Logic

**Condition for Zero State:**

```swift
func shouldShowZeroState(user: User, settings: UserSettings?) -> Bool {
    // Show zero state if:
    // 1. User hasn't completed onboarding OR
    // 2. User has completed onboarding but with default/empty values

    if !user.hasCompletedOnboarding {
        return true
    }

    // Check if settings exist and have real data
    guard let settings = settings else {
        return true
    }

    // Check for placeholder/default values from skip flow
    let hasValidHeight = (settings.height ?? 0) > 0
    let hasValidWeight = (settings.currentWeight ?? 0) > 0

    return !hasValidHeight || !hasValidWeight
}
```

#### 1.6 Implementation Details

**Files to Modify:**

- `/Users/devarisbrown/Code/projects/gtsd/apps/GTSD/GTSD/Features/Profile/ProfileView.swift`
- `/Users/devarisbrown/Code/projects/gtsd/apps/GTSD/GTSD/Features/Profile/ProfileViewModel.swift`

**New Files to Create:**

- `/Users/devarisbrown/Code/projects/gtsd/apps/GTSD/GTSD/Features/Profile/ProfileZeroStateView.swift`

**API Integration:**

- Fetch user settings: `GET /v1/profile` (already exists)
- Check for valid profile data in response

**Data Models:**

```swift
// Add to User.swift or create UserSettings.swift
struct UserSettings: Codable {
    let height: Double?
    let currentWeight: Double?
    let targetWeight: Double?
    let bmr: Int?
    let tdee: Int?
    let calorieTarget: Int?
    let proteinTarget: Int?
    let waterTarget: Int?
    let onboardingCompleted: Bool
}
```

#### 1.7 Edge Cases

| Scenario                                                | Behavior                                                          |
| ------------------------------------------------------- | ----------------------------------------------------------------- |
| User skipped, then completes profile from Profile tab   | Zero state disappears, shows full profile with metrics            |
| User partially completed onboarding (entered some data) | Still show zero state if critical fields missing (height, weight) |
| Network error fetching settings                         | Show generic empty state with retry button                        |
| User dismisses "Maybe Later" multiple times             | Continue showing (don't track dismissals for v1)                  |
| User completes profile, then deletes data               | Zero state reappears (data-driven, not flag-driven)               |

### Success Metrics

**Primary Metrics:**

- **Profile Completion Rate:** % of users who skipped onboarding and later completed profile
  - Target: 25% completion within 7 days
- **Time to Profile Completion:** Median time from signup to profile completion
  - Target: < 3 days

**Secondary Metrics:**

- **Zero State Engagement:** % of users who tap "Complete Profile" vs "Maybe Later"
  - Target: 40% tap-through rate
- **Feature Discovery:** % of users who navigate to Profile tab within first session
  - Target: 60% within 24 hours

**Success Criteria:**

- 20%+ increase in profile completion rate vs. control (no zero state)
- 30%+ click-through rate on "Complete Profile" CTA
- < 5% increase in onboarding abandonment (ensure we're not being too pushy)

---

## Feature 2: Metrics Summary After Onboarding

### Problem Statement

**User Story:** As a user who completed onboarding, I want to understand how GTSD calculated my personalized targets so that I trust the recommendations and feel confident following the plan.

**Current Behavior:**

- User completes onboarding → Immediately lands on Home screen
- Never sees BMR, TDEE, calorie target, or explanations
- No transparency into "how it works"
- User might feel skeptical about recommendations

**Impact:** Lower trust, reduced adherence to recommendations, missed opportunity for user education

### Solution Overview

Show an educational "How GTSD Works for You" summary screen immediately after onboarding completion, explaining all calculated metrics with simple, science-backed explanations.

### User Experience Design

#### 2.1 When to Show Summary

**Trigger:** Immediately after completing onboarding (after tapping "Complete" button in ReviewView)

**Flow:**

```
OnboardingCoordinator (ReviewView)
  → [User taps "Complete"]
  → API POST /v1/onboarding (returns user object)
  → Show MetricsSummaryView (new screen)
  → [User taps "Get Started"]
  → Dismiss OnboardingCoordinator → TabBarView (Home)
```

#### 2.2 Summary Screen Design

**Screen Name:** MetricsSummaryView

**Layout:**

```
┌─────────────────────────────────────┐
│  How GTSD Works for You  (Nav Title)│
├─────────────────────────────────────┤
│                                     │
│  ScrollView                         │
│  ┌───────────────────────────────┐  │
│  │ 👋 Hi [Name]!                 │  │
│  │                               │  │
│  │ We've created a personalized  │  │
│  │ plan to help you [goal].      │  │
│  │ Here's how it works:          │  │
│  └───────────────────────────────┘  │
│                                     │
│  ━━━━━━━ Your Metrics ━━━━━━━━━━   │
│                                     │
│  ┌───────────────────────────────┐  │
│  │ 🔥 BMR (Basal Metabolic Rate) │  │
│  │                               │  │
│  │     [1,650] calories/day      │  │
│  │                               │  │
│  │ The energy your body needs at │  │
│  │ rest. Calculated using the    │  │
│  │ Mifflin-St Jeor equation.     │  │
│  │                               │  │
│  │ [ℹ️ Learn More] (expandable)  │  │
│  └───────────────────────────────┘  │
│                                     │
│  ┌───────────────────────────────┐  │
│  │ ⚡ TDEE (Total Daily Energy)  │  │
│  │                               │  │
│  │     [2,475] calories/day      │  │
│  │                               │  │
│  │ Your total calorie burn with  │  │
│  │ [moderately active] lifestyle.│  │
│  │ BMR × 1.55 activity factor.   │  │
│  │                               │  │
│  │ [ℹ️ Learn More] (expandable)  │  │
│  └───────────────────────────────┘  │
│                                     │
│  ┌───────────────────────────────┐  │
│  │ 🎯 Your Daily Targets         │  │
│  │                               │  │
│  │  Calories: [1,975] cal/day    │  │
│  │  (500 cal deficit)            │  │
│  │                               │  │
│  │  Protein: [130]g/day          │  │
│  │  Water: [2,450]ml/day         │  │
│  │                               │  │
│  │ [ℹ️ Why These Targets?]       │  │
│  └───────────────────────────────┘  │
│                                     │
│  ┌───────────────────────────────┐  │
│  │ 📈 Your Projection            │  │
│  │                               │  │
│  │ Start: [180] lbs              │  │
│  │ Goal: [165] lbs               │  │
│  │                               │  │
│  │ Estimated: [15 weeks]         │  │
│  │ Target Date: [Feb 2026]       │  │
│  │                               │  │
│  │ Safe rate: 1 lb/week          │  │
│  └───────────────────────────────┘  │
│                                     │
│  ┌───────────────────────────────┐  │
│  │ 💡 How It Works               │  │
│  │                               │  │
│  │ 1️⃣ Track Your Progress        │  │
│  │    Monitor meals and activity │  │
│  │                               │  │
│  │ 2️⃣ Stay Consistent            │  │
│  │    Hit your targets daily     │  │
│  │                               │  │
│  │ 3️⃣ Adjust as Needed           │  │
│  │    We'll adapt your plan      │  │
│  │                               │  │
│  │ 4️⃣ Reach Your Goal            │  │
│  │    Sustainable results        │  │
│  └───────────────────────────────┘  │
│                                     │
│  ┌───────────────────────────────┐  │
│  │   [Get Started]  (Primary)    │  │
│  └───────────────────────────────┘  │
│                                     │
└─────────────────────────────────────┘
```

#### 2.3 Microcopy & Content

**Navigation Title:** "How GTSD Works for You"

**Intro Section:**

- "Hi [Name]!"
- "We've created a personalized plan to help you [lose weight/gain muscle/maintain/improve health]. Here's how it works:"

**BMR Card:**

- **Title:** "🔥 BMR (Basal Metabolic Rate)"
- **Value:** "[1,650] calories/day"
- **Explanation:** "The energy your body needs at rest - breathing, circulating blood, and maintaining temperature. Calculated using the Mifflin-St Jeor equation, the most accurate for modern populations."
- **Expandable Detail:**
  - "Formula: (10 × weight in kg) + (6.25 × height in cm) - (5 × age) + gender constant"
  - "As a [age]-year-old [gender], your body burns this many calories even without any activity."

**TDEE Card:**

- **Title:** "⚡ TDEE (Total Daily Energy Expenditure)"
- **Value:** "[2,475] calories/day"
- **Explanation:** "Your total calorie burn including your [moderately active] lifestyle. This is your BMR × [1.55] activity factor."
- **Expandable Detail:**
  - "Activity levels: Sedentary (×1.2), Lightly Active (×1.375), Moderately Active (×1.55), Very Active (×1.725), Extremely Active (×1.9)"
  - "You selected: [Moderately Active] - Exercise 3-5 days/week"

**Daily Targets Card:**

- **Title:** "🎯 Your Daily Targets"
- **Calories:** "[1,975] cal/day ([500] cal deficit/surplus)"
- **Explanation:**
  - **For Weight Loss:** "To lose weight safely, we've created a 500-calorie daily deficit. This targets approximately 1 lb of fat loss per week - a sustainable rate that preserves muscle mass."
  - **For Muscle Gain:** "To build muscle, we've added a 400-calorie daily surplus. This provides extra energy for muscle growth while minimizing fat gain."
  - **For Maintenance:** "Your calorie target matches your TDEE to keep your weight stable while providing optimal nutrition."
- **Protein:** "[130]g/day - Helps preserve muscle mass and keeps you full longer. Based on 0.8-1g per lb of body weight."
- **Water:** "[2,450]ml/day - Staying hydrated supports metabolism and appetite control. Target is ~35ml per kg of body weight."

**Projection Card:**

- **Title:** "📈 Your Projection"
- **Start Weight:** "[180] lbs"
- **Goal Weight:** "[165] lbs"
- **Difference:** "[15] lbs to [lose/gain]"
- **Timeline:** "Estimated: [15 weeks]"
- **Target Date:** "[February 15, 2026]"
- **Explanation:** "To lose 15 lbs safely, we estimate 15 weeks at your current activity level and calorie target. This timeline is based on sustainable rates: 1 lb/week for weight loss, 0.9 lb/week for muscle gain."

**How It Works Section:**

1. **Track Your Progress**
   - "Monitor meals, water intake, and activity to stay on target"
2. **Stay Consistent**
   - "Hit your daily calorie and protein targets for best results"
3. **Adjust as Needed**
   - "As you progress, your metabolism adapts. We'll help you adjust your targets to keep making progress safely."
4. **Reach Your Goal**
   - "Sustainable, science-backed approach for lasting results"

**Primary CTA:**

- "Get Started" (Large primary button)

#### 2.4 User Flow

```
┌──────────────────────┐
│ OnboardingCoordinator│
│   (ReviewView)       │
└─────────┬────────────┘
          │
          ↓ [User taps "Complete"]
          │
┌─────────▼────────────┐
│ POST /v1/onboarding  │
│ Returns: User object │
└─────────┬────────────┘
          │
          ↓ [Success]
          │
┌─────────▼────────────┐
│ GET /v1/summary/     │
│    how-it-works      │ ← Fetch metrics & explanations
│ Returns: Summary     │
└─────────┬────────────┘
          │
          ↓ [Data loaded]
          │
┌─────────▼────────────┐
│ MetricsSummaryView   │ ← New screen
│ (Presented modally)  │
└─────────┬────────────┘
          │
          ↓ [User taps "Get Started"]
          │
┌─────────▼────────────┐
│ Dismiss to TabBarView│
│    (Home Screen)     │
└──────────────────────┘
```

#### 2.5 Implementation Details

**Files to Create:**

- `/Users/devarisbrown/Code/projects/gtsd/apps/GTSD/GTSD/Features/Onboarding/MetricsSummaryView.swift`
- `/Users/devarisbrown/Code/projects/gtsd/apps/GTSD/GTSD/Features/Onboarding/MetricsSummaryViewModel.swift`
- `/Users/devarisbrown/Code/projects/gtsd/apps/GTSD/GTSD/Core/Models/HowItWorksSummary.swift`

**Files to Modify:**

- `/Users/devarisbrown/Code/projects/gtsd/apps/GTSD/GTSD/Features/Onboarding/OnboardingCoordinator.swift`
- `/Users/devarisbrown/Code/projects/gtsd/apps/GTSD/GTSD/Features/Onboarding/OnboardingViewModel.swift`
- `/Users/devarisbrown/Code/projects/gtsd/apps/GTSD/GTSD/Core/Network/APIEndpoint.swift`

**API Integration:**

```swift
// Add to APIEndpoint.swift
case getHowItWorksSummary

var path: String {
    case .getHowItWorksSummary: return "/v1/summary/how-it-works"
}
```

**Data Models:**

```swift
// HowItWorksSummary.swift
struct HowItWorksSummary: Codable, Sendable {
    let user: SummaryUser
    let currentMetrics: CurrentMetrics
    let goals: Goals
    let calculations: Calculations
    let projection: Projection
    let howItWorks: HowItWorks
}

struct SummaryUser: Codable, Sendable {
    let name: String
    let email: String
}

struct CurrentMetrics: Codable, Sendable {
    let age: Int?
    let gender: String?
    let weight: Double
    let height: Double
    let activityLevel: String?
}

struct Goals: Codable, Sendable {
    let primaryGoal: String
    let targetWeight: Double
    let targetDate: Date?
}

struct Calculations: Codable, Sendable {
    let bmr: BMRCalculation
    let tdee: TDEECalculation
    let targets: Targets
}

struct BMRCalculation: Codable, Sendable {
    let value: Int
    let explanation: String
    let formula: String
}

struct TDEECalculation: Codable, Sendable {
    let value: Int
    let explanation: String
    let activityMultiplier: Double
}

struct Targets: Codable, Sendable {
    let calories: Target
    let protein: Target
    let water: Target
}

struct Target: Codable, Sendable {
    let value: Int
    let unit: String?
    let explanation: String
}

struct Projection: Codable, Sendable {
    let startWeight: Double
    let targetWeight: Double
    let weeklyRate: Double
    let estimatedWeeks: Int
    let projectedDate: Date?
    let explanation: String
}

struct HowItWorks: Codable, Sendable {
    let step1: HowItWorksStep
    let step2: HowItWorksStep
    let step3: HowItWorksStep
    let step4: HowItWorksStep
}

struct HowItWorksStep: Codable, Sendable {
    let title: String
    let description: String
}
```

**Modified OnboardingViewModel:**

```swift
// Add to OnboardingViewModel.swift
@Published var showMetricsSummary: Bool = false
@Published var metricsSummary: HowItWorksSummary?

func completeOnboarding() async {
    // ... existing code ...

    // After successful onboarding
    if viewModel.errorMessage == nil {
        // Fetch metrics summary
        await fetchMetricsSummary()
        showMetricsSummary = true
    }
}

func fetchMetricsSummary() async {
    do {
        let summary: HowItWorksSummaryResponse = try await apiClient.request(.getHowItWorksSummary)
        metricsSummary = summary.data
    } catch {
        Logger.error("Failed to fetch metrics summary: \(error)")
        // Still allow user to proceed even if summary fails
        errorMessage = "Couldn't load your personalized summary, but you're all set!"
    }
}
```

**Modified OnboardingCoordinator:**

```swift
// Add to OnboardingCoordinator.swift
.sheet(isPresented: $viewModel.showMetricsSummary) {
    if let summary = viewModel.metricsSummary {
        MetricsSummaryView(summary: summary) {
            viewModel.showMetricsSummary = false
            dismiss()
        }
    }
}
```

#### 2.6 Educational Content Strategy

**Progressive Disclosure:**

- Show essential info first (values + 1-line explanation)
- "Learn More" expandable sections for detailed explanations
- Avoid overwhelming users with too much text upfront

**Visual Hierarchy:**

- Use emoji/SF Symbols for visual interest and scannability
- Card-based layout for clear separation
- Large, bold numbers for key metrics
- Secondary text for explanations

**Tone & Voice:**

- Friendly but authoritative ("We've created" not "The algorithm calculated")
- Educational without being condescending
- Empowering ("You can do this") not prescriptive ("You must do this")
- Transparent about science ("Mifflin-St Jeor equation") but accessible

#### 2.7 Accessibility & Localization

**Accessibility:**

- All text must support Dynamic Type (scale with user's font size preference)
- Sufficient color contrast (4.5:1 minimum)
- VoiceOver labels for all interactive elements
- Semantic headings for screen reader navigation

**Localization Considerations:**

- All copy goes in Localizable.strings for future translation
- Number formatting respects locale (1,650 vs 1.650)
- Date formatting uses user's region settings
- Unit conversion support (lbs/kg, ml/oz) based on locale

#### 2.8 Edge Cases

| Scenario                                          | Behavior                                                                                |
| ------------------------------------------------- | --------------------------------------------------------------------------------------- |
| API call to /how-it-works fails                   | Show generic success message: "You're all set! Let's get started." Skip metrics screen. |
| User dismisses sheet before tapping "Get Started" | Navigation still proceeds to Home (same as tapping button)                              |
| User has extreme values (very high/low BMR)       | Display values as calculated, no special handling in v1                                 |
| User re-opens onboarding to edit profile          | Do NOT show metrics summary again (only on first completion)                            |
| Network timeout loading summary                   | Show loading state for 10s, then error message with "Continue Anyway" button            |

### Success Metrics

**Primary Metrics:**

- **Summary Completion Rate:** % of users who view entire summary (scroll to bottom)
  - Target: 70% scroll to bottom
- **Time on Summary Screen:** Median time spent viewing summary
  - Target: 30-60 seconds (indicates engagement)
- **Onboarding → First Action Time:** Time from completing onboarding to first Home screen interaction
  - Target: < 2 minutes (summary shouldn't delay activation)

**Secondary Metrics:**

- **"Learn More" Expansion Rate:** % of users who tap expandable sections
  - Target: 40% expand at least one section
- **Summary Exit Method:** % who tap "Get Started" vs dismiss/swipe away
  - Target: 80% use "Get Started" button
- **7-Day Retention:** Compare retention of users who saw summary vs control
  - Target: 10%+ higher retention with summary

**Qualitative Metrics:**

- User feedback: "I understand how GTSD calculates my targets"
- Support tickets: Reduced questions about "how calories are calculated"
- User interviews: Increased trust in recommendations

**Success Criteria:**

- 65%+ of users view summary to completion
- 8%+ improvement in 7-day retention vs control group
- 30%+ reduction in support tickets about calculations

---

## Technical Architecture

### Component Hierarchy

```
OnboardingCoordinator
  ├── WelcomeView
  ├── AccountBasicsView
  ├── HealthMetricsView
  ├── GoalsView
  ├── ReviewView
  └── .sheet(showMetricsSummary)
        └── MetricsSummaryView ← NEW
              ├── MetricsSummaryViewModel
              └── Components:
                    ├── MetricCard
                    ├── TargetCard
                    ├── ProjectionCard
                    └── HowItWorksCard

ProfileView
  ├── ProfileViewModel
  └── Conditional Rendering:
        ├── ProfileZeroStateView ← NEW (if incomplete)
        └── ProfileContent (if complete)
```

### API Endpoints Used

| Endpoint                   | Method | Purpose                         | Response                                      |
| -------------------------- | ------ | ------------------------------- | --------------------------------------------- |
| `/v1/onboarding`           | POST   | Complete onboarding             | User object with hasCompletedOnboarding: true |
| `/v1/summary/how-it-works` | GET    | Fetch metrics summary           | HowItWorksSummary object                      |
| `/v1/profile`              | GET    | Check profile completion status | UserProfile with settings                     |

### State Management

**OnboardingViewModel State:**

```swift
@Published var showMetricsSummary: Bool = false
@Published var metricsSummary: HowItWorksSummary?
@Published var isLoadingSummary: Bool = false
@Published var summaryError: String?
```

**ProfileViewModel State:**

```swift
@Published var userProfile: UserProfile?
@Published var shouldShowZeroState: Bool = false
@Published var isLoadingProfile: Bool = false
```

### Error Handling

**Metrics Summary Errors:**

1. Network timeout → Show "Continue Anyway" button after 10s
2. 404 (settings not found) → Log error, show generic success message
3. 500 (server error) → Show retry option, fallback to "Continue Anyway"
4. Parsing error → Log to analytics, skip summary screen

**Profile Zero State Errors:**

1. Cannot fetch profile → Show generic empty state with retry
2. Settings are null → Treat as incomplete profile, show zero state
3. Network offline → Show cached data if available, else empty state

---

## Implementation Plan

### Phase 1: Foundation (Week 1)

**Day 1-2: Data Models & API Integration**

- Create `HowItWorksSummary.swift` with all data models
- Add `getHowItWorksSummary` to `APIEndpoint.swift`
- Add `UserSettings` model (if not exists)
- Write unit tests for model parsing

**Day 3-4: Zero State Implementation**

- Create `ProfileZeroStateView.swift`
- Add zero state detection logic to `ProfileViewModel`
- Modify `ProfileView` to conditionally render zero state
- Add navigation to onboarding from zero state CTA
- Write unit tests for detection logic

**Day 5: Review & Testing**

- Integration testing for zero state flow
- Edge case testing (network errors, invalid data)
- UI/UX review with design team

### Phase 2: Metrics Summary (Week 2)

**Day 1-3: Metrics Summary UI**

- Create `MetricsSummaryView.swift`
- Create `MetricsSummaryViewModel.swift`
- Build reusable components:
  - `MetricCard.swift`
  - `ExpandableCard.swift`
  - `ProjectionCard.swift`
- Implement scrolling layout with cards
- Add "Learn More" expandable sections

**Day 4-5: Integration & Flow**

- Modify `OnboardingViewModel` to fetch summary after completion
- Add sheet presentation to `OnboardingCoordinator`
- Implement "Get Started" dismissal flow
- Add loading and error states
- Write unit tests for ViewModel logic

### Phase 3: Polish & Launch (Week 3)

**Day 1-2: Accessibility & Localization**

- Add VoiceOver labels and hints
- Test with Dynamic Type at all sizes
- Extract all strings to `Localizable.strings`
- Test color contrast in light/dark modes

**Day 3: QA & Bug Fixes**

- Full regression testing
- Test all edge cases
- Performance testing (API latency, scroll performance)
- Fix any bugs found

**Day 4-5: Analytics & Release**

- Add analytics events:
  - `zero_state_viewed`
  - `zero_state_cta_tapped`
  - `metrics_summary_viewed`
  - `metrics_summary_learn_more_tapped`
  - `metrics_summary_completed`
- Code review
- Create pull request
- Merge and deploy

### Phase 4: Monitor & Iterate (Weeks 4-6)

- Monitor analytics dashboards
- Track success metrics
- Collect user feedback
- Identify opportunities for optimization
- Plan v2 improvements

---

## Screen-by-Screen Specifications

### Screen 1: Profile Zero State

**File:** `ProfileZeroStateView.swift`

**Props:**

```swift
struct ProfileZeroStateView: View {
    let userName: String
    let onComplete: () -> Void
    let onDismiss: () -> Void
}
```

**Layout Components:**

1. Hero Icon: `figure.mixed.cardio` SF Symbol, 80pt, teal color
2. Headline: "Complete Your Health Profile", system bold, 28pt
3. Body: Multi-line description, system regular, 17pt, centered
4. Primary CTA: `GTSDButton("Complete Profile", style: .primary)`
5. Secondary CTA: Text button "Maybe Later", 15pt, gray
6. Benefits List: VStack with 4 rows, each with icon + text
7. Spacing: 24pt between major sections, 16pt between list items

**Interactions:**

- Tap "Complete Profile" → `onComplete()` → Present OnboardingCoordinator
- Tap "Maybe Later" → `onDismiss()` → Dismiss zero state (for v1, does nothing)
- Scroll enabled for small screens

**Accessibility:**

- Hero icon: Hidden from VoiceOver (decorative)
- Headline: Accessibility header
- CTA buttons: Clear labels ("Complete your health profile")
- Benefits list: Each item announced separately

---

### Screen 2: Metrics Summary

**File:** `MetricsSummaryView.swift`

**Props:**

```swift
struct MetricsSummaryView: View {
    let summary: HowItWorksSummary
    let onGetStarted: () -> Void

    @StateObject private var viewModel: MetricsSummaryViewModel
}
```

**Layout Components:**

**1. Navigation Bar**

- Title: "How GTSD Works for You"
- No back button (can only proceed forward)
- Close button (X) in top-right → Same as "Get Started"

**2. Greeting Section**

- "Hi [Name]!" - Bold, 24pt
- "We've created a personalized plan to help you [goal]." - Regular, 17pt
- "Here's how it works:" - Medium, 17pt

**3. BMR Card (GTSDCard wrapper)**

- Icon: 🔥 emoji, 32pt
- Title: "BMR (Basal Metabolic Rate)", bold 18pt
- Value: "[1,650] calories/day", bold 32pt, primary color
- Explanation: 2-3 lines, 15pt, secondary color
- "Learn More" button → Expands to show detailed explanation

**4. TDEE Card**

- Icon: ⚡ emoji
- Title: "TDEE (Total Daily Energy Expenditure)"
- Value: "[2,475] calories/day"
- Explanation with activity level
- "Learn More" expandable

**5. Daily Targets Card**

- Icon: 🎯 emoji
- Title: "Your Daily Targets"
- Three rows:
  - Calories: [value] cal/day [(deficit/surplus)]
  - Protein: [value]g/day
  - Water: [value]ml/day
- "Why These Targets?" expandable

**6. Projection Card**

- Icon: 📈 emoji
- Title: "Your Projection"
- Start → Goal weight with arrow
- Timeline: "[X] weeks" (large)
- Target date
- Explanation of safe rate

**7. How It Works Card**

- Icon: 💡 emoji
- Title: "How It Works"
- 4 numbered steps with titles and descriptions
- Compact layout, not expandable

**8. CTA Section**

- Large primary button: "Get Started"
- Full width minus padding
- Bottom padding for safe area

**Spacing:**

- 32pt top padding
- 24pt between cards
- 16pt card internal padding
- 32pt bottom padding before CTA

**Interactions:**

- Scroll to view all content
- Tap "Learn More" → Expand card with animation
- Tap expanded "Learn More" → Collapse
- Tap "Get Started" → `onGetStarted()` → Dismiss summary
- Swipe down to dismiss → Same as "Get Started"

**Accessibility:**

- Each card is a single accessibility element for faster navigation
- "Learn More" buttons announce state: "Collapsed" or "Expanded"
- Large tap targets (44pt minimum)
- Metric values announced with units

---

## Analytics Events

### Event Schema

All events follow this structure:

```json
{
  "event_name": "string",
  "timestamp": "ISO8601",
  "user_id": "string",
  "properties": {
    // Event-specific properties
  }
}
```

### Zero State Events

**1. zero_state_viewed**

```json
{
  "event_name": "zero_state_viewed",
  "properties": {
    "location": "profile_tab",
    "has_completed_onboarding": false,
    "days_since_signup": 2
  }
}
```

**2. zero_state_cta_tapped**

```json
{
  "event_name": "zero_state_cta_tapped",
  "properties": {
    "action": "complete_profile" | "maybe_later",
    "location": "profile_tab"
  }
}
```

**3. zero_state_profile_completed**

```json
{
  "event_name": "zero_state_profile_completed",
  "properties": {
    "time_to_complete_seconds": 180,
    "days_since_first_skip": 3
  }
}
```

### Metrics Summary Events

**4. metrics_summary_viewed**

```json
{
  "event_name": "metrics_summary_viewed",
  "properties": {
    "bmr": 1650,
    "tdee": 2475,
    "calorie_target": 1975,
    "primary_goal": "lose_weight",
    "estimated_weeks": 15
  }
}
```

**5. metrics_summary_learn_more_tapped**

```json
{
  "event_name": "metrics_summary_learn_more_tapped",
  "properties": {
    "section": "bmr" | "tdee" | "targets",
    "action": "expand" | "collapse"
  }
}
```

**6. metrics_summary_scrolled**

```json
{
  "event_name": "metrics_summary_scrolled",
  "properties": {
    "scroll_depth": 0.75, // 0.0 to 1.0
    "time_on_screen_seconds": 45
  }
}
```

**7. metrics_summary_completed**

```json
{
  "event_name": "metrics_summary_completed",
  "properties": {
    "time_on_screen_seconds": 62,
    "expanded_sections": ["bmr", "targets"],
    "scroll_depth": 1.0,
    "exit_method": "get_started_button" | "swipe_dismiss" | "close_button"
  }
}
```

---

## A/B Testing Plan

### Experiment 1: Zero State Messaging

**Hypothesis:** Benefit-focused messaging will drive higher profile completion rates than feature-focused messaging.

**Variants:**

**Control (A): Benefit-Focused (As Specified)**

- Headline: "Complete Your Health Profile"
- Copy: "Unlock personalized nutrition goals, calorie targets, and science-backed recommendations tailored just for you."

**Variant B: Feature-Focused**

- Headline: "Set Up Your Health Data"
- Copy: "Add your weight, height, age, and goals to activate personalized tracking and insights."

**Variant C: Social Proof**

- Headline: "Complete Your Health Profile"
- Copy: "Join thousands of users reaching their goals with personalized plans. Get your custom calorie and protein targets in 2 minutes."

**Success Metric:** Profile completion rate within 7 days
**Duration:** 2 weeks
**Sample Size:** 3,000 users (1,000 per variant)

---

### Experiment 2: Metrics Summary Length

**Hypothesis:** A shorter, focused summary will have higher completion rates but lower comprehension.

**Variants:**

**Control (A): Full Summary (As Specified)**

- All 7 sections: Greeting, BMR, TDEE, Targets, Projection, How It Works, CTA
- ~5-6 screens of scrolling

**Variant B: Compact Summary**

- 4 sections: Greeting, Combined BMR/TDEE card, Targets, CTA
- ~3 screens of scrolling
- Removed: Projection, How It Works (moved to separate help screen)

**Variant C: Progressive Summary**

- Page 1: Greeting + Key Targets (Calories, Protein, Water)
- "See How We Calculated This" → Page 2: BMR, TDEE, Projection
- "Get Started" button on both pages

**Success Metrics:**

1. Primary: Summary completion rate (scrolled to bottom)
2. Secondary: Time to first app action after onboarding
3. Secondary: 7-day retention

**Duration:** 2 weeks
**Sample Size:** 3,000 users (1,000 per variant)

---

## Localization Requirements

### Supported Locales (v1)

- `en-US` (English - United States) - Default

### Future Locales (v2)

- `es-ES` (Spanish - Spain)
- `fr-FR` (French - France)
- `de-DE` (German - Germany)

### Localization Keys

**ProfileZeroStateView Strings:**

```
// Localizable.strings

/* Profile Zero State */
"profile.zero_state.headline" = "Complete Your Health Profile";
"profile.zero_state.body" = "Unlock personalized nutrition goals, calorie targets, and science-backed recommendations tailored just for you.";
"profile.zero_state.cta_primary" = "Complete Profile";
"profile.zero_state.cta_secondary" = "Maybe Later";

"profile.zero_state.benefit1" = "Daily calorie target based on your goals";
"profile.zero_state.benefit2" = "Protein & water intake recommendations";
"profile.zero_state.benefit3" = "BMR and TDEE calculations explained";
"profile.zero_state.benefit4" = "Personalized weight projection timeline";

"profile.zero_state.section_title" = "What You'll Get:";
```

**MetricsSummaryView Strings:**

```
/* Metrics Summary */
"metrics.summary.title" = "How GTSD Works for You";
"metrics.summary.greeting" = "Hi %@!"; // %@ = user name
"metrics.summary.intro" = "We've created a personalized plan to help you %@. Here's how it works:"; // %@ = goal

"metrics.summary.bmr.title" = "BMR (Basal Metabolic Rate)";
"metrics.summary.bmr.unit" = "%d calories/day";
"metrics.summary.bmr.explanation" = "The energy your body needs at rest. Calculated using the Mifflin-St Jeor equation.";
"metrics.summary.bmr.learn_more" = "Learn More";

"metrics.summary.tdee.title" = "TDEE (Total Daily Energy Expenditure)";
"metrics.summary.tdee.unit" = "%d calories/day";
"metrics.summary.tdee.explanation" = "Your total calorie burn with %@ lifestyle. BMR × %.2f activity factor.";

"metrics.summary.targets.title" = "Your Daily Targets";
"metrics.summary.targets.calories" = "Calories: %d cal/day";
"metrics.summary.targets.calories_deficit" = "(%d cal deficit)";
"metrics.summary.targets.calories_surplus" = "(%d cal surplus)";
"metrics.summary.targets.protein" = "Protein: %dg/day";
"metrics.summary.targets.water" = "Water: %dml/day";

"metrics.summary.projection.title" = "Your Projection";
"metrics.summary.projection.start" = "Start: %@ %@"; // weight + unit
"metrics.summary.projection.goal" = "Goal: %@ %@";
"metrics.summary.projection.timeline" = "Estimated: %d weeks";
"metrics.summary.projection.target_date" = "Target Date: %@";

"metrics.summary.how_it_works.title" = "How It Works";
"metrics.summary.how_it_works.step1.title" = "Track Your Progress";
"metrics.summary.how_it_works.step2.title" = "Stay Consistent";
"metrics.summary.how_it_works.step3.title" = "Adjust as Needed";
"metrics.summary.how_it_works.step4.title" = "Reach Your Goal";

"metrics.summary.cta" = "Get Started";
```

### Number & Unit Formatting

**Weight:**

- US locale: lbs (e.g., "165 lbs")
- EU locales: kg (e.g., "75 kg")
- Conversion: kg = lbs / 2.20462

**Height:**

- US locale: ft/in (e.g., "5'10\"")
- EU locales: cm (e.g., "178 cm")

**Volume (Water):**

- US locale: fl oz (e.g., "83 fl oz")
- EU locales: ml (e.g., "2,450 ml")
- Conversion: fl oz = ml / 29.5735

**Date Formatting:**

- US: MM/DD/YYYY (e.g., "02/15/2026")
- EU: DD/MM/YYYY (e.g., "15/02/2026")
- Use `DateFormatter` with `.medium` style to respect locale

**Number Formatting:**

- US: 1,650 (comma as thousands separator)
- EU: 1.650 (period as thousands separator)
- Use `NumberFormatter` with `.decimal` style

---

## Accessibility Requirements

### VoiceOver Support

**Profile Zero State:**

- Navigation bar: "Profile" announced as header
- Hero icon: Hidden from VoiceOver (decorative)
- Headline: Announced with header trait
- Body text: Announced normally
- Benefits list: Each row announced as "Bullet point, [text]"
- Primary CTA: "Complete Profile, Button" + hint: "Opens onboarding to add health information"
- Secondary CTA: "Maybe Later, Button" + hint: "Stays on profile screen"

**Metrics Summary:**

- Navigation bar: "How GTSD Works for You" + close button "Close, Button"
- Each card: Announced as group with header
- Metric values: "[Value] [unit]" (e.g., "One thousand six hundred fifty calories per day")
- "Learn More" buttons: State announced ("Collapsed" or "Expanded")
- Primary CTA: "Get Started, Button" + hint: "Completes onboarding and goes to home screen"

### Dynamic Type

**Minimum Support:** All text scales with user's preferred text size
**Range:** Extra Small (xs) to Extra Extra Extra Large (xxxL)
**Fixed Size Elements:** Icons, card padding (don't scale)

**Testing:**

- Test at smallest and largest sizes
- Ensure no text truncation
- Ensure tap targets remain ≥44pt
- Adjust spacing if needed at extreme sizes

### Color Contrast

**Minimum Ratios (WCAG AA):**

- Normal text: 4.5:1
- Large text (≥18pt or ≥14pt bold): 3:1
- UI components (buttons, icons): 3:1

**Tested Combinations:**

- Primary text on background: ≥4.5:1
- Secondary text on background: ≥4.5:1
- Primary button text on background: ≥4.5:1
- Icon on card background: ≥3:1

**Dark Mode:**

- Re-test all contrast ratios in dark mode
- Adjust colors if needed to maintain ratios

### Keyboard Navigation (iPad/Mac Catalyst)

- Tab order follows logical reading order (top to bottom)
- All interactive elements focusable
- Clear focus indicators (visible outline)
- Return/Enter activates buttons
- Escape dismisses sheets

### Reduced Motion

- Respect `UIAccessibility.isReduceMotionEnabled`
- Disable card expand/collapse animations
- Use crossfade instead of scale/slide animations
- Keep critical animations (loading spinners)

---

## Privacy & Data Handling

### Data Collection

**Zero State:**

- Event tracking: User ID, timestamp, action taken
- No sensitive health data logged to analytics

**Metrics Summary:**

- Event tracking: User ID, timestamp, sections viewed
- Calculated metrics logged (BMR, TDEE, targets) for debugging
- No identifiable health data (weight, height, age) logged to third-party analytics

### Data Storage

**Local (Device):**

- Metrics summary response cached for 24 hours (encrypted)
- Cache cleared on logout
- No persistent storage of health metrics in plain text

**Backend (API):**

- All health data stored in `user_settings` table (PostgreSQL)
- Encrypted at rest
- Access logged for compliance

### Privacy Policy Updates

**Required Disclosures:**

- "We collect your health information (weight, height, age, gender) to calculate personalized nutrition targets."
- "Your health data is encrypted and stored securely. We never share it with third parties."
- "You can view, edit, or delete your health data at any time from your profile."

**GDPR Compliance:**

- Right to access: User can export health data via Settings
- Right to deletion: User can delete account and all data
- Right to rectification: User can edit profile data anytime

---

## Support & Documentation

### User-Facing Help Content

**Help Center Articles:**

**1. "How does GTSD calculate my calorie target?"**

- Explain BMR and TDEE in simple terms
- Link to metrics summary for reference
- Explain deficit/surplus based on goal

**2. "What is BMR and why does it matter?"**

- Definition and explanation
- Factors that affect BMR
- Why it's the foundation of calorie planning

**3. "How accurate are these calculations?"**

- Explain Mifflin-St Jeor equation accuracy
- Note that individual metabolism varies
- Recommend adjusting based on real-world results

**4. "I skipped onboarding. How do I complete my profile?"**

- Navigate to Profile tab
- Tap "Complete Profile"
- Step-by-step screenshots

**5. "Can I change my goals after onboarding?"**

- Yes, via Profile → Edit Profile
- Explain that targets will recalculate
- Recommend reviewing new metrics after changes

### In-App Tooltips

**Profile Zero State:**

- First time viewing: No tooltip (self-explanatory)

**Metrics Summary:**

- "Learn More" buttons: No tooltip (clear label)
- First time expanding: No tutorial (straightforward interaction)

### Developer Documentation

**README Updates:**

```markdown
## Onboarding Features

### Zero State for Skipped Onboarding

- Location: `Features/Profile/ProfileZeroStateView.swift`
- Triggers when: User has not completed onboarding OR has placeholder data
- Detection logic: `ProfileViewModel.shouldShowZeroState()`

### Metrics Summary

- Location: `Features/Onboarding/MetricsSummaryView.swift`
- API endpoint: `GET /v1/summary/how-it-works`
- Shown after: Successful onboarding completion
- Data model: `HowItWorksSummary` in `Core/Models/`

### Testing

- Zero state: See `ProfileViewModelTests.swift`
- Metrics summary: See `MetricsSummaryViewModelTests.swift`
- E2E flow: See `OnboardingFlowTests.swift`
```

---

## Testing Strategy

### Unit Tests

**ProfileViewModel:**

```swift
// ProfileViewModelTests.swift

func testShouldShowZeroState_WhenOnboardingNotCompleted() {
    let user = User(hasCompletedOnboarding: false)
    XCTAssertTrue(viewModel.shouldShowZeroState(user: user, settings: nil))
}

func testShouldShowZeroState_WhenHeightIsZero() {
    let user = User(hasCompletedOnboarding: true)
    let settings = UserSettings(height: 0, currentWeight: 150)
    XCTAssertTrue(viewModel.shouldShowZeroState(user: user, settings: settings))
}

func testShouldNotShowZeroState_WhenProfileComplete() {
    let user = User(hasCompletedOnboarding: true)
    let settings = UserSettings(height: 170, currentWeight: 150)
    XCTAssertFalse(viewModel.shouldShowZeroState(user: user, settings: settings))
}
```

**MetricsSummaryViewModel:**

```swift
// MetricsSummaryViewModelTests.swift

func testFetchSummary_Success() async {
    let mockClient = MockAPIClient()
    mockClient.mockResponse = mockSummaryData

    let viewModel = MetricsSummaryViewModel(apiClient: mockClient)
    await viewModel.fetchSummary()

    XCTAssertNotNil(viewModel.summary)
    XCTAssertNil(viewModel.errorMessage)
}

func testFetchSummary_NetworkError() async {
    let mockClient = MockAPIClient()
    mockClient.shouldFail = true

    let viewModel = MetricsSummaryViewModel(apiClient: mockClient)
    await viewModel.fetchSummary()

    XCTAssertNil(viewModel.summary)
    XCTAssertNotNil(viewModel.errorMessage)
}
```

### Integration Tests

**Onboarding Flow:**

```swift
func testOnboardingFlow_ShowsSummaryAfterCompletion() async {
    // 1. Complete onboarding
    await onboardingViewModel.completeOnboarding()

    // 2. Verify summary is fetched
    XCTAssertTrue(onboardingViewModel.showMetricsSummary)
    XCTAssertNotNil(onboardingViewModel.metricsSummary)

    // 3. Verify summary contains expected data
    XCTAssertGreaterThan(onboardingViewModel.metricsSummary!.calculations.bmr.value, 0)
}

func testZeroStateFlow_NavigatesToOnboarding() {
    // 1. Load profile with incomplete data
    profileViewModel.loadProfile()

    // 2. Verify zero state shows
    XCTAssertTrue(profileViewModel.shouldShowZeroState)

    // 3. Tap "Complete Profile"
    // Verify OnboardingCoordinator is presented
}
```

### UI Tests

**Accessibility:**

```swift
func testMetricsSummary_VoiceOverLabels() {
    let app = XCUIApplication()
    app.launch()

    // Complete onboarding
    // ...

    // Verify VoiceOver labels exist
    XCTAssertTrue(app.staticTexts["BMR (Basal Metabolic Rate)"].exists)
    XCTAssertTrue(app.buttons["Get Started, Button"].exists)
}
```

**Dynamic Type:**

```swift
func testMetricsSummary_DynamicType() {
    let app = XCUIApplication()

    // Test at largest accessibility size
    app.launchArguments += ["-UIPreferredContentSizeCategoryName", "UICTContentSizeCategoryAccessibilityExtraExtraExtraLarge"]
    app.launch()

    // Verify no text truncation
    // Verify tap targets still ≥44pt
}
```

### Manual QA Checklist

**Zero State:**

- [ ] Shows when user skips onboarding
- [ ] Shows when user has height = 0 or weight = 0
- [ ] Does NOT show when profile is complete
- [ ] "Complete Profile" opens onboarding at step 1
- [ ] "Maybe Later" does nothing (stays on profile)
- [ ] Scrolls on small screens (iPhone SE)
- [ ] Benefits list renders correctly
- [ ] VoiceOver announces all elements correctly
- [ ] Works in light and dark mode

**Metrics Summary:**

- [ ] Shows after completing onboarding
- [ ] Fetches data from `/v1/summary/how-it-works`
- [ ] Displays all 7 sections correctly
- [ ] BMR, TDEE, targets show correct values
- [ ] "Learn More" buttons expand/collapse
- [ ] Scrolls smoothly
- [ ] "Get Started" dismisses and navigates to Home
- [ ] Swipe down to dismiss works
- [ ] Close button works (top-right X)
- [ ] VoiceOver navigation works
- [ ] Dynamic Type scales correctly
- [ ] Works in light and dark mode
- [ ] Network error shows fallback message
- [ ] Loading state shows spinner

**Edge Cases:**

- [ ] Skip onboarding → Navigate to Profile → See zero state
- [ ] Skip onboarding → Later complete profile → Zero state disappears
- [ ] Complete onboarding → See summary → Dismiss → Never see summary again
- [ ] Complete onboarding → Summary API fails → Can still proceed
- [ ] Re-edit profile after onboarding → Summary does NOT show again
- [ ] Slow network → Loading state shows for 10s → Error message appears
- [ ] Airplane mode → Error message with retry button

---

## Launch Plan

### Rollout Strategy

**Phase 1: Internal Testing (Week 1)**

- Deploy to internal TestFlight
- Team testing with dogfooding
- Fix critical bugs

**Phase 2: Beta Testing (Week 2)**

- Deploy to external TestFlight (100 users)
- Monitor analytics for issues
- Collect qualitative feedback via surveys

**Phase 3: Gradual Rollout (Week 3-4)**

- Day 1: 10% of users (A/B test)
- Day 3: 25% of users (if no critical issues)
- Day 7: 50% of users
- Day 10: 100% rollout

**Rollback Plan:**

- Feature flag: `enable_metrics_summary` and `enable_zero_state`
- Can disable remotely via Firebase Remote Config
- Rollback triggers:
  - Crash rate > 1%
  - API error rate > 5%
  - User complaints > 10 in first 24 hours

### Success Criteria for Launch

**Go/No-Go Checklist:**

- [ ] All unit tests passing (100% pass rate)
- [ ] All integration tests passing
- [ ] Manual QA completed with 0 P0/P1 bugs
- [ ] Accessibility audit passed (VoiceOver, Dynamic Type, Contrast)
- [ ] Performance testing passed (< 100ms UI lag, < 2s API response)
- [ ] Analytics events firing correctly
- [ ] Help center articles published
- [ ] Privacy policy updated
- [ ] Product manager approval
- [ ] Engineering lead approval

**Week 1 Metrics to Monitor:**

- Crash rate (should be < 0.1%)
- API error rate (should be < 1%)
- Zero state view rate (expect ~30% of new users)
- Metrics summary completion rate (target 70%)
- Support ticket volume (expect < 5 related tickets)

---

## Future Enhancements (v2+)

### Zero State Improvements

**1. Contextual Zero States in Other Tabs**

- Home tab: "Add health goals to see personalized insights"
- Future Health tab: Full zero state with illustrations

**2. Progressive Profile Completion**

- Allow partial completion (e.g., just weight/height to start)
- Show "30% complete" progress indicator
- Incremental value unlocks

**3. Dismissal Tracking**

- Track "Maybe Later" taps
- After 3 dismissals, reduce prominence (move to bottom of Profile)
- After 7 days, show reminder notification

**4. Social Proof**

- "Join 10,000+ users who've completed their profile"
- Testimonials or success metrics

### Metrics Summary Enhancements

**1. Interactive Calculators**

- "Adjust your activity level to see how it affects TDEE"
- Slider to explore different calorie targets
- "What if?" scenarios

**2. Personalized Insights**

- "Your BMR is higher than 70% of users your age"
- Comparison to population averages
- Strengths and areas for focus

**3. Video Explanations**

- Short animated explainer for BMR/TDEE
- Testimonial videos from users
- Science breakdown from nutritionist

**4. Onboarding Summary Email**

- Send email recap of metrics summary
- Include PDF download option
- Link to help articles

**5. Revisit Summary Anytime**

- Add "How It Works" link in Profile or Settings
- Allow users to review calculations after editing profile
- Show historical snapshots ("Your plan on Jan 1 vs now")

### Gamification

**1. Profile Completion Badge**

- Award badge for completing full profile
- Show in badges collection
- Social sharing option

**2. Streak for Hitting Targets**

- Track daily calorie/protein target adherence
- Show streak in metrics summary
- Celebrate milestones (7-day, 30-day, 100-day)

### Personalization

**1. Adaptive Messaging**

- A/B test different zero state headlines per user persona
- Use ML to predict best messaging based on user behavior
- Dynamic CTAs based on user goals

**2. Onboarding Path Optimization**

- Short path for users who want quick setup
- Detailed path for users who want full explanation
- Adaptive questioning based on previous answers

---

## Appendix

### Glossary

**BMR (Basal Metabolic Rate):** The number of calories your body burns at rest to maintain basic physiological functions.

**TDEE (Total Daily Energy Expenditure):** The total number of calories burned per day, including BMR plus activity.

**Calorie Deficit:** Consuming fewer calories than TDEE to lose weight.

**Calorie Surplus:** Consuming more calories than TDEE to gain weight.

**Mifflin-St Jeor Equation:** A formula for calculating BMR based on weight, height, age, and sex.

**Zero State:** A UI pattern showing an empty state with a call-to-action when no data exists.

**Progressive Disclosure:** A UX pattern where information is revealed gradually to avoid overwhelming users.

**Activity Multiplier:** A factor applied to BMR to calculate TDEE based on activity level (e.g., 1.55 for moderately active).

### References

**Scientific Sources:**

- Mifflin, M. D., et al. (1990). "A new predictive equation for resting energy expenditure in healthy individuals." _The American Journal of Clinical Nutrition._
- WHO (2001). "Human energy requirements." _Food and Agriculture Organization._

**Design Patterns:**

- Nielsen Norman Group: "Empty States & First-Time User Experiences"
- Apple Human Interface Guidelines: "Onboarding"
- Material Design: "Empty States"

**Technical Documentation:**

- SwiftUI Documentation: https://developer.apple.com/documentation/swiftui
- iOS Accessibility: https://developer.apple.com/accessibility/
- WCAG 2.1 Guidelines: https://www.w3.org/WAI/WCAG21/quickref/

---

## Document Revision History

| Version | Date       | Author       | Changes                                 |
| ------- | ---------- | ------------ | --------------------------------------- |
| 1.0     | 2025-10-27 | Product Team | Initial specification for both features |

---

**END OF SPECIFICATION**
