//
//  PlanStoreTests.swift
//  GTSDTests
//
//  Created by Claude on 2025-10-28.
//

import XCTest
@testable import GTSD

@MainActor
final class PlanStoreTests: XCTestCase {

    var sut: PlanStore!
    var mockPlanService: MockPlanService!
    var userDefaults: UserDefaults!

    override func setUp() async throws {
        try await super.setUp()

        // Use separate UserDefaults for testing
        userDefaults = UserDefaults(suiteName: "test.gtsd.planstore")!
        userDefaults.removePersistentDomain(forName: "test.gtsd.planstore")

        mockPlanService = MockPlanService()
        sut = PlanStore(planService: mockPlanService, userDefaults: userDefaults)
    }

    override func tearDown() async throws {
        // Clean up UserDefaults
        userDefaults.removePersistentDomain(forName: "test.gtsd.planstore")
        userDefaults = nil
        mockPlanService = nil
        sut = nil
        try await super.tearDown()
    }

    // MARK: - Fetch Plan Tests

    func testFetchPlan_Success() async {
        // Given
        let mockData = createMockPlanData()
        mockPlanService.mockPlanData = mockData

        // When
        await sut.fetchPlan()

        // Then
        XCTAssertNotNil(sut.currentPlan)
        XCTAssertEqual(sut.currentPlan?.plan.id, mockData.plan.id)
        XCTAssertFalse(sut.isLoading)
        XCTAssertNil(sut.error)
        XCTAssertNotNil(sut.lastUpdated)
    }

    func testFetchPlan_UsesCacheWhenValid() async {
        // Given
        let mockData = createMockPlanData()
        mockPlanService.mockPlanData = mockData

        // First fetch
        await sut.fetchPlan()
        let firstCallCount = mockPlanService.generatePlanCallCount

        // When - Fetch again immediately
        await sut.fetchPlan()

        // Then - Should not make another API call
        XCTAssertEqual(mockPlanService.generatePlanCallCount, firstCallCount)
    }

    func testFetchPlan_ForceRecompute_IgnoresCache() async {
        // Given
        let mockData = createMockPlanData()
        mockPlanService.mockPlanData = mockData

        // First fetch
        await sut.fetchPlan()
        let firstCallCount = mockPlanService.generatePlanCallCount

        // When - Force recompute
        await sut.fetchPlan(forceRecompute: true)

        // Then - Should make another API call
        XCTAssertEqual(mockPlanService.generatePlanCallCount, firstCallCount + 1)
    }

    func testFetchPlan_ErrorHandling() async {
        // Given
        mockPlanService.mockError = .networkError("Network failed")

        // When
        await sut.fetchPlan()

        // Then
        XCTAssertNil(sut.currentPlan)
        XCTAssertNotNil(sut.error)
        XCTAssertFalse(sut.isLoading)
        XCTAssertEqual(sut.error, .networkError("Network failed"))
    }

    func testFetchPlan_KeepsCachedDataOnError() async {
        // Given - Initial successful fetch
        let mockData = createMockPlanData()
        mockPlanService.mockPlanData = mockData
        await sut.fetchPlan()

        // Store the cached plan ID to verify it's the same
        let cachedPlanId = sut.currentPlan?.plan.id

        // When - Second fetch with forceRecompute fails (forces API call even with valid cache)
        mockPlanService.mockError = .networkError("Network failed")
        await sut.fetchPlan(forceRecompute: true)

        // Then - Should keep showing cached data from memory
        XCTAssertNotNil(sut.currentPlan)
        XCTAssertEqual(sut.currentPlan?.plan.id, cachedPlanId)
        XCTAssertNotNil(sut.error)
        XCTAssertEqual(sut.error, .networkError("Showing last saved plan"))
    }

    // MARK: - Recompute Tests

    func testRecomputePlan_CallsServiceWithForceFlag() async {
        // Given
        let mockData = createMockPlanData()
        mockPlanService.mockPlanData = mockData

        // When
        await sut.recomputePlan()

        // Then
        XCTAssertTrue(mockPlanService.lastForceRecomputeFlag)
        XCTAssertNotNil(sut.currentPlan)
    }

    // MARK: - Cache Management Tests

    func testCacheValidation_FreshCache() async {
        // Given
        let mockData = createMockPlanData()
        mockPlanService.mockPlanData = mockData

        // When
        await sut.fetchPlan()

        // Then
        XCTAssertFalse(sut.isStale)
    }

    func testTimeSinceUpdate_ReturnsCorrectValue() async {
        // Given
        let mockData = createMockPlanData()
        mockPlanService.mockPlanData = mockData
        await sut.fetchPlan()

        // When
        let timeSince = sut.timeSinceUpdate

        // Then
        XCTAssertNotNil(timeSince)
        XCTAssertTrue(timeSince?.contains("Just now") == true)
    }

    func testRefresh_InvalidatesCache() async {
        // Given
        let mockData = createMockPlanData()
        mockPlanService.mockPlanData = mockData
        await sut.fetchPlan()
        let firstCallCount = mockPlanService.generatePlanCallCount

        // When
        await sut.refresh()

        // Then
        XCTAssertEqual(mockPlanService.generatePlanCallCount, firstCallCount + 1)
    }

    // MARK: - Error State Tests

    func testClearError_RemovesErrorState() async {
        // Given
        mockPlanService.mockError = .networkError("Test error")
        await sut.fetchPlan()
        XCTAssertNotNil(sut.error)

        // When
        sut.clearError()

        // Then
        XCTAssertNil(sut.error)
    }

    // MARK: - Significant Changes Tests

    func testHasSignificantChanges_WithLargeCalorieDifference() async {
        // Given
        let previousTargets = ComputedTargets(
            bmr: 1500,
            tdee: 2000,
            calorieTarget: 1800,
            proteinTarget: 120,
            waterTarget: 2000,
            weeklyRate: 1.0
        )

        let newTargets = ComputedTargets(
            bmr: 1500,
            tdee: 2000,
            calorieTarget: 1900,  // 100 cal difference
            proteinTarget: 120,
            waterTarget: 2000,
            weeklyRate: 1.0
        )

        let mockData = PlanGenerationData(
            plan: createMockPlan(),
            targets: newTargets,
            whyItWorks: createMockWhyItWorks(),
            recomputed: true,
            previousTargets: previousTargets
        )

        mockPlanService.mockPlanData = mockData
        await sut.fetchPlan()

        // When/Then
        XCTAssertTrue(sut.hasSignificantChanges())
    }

    func testHasSignificantChanges_WithLargeProteinDifference() async {
        // Given
        let previousTargets = ComputedTargets(
            bmr: 1500,
            tdee: 2000,
            calorieTarget: 1800,
            proteinTarget: 120,
            waterTarget: 2000,
            weeklyRate: 1.0
        )

        let newTargets = ComputedTargets(
            bmr: 1500,
            tdee: 2000,
            calorieTarget: 1800,
            proteinTarget: 135,  // 15g difference
            waterTarget: 2000,
            weeklyRate: 1.0
        )

        let mockData = PlanGenerationData(
            plan: createMockPlan(),
            targets: newTargets,
            whyItWorks: createMockWhyItWorks(),
            recomputed: true,
            previousTargets: previousTargets
        )

        mockPlanService.mockPlanData = mockData
        await sut.fetchPlan()

        // When/Then
        XCTAssertTrue(sut.hasSignificantChanges())
    }

    func testHasSignificantChanges_WithSmallChanges() async {
        // Given
        let previousTargets = ComputedTargets(
            bmr: 1500,
            tdee: 2000,
            calorieTarget: 1800,
            proteinTarget: 120,
            waterTarget: 2000,
            weeklyRate: 1.0
        )

        let newTargets = ComputedTargets(
            bmr: 1500,
            tdee: 2000,
            calorieTarget: 1820,  // 20 cal difference (not significant)
            proteinTarget: 122,   // 2g difference (not significant)
            waterTarget: 2000,
            weeklyRate: 1.0
        )

        let mockData = PlanGenerationData(
            plan: createMockPlan(),
            targets: newTargets,
            whyItWorks: createMockWhyItWorks(),
            recomputed: true,
            previousTargets: previousTargets
        )

        mockPlanService.mockPlanData = mockData
        await sut.fetchPlan()

        // When/Then
        XCTAssertFalse(sut.hasSignificantChanges())
    }

    // MARK: - Concurrent Access Tests

    func testConcurrentFetches_ThreadSafe() async {
        // Given
        let mockData = createMockPlanData()
        mockPlanService.mockPlanData = mockData

        // When - Multiple concurrent fetches
        await withTaskGroup(of: Void.self) { group in
            for _ in 0..<10 {
                group.addTask {
                    await self.sut.fetchPlan()
                }
            }
        }

        // Then - Should not crash and should have valid state
        XCTAssertNotNil(sut.currentPlan)
        XCTAssertFalse(sut.isLoading)
    }

    // MARK: - Helper Methods

    private func createMockPlan() -> Plan {
        return Plan(
            id: 1,
            userId: 1,
            name: "Test Plan",
            description: "Test description",
            startDate: Date(),
            endDate: Date().addingTimeInterval(12 * 7 * 24 * 60 * 60),
            status: "active"
        )
    }

    private func createMockTargets() -> ComputedTargets {
        return ComputedTargets(
            bmr: 1500,
            tdee: 2000,
            calorieTarget: 1800,
            proteinTarget: 120,
            waterTarget: 2000,
            weeklyRate: 1.0,
            estimatedWeeks: 12,
            projectedDate: Date().addingTimeInterval(12 * 7 * 24 * 60 * 60)
        )
    }

    private func createMockWhyItWorks() -> WhyItWorks {
        return WhyItWorks(
            bmr: BMRExplanation(
                title: "Test BMR",
                explanation: "Test explanation",
                formula: "Test formula"
            ),
            tdee: TDEEExplanation(
                title: "Test TDEE",
                explanation: "Test explanation",
                activityMultiplier: 1.375,
                metric: 2000
            ),
            calorieTarget: CalorieTargetExplanation(
                title: "Test Calorie",
                explanation: "Test explanation",
                deficit: 500,
                metric: 1800
            ),
            proteinTarget: ProteinTargetExplanation(
                title: "Test Protein",
                explanation: "Test explanation",
                gramsPerKg: 1.6,
                metric: 1.6
            ),
            waterTarget: WaterTargetExplanation(
                title: "Test Water",
                explanation: "Test explanation",
                mlPerKg: 30,
                metric: 2000
            ),
            timeline: TimelineExplanation(
                title: "Test Timeline",
                explanation: "Test explanation",
                weeklyRate: 1.0,
                estimatedWeeks: 12,
                metric: 1.0
            )
        )
    }

    private func createMockPlanData() -> PlanGenerationData {
        return PlanGenerationData(
            plan: createMockPlan(),
            targets: createMockTargets(),
            whyItWorks: createMockWhyItWorks(),
            recomputed: false,
            previousTargets: nil
        )
    }
}
