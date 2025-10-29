//
//  PlanServiceTests.swift
//  GTSDTests
//
//  Created by Claude on 2025-10-28.
//

import XCTest
@testable import GTSD

@MainActor
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

    // MARK: - Success Cases

    func testGeneratePlan_Success() async throws {
        // Given
        let mockPlan = createMockPlan()
        let mockResponse = createMockPlanResponse(with: mockPlan)
        mockAPIClient.mockResponse = mockResponse

        // When
        let result = try await sut.generatePlan(forceRecompute: false)

        // Then
        XCTAssertEqual(result.plan.id, mockPlan.id)
        XCTAssertEqual(result.targets.calorieTarget, 1800) // Matches createMockTargets()
        XCTAssertTrue(result.targets.isValid())
        XCTAssertFalse(result.recomputed)
    }

    func testGeneratePlan_ForceRecompute() async throws {
        // Given
        let mockPlan = createMockPlan()
        let mockResponse = createMockPlanResponse(with: mockPlan, recomputed: true)
        mockAPIClient.mockResponse = mockResponse

        // When
        let result = try await sut.generatePlan(forceRecompute: true)

        // Then
        XCTAssertTrue(result.recomputed)
        XCTAssertNotNil(result.previousTargets)
    }

    func testGeneratePlan_WithTimelineProjection() async throws {
        // Given
        let mockTargets = ComputedTargets(
            bmr: 1500,
            tdee: 2000,
            calorieTarget: 1800,
            proteinTarget: 120,
            waterTarget: 2000,
            weeklyRate: 1.0,
            estimatedWeeks: 12,
            projectedDate: Date().addingTimeInterval(12 * 7 * 24 * 60 * 60)
        )
        let mockPlan = createMockPlan()
        let mockData = createMockPlanData(plan: mockPlan, targets: mockTargets)
        let mockResponse = PlanGenerationResponse(success: true, data: mockData)
        mockAPIClient.mockResponse = mockResponse

        // When
        let result = try await sut.generatePlan()

        // Then
        XCTAssertEqual(result.targets.estimatedWeeks, 12)
        XCTAssertNotNil(result.targets.projectedDate)
    }

    // MARK: - Error Cases

    func testGeneratePlan_OnboardingIncomplete() async {
        // Given
        mockAPIClient.mockError = APIError.httpError(
            statusCode: 400,
            message: "Onboarding not complete"
        )

        // When/Then
        do {
            _ = try await sut.generatePlan()
            XCTFail("Expected onboardingIncomplete error")
        } catch let error as PlanError {
            XCTAssertEqual(error, .onboardingIncomplete)
        } catch {
            XCTFail("Unexpected error: \(error)")
        }
    }

    func testGeneratePlan_NotFound() async {
        // Given
        mockAPIClient.mockError = APIError.httpError(statusCode: 404, message: "Not found")

        // When/Then
        do {
            _ = try await sut.generatePlan()
            XCTFail("Expected notFound error")
        } catch let error as PlanError {
            XCTAssertEqual(error, .notFound)
        } catch {
            XCTFail("Unexpected error: \(error)")
        }
    }

    func testGeneratePlan_RateLimitExceeded() async {
        // Given
        mockAPIClient.mockError = APIError.httpError(statusCode: 429, message: "Too many requests")

        // When/Then
        do {
            _ = try await sut.generatePlan()
            XCTFail("Expected rateLimitExceeded error")
        } catch let error as PlanError {
            if case .rateLimitExceeded = error {
                XCTAssertTrue(error.isRetryable)
            } else {
                XCTFail("Expected rateLimitExceeded error")
            }
        } catch {
            XCTFail("Unexpected error: \(error)")
        }
    }

    func testGeneratePlan_NetworkError() async {
        // Given
        let nsError = NSError(
            domain: NSURLErrorDomain,
            code: NSURLErrorNotConnectedToInternet,
            userInfo: nil
        )
        mockAPIClient.mockError = APIError.networkError(nsError)

        // When/Then
        do {
            _ = try await sut.generatePlan()
            XCTFail("Expected noInternetConnection error")
        } catch let error as PlanError {
            XCTAssertEqual(error, .noInternetConnection)
            XCTAssertTrue(error.isRetryable)
        } catch {
            XCTFail("Unexpected error: \(error)")
        }
    }

    func testGeneratePlan_Timeout() async {
        // Given
        let nsError = NSError(
            domain: NSURLErrorDomain,
            code: NSURLErrorTimedOut,
            userInfo: nil
        )
        mockAPIClient.mockError = APIError.networkError(nsError)

        // When/Then
        do {
            _ = try await sut.generatePlan()
            XCTFail("Expected timeout error")
        } catch let error as PlanError {
            XCTAssertEqual(error, .timeout)
            XCTAssertTrue(error.isRetryable)
        } catch {
            XCTFail("Unexpected error: \(error)")
        }
    }

    func testGeneratePlan_ServerError() async {
        // Given
        mockAPIClient.mockError = APIError.httpError(
            statusCode: 500,
            message: "Internal server error"
        )

        // When/Then
        do {
            _ = try await sut.generatePlan()
            XCTFail("Expected serverError")
        } catch let error as PlanError {
            if case .serverError(let code, _) = error {
                XCTAssertEqual(code, 500)
                XCTAssertTrue(error.isRetryable)
            } else {
                XCTFail("Expected serverError")
            }
        } catch {
            XCTFail("Unexpected error: \(error)")
        }
    }

    func testGeneratePlan_MaintenanceMode() async {
        // Given
        mockAPIClient.mockError = APIError.httpError(statusCode: 503, message: "Service unavailable")

        // When/Then
        do {
            _ = try await sut.generatePlan()
            XCTFail("Expected maintenanceMode error")
        } catch let error as PlanError {
            XCTAssertEqual(error, .maintenanceMode)
        } catch {
            XCTFail("Unexpected error: \(error)")
        }
    }

    func testGeneratePlan_InvalidResponse() async {
        // Given
        let mockPlan = createMockPlan()
        let invalidTargets = ComputedTargets(
            bmr: -1,  // Invalid
            tdee: 2000,
            calorieTarget: 2000,
            proteinTarget: 120,
            waterTarget: 2000,
            weeklyRate: 1.0
        )
        let mockData = createMockPlanData(plan: mockPlan, targets: invalidTargets)
        let mockResponse = PlanGenerationResponse(success: true, data: mockData)
        mockAPIClient.mockResponse = mockResponse

        // When/Then
        do {
            _ = try await sut.generatePlan()
            XCTFail("Expected invalidResponse error")
        } catch let error as PlanError {
            if case .invalidResponse = error {
                XCTAssertTrue(true)
            } else {
                XCTFail("Expected invalidResponse error, got: \(error)")
            }
        } catch {
            XCTFail("Unexpected error: \(error)")
        }
    }

    // MARK: - Helper Methods

    private func createMockPlan() -> Plan {
        return Plan(
            id: 1,
            userId: 1,
            name: "Weight Loss Plan",
            description: "Personalized weight loss plan",
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
                title: "Your BMR",
                explanation: "Your basal metabolic rate",
                formula: "Mifflin-St Jeor equation"
            ),
            tdee: TDEEExplanation(
                title: "Your TDEE",
                explanation: "Your total daily energy expenditure",
                activityMultiplier: 1.375,
                metric: 2000
            ),
            calorieTarget: CalorieTargetExplanation(
                title: "Your Calorie Target",
                explanation: "Based on your goals and activity level",
                deficit: 500,
                metric: 1800
            ),
            proteinTarget: ProteinTargetExplanation(
                title: "Your Protein Target",
                explanation: "Protein is essential for muscle maintenance",
                gramsPerKg: 1.6,
                metric: 1.6
            ),
            waterTarget: WaterTargetExplanation(
                title: "Your Water Target",
                explanation: "Proper hydration supports metabolism",
                mlPerKg: 30,
                metric: 2000
            ),
            timeline: TimelineExplanation(
                title: "Your Timeline",
                explanation: "Safe and sustainable progress",
                weeklyRate: 1.0,
                estimatedWeeks: 12,
                metric: 1.0
            )
        )
    }

    private func createMockPlanData(
        plan: Plan,
        targets: ComputedTargets,
        recomputed: Bool = false,
        previousTargets: ComputedTargets? = nil
    ) -> PlanGenerationData {
        return PlanGenerationData(
            plan: plan,
            targets: targets,
            whyItWorks: createMockWhyItWorks(),
            recomputed: recomputed,
            previousTargets: previousTargets
        )
    }

    private func createMockPlanResponse(
        with plan: Plan,
        recomputed: Bool = false
    ) -> PlanGenerationResponse {
        let data = createMockPlanData(
            plan: plan,
            targets: createMockTargets(),
            recomputed: recomputed,
            previousTargets: recomputed ? createMockTargets() : nil
        )
        return PlanGenerationResponse(success: true, data: data)
    }
}

// Note: Mock implementations are now centralized in GTSDTests/Mocks/TestMocks.swift
