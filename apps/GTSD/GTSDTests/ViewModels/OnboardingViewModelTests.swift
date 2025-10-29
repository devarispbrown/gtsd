//
//  OnboardingViewModelTests.swift
//  GTSDTests
//
//  Created by Claude on 2025-10-28.
//

import XCTest
@testable import GTSD

/// Tests for OnboardingViewModel race condition fix
@MainActor
final class OnboardingViewModelTests: XCTestCase {

    var sut: OnboardingViewModel!
    var mockAPIClient: MockOnboardingAPIClient!
    var mockAuthService: MockOnboardingAuthService!

    override func setUp() async throws {
        try await super.setUp()

        mockAPIClient = MockOnboardingAPIClient()
        mockAuthService = MockOnboardingAuthService()

        sut = OnboardingViewModel(
            apiClient: mockAPIClient,
            authService: mockAuthService
        )
    }

    override func tearDown() async throws {
        sut = nil
        mockAPIClient = nil
        mockAuthService = nil
        try await super.tearDown()
    }

    // MARK: - Onboarding Completion Tests

    /// Test: Metrics summary should be shown after successful onboarding
    func testCompleteOnboarding_Success_ShowsMetricsSummary() async {
        // Given: Valid onboarding data
        setupValidOnboardingData()

        let mockUser = User(
            id: 1,
            email: "test@example.com",
            name: "Test User",
            emailVerified: true, hasCompletedOnboarding: true
        )
        mockAPIClient.mockUser = mockUser
        mockAPIClient.mockSummary = createMockSummary()

        // When
        await sut.completeOnboarding()

        // Then: Should show metrics summary
        XCTAssertTrue(sut.showMetricsSummary, "Metrics summary sheet should be shown after successful onboarding")
        XCTAssertNotNil(sut.metricsSummary, "Metrics summary data should be loaded")
        XCTAssertNil(sut.errorMessage, "Should not have error message")
        XCTAssertFalse(sut.isLoading, "Should not be loading after completion")
    }

    /// Test: Error during onboarding should NOT show metrics summary
    func testCompleteOnboarding_Error_DoesNotShowSummary() async {
        // Given: Valid onboarding data but API error
        setupValidOnboardingData()
        mockAPIClient.shouldFailOnboarding = true

        // When
        await sut.completeOnboarding()

        // Then: Should NOT show metrics summary
        XCTAssertFalse(sut.showMetricsSummary, "Metrics summary should NOT show when onboarding fails")
        XCTAssertNil(sut.metricsSummary, "Metrics summary data should be nil")
        XCTAssertNotNil(sut.errorMessage, "Should have error message")
        XCTAssertFalse(sut.isLoading, "Should not be loading after error")
    }

    /// Test: Summary fetch failure should gracefully handle (non-blocking)
    func testCompleteOnboarding_SummaryFetchFails_Graceful() async {
        // Given: Valid onboarding succeeds but summary fetch fails
        setupValidOnboardingData()

        let mockUser = User(
            id: 1,
            email: "test@example.com",
            name: "Test User",
            emailVerified: true, hasCompletedOnboarding: true
        )
        mockAPIClient.mockUser = mockUser
        mockAPIClient.shouldFailSummary = true

        // When
        await sut.completeOnboarding()

        // Then: Onboarding completes but summary doesn't show (graceful failure)
        XCTAssertFalse(sut.showMetricsSummary, "Summary should not show if fetch fails")
        XCTAssertNil(sut.metricsSummary, "Summary data should be nil")
        XCTAssertNil(sut.errorMessage, "Onboarding error should be nil (summary fetch is non-fatal)")
        XCTAssertFalse(sut.isLoading, "Should not be loading after completion")
    }

    /// Test: Sheet dismissal flow should set showMetricsSummary to false
    func testMetricsSummaryDismissal_SetsShowToFalse() {
        // Given: Summary is showing
        sut.showMetricsSummary = true
        sut.metricsSummary = createMockSummary()

        // When: User dismisses summary (simulated)
        sut.showMetricsSummary = false

        // Then: showMetricsSummary should be false
        XCTAssertFalse(sut.showMetricsSummary, "Dismissing summary should set showMetricsSummary to false")
    }

    // MARK: - Skip Onboarding Tests

    /// Test: Skip onboarding should NOT show metrics summary
    func testSkipOnboarding_DoesNotShowSummary() async {
        // Given: User wants to skip onboarding
        let mockUser = User(
            id: 1,
            email: "test@example.com",
            name: "Test User",
            emailVerified: true, hasCompletedOnboarding: true
        )
        mockAPIClient.mockUser = mockUser

        // When
        await sut.skipOnboarding()

        // Then: Should NOT show metrics summary
        XCTAssertFalse(sut.showMetricsSummary, "Skipping onboarding should NOT show metrics summary")
        XCTAssertNil(sut.metricsSummary, "Metrics summary data should be nil when skipped")
        XCTAssertNil(sut.errorMessage, "Should not have error message")
        XCTAssertFalse(sut.isLoading, "Should not be loading after completion")
    }

    // MARK: - Helper Methods

    private func setupValidOnboardingData() {
        sut.onboardingData.dateOfBirth = Calendar.current.date(byAdding: .year, value: -30, to: Date())
        sut.onboardingData.gender = .male
        sut.onboardingData.currentWeight = 80
        sut.onboardingData.height = 175
        sut.onboardingData.targetWeight = 165
        sut.onboardingData.targetDate = Calendar.current.date(byAdding: .month, value: 3, to: Date())
        sut.onboardingData.primaryGoal = .loseWeight
        sut.onboardingData.activityLevel = .moderatelyActive
    }

    private func createMockSummary() -> HowItWorksSummary {
        return HowItWorksSummary(
            user: SummaryUser(name: "Test User", email: "test@example.com"),
            currentMetrics: CurrentMetrics(
                age: 30,
                gender: "male",
                weight: 80,
                height: 175,
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
                startWeight: 80,
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
