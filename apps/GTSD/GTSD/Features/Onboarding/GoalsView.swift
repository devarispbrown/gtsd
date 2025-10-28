//
//  GoalsView.swift
//  GTSD
//
//  Created by Claude on 2025-10-26.
//

import SwiftUI

struct GoalsView: View {
    @ObservedObject var viewModel: OnboardingViewModel

    @State private var targetWeightText: String = ""

    var body: some View {
        VStack(spacing: Spacing.xl) {
            // Header
            VStack(spacing: Spacing.sm) {
                Text("Set Your Goals")
                    .font(.headlineLarge)
                    .foregroundColor(.textPrimary)

                Text("What do you want to achieve?")
                    .font(.bodyMedium)
                    .foregroundColor(.textSecondary)
                    .multilineTextAlignment(.center)
            }
            .padding(.top, Spacing.xl)

            ScrollView {
                VStack(spacing: Spacing.lg) {
                    // Primary Goal
                    VStack(alignment: .leading, spacing: Spacing.xs) {
                        Text("Primary Goal")
                            .font(.labelMedium)
                            .foregroundColor(.textSecondary)

                        VStack(spacing: Spacing.sm) {
                            ForEach(OnboardingData.PrimaryGoal.allCases, id: \.self) { goal in
                                Button(action: {
                                    viewModel.onboardingData.primaryGoal = goal
                                }) {
                                    HStack {
                                        Text(goal.displayName)
                                            .font(.titleMedium)
                                            .foregroundColor(.textPrimary)

                                        Spacer()

                                        if viewModel.onboardingData.primaryGoal == goal {
                                            Image(systemName: "checkmark.circle.fill")
                                                .foregroundColor(.primaryColor)
                                        }
                                    }
                                    .padding(Spacing.md)
                                    .background(
                                        viewModel.onboardingData.primaryGoal == goal
                                            ? Color.primaryColor.opacity(0.1)
                                            : Color.backgroundSecondary
                                    )
                                    .cornerRadius(CornerRadius.md)
                                }
                            }
                        }
                    }

                    // Target Weight
                    VStack(alignment: .leading, spacing: Spacing.xs) {
                        Text("Target Weight (lbs)")
                            .font(.labelMedium)
                            .foregroundColor(.textSecondary)

                        HStack(spacing: Spacing.sm) {
                            Image(systemName: "target")
                                .font(.system(size: IconSize.sm))
                                .foregroundColor(.textSecondary)

                            TextField("Enter target weight", text: $targetWeightText)
                                .keyboardType(.decimalPad)
                                .onChange(of: targetWeightText) { _, newValue in
                                    viewModel.onboardingData.targetWeight = Double(newValue)
                                }
                        }
                        .padding(Spacing.md)
                        .background(Color.backgroundSecondary)
                        .cornerRadius(CornerRadius.md)
                    }

                    // Target Date
                    VStack(alignment: .leading, spacing: Spacing.xs) {
                        Text("Target Date")
                            .font(.labelMedium)
                            .foregroundColor(.textSecondary)

                        DatePicker(
                            "Select target date",
                            selection: Binding(
                                get: { viewModel.onboardingData.targetDate ?? Calendar.current.date(byAdding: .month, value: 3, to: Date()) ?? Date() },
                                set: { viewModel.onboardingData.targetDate = $0 }
                            ),
                            in: Date()...,
                            displayedComponents: .date
                        )
                        .datePickerStyle(.graphical)
                        .padding(Spacing.md)
                        .background(Color.backgroundSecondary)
                        .cornerRadius(CornerRadius.md)
                    }

                    // Activity Level
                    VStack(alignment: .leading, spacing: Spacing.xs) {
                        Text("Activity Level")
                            .font(.labelMedium)
                            .foregroundColor(.textSecondary)

                        VStack(spacing: Spacing.sm) {
                            ForEach(OnboardingData.ActivityLevel.allCases, id: \.self) { level in
                                Button(action: {
                                    viewModel.onboardingData.activityLevel = level
                                }) {
                                    VStack(alignment: .leading, spacing: Spacing.xs) {
                                        HStack {
                                            Text(level.displayName)
                                                .font(.titleMedium)
                                                .foregroundColor(.textPrimary)

                                            Spacer()

                                            if viewModel.onboardingData.activityLevel == level {
                                                Image(systemName: "checkmark.circle.fill")
                                                    .foregroundColor(.primaryColor)
                                            }
                                        }

                                        Text(level.description)
                                            .font(.bodySmall)
                                            .foregroundColor(.textSecondary)
                                    }
                                    .padding(Spacing.md)
                                    .background(
                                        viewModel.onboardingData.activityLevel == level
                                            ? Color.primaryColor.opacity(0.1)
                                            : Color.backgroundSecondary
                                    )
                                    .cornerRadius(CornerRadius.md)
                                }
                            }
                        }
                    }

                }
                .padding(.horizontal, Spacing.xl)
            }

            Spacer()
        }
    }

}

// MARK: - Goal Toggle

struct GoalToggle: View {
    let title: String
    let icon: String
    let isSelected: Bool
    let onToggle: () -> Void

    var body: some View {
        Button(action: onToggle) {
            HStack {
                Image(systemName: icon)
                    .font(.system(size: IconSize.md))
                    .foregroundColor(isSelected ? .primaryColor : .textSecondary)

                Text(title)
                    .font(.titleMedium)
                    .foregroundColor(.textPrimary)

                Spacer()

                if isSelected {
                    Image(systemName: "checkmark.circle.fill")
                        .foregroundColor(.primaryColor)
                }
            }
            .padding(Spacing.md)
            .background(
                isSelected
                    ? Color.primaryColor.opacity(0.1)
                    : Color.backgroundSecondary
            )
            .cornerRadius(CornerRadius.md)
        }
    }
}

// MARK: - Preview

#Preview {
    GoalsView(viewModel: OnboardingViewModel())
}
