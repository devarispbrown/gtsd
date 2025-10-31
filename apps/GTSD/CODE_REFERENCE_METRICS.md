# Code Reference: Metrics Summary Feature

Quick reference for key code patterns and usage examples.

---

## Table of Contents
1. [View Usage](#view-usage)
2. [ViewModel Usage](#viewmodel-usage)
3. [Service Usage](#service-usage)
4. [Model Examples](#model-examples)
5. [Component Usage](#component-usage)
6. [Testing Examples](#testing-examples)

---

## View Usage

### Basic Usage

```swift
import SwiftUI

// Present as a sheet
@State private var showMetricsSummary = false

var body: some View {
    Button("Show Metrics") {
        showMetricsSummary = true
    }
    .sheet(isPresented: $showMetricsSummary) {
        MetricsSummaryView {
            // Called when user acknowledges
            showMetricsSummary = false
            // Navigate to main app
        }
    }
}
```

### With Custom ViewModel

```swift
// Create custom view model (for testing or customization)
let viewModel = MetricsSummaryViewModel(
    metricsService: MockMetricsService()
)

MetricsSummaryView(viewModel: viewModel) {
    // Completion handler
    print("Metrics acknowledged!")
}
```

### Navigation Integration

```swift
NavigationStack {
    OnboardingFlow()
        .sheet(isPresented: $showMetrics) {
            MetricsSummaryView {
                showMetrics = false
                navigateToHome()
            }
        }
}
```

---

## ViewModel Usage

### Initialization

```swift
// Default initialization (uses ServiceContainer)
let viewModel = MetricsSummaryViewModel()

// Custom initialization (for testing)
let viewModel = MetricsSummaryViewModel(
    metricsService: mockService
)
```

### Fetching Metrics

```swift
class SomeViewController {
    let viewModel = MetricsSummaryViewModel()

    func loadMetrics() async {
        await viewModel.fetchMetrics()

        if let metrics = viewModel.metricsData {
            print("BMI: \(metrics.metrics.bmi)")
            print("BMR: \(metrics.metrics.bmr)")
            print("TDEE: \(metrics.metrics.tdee)")
        }
    }
}
```

### Acknowledging Metrics

```swift
func acknowledgeMetrics() async {
    let success = await viewModel.acknowledgeAndContinue()

    if success {
        // Navigate to next screen
        navigateToHome()
    } else if let error = viewModel.error {
        // Show error message
        showAlert(error.localizedDescription)
    }
}
```

### Toggling Sections

```swift
// Toggle a metric's expanded state
viewModel.toggleMetric("bmi")

// Check if expanded
if viewModel.isMetricExpanded("bmi") {
    print("BMI section is expanded")
}
```

### Background Refresh

```swift
// Start monitoring for new metrics
viewModel.startBackgroundRefresh()

// Stop monitoring
viewModel.stopBackgroundRefresh()

// Manual refresh check
await viewModel.refreshMetrics()
```

### Error Handling

```swift
// Observe errors
if let error = viewModel.error {
    switch error {
    case .notFound:
        print("No metrics found - complete profile")
    case .networkError:
        print("Network error - check connection")
    case .invalidResponse:
        print("Invalid response - try again")
    case .serverError(let message):
        print("Server error: \(message)")
    case .alreadyAcknowledged:
        print("Already acknowledged")
    }
}

// Retry after error
await viewModel.retry()

// Clear error
viewModel.clearError()
```

---

## Service Usage

### Direct Service Usage

```swift
let service = ServiceContainer.shared.metricsService

// Fetch metrics
do {
    let data = try await service.getTodayMetrics()
    print("BMI: \(data.metrics.bmi)")
} catch let error as MetricsError {
    print("Error: \(error.localizedDescription)")
}

// Acknowledge metrics
do {
    let response = try await service.acknowledgeMetrics(
        version: 1,
        metricsComputedAt: Date()
    )
    print("Acknowledged: \(response.data.acknowledged)")
} catch {
    print("Acknowledgement failed")
}

// Check for new metrics
let hasNew = try await service.checkForNewMetrics(
    lastComputedAt: lastDate
)
```

### Mock Service for Testing

```swift
#if DEBUG
let mockService = MockMetricsService()
mockService.shouldFail = false
mockService.mockMetrics = MetricsSummaryData(
    metrics: HealthMetrics(
        bmi: 24.5,
        bmr: 1650,
        tdee: 2475,
        computedAt: Date(),
        version: 1
    ),
    explanations: MetricsExplanations(
        bmi: "Normal range",
        bmr: "At rest energy",
        tdee: "Total daily burn"
    ),
    acknowledged: false,
    acknowledgement: nil
)

// Use in ViewModel
let viewModel = MetricsSummaryViewModel(metricsService: mockService)
#endif
```

---

## Model Examples

### HealthMetrics

```swift
let metrics = HealthMetrics(
    bmi: 24.5,
    bmr: 1650,
    tdee: 2475,
    computedAt: Date(),
    version: 1
)

// Formatted values
print(metrics.bmiFormatted)     // "24.5"
print(metrics.bmrFormatted)     // "1650 cal/day"
print(metrics.tdeeFormatted)    // "2475 cal/day"

// BMI category
print(metrics.bmiCategory)      // "Normal"
```

### MetricsSummaryData

```swift
let summaryData = MetricsSummaryData(
    metrics: metrics,
    explanations: explanations,
    acknowledged: false,
    acknowledgement: nil
)

// Check acknowledgement status
if summaryData.acknowledged {
    print("Already acknowledged on: \(summaryData.acknowledgement?.acknowledgedAt)")
}
```

### AcknowledgeMetricsRequest

```swift
let request = AcknowledgeMetricsRequest(
    version: metrics.version,
    metricsComputedAt: metrics.computedAt
)

// Encode to JSON
let encoder = JSONEncoder()
encoder.dateEncodingStrategy = .iso8601
let data = try encoder.encode(request)
```

---

## Component Usage

### MetricCard

```swift
import SwiftUI

MetricCard(
    icon: "heart.text.square.fill",
    iconColor: .blue,
    title: "BMI",
    value: "24.5",
    unit: nil,
    explanation: "Your BMI is in the normal range",
    isExpanded: isExpanded,
    onToggle: {
        isExpanded.toggle()
    }
)
.padding()
```

### ExpandableSection

```swift
ExpandableSection(
    title: "More Information",
    content: "This is detailed information about the metric...",
    isExpanded: true
)
```

### MetricsEmptyState

```swift
// Empty state
MetricsEmptyState(
    message: "Complete your profile to see metrics",
    actionTitle: "Complete Profile",
    action: {
        navigateToProfile()
    }
)

// Error state
MetricsErrorState(
    error: "Network error occurred",
    retryAction: {
        await loadMetrics()
    }
)
```

### AcknowledgeButton

```swift
AcknowledgeButton(
    isLoading: viewModel.isLoading,
    isDisabled: !viewModel.canAcknowledge
) {
    Task {
        await viewModel.acknowledgeAndContinue()
    }
}
.padding()
```

---

## Testing Examples

### Unit Tests

```swift
import XCTest
@testable import GTSD

@MainActor
final class MetricsSummaryViewModelTests: XCTestCase {
    var viewModel: MetricsSummaryViewModel!
    var mockService: MockMetricsService!

    override func setUp() {
        super.setUp()
        mockService = MockMetricsService()
        viewModel = MetricsSummaryViewModel(metricsService: mockService)
    }

    func testFetchMetricsSuccess() async {
        // Arrange
        mockService.shouldFail = false

        // Act
        await viewModel.fetchMetrics()

        // Assert
        XCTAssertNotNil(viewModel.metricsData)
        XCTAssertNil(viewModel.error)
        XCTAssertFalse(viewModel.isLoading)
    }

    func testFetchMetricsFailure() async {
        // Arrange
        mockService.shouldFail = true

        // Act
        await viewModel.fetchMetrics()

        // Assert
        XCTAssertNil(viewModel.metricsData)
        XCTAssertNotNil(viewModel.error)
        XCTAssertFalse(viewModel.isLoading)
    }

    func testAcknowledgeMetrics() async {
        // Arrange
        await viewModel.fetchMetrics()

        // Act
        let success = await viewModel.acknowledgeAndContinue()

        // Assert
        XCTAssertTrue(success)
        XCTAssertTrue(viewModel.acknowledged)
    }

    func testToggleMetric() {
        // Act
        viewModel.toggleMetric("bmi")

        // Assert
        XCTAssertTrue(viewModel.isMetricExpanded("bmi"))

        // Act again
        viewModel.toggleMetric("bmi")

        // Assert
        XCTAssertFalse(viewModel.isMetricExpanded("bmi"))
    }
}
```

### Service Tests

```swift
@MainActor
final class MetricsServiceTests: XCTestCase {
    var service: MetricsService!
    var mockAPIClient: MockAPIClient!

    override func setUp() {
        super.setUp()
        mockAPIClient = MockAPIClient()
        service = MetricsService(apiClient: mockAPIClient)
    }

    func testGetTodayMetrics() async throws {
        // Arrange
        let expectedResponse = MetricsSummaryResponse(
            success: true,
            data: mockMetricsData
        )
        mockAPIClient.mockResponse = expectedResponse

        // Act
        let data = try await service.getTodayMetrics()

        // Assert
        XCTAssertEqual(data.metrics.bmi, 24.5)
        XCTAssertEqual(data.metrics.bmr, 1650)
    }

    func testAcknowledgeMetrics() async throws {
        // Arrange
        let expectedResponse = AcknowledgeResponse(
            success: true,
            data: AcknowledgeResponseData(
                acknowledged: true,
                acknowledgement: Acknowledgement(
                    acknowledgedAt: Date(),
                    version: 1
                )
            )
        )
        mockAPIClient.mockResponse = expectedResponse

        // Act
        let response = try await service.acknowledgeMetrics(
            version: 1,
            metricsComputedAt: Date()
        )

        // Assert
        XCTAssertTrue(response.data.acknowledged)
    }
}
```

### UI Tests

```swift
final class MetricsSummaryUITests: XCTestCase {
    var app: XCUIApplication!

    override func setUp() {
        super.setUp()
        app = XCUIApplication()
        app.launch()
    }

    func testMetricsDisplay() {
        // Navigate to metrics summary
        app.buttons["Complete Onboarding"].tap()

        // Verify metrics cards appear
        XCTAssertTrue(app.staticTexts["Body Mass Index (BMI)"].exists)
        XCTAssertTrue(app.staticTexts["Basal Metabolic Rate (BMR)"].exists)
        XCTAssertTrue(app.staticTexts["Total Daily Energy Expenditure (TDEE)"].exists)
    }

    func testExpandCollapse() {
        // Tap Learn More button
        app.buttons["Learn More"].firstMatch.tap()

        // Verify expanded content appears
        XCTAssertTrue(app.staticTexts["What is BMI?"].exists)

        // Tap Show Less
        app.buttons["Show Less"].firstMatch.tap()

        // Verify content is hidden
        XCTAssertFalse(app.staticTexts["What is BMI?"].exists)
    }

    func testAcknowledgeFlow() {
        // Wait for metrics to load
        let acknowledgeButton = app.buttons["Acknowledge & Continue"]
        XCTAssertTrue(acknowledgeButton.waitForExistence(timeout: 5))

        // Tap acknowledge
        acknowledgeButton.tap()

        // Verify navigation occurred
        XCTAssertTrue(app.navigationBars["Home"].waitForExistence(timeout: 5))
    }
}
```

### Accessibility Tests

```swift
func testVoiceOverLabels() {
    // Verify all interactive elements have labels
    let acknowledgeButton = app.buttons["Acknowledge & Continue"]
    XCTAssertTrue(acknowledgeButton.exists)
    XCTAssertNotNil(acknowledgeButton.label)

    let learnMoreButton = app.buttons["Learn More"].firstMatch
    XCTAssertTrue(learnMoreButton.exists)
    XCTAssertNotNil(learnMoreButton.label)
}

func testDynamicType() {
    // Enable larger text
    app.launchArguments = ["-UIPreferredContentSizeCategoryName", "UICTContentSizeCategoryAccessibilityXXXL"]
    app.launch()

    // Verify layout doesn't break
    let acknowledgeButton = app.buttons["Acknowledge & Continue"]
    XCTAssertTrue(acknowledgeButton.exists)
    XCTAssertTrue(acknowledgeButton.isHittable)
}
```

---

## SwiftUI Preview Examples

### Basic Preview

```swift
#Preview {
    MetricsSummaryView(onComplete: {})
}
```

### With Mock Data

```swift
#Preview("With Metrics") {
    let mockService = MockMetricsService()
    mockService.mockMetrics = MetricsSummaryData(
        metrics: HealthMetrics(
            bmi: 24.5,
            bmr: 1650,
            tdee: 2475,
            computedAt: Date(),
            version: 1
        ),
        explanations: MetricsExplanations(
            bmi: "Normal range",
            bmr: "At rest energy",
            tdee: "Total daily burn"
        ),
        acknowledged: false,
        acknowledgement: nil
    )

    let viewModel = MetricsSummaryViewModel(metricsService: mockService)

    return MetricsSummaryView(viewModel: viewModel, onComplete: {})
}
```

### Error State Preview

```swift
#Preview("Error State") {
    let mockService = MockMetricsService()
    mockService.shouldFail = true

    let viewModel = MetricsSummaryViewModel(metricsService: mockService)

    return MetricsSummaryView(viewModel: viewModel, onComplete: {})
        .task {
            await viewModel.fetchMetrics()
        }
}
```

### Dark Mode Preview

```swift
#Preview("Dark Mode") {
    MetricsSummaryView(onComplete: {})
        .preferredColorScheme(.dark)
}
```

---

## Common Patterns

### Loading Pattern

```swift
struct MyView: View {
    @StateObject private var viewModel = MetricsSummaryViewModel()

    var body: some View {
        ZStack {
            if viewModel.isLoadingState {
                ProgressView("Loading...")
            } else if let error = viewModel.error {
                ErrorView(error: error) {
                    Task { await viewModel.retry() }
                }
            } else {
                ContentView(data: viewModel.metricsData)
            }
        }
        .task {
            await viewModel.fetchMetrics()
        }
    }
}
```

### Task Pattern

```swift
Button("Acknowledge") {
    Task {
        let success = await viewModel.acknowledgeAndContinue()
        if success {
            dismiss()
        }
    }
}
.disabled(viewModel.isLoading)
```

### Observation Pattern

```swift
@StateObject private var viewModel = MetricsSummaryViewModel()

var body: some View {
    ContentView()
        .onChange(of: viewModel.acknowledged) { _, newValue in
            if newValue {
                print("Metrics acknowledged!")
                navigateToHome()
            }
        }
}
```

---

## API Integration Examples

### Custom APIClient

```swift
let customClient = APIClient(baseURL: "https://api.example.com")
let service = MetricsService(apiClient: customClient)
let viewModel = MetricsSummaryViewModel(metricsService: service)
```

### Error Handling

```swift
do {
    let data = try await service.getTodayMetrics()
    // Success
} catch MetricsError.notFound {
    showAlert("Please complete your profile first")
} catch MetricsError.networkError {
    showAlert("Check your internet connection")
} catch {
    showAlert("An unexpected error occurred")
}
```

### Request Customization

```swift
// The service automatically handles:
// - Auth token injection
// - Request signing
// - Error mapping
// - Logging

// Just call the method:
let data = try await service.getTodayMetrics()
```

---

## Best Practices

### 1. Always Use Task for Async Calls

```swift
// ✅ Good
Button("Load") {
    Task {
        await viewModel.fetchMetrics()
    }
}

// ❌ Bad - will cause compiler errors
Button("Load") {
    await viewModel.fetchMetrics() // Error: 'async' call in non-async context
}
```

### 2. Handle All Error Cases

```swift
// ✅ Good
if let error = viewModel.error {
    switch error {
    case .notFound: showProfilePrompt()
    case .networkError: showNetworkError()
    case .invalidResponse: showRetryButton()
    case .serverError(let msg): showError(msg)
    case .alreadyAcknowledged: proceedToHome()
    }
}
```

### 3. Use ViewModels for Business Logic

```swift
// ✅ Good - logic in ViewModel
class MetricsSummaryViewModel {
    func canProceed() -> Bool {
        return metricsData != nil && !acknowledged
    }
}

// ❌ Bad - logic in View
var canProceed: Bool {
    viewModel.metricsData != nil && !viewModel.acknowledged
}
```

### 4. Leverage Dependency Injection

```swift
// ✅ Good - testable
let viewModel = MetricsSummaryViewModel(metricsService: mockService)

// ❌ Bad - hard to test
let viewModel = MetricsSummaryViewModel()
// Always uses production service
```

---

## Performance Tips

### 1. Avoid Unnecessary Re-renders

```swift
// ✅ Good - only updates when needed
@Published var metricsData: MetricsSummaryData?

// ❌ Bad - updates on every property change
@Published var metrics: HealthMetrics?
@Published var explanations: MetricsExplanations?
@Published var acknowledged: Bool?
```

### 2. Use Lazy Views

```swift
// ✅ Good
LazyVStack {
    ForEach(metrics) { metric in
        MetricCard(metric: metric)
    }
}
```

### 3. Cancel Background Tasks

```swift
// ✅ Good
deinit {
    refreshTask?.cancel()
}

// Task will be cancelled when view is dismissed
```

---

This reference guide covers the most common use cases and patterns for the Metrics Summary feature. Refer to the comprehensive documentation in `METRICS_SUMMARY_IMPLEMENTATION.md` for more details.
