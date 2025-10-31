//
//  DeepLinkHandler.swift
//  GTSD
//
//  Created by Claude on 2025-10-28.
//

import Foundation
import SwiftUI
import Combine

/// Deep link handling for navigation from notifications and external sources
///
/// Handles deep links with the following URL schemes:
/// - `gtsd://plan/updated` - Navigate to plan screen after update
/// - `gtsd://plan/view` - View current plan
/// - `gtsd://profile` - Navigate to profile
/// - `gtsd://tasks` - Navigate to tasks
/// - `gtsd://streaks` - Navigate to streaks
///
/// ## Usage Example
/// ```swift
/// // In SceneDelegate or App
/// .onOpenURL { url in
///     DeepLinkHandler.shared.handle(url)
/// }
///
/// // Listen for navigation events
/// .onReceive(DeepLinkHandler.shared.$currentDeepLink) { deepLink in
///     // Handle navigation
/// }
/// ```
@MainActor
final class DeepLinkHandler: ObservableObject {

    // MARK: - Singleton

    static let shared = DeepLinkHandler()

    // MARK: - Published State

    @Published private(set) var currentDeepLink: DeepLink?
    @Published private(set) var navigationPath: [DeepLinkDestination] = []

    // MARK: - Deep Link Types

    enum DeepLink: Equatable {
        case planUpdated
        case planView
        case profile
        case tasks
        case streaks
        case task(id: String)
        case unknown(String)

        var destination: DeepLinkDestination {
            switch self {
            case .planUpdated, .planView:
                return .plan
            case .profile:
                return .profile
            case .tasks, .task:
                return .tasks
            case .streaks:
                return .streaks
            case .unknown:
                return .home
            }
        }
    }

    enum DeepLinkDestination {
        case home
        case plan
        case profile
        case tasks
        case streaks
    }

    // MARK: - Initialization

    private init() {
        Logger.log("DeepLinkHandler initialized", level: .info)
    }

    // MARK: - Public Methods

    /// Handle a deep link URL
    func handle(_ url: URL) {
        Logger.log("Handling deep link: \(url.absoluteString)", level: .info)

        guard url.scheme == "gtsd" else {
            Logger.log("Invalid URL scheme: \(url.scheme ?? "nil")", level: .warning)
            return
        }

        let deepLink = parseDeepLink(from: url)
        currentDeepLink = deepLink

        // Trigger haptic feedback
        HapticManager.selection()

        // Post notification for UI to handle
        NotificationCenter.default.post(
            name: .deepLinkReceived,
            object: deepLink
        )
    }

    /// Clear current deep link
    func clearDeepLink() {
        currentDeepLink = nil
        navigationPath.removeAll()
    }

    /// Navigate to a destination directly
    func navigate(to destination: DeepLinkDestination) {
        navigationPath.append(destination)
        NotificationCenter.default.post(
            name: .navigateToDestination,
            object: destination
        )
    }

    // MARK: - Private Methods

    private func parseDeepLink(from url: URL) -> DeepLink {
        let host = url.host
        let path = url.path

        switch (host, path) {
        case ("plan", "/updated"):
            return .planUpdated
        case ("plan", "/view"), ("plan", ""):
            return .planView
        case ("profile", _):
            return .profile
        case ("tasks", ""):
            return .tasks
        case ("tasks", let taskPath) where !taskPath.isEmpty:
            let taskId = taskPath.replacingOccurrences(of: "/", with: "")
            return .task(id: taskId)
        case ("streaks", _):
            return .streaks
        default:
            return .unknown(url.absoluteString)
        }
    }
}

// MARK: - Notification Names

extension Notification.Name {
    static let deepLinkReceived = Notification.Name("deepLinkReceived")
    static let navigateToDestination = Notification.Name("navigateToDestination")
    static let navigateToPlan = Notification.Name("navigateToPlan")
}

// MARK: - SwiftUI View Extension

extension View {
    /// Add deep link handling to a view
    func handleDeepLinks() -> some View {
        self.modifier(DeepLinkHandlerModifier())
    }
}

struct DeepLinkHandlerModifier: ViewModifier {
    @StateObject private var deepLinkHandler = DeepLinkHandler.shared

    func body(content: Content) -> some View {
        content
            .onOpenURL { url in
                deepLinkHandler.handle(url)
            }
            .onChange(of: deepLinkHandler.currentDeepLink) { deepLink in
                if let deepLink = deepLink {
                    handleDeepLink(deepLink)
                }
            }
    }

    private func handleDeepLink(_ deepLink: DeepLinkHandler.DeepLink) {
        Logger.log("Processing deep link: \(deepLink)", level: .info)

        // Additional processing can be done here
        // The actual navigation is handled by the TabBarView or NavigationCoordinator
    }
}

// MARK: - Tab Selection Helper

/// Helper to manage tab selection for deep linking
@MainActor
class TabSelectionManager: ObservableObject {
    @Published var selectedTab: Int = 0

    static let shared = TabSelectionManager()

    private init() {}

    func selectTab(for destination: DeepLinkHandler.DeepLinkDestination) {
        switch destination {
        case .home:
            selectedTab = 0
        case .plan:
            selectedTab = 1
        case .tasks:
            selectedTab = 2
        case .streaks:
            selectedTab = 3
        case .profile:
            selectedTab = 4
        }

        HapticManager.selection()
    }
}

// MARK: - Preview

#Preview {
    struct DeepLinkPreview: View {
        @StateObject private var deepLinkHandler = DeepLinkHandler.shared

        var body: some View {
            VStack(spacing: Spacing.lg) {
                Text("Deep Link Handler")
                    .font(.headlineLarge)

                if let deepLink = deepLinkHandler.currentDeepLink {
                    Text("Current: \(String(describing: deepLink))")
                        .font(.bodyMedium)
                        .foregroundColor(.textSecondary)
                }

                VStack(spacing: Spacing.sm) {
                    Button("Plan Updated") {
                        deepLinkHandler.handle(URL(string: "gtsd://plan/updated")!)
                    }

                    Button("View Plan") {
                        deepLinkHandler.handle(URL(string: "gtsd://plan/view")!)
                    }

                    Button("Profile") {
                        deepLinkHandler.handle(URL(string: "gtsd://profile")!)
                    }

                    Button("Tasks") {
                        deepLinkHandler.handle(URL(string: "gtsd://tasks")!)
                    }

                    Button("Streaks") {
                        deepLinkHandler.handle(URL(string: "gtsd://streaks")!)
                    }
                }
            }
            .padding()
        }
    }

    return DeepLinkPreview()
}
