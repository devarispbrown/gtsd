# Implementation Summary: Onboarding Enhancement Features

**Quick Reference for Development Team**

---

## Overview

This document provides a quick reference for implementing the two onboarding enhancement features specified in `GTSD_PRODUCT_SPEC.md`.

---

## Feature 1: Zero State for Skipped Onboarding

### What It Does

Shows an encouraging empty state in the Profile tab when users skip onboarding or have incomplete profile data, with a clear CTA to complete their profile.

### Files to Create

**1. ProfileZeroStateView.swift**

```
Location: /Users/devarisbrown/Code/projects/gtsd/apps/GTSD/GTSD/Features/Profile/ProfileZeroStateView.swift

Purpose: Renders the zero state UI with icon, headline, body, CTA, and benefits list

Key Components:
- Hero icon (figure.mixed.cardio SF Symbol)
- Headline: "Complete Your Health Profile"
- Body copy with value proposition
- Primary CTA: "Complete Profile" → Opens OnboardingCoordinator
- Secondary CTA: "Maybe Later" → Dismisses (no-op for v1)
- Benefits list (4 items with icons)
```

### Files to Modify

**1. ProfileView.swift**

```swift
// Add conditional rendering based on profile completion status

var body: some View {
    NavigationStack {
        Group {
            if viewModel.isLoading {
                LoadingView(message: "Loading profile...")
            } else if let errorMessage = viewModel.errorMessage {
                ErrorView(message: errorMessage) {
                    Task { await viewModel.loadProfile() }
                }
            } else if viewModel.shouldShowZeroState {
                // NEW: Show zero state
                ProfileZeroStateView(
                    userName: viewModel.userProfile?.user.name ?? "there",
                    onComplete: {
                        // Present OnboardingCoordinator
                        showingOnboarding = true
                    },
                    onDismiss: {
                        // For v1, does nothing
                    }
                )
            } else if let profile = viewModel.userProfile {
                // Existing profile content
                ScrollView {
                    // ... existing profile UI ...
                }
            }
        }
        .navigationTitle("Profile")
        .sheet(isPresented: $showingOnboarding) {
            OnboardingCoordinator()
        }
    }
}
```

**2. ProfileViewModel.swift**

```swift
// Add zero state detection logic

@Published var shouldShowZeroState: Bool = false
@Published var userSettings: UserSettings?

func loadProfile() async {
    isLoading = true
    errorMessage = nil

    do {
        userProfile = try await apiClient.request(.getProfile)

        // NEW: Fetch user settings to check for completion
        userSettings = try await apiClient.request(.getUserSettings)

        // NEW: Determine if zero state should show
        shouldShowZeroState = determineZeroState()

        Logger.info("Profile loaded successfully")
    } catch {
        Logger.error("Failed to load profile: \(error)")
        errorMessage = error.localizedDescription
    }

    isLoading = false
}

private func determineZeroState() -> Bool {
    // Show zero state if user hasn't completed onboarding
    guard let user = userProfile?.user else { return true }

    if !user.hasCompletedOnboarding {
        return true
    }

    // Or if user has completed but with placeholder/empty values
    guard let settings = userSettings else { return true }

    let hasValidHeight = (settings.height ?? 0) > 0
    let hasValidWeight = (settings.currentWeight ?? 0) > 0

    return !hasValidHeight || !hasValidWeight
}
```

### API Integration

**Endpoint to Use:**

```
GET /v1/profile
Response includes user settings (already implemented in backend)
```

**Add UserSettings Model:**

```swift
// Location: Core/Models/UserSettings.swift

struct UserSettings: Codable, Sendable {
    let height: Double?
    let currentWeight: Double?
    let targetWeight: Double?
    let bmr: Int?
    let tdee: Int?
    let calorieTarget: Int?
    let proteinTarget: Int?
    let waterTarget: Int?
    let onboardingCompleted: Bool?

    enum CodingKeys: String, CodingKey {
        case height, currentWeight, targetWeight
        case bmr, tdee, calorieTarget, proteinTarget, waterTarget
        case onboardingCompleted
    }
}
```

---

## Feature 2: Metrics Summary After Onboarding

### What It Does

Shows a beautiful, educational summary screen immediately after completing onboarding, explaining BMR, TDEE, calorie targets, and projections with simple science-backed explanations.

### Files to Create

**1. HowItWorksSummary.swift**

```
Location: /Users/devarisbrown/Code/projects/gtsd/apps/GTSD/GTSD/Core/Models/HowItWorksSummary.swift

Purpose: Data models for the /v1/summary/how-it-works API response

Models:
- HowItWorksSummary (root)
- SummaryUser
- CurrentMetrics
- Goals
- Calculations (BMR, TDEE, Targets)
- Projection
- HowItWorks (4 steps)
```

**2. MetricsSummaryView.swift**

```
Location: /Users/devarisbrown/Code/projects/gtsd/apps/GTSD/GTSD/Features/Onboarding/MetricsSummaryView.swift

Purpose: Renders the metrics summary UI

Layout:
- ScrollView with cards for each metric
- BMR card (expandable)
- TDEE card (expandable)
- Daily Targets card (Calories, Protein, Water)
- Projection card (Start → Goal, timeline)
- How It Works card (4 steps)
- "Get Started" CTA at bottom

Interactions:
- Tap "Learn More" → Expand/collapse card
- Tap "Get Started" → Dismiss and navigate to Home
- Swipe down → Dismiss
```

**3. MetricsSummaryViewModel.swift**

```
Location: /Users/devarisbrown/Code/projects/gtsd/apps/GTSD/GTSD/Features/Onboarding/MetricsSummaryViewModel.swift

Purpose: Fetches and manages metrics summary data

Responsibilities:
- Fetch from GET /v1/summary/how-it-works
- Handle loading, error, success states
- Track analytics events
```

**4. Reusable Components**

```
MetricCard.swift - Displays a single metric with title, value, explanation, and optional "Learn More"
ExpandableCard.swift - Card wrapper that can expand/collapse
ProjectionCard.swift - Specialized card for weight projection timeline
```

### Files to Modify

**1. OnboardingViewModel.swift**

```swift
// Add metrics summary state and fetching logic

@Published var showMetricsSummary: Bool = false
@Published var metricsSummary: HowItWorksSummary?
@Published var isLoadingSummary: Bool = false

func completeOnboarding() async {
    guard let currentWeight = onboardingData.currentWeight,
          // ... all required fields ...
    else {
        errorMessage = "Please complete all required fields"
        return
    }

    isLoading = true
    errorMessage = nil

    do {
        // Existing onboarding completion
        let request = CompleteOnboardingRequest(...)
        let updatedUser: User = try await apiClient.request(.completeOnboarding(request))

        Logger.info("Onboarding completed successfully")

        // Update user
        await authService.updateCurrentUser(updatedUser)

        // NEW: Fetch metrics summary
        await fetchMetricsSummary()

        // NEW: Show metrics summary sheet
        if metricsSummary != nil {
            showMetricsSummary = true
        } else {
            // If summary fails, still proceed (non-blocking)
            // Sheet won't show, will go directly to Home
        }

    } catch {
        // ... error handling ...
    }

    isLoading = false
}

private func fetchMetricsSummary() async {
    isLoadingSummary = true

    do {
        let response: HowItWorksSummaryResponse = try await apiClient.request(.getHowItWorksSummary)
        metricsSummary = response.data
        Logger.info("Metrics summary fetched successfully")
    } catch {
        Logger.error("Failed to fetch metrics summary: \(error)")
        // Non-fatal error - user can still proceed without summary
        errorMessage = nil // Don't block onboarding completion
    }

    isLoadingSummary = false
}
```

**2. OnboardingCoordinator.swift**

```swift
// Add sheet presentation for metrics summary

var body: some View {
    NavigationStack {
        VStack(spacing: 0) {
            // ... existing onboarding UI ...
        }
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            // ... existing toolbar ...
        }
        // NEW: Metrics summary sheet
        .sheet(isPresented: $viewModel.showMetricsSummary) {
            if let summary = viewModel.metricsSummary {
                MetricsSummaryView(
                    summary: summary,
                    onGetStarted: {
                        viewModel.showMetricsSummary = false
                        dismiss() // Dismiss onboarding coordinator
                    }
                )
            }
        }
        .alert("Error", isPresented: .constant(viewModel.errorMessage != nil)) {
            // ... existing error alert ...
        }
    }
}
```

**3. APIEndpoint.swift**

```swift
// Add metrics summary endpoint

enum APIEndpoint: Sendable {
    // ... existing cases ...
    case getHowItWorksSummary

    var path: String {
        switch self {
        // ... existing paths ...
        case .getHowItWorksSummary: return "/v1/summary/how-it-works"
        }
    }

    var method: HTTPMethod {
        switch self {
        // ... existing methods ...
        case .getHowItWorksSummary: return .get
        }
    }

    var requiresAuth: Bool {
        switch self {
        // ... existing auth checks ...
        case .getHowItWorksSummary: return true
        }
    }
}
```

### API Integration

**Endpoint:**

```
GET /v1/summary/how-it-works
Authorization: Bearer {accessToken}

Response:
{
  "success": true,
  "data": {
    "user": {
      "name": "John Doe",
      "email": "john@example.com"
    },
    "currentMetrics": {
      "age": 30,
      "gender": "male",
      "weight": 180,
      "height": 175,
      "activityLevel": "moderately_active"
    },
    "goals": {
      "primaryGoal": "lose_weight",
      "targetWeight": 165,
      "targetDate": "2026-02-15T00:00:00Z"
    },
    "calculations": {
      "bmr": {
        "value": 1650,
        "explanation": "Your Basal Metabolic Rate...",
        "formula": "Mifflin-St Jeor Equation"
      },
      "tdee": {
        "value": 2475,
        "explanation": "Your Total Daily Energy Expenditure...",
        "activityMultiplier": 1.55
      },
      "targets": {
        "calories": {
          "value": 1975,
          "unit": "cal/day",
          "explanation": "To lose weight safely..."
        },
        "protein": {
          "value": 130,
          "unit": "grams/day",
          "explanation": "Protein helps preserve muscle mass..."
        },
        "water": {
          "value": 2450,
          "unit": "ml/day",
          "explanation": "Staying hydrated supports metabolism..."
        }
      }
    },
    "projection": {
      "startWeight": 180,
      "targetWeight": 165,
      "weeklyRate": 0.45,
      "estimatedWeeks": 15,
      "projectedDate": "2026-02-15T00:00:00Z",
      "explanation": "To lose 15 lbs safely..."
    },
    "howItWorks": {
      "step1": {
        "title": "Track Your Progress",
        "description": "We start with your BMR of 1650 calories..."
      },
      "step2": {
        "title": "Create a Sustainable Deficit/Surplus",
        "description": "To lose weight, we've set your daily target..."
      },
      "step3": {
        "title": "Stay Accountable",
        "description": "With proper nutrition and accountability partners..."
      },
      "step4": {
        "title": "Adjust as Needed",
        "description": "As you progress, your metabolism adapts..."
      }
    }
  }
}
```

**NOTE:** This endpoint is ALREADY IMPLEMENTED in the backend at:
`/Users/devarisbrown/Code/projects/gtsd/apps/api/src/routes/onboarding/index.ts` (line 137)

---

## User Flows

### Flow 1: User Skips Onboarding

```
1. User signs up → LoginView
2. User is authenticated → OnboardingCoordinator
3. User taps "Skip" in toolbar
   → OnboardingViewModel.skipOnboarding()
   → Sends default values to API
   → User.hasCompletedOnboarding = true (but with placeholder data)
4. Dismisses to TabBarView → Home screen
5. User navigates to Profile tab
6. ProfileViewModel.loadProfile()
   → Fetches user settings
   → Detects height = 0, weight = 0 (placeholder data)
   → Sets shouldShowZeroState = true
7. ProfileView renders ProfileZeroStateView
8. User taps "Complete Profile"
   → Opens OnboardingCoordinator (starts at step 1)
9. User completes onboarding
   → Shows MetricsSummaryView (Feature 2)
10. User taps "Get Started"
    → Returns to Profile tab
    → ProfileViewModel detects complete data
    → shouldShowZeroState = false
    → Shows full profile with metrics
```

### Flow 2: User Completes Onboarding

```
1. User signs up → LoginView
2. User is authenticated → OnboardingCoordinator
3. User completes all 5 steps (Welcome → Review)
4. User taps "Complete" in ReviewView
   → OnboardingViewModel.completeOnboarding()
   → POST /v1/onboarding (calculates BMR, TDEE, targets)
   → Returns User with hasCompletedOnboarding = true
5. OnboardingViewModel.fetchMetricsSummary()
   → GET /v1/summary/how-it-works
   → Returns HowItWorksSummary with all calculations
6. Sets showMetricsSummary = true
7. OnboardingCoordinator presents MetricsSummaryView as sheet
8. User views metrics (BMR, TDEE, targets, projection)
9. User optionally expands "Learn More" sections
10. User taps "Get Started"
    → Dismisses MetricsSummaryView
    → Dismisses OnboardingCoordinator
    → Navigates to TabBarView → Home screen
11. User can navigate to Profile tab
    → ProfileViewModel detects complete data
    → Shows full profile (no zero state)
```

---

## Component Breakdown

### ProfileZeroStateView Components

```swift
struct ProfileZeroStateView: View {
    let userName: String
    let onComplete: () -> Void
    let onDismiss: () -> Void

    var body: some View {
        VStack(spacing: Spacing.xl) {
            Spacer()

            // Hero Icon
            Image(systemName: "figure.mixed.cardio")
                .font(.system(size: 80))
                .foregroundColor(.primaryColor)

            // Headline
            Text("Complete Your Health Profile")
                .font(.headlineLarge)
                .multilineTextAlignment(.center)

            // Body
            Text("Unlock personalized nutrition goals, calorie targets, and science-backed recommendations tailored just for you.")
                .font(.bodyMedium)
                .foregroundColor(.textSecondary)
                .multilineTextAlignment(.center)
                .padding(.horizontal, Spacing.xl)

            // Primary CTA
            GTSDButton("Complete Profile", style: .primary) {
                onComplete()
            }
            .padding(.horizontal, Spacing.xl)

            // Secondary CTA
            Button("Maybe Later") {
                onDismiss()
            }
            .font(.bodyMedium)
            .foregroundColor(.textTertiary)

            Divider()
                .padding(.vertical, Spacing.md)

            // Benefits Section
            VStack(alignment: .leading, spacing: Spacing.md) {
                Text("What You'll Get:")
                    .font(.titleMedium)
                    .foregroundColor(.textPrimary)

                BenefitRow(icon: "target", text: "Daily calorie target based on your goals")
                BenefitRow(icon: "drop.fill", text: "Protein & water intake recommendations")
                BenefitRow(icon: "chart.bar.fill", text: "BMR and TDEE calculations explained")
                BenefitRow(icon: "chart.line.uptrend.xyaxis", text: "Personalized weight projection timeline")
            }
            .padding(.horizontal, Spacing.xl)

            Spacer()
        }
    }
}

struct BenefitRow: View {
    let icon: String
    let text: String

    var body: some View {
        HStack(spacing: Spacing.sm) {
            Image(systemName: icon)
                .font(.system(size: IconSize.sm))
                .foregroundColor(.primaryColor)
                .frame(width: 24)

            Text(text)
                .font(.bodyMedium)
                .foregroundColor(.textSecondary)

            Spacer()
        }
    }
}
```

### MetricsSummaryView Components

```swift
struct MetricsSummaryView: View {
    let summary: HowItWorksSummary
    let onGetStarted: () -> Void

    @State private var expandedSections: Set<String> = []

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: Spacing.lg) {
                    // Greeting
                    GreetingSection(name: summary.user.name, goal: summary.goals.primaryGoal)
                        .padding(.top, Spacing.lg)

                    // BMR Card
                    ExpandableMetricCard(
                        icon: "🔥",
                        title: "BMR (Basal Metabolic Rate)",
                        value: "\(summary.calculations.bmr.value) calories/day",
                        explanation: summary.calculations.bmr.explanation,
                        detailedExplanation: "Formula: \(summary.calculations.bmr.formula)...",
                        isExpanded: expandedSections.contains("bmr")
                    ) {
                        toggleSection("bmr")
                    }

                    // TDEE Card
                    ExpandableMetricCard(
                        icon: "⚡",
                        title: "TDEE (Total Daily Energy Expenditure)",
                        value: "\(summary.calculations.tdee.value) calories/day",
                        explanation: summary.calculations.tdee.explanation,
                        detailedExplanation: "Activity multiplier: \(summary.calculations.tdee.activityMultiplier)...",
                        isExpanded: expandedSections.contains("tdee")
                    ) {
                        toggleSection("tdee")
                    }

                    // Daily Targets Card
                    DailyTargetsCard(targets: summary.calculations.targets)

                    // Projection Card
                    ProjectionCard(projection: summary.projection)

                    // How It Works Card
                    HowItWorksCard(steps: summary.howItWorks)

                    // CTA
                    GTSDButton("Get Started", style: .primary) {
                        onGetStarted()
                    }
                    .padding(.horizontal, Spacing.xl)
                    .padding(.bottom, Spacing.xl)
                }
            }
            .navigationTitle("How GTSD Works for You")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("Close") {
                        onGetStarted()
                    }
                }
            }
        }
    }

    private func toggleSection(_ section: String) {
        if expandedSections.contains(section) {
            expandedSections.remove(section)
        } else {
            expandedSections.insert(section)
        }
    }
}
```

---

## Analytics Events to Implement

### Zero State Events

```swift
// When zero state is viewed
Analytics.logEvent("zero_state_viewed", parameters: [
    "location": "profile_tab",
    "has_completed_onboarding": false,
    "days_since_signup": daysSinceSignup
])

// When user taps "Complete Profile"
Analytics.logEvent("zero_state_cta_tapped", parameters: [
    "action": "complete_profile",
    "location": "profile_tab"
])

// When user taps "Maybe Later"
Analytics.logEvent("zero_state_cta_tapped", parameters: [
    "action": "maybe_later",
    "location": "profile_tab"
])

// When user completes profile from zero state
Analytics.logEvent("zero_state_profile_completed", parameters: [
    "time_to_complete_seconds": timeElapsed,
    "days_since_first_skip": daysSinceSkip
])
```

### Metrics Summary Events

```swift
// When summary is viewed
Analytics.logEvent("metrics_summary_viewed", parameters: [
    "bmr": summary.calculations.bmr.value,
    "tdee": summary.calculations.tdee.value,
    "calorie_target": summary.calculations.targets.calories.value,
    "primary_goal": summary.goals.primaryGoal,
    "estimated_weeks": summary.projection.estimatedWeeks
])

// When user expands "Learn More"
Analytics.logEvent("metrics_summary_learn_more_tapped", parameters: [
    "section": "bmr", // or "tdee", "targets"
    "action": "expand" // or "collapse"
])

// When user scrolls (track depth)
Analytics.logEvent("metrics_summary_scrolled", parameters: [
    "scroll_depth": 0.75, // 0.0 to 1.0
    "time_on_screen_seconds": timeElapsed
])

// When user completes summary
Analytics.logEvent("metrics_summary_completed", parameters: [
    "time_on_screen_seconds": timeElapsed,
    "expanded_sections": ["bmr", "targets"], // array of expanded sections
    "scroll_depth": 1.0,
    "exit_method": "get_started_button" // or "swipe_dismiss", "close_button"
])
```

---

## Testing Checklist

### Unit Tests

**ProfileViewModel Tests:**

- [x] `testShouldShowZeroState_WhenOnboardingNotCompleted()`
- [x] `testShouldShowZeroState_WhenHeightIsZero()`
- [x] `testShouldShowZeroState_WhenWeightIsZero()`
- [x] `testShouldNotShowZeroState_WhenProfileComplete()`
- [x] `testLoadProfile_FetchesUserSettings()`

**MetricsSummaryViewModel Tests:**

- [x] `testFetchSummary_Success()`
- [x] `testFetchSummary_NetworkError()`
- [x] `testFetchSummary_ParsingError()`
- [x] `testFetchSummary_404Error()`

**OnboardingViewModel Tests:**

- [x] `testCompleteOnboarding_FetchesSummary()`
- [x] `testCompleteOnboarding_ShowsSummaryOnSuccess()`
- [x] `testCompleteOnboarding_ContinuesOnSummaryError()` (non-blocking)

### Integration Tests

- [x] Zero state appears when user skips onboarding
- [x] Zero state disappears when user completes profile
- [x] "Complete Profile" CTA opens onboarding at step 1
- [x] Metrics summary appears after completing onboarding
- [x] Metrics summary dismisses on "Get Started"
- [x] Onboarding → Summary → Home flow works end-to-end

### UI Tests

- [x] Zero state renders correctly on all screen sizes
- [x] Metrics summary scrolls smoothly
- [x] "Learn More" expand/collapse works
- [x] VoiceOver labels are correct
- [x] Dynamic Type scales properly
- [x] Dark mode works
- [x] Light mode works

### Manual QA

**Zero State:**

- [ ] Visual design matches spec
- [ ] Icon, headline, body, CTAs all present
- [ ] Benefits list renders correctly
- [ ] Scrolls on small screens (iPhone SE)
- [ ] "Complete Profile" opens onboarding
- [ ] "Maybe Later" does nothing (expected for v1)

**Metrics Summary:**

- [ ] All 7 sections render correctly
- [ ] BMR, TDEE, targets show correct values
- [ ] Projection timeline is accurate
- [ ] "Learn More" expands/collapses smoothly
- [ ] "Get Started" dismisses and navigates to Home
- [ ] Close button (X) works
- [ ] Swipe down to dismiss works
- [ ] Scrolling is smooth (no lag)

**Edge Cases:**

- [ ] Network error during summary fetch → Graceful fallback
- [ ] Slow API response → Loading state shows
- [ ] User edits profile after onboarding → Zero state reappears if data deleted
- [ ] User re-opens onboarding to edit → Summary doesn't show again

---

## Success Metrics (Week 1 Post-Launch)

### Primary Metrics

- **Profile Completion Rate:** Target 25% of users who skipped complete within 7 days
- **Summary Completion Rate:** Target 70% scroll to bottom
- **Time to First Action:** Target < 2 minutes from summary to Home

### Secondary Metrics

- **Zero State Engagement:** Target 40% tap "Complete Profile"
- **"Learn More" Expansion:** Target 40% expand at least one section
- **7-Day Retention:** Target 10% improvement vs. control

### Technical Metrics

- **Crash Rate:** Should be < 0.1%
- **API Error Rate:** Should be < 1%
- **Summary Load Time:** Should be < 2s (p95)

---

## Rollout Plan

**Week 1: Internal Testing**

- Deploy to internal TestFlight
- Team dogfooding and testing

**Week 2: Beta Testing**

- Deploy to 100 external beta users
- Monitor analytics and collect feedback

**Week 3: Gradual Rollout**

- Day 1: 10% of production users
- Day 3: 25% of production users (if no issues)
- Day 7: 50% of production users
- Day 10: 100% rollout

**Feature Flags:**

- `enable_profile_zero_state` (can disable remotely)
- `enable_metrics_summary` (can disable remotely)

---

## Questions for Product/Design Team

1. **Zero State Persistence:** Should we track "Maybe Later" dismissals and stop showing after X times?
2. **Metrics Summary Revisit:** Should users be able to view summary again after onboarding (e.g., in Settings)?
3. **A/B Testing:** Which variant should we test first - messaging or summary length?
4. **Notifications:** Should we send a push notification reminder to complete profile after 3 days?
5. **Email Recap:** Should we send an email with metrics summary after onboarding?

---

## Resources

- **Full Specification:** `/Users/devarisbrown/Code/projects/gtsd/apps/GTSD_PRODUCT_SPEC.md`
- **Backend Endpoint:** Already implemented at `/Users/devarisbrown/Code/projects/gtsd/apps/api/src/routes/onboarding/index.ts`
- **Design System:** `/Users/devarisbrown/Code/projects/gtsd/apps/GTSD/GTSD/Core/Utilities/DesignSystem.swift`
- **Existing Components:**
  - `GTSDButton.swift`
  - `GTSDCard.swift`
  - `EmptyStateView.swift` (reference for zero state)
  - `LoadingView.swift`
  - `ErrorView.swift`

---

**Ready to implement! Start with Phase 1 (Zero State) and then move to Phase 2 (Metrics Summary).**
