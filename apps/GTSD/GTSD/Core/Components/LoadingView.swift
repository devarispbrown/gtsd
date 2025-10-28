//
//  LoadingView.swift
//  GTSD
//
//  Created by Claude on 2025-10-26.
//

import SwiftUI

struct LoadingView: View {
    var message: String = "Loading..."

    var body: some View {
        VStack(spacing: Spacing.md) {
            ProgressView()
                .scaleEffect(1.5)
                .tint(.primaryColor)

            Text(message)
                .font(.bodyMedium)
                .foregroundColor(.textSecondary)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(Color.backgroundPrimary)
    }
}

// MARK: - Preview

#Preview {
    LoadingView()
}
