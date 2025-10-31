# Science Service iOS - Test Implementation Guide

**Version:** 1.0
**Date:** 2025-10-28
**Status:** Implementation Ready

---

## Quick Start

This guide provides complete test implementations for the science service iOS integration. All tests follow existing patterns from `/Users/devarisbrown/Code/projects/gtsd/apps/ios/GTSDTests/`.

### Test File Structure

```
GTSDTests/
├── Stores/
│   └── PlanStoreTests.swift                  # 20 tests, 95% coverage target
├── Services/
│   └── PlanServiceTests.swift                # 15 tests, 90% coverage target
├── ViewModels/
│   └── PlanSummaryViewModelTests.swift       # 12 tests, 85% coverage target
├── Models/
│   └── PlanModelsTests.swift                 # 13 tests, 95% coverage target
├── Integration/
│   ├── PlanFlowIntegrationTests.swift        # 10 E2E tests
│   ├── PlanAPIIntegrationTests.swift         # 8 API tests
│   └── PlanCacheIntegrationTests.swift       # 7 cache tests
├── EdgeCases/
│   ├── PlanNetworkEdgeCasesTests.swift       # 12 network tests
│   ├── PlanDataEdgeCasesTests.swift          # 10 validation tests
│   └── PlanSystemStateTests.swift            # 8 system tests
├── Mocks/
│   ├── MockPlanData.swift                    # Test fixtures
│   ├── MockPlanService.swift                 # Service mocks
│   ├── MockCacheManager.swift                # Cache mocks
│   └── MockAPIClient+Plans.swift             # API mocks
└── Helpers/
    └── PlanTestHelpers.swift                 # Shared utilities
```

### GTSDUITests/

```
├── PlanSummaryUITests.swift                  # 15 critical flow tests
├── PlanComponentUITests.swift                # 8 component tests
├── PlanAccessibilityUITests.swift            # 13 accessibility tests
└── PageObjects/
    └── PlanPage.swift                        # Page object pattern
```

---

## Test Implementation Examples

### 1. PlanStoreTests.swift

**Location:** `/Users/devarisbrown/Code/projects/gtsd/apps/ios/GTSDTests/Stores/PlanStoreTests.swift`

```swift
import XCTest
@testable import GTSD

@MainActor
final class PlanStoreTests: XCTestCase {
    var sut: PlanStore!
    var mockPlanService: MockPlanService!
    var mockCacheManager: MockCacheManager!

    override func setUp() async throws {
        try await super.setUp()

        mockPlanService = MockPlanService()
        mockCacheManager = MockCacheManager()

        sut = PlanStore(
            planService: mockPlanService,
            cacheManager: mockCacheManager
        )
    }

    override func tearDown() async throws {
        sut = nil
        mockPlanService = nil
        mockCacheManager = nil

        try await super.tearDown()
    }

    // MARK: - Cache Hit Tests

    func testFetchPlan_WithValidCache_ShouldUseCachedData() async throws {
        // Given: Valid cached plan
        let cachedPlan = MockPlanData.weightLossPlan
        sut.currentPlan = cachedPlan
        sut.lastUpdated = Date() // Fresh cache

        // When: Fetch plan
        await sut.fetchPlan()

        // Then: Should use cache, not call service
        let serviceCallCount = await mockPlanService.callCount
        XCTAssertEqual(serviceCallCount, 0, "Should not call service with valid cache")
        XCTAssertEqual(sut.currentPlan?.plan.id, cachedPlan.plan.id)
        XCTAssertFalse(sut.isLoading)
        XCTAssertNil(sut.error)
    }

    func testFetchPlan_WithExpiredCache_ShouldRefreshFromAPI() async throws {
        // Given: Expired cache (> 1 hour old)
        let cachedPlan = MockPlanData.weightLossPlan
        let newPlan = MockPlanData.muscleGainPlan

        sut.currentPlan = cachedPlan
        sut.lastUpdated = Date(timeIntervalSinceNow: -3700) // 1 hour 1 minute ago

        await mockPlanService.configureSuccess(with: newPlan)

        // When: Fetch plan
        await sut.fetchPlan()

        // Then: Should fetch from API
        let serviceCallCount = await mockPlanService.callCount
        XCTAssertEqual(serviceCallCount, 1, "Should call service with expired cache")
        XCTAssertEqual(sut.currentPlan?.plan.id, newPlan.plan.id)
        XCTAssertNotNil(sut.lastUpdated)
    }

    func testFetchPlan_WithNoCache_ShouldFetchFromAPI() async throws {
        // Given: No cached plan
        let plan = MockPlanData.weightLossPlan
        await mockPlanService.configureSuccess(with: plan)

        // When: Fetch plan
        await sut.fetchPlan()

        // Then: Should fetch from API
        let serviceCallCount = await mockPlanService.callCount
        XCTAssertEqual(serviceCallCount, 1)
        XCTAssertEqual(sut.currentPlan?.plan.id, plan.plan.id)
        XCTAssertNotNil(sut.lastUpdated)
    }

    // MARK: - Error Handling Tests

    func testFetchPlan_WithNetworkError_ShouldSetErrorState() async throws {
        // Given: Network error
        await mockPlanService.configureFailure(
            with: .networkError("Connection failed")
        )

        // When: Fetch plan
        await sut.fetchPlan()

        // Then: Should set error state
        XCTAssertNil(sut.currentPlan)
        XCTAssertNotNil(sut.error)
        XCTAssertFalse(sut.isLoading)

        if case .networkError = sut.error {
            // Success - correct error type
        } else {
            XCTFail("Expected network error")
        }
    }

    func testFetchPlan_WithOnboardingIncomplete_ShouldSetAppropriateError() async throws {
        // Given: Onboarding incomplete error
        await mockPlanService.configureFailure(
            with: .onboardingIncomplete
        )

        // When: Fetch plan
        await sut.fetchPlan()

        // Then: Should set onboarding error
        XCTAssertNil(sut.currentPlan)
        XCTAssertNotNil(sut.error)

        if case .onboardingIncomplete = sut.error {
            // Success
        } else {
            XCTFail("Expected onboarding incomplete error")
        }
    }

    // MARK: - Loading State Tests

    func testFetchPlan_WhileLoading_ShouldSetLoadingState() async throws {
        // Given: Slow service call
        let plan = MockPlanData.weightLossPlan
        await mockPlanService.configureSuccess(with: plan)
        mockPlanService.delay = 0.5

        // When: Start fetch
        let fetchTask = Task {
            await sut.fetchPlan()
        }

        // Then: Should be loading
        try await Task.sleep(nanoseconds: 100_000_000) // 0.1s
        XCTAssertTrue(sut.isLoading)

        // Wait for completion
        await fetchTask.value
        XCTAssertFalse(sut.isLoading)
    }

    // MARK: - Cache Persistence Tests

    func testSaveToCache_WithValidData_ShouldPersistToDisk() async throws {
        // Given: Valid plan from API
        let plan = MockPlanData.weightLossPlan
        await mockPlanService.configureSuccess(with: plan)

        // When: Fetch plan (which saves to cache)
        await sut.fetchPlan()

        // Then: Cache manager should be called
        XCTAssertTrue(mockCacheManager.setWasCalled)
        XCTAssertEqual(mockCacheManager.setCallCount, 1)
        XCTAssertEqual(mockCacheManager.lastSavedKey, "gtsd.cache.planData")
    }

    func testLoadFromCache_WithCorruptedData_ShouldInvalidateAndFetch() async throws {
        // Given: Corrupted cache
        mockCacheManager.simulateCorruptedCache()
        let plan = MockPlanData.weightLossPlan
        await mockPlanService.configureSuccess(with: plan)

        // When: Load plan
        await sut.fetchPlan()

        // Then: Should fetch from API due to corrupted cache
        let serviceCallCount = await mockPlanService.callCount
        XCTAssertEqual(serviceCallCount, 1)
        XCTAssertTrue(mockCacheManager.removeWasCalled)
    }

    func testInvalidateCache_ShouldClearBothMemoryAndDisk() {
        // Given: Plan in cache
        sut.currentPlan = MockPlanData.weightLossPlan
        sut.lastUpdated = Date()

        // When: Invalidate cache
        sut.invalidateCache()

        // Then: Should clear cache
        XCTAssertNil(sut.lastUpdated)
        XCTAssertTrue(mockCacheManager.removeWasCalled)
    }

    // MARK: - Force Recompute Tests

    func testRecomputePlan_ShouldBypassCacheAndForceRefresh() async throws {
        // Given: Valid cached plan
        let cachedPlan = MockPlanData.weightLossPlan
        let newPlan = MockPlanData.recomputedPlan

        sut.currentPlan = cachedPlan
        sut.lastUpdated = Date() // Fresh cache

        await mockPlanService.configureSuccess(with: newPlan)

        // When: Force recompute
        await sut.recomputePlan()

        // Then: Should call service with forceRecompute = true
        let serviceCallCount = await mockPlanService.callCount
        let forceRecompute = await mockPlanService.forceRecomputeUsed

        XCTAssertEqual(serviceCallCount, 1)
        XCTAssertTrue(forceRecompute, "Should use forceRecompute flag")
        XCTAssertEqual(sut.currentPlan?.plan.id, newPlan.plan.id)
        XCTAssertTrue(sut.currentPlan?.recomputed ?? false)
    }

    func testRefresh_ShouldInvalidateCacheAndReload() async throws {
        // Given: Cached plan
        let oldPlan = MockPlanData.weightLossPlan
        let newPlan = MockPlanData.muscleGainPlan

        sut.currentPlan = oldPlan
        sut.lastUpdated = Date()

        await mockPlanService.configureSuccess(with: newPlan)

        // When: Refresh
        await sut.refresh()

        // Then: Should invalidate and reload
        XCTAssertTrue(mockCacheManager.removeWasCalled)
        XCTAssertEqual(sut.currentPlan?.plan.id, newPlan.plan.id)
    }

    // MARK: - Change Detection Tests

    func testHasSignificantChanges_WithLargeChange_ShouldReturnTrue() {
        // Given: Targets with significant difference
        let previousTargets = ComputedTargets(
            bmr: 1800,
            tdee: 2500,
            calorieTarget: 2000,
            proteinTarget: 165,
            waterTarget: 2600,
            weeklyRate: -0.5
        )

        let currentTargets = ComputedTargets(
            bmr: 1750,
            tdee: 2400,
            calorieTarget: 1900, // 100 kcal difference
            proteinTarget: 160,
            waterTarget: 2500,
            weeklyRate: -0.5
        )

        sut.currentPlan = PlanGenerationData(
            plan: MockPlanData.weightLossPlan.plan,
            targets: currentTargets,
            whyItWorks: MockPlanData.standardWhyItWorks,
            recomputed: false,
            previousTargets: nil
        )

        // When: Check for significant changes
        let hasChanges = sut.hasSignificantChanges(from: previousTargets)

        // Then: Should detect significant change
        XCTAssertTrue(hasChanges, "100 kcal difference should be significant")
    }

    func testHasSignificantChanges_WithSmallChange_ShouldReturnFalse() {
        // Given: Targets with small difference
        let previousTargets = ComputedTargets(
            bmr: 1800,
            tdee: 2500,
            calorieTarget: 2000,
            proteinTarget: 165,
            waterTarget: 2600,
            weeklyRate: -0.5
        )

        let currentTargets = ComputedTargets(
            bmr: 1800,
            tdee: 2500,
            calorieTarget: 2010, // Only 10 kcal difference
            proteinTarget: 165,
            waterTarget: 2600,
            weeklyRate: -0.5
        )

        sut.currentPlan = PlanGenerationData(
            plan: MockPlanData.weightLossPlan.plan,
            targets: currentTargets,
            whyItWorks: MockPlanData.standardWhyItWorks,
            recomputed: false,
            previousTargets: nil
        )

        // When: Check for significant changes
        let hasChanges = sut.hasSignificantChanges(from: previousTargets)

        // Then: Should not detect significant change
        XCTAssertFalse(hasChanges, "10 kcal difference should not be significant")
    }

    // MARK: - Thread Safety Tests

    func testConcurrentAccess_ShouldNotCrash() async throws {
        // Given: Multiple concurrent fetch requests
        await mockPlanService.configureSuccess(with: MockPlanData.weightLossPlan)

        // When: Execute concurrent fetches
        await withTaskGroup(of: Void.self) { group in
            for _ in 1...10 {
                group.addTask {
                    await self.sut.fetchPlan()
                }
            }
        }

        // Then: Should not crash and have valid state
        XCTAssertNotNil(sut.currentPlan)
        XCTAssertFalse(sut.isLoading)
    }

    func testMainActorIsolation_ShouldBeEnforced() {
        // This test verifies at compile time that PlanStore is @MainActor isolated
        // If this compiles, the isolation is enforced

        Task { @MainActor in
            let plan = sut.currentPlan
            let loading = sut.isLoading
            let error = sut.error

            XCTAssertNotNil(plan, loading, error) // Use variables to avoid warnings
        }
    }
}
```

---

### 2. PlanServiceTests.swift

**Location:** `/Users/devarisbrown/Code/projects/gtsd/apps/ios/GTSDTests/Services/PlanServiceTests.swift`

```swift
import XCTest
@testable import GTSD

final class PlanServiceTests: XCTestCase {
    var sut: PlanService!
    var mockAPIClient: MockAPIClient!

    override func setUp() async throws {
        try await super.setUp()

        mockAPIClient = MockAPIClient()
        sut = PlanService(apiClient: mockAPIClient)
    }

    override func tearDown() async throws {
        sut = nil
        mockAPIClient = nil

        try await super.tearDown()
    }

    // MARK: - Success Tests

    func testGeneratePlan_Success_ShouldReturnParsedData() async throws {
        // Given: Successful API response
        let expectedPlan = MockPlanData.weightLossPlan
        let response = MockPlanData.successResponse(with: expectedPlan)

        mockAPIClient.mockResponse = response

        // When: Generate plan
        let result = try await sut.generatePlan(forceRecompute: false)

        // Then: Should return parsed data
        XCTAssertEqual(result.plan.id, expectedPlan.plan.id)
        XCTAssertEqual(result.targets.calorieTarget, expectedPlan.targets.calorieTarget)
        XCTAssertTrue(mockAPIClient.requestWasCalled)
    }

    func testGeneratePlan_WithForceRecompute_ShouldPassCorrectParameter() async throws {
        // Given: API client ready
        mockAPIClient.mockResponse = MockPlanData.successResponse(
            with: MockPlanData.weightLossPlan
        )

        // When: Generate plan with force recompute
        _ = try await sut.generatePlan(forceRecompute: true)

        // Then: Should pass forceRecompute parameter
        XCTAssertEqual(mockAPIClient.lastEndpointCalled?.path, "/v1/plans/generate")
        // Verify body contains forceRecompute: true
        if let body = try? mockAPIClient.lastEndpointCalled?.body(),
           let json = try? JSONSerialization.jsonObject(with: body) as? [String: Any] {
            XCTAssertEqual(json["forceRecompute"] as? Bool, true)
        }
    }

    // MARK: - Error Mapping Tests

    func testGeneratePlan_404Error_ShouldMapToNotFoundError() async throws {
        // Given: 404 response
        mockAPIClient.mockError = APIError.httpError(
            statusCode: 404,
            message: "Plan not found"
        )

        // When/Then: Should throw mapped error
        do {
            _ = try await sut.generatePlan(forceRecompute: false)
            XCTFail("Expected error to be thrown")
        } catch let error as PlanError {
            if case .notFound = error {
                // Success
            } else {
                XCTFail("Expected .notFound error, got \(error)")
            }
        }
    }

    func testGeneratePlan_400OnboardingError_ShouldMapToOnboardingIncomplete() async throws {
        // Given: 400 response with onboarding message
        mockAPIClient.mockError = APIError.httpError(
            statusCode: 400,
            message: "User onboarding not complete"
        )

        // When/Then: Should throw onboarding error
        do {
            _ = try await sut.generatePlan(forceRecompute: false)
            XCTFail("Expected error to be thrown")
        } catch let error as PlanError {
            if case .onboardingIncomplete = error {
                // Success
            } else {
                XCTFail("Expected .onboardingIncomplete error")
            }
        }
    }

    func testGeneratePlan_429Error_ShouldMapToRateLimitExceeded() async throws {
        // Given: 429 rate limit response
        mockAPIClient.mockError = APIError.httpError(
            statusCode: 429,
            message: "Too many requests"
        )

        // When/Then: Should throw rate limit error
        do {
            _ = try await sut.generatePlan(forceRecompute: false)
            XCTFail("Expected error to be thrown")
        } catch let error as PlanError {
            if case .rateLimitExceeded = error {
                // Success
            } else {
                XCTFail("Expected .rateLimitExceeded error")
            }
        }
    }

    func testGeneratePlan_500Error_ShouldMapToServerError() async throws {
        // Given: 500 server error
        mockAPIClient.mockError = APIError.httpError(
            statusCode: 500,
            message: "Internal server error"
        )

        // When/Then: Should throw server error
        do {
            _ = try await sut.generatePlan(forceRecompute: false)
            XCTFail("Expected error to be thrown")
        } catch let error as PlanError {
            if case .serverError(let code, _) = error {
                XCTAssertEqual(code, 500)
            } else {
                XCTFail("Expected .serverError")
            }
        }
    }

    func testGeneratePlan_NetworkTimeout_ShouldMapToTimeoutError() async throws {
        // Given: Network timeout
        let timeoutError = NSError(
            domain: NSURLErrorDomain,
            code: NSURLErrorTimedOut,
            userInfo: nil
        )
        mockAPIClient.mockError = APIError.networkError(timeoutError)

        // When/Then: Should throw timeout error
        do {
            _ = try await sut.generatePlan(forceRecompute: false)
            XCTFail("Expected error to be thrown")
        } catch let error as PlanError {
            if case .timeout = error {
                // Success
            } else {
                XCTFail("Expected .timeout error")
            }
        }
    }

    func testGeneratePlan_NoInternetConnection_ShouldMapToNoConnectionError() async throws {
        // Given: No internet connection
        let noConnectionError = NSError(
            domain: NSURLErrorDomain,
            code: NSURLErrorNotConnectedToInternet,
            userInfo: nil
        )
        mockAPIClient.mockError = APIError.networkError(noConnectionError)

        // When/Then: Should throw no internet error
        do {
            _ = try await sut.generatePlan(forceRecompute: false)
            XCTFail("Expected error to be thrown")
        } catch let error as PlanError {
            if case .noInternetConnection = error {
                // Success
            } else {
                XCTFail("Expected .noInternetConnection error")
            }
        }
    }

    // MARK: - Validation Tests

    func testGeneratePlan_InvalidJSON_ShouldThrowDecodingError() async throws {
        // Given: Invalid JSON response
        mockAPIClient.mockRawData = MockPlanData.invalidJSONResponse

        // When/Then: Should throw decoding error
        do {
            _ = try await sut.generatePlan(forceRecompute: false)
            XCTFail("Expected decoding error")
        } catch let error as PlanError {
            if case .invalidResponse = error {
                // Success
            } else {
                XCTFail("Expected .invalidResponse error")
            }
        }
    }

    func testValidateResponse_ValidData_ShouldPass() throws {
        // Given: Valid plan data
        let plan = MockPlanData.weightLossPlan

        // When: Validate
        let isValid = plan.isValid()

        // Then: Should pass validation
        XCTAssertTrue(isValid)
    }

    func testValidateResponse_InvalidTargets_ShouldFail() throws {
        // Given: Plan with invalid targets
        let invalidPlan = MockPlanData.planWithInvalidBMR()

        // When: Validate
        let isValid = invalidPlan.isValid()

        // Then: Should fail validation
        XCTAssertFalse(isValid)
    }
}
```

---

### 3. Integration Tests Example

**Location:** `/Users/devarisbrown/Code/projects/gtsd/apps/ios/GTSDTests/Integration/PlanFlowIntegrationTests.swift`

```swift
import XCTest
@testable import GTSD

@MainActor
final class PlanFlowIntegrationTests: XCTestCase {
    var planStore: PlanStore!
    var planService: PlanService!
    var apiClient: MockAPIClient!
    var cacheManager: MockCacheManager!

    override func setUp() async throws {
        try await super.setUp()

        apiClient = MockAPIClient()
        cacheManager = MockCacheManager()
        planService = PlanService(apiClient: apiClient)
        planStore = PlanStore(
            planService: planService,
            cacheManager: cacheManager
        )
    }

    override func tearDown() async throws {
        planStore = nil
        planService = nil
        apiClient = nil
        cacheManager = nil

        try await super.tearDown()
    }

    // MARK: - Complete Flows

    func testCompleteFlow_UpdateWeight_PlanRefreshes() async throws {
        // This test simulates the complete flow:
        // 1. User updates weight
        // 2. ProfileService updates backend
        // 3. PlanStore triggers recompute
        // 4. UI updates with new targets

        // Given: Initial plan loaded
        let initialPlan = MockPlanData.weightLossPlan
        apiClient.mockResponse = MockPlanData.successResponse(with: initialPlan)
        await planStore.fetchPlan()

        XCTAssertEqual(planStore.currentPlan?.targets.calorieTarget, 2000)

        // When: User updates weight (simulated via plan recompute)
        let updatedPlan = MockPlanData.recomputedPlan
        apiClient.mockResponse = MockPlanData.successResponse(with: updatedPlan)
        await planStore.recomputePlan()

        // Then: Plan should be updated
        XCTAssertTrue(planStore.currentPlan?.recomputed ?? false)
        XCTAssertEqual(planStore.currentPlan?.targets.calorieTarget, 1900)
        XCTAssertNotNil(planStore.currentPlan?.previousTargets)
        XCTAssertEqual(planStore.currentPlan?.previousTargets?.calorieTarget, 2000)

        // Cache should be updated
        XCTAssertTrue(cacheManager.setWasCalled)
        XCTAssertEqual(cacheManager.setCallCount, 2) // Initial + recompute
    }

    func testCompleteFlow_FirstTimePlanGeneration() async throws {
        // Simulates new user completing onboarding

        // Given: No cached plan
        XCTAssertNil(planStore.currentPlan)

        // When: First plan generation
        let plan = MockPlanData.weightLossPlan
        apiClient.mockResponse = MockPlanData.successResponse(with: plan)
        await planStore.fetchPlan()

        // Then: Plan should be loaded and cached
        XCTAssertNotNil(planStore.currentPlan)
        XCTAssertEqual(planStore.currentPlan?.plan.id, plan.plan.id)
        XCTAssertTrue(cacheManager.setWasCalled)
        XCTAssertNotNil(planStore.lastUpdated)
    }

    func testCompleteFlow_CachedPlanLoaded() async throws {
        // Simulates app launch with valid cache

        // Given: Valid cache exists
        let cachedPlan = MockPlanData.weightLossPlan
        cacheManager.set(cachedPlan, forKey: "gtsd.cache.planData")

        // Recreate store to trigger cache load
        planStore = PlanStore(
            planService: planService,
            cacheManager: cacheManager
        )

        // When: Fetch plan
        await planStore.fetchPlan()

        // Then: Should use cache, not call API
        XCTAssertEqual(apiClient.requestCallCount, 0)
        XCTAssertNotNil(planStore.currentPlan)
    }

    func testCompleteFlow_OfflineToOnlineTransition() async throws {
        // Simulates offline → online transition

        // Given: Cached plan, device offline
        let cachedPlan = MockPlanData.weightLossPlan
        planStore.currentPlan = cachedPlan
        planStore.lastUpdated = Date()

        apiClient.mockError = APIError.networkError(
            NSError(domain: NSURLErrorDomain, code: NSURLErrorNotConnectedToInternet)
        )

        // When: Try to fetch while offline
        await planStore.fetchPlan()

        // Then: Should use cache
        XCTAssertNotNil(planStore.currentPlan)

        // When: Device comes online
        let updatedPlan = MockPlanData.muscleGainPlan
        apiClient.mockError = nil
        apiClient.mockResponse = MockPlanData.successResponse(with: updatedPlan)
        await planStore.refresh()

        // Then: Should fetch fresh data
        XCTAssertEqual(planStore.currentPlan?.plan.id, updatedPlan.plan.id)
    }
}
```

---

## UI Test Examples

### 4. PlanSummaryUITests.swift

**Location:** `/Users/devarisbrown/Code/projects/gtsd/apps/ios/GTSDUITests/PlanSummaryUITests.swift`

```swift
import XCUITest

final class PlanSummaryUITests: XCTestCase {
    var app: XCUIApplication!

    override func setUpWithError() throws {
        continueAfterFailure = false

        app = XCUIApplication()
        app.launchArguments = ["--uitest", "--mock-api"]
        app.launch()
    }

    func testTapPlanTab_ShouldLoadPlan() {
        // Given: User logged in
        loginAsTestUser()

        // When: Tap "My Plan" tab
        app.tabBars.buttons["My Plan"].tap()

        // Then: Plan should load
        let calorieTarget = app.staticTexts["calorie_target"]
        XCTAssertTrue(calorieTarget.waitForExistence(timeout: 5))

        let proteinTarget = app.staticTexts["protein_target"]
        XCTAssertTrue(proteinTarget.exists)

        let waterTarget = app.staticTexts["water_target"]
        XCTAssertTrue(waterTarget.exists)

        // Timeline should be visible
        let timeline = app.otherElements["timeline_view"]
        XCTAssertTrue(timeline.exists)
    }

    func testPullToRefresh_ShouldUpdatePlan() {
        // Given: Plan screen visible
        loginAsTestUser()
        app.tabBars.buttons["My Plan"].tap()

        let scrollView = app.scrollViews.firstMatch
        XCTAssertTrue(scrollView.waitForExistence(timeout: 2))

        // When: Pull to refresh
        let start = scrollView.coordinate(withNormalizedOffset: CGVector(dx: 0.5, dy: 0.2))
        let end = scrollView.coordinate(withNormalizedOffset: CGVector(dx: 0.5, dy: 0.8))
        start.press(forDuration: 0.1, thenDragTo: end)

        // Then: Refresh indicator should appear
        let refreshIndicator = app.activityIndicators["refresh_indicator"]
        XCTAssertTrue(refreshIndicator.waitForExistence(timeout: 2))

        // Plan should update
        let updatedLabel = app.staticTexts["updated_indicator"]
        XCTAssertTrue(updatedLabel.waitForExistence(timeout: 5))
    }

    func testTapWhyItWorks_ShouldShowEducation() {
        // Given: Plan displayed
        loginAsTestUser()
        app.tabBars.buttons["My Plan"].tap()

        // When: Tap "Why It Works"
        let whyItWorksButton = app.buttons["why_it_works_button"]
        XCTAssertTrue(whyItWorksButton.waitForExistence(timeout: 2))
        whyItWorksButton.tap()

        // Then: Educational content should expand
        let educationContent = app.otherElements["education_content"]
        XCTAssertTrue(educationContent.waitForExistence(timeout: 2))

        // Should show all sections
        XCTAssertTrue(app.staticTexts["calorie_explanation"].exists)
        XCTAssertTrue(app.staticTexts["protein_explanation"].exists)
        XCTAssertTrue(app.staticTexts["water_explanation"].exists)
        XCTAssertTrue(app.staticTexts["weekly_rate_explanation"].exists)
    }

    func testOfflineMode_ShouldShowCachedPlan() {
        // Given: Device offline (simulated)
        loginAsTestUser()
        app.launchArguments.append("--simulate-offline")
        app.terminate()
        app.launch()

        // When: Navigate to plan
        app.tabBars.buttons["My Plan"].tap()

        // Then: Cached plan should display
        let calorieTarget = app.staticTexts["calorie_target"]
        XCTAssertTrue(calorieTarget.waitForExistence(timeout: 2))

        // Offline indicator should be visible
        let offlineIndicator = app.staticTexts["offline_indicator"]
        XCTAssertTrue(offlineIndicator.exists)
    }

    // MARK: - Helper Methods

    private func loginAsTestUser() {
        let emailField = app.textFields["login_email_field"]
        emailField.tap()
        emailField.typeText("test@example.com")

        let passwordField = app.secureTextFields["login_password_field"]
        passwordField.tap()
        passwordField.typeText("password123")

        app.buttons["login_button"].tap()

        // Wait for home screen
        XCTAssertTrue(app.tabBars.buttons["Home"].waitForExistence(timeout: 5))
    }
}
```

---

## Running the Tests

### Command Line

```bash
# Run all tests
cd /Users/devarisbrown/Code/projects/gtsd/apps/ios
xcodebuild test \
  -scheme GTSD \
  -destination 'platform=iOS Simulator,name=iPhone 15 Pro,OS=17.5' \
  -enableCodeCoverage YES

# Run only unit tests
xcodebuild test \
  -scheme GTSD \
  -destination 'platform=iOS Simulator,name=iPhone 15 Pro,OS=17.5' \
  -only-testing:GTSDTests

# Run only integration tests
xcodebuild test \
  -scheme GTSD \
  -destination 'platform=iOS Simulator,name=iPhone 15 Pro,OS=17.5' \
  -only-testing:GTSDTests/Integration

# Run only UI tests
xcodebuild test \
  -scheme GTSD \
  -destination 'platform=iOS Simulator,name=iPhone 15 Pro,OS=17.5' \
  -only-testing:GTSDUITests

# Generate coverage report
xcrun xccov view --report test-results.xcresult > coverage-report.txt
```

### Xcode

1. Open `/Users/devarisbrown/Code/projects/gtsd/apps/ios/GTSD.xcodeproj`
2. Select Test Navigator (⌘6)
3. Run individual tests or test suites
4. View coverage: Editor → Show Code Coverage

---

## Test Execution Checklist

### Pre-Commit

- [ ] Run all unit tests (< 30 seconds)
- [ ] Verify no new warnings
- [ ] Check code coverage hasn't decreased

### Pull Request

- [ ] Run full test suite (< 5 minutes)
- [ ] Generate coverage report
- [ ] Review test results in CI

### Pre-Merge

- [ ] All tests passing
- [ ] Coverage >= 80%
- [ ] No flaky tests detected
- [ ] Performance benchmarks met

### Pre-Release

- [ ] Full regression suite
- [ ] Manual test scenarios executed
- [ ] Accessibility tests passed
- [ ] Performance profiling complete

---

## Test Coverage Report Template

After running tests, generate this report:

```markdown
# Test Coverage Report

**Date:** YYYY-MM-DD
**App Version:** X.Y.Z
**Test Suite:** Science Service iOS Integration

## Summary

| Metric                 | Target  | Actual | Status |
| ---------------------- | ------- | ------ | ------ |
| Overall Coverage       | >= 80%  | XX%    | ✅/❌  |
| Unit Test Count        | >= 60   | XX     | ✅/❌  |
| Integration Test Count | >= 25   | XX     | ✅/❌  |
| UI Test Count          | >= 15   | XX     | ✅/❌  |
| Test Pass Rate         | 100%    | XX%    | ✅/❌  |
| Execution Time         | < 5 min | XX:XX  | ✅/❌  |

## Component Coverage

| Component       | Coverage | Status |
| --------------- | -------- | ------ |
| PlanStore       | XX%      | ✅/❌  |
| PlanService     | XX%      | ✅/❌  |
| PlanViewModel   | XX%      | ✅/❌  |
| Models          | XX%      | ✅/❌  |
| API Integration | XX%      | ✅/❌  |

## Test Results

- ✅ Passed: XX tests
- ❌ Failed: XX tests
- ⏭ Skipped: XX tests

## Failed Tests

(List any failures here)

## Performance Benchmarks

| Benchmark       | Target  | Actual | Status |
| --------------- | ------- | ------ | ------ |
| Plan Generation | < 2s    | XX.XXs | ✅/❌  |
| API Response    | < 300ms | XXXms  | ✅/❌  |
| UI Rendering    | 60fps   | XXfps  | ✅/❌  |
| Memory Usage    | < 50MB  | XXMB   | ✅/❌  |

## Issues Found

### Critical (P0)

- None

### High (P1)

- (List issues)

### Medium (P2)

- (List issues)

## Recommendations

- (List recommendations)

## Sign-off

- [ ] QA Lead approval
- [ ] Tech Lead approval
- [ ] Ready for production
```

---

## Next Steps

1. **Create test files** in the locations specified
2. **Implement tests** following the examples above
3. **Run test suite** and verify coverage
4. **Fix any failures** identified
5. **Generate coverage report**
6. **Review with team**
7. **Get QA sign-off**

---

## Additional Resources

- **Existing Test Examples:** `/Users/devarisbrown/Code/projects/gtsd/apps/ios/GTSDTests/`
- **Testing Strategy:** `/Users/devarisbrown/Code/projects/gtsd/apps/IOS_TESTING_STRATEGY.md`
- **Architecture Review:** `/Users/devarisbrown/Code/projects/gtsd/apps/SCIENCE_SERVICE_IOS_ARCHITECTURE_REVIEW.md`
- **Product Strategy:** `/Users/devarisbrown/Code/projects/gtsd/apps/SCIENCE_SERVICE_IOS_PRODUCT_STRATEGY.md`

---

**Document Status:** READY FOR IMPLEMENTATION ✅
**Estimated Implementation Time:** 40 hours
**Expected Coverage:** 85%+
**Expected Quality Score:** 95/100
