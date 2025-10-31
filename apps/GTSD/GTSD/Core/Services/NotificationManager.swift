//
//  NotificationManager.swift
//  GTSD
//
//  Created by Claude on 2025-10-28.
//

import Foundation
import UserNotifications
import Combine

/// Protocol for notification management
/// Allows for mocking in tests while providing real implementation in production
@MainActor
protocol NotificationManaging: AnyObject {
    func notifyPlanUpdated(oldTargets: ComputedTargets, newTargets: ComputedTargets) async
}

/// Manages local and remote notifications for the app
/// Handles notification permissions, scheduling, and deep linking
@MainActor
final class NotificationManager: NSObject, ObservableObject, NotificationManaging {

    // MARK: - Singleton

    static let shared = NotificationManager()

    // MARK: - Published State

    @Published private(set) var authorizationStatus: UNAuthorizationStatus = .notDetermined
    @Published private(set) var isNotificationsEnabled = false

    // MARK: - Notification Center

    private let notificationCenter = UNUserNotificationCenter.current()

    // MARK: - Notification Categories

    enum NotificationCategory: String {
        case planUpdate = "PLAN_UPDATE"
        case weeklyCheckIn = "WEEKLY_CHECKIN"
        case dailyReminder = "DAILY_REMINDER"
    }

    enum NotificationAction: String {
        case viewPlan = "VIEW_PLAN"
        case dismiss = "DISMISS"
    }

    // MARK: - Initialization

    override init() {
        super.init()
        notificationCenter.delegate = self
        setupNotificationCategories()

        // Load current authorization status
        _Concurrency.Task {
            await checkAuthorizationStatus()
        }
    }

    // MARK: - Authorization

    /// Request notification permissions from user
    func requestAuthorization() async -> Bool {
        do {
            let granted = try await notificationCenter.requestAuthorization(
                options: [.alert, .sound, .badge]
            )

            await checkAuthorizationStatus()

            if granted {
                Logger.info("Notification permissions granted")
            } else {
                Logger.info("Notification permissions denied")
            }

            return granted
        } catch {
            Logger.error("Failed to request notification permissions: \(error)")
            return false
        }
    }

    /// Check current authorization status
    func checkAuthorizationStatus() async {
        let settings = await notificationCenter.notificationSettings()

        authorizationStatus = settings.authorizationStatus
        isNotificationsEnabled = settings.authorizationStatus == .authorized

        Logger.debug("Notification authorization status: \(settings.authorizationStatus.rawValue)")
    }

    // MARK: - Notification Categories

    private func setupNotificationCategories() {
        let viewPlanAction = UNNotificationAction(
            identifier: NotificationAction.viewPlan.rawValue,
            title: "View Plan",
            options: .foreground
        )

        let dismissAction = UNNotificationAction(
            identifier: NotificationAction.dismiss.rawValue,
            title: "Dismiss",
            options: .destructive
        )

        // Plan Update Category
        let planUpdateCategory = UNNotificationCategory(
            identifier: NotificationCategory.planUpdate.rawValue,
            actions: [viewPlanAction, dismissAction],
            intentIdentifiers: [],
            options: []
        )

        // Weekly Check-In Category
        let weeklyCheckInCategory = UNNotificationCategory(
            identifier: NotificationCategory.weeklyCheckIn.rawValue,
            actions: [viewPlanAction, dismissAction],
            intentIdentifiers: [],
            options: []
        )

        notificationCenter.setNotificationCategories([
            planUpdateCategory,
            weeklyCheckInCategory
        ])

        Logger.debug("Notification categories configured")
    }

    // MARK: - Plan Update Notifications

    /// Send notification when plan is updated with significant changes
    func notifyPlanUpdated(oldTargets: ComputedTargets, newTargets: ComputedTargets) async {
        guard isNotificationsEnabled else {
            Logger.debug("Notifications disabled, skipping plan update notification")
            return
        }

        let calorieDiff = abs(newTargets.calorieTarget - oldTargets.calorieTarget)
        let proteinDiff = abs(newTargets.proteinTarget - oldTargets.proteinTarget)

        // Only notify if changes are significant
        guard calorieDiff > 50 || proteinDiff > 10 else {
            Logger.debug("Plan changes not significant enough for notification")
            return
        }

        let content = UNMutableNotificationContent()
        content.title = "Your Plan Has Been Updated"

        // Build body with change summary
        var changes: [String] = []
        if calorieDiff > 50 {
            let direction = newTargets.calorieTarget > oldTargets.calorieTarget ? "increased" : "decreased"
            changes.append("Calories \(direction) by \(calorieDiff)")
        }
        if proteinDiff > 10 {
            let direction = newTargets.proteinTarget > oldTargets.proteinTarget ? "increased" : "decreased"
            changes.append("Protein \(direction) by \(proteinDiff)g")
        }

        content.body = changes.joined(separator: ", ")
        content.sound = .default
        content.badge = 1
        content.categoryIdentifier = NotificationCategory.planUpdate.rawValue
        content.userInfo = [
            "type": "plan_update",
            "calorieDiff": calorieDiff,
            "proteinDiff": proteinDiff
        ]

        // Schedule immediately
        let request = UNNotificationRequest(
            identifier: "plan_update_\(Date().timeIntervalSince1970)",
            content: content,
            trigger: nil
        )

        do {
            try await notificationCenter.add(request)
            Logger.info("Plan update notification scheduled")
        } catch {
            Logger.error("Failed to schedule plan update notification: \(error)")
        }
    }

    /// Schedule weekly plan recomputation reminder
    func scheduleWeeklyCheckIn() async {
        guard isNotificationsEnabled else {
            Logger.debug("Notifications disabled, skipping weekly check-in")
            return
        }

        let content = UNMutableNotificationContent()
        content.title = "Weekly Check-In"
        content.body = "Time to update your progress and recompute your nutrition plan!"
        content.sound = .default
        content.categoryIdentifier = NotificationCategory.weeklyCheckIn.rawValue
        content.userInfo = ["type": "weekly_checkin"]

        // Trigger every Monday at 9 AM
        var dateComponents = DateComponents()
        dateComponents.weekday = 2  // Monday (1 = Sunday, 2 = Monday, etc.)
        dateComponents.hour = 9
        dateComponents.minute = 0

        let trigger = UNCalendarNotificationTrigger(
            dateMatching: dateComponents,
            repeats: true
        )

        let request = UNNotificationRequest(
            identifier: "weekly_checkin",
            content: content,
            trigger: trigger
        )

        do {
            try await notificationCenter.add(request)
            Logger.info("Weekly check-in notification scheduled for Mondays at 9 AM")
        } catch {
            Logger.error("Failed to schedule weekly check-in: \(error)")
        }
    }

    /// Cancel weekly check-in notification
    func cancelWeeklyCheckIn() {
        notificationCenter.removePendingNotificationRequests(withIdentifiers: ["weekly_checkin"])
        Logger.info("Weekly check-in notification cancelled")
    }

    // MARK: - Notification Management

    /// Get all pending notifications
    func getPendingNotifications() async -> [UNNotificationRequest] {
        return await notificationCenter.pendingNotificationRequests()
    }

    /// Cancel all notifications
    func cancelAllNotifications() {
        notificationCenter.removeAllPendingNotificationRequests()
        notificationCenter.removeAllDeliveredNotifications()
        Logger.info("All notifications cancelled")
    }

    /// Clear delivered notifications
    func clearDeliveredNotifications() {
        notificationCenter.removeAllDeliveredNotifications()
        Logger.debug("Cleared delivered notifications")
    }

    /// Reset badge count
    func resetBadgeCount() {
        notificationCenter.setBadgeCount(0)
    }
}

// MARK: - UNUserNotificationCenterDelegate

extension NotificationManager: UNUserNotificationCenterDelegate {

    /// Handle notification when app is in foreground
    nonisolated func userNotificationCenter(
        _ center: UNUserNotificationCenter,
        willPresent notification: UNNotification,
        withCompletionHandler completionHandler: @escaping (UNNotificationPresentationOptions) -> Void
    ) {
        // Show notification even when app is in foreground
        completionHandler([.banner, .sound, .badge])

        Logger.debug("Notification presented in foreground")
    }

    /// Handle notification tap
    nonisolated func userNotificationCenter(
        _ center: UNUserNotificationCenter,
        didReceive response: UNNotificationResponse,
        withCompletionHandler completionHandler: @escaping () -> Void
    ) {
        let userInfo = response.notification.request.content.userInfo

        _Concurrency.Task { @MainActor in
            await handleNotificationResponse(response: response, userInfo: userInfo)
        }

        completionHandler()
    }

    /// Process notification response and trigger appropriate navigation
    private func handleNotificationResponse(
        response: UNNotificationResponse,
        userInfo: [AnyHashable: Any]
    ) async {
        let actionIdentifier = response.actionIdentifier
        let notificationType = userInfo["type"] as? String

        Logger.info("Notification tapped - Type: \(notificationType ?? "unknown"), Action: \(actionIdentifier)")

        // Handle different notification types
        switch notificationType {
        case "plan_update", "weekly_checkin":
            if actionIdentifier == UNNotificationDefaultActionIdentifier ||
               actionIdentifier == NotificationAction.viewPlan.rawValue {
                // Navigate to plan screen
                await navigateToPlan()
            }

        default:
            Logger.warning("Unknown notification type: \(notificationType ?? "nil")")
        }

        // Clear badge
        resetBadgeCount()
    }

    /// Navigate to plan screen
    private func navigateToPlan() async {
        // Post notification to trigger navigation in app
        await MainActor.run {
            NotificationCenter.default.post(
                name: .navigateToPlan,
                object: nil
            )
        }

        Logger.info("Posted navigation to plan screen")
    }
}

// MARK: - Authorization Status Extension

extension UNAuthorizationStatus {
    var displayName: String {
        switch self {
        case .notDetermined: return "Not Determined"
        case .denied: return "Denied"
        case .authorized: return "Authorized"
        case .provisional: return "Provisional"
        case .ephemeral: return "Ephemeral"
        @unknown default: return "Unknown"
        }
    }
}
