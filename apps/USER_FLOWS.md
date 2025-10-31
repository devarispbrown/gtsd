# GTSD User Flows: Onboarding Enhancement Features

**Visual Flow Diagrams for Development Team**

---

## Flow 1: User Skips Onboarding → Zero State → Completion

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                             │
│  USER JOURNEY: Skip Onboarding → See Zero State → Complete Profile         │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘

   ┌──────────────┐
   │  User Signs  │
   │     Up       │
   └──────┬───────┘
          │
          ↓
   ┌──────────────┐
   │  LoginView   │
   │ (Auth Success)│
   └──────┬───────┘
          │
          ↓
   ┌──────────────────────┐
   │ OnboardingCoordinator│
   │  (WelcomeView)       │
   │                      │
   │  [Skip] button ──────┼──→ User taps "Skip"
   └──────┬───────────────┘
          │
          ↓
   ┌──────────────────────┐
   │ OnboardingViewModel  │
   │  .skipOnboarding()   │
   │                      │
   │  POST /v1/onboarding │
   │  with default values:│
   │  - age: 25           │
   │  - weight: 0         │
   │  - height: 0         │
   │  - goal: improve_    │
   │         health       │
   └──────┬───────────────┘
          │
          ↓
   ┌──────────────────────┐
   │  API Response:       │
   │  User {              │
   │    hasCompletedOn-   │
   │    boarding: true    │
   │  }                   │
   └──────┬───────────────┘
          │
          ↓
   ┌──────────────────────┐
   │  authService.update- │
   │  CurrentUser(user)   │
   └──────┬───────────────┘
          │
          ↓
   ┌──────────────────────┐
   │  GTSDApp.ContentView │
   │  detects:            │
   │  hasCompletedOn-     │
   │  boarding = true     │
   └──────┬───────────────┘
          │
          ↓
   ┌──────────────────────┐
   │    TabBarView        │
   │   (Home Screen)      │
   │                      │
   │  User sees tasks,    │
   │  but no health data  │
   └──────┬───────────────┘
          │
          ↓ [User navigates to Profile tab]
          │
   ┌──────────────────────┐
   │   ProfileView        │
   │                      │
   │   ProfileViewModel   │
   │   .loadProfile()     │
   └──────┬───────────────┘
          │
          ↓
   ┌──────────────────────┐
   │  GET /v1/profile     │
   │                      │
   │  Response:           │
   │  {                   │
   │    user: {...}       │
   │    stats: {...}      │
   │  }                   │
   └──────┬───────────────┘
          │
          ↓
   ┌──────────────────────┐
   │  ProfileViewModel    │
   │  .determineZeroState()│
   │                      │
   │  Checks:             │
   │  - height == 0 ✓     │
   │  - weight == 0 ✓     │
   │                      │
   │  Result:             │
   │  shouldShowZeroState │
   │  = true              │
   └──────┬───────────────┘
          │
          ↓
   ┌──────────────────────────────────────────────┐
   │         ProfileZeroStateView                 │
   │                                              │
   │  ╔════════════════════════════════════════╗  │
   │  ║                                        ║  │
   │  ║       [Icon: figure.mixed.cardio]      ║  │
   │  ║                                        ║  │
   │  ║    Complete Your Health Profile        ║  │
   │  ║                                        ║  │
   │  ║  Unlock personalized nutrition goals,  ║  │
   │  ║  calorie targets, and science-backed   ║  │
   │  ║  recommendations tailored just for you.║  │
   │  ║                                        ║  │
   │  ║  ┌──────────────────────────────────┐  ║  │
   │  ║  │     Complete Profile (CTA)       │  ║  │
   │  ║  └──────────────────────────────────┘  ║  │
   │  ║                                        ║  │
   │  ║           Maybe Later (link)           ║  │
   │  ║                                        ║  │
   │  ║  ────────────────────────────────────  ║  │
   │  ║                                        ║  │
   │  ║         What You'll Get:               ║  │
   │  ║                                        ║  │
   │  ║  🎯 Daily calorie target               ║  │
   │  ║  💪 Protein & water goals              ║  │
   │  ║  📊 Science-based calculations         ║  │
   │  ║  📈 Personalized progress plan         ║  │
   │  ║                                        ║  │
   │  ╚════════════════════════════════════════╝  │
   │                                              │
   │  [User taps "Complete Profile"] ────────┐   │
   └─────────────────────────────────────────┼───┘
                                             │
                                             ↓
                                  ┌──────────────────────┐
                                  │ OnboardingCoordinator│
                                  │ (Re-presented)       │
                                  │                      │
                                  │ Starts at step 1:    │
                                  │ AccountBasicsView    │
                                  └──────┬───────────────┘
                                         │
                                         ↓
                                  ┌──────────────────────┐
                                  │ User completes all   │
                                  │ 5 steps with real    │
                                  │ data:                │
                                  │ - DOB: 1990-01-15    │
                                  │ - Gender: Male       │
                                  │ - Weight: 180 lbs    │
                                  │ - Height: 5'10"      │
                                  │ - Goal: Lose weight  │
                                  │ - Target: 165 lbs    │
                                  │ - Activity: Moderate │
                                  └──────┬───────────────┘
                                         │
                                         ↓
                                  ┌──────────────────────┐
                                  │ User taps "Complete" │
                                  │ in ReviewView        │
                                  └──────┬───────────────┘
                                         │
                                         ↓
                                  [See Flow 2 for Metrics Summary]
```

---

## Flow 2: User Completes Onboarding → Metrics Summary → Home

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                             │
│  USER JOURNEY: Complete Onboarding → See Metrics Summary → Start Using App │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘

   ┌──────────────┐
   │  User Signs  │
   │     Up       │
   └──────┬───────┘
          │
          ↓
   ┌──────────────┐
   │  LoginView   │
   │ (Auth Success)│
   └──────┬───────┘
          │
          ↓
   ┌──────────────────────┐
   │ OnboardingCoordinator│
   │                      │
   │ Step 1: Welcome      │
   │ Step 2: Account      │
   │ Step 3: Health       │
   │ Step 4: Goals        │
   │ Step 5: Review       │
   │                      │
   │ [Complete] button ───┼──→ User taps "Complete"
   └──────┬───────────────┘
          │
          ↓
   ┌──────────────────────┐
   │ OnboardingViewModel  │
   │  .completeOnboarding()│
   │                      │
   │  Validates all fields│
   │  are filled          │
   └──────┬───────────────┘
          │
          ↓
   ┌──────────────────────┐
   │ POST /v1/onboarding  │
   │                      │
   │ Request Body:        │
   │ {                    │
   │   dateOfBirth,       │
   │   gender,            │
   │   currentWeight,     │
   │   height,            │
   │   targetWeight,      │
   │   targetDate,        │
   │   primaryGoal,       │
   │   activityLevel,     │
   │   dietaryPreferences,│
   │   allergies,         │
   │   mealsPerDay        │
   │ }                    │
   └──────┬───────────────┘
          │
          ↓
   ┌──────────────────────┐
   │  Backend Calculates: │
   │                      │
   │  1. BMR (Mifflin-St  │
   │     Jeor equation)   │
   │  2. TDEE (BMR ×      │
   │     activity factor) │
   │  3. Calorie Target   │
   │     (TDEE +/- deficit│
   │      based on goal)  │
   │  4. Protein Target   │
   │     (0.8-1g per lb)  │
   │  5. Water Target     │
   │     (35ml per kg)    │
   │  6. Weight Projection│
   │     (safe rate: 0.5- │
   │      1 lb/week)      │
   └──────┬───────────────┘
          │
          ↓
   ┌──────────────────────┐
   │  API Response:       │
   │  User {              │
   │    hasCompletedOn-   │
   │    boarding: true    │
   │  }                   │
   └──────┬───────────────┘
          │
          ↓
   ┌──────────────────────┐
   │  OnboardingViewModel │
   │  .fetchMetricsSummary()│
   └──────┬───────────────┘
          │
          ↓
   ┌──────────────────────┐
   │ GET /v1/summary/     │
   │     how-it-works     │
   │                      │
   │ (Backend endpoint    │
   │  already exists!)    │
   └──────┬───────────────┘
          │
          ↓
   ┌──────────────────────┐
   │  API Response:       │
   │  {                   │
   │    user: {...}       │
   │    currentMetrics    │
   │    goals             │
   │    calculations: {   │
   │      bmr: {          │
   │        value: 1650   │
   │        explanation   │
   │      }               │
   │      tdee: {         │
   │        value: 2475   │
   │        explanation   │
   │      }               │
   │      targets: {      │
   │        calories: 1975│
   │        protein: 130  │
   │        water: 2450   │
   │      }               │
   │    }                 │
   │    projection: {     │
   │      startWeight: 180│
   │      targetWeight:165│
   │      estimatedWeeks  │
   │    }                 │
   │    howItWorks: {...} │
   │  }                   │
   └──────┬───────────────┘
          │
          ↓
   ┌──────────────────────┐
   │  OnboardingViewModel │
   │  sets:               │
   │  showMetricsSummary  │
   │  = true              │
   └──────┬───────────────┘
          │
          ↓
   ┌─────────────────────────────────────────────────────────────┐
   │              MetricsSummaryView (Sheet)                     │
   │                                                             │
   │  ╔═══════════════════════════════════════════════════════╗  │
   │  ║  How GTSD Works for You                [X] Close     ║  │
   │  ╠═══════════════════════════════════════════════════════╣  │
   │  ║                                                       ║  │
   │  ║  Hi John!                                            ║  │
   │  ║                                                       ║  │
   │  ║  We've created a personalized plan to help you lose  ║  │
   │  ║  weight. Here's how it works:                        ║  │
   │  ║                                                       ║  │
   │  ║  ┌─────────────────────────────────────────────────┐ ║  │
   │  ║  │ 🔥 BMR (Basal Metabolic Rate)                   │ ║  │
   │  ║  │                                                 │ ║  │
   │  ║  │      1,650 calories/day                         │ ║  │
   │  ║  │                                                 │ ║  │
   │  ║  │ The energy your body needs at rest. Calculated │ ║  │
   │  ║  │ using the Mifflin-St Jeor equation.            │ ║  │
   │  ║  │                                                 │ ║  │
   │  ║  │ [ℹ️ Learn More] ◀──────────────────────────────┼─┼──→ Expandable
   │  ║  └─────────────────────────────────────────────────┘ ║  │
   │  ║                                                       ║  │
   │  ║  ┌─────────────────────────────────────────────────┐ ║  │
   │  ║  │ ⚡ TDEE (Total Daily Energy Expenditure)        │ ║  │
   │  ║  │                                                 │ ║  │
   │  ║  │      2,475 calories/day                         │ ║  │
   │  ║  │                                                 │ ║  │
   │  ║  │ Your total calorie burn with moderately active  │ ║  │
   │  ║  │ lifestyle. BMR × 1.55 activity factor.          │ ║  │
   │  ║  │                                                 │ ║  │
   │  ║  │ [ℹ️ Learn More]                                 │ ║  │
   │  ║  └─────────────────────────────────────────────────┘ ║  │
   │  ║                                                       ║  │
   │  ║  ┌─────────────────────────────────────────────────┐ ║  │
   │  ║  │ 🎯 Your Daily Targets                           │ ║  │
   │  ║  │                                                 │ ║  │
   │  ║  │  Calories: 1,975 cal/day (500 cal deficit)     │ ║  │
   │  ║  │  Protein: 130g/day                              │ ║  │
   │  ║  │  Water: 2,450ml/day                             │ ║  │
   │  ║  │                                                 │ ║  │
   │  ║  │ [ℹ️ Why These Targets?]                         │ ║  │
   │  ║  └─────────────────────────────────────────────────┘ ║  │
   │  ║                                                       ║  │
   │  ║  ┌─────────────────────────────────────────────────┐ ║  │
   │  ║  │ 📈 Your Projection                              │ ║  │
   │  ║  │                                                 │ ║  │
   │  ║  │ Start: 180 lbs → Goal: 165 lbs                  │ ║  │
   │  ║  │                                                 │ ║  │
   │  ║  │ Estimated: 15 weeks                             │ ║  │
   │  ║  │ Target Date: February 15, 2026                  │ ║  │
   │  ║  │                                                 │ ║  │
   │  ║  │ Safe rate: 1 lb/week                            │ ║  │
   │  ║  └─────────────────────────────────────────────────┘ ║  │
   │  ║                                                       ║  │
   │  ║  ┌─────────────────────────────────────────────────┐ ║  │
   │  ║  │ 💡 How It Works                                 │ ║  │
   │  ║  │                                                 │ ║  │
   │  ║  │ 1️⃣ Track Your Progress                          │ ║  │
   │  ║  │    Monitor meals and activity                   │ ║  │
   │  ║  │                                                 │ ║  │
   │  ║  │ 2️⃣ Stay Consistent                              │ ║  │
   │  ║  │    Hit your targets daily                       │ ║  │
   │  ║  │                                                 │ ║  │
   │  ║  │ 3️⃣ Adjust as Needed                             │ ║  │
   │  ║  │    We'll adapt your plan                        │ ║  │
   │  ║  │                                                 │ ║  │
   │  ║  │ 4️⃣ Reach Your Goal                              │ ║  │
   │  ║  │    Sustainable results                          │ ║  │
   │  ║  └─────────────────────────────────────────────────┘ ║  │
   │  ║                                                       ║  │
   │  ║  ┌─────────────────────────────────────────────────┐ ║  │
   │  ║  │           Get Started (Primary CTA)             │ ║  │
   │  ║  └─────────────────────────────────────────────────┘ ║  │
   │  ║                                                       ║  │
   │  ╚═══════════════════════════════════════════════════════╝  │
   │                                                             │
   │  [User taps "Get Started"] ─────────────────────────┐      │
   └─────────────────────────────────────────────────────┼──────┘
                                                         │
                                                         ↓
                                              ┌──────────────────────┐
                                              │ MetricsSummaryView   │
                                              │ dismisses (sheet)    │
                                              └──────┬───────────────┘
                                                     │
                                                     ↓
                                              ┌──────────────────────┐
                                              │ OnboardingCoordinator│
                                              │ dismisses            │
                                              └──────┬───────────────┘
                                                     │
                                                     ↓
                                              ┌──────────────────────┐
                                              │  GTSDApp.ContentView │
                                              │  detects:            │
                                              │  hasCompletedOn-     │
                                              │  boarding = true     │
                                              └──────┬───────────────┘
                                                     │
                                                     ↓
                                              ┌──────────────────────┐
                                              │    TabBarView        │
                                              │   (Home Screen)      │
                                              │                      │
                                              │  User sees tasks     │
                                              │  with personalized   │
                                              │  health data         │
                                              └──────────────────────┘
```

---

## Flow 3: Error Handling - Metrics Summary API Fails

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                             │
│  ERROR SCENARIO: Metrics Summary API Fails (Non-Blocking)                  │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘

   ┌──────────────────────┐
   │ User completes       │
   │ onboarding           │
   └──────┬───────────────┘
          │
          ↓
   ┌──────────────────────┐
   │ POST /v1/onboarding  │
   │ ✓ Success            │
   └──────┬───────────────┘
          │
          ↓
   ┌──────────────────────┐
   │ OnboardingViewModel  │
   │ .fetchMetricsSummary()│
   └──────┬───────────────┘
          │
          ↓
   ┌──────────────────────┐
   │ GET /v1/summary/     │
   │     how-it-works     │
   │                      │
   │ ✗ Network Error      │
   │   or                 │
   │ ✗ 404 Not Found      │
   │   or                 │
   │ ✗ 500 Server Error   │
   └──────┬───────────────┘
          │
          ↓
   ┌──────────────────────┐
   │ OnboardingViewModel  │
   │ catches error        │
   │                      │
   │ Logs error but       │
   │ doesn't set:         │
   │ showMetricsSummary   │
   │                      │
   │ errorMessage = nil   │
   │ (non-blocking!)      │
   └──────┬───────────────┘
          │
          ↓
   ┌──────────────────────┐
   │ OnboardingCoordinator│
   │                      │
   │ .sheet(isPresented:  │
   │   showMetricsSummary)│
   │                      │
   │ Sheet doesn't show   │
   │ because flag is false│
   └──────┬───────────────┘
          │
          ↓
   ┌──────────────────────┐
   │ User proceeds        │
   │ directly to TabBarView│
   │ (Home Screen)        │
   │                      │
   │ Can still use app    │
   │ normally!            │
   └──────────────────────┘

   ALTERNATIVE (Optional for v2):
   ┌──────────────────────┐
   │ Show toast message:  │
   │ "Welcome! Your plan  │
   │  is ready."          │
   │                      │
   │ Add link in Profile  │
   │ to view metrics      │
   │ summary later        │
   └──────────────────────┘
```

---

## Flow 4: User Re-Edits Profile After Onboarding

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                             │
│  SCENARIO: User Edits Profile Data After Initial Onboarding                │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘

   ┌──────────────────────┐
   │ User has completed   │
   │ onboarding (has real │
   │ profile data)        │
   └──────┬───────────────┘
          │
          ↓
   ┌──────────────────────┐
   │ User navigates to    │
   │ Profile tab          │
   └──────┬───────────────┘
          │
          ↓
   ┌──────────────────────┐
   │ ProfileView shows    │
   │ full profile (no     │
   │ zero state)          │
   │                      │
   │ [Edit Profile] button│────→ User taps
   └──────┬───────────────┘
          │
          ↓
   ┌──────────────────────┐
   │ ProfileEditView      │
   │ (sheet/navigation)   │
   │                      │
   │ User can edit:       │
   │ - Weight             │
   │ - Height             │
   │ - Target weight      │
   │ - Target date        │
   │ - Activity level     │
   │ - etc.               │
   └──────┬───────────────┘
          │
          ↓
   ┌──────────────────────┐
   │ User taps "Save"     │
   └──────┬───────────────┘
          │
          ↓
   ┌──────────────────────┐
   │ PUT /v1/profile      │
   │ (or similar endpoint)│
   │                      │
   │ Backend recalculates:│
   │ - BMR                │
   │ - TDEE               │
   │ - Calorie target     │
   │ - Protein target     │
   │ - Water target       │
   │ - Weight projection  │
   └──────┬───────────────┘
          │
          ↓
   ┌──────────────────────┐
   │ ProfileEditView      │
   │ dismisses            │
   └──────┬───────────────┘
          │
          ↓
   ┌──────────────────────┐
   │ ProfileView reloads  │
   │ ProfileViewModel.    │
   │ loadProfile()        │
   └──────┬───────────────┘
          │
          ↓
   ┌──────────────────────┐
   │ Updated profile data │
   │ displayed            │
   │                      │
   │ ❌ Metrics summary   │
   │    does NOT show     │
   │    again             │
   │                      │
   │ (Only shows once,    │
   │  after initial       │
   │  onboarding)         │
   └──────────────────────┘

   FUTURE ENHANCEMENT (v2):
   ┌──────────────────────┐
   │ Add button in        │
   │ Profile:             │
   │ "View How It Works"  │
   │                      │
   │ Allows user to see   │
   │ metrics summary      │
   │ anytime              │
   └──────────────────────┘
```

---

## Flow 5: Zero State Dismissal (Maybe Later)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                             │
│  SCENARIO: User Dismisses Zero State ("Maybe Later")                       │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘

   ┌──────────────────────┐
   │ User skipped         │
   │ onboarding           │
   └──────┬───────────────┘
          │
          ↓
   ┌──────────────────────┐
   │ User navigates to    │
   │ Profile tab          │
   └──────┬───────────────┘
          │
          ↓
   ┌──────────────────────┐
   │ ProfileZeroStateView │
   │ is displayed         │
   └──────┬───────────────┘
          │
          ↓
   ┌──────────────────────┐
   │ User taps            │
   │ "Maybe Later"        │
   └──────┬───────────────┘
          │
          ↓
   ┌──────────────────────┐
   │ onDismiss() callback │
   │ is triggered         │
   │                      │
   │ V1: Does nothing     │
   │ (no-op)              │
   │                      │
   │ Zero state remains   │
   │ on screen            │
   └──────┬───────────────┘
          │
          ↓
   ┌──────────────────────┐
   │ User navigates away  │
   │ from Profile tab     │
   └──────┬───────────────┘
          │
          ↓
   ┌──────────────────────┐
   │ Later, user returns  │
   │ to Profile tab       │
   └──────┬───────────────┘
          │
          ↓
   ┌──────────────────────┐
   │ Zero state shows     │
   │ again (data-driven,  │
   │ not dismissal-driven)│
   └──────────────────────┘

   FUTURE ENHANCEMENT (v2):
   ┌──────────────────────┐
   │ Track dismissals:    │
   │                      │
   │ If dismissedCount    │
   │ >= 3:                │
   │   Move zero state to │
   │   bottom of Profile  │
   │   (less prominent)   │
   │                      │
   │ If dismissedCount    │
   │ >= 5 AND             │
   │ daysSinceFirstSkip   │
   │ >= 7:                │
   │   Send push          │
   │   notification       │
   │   reminder           │
   └──────────────────────┘
```

---

## Flow 6: Accessibility - VoiceOver Navigation

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                             │
│  VOICEOVER USER FLOW: Navigating Metrics Summary                           │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘

   VoiceOver User completes onboarding and sees MetricsSummaryView

   [Swipe Right] ──→ Navigation Bar
                     Announces: "How GTSD Works for You, Heading"

   [Swipe Right] ──→ Close Button
                     Announces: "Close, Button"
                     Hint: "Dismisses summary and starts using app"

   [Swipe Right] ──→ Greeting Section
                     Announces: "Hi John! We've created a personalized plan
                               to help you lose weight. Here's how it works."

   [Swipe Right] ──→ BMR Card Header
                     Announces: "BMR (Basal Metabolic Rate), Heading"

   [Swipe Right] ──→ BMR Value
                     Announces: "One thousand six hundred fifty calories per day"

   [Swipe Right] ──→ BMR Explanation
                     Announces: "The energy your body needs at rest.
                               Calculated using the Mifflin-St Jeor equation."

   [Swipe Right] ──→ Learn More Button
                     Announces: "Learn More, Button, Collapsed"
                     Hint: "Double tap to expand and see detailed explanation"

   [Double Tap]  ──→ Expands BMR card
                     Announces: "Expanded"

   [Swipe Right] ──→ Detailed Explanation
                     Announces: [Full BMR formula and explanation]

   [Swipe Right] ──→ Learn More Button (again)
                     Announces: "Learn More, Button, Expanded"
                     Hint: "Double tap to collapse"

   [Swipe Right] ──→ TDEE Card Header
                     Announces: "TDEE (Total Daily Energy Expenditure), Heading"

   [Continue swiping through all sections...]

   [Final Swipe] ──→ Get Started Button
                     Announces: "Get Started, Button"
                     Hint: "Completes onboarding and goes to home screen"

   [Double Tap]  ──→ Dismisses summary and navigates to Home
```

---

## Decision Tree: Should Zero State Show?

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                             │
│  LOGIC: When to Display ProfileZeroStateView                               │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘

                    ┌─────────────────────┐
                    │  User navigates to  │
                    │    Profile tab      │
                    └──────────┬──────────┘
                               │
                               ↓
                    ┌──────────────────────┐
                    │ ProfileViewModel     │
                    │ .loadProfile()       │
                    └──────────┬───────────┘
                               │
                               ↓
                    ┌──────────────────────┐
                    │ Fetch user from      │
                    │ GET /v1/profile      │
                    └──────────┬───────────┘
                               │
                               ↓
              ┌────────────────┴────────────────┐
              │                                 │
              ↓                                 ↓
   ┌──────────────────────┐         ┌──────────────────────┐
   │ user.hasCompletedOn- │         │ user.hasCompletedOn- │
   │ boarding = false?    │         │ boarding = true?     │
   └──────────┬───────────┘         └──────────┬───────────┘
              │                                 │
              ↓ YES                             ↓ YES
   ┌──────────────────────┐         ┌──────────────────────┐
   │ ✓ SHOW ZERO STATE    │         │ Fetch user settings  │
   │                      │         │ from API response    │
   │ Reason: User skipped │         └──────────┬───────────┘
   │ onboarding entirely  │                    │
   └──────────────────────┘                    ↓
                                    ┌──────────────────────┐
                                    │ userSettings.height? │
                                    └──────────┬───────────┘
                                               │
                          ┌────────────────────┴────────────────────┐
                          │                                         │
                          ↓                                         ↓
               ┌──────────────────────┐                  ┌──────────────────────┐
               │ height > 0?          │                  │ height == 0 or nil?  │
               └──────────┬───────────┘                  └──────────┬───────────┘
                          │                                         │
                          ↓ YES                                     ↓ YES
               ┌──────────────────────┐                  ┌──────────────────────┐
               │ userSettings.        │                  │ ✓ SHOW ZERO STATE    │
               │ currentWeight?       │                  │                      │
               └──────────┬───────────┘                  │ Reason: Placeholder  │
                          │                              │ data (skipped and    │
               ┌──────────┴──────────┐                   │ onboarding sent      │
               │                     │                   │ default values)      │
               ↓                     ↓                   └──────────────────────┘
    ┌──────────────────┐  ┌──────────────────┐
    │ currentWeight    │  │ currentWeight    │
    │ > 0?             │  │ == 0 or nil?     │
    └────────┬─────────┘  └────────┬─────────┘
             │                     │
             ↓ YES                 ↓ YES
    ┌────────────────────┐  ┌──────────────────────┐
    │ ✓ SHOW PROFILE     │  │ ✓ SHOW ZERO STATE    │
    │   CONTENT          │  │                      │
    │                    │  │ Reason: Placeholder  │
    │ User has complete  │  │ weight (user may     │
    │ data, show full    │  │ have edited and      │
    │ profile with       │  │ deleted data)        │
    │ metrics            │  └──────────────────────┘
    └────────────────────┘

   SUMMARY:
   Show Zero State IF:
   - user.hasCompletedOnboarding == false
   OR
   - userSettings.height == 0 or nil
   OR
   - userSettings.currentWeight == 0 or nil

   Show Profile Content IF:
   - user.hasCompletedOnboarding == true
   AND
   - userSettings.height > 0
   AND
   - userSettings.currentWeight > 0
```

---

## State Diagram: Onboarding & Profile States

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                             │
│  STATE MACHINE: User Onboarding & Profile Completion                       │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘

       ┌─────────────────────┐
       │   NOT_AUTHENTICATED │
       └──────────┬──────────┘
                  │
                  │ User signs up
                  ↓
       ┌─────────────────────┐
       │   AUTHENTICATED      │
       │   ONBOARDING_PENDING │
       └──────────┬──────────┘
                  │
        ┌─────────┴─────────────────┐
        │                           │
        │ User skips                │ User completes
        │                           │
        ↓                           ↓
┌───────────────────┐      ┌────────────────────┐
│  ONBOARDING_      │      │  ONBOARDING_       │
│  SKIPPED          │      │  COMPLETED         │
│                   │      │                    │
│ hasCompletedOn-   │      │ hasCompletedOn-    │
│ boarding: true    │      │ boarding: true     │
│ height: 0         │      │ height: > 0        │
│ weight: 0         │      │ weight: > 0        │
└────────┬──────────┘      └────────┬───────────┘
         │                          │
         │ Sees Zero State          │ Sees Metrics Summary
         │ in Profile               │ then Home
         ↓                          ↓
┌───────────────────┐      ┌────────────────────┐
│  PROFILE_         │      │  PROFILE_COMPLETE  │
│  INCOMPLETE       │      │                    │
│                   │      │ Can use all        │
│ Limited features  │      │ features           │
│ No health metrics │      │ Health metrics     │
│                   │      │ visible            │
└────────┬──────────┘      └────────┬───────────┘
         │                          │
         │ User completes           │ User edits
         │ profile from             │ profile
         │ zero state               │
         │                          │
         └──────────┬───────────────┘
                    │
                    ↓
         ┌────────────────────┐
         │  PROFILE_COMPLETE  │
         │                    │
         │ Recalculates:      │
         │ - BMR              │
         │ - TDEE             │
         │ - Targets          │
         └────────────────────┘

   TRANSITIONS:
   1. NOT_AUTHENTICATED → AUTHENTICATED_ONBOARDING_PENDING (on signup/login)
   2. AUTHENTICATED_ONBOARDING_PENDING → ONBOARDING_SKIPPED (on skip)
   3. AUTHENTICATED_ONBOARDING_PENDING → ONBOARDING_COMPLETED (on complete)
   4. ONBOARDING_SKIPPED → PROFILE_INCOMPLETE (on first profile view)
   5. ONBOARDING_COMPLETED → PROFILE_COMPLETE (on first profile view)
   6. PROFILE_INCOMPLETE → PROFILE_COMPLETE (on profile completion)
   7. PROFILE_COMPLETE → PROFILE_COMPLETE (on profile edit, recalculates)

   STATE PROPERTIES:

   NOT_AUTHENTICATED:
   - isAuthenticated: false
   - currentUser: null

   AUTHENTICATED_ONBOARDING_PENDING:
   - isAuthenticated: true
   - currentUser.hasCompletedOnboarding: false
   - Shows OnboardingCoordinator

   ONBOARDING_SKIPPED:
   - isAuthenticated: true
   - currentUser.hasCompletedOnboarding: true (⚠️ but with placeholder data)
   - userSettings.height: 0
   - userSettings.weight: 0

   ONBOARDING_COMPLETED:
   - isAuthenticated: true
   - currentUser.hasCompletedOnboarding: true
   - userSettings.height: > 0
   - userSettings.weight: > 0

   PROFILE_INCOMPLETE:
   - shouldShowZeroState: true
   - Limited features available
   - No personalized health metrics

   PROFILE_COMPLETE:
   - shouldShowZeroState: false
   - All features available
   - Personalized health metrics displayed
```

---

**These flow diagrams provide visual clarity for the development team to understand all user journeys, edge cases, and state transitions. Use these alongside the full specification and implementation summary documents.**
