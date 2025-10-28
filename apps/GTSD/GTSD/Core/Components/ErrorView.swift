//
//  ErrorView.swift
//  GTSD
//
//  Created by Claude on 2025-10-26.
//

import SwiftUI

struct ErrorView: View {
    let message: String
    var retryAction: (() -> Void)?

    var body: some View {
        VStack(spacing: Spacing.md) {
            Image(systemName: "exclamationmark.triangle.fill")
                .font(.system(size: IconSize.xxl))
                .foregroundColor(.errorColor)

            Text("Oops!")
                .font(.headlineMedium)
                .foregroundColor(.textPrimary)

            Text(message)
                .font(.bodyMedium)
                .foregroundColor(.textSecondary)
                .multilineTextAlignment(.center)
                .padding(.horizontal, Spacing.xl)

            if let retryAction = retryAction {
                GTSDButton("Try Again", style: .primary) {
                    retryAction()
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
    ErrorView(
        message: "Failed to load data. Please check your internet connection and try again.",
        retryAction: {}
    )
}
