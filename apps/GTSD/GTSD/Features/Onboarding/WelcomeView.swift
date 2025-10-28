//
//  WelcomeView.swift
//  GTSD
//
//  Created by Claude on 2025-10-26.
//

import SwiftUI

struct WelcomeView: View {
    let onContinue: () -> Void

    var body: some View {
        VStack(spacing: Spacing.xl) {
            Spacer()

            // App Icon/Logo
            Image(systemName: "flame.circle.fill")
                .font(.system(size: 100))
                .foregroundColor(.primaryColor)

            // Title
            VStack(spacing: Spacing.sm) {
                Text("Welcome to GTSD")
                    .font(.displaySmall)
                    .fontWeight(.bold)
                    .foregroundColor(.textPrimary)

                Text("Get Things Successfully Done")
                    .font(.titleMedium)
                    .foregroundColor(.textSecondary)
            }

            Spacer()

            // Features
            VStack(alignment: .leading, spacing: Spacing.md) {
                FeatureRow(
                    icon: "checkmark.circle.fill",
                    title: "Track Your Progress",
                    description: "Complete tasks and build lasting habits"
                )

                FeatureRow(
                    icon: "flame.fill",
                    title: "Build Streaks",
                    description: "Stay consistent and earn achievements"
                )

                FeatureRow(
                    icon: "photo.fill",
                    title: "Document Your Journey",
                    description: "Capture progress with photo evidence"
                )

                FeatureRow(
                    icon: "chart.bar.fill",
                    title: "Track Your Health",
                    description: "Monitor your fitness and wellness goals"
                )
            }
            .padding(.horizontal, Spacing.xl)

            Spacer()

            // Continue Button
            GTSDButton("Get Started", style: .primary) {
                onContinue()
            }
            .padding(.horizontal, Spacing.xl)
            .padding(.bottom, Spacing.lg)
        }
        .padding(.vertical, Spacing.xl)
    }
}

// MARK: - Feature Row

struct FeatureRow: View {
    let icon: String
    let title: String
    let description: String

    var body: some View {
        HStack(alignment: .top, spacing: Spacing.md) {
            Image(systemName: icon)
                .font(.system(size: IconSize.lg))
                .foregroundColor(.primaryColor)
                .frame(width: 40)

            VStack(alignment: .leading, spacing: Spacing.xs) {
                Text(title)
                    .font(.titleMedium)
                    .foregroundColor(.textPrimary)

                Text(description)
                    .font(.bodySmall)
                    .foregroundColor(.textSecondary)
            }
        }
    }
}

// MARK: - Preview

#Preview {
    WelcomeView(onContinue: {})
}
