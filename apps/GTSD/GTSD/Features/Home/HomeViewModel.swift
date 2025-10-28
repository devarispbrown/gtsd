//
//  HomeViewModel.swift
//  GTSD
//
//  Created by Claude on 2025-10-26.
//

import Foundation
import SwiftUI
import Combine

/// View model for home screen
@MainActor
final class HomeViewModel: ObservableObject {
    @Published var tasks: [Task] = []
    @Published var currentStreak: CurrentStreak?
    @Published var isLoading = false
    @Published var errorMessage: String?
    @Published var shouldShowZeroState = false
    @Published var summary: HowItWorksSummary?

    private let taskService: any TaskServiceProtocol
    private let authService: any AuthenticationServiceProtocol
    private let apiClient: any APIClientProtocol

    /// Initialize with dependencies
    init(
        taskService: any TaskServiceProtocol,
        authService: any AuthenticationServiceProtocol,
        apiClient: any APIClientProtocol
    ) {
        self.taskService = taskService
        self.authService = authService
        self.apiClient = apiClient
    }

    /// Convenience initializer using shared container
    convenience init() {
        let container = ServiceContainer.shared
        self.init(
            taskService: container.taskService,
            authService: container.authService,
            apiClient: container.apiClient
        )
    }

    var currentUser: User? {
        authService.currentUser
    }

    var todayTasks: [Task] {
        tasks.filter { task in
            guard let dueDate = task.dueDate else { return false }
            return Calendar.current.isDateInToday(dueDate)
        }
    }

    var overdueTasks: [Task] {
        tasks.filter { $0.isOverdue }
    }

    var recentTasks: [Task] {
        Array(tasks.prefix(5))
    }

    // MARK: - Data Loading

    func loadData() async {
        isLoading = true
        errorMessage = nil

        // Load data in parallel
        await withTaskGroup(of: Void.self) { group in
            group.addTask { await self.loadTasks() }
            group.addTask { await self.loadStreak() }
            group.addTask { await self.loadSummary() }
        }

        isLoading = false
    }

    private func loadTasks() async {
        do {
            try await taskService.fetchTasks(page: 1, limit: 20, status: nil, category: nil)
            tasks = taskService.tasks
        } catch {
            Logger.error("Failed to load tasks: \(error)")
            errorMessage = "Failed to load tasks"
        }
    }

    private func loadStreak() async {
        do {
            let streak: CurrentStreak = try await apiClient.request(.getCurrentStreak)
            currentStreak = streak
        } catch {
            Logger.error("Failed to load streak: \(error)")
        }
    }

    private func loadSummary() async {
        do {
            let response: HowItWorksSummaryResponse = try await apiClient.request(.getHowItWorksSummary)
            summary = response.data
            checkForZeroState()
        } catch {
            Logger.error("Failed to load summary: \(error)")
            // If summary fails to load, check zero state based on onboarding status alone
            checkForZeroState()
        }
    }

    private func checkForZeroState() {
        guard let user = currentUser else {
            shouldShowZeroState = true
            return
        }

        // Show zero state if user hasn't completed onboarding
        if !user.hasCompletedOnboarding {
            shouldShowZeroState = true
            return
        }

        // Check if user has completed onboarding but with placeholder values
        // If we have summary data, check for actual weight/height values
        if let summary = summary {
            let hasPlaceholderWeight = summary.currentMetrics.weight <= 0.0
            let hasPlaceholderHeight = summary.currentMetrics.height <= 0.0

            if hasPlaceholderWeight || hasPlaceholderHeight {
                // User skipped onboarding or entered placeholder data
                shouldShowZeroState = true
            } else {
                // User has real data
                shouldShowZeroState = false
            }
        } else {
            // Fallback: If we couldn't load summary, assume incomplete profile
            shouldShowZeroState = true
        }
    }

    func dismissZeroState() {
        shouldShowZeroState = false
    }

    func logout() async {
        await authService.logout()
    }
}
