//
//  EmptyStateView.swift
//  GTSD
//
//  Created by Claude on 2025-10-26.
//

import SwiftUI

struct EmptyStateView: View {
    let icon: String
    let title: String
    let message: String
    var actionTitle: String?
    var action: (() -> Void)?

    var body: some View {
        VStack(spacing: Spacing.md) {
            Image(systemName: icon)
                .font(.system(size: IconSize.xxl))
                .foregroundColor(.textSecondary)

            Text(title)
                .font(.headlineMedium)
                .foregroundColor(.textPrimary)

            Text(message)
                .font(.bodyMedium)
                .foregroundColor(.textSecondary)
                .multilineTextAlignment(.center)
                .padding(.horizontal, Spacing.xl)

            if let actionTitle = actionTitle, let action = action {
                GTSDButton(actionTitle, style: .primary) {
                    action()
                }
                .padding(.horizontal, Spacing.xl)
                .padding(.top, Spacing.sm)
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(Color.backgroundPrimary)
    }
}

// MARK: - Preview

#Preview {
    EmptyStateView(
        icon: "list.bullet",
        title: "No Tasks Yet",
        message: "Create your first task to get started on your journey!",
        actionTitle: "Create Task",
        action: {}
    )
}
