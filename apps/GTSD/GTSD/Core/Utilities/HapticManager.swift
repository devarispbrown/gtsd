//
//  HapticManager.swift
//  GTSD
//
//  Created by Claude on 2025-10-28.
//

import UIKit
import SwiftUI

/// Centralized haptic feedback management
///
/// HapticManager provides consistent haptic feedback throughout the app.
/// Automatically respects user's "Reduce Motion" accessibility setting.
///
/// ## Usage Example
/// ```swift
/// // Success feedback
/// HapticManager.success()
///
/// // Error feedback
/// HapticManager.error()
///
/// // Selection feedback
/// HapticManager.selection()
///
/// // Impact feedback
/// HapticManager.impact(.medium)
/// ```
enum HapticManager {

    // MARK: - Feedback Generators

    private static let notificationGenerator = UINotificationFeedbackGenerator()
    private static let selectionGenerator = UISelectionFeedbackGenerator()
    private static let impactLight = UIImpactFeedbackGenerator(style: .light)
    private static let impactMedium = UIImpactFeedbackGenerator(style: .medium)
    private static let impactHeavy = UIImpactFeedbackGenerator(style: .heavy)

    // MARK: - Check User Preferences

    private static var isHapticsEnabled: Bool {
        // Respect "Reduce Motion" accessibility setting
        return !UIAccessibility.isReduceMotionEnabled
    }

    // MARK: - Public Methods

    /// Trigger success haptic feedback
    /// Use when: Plan updates successfully, weight saved, goal completed
    static func success() {
        guard isHapticsEnabled else { return }
        notificationGenerator.notificationOccurred(.success)
    }

    /// Trigger error haptic feedback
    /// Use when: Network error, validation error, operation failed
    static func error() {
        guard isHapticsEnabled else { return }
        notificationGenerator.notificationOccurred(.error)
    }

    /// Trigger warning haptic feedback
    /// Use when: Stale data warning, offline mode, near limit
    static func warning() {
        guard isHapticsEnabled else { return }
        notificationGenerator.notificationOccurred(.warning)
    }

    /// Trigger selection haptic feedback
    /// Use when: Button tap, tab switch, picker selection
    static func selection() {
        guard isHapticsEnabled else { return }
        selectionGenerator.selectionChanged()
    }

    /// Trigger impact haptic feedback
    /// Use when: Pull-to-refresh, modal dismiss, swipe action
    static func impact(_ style: UIImpactFeedbackGenerator.FeedbackStyle = .medium) {
        guard isHapticsEnabled else { return }

        switch style {
        case .light:
            impactLight.impactOccurred()
        case .medium:
            impactMedium.impactOccurred()
        case .heavy:
            impactHeavy.impactOccurred()
        case .soft:
            if #available(iOS 13.0, *) {
                let softGenerator = UIImpactFeedbackGenerator(style: .soft)
                softGenerator.impactOccurred()
            } else {
                impactLight.impactOccurred()
            }
        case .rigid:
            if #available(iOS 13.0, *) {
                let rigidGenerator = UIImpactFeedbackGenerator(style: .rigid)
                rigidGenerator.impactOccurred()
            } else {
                impactHeavy.impactOccurred()
            }
        @unknown default:
            impactMedium.impactOccurred()
        }
    }

    /// Prepare haptic generator for upcoming feedback (reduces latency)
    /// Call this when you know haptic feedback will be needed soon
    static func prepare(for type: HapticType) {
        guard isHapticsEnabled else { return }

        switch type {
        case .notification:
            notificationGenerator.prepare()
        case .selection:
            selectionGenerator.prepare()
        case .impact(let style):
            switch style {
            case .light:
                impactLight.prepare()
            case .medium:
                impactMedium.prepare()
            case .heavy:
                impactHeavy.prepare()
            default:
                impactMedium.prepare()
            }
        }
    }

    // MARK: - Haptic Type

    enum HapticType {
        case notification
        case selection
        case impact(UIImpactFeedbackGenerator.FeedbackStyle)
    }
}

// MARK: - SwiftUI View Extension

extension View {
    /// Add haptic feedback to any view
    func hapticFeedback(on trigger: Binding<Bool>, type: HapticFeedbackType) -> some View {
        onChange(of: trigger.wrappedValue) { newValue in
            if newValue {
                switch type {
                case .success:
                    HapticManager.success()
                case .error:
                    HapticManager.error()
                case .warning:
                    HapticManager.warning()
                case .selection:
                    HapticManager.selection()
                case .impact(let style):
                    HapticManager.impact(style)
                }
            }
        }
    }

    /// Add haptic feedback on button tap
    func onTapHaptic(_ style: UIImpactFeedbackGenerator.FeedbackStyle = .light, action: @escaping () -> Void) -> some View {
        Button(action: {
            HapticManager.impact(style)
            action()
        }) {
            self
        }
        .buttonStyle(PlainButtonStyle())
    }
}

enum HapticFeedbackType {
    case success
    case error
    case warning
    case selection
    case impact(UIImpactFeedbackGenerator.FeedbackStyle)
}
