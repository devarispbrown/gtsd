//
//  ProfileZeroStateCard.swift
//  GTSD
//
//  Created by Claude on 2025-10-27.
//

import SwiftUI

struct ProfileZeroStateCard: View {
    let userName: String
    let onComplete: () -> Void
    let onDismiss: () -> Void

    var body: some View {
        GTSDCard(padding: Spacing.md) {
            VStack(spacing: Spacing.md) {
                // Icon
                Image(systemName: "figure.mixed.cardio")
                    .font(.system(size: 60))
                    .foregroundColor(.primaryColor)
                    .padding(.top, Spacing.sm)
                    .accessibilityHidden(true)

                // Headline
                Text("Complete Your Health Profile")
                    .font(.headlineSmall)
                    .fontWeight(.semibold)
                    .foregroundColor(.textPrimary)
                    .multilineTextAlignment(.center)

                // Body
                Text("Unlock personalized nutrition goals, calorie targets, and science-backed recommendations tailored just for you.")
                    .font(.bodyMedium)
                    .foregroundColor(.textSecondary)
                    .multilineTextAlignment(.center)
                    .padding(.horizontal, Spacing.sm)

                // Benefits
                VStack(alignment: .leading, spacing: Spacing.sm) {
                    benefitRow(
                        icon: "target",
                        text: "Daily calorie target based on your goals"
                    )

                    benefitRow(
                        icon: "drop.fill",
                        text: "Protein & water intake recommendations"
                    )

                    benefitRow(
                        icon: "chart.bar.fill",
                        text: "BMR and TDEE calculations explained"
                    )

                    benefitRow(
                        icon: "chart.line.uptrend.xyaxis",
                        text: "Personalized weight projection timeline"
                    )
                }
                .padding(.vertical, Spacing.sm)
                .accessibilityElement(children: .combine)
                .accessibilityLabel("Benefits of completing your profile")
                .accessibilityValue("Daily calorie target, protein and water recommendations, BMR and TDEE calculations, personalized weight projection")

                // CTA
                GTSDButton("Complete Profile", style: .primary) {
                    onComplete()
                }
                .accessibilityLabel("Complete your health profile")
                .accessibilityHint("Opens onboarding to enter your weight, height, and fitness goals")

                // Dismiss option
                Button(action: onDismiss) {
                    Text("Maybe Later")
                        .font(.bodyMedium)
                        .foregroundColor(.textTertiary)
                }
                .accessibilityLabel("Dismiss profile reminder")
                .accessibilityHint("Hide this card and skip profile completion for now")
                .padding(.bottom, Spacing.xs)
            }
        }
    }

    private func benefitRow(icon: String, text: String) -> some View {
        HStack(spacing: Spacing.sm) {
            Image(systemName: icon)
                .font(.system(size: IconSize.sm))
                .foregroundColor(.primaryColor)
                .frame(width: 24)

            Text(text)
                .font(.bodySmall)
                .foregroundColor(.textSecondary)

            Spacer()
        }
    }
}

// MARK: - Preview

#Preview {
    ScrollView {
        VStack(spacing: Spacing.lg) {
            ProfileZeroStateCard(
                userName: "John",
                onComplete: {},
                onDismiss: {}
            )

            // Show what a normal card looks like for comparison
            GTSDCard {
                VStack(alignment: .leading, spacing: Spacing.sm) {
                    Text("Normal Card")
                        .font(.titleMedium)
                    Text("This is what other content looks like")
                        .font(.bodyMedium)
                        .foregroundColor(.textSecondary)
                }
            }
        }
        .padding()
    }
}
