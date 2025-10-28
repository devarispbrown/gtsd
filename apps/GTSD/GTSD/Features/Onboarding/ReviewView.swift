//
//  ReviewView.swift
//  GTSD
//
//  Created by Claude on 2025-10-26.
//

import SwiftUI

struct ReviewView: View {
    @ObservedObject var viewModel: OnboardingViewModel

    var body: some View {
        VStack(spacing: Spacing.xl) {
            // Header
            VStack(spacing: Spacing.sm) {
                Text("Review Your Profile")
                    .font(.headlineLarge)
                    .foregroundColor(.textPrimary)

                Text("Make sure everything looks good")
                    .font(.bodyMedium)
                    .foregroundColor(.textSecondary)
                    .multilineTextAlignment(.center)
            }
            .padding(.top, Spacing.xl)

            ScrollView {
                VStack(spacing: Spacing.lg) {
                    // Health Metrics Card
                    GTSDCard {
                        VStack(alignment: .leading, spacing: Spacing.md) {
                            HStack {
                                Image(systemName: "heart.text.square.fill")
                                    .foregroundColor(.primaryColor)
                                Text("Health Metrics")
                                    .font(.titleMedium)
                                    .fontWeight(.semibold)
                            }

                            Divider()

                            ReviewRow(
                                icon: "scalemass",
                                title: "Current Weight",
                                value: String(format: "%.1f lbs", viewModel.onboardingData.currentWeight ?? 0)
                            )

                            ReviewRow(
                                icon: "ruler",
                                title: "Height",
                                value: String(format: "%.1f in", viewModel.onboardingData.height ?? 0)
                            )

                            if let dateOfBirth = viewModel.onboardingData.dateOfBirth {
                                let age = Calendar.current.dateComponents([.year], from: dateOfBirth, to: Date()).year ?? 0
                                ReviewRow(
                                    icon: "calendar",
                                    title: "Age",
                                    value: "\(age) years"
                                )
                            }

                            ReviewRow(
                                icon: "person",
                                title: "Gender",
                                value: viewModel.onboardingData.gender?.displayName ?? "Not set"
                            )
                        }
                    }
                    .padding(.horizontal, Spacing.xl)

                    // Goals Card
                    GTSDCard {
                        VStack(alignment: .leading, spacing: Spacing.md) {
                            HStack {
                                Image(systemName: "target")
                                    .foregroundColor(.primaryColor)
                                Text("Goals")
                                    .font(.titleMedium)
                                    .fontWeight(.semibold)
                            }

                            Divider()

                            ReviewRow(
                                icon: "target",
                                title: "Target Weight",
                                value: String(format: "%.1f lbs", viewModel.onboardingData.targetWeight ?? 0)
                            )

                            if let targetDate = viewModel.onboardingData.targetDate {
                                ReviewRow(
                                    icon: "calendar",
                                    title: "Target Date",
                                    value: targetDate.formatted(date: .abbreviated, time: .omitted)
                                )
                            }

                            if let primaryGoal = viewModel.onboardingData.primaryGoal {
                                ReviewRow(
                                    icon: "star.fill",
                                    title: "Primary Goal",
                                    value: primaryGoal.displayName
                                )
                            }

                            ReviewRow(
                                icon: "figure.run",
                                title: "Activity Level",
                                value: viewModel.onboardingData.activityLevel?.displayName ?? "Not set"
                            )
                        }
                    }
                    .padding(.horizontal, Spacing.xl)

                    // BMI Calculation (if available)
                    if let weight = viewModel.onboardingData.currentWeight,
                       let height = viewModel.onboardingData.height {
                        let bmi = calculateBMI(weight: weight, height: height)
                        GTSDCard {
                            VStack(spacing: Spacing.sm) {
                                Text("Your BMI")
                                    .font(.labelMedium)
                                    .foregroundColor(.textSecondary)

                                Text(String(format: "%.1f", bmi))
                                    .font(.displaySmall)
                                    .foregroundColor(.primaryColor)

                                Text(bmiCategory(bmi))
                                    .font(.bodyMedium)
                                    .foregroundColor(.textSecondary)
                            }
                        }
                        .padding(.horizontal, Spacing.xl)
                    }
                }
            }

            Spacer()
        }
    }

    private func calculateBMI(weight: Double, height: Double) -> Double {
        // BMI = (weight in lbs * 703) / (height in inches)^2
        return (weight * 703) / (height * height)
    }

    private func bmiCategory(_ bmi: Double) -> String {
        switch bmi {
        case ..<18.5:
            return "Underweight"
        case 18.5..<25:
            return "Normal weight"
        case 25..<30:
            return "Overweight"
        default:
            return "Obese"
        }
    }
}

// MARK: - Review Row

struct ReviewRow: View {
    let icon: String
    let title: String
    let value: String

    var body: some View {
        HStack {
            Image(systemName: icon)
                .font(.system(size: IconSize.sm))
                .foregroundColor(.textSecondary)
                .frame(width: 24)

            Text(title)
                .font(.bodyMedium)
                .foregroundColor(.textSecondary)

            Spacer()

            Text(value)
                .font(.bodyMedium)
                .fontWeight(.medium)
                .foregroundColor(.textPrimary)
        }
    }
}

// MARK: - Preview

#Preview {
    @Previewable @StateObject var viewModel: OnboardingViewModel = {
        let vm = OnboardingViewModel()
        vm.onboardingData.currentWeight = 180
        vm.onboardingData.height = 70
        vm.onboardingData.dateOfBirth = Calendar.current.date(byAdding: .year, value: -30, to: Date())
        vm.onboardingData.gender = .male
        vm.onboardingData.targetWeight = 165
        vm.onboardingData.targetDate = Calendar.current.date(byAdding: .month, value: 6, to: Date())
        vm.onboardingData.primaryGoal = .loseWeight
        vm.onboardingData.activityLevel = .moderatelyActive
        return vm
    }()

    ReviewView(viewModel: viewModel)
}
