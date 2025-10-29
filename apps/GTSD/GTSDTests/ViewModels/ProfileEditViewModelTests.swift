//
//  ProfileEditViewModelTests.swift
//  GTSDTests
//
//  Created by Claude on 2025-10-28.
//

import XCTest
@testable import GTSD

/// Tests for ProfileEditViewModel with plan integration
@MainActor
final class ProfileEditViewModelTests: XCTestCase {

    var sut: ProfileEditViewModel!
    var mockAPIClient: MockAPIClient!
    var mockAuthService: MockAuthService!
    var mockPlanService: MockPlanService!
    var planStore: PlanStore!

    override func setUp() async throws {
        try await super.setUp()

        mockAPIClient = MockAPIClient()
        mockAuthService = MockAuthService()
        mockPlanService = MockPlanService()
        planStore = PlanStore(planService: mockPlanService)

        sut = ProfileEditViewModel(
            apiClient: mockAPIClient,
            authService: mockAuthService,
            planStore: planStore
        )
    }

    override func tearDown() async throws {
        sut = nil
        mockAPIClient = nil
        mockAuthService = nil
        mockPlanService = nil
        planStore = nil
        try await super.tearDown()
    }

    // MARK: - Weight Update Tests

    func testUpdateWeightAndRecomputePlan_Success() async {
        // Given
        let newWeight = 85.0
        let mockPlanData = createMockPlanData()
        mockPlanService.mockPlanData = mockPlanData

        // When
        let success = await sut.updateWeightAndRecomputePlan(newWeight: newWeight)

        // Then
        XCTAssertTrue(success)
        XCTAssertNil(sut.errorMessage)
        XCTAssertNotNil(sut.successMessage)
        XCTAssertTrue(mockPlanService.lastForceRecomputeFlag)
        XCTAssertFalse(sut.isSaving)
        XCTAssertFalse(sut.isRecomputingPlan)
    }

    func testUpdateWeightAndRecomputePlan_InvalidWeight() async {
        // Given
        let invalidWeights = [0.0, -10.0, 1000.0, 1500.0]

        for weight in invalidWeights {
            // When
            let success = await sut.updateWeightAndRecomputePlan(newWeight: weight)

            // Then
            XCTAssertFalse(success, "Weight \(weight) should be invalid")
            XCTAssertNotNil(sut.errorMessage)
        }
    }

    func testUpdateWeightAndRecomputePlan_SignificantChanges() async {
        // Given
        let newWeight = 80.0
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
            calorieTarget: 1700,  // Significant change
            proteinTarget: 135,   // Significant change
            waterTarget: 2100,
            weeklyRate: 1.0
        )

        let mockData = PlanGenerationData(
            plan: createMockPlan(),
            targets: newTargets,
            whyItWorks: createMockWhyItWorks(),
            recomputed: true,
            previousTargets: oldTargets
        )

        mockPlanService.mockPlanData = mockData

        // When
        let success = await sut.updateWeightAndRecomputePlan(newWeight: newWeight)

        // Then
        XCTAssertTrue(success)
        XCTAssertTrue(sut.planHasSignificantChanges)
    }

    func testUpdateWeightAndRecomputePlan_NoSignificantChanges() async {
        // Given
        let newWeight = 80.0
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
            calorieTarget: 1820,  // Small change
            proteinTarget: 122,   // Small change
            waterTarget: 2000,
            weeklyRate: 1.0
        )

        let mockData = PlanGenerationData(
            plan: createMockPlan(),
            targets: newTargets,
            whyItWorks: createMockWhyItWorks(),
            recomputed: true,
            previousTargets: oldTargets
        )

        mockPlanService.mockPlanData = mockData

        // When
        let success = await sut.updateWeightAndRecomputePlan(newWeight: newWeight)

        // Then
        XCTAssertTrue(success)
        XCTAssertFalse(sut.planHasSignificantChanges)
    }

    func testUpdateWeightAndRecomputePlan_PlanError() async {
        // Given
        let newWeight = 80.0
        mockPlanService.mockError = .networkError("Connection failed")

        // When
        let success = await sut.updateWeightAndRecomputePlan(newWeight: newWeight)

        // Then
        XCTAssertTrue(success)  // Weight update succeeded
        XCTAssertNotNil(sut.errorMessage)  // But plan recompute failed
        XCTAssertTrue(sut.errorMessage?.contains("plan recomputation had issues") ?? false)
    }

    func testUpdateWeightAndRecomputePlan_SetLoadingStates() async {
        // Given
        let newWeight = 80.0
        mockPlanService.mockPlanData = createMockPlanData()

        // When
        _ = await sut.updateWeightAndRecomputePlan(newWeight: newWeight)

        // Then - After completion, loading states should be false
        XCTAssertFalse(sut.isSaving, "Should not be saving after completion")
        XCTAssertFalse(sut.isRecomputingPlan, "Should not be recomputing after completion")
    }

    func testCurrentPlanData_ReturnsStoreData() async {
        // Given
        let mockData = createMockPlanData()
        mockPlanService.mockPlanData = mockData
        await planStore.fetchPlan()

        // When
        let planData = sut.currentPlanData

        // Then
        XCTAssertNotNil(planData)
        XCTAssertEqual(planData?.plan.id, mockData.plan.id)
    }

    // MARK: - Load Profile Tests

    func testLoadProfile_Success() async {
        // Given
        let mockUser = User(
            id: 1,
            email: "test@example.com",
            name: "Test User",
            emailVerified: true, hasCompletedOnboarding: true
        )
        mockAuthService.currentUser = mockUser

        // When
        await sut.loadProfile()

        // Then
        XCTAssertEqual(sut.name, mockUser.name)
        XCTAssertEqual(sut.email, mockUser.email)
        XCTAssertFalse(sut.isLoading)
        XCTAssertNil(sut.errorMessage)
    }

    func testLoadProfile_NoUser() async {
        // Given
        mockAuthService.currentUser = nil

        // When
        await sut.loadProfile()

        // Then
        XCTAssertNotNil(sut.errorMessage)
        XCTAssertEqual(sut.errorMessage, "User not found")
    }

    // MARK: - Validation Tests

    func testIsValid_ValidInput() {
        // Given
        sut.name = "John Doe"
        sut.email = "john@example.com"

        // Then
        XCTAssertTrue(sut.isValid)
    }

    func testIsValid_EmptyName() {
        // Given
        sut.name = ""
        sut.email = "john@example.com"

        // Then
        XCTAssertFalse(sut.isValid)
    }

    func testIsValid_InvalidEmail() {
        // Given
        sut.name = "John Doe"
        sut.email = "invalid-email"

        // Then
        XCTAssertFalse(sut.isValid)
    }

    func testHasChanges_WhenNameChanged() async {
        // Given
        let mockUser = User(
            id: 1,
            email: "test@example.com",
            name: "Test User",
            emailVerified: true, hasCompletedOnboarding: true
        )
        mockAuthService.currentUser = mockUser
        await sut.loadProfile()

        // When
        sut.name = "New Name"

        // Then
        XCTAssertTrue(sut.hasChanges)
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

    private func createMockPlanData() -> PlanGenerationData {
        return PlanGenerationData(
            plan: createMockPlan(),
            targets: ComputedTargets(
                bmr: 1500,
                tdee: 2000,
                calorieTarget: 1800,
                proteinTarget: 120,
                waterTarget: 2000,
                weeklyRate: 1.0,
                estimatedWeeks: 12,
                projectedDate: Date().addingTimeInterval(12 * 7 * 24 * 60 * 60)
            ),
            whyItWorks: createMockWhyItWorks(),
            recomputed: false,
            previousTargets: nil
        )
    }
}
