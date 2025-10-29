//
//  HomeViewModelTests.swift
//  GTSDTests
//
//  Created by Claude on 2025-10-28.
//

import XCTest
@testable import GTSD

/// Tests for HomeViewModel zero state detection logic
@MainActor
final class HomeViewModelTests: XCTestCase {

    var sut: HomeViewModel!
    var mockTaskService: MockTaskService!
    var mockAuthService: MockAuthService!
    var mockAPIClient: MockAPIClient!

    override func setUp() async throws {
        try await super.setUp()

        mockTaskService = MockTaskService()
        mockAuthService = MockAuthService()
        mockAPIClient = MockAPIClient()

        sut = HomeViewModel(
            taskService: mockTaskService,
            authService: mockAuthService,
            apiClient: mockAPIClient
        )
    }

    override func tearDown() async throws {
        sut = nil
        mockTaskService = nil
        mockAuthService = nil
        mockAPIClient = nil
        try await super.tearDown()
    }

    // MARK: - Zero State Detection Tests

    /// Test 1: User with no weight should see zero state
    func testZeroStateDetection_NoWeight_ShowsZeroState() async {
        // Given: User with valid height but zero weight
        let user = User(
            id: 1,
            email: "test@example.com",
            name: "Test User",
            emailVerified: true, hasCompletedOnboarding: true
        )
        mockAuthService.currentUser = user

        let summary = createMockSummary(weight: 0, height: 175)
        mockAPIClient.mockSummary = summary

        // When
        await sut.loadData()

        // Then: Should show zero state because weight is invalid
        XCTAssertTrue(sut.shouldShowZeroState, "User with zero weight should see zero state card")
    }

    /// Test 2: User with no height should see zero state
    func testZeroStateDetection_NoHeight_ShowsZeroState() async {
        // Given: User with valid weight but zero height
        let user = User(
            id: 1,
            email: "test@example.com",
            name: "Test User",
            emailVerified: true, hasCompletedOnboarding: true
        )
        mockAuthService.currentUser = user

        let summary = createMockSummary(weight: 80, height: 0)
        mockAPIClient.mockSummary = summary

        // When
        await sut.loadData()

        // Then: Should show zero state because height is invalid
        XCTAssertTrue(sut.shouldShowZeroState, "User with zero height should see zero state card")
    }

    /// Test 3: User with both valid weight and height should NOT see zero state
    func testZeroStateDetection_ValidMetrics_HidesZeroState() async {
        // Given: User with valid weight AND height
        let user = User(
            id: 1,
            email: "test@example.com",
            name: "Test User",
            emailVerified: true, hasCompletedOnboarding: true
        )
        mockAuthService.currentUser = user

        let summary = createMockSummary(weight: 80, height: 175)
        mockAPIClient.mockSummary = summary

        // When
        await sut.loadData()

        // Then: Should NOT show zero state because both metrics are valid
        XCTAssertFalse(sut.shouldShowZeroState, "User with valid weight and height should NOT see zero state card")
    }

    /// Test 4: User who hasn't completed onboarding should see zero state
    func testZeroStateDetection_OnboardingIncomplete_ShowsZeroState() async {
        // Given: User who hasn't completed onboarding
        let user = User(
            id: 1,
            email: "test@example.com",
            name: "Test User",
            emailVerified: true, hasCompletedOnboarding: false
        )
        mockAuthService.currentUser = user

        // When
        await sut.loadData()

        // Then: Should show zero state
        XCTAssertTrue(sut.shouldShowZeroState, "User who hasn't completed onboarding should see zero state card")
    }

    /// Test 5: No summary data should show zero state (fallback)
    func testZeroStateDetection_NoSummary_ShowsZeroState() async {
        // Given: User with completed onboarding but no summary data
        let user = User(
            id: 1,
            email: "test@example.com",
            name: "Test User",
            emailVerified: true, hasCompletedOnboarding: true
        )
        mockAuthService.currentUser = user
        mockAPIClient.shouldFailSummary = true

        // When
        await sut.loadData()

        // Then: Should show zero state as fallback
        XCTAssertTrue(sut.shouldShowZeroState, "User without summary data should see zero state card")
    }

    /// Test 6: Dismiss zero state should hide the card
    func testDismissZeroState_HidesCard() {
        // Given: Zero state is showing
        sut.shouldShowZeroState = true

        // When
        sut.dismissZeroState()

        // Then: Should hide zero state
        XCTAssertFalse(sut.shouldShowZeroState, "Dismissing zero state should hide the card")
    }

    // MARK: - Helper Methods

    private func createMockSummary(weight: Double, height: Double) -> HowItWorksSummary {
        return HowItWorksSummary(
            user: SummaryUser(name: "Test User", email: "test@example.com"),
            currentMetrics: CurrentMetrics(
                age: 30,
                gender: "male",
                weight: weight,
                height: height,
                activityLevel: "moderately_active"
            ),
            goals: Goals(
                primaryGoal: "lose_weight",
                targetWeight: 165,
                targetDate: nil
            ),
            calculations: Calculations(
                bmr: BMRCalculation(
                    value: 1650,
                    explanation: "Test BMR",
                    formula: "Mifflin-St Jeor"
                ),
                tdee: TDEECalculation(
                    value: 2475,
                    explanation: "Test TDEE",
                    activityMultiplier: 1.55
                ),
                targets: Targets(
                    calories: Target(value: 1975, unit: "cal/day", explanation: "Test calories"),
                    protein: Target(value: 130, unit: "g/day", explanation: "Test protein"),
                    water: Target(value: 2450, unit: "ml/day", explanation: "Test water")
                )
            ),
            projection: Projection(
                startWeight: weight,
                targetWeight: 165,
                weeklyRate: 0.45,
                estimatedWeeks: 15,
                projectedDate: nil,
                explanation: "Test projection"
            ),
            howItWorks: HowItWorks(
                step1: HowItWorksStep(title: "Step 1", description: "Description 1"),
                step2: HowItWorksStep(title: "Step 2", description: "Description 2"),
                step3: HowItWorksStep(title: "Step 3", description: "Description 3"),
                step4: HowItWorksStep(title: "Step 4", description: "Description 4")
            )
        )
    }
}

// Note: Mock implementations are now centralized in GTSDTests/Mocks/TestMocks.swift
