//
//  PlanIntegrationTests.swift
//  GTSDTests
//
//  Created by Claude on 2025-10-28.
//

import XCTest
@testable import GTSD

/// Integration tests for plan-related features
/// Tests weight update flow, notifications, and plan widget
@MainActor
final class PlanIntegrationTests: XCTestCase {

    var mockPlanService: MockPlanService!
    var mockNotificationManager: MockNotificationManager!
    var planStore: PlanStore!
    var userDefaults: UserDefaults!

    override func setUp() async throws {
        try await super.setUp()

        // Use separate UserDefaults for testing
        userDefaults = UserDefaults(suiteName: "test.gtsd.planintegration")!
        userDefaults.removePersistentDomain(forName: "test.gtsd.planintegration")

        mockPlanService = MockPlanService()
        mockNotificationManager = MockNotificationManager()
        planStore = PlanStore(
            planService: mockPlanService,
            notificationManager: mockNotificationManager,
            userDefaults: userDefaults
        )
    }

    override func tearDown() async throws {
        // Clean up UserDefaults
        userDefaults.removePersistentDomain(forName: "test.gtsd.planintegration")
        userDefaults = nil
        mockPlanService = nil
        mockNotificationManager = nil
        planStore = nil
        try await super.tearDown()
    }

    // MARK: - Weight Update Integration Tests

    func testWeightUpdate_TriggersNotification_WhenChangesSignificant() async {
        // Given
        let oldTargets = ComputedTargets(
            bmr: 1500,
            tdee: 2000,
            calorieTarget: 1800,
            proteinTarget: 120,
            waterTarget: 2000,
            weeklyRate: 1.0
        )

        let newTargets = ComputedTargets(
            bmr: 1550,
            tdee: 2050,
            calorieTarget: 1700,  // 100 cal difference - significant
            proteinTarget: 135,   // 15g difference - significant
            waterTarget: 2100,
            weeklyRate: 1.0
        )

        let mockData = createMockPlanData(
            targets: newTargets,
            previousTargets: oldTargets
        )

        mockPlanService.mockPlanData = mockData

        // When
        await planStore.recomputePlan()

        // Then
        // Wait for detached notification task to complete
        try? await _Concurrency.Task.sleep(nanoseconds: 50_000_000) // 50ms

        XCTAssertTrue(mockNotificationManager.notifyPlanUpdatedCalled, "Should trigger notification for significant changes")
        XCTAssertEqual(mockNotificationManager.lastOldTargets?.calorieTarget, oldTargets.calorieTarget)
        XCTAssertEqual(mockNotificationManager.lastNewTargets?.calorieTarget, newTargets.calorieTarget)
    }

    func testWeightUpdate_DoesNotTriggerNotification_WhenChangesNotSignificant() async {
        // Given
        let oldTargets = ComputedTargets(
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
            calorieTarget: 1820,  // 20 cal difference - not significant
            proteinTarget: 122,   // 2g difference - not significant
            waterTarget: 2000,
            weeklyRate: 1.0
        )

        let mockData = createMockPlanData(
            targets: newTargets,
            previousTargets: oldTargets
        )

        mockPlanService.mockPlanData = mockData

        // When
        await planStore.recomputePlan()

        // Then
        await _Concurrency.Task.yield() // Allow notification task to complete

        XCTAssertFalse(mockNotificationManager.notifyPlanUpdatedCalled, "Should not trigger notification for insignificant changes")
    }

    func testWeightUpdate_DoesNotTriggerNotification_WhenNoPreviousTargets() async {
        // Given
        let newTargets = ComputedTargets(
            bmr: 1500,
            tdee: 2000,
            calorieTarget: 1800,
            proteinTarget: 120,
            waterTarget: 2000,
            weeklyRate: 1.0
        )

        let mockData = createMockPlanData(
            targets: newTargets,
            previousTargets: nil  // First time plan generation
        )

        mockPlanService.mockPlanData = mockData

        // When
        await planStore.fetchPlan()

        // Then
        await _Concurrency.Task.yield()

        XCTAssertFalse(mockNotificationManager.notifyPlanUpdatedCalled, "Should not trigger notification on first plan generation")
    }

    // MARK: - Plan Store Notification Tests

    func testPlanStore_IntegratesWithNotificationManager() async {
        // Given
        let oldTargets = ComputedTargets(
            bmr: 1500,
            tdee: 2000,
            calorieTarget: 1800,
            proteinTarget: 120,
            waterTarget: 2000,
            weeklyRate: 1.0
        )

        let newTargets = ComputedTargets(
            bmr: 1550,
            tdee: 2050,
            calorieTarget: 1650,  // 150 cal difference
            proteinTarget: 140,   // 20g difference
            waterTarget: 2100,
            weeklyRate: 1.0
        )

        let mockData = createMockPlanData(
            targets: newTargets,
            previousTargets: oldTargets
        )

        mockPlanService.mockPlanData = mockData

        // When
        await planStore.fetchPlan(forceRecompute: true)

        // Then
        // Wait for detached notification task to complete
        try? await _Concurrency.Task.sleep(nanoseconds: 50_000_000) // 50ms

        XCTAssertTrue(mockNotificationManager.notifyPlanUpdatedCalled)
        XCTAssertNotNil(mockNotificationManager.lastOldTargets)
        XCTAssertNotNil(mockNotificationManager.lastNewTargets)
    }

    func testPlanStore_HasSignificantChanges_ReturnsTrue_WhenCalorieDiffOver50() async {
        // Given
        let oldTargets = ComputedTargets(
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

        let mockData = createMockPlanData(
            targets: newTargets,
            previousTargets: oldTargets
        )

        mockPlanService.mockPlanData = mockData

        // When
        await planStore.fetchPlan()

        // Then
        XCTAssertTrue(planStore.hasSignificantChanges())
    }

    func testPlanStore_HasSignificantChanges_ReturnsTrue_WhenProteinDiffOver10() async {
        // Given
        let oldTargets = ComputedTargets(
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

        let mockData = createMockPlanData(
            targets: newTargets,
            previousTargets: oldTargets
        )

        mockPlanService.mockPlanData = mockData

        // When
        await planStore.fetchPlan()

        // Then
        XCTAssertTrue(planStore.hasSignificantChanges())
    }

    func testPlanStore_HasSignificantChanges_ReturnsFalse_WhenChangesSmall() async {
        // Given
        let oldTargets = ComputedTargets(
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
            calorieTarget: 1830,  // 30 cal difference (not significant)
            proteinTarget: 125,   // 5g difference (not significant)
            waterTarget: 2000,
            weeklyRate: 1.0
        )

        let mockData = createMockPlanData(
            targets: newTargets,
            previousTargets: oldTargets
        )

        mockPlanService.mockPlanData = mockData

        // When
        await planStore.fetchPlan()

        // Then
        XCTAssertFalse(planStore.hasSignificantChanges())
    }

    // MARK: - Recompute Plan Tests

    func testRecomputePlan_UpdatesStoreCorrectly() async {
        // Given
        let mockData = createMockPlanData()
        mockPlanService.mockPlanData = mockData

        // When
        await planStore.recomputePlan()

        // Then
        XCTAssertNotNil(planStore.currentPlan)
        XCTAssertTrue(mockPlanService.lastForceRecomputeFlag)
        XCTAssertFalse(planStore.isLoading)
        XCTAssertNil(planStore.error)
    }

    func testRecomputePlan_HandlesError() async {
        // Given
        mockPlanService.mockError = .networkError("Connection failed")

        // When
        await planStore.recomputePlan()

        // Then
        XCTAssertNotNil(planStore.error)
        XCTAssertFalse(planStore.isLoading)
    }

    // MARK: - Concurrent Operations Tests

    func testConcurrentRecomputes_ThreadSafe() async {
        // Given
        let mockData = createMockPlanData()
        mockPlanService.mockPlanData = mockData

        // When - Multiple concurrent recomputes
        await withTaskGroup(of: Void.self) { group in
            for _ in 0..<5 {
                group.addTask {
                    await self.planStore.recomputePlan()
                }
            }
        }

        // Then - Should not crash and should have valid state
        XCTAssertNotNil(planStore.currentPlan)
        XCTAssertFalse(planStore.isLoading)
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

    private func createMockWhyItWorks() -> WhyItWorks {
        return WhyItWorks(
            calorieTarget: CalorieTargetExplanation(
                title: "Test Calorie",
                explanation: "Test explanation",
                science: "Test science"
            ),
            proteinTarget: ProteinTargetExplanation(
                title: "Test Protein",
                explanation: "Test explanation",
                science: "Test science"
            ),
            waterTarget: WaterTargetExplanation(
                title: "Test Water",
                explanation: "Test explanation",
                science: "Test science"
            ),
            weeklyRate: WeeklyRateExplanation(
                title: "Test Rate",
                explanation: "Test explanation",
                science: "Test science"
            )
        )
    }

    private func createMockPlanData(
        targets: ComputedTargets? = nil,
        previousTargets: ComputedTargets? = nil
    ) -> PlanGenerationData {
        let defaultTargets = ComputedTargets(
            bmr: 1500,
            tdee: 2000,
            calorieTarget: 1800,
            proteinTarget: 120,
            waterTarget: 2000,
            weeklyRate: 1.0,
            estimatedWeeks: 12,
            projectedDate: Date().addingTimeInterval(12 * 7 * 24 * 60 * 60)
        )

        return PlanGenerationData(
            plan: createMockPlan(),
            targets: targets ?? defaultTargets,
            whyItWorks: createMockWhyItWorks(),
            recomputed: previousTargets != nil,
            previousTargets: previousTargets
        )
    }
}
