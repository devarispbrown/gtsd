# Science Service Integration Guide

Quick reference for integrating the science service into existing app flows.

## Table of Contents
1. [Weight Update Integration](#weight-update-integration)
2. [Home Screen Widget](#home-screen-widget)
3. [Notification Handling](#notification-handling)
4. [Onboarding Flow](#onboarding-flow)
5. [Profile Screen](#profile-screen)

---

## Weight Update Integration

### Scenario
When user updates their weight in the profile screen, automatically trigger plan recomputation and show the changes.

### Implementation

**Step 1: Add PlanStore to ProfileEditViewModel**

```swift
// In ProfileEditViewModel.swift
@MainActor
class ProfileEditViewModel: ObservableObject {
    // Existing properties
    @Published var weight: Double
    @Published var isLoading: Bool = false

    // Add PlanStore
    private let planStore: PlanStore

    init(planStore: PlanStore = PlanStore(planService: ServiceContainer.shared.planService)) {
        self.planStore = planStore
        // ... existing init
    }

    // Update the weight update method
    func updateWeight(_ newWeight: Double) async {
        isLoading = true
        defer { isLoading = false }

        do {
            // 1. Update user profile via existing API
            try await profileService.updateWeight(newWeight)
            self.weight = newWeight

            // 2. Trigger plan recomputation
            await planStore.recomputePlan()

            // 3. Check if changes are significant
            if planStore.hasSignificantChanges() {
                // Show success alert with changes
                await MainActor.run {
                    showSuccessAlert = true
                }
            }

        } catch {
            errorMessage = error.localizedDescription
        }
    }
}
```

**Step 2: Update ProfileEditView**

```swift
// In ProfileEditView.swift
struct ProfileEditView: View {
    @StateObject private var viewModel: ProfileEditViewModel
    @State private var showChangeSummary = false

    var body: some View {
        Form {
            // Existing weight field
            Section("Weight") {
                HStack {
                    TextField("Weight", value: $viewModel.weight, format: .number)
                        .keyboardType(.decimalPad)

                    Text("lbs")
                        .foregroundColor(.textSecondary)
                }
            }

            // Save button
            Section {
                Button("Save Changes") {
                    Task {
                        await viewModel.updateWeight(viewModel.weight)
                        if viewModel.planStore.hasSignificantChanges() {
                            showChangeSummary = true
                        }
                    }
                }
                .disabled(viewModel.isLoading)
            }
        }
        .sheet(isPresented: $showChangeSummary) {
            PlanChangeSummaryView(
                planData: viewModel.planStore.currentPlan
            )
        }
    }
}
```

**Step 3: Create PlanChangeSummaryView (Optional)**

```swift
// New file: PlanChangeSummaryView.swift
struct PlanChangeSummaryView: View {
    let planData: PlanGenerationData?
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        NavigationStack {
            VStack(spacing: Spacing.lg) {
                // Success icon
                Image(systemName: "checkmark.circle.fill")
                    .font(.system(size: 60))
                    .foregroundColor(.green)

                Text("Plan Updated!")
                    .font(.titleLarge)

                if let planData = planData,
                   let previous = planData.previousTargets {
                    VStack(alignment: .leading, spacing: Spacing.md) {
                        changeRow(
                            title: "Daily Calories",
                            old: previous.calorieTarget,
                            new: planData.targets.calorieTarget,
                            unit: "cal"
                        )

                        changeRow(
                            title: "Daily Protein",
                            old: previous.proteinTarget,
                            new: planData.targets.proteinTarget,
                            unit: "g"
                        )

                        if let oldWeeks = previous.estimatedWeeks,
                           let newWeeks = planData.targets.estimatedWeeks {
                            changeRow(
                                title: "Timeline",
                                old: oldWeeks,
                                new: newWeeks,
                                unit: "weeks"
                            )
                        }
                    }
                    .padding()
                }

                GTSDButton("View Full Plan") {
                    dismiss()
                    // Navigate to PlanSummaryView
                }
                .padding(.horizontal)
            }
            .navigationTitle("Changes")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("Done") { dismiss() }
                }
            }
        }
    }

    private func changeRow(title: String, old: Int, new: Int, unit: String) -> some View {
        HStack {
            Text(title)
                .font(.bodyMedium)
                .foregroundColor(.textPrimary)

            Spacer()

            Text("\(old) \(unit)")
                .font(.bodyMedium)
                .foregroundColor(.textTertiary)
                .strikethrough()

            Image(systemName: "arrow.right")
                .font(.system(size: IconSize.xs))
                .foregroundColor(.textTertiary)

            Text("\(new) \(unit)")
                .font(.bodyMedium)
                .fontWeight(.semibold)
                .foregroundColor(.primaryColor)
        }
    }
}
```

---

## Home Screen Widget

### Scenario
Display compact plan overview on the home screen with quick access to full plan.

### Implementation

**Step 1: Create PlanWidgetView**

```swift
// New file: PlanWidgetView.swift
struct PlanWidgetView: View {
    let planData: PlanGenerationData

    var body: some View {
        NavigationLink(destination: PlanSummaryView()) {
            GTSDCard(padding: Spacing.md) {
                VStack(alignment: .leading, spacing: Spacing.sm) {
                    // Header
                    HStack {
                        Image(systemName: "target")
                            .font(.system(size: IconSize.md))
                            .foregroundColor(.primaryColor)

                        Text("Today's Targets")
                            .font(.titleSmall)
                            .foregroundColor(.textPrimary)

                        Spacer()

                        Image(systemName: "chevron.right")
                            .font(.system(size: IconSize.xs))
                            .foregroundColor(.textTertiary)
                    }

                    // Compact targets
                    HStack(spacing: Spacing.lg) {
                        targetPill(
                            icon: "flame.fill",
                            color: .orange,
                            value: "\(planData.targets.calorieTarget)",
                            unit: "cal"
                        )

                        targetPill(
                            icon: "leaf.fill",
                            color: .green,
                            value: "\(planData.targets.proteinTarget)",
                            unit: "g"
                        )

                        targetPill(
                            icon: "drop.fill",
                            color: .blue,
                            value: "\(planData.targets.waterTarget)",
                            unit: "ml"
                        )
                    }
                }
            }
        }
        .buttonStyle(PlainButtonStyle())
    }

    private func targetPill(icon: String, color: Color, value: String, unit: String) -> some View {
        HStack(spacing: Spacing.xs) {
            Image(systemName: icon)
                .font(.system(size: IconSize.xs))
                .foregroundColor(color)

            VStack(alignment: .leading, spacing: 0) {
                Text(value)
                    .font(.labelLarge)
                    .foregroundColor(.textPrimary)

                Text(unit)
                    .font(.bodySmall)
                    .foregroundColor(.textSecondary)
            }
        }
    }
}
```

**Step 2: Add to HomeView**

```swift
// In HomeView.swift
struct HomeView: View {
    @StateObject private var planStore = PlanStore(
        planService: ServiceContainer.shared.planService
    )

    var body: some View {
        ScrollView {
            VStack(spacing: Spacing.lg) {
                // Existing home content
                // ...

                // Add plan widget
                if let planData = planStore.currentPlan {
                    PlanWidgetView(planData: planData)
                        .padding(.horizontal, Spacing.xl)
                }

                // More existing content
                // ...
            }
        }
        .task {
            // Fetch plan on appear (uses cache if valid)
            await planStore.fetchPlan()
        }
    }
}
```

---

## Notification Handling

### Scenario
User receives a weekly reminder to recompute their plan. Tapping the notification opens the app and triggers recomputation.

### Implementation

**Step 1: Register Notification**

```swift
// In NotificationManager.swift
extension NotificationManager {
    func scheduleWeeklyPlanRecompute() {
        let content = UNMutableNotificationContent()
        content.title = "Weekly Check-In"
        content.body = "It's time to update your nutrition plan based on your progress!"
        content.sound = .default
        content.categoryIdentifier = "PLAN_RECOMPUTE"
        content.userInfo = ["action": "recompute_plan"]

        // Trigger every Monday at 9 AM
        var dateComponents = DateComponents()
        dateComponents.weekday = 2  // Monday
        dateComponents.hour = 9

        let trigger = UNCalendarNotificationTrigger(
            dateMatching: dateComponents,
            repeats: true
        )

        let request = UNNotificationRequest(
            identifier: "weekly_plan_recompute",
            content: content,
            trigger: trigger
        )

        UNUserNotificationCenter.current().add(request) { error in
            if let error = error {
                Logger.error("Failed to schedule notification: \(error)")
            }
        }
    }
}
```

**Step 2: Handle Notification Tap**

```swift
// In AppDelegate.swift or SceneDelegate.swift
extension AppDelegate: UNUserNotificationCenterDelegate {
    func userNotificationCenter(
        _ center: UNUserNotificationCenter,
        didReceive response: UNNotificationResponse,
        withCompletionHandler completionHandler: @escaping () -> Void
    ) {
        let userInfo = response.notification.request.content.userInfo

        if let action = userInfo["action"] as? String, action == "recompute_plan" {
            // Trigger plan recomputation
            Task {
                await ServiceContainer.shared.planStore.recomputePlan()

                // Navigate to plan screen
                await MainActor.run {
                    NotificationCenter.default.post(
                        name: .navigateToPlan,
                        object: nil
                    )
                }
            }
        }

        completionHandler()
    }
}

// Define notification name
extension Notification.Name {
    static let navigateToPlan = Notification.Name("navigateToPlan")
}
```

**Step 3: Handle Navigation**

```swift
// In MainTabView.swift or NavigationCoordinator.swift
struct MainTabView: View {
    @State private var selectedTab = 0

    var body: some View {
        TabView(selection: $selectedTab) {
            HomeView()
                .tabItem { /* ... */ }
                .tag(0)

            PlanSummaryView()
                .tabItem { /* ... */ }
                .tag(1)

            // ... other tabs
        }
        .onReceive(NotificationCenter.default.publisher(for: .navigateToPlan)) { _ in
            selectedTab = 1  // Navigate to plan tab
        }
    }
}
```

---

## Onboarding Flow

### Scenario
After user completes onboarding (enters height, weight, goals), generate their first plan.

### Implementation

**Step 1: Update Onboarding Completion**

```swift
// In OnboardingViewModel.swift
@MainActor
class OnboardingViewModel: ObservableObject {
    @Published var isComplete = false

    private let planStore: PlanStore

    init(planStore: PlanStore = PlanStore(planService: ServiceContainer.shared.planService)) {
        self.planStore = planStore
    }

    func completeOnboarding() async {
        do {
            // 1. Submit onboarding data to backend
            try await apiClient.request(.completeOnboarding(onboardingData))

            // 2. Generate initial plan
            await planStore.fetchPlan(forceRecompute: true)

            // 3. Mark onboarding as complete
            UserDefaults.standard.set(true, forKey: "hasCompletedOnboarding")

            await MainActor.run {
                isComplete = true
            }

        } catch {
            errorMessage = error.localizedDescription
        }
    }
}
```

**Step 2: Show Plan After Onboarding**

```swift
// In OnboardingView.swift
struct OnboardingView: View {
    @StateObject private var viewModel = OnboardingViewModel()

    var body: some View {
        // ... onboarding steps

        // Final step
        if currentStep == .final {
            VStack {
                ProgressView("Generating your personalized plan...")
                    .padding()
            }
            .task {
                await viewModel.completeOnboarding()
            }
            .fullScreenCover(isPresented: $viewModel.isComplete) {
                PlanWelcomeView()
            }
        }
    }
}

// New welcome screen showing plan
struct PlanWelcomeView: View {
    @StateObject private var planStore = PlanStore(
        planService: ServiceContainer.shared.planService
    )
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        NavigationStack {
            VStack(spacing: Spacing.xl) {
                Image(systemName: "checkmark.circle.fill")
                    .font(.system(size: 80))
                    .foregroundColor(.green)

                Text("Your Plan is Ready!")
                    .font(.headlineLarge)

                if let planData = planStore.currentPlan {
                    VStack(spacing: Spacing.md) {
                        Text("Here are your daily targets:")
                            .font(.bodyLarge)
                            .foregroundColor(.textSecondary)

                        HStack(spacing: Spacing.lg) {
                            targetCard(
                                icon: "flame.fill",
                                color: .orange,
                                value: "\(planData.targets.calorieTarget)",
                                label: "Calories"
                            )

                            targetCard(
                                icon: "leaf.fill",
                                color: .green,
                                value: "\(planData.targets.proteinTarget)g",
                                label: "Protein"
                            )

                            targetCard(
                                icon: "drop.fill",
                                color: .blue,
                                value: "\(planData.targets.waterTarget)ml",
                                label: "Water"
                            )
                        }
                    }
                }

                Spacer()

                GTSDButton("Get Started") {
                    dismiss()
                }
                .padding(.horizontal)
            }
            .padding()
        }
    }

    private func targetCard(icon: String, color: Color, value: String, label: String) -> some View {
        VStack(spacing: Spacing.xs) {
            Image(systemName: icon)
                .font(.system(size: IconSize.lg))
                .foregroundColor(color)

            Text(value)
                .font(.titleMedium)
                .foregroundColor(.textPrimary)

            Text(label)
                .font(.bodySmall)
                .foregroundColor(.textSecondary)
        }
        .frame(maxWidth: .infinity)
        .padding()
        .background(Color.backgroundSecondary)
        .cornerRadius(CornerRadius.lg)
    }
}
```

---

## Profile Screen

### Scenario
Add a "View My Plan" button in the profile screen for quick access.

### Implementation

```swift
// In ProfileView.swift
struct ProfileView: View {
    var body: some View {
        List {
            // Existing profile sections
            Section("Account") {
                // ... existing rows
            }

            // Add nutrition plan section
            Section("Nutrition") {
                NavigationLink(destination: PlanSummaryView()) {
                    HStack {
                        Image(systemName: "chart.bar.fill")
                            .foregroundColor(.primaryColor)

                        Text("My Nutrition Plan")
                            .font(.bodyLarge)
                    }
                }

                NavigationLink(destination: WhyItWorksView()) {
                    HStack {
                        Image(systemName: "lightbulb.fill")
                            .foregroundColor(.yellow)

                        Text("Why It Works")
                            .font(.bodyLarge)
                    }
                }
            }

            // Existing sections
            // ...
        }
    }
}
```

---

## Common Patterns

### Accessing PlanStore from Any View

**Option 1: Direct initialization**
```swift
struct MyView: View {
    @StateObject private var planStore = PlanStore(
        planService: ServiceContainer.shared.planService
    )
}
```

**Option 2: Environment injection**
```swift
// In App.swift
@main
struct GTSDApp: App {
    let planStore = PlanStore(planService: ServiceContainer.shared.planService)

    var body: some Scene {
        WindowGroup {
            ContentView()
                .environment(\.planStore, planStore)
        }
    }
}

// In any view
struct MyView: View {
    @Environment(\.planStore) private var planStore
}
```

### Handling Loading States

```swift
struct MyView: View {
    @StateObject private var planStore: PlanStore

    var body: some View {
        VStack {
            if planStore.isLoading {
                ProgressView("Loading plan...")
            } else if let error = planStore.error {
                ErrorView(message: error.localizedDescription) {
                    Task { await planStore.fetchPlan() }
                }
            } else if let plan = planStore.currentPlan {
                // Show plan content
            } else {
                Text("No plan available")
            }
        }
    }
}
```

### Refreshing Plan Data

```swift
// Simple refresh
Button("Refresh") {
    Task { await planStore.fetchPlan() }
}

// Force recompute
Button("Recalculate") {
    Task { await planStore.recomputePlan() }
}

// Pull-to-refresh
ScrollView {
    // content
}
.refreshable {
    await planStore.fetchPlan()
}
```

---

## Testing Integration

### Testing Weight Update Flow

```swift
final class WeightUpdateIntegrationTests: XCTestCase {
    var mockPlanService: MockPlanService!
    var planStore: PlanStore!
    var viewModel: ProfileEditViewModel!

    override func setUp() async throws {
        mockPlanService = MockPlanService()
        planStore = PlanStore(planService: mockPlanService)
        viewModel = ProfileEditViewModel(planStore: planStore)
    }

    func testWeightUpdate_TriggersRecompute() async {
        // Given
        mockPlanService.mockPlanData = createMockRecomputedPlan()

        // When
        await viewModel.updateWeight(180.0)

        // Then
        XCTAssertEqual(mockPlanService.generatePlanCallCount, 1)
        XCTAssertTrue(mockPlanService.lastForceRecomputeFlag)
        XCTAssertNotNil(planStore.currentPlan)
    }
}
```

---

## Troubleshooting

### Plan not updating after weight change
**Cause:** Cache not being invalidated
**Fix:** Use `recomputePlan()` not `fetchPlan()`

### Showing stale data
**Cause:** Cache TTL expired
**Fix:** Check `planStore.isStale` and show warning

### Network errors even when online
**Cause:** Auth token expired or certificate pinning issue
**Fix:** Check APIClient configuration and token refresh

### Tests failing with "MainActor" errors
**Cause:** Accessing MainActor-isolated properties from non-main context
**Fix:** Wrap assertions in `await MainActor.run { }`

---

## Quick Reference

### PlanStore API
```swift
// Fetch (uses cache if valid)
await planStore.fetchPlan()

// Force new API call
await planStore.fetchPlan(forceRecompute: true)

// Recompute (always forces)
await planStore.recomputePlan()

// Refresh (invalidates cache)
await planStore.refresh()

// Clear errors
planStore.clearError()

// Check state
planStore.currentPlan       // PlanGenerationData?
planStore.isLoading        // Bool
planStore.error            // PlanError?
planStore.lastUpdated      // Date?
planStore.isStale          // Bool
planStore.hasSignificantChanges()  // Bool
```

### PlanService API
```swift
// Generate plan
let data = try await planService.generatePlan(forceRecompute: false)
```

---

**Last Updated:** 2025-10-28
**Compatibility:** iOS 15+, Swift 5.9+
