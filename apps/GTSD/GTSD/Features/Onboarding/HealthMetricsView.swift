//
//  HealthMetricsView.swift
//  GTSD
//
//  Created by Claude on 2025-10-26.
//

import SwiftUI

struct HealthMetricsView: View {
    @ObservedObject var viewModel: OnboardingViewModel

    @State private var weightText: String = ""
    @State private var heightText: String = ""
    @State private var ageText: String = ""
    @State private var customGenderText: String = ""

    var body: some View {
        VStack(spacing: Spacing.xl) {
            // Header
            VStack(spacing: Spacing.sm) {
                Text("Your Health Profile")
                    .font(.headlineLarge)
                    .foregroundColor(.textPrimary)

                Text("Help us personalize your experience")
                    .font(.bodyMedium)
                    .foregroundColor(.textSecondary)
                    .multilineTextAlignment(.center)
            }
            .padding(.top, Spacing.xl)

            ScrollView {
                VStack(spacing: Spacing.lg) {
                    // Weight
                    VStack(alignment: .leading, spacing: Spacing.xs) {
                        Text("Current Weight (lbs)")
                            .font(.labelMedium)
                            .foregroundColor(.textSecondary)

                        HStack(spacing: Spacing.sm) {
                            Image(systemName: "scalemass")
                                .font(.system(size: IconSize.sm))
                                .foregroundColor(.textSecondary)

                            TextField("Enter weight", text: $weightText)
                                .keyboardType(.decimalPad)
                                .onChange(of: weightText) { _, newValue in
                                    viewModel.onboardingData.currentWeight = Double(newValue)
                                }
                        }
                        .padding(Spacing.md)
                        .background(Color.backgroundSecondary)
                        .cornerRadius(CornerRadius.md)
                    }

                    // Height
                    VStack(alignment: .leading, spacing: Spacing.xs) {
                        Text("Height (inches)")
                            .font(.labelMedium)
                            .foregroundColor(.textSecondary)

                        HStack(spacing: Spacing.sm) {
                            Image(systemName: "ruler")
                                .font(.system(size: IconSize.sm))
                                .foregroundColor(.textSecondary)

                            TextField("Enter height", text: $heightText)
                                .keyboardType(.decimalPad)
                                .onChange(of: heightText) { _, newValue in
                                    viewModel.onboardingData.height = Double(newValue)
                                }
                        }
                        .padding(Spacing.md)
                        .background(Color.backgroundSecondary)
                        .cornerRadius(CornerRadius.md)
                    }

                    // Note: Age/Date of Birth is collected in AccountBasicsView

                    // Gender
                    VStack(alignment: .leading, spacing: Spacing.xs) {
                        Text("Gender")
                            .font(.labelMedium)
                            .foregroundColor(.textSecondary)

                        VStack(spacing: Spacing.sm) {
                            ForEach(OnboardingData.Gender.allCases, id: \.self) { gender in
                                Button(action: {
                                    viewModel.onboardingData.gender = gender
                                    if gender != .other {
                                        viewModel.onboardingData.customGender = nil
                                        customGenderText = ""
                                    }
                                }) {
                                    HStack {
                                        Text(gender.displayName)
                                            .font(.titleMedium)
                                            .foregroundColor(.textPrimary)

                                        Spacer()

                                        if viewModel.onboardingData.gender == gender {
                                            Image(systemName: "checkmark.circle.fill")
                                                .foregroundColor(.primaryColor)
                                        }
                                    }
                                    .padding(Spacing.md)
                                    .background(
                                        viewModel.onboardingData.gender == gender
                                            ? Color.primaryColor.opacity(0.1)
                                            : Color.backgroundSecondary
                                    )
                                    .cornerRadius(CornerRadius.md)
                                }
                            }

                            // Custom gender text field (shown when "other" is selected)
                            if viewModel.onboardingData.gender == .other {
                                HStack(spacing: Spacing.sm) {
                                    Image(systemName: "text.cursor")
                                        .font(.system(size: IconSize.sm))
                                        .foregroundColor(.textSecondary)

                                    TextField("Enter your gender identity", text: $customGenderText)
                                        .textContentType(.none)
                                        .autocapitalization(.words)
                                        .onChange(of: customGenderText) { _, newValue in
                                            viewModel.onboardingData.customGender = newValue.isEmpty ? nil : newValue
                                        }
                                }
                                .padding(Spacing.md)
                                .background(Color.backgroundSecondary)
                                .cornerRadius(CornerRadius.md)
                                .transition(.move(edge: .top).combined(with: .opacity))
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

// MARK: - Preview

#Preview {
    HealthMetricsView(viewModel: OnboardingViewModel())
}
