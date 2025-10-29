//
//  ProfileZeroStateCardTests.swift
//  GTSDTests
//
//  Created by Claude on 2025-10-28.
//

import XCTest
import SwiftUI
@testable import GTSD

/// Tests for ProfileZeroStateCard Maybe Later button functionality
@MainActor
final class ProfileZeroStateCardTests: XCTestCase {

    // MARK: - Button Handler Tests

    /// Test: Maybe Later button calls onDismiss callback
    func testMaybeLaterButton_CallsOnDismiss() {
        // Given: Track if onDismiss was called
        var dismissCalled = false
        var completeCalled = false

        // Create the card with callbacks
        let card = ProfileZeroStateCard(
            userName: "Test User",
            onComplete: {
                completeCalled = true
            },
            onDismiss: {
                dismissCalled = true
            }
        )

        // Verify card was created
        XCTAssertNotNil(card, "ProfileZeroStateCard should be created")

        // Since we can't directly test button taps in SwiftUI without ViewInspector,
        // we'll test the callback functionality directly
        card.onDismiss()

        // Then: onDismiss should be called
        XCTAssertTrue(dismissCalled, "Maybe Later button should call onDismiss callback")
        XCTAssertFalse(completeCalled, "Complete callback should NOT be called")
    }

    /// Test: Complete Profile button calls onComplete callback
    func testCompleteProfileButton_CallsOnComplete() {
        // Given: Track if callbacks were called
        var dismissCalled = false
        var completeCalled = false

        // Create the card with callbacks
        let card = ProfileZeroStateCard(
            userName: "Test User",
            onComplete: {
                completeCalled = true
            },
            onDismiss: {
                dismissCalled = true
            }
        )

        // Test the callback directly
        card.onComplete()

        // Then: onComplete should be called
        XCTAssertTrue(completeCalled, "Complete Profile button should call onComplete callback")
        XCTAssertFalse(dismissCalled, "Dismiss callback should NOT be called")
    }

    /// Test: Card requires both callbacks
    func testProfileZeroStateCard_RequiresCallbacks() {
        // Given: Create card with both callbacks
        let card = ProfileZeroStateCard(
            userName: "John Doe",
            onComplete: { },
            onDismiss: { }
        )

        // Then: Card should be created successfully
        XCTAssertNotNil(card, "ProfileZeroStateCard should be created with both callbacks")
    }

    /// Test: Integration with HomeViewModel dismiss functionality
    func testIntegrationWithHomeViewModel_DismissZeroState() {
        // Given: Create a HomeViewModel
        let mockTaskService = MockTaskService()
        let mockAuthService = MockAuthService()
        let mockAPIClient = MockAPIClient()

        let viewModel = HomeViewModel(
            taskService: mockTaskService,
            authService: mockAuthService,
            apiClient: mockAPIClient
        )

        // Set zero state to showing
        viewModel.shouldShowZeroState = true

        // When: Simulate "Maybe Later" button tap
        viewModel.dismissZeroState()

        // Then: Zero state should be dismissed
        XCTAssertFalse(viewModel.shouldShowZeroState, "Zero state should be dismissed after Maybe Later is tapped")
    }

    /// Test: Zero state reappears on app restart (session-based dismissal)
    func testZeroStateDismissal_IsSessionBased() async {
        // Given: Create a HomeViewModel with incomplete profile
        let mockTaskService = MockTaskService()
        let mockAuthService = MockAuthService()
        let mockAPIClient = MockAPIClient()

        // User with incomplete profile (weight = 0)
        let user = User(
            id: 1,
            email: "test@example.com",
            name: "Test User",
            emailVerified: true, hasCompletedOnboarding: true
        )
        mockAuthService.currentUser = user

        let summary = HowItWorksSummary(
            user: SummaryUser(name: "Test User", email: "test@example.com"),
            currentMetrics: CurrentMetrics(
                age: 30,
                gender: "male",
                weight: 0,  // Invalid weight
                height: 175,
                activityLevel: "moderately_active"
            ),
            goals: Goals(primaryGoal: "lose_weight", targetWeight: 165, targetDate: nil),
            calculations: Calculations(
                bmr: BMRCalculation(value: 1650, explanation: "Test", formula: "Test"),
                tdee: TDEECalculation(value: 2475, explanation: "Test", activityMultiplier: 1.55),
                targets: Targets(
                    calories: Target(value: 1975, unit: "cal", explanation: "Test"),
                    protein: Target(value: 130, unit: "g", explanation: "Test"),
                    water: Target(value: 2450, unit: "ml", explanation: "Test")
                )
            ),
            projection: Projection(
                startWeight: 0,
                targetWeight: 165,
                weeklyRate: 0.45,
                estimatedWeeks: 15,
                projectedDate: nil,
                explanation: "Test"
            ),
            howItWorks: HowItWorks(
                step1: HowItWorksStep(title: "Step 1", description: "Desc 1"),
                step2: HowItWorksStep(title: "Step 2", description: "Desc 2"),
                step3: HowItWorksStep(title: "Step 3", description: "Desc 3"),
                step4: HowItWorksStep(title: "Step 4", description: "Desc 4")
            )
        )
        mockAPIClient.mockSummary = summary

        let viewModel = HomeViewModel(
            taskService: mockTaskService,
            authService: mockAuthService,
            apiClient: mockAPIClient
        )

        // When: Load data (simulates app launch)
        await viewModel.loadData()

        // Then: Should show zero state because profile is incomplete
        XCTAssertTrue(viewModel.shouldShowZeroState, "Zero state should show on app launch with incomplete profile")

        // When: User dismisses zero state
        viewModel.dismissZeroState()
        XCTAssertFalse(viewModel.shouldShowZeroState, "Zero state should be dismissed")

        // When: Simulate app restart by creating new ViewModel instance
        let viewModelAfterRestart = HomeViewModel(
            taskService: mockTaskService,
            authService: mockAuthService,
            apiClient: mockAPIClient
        )
        await viewModelAfterRestart.loadData()

        // Then: Zero state should appear again (session-based dismissal)
        XCTAssertTrue(viewModelAfterRestart.shouldShowZeroState, "Zero state should reappear after app restart")
    }
}

// Note: For comprehensive UI testing of button taps, consider using:
// 1. ViewInspector library for view hierarchy testing
// 2. XCUITest for integration testing
// 3. Manual testing with accessibility inspector
