//
//  NavigationCoordinator.swift
//  GTSD
//
//  Created by Claude on 2025-10-26.
//

import SwiftUI
import Combine

@MainActor
class NavigationCoordinator: ObservableObject {
    @Published var selectedTab: TabItem = .home
    @Published var showOnboarding: Bool = false
    @Published var selectedTask: Task?

    enum TabItem: Int {
        case home
        case plans
        case tasks
        case streaks
        case profile
    }

    func selectTab(_ tab: TabItem) {
        selectedTab = tab
    }

    func showTaskDetail(_ task: Task) {
        selectedTask = task
    }

    func startOnboarding() {
        showOnboarding = true
    }

    func completeOnboarding() {
        showOnboarding = false
    }
}

// MARK: - Deep Link Handler

extension NavigationCoordinator {
    func handle(url: URL) {
        guard let components = URLComponents(url: url, resolvingAgainstBaseURL: true),
              let host = components.host else {
            return
        }

        switch host {
        case "tasks":
            selectedTab = .tasks
            if let taskId = components.queryItems?.first(where: { $0.name == "id" })?.value {
                // Handle task detail navigation
                Logger.info("Deep link to task: \(taskId)")
            }

        case "plans":
            selectedTab = .plans

        case "streaks":
            selectedTab = .streaks

        case "profile":
            selectedTab = .profile

        case "onboarding":
            showOnboarding = true

        default:
            Logger.warning("Unknown deep link host: \(host)")
        }
    }
}
