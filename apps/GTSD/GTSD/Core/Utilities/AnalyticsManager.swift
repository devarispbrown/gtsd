//
//  AnalyticsManager.swift
//  GTSD
//
//  Created by Claude on 2025-10-28.
//

import Foundation
import SwiftUI
import Combine

/// Analytics event tracking manager
///
/// Centralized analytics tracking for user behavior and app performance.
/// Integrates with analytics SDKs (Firebase, Mixpanel, etc.) when configured.
///
/// ## Event Categories
/// - User Actions: Button taps, navigation, form submissions
/// - Plan Events: Plan viewed, updated, recalculated
/// - Weight Events: Weight logged, updated
/// - Engagement: Screen views, time spent, feature usage
/// - Errors: API errors, validation errors, crashes
///
/// ## Usage Example
/// ```swift
/// // Track screen view
/// AnalyticsManager.shared.trackScreenView("Plan Summary")
///
/// // Track event
/// AnalyticsManager.shared.trackEvent("plan_updated", properties: [
///     "calorie_target": 2150,
///     "protein_target": 165
/// ])
///
/// // Track user property
/// AnalyticsManager.shared.setUserProperty("goal", value: "lose_weight")
/// ```
@MainActor
final class AnalyticsManager: ObservableObject {

    // MARK: - Singleton

    static let shared = AnalyticsManager()

    // MARK: - Properties

    @Published private(set) var isEnabled: Bool = true
    private var sessionStartTime: Date?
    private var currentScreen: String?

    // MARK: - Event Names

    enum Event {
        // Plan Events
        case planViewed
        case planUpdated
        case planRecalculated
        case planRefreshed

        // Weight Events
        case weightLogged
        case weightUpdated

        // Navigation Events
        case screenViewed(String)
        case tabChanged(String)
        case deepLinkOpened(String)

        // User Actions
        case buttonTapped(String)
        case formSubmitted(String)
        case pullToRefresh(String)

        // Errors
        case apiError(String, String) // endpoint, error
        case validationError(String)
        case networkError(String)

        // Performance
        case appLaunched
        case appBackgrounded
        case appForegrounded

        var name: String {
            switch self {
            case .planViewed: return "plan_viewed"
            case .planUpdated: return "plan_updated"
            case .planRecalculated: return "plan_recalculated"
            case .planRefreshed: return "plan_refreshed"
            case .weightLogged: return "weight_logged"
            case .weightUpdated: return "weight_updated"
            case .screenViewed: return "screen_viewed"
            case .tabChanged: return "tab_changed"
            case .deepLinkOpened: return "deep_link_opened"
            case .buttonTapped: return "button_tapped"
            case .formSubmitted: return "form_submitted"
            case .pullToRefresh: return "pull_to_refresh"
            case .apiError: return "api_error"
            case .validationError: return "validation_error"
            case .networkError: return "network_error"
            case .appLaunched: return "app_launched"
            case .appBackgrounded: return "app_backgrounded"
            case .appForegrounded: return "app_foregrounded"
            }
        }

        var properties: [String: Any] {
            switch self {
            case .screenViewed(let screen):
                return ["screen_name": screen]
            case .tabChanged(let tab):
                return ["tab_name": tab]
            case .deepLinkOpened(let url):
                return ["url": url]
            case .buttonTapped(let button):
                return ["button_id": button]
            case .formSubmitted(let form):
                return ["form_name": form]
            case .pullToRefresh(let screen):
                return ["screen_name": screen]
            case .apiError(let endpoint, let error):
                return ["endpoint": endpoint, "error": error]
            case .validationError(let field):
                return ["field": field]
            case .networkError(let description):
                return ["error_description": description]
            default:
                return [:]
            }
        }
    }

    // MARK: - Initialization

    private init() {
        sessionStartTime = Date()
        Logger.log("AnalyticsManager initialized", level: .info)
    }

    // MARK: - Public Methods

    /// Track a screen view
    func trackScreenView(_ screenName: String) {
        guard isEnabled else { return }

        // Calculate time spent on previous screen
        if let previousScreen = currentScreen, let startTime = sessionStartTime {
            let timeSpent = Date().timeIntervalSince(startTime)
            trackEvent("screen_time", properties: [
                "screen_name": previousScreen,
                "time_spent_seconds": Int(timeSpent)
            ])
        }

        currentScreen = screenName
        sessionStartTime = Date()

        trackEvent("screen_viewed", properties: ["screen_name": screenName])

        Logger.log("Screen viewed: \(screenName)", level: .debug)
    }

    /// Track a custom event
    func trackEvent(_ event: Event, additionalProperties: [String: Any] = [:]) {
        guard isEnabled else { return }

        var properties = event.properties
        properties.merge(additionalProperties) { _, new in new }

        trackEvent(event.name, properties: properties)
    }

    /// Track a custom event with name and properties
    func trackEvent(_ eventName: String, properties: [String: Any] = [:]) {
        guard isEnabled else { return }

        var enrichedProperties = properties
        enrichedProperties["timestamp"] = ISO8601DateFormatter().string(from: Date())
        enrichedProperties["platform"] = "iOS"
        enrichedProperties["app_version"] = Bundle.main.infoDictionary?["CFBundleShortVersionString"] as? String ?? "unknown"

        // TODO: Integrate with actual analytics SDK
        // Firebase: Analytics.logEvent(eventName, parameters: enrichedProperties)
        // Mixpanel: Mixpanel.mainInstance().track(event: eventName, properties: enrichedProperties)

        Logger.log("Analytics event: \(eventName) | Properties: \(enrichedProperties)", level: .debug)

        // Development: Print to console
        #if DEBUG
        print("📊 Analytics: \(eventName)")
        if !properties.isEmpty {
            print("   Properties: \(properties)")
        }
        #endif
    }

    /// Set user property
    func setUserProperty(_ key: String, value: Any) {
        guard isEnabled else { return }

        // TODO: Integrate with actual analytics SDK
        // Firebase: Analytics.setUserProperty(String(describing: value), forName: key)
        // Mixpanel: Mixpanel.mainInstance().people.set(property: key, to: value)

        Logger.log("User property set: \(key) = \(value)", level: .debug)
    }

    /// Set user ID
    func setUserId(_ userId: String) {
        guard isEnabled else { return }

        // TODO: Integrate with actual analytics SDK
        // Firebase: Analytics.setUserID(userId)
        // Mixpanel: Mixpanel.mainInstance().identify(distinctId: userId)

        Logger.log("User ID set: \(userId)", level: .info)
    }

    /// Enable/disable analytics tracking
    func setEnabled(_ enabled: Bool) {
        isEnabled = enabled
        Logger.log("Analytics \(enabled ? "enabled" : "disabled")", level: .info)
    }

    // MARK: - Convenience Methods

    /// Track plan view
    func trackPlanView(calorieTarget: Int, proteinTarget: Int, waterTarget: Int) {
        trackEvent(.planViewed, additionalProperties: [
            "calorie_target": calorieTarget,
            "protein_target": proteinTarget,
            "water_target": waterTarget
        ])
    }

    /// Track plan update
    func trackPlanUpdate(
        oldCalories: Int,
        newCalories: Int,
        oldProtein: Int,
        newProtein: Int,
        trigger: String
    ) {
        trackEvent(.planUpdated, additionalProperties: [
            "old_calorie_target": oldCalories,
            "new_calorie_target": newCalories,
            "old_protein_target": oldProtein,
            "new_protein_target": newProtein,
            "calorie_change": newCalories - oldCalories,
            "protein_change": newProtein - oldProtein,
            "trigger": trigger
        ])
    }

    /// Track weight update
    func trackWeightUpdate(oldWeight: Double, newWeight: Double) {
        trackEvent(.weightUpdated, additionalProperties: [
            "old_weight": oldWeight,
            "new_weight": newWeight,
            "weight_change": newWeight - oldWeight
        ])
    }

    /// Track error
    func trackError(_ error: Error, context: String) {
        trackEvent("error_occurred", properties: [
            "error_description": error.localizedDescription,
            "context": context,
            "error_type": String(describing: type(of: error))
        ])
    }
}

// MARK: - SwiftUI View Extension

extension View {
    /// Track screen view when view appears
    func trackScreen(_ screenName: String) -> some View {
        self.onAppear {
            AnalyticsManager.shared.trackScreenView(screenName)
        }
    }

    /// Track button tap with analytics
    func trackTap(_ eventName: String, properties: [String: Any] = [:]) -> some View {
        self.simultaneousGesture(
            TapGesture().onEnded {
                AnalyticsManager.shared.trackEvent(eventName, properties: properties)
            }
        )
    }
}

// MARK: - Preview

#Preview {
    struct AnalyticsPreview: View {
        var body: some View {
            VStack(spacing: Spacing.lg) {
                Text("Analytics Manager")
                    .font(.headlineLarge)

                VStack(spacing: Spacing.sm) {
                    Button("Track Screen View") {
                        AnalyticsManager.shared.trackScreenView("Test Screen")
                    }

                    Button("Track Plan View") {
                        AnalyticsManager.shared.trackPlanView(
                            calorieTarget: 2150,
                            proteinTarget: 165,
                            waterTarget: 3000
                        )
                    }

                    Button("Track Button Tap") {
                        AnalyticsManager.shared.trackEvent(.buttonTapped("test_button"))
                    }

                    Button("Track Error") {
                        let error = NSError(domain: "test", code: 500, userInfo: [NSLocalizedDescriptionKey: "Test error"])
                        AnalyticsManager.shared.trackError(error, context: "Preview")
                    }
                }

                Text("Check console for analytics events")
                    .font(.bodySmall)
                    .foregroundColor(.textSecondary)
            }
            .padding()
        }
    }

    return AnalyticsPreview()
}
