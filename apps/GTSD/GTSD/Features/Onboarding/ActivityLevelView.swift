//
//  ActivityLevelView.swift
//  GTSD
//
//  Created by Claude on 2025-10-27.
//

import SwiftUI

struct ActivityLevelView: View {
    @Binding var onboardingData: OnboardingData
    let onNext: () -> Void

    var body: some View {
        VStack(spacing: Spacing.xl) {
            // Header
            VStack(spacing: Spacing.md) {
                Image(systemName: "figure.run")
                    .font(.system(size: IconSize.xxl))
                    .foregroundColor(.primaryColor)

                Text("Activity Level")
                    .font(.headlineMedium)
                    .foregroundColor(.textPrimary)

                Text("How active are you on a regular basis?")
                    .font(.bodyMedium)
                    .foregroundColor(.textSecondary)
                    .multilineTextAlignment(.center)
            }
            .padding(.top, Spacing.xl)
            .padding(.horizontal, Spacing.lg)

            // Activity Level Options
            ScrollView {
                VStack(spacing: Spacing.md) {
                    ForEach(OnboardingData.ActivityLevel.allCases, id: \.self) { level in
                        ActivityLevelCard(
                            level: level,
                            isSelected: onboardingData.activityLevel == level
                        ) {
                            onboardingData.activityLevel = level
                        }
                    }
                }
                .padding(.horizontal, Spacing.lg)
            }

            // Next Button
            GTSDButton(
                "Continue",
                style: .primary,
                isDisabled: onboardingData.activityLevel == nil
            ) {
                onNext()
            }
            .padding(.horizontal, Spacing.lg)
            .padding(.bottom, Spacing.lg)
        }
    }
}

// MARK: - Activity Level Card

struct ActivityLevelCard: View {
    let level: OnboardingData.ActivityLevel
    let isSelected: Bool
    let onTap: () -> Void

    var body: some View {
        Button(action: onTap) {
            VStack(alignment: .leading, spacing: Spacing.sm) {
                HStack {
                    VStack(alignment: .leading, spacing: Spacing.xs) {
                        Text(level.displayName)
                            .font(.titleMedium)
                            .foregroundColor(.textPrimary)

                        Text(level.description)
                            .font(.bodySmall)
                            .foregroundColor(.textSecondary)
                    }

                    Spacer()

                    if isSelected {
                        Image(systemName: "checkmark.circle.fill")
                            .font(.system(size: IconSize.md))
                            .foregroundColor(.primaryColor)
                    } else {
                        Image(systemName: "circle")
                            .font(.system(size: IconSize.md))
                            .foregroundColor(.textTertiary)
                    }
                }

                // Activity Examples
                HStack(spacing: Spacing.xs) {
                    Image(systemName: activityIcon)
                        .font(.system(size: IconSize.sm))
                        .foregroundColor(.primaryColor.opacity(0.6))

                    Text(activityExample)
                        .font(.labelSmall)
                        .foregroundColor(.textTertiary)
                }
            }
            .padding(Spacing.md)
            .background(
                isSelected ? Color.primaryColor.opacity(0.1) : Color.backgroundSecondary
            )
            .cornerRadius(CornerRadius.md)
            .overlay(
                RoundedRectangle(cornerRadius: CornerRadius.md)
                    .stroke(
                        isSelected ? Color.primaryColor : Color.clear,
                        lineWidth: 2
                    )
            )
        }
        .buttonStyle(PlainButtonStyle())
    }

    private var activityIcon: String {
        switch level {
        case .sedentary:
            return "figure.seated"
        case .lightlyActive:
            return "figure.walk"
        case .moderatelyActive:
            return "figure.run"
        case .veryActive:
            return "figure.basketball"
        case .extremelyActive:
            return "flame.fill"
        }
    }

    private var activityExample: String {
        switch level {
        case .sedentary:
            return "Desk job, minimal movement"
        case .lightlyActive:
            return "Walking, light housework"
        case .moderatelyActive:
            return "Regular gym sessions"
        case .veryActive:
            return "Daily intense workouts"
        case .extremelyActive:
            return "Athlete or physical labor"
        }
    }
}

// MARK: - Preview

#Preview {
    ActivityLevelView(
        onboardingData: .constant(OnboardingData()),
        onNext: {}
    )
}
