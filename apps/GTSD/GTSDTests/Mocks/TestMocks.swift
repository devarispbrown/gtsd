//
//  TestMocks.swift
//  GTSDTests
//
//  Created by Claude on 2025-10-28.
//  Centralized mock implementations for testing
//

import Foundation
import Combine
import XCTest
@testable import GTSD

// MARK: - Mock API Client

@MainActor
final class MockAPIClient: APIClientProtocol, ObservableObject {
    @Published var isLoading: Bool = false
    var mockResponse: Any?
    var mockError: Error?
    var requestCallCount = 0
    var mockSummary: HowItWorksSummary?
    var shouldFailSummary = false

    func request<T: Codable & Sendable>(_ endpoint: APIEndpoint) async throws -> T {
        requestCallCount += 1

        if let error = mockError {
            throw error
        }

        // Handle summary requests
        if T.self == HowItWorksSummaryResponse.self {
            if shouldFailSummary {
                throw APIError.networkError(NSError(domain: "test", code: 0))
            }

            if let summary = mockSummary {
                let response = HowItWorksSummaryResponse(success: true, data: summary)
                return response as! T
            }
        }

        // Handle current streak requests
        if T.self == CurrentStreak.self {
            let streakData = StreakData(
                id: 1,
                userId: 1,
                currentStreak: 5,
                longestStreak: 10,
                totalCompliantDays: 15,
                lastComplianceDate: Date(),
                streakStartDate: Date().addingTimeInterval(-5 * 24 * 60 * 60),
                createdAt: Date(),
                updatedAt: Date()
            )
            let streak = CurrentStreak(
                streak: streakData,
                todayCompliance: nil,
                canIncrementToday: true
            )
            return streak as! T
        }

        // Return generic mock response if available
        guard let response = mockResponse as? T else {
            throw APIError.invalidResponse
        }

        return response
    }

    func requestVoid(_ endpoint: APIEndpoint) async throws {
        requestCallCount += 1

        if let error = mockError {
            throw error
        }
    }

    func uploadMultipart<T: Codable & Sendable>(
        _ endpoint: APIEndpoint,
        imageData: Data,
        fileName: String,
        mimeType: String
    ) async throws -> T {
        requestCallCount += 1

        if let error = mockError {
            throw error
        }

        guard let response = mockResponse as? T else {
            throw APIError.invalidResponse
        }

        return response
    }

    func setAuthToken(_ token: String?) {}
    func getAuthToken() -> String? { return nil }
}

// MARK: - Mock Authentication Service

@MainActor
final class MockAuthService: AuthenticationServiceProtocol, ObservableObject {
    @Published var isAuthenticated: Bool = true
    @Published var currentUser: User?
    @Published var isLoading: Bool = false
    @Published var errorMessage: String?

    func checkAuthentication() async {
        // No-op for testing
    }

    func signup(email: String, password: String, name: String) async throws {
        // No-op for testing
    }

    func login(email: String, password: String) async throws {
        // No-op for testing
    }

    func logout() async {
        isAuthenticated = false
        currentUser = nil
    }

    func refreshToken() async throws {
        // No-op for testing
    }

    func updateProfile(name: String?, email: String?) async throws {
        // No-op for testing
    }

    func updateCurrentUser(_ user: User) async {
        currentUser = user
    }

    func changePassword(currentPassword: String, newPassword: String) async throws {
        // No-op for testing
    }

    func deleteAccount() async throws {
        // No-op for testing
    }
}

// MARK: - Mock Task Service

@MainActor
final class MockTaskService: TaskServiceProtocol, ObservableObject {
    @Published var tasks: [Task] = []
    @Published var isLoading: Bool = false
    @Published var errorMessage: String?

    func fetchTasks(page: Int?, limit: Int?, status: TaskStatus?, category: TaskCategory?) async throws {
        // No-op for testing
    }

    func createTask(title: String, description: String?, category: TaskCategory, dueDate: Date?, priority: TaskPriority?) async throws -> Task {
        throw APIError.networkError(NSError(domain: "test", code: 0))
    }

    func getTask(id: String) async throws -> Task {
        throw APIError.networkError(NSError(domain: "test", code: 0))
    }

    func updateTask(id: String, title: String?, description: String?, category: TaskCategory?, dueDate: Date?, priority: TaskPriority?, status: TaskStatus?) async throws -> Task {
        throw APIError.networkError(NSError(domain: "test", code: 0))
    }

    func deleteTask(id: String) async throws {
        // No-op for testing
    }

    func completeTask(id: String) async throws {
        // No-op for testing
    }

    func uncompleteTask(id: String) async throws {
        // No-op for testing
    }

    var pendingTasks: [Task] { [] }
    var inProgressTasks: [Task] { [] }
    var completedTasks: [Task] { [] }
    var overdueTasks: [Task] { [] }
}

// MARK: - Mock Plan Service

/// Mock implementation of PlanService for testing
/// Uses protocol-based mocking as an actor to match PlanServiceProtocol requirements
actor MockPlanService: PlanServiceProtocol {
    nonisolated(unsafe) var mockPlanData: PlanGenerationData?
    nonisolated(unsafe) var mockError: PlanError?
    nonisolated(unsafe) var generatePlanCallCount = 0
    nonisolated(unsafe) var lastForceRecomputeFlag = false
    nonisolated(unsafe) var shouldFailNetwork = false

    func generatePlan(forceRecompute: Bool) async throws -> PlanGenerationData {
        generatePlanCallCount += 1
        lastForceRecomputeFlag = forceRecompute

        if shouldFailNetwork {
            throw PlanError.networkError("Network unavailable")
        }

        if let error = mockError {
            throw error
        }

        guard let mockData = mockPlanData else {
            throw PlanError.unknown("No mock data configured")
        }

        // Simulate network delay
        try await _Concurrency.Task.sleep(nanoseconds: 100_000_000) // 100ms

        return mockData
    }
}

// MARK: - Mock Onboarding API Client

@MainActor
final class MockOnboardingAPIClient: APIClientProtocol, ObservableObject {
    @Published var isLoading: Bool = false
    var mockUser: User?
    var mockSummary: HowItWorksSummary?
    var shouldFailOnboarding = false
    var shouldFailSummary = false

    func request<T: Codable & Sendable>(_ endpoint: APIEndpoint) async throws -> T {
        // Simulate network delay
        try await _Concurrency.Task.sleep(nanoseconds: 100_000_000) // 0.1 seconds

        // Handle onboarding completion
        if shouldFailOnboarding {
            throw APIError.httpError(statusCode: 400, message: "Onboarding failed")
        }

        // Return mock user for onboarding completion
        if T.self == User.self {
            if let user = mockUser {
                return user as! T
            }
            throw APIError.networkError(NSError(domain: "test", code: 0))
        }

        // Handle summary request
        if T.self == HowItWorksSummaryResponse.self {
            if shouldFailSummary {
                throw APIError.networkError(NSError(domain: "test", code: 0))
            }

            if let summary = mockSummary {
                let response = HowItWorksSummaryResponse(success: true, data: summary)
                return response as! T
            }
            throw APIError.networkError(NSError(domain: "test", code: 0))
        }

        throw APIError.networkError(NSError(domain: "test", code: 0))
    }

    func requestVoid(_ endpoint: APIEndpoint) async throws {
        if shouldFailOnboarding {
            throw APIError.httpError(statusCode: 400, message: "Request failed")
        }
    }

    func uploadMultipart<T: Codable & Sendable>(
        _ endpoint: APIEndpoint,
        imageData: Data,
        fileName: String,
        mimeType: String
    ) async throws -> T {
        throw APIError.networkError(NSError(domain: "test", code: 0))
    }

    func setAuthToken(_ token: String?) {}
    func getAuthToken() -> String? { return nil }
}

// MARK: - Mock Notification Manager

@MainActor
final class MockNotificationManager: NotificationManaging {
    var notifyPlanUpdatedCalled = false
    var lastOldTargets: ComputedTargets?
    var lastNewTargets: ComputedTargets?

    func notifyPlanUpdated(oldTargets: ComputedTargets, newTargets: ComputedTargets) async {
        notifyPlanUpdatedCalled = true
        lastOldTargets = oldTargets
        lastNewTargets = newTargets
    }
}

// MARK: - Mock Onboarding Auth Service

@MainActor
final class MockOnboardingAuthService: AuthenticationServiceProtocol, ObservableObject {
    @Published var isAuthenticated: Bool = true
    @Published var currentUser: User?
    @Published var isLoading: Bool = false
    @Published var errorMessage: String?

    func checkAuthentication() async {
        // No-op for testing
    }

    func signup(email: String, password: String, name: String) async throws {
        // No-op for testing
    }

    func login(email: String, password: String) async throws {
        // No-op for testing
    }

    func logout() async {
        isAuthenticated = false
        currentUser = nil
    }

    func refreshToken() async throws {
        // No-op for testing
    }

    func updateProfile(name: String?, email: String?) async throws {
        // No-op for testing
    }

    func updateCurrentUser(_ user: User) async {
        currentUser = user
    }

    func changePassword(currentPassword: String, newPassword: String) async throws {
        // No-op for testing
    }

    func deleteAccount() async throws {
        // No-op for testing
    }
}
