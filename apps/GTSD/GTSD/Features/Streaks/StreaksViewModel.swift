//
//  StreaksViewModel.swift
//  GTSD
//
//  Created by Claude on 2025-10-26.
//

import Foundation
import Combine

@MainActor
class StreaksViewModel: ObservableObject {
    @Published var currentStreak: CurrentStreak?
    @Published var streakHistory: [StreakHistory] = []
    @Published var badges: [UserBadge] = []
    @Published var isLoading: Bool = false
    @Published var errorMessage: String?

    private let apiClient: any APIClientProtocol

    init(apiClient: any APIClientProtocol = ServiceContainer.shared.apiClient) {
        self.apiClient = apiClient
    }

    func loadData() async {
        isLoading = true
        errorMessage = nil

        do {
            async let streakResult: CurrentStreak = apiClient.request(.getCurrentStreak)
            async let historyResult: [StreakHistory] = apiClient.request(.getStreakHistory(page: 1, limit: 30))
            async let badgesResult: [UserBadge] = apiClient.request(.getUserBadges)

            currentStreak = try await streakResult
            streakHistory = try await historyResult
            badges = try await badgesResult

            Logger.info("Loaded streaks and badges data")
        } catch {
            Logger.error("Failed to load streaks data: \(error)")
            errorMessage = error.localizedDescription
        }

        isLoading = false
    }

    func hasActivityOnDate(_ date: Date) -> Bool {
        let calendar = Calendar.current
        return streakHistory.contains { history in
            calendar.isDate(history.date, inSameDayAs: date)
        }
    }

    func activityLevel(for date: Date) -> Int {
        guard let history = streakHistory.first(where: { history in
            Calendar.current.isDate(history.date, inSameDayAs: date)
        }) else {
            return 0
        }

        let total = history.tasksCompleted + history.photosUploaded
        if total == 0 { return 0 }
        if total <= 2 { return 1 }
        if total <= 4 { return 2 }
        return 3
    }
}
