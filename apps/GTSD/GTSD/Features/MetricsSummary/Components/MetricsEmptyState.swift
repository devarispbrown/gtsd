//
//  MetricsEmptyState.swift
//  GTSD
//
//  Created by Claude on 2025-10-28.
//

import SwiftUI

/// Empty state view for when metrics are not available
struct MetricsEmptyState: View {
    let message: String
    let icon: String
    let actionTitle: String?
    let action: (() -> Void)?

    init(
        message: String,
        icon: String = "chart.bar.xaxis",
        actionTitle: String? = nil,
        action: (() -> Void)? = nil
    ) {
        self.message = message
        self.icon = icon
        self.actionTitle = actionTitle
        self.action = action
    }

    var body: some View {
        VStack(spacing: Spacing.lg) {
            Spacer()

            // Icon
            Image(systemName: icon)
                .font(.system(size: IconSize.xxl))
                .foregroundColor(.textSecondary.opacity(0.5))
                .accessibilityHidden(true)

            // Message
            Text(message)
                .font(.bodyLarge)
                .foregroundColor(.textSecondary)
                .multilineTextAlignment(.center)
                .padding(.horizontal, Spacing.xl)

            // Optional action button
            if let actionTitle = actionTitle, let action = action {
                GTSDButton(actionTitle, style: .secondary) {
                    action()
                }
                .padding(.horizontal, Spacing.xl)
                .padding(.top, Spacing.sm)
            }

            Spacer()
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(Color.backgroundSecondary.opacity(0.3))
        .accessibilityElement(children: .combine)
    }
}

/// Error state view for when metrics loading fails
struct MetricsErrorState: View {
    let error: String
    let retryAction: () -> Void

    var body: some View {
        VStack(spacing: Spacing.lg) {
            Spacer()

            // Error icon
            Image(systemName: "exclamationmark.triangle.fill")
                .font(.system(size: IconSize.xxl))
                .foregroundColor(.errorColor.opacity(0.7))
                .accessibilityHidden(true)

            // Error message
            VStack(spacing: Spacing.sm) {
                Text("Unable to Load Metrics")
                    .font(.titleMedium)
                    .foregroundColor(.textPrimary)

                Text(error)
                    .font(.bodyMedium)
                    .foregroundColor(.textSecondary)
                    .multilineTextAlignment(.center)
                    .padding(.horizontal, Spacing.xl)
            }

            // Retry button
            GTSDButton("Try Again", style: .primary) {
                retryAction()
            }
            .padding(.horizontal, Spacing.xl)
            .padding(.top, Spacing.sm)

            Spacer()
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(Color.backgroundSecondary.opacity(0.3))
        .accessibilityElement(children: .combine)
    }
}

// MARK: - Previews

#Preview("Empty State") {
    MetricsEmptyState(
        message: "Complete your profile to see your personalized health metrics",
        actionTitle: "Complete Profile",
        action: {}
    )
}

#Preview("Error State") {
    MetricsErrorState(
        error: "Network connection error. Please check your internet connection and try again.",
        retryAction: {}
    )
}
