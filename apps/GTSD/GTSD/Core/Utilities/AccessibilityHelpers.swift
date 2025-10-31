//
//  AccessibilityHelpers.swift
//  GTSD
//
//  Created by Claude on 2025-10-28.
//

import SwiftUI
import UIKit
import Combine

/// Accessibility utilities and helpers
///
/// Provides consistent accessibility support across the app including:
/// - VoiceOver labels and hints
/// - Dynamic Type support
/// - Reduced Motion animations
/// - High Contrast mode support
/// - Accessibility traits
///
/// ## Usage Example
/// ```swift
/// Text("Submit")
///     .accessibilityLabel("Submit form")
///     .accessibilityHint("Double tap to submit your weight update")
///     .accessibilityAddTraits(.isButton)
///
/// @ScaledMetric var fontSize: CGFloat = 16
/// ```

// MARK: - Accessibility Environment

@MainActor
final class AccessibilityEnvironment: ObservableObject {
    static let shared = AccessibilityEnvironment()

    @Published var isVoiceOverRunning: Bool
    @Published var isBoldTextEnabled: Bool
    @Published var isReduceMotionEnabled: Bool
    @Published var isReduceTransparencyEnabled: Bool
    @Published var isDarkerSystemColorsEnabled: Bool
    @Published var preferredContentSizeCategory: UIContentSizeCategory

    private init() {
        self.isVoiceOverRunning = UIAccessibility.isVoiceOverRunning
        self.isBoldTextEnabled = UIAccessibility.isBoldTextEnabled
        self.isReduceMotionEnabled = UIAccessibility.isReduceMotionEnabled
        self.isReduceTransparencyEnabled = UIAccessibility.isReduceTransparencyEnabled
        self.isDarkerSystemColorsEnabled = UIAccessibility.isDarkerSystemColorsEnabled
        self.preferredContentSizeCategory = UIApplication.shared.preferredContentSizeCategory

        setupObservers()
    }

    private func setupObservers() {
        NotificationCenter.default.addObserver(
            forName: UIAccessibility.voiceOverStatusDidChangeNotification,
            object: nil,
            queue: .main
        ) { [weak self] _ in
            self?.isVoiceOverRunning = UIAccessibility.isVoiceOverRunning
        }

        NotificationCenter.default.addObserver(
            forName: UIAccessibility.boldTextStatusDidChangeNotification,
            object: nil,
            queue: .main
        ) { [weak self] _ in
            self?.isBoldTextEnabled = UIAccessibility.isBoldTextEnabled
        }

        NotificationCenter.default.addObserver(
            forName: UIAccessibility.reduceMotionStatusDidChangeNotification,
            object: nil,
            queue: .main
        ) { [weak self] _ in
            self?.isReduceMotionEnabled = UIAccessibility.isReduceMotionEnabled
        }

        NotificationCenter.default.addObserver(
            forName: UIContentSizeCategory.didChangeNotification,
            object: nil,
            queue: .main
        ) { [weak self] _ in
            self?.preferredContentSizeCategory = UIApplication.shared.preferredContentSizeCategory
        }
    }
}

// MARK: - Accessibility Modifiers

extension View {
    /// Add comprehensive accessibility support to a button
    func accessibleButton(
        label: String,
        hint: String? = nil,
        traits: AccessibilityTraits = .isButton
    ) -> some View {
        self
            .accessibilityLabel(label)
            .accessibilityHint(hint ?? "")
            .accessibilityAddTraits(traits)
    }

    /// Add accessibility support for a card/container
    func accessibleCard(
        label: String,
        hint: String? = nil,
        value: String? = nil
    ) -> some View {
        self
            .accessibilityElement(children: .combine)
            .accessibilityLabel(label)
            .accessibilityValue(value ?? "")
            .accessibilityHint(hint ?? "")
    }

    /// Add accessibility support for a value/statistic
    func accessibleValue(
        label: String,
        value: String,
        unit: String? = nil
    ) -> some View {
        let fullValue = unit != nil ? "\(value) \(unit!)" : value
        return self
            .accessibilityLabel(label)
            .accessibilityValue(fullValue)
    }

    /// Respect reduced motion preference
    func respectReducedMotion<T: Equatable>(
        value: T,
        animation: Animation = .default
    ) -> some View {
        let shouldAnimate = !UIAccessibility.isReduceMotionEnabled
        return self.animation(shouldAnimate ? animation : nil, value: value)
    }

    /// Apply minimum touch target size (44x44 points)
    func minimumTouchTarget(size: CGFloat = 44) -> some View {
        self.frame(minWidth: size, minHeight: size)
    }
}

// MARK: - Dynamic Type Support

/// Wrapper for dynamic type scaling
struct DynamicTypeSize: ViewModifier {
    @Environment(\.sizeCategory) var sizeCategory

    var minSize: CGFloat
    var maxSize: CGFloat
    var baseSize: CGFloat

    func body(content: Content) -> some View {
        let scaleFactor = scaleFactor(for: sizeCategory)
        let scaledSize = min(max(baseSize * scaleFactor, minSize), maxSize)

        return content
            .font(.system(size: scaledSize))
    }

    private func scaleFactor(for category: ContentSizeCategory) -> CGFloat {
        switch category {
        case .extraSmall: return 0.8
        case .small: return 0.9
        case .medium: return 1.0
        case .large: return 1.1
        case .extraLarge: return 1.2
        case .extraExtraLarge: return 1.3
        case .extraExtraExtraLarge: return 1.4
        case .accessibilityMedium: return 1.6
        case .accessibilityLarge: return 1.8
        case .accessibilityExtraLarge: return 2.0
        case .accessibilityExtraExtraLarge: return 2.2
        case .accessibilityExtraExtraExtraLarge: return 2.4
        @unknown default: return 1.0
        }
    }
}

extension View {
    /// Apply dynamic type scaling with min/max constraints
    func dynamicTypeSize(
        min minSize: CGFloat = 12,
        max maxSize: CGFloat = 40,
        base baseSize: CGFloat = 16
    ) -> some View {
        self.modifier(DynamicTypeSize(
            minSize: minSize,
            maxSize: maxSize,
            baseSize: baseSize
        ))
    }
}

// MARK: - VoiceOver Announcements

enum VoiceOverAnnouncement {
    /// Make an announcement to VoiceOver users
    static func announce(_ message: String, priority: UIAccessibility.Notification = .announcement) {
        guard UIAccessibility.isVoiceOverRunning else { return }

        DispatchQueue.main.asyncAfter(deadline: .now() + 0.1) {
            UIAccessibility.post(notification: priority, argument: message)
        }
    }

    /// Announce a screen change to VoiceOver users
    static func announceScreenChange(_ message: String) {
        announce(message, priority: .screenChanged)
    }

    /// Announce a layout change to VoiceOver users
    static func announceLayoutChange(_ message: String) {
        announce(message, priority: .layoutChanged)
    }
}

// MARK: - Accessibility Labels

enum AccessibilityLabels {
    // Plan-related
    static let planUpdated = "Your nutrition plan has been updated"
    static let planViewButton = "View full plan details"
    static let refreshPlanButton = "Refresh plan data"
    static let recalculatePlanButton = "Recalculate your plan"

    // Target-related
    static func calorieTarget(_ value: Int) -> String {
        "Daily calorie target: \(value) calories"
    }

    static func proteinTarget(_ value: Int) -> String {
        "Daily protein target: \(value) grams"
    }

    static func waterTarget(_ value: Int) -> String {
        "Daily water target: \(value) milliliters"
    }

    // Weight-related
    static let updateWeightButton = "Update your weight"
    static func weightValue(_ value: Double, unit: String) -> String {
        "Current weight: \(String(format: "%.1f", value)) \(unit)"
    }

    // Navigation
    static let backButton = "Go back"
    static let closeButton = "Close screen"
    static let doneButton = "Done, dismiss screen"
}

// MARK: - Accessibility Hints

enum AccessibilityHints {
    static let tapToView = "Double tap to view details"
    static let tapToEdit = "Double tap to edit"
    static let tapToDismiss = "Double tap to dismiss"
    static let swipeToRefresh = "Swipe down to refresh"
    static let tapToNavigate = "Double tap to navigate"
}

// MARK: - High Contrast Support

extension Color {
    /// Returns high contrast version if enabled
    func highContrast(darker: Color? = nil) -> Color {
        if UIAccessibility.isDarkerSystemColorsEnabled {
            return darker ?? self
        }
        return self
    }
}

// MARK: - Accessibility Checker

struct AccessibilityChecker {
    /// Check if view meets minimum accessibility requirements
    static func validateView(
        hasLabel: Bool,
        hasAccessibleTraits: Bool,
        hasMinimumTouchTarget: Bool = true,
        elementDescription: String
    ) -> Bool {
        var issues: [String] = []

        if !hasLabel {
            issues.append("Missing accessibility label for \(elementDescription)")
        }

        if !hasAccessibleTraits {
            issues.append("Missing accessibility traits for \(elementDescription)")
        }

        if !hasMinimumTouchTarget {
            issues.append("Touch target too small for \(elementDescription)")
        }

        if !issues.isEmpty {
            Logger.log("Accessibility issues: \(issues.joined(separator: ", "))", level: .warning)
            return false
        }

        return true
    }
}

// MARK: - Preview

#Preview {
    struct AccessibilityPreview: View {
        @StateObject private var accessibilityEnv = AccessibilityEnvironment.shared

        var body: some View {
            ScrollView {
                VStack(spacing: Spacing.lg) {
                    Text("Accessibility Settings")
                        .font(.headlineLarge)

                    VStack(alignment: .leading, spacing: Spacing.sm) {
                        Toggle("VoiceOver", isOn: .constant(accessibilityEnv.isVoiceOverRunning))
                            .disabled(true)

                        Toggle("Bold Text", isOn: .constant(accessibilityEnv.isBoldTextEnabled))
                            .disabled(true)

                        Toggle("Reduce Motion", isOn: .constant(accessibilityEnv.isReduceMotionEnabled))
                            .disabled(true)

                        Toggle("Reduce Transparency", isOn: .constant(accessibilityEnv.isReduceTransparencyEnabled))
                            .disabled(true)

                        Toggle("Darker Colors", isOn: .constant(accessibilityEnv.isDarkerSystemColorsEnabled))
                            .disabled(true)
                    }
                    .padding()
                    .background(Color.backgroundSecondary)
                    .cornerRadius(CornerRadius.md)

                    Button("Announce to VoiceOver") {
                        VoiceOverAnnouncement.announce("This is a test announcement")
                    }
                    .accessibleButton(
                        label: "Test announcement button",
                        hint: "Triggers a VoiceOver announcement"
                    )
                    .padding()
                    .background(Color.primaryColor)
                    .foregroundColor(.white)
                    .cornerRadius(CornerRadius.md)
                    .minimumTouchTarget()

                    Text("Dynamic Type Example")
                        .dynamicTypeSize(min: 14, max: 32, base: 20)
                        .padding()
                        .background(Color.backgroundSecondary)
                        .cornerRadius(CornerRadius.sm)
                }
                .padding()
            }
        }
    }

    return AccessibilityPreview()
}
