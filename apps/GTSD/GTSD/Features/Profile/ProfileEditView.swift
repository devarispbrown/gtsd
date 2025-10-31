//
//  ProfileEditView.swift
//  GTSD
//
//  Created by Claude on 2025-10-30.
//  Comprehensive profile editing with 7 sections, validation, and optimistic UI
//

import SwiftUI
import PhotosUI

struct ProfileEditView: View {
    @StateObject private var viewModel: ProfileEditViewModel
    @Environment(\.dismiss) private var dismiss

    init(
        apiClient: any APIClientProtocol = ServiceContainer.shared.apiClient,
        authService: any AuthenticationServiceProtocol = ServiceContainer.shared.authService
    ) {
        _viewModel = StateObject(wrappedValue: ProfileEditViewModel(
            apiClient: apiClient,
            authService: authService
        ))
    }

    var body: some View {
        NavigationStack {
            ZStack {
                Group {
                    if viewModel.isLoading {
                        LoadingView(message: "Loading profile...")
                    } else {
                        profileForm
                    }
                }
                .navigationTitle("Edit Profile")
                .navigationBarTitleDisplayMode(.inline)
                .toolbar {
                    ToolbarItem(placement: .navigationBarLeading) {
                        Button("Cancel") {
                            dismiss()
                        }
                        .accessibilityLabel("Cancel editing")
                        .accessibilityHint("Double tap to discard changes and return")
                    }

                    ToolbarItem(placement: .navigationBarTrailing) {
                        Button("Save") {
                            _Concurrency.Task {
                                let success = await viewModel.saveProfile()
                                if success {
                                    // Wait for toast to show, then dismiss
                                    try? await _Concurrency.Task.sleep(for: .seconds(1))
                                    dismiss()
                                }
                            }
                        }
                        .disabled(!viewModel.isValid || !viewModel.hasChanges || viewModel.isSaving)
                        .accessibilityLabel("Save profile changes")
                        .accessibilityHint(viewModel.isValid ? "Double tap to save your profile updates" : "Button disabled. Complete all required fields to save")
                    }
                }
                .task {
                    await viewModel.loadProfile()
                }
                .alert("Error", isPresented: .constant(viewModel.errorMessage != nil)) {
                    Button("OK") {
                        viewModel.errorMessage = nil
                    }
                } message: {
                    Text(viewModel.errorMessage ?? "")
                }

                // Success toast overlay
                SuccessToast(
                    message: "Profile updated successfully",
                    planWillUpdate: viewModel.toastPlanWillUpdate,
                    targetChanges: viewModel.toastTargetChanges,
                    isShowing: $viewModel.showSuccessToast
                )

                // Offline notice
                if viewModel.isOffline {
                    VStack {
                        GTSDCard {
                            HStack(spacing: Spacing.sm) {
                                Image(systemName: "wifi.slash")
                                    .foregroundColor(.warningColor)
                                Text("You're offline. Changes will sync when you reconnect.")
                                    .font(.bodySmall)
                                    .foregroundColor(.textSecondary)
                            }
                        }
                        .padding()
                        Spacer()
                    }
                }
            }
        }
    }

    // MARK: - Profile Form

    private var profileForm: some View {
        Form {
            // Section 1: About You (Demographics)
            Section {
                VStack(alignment: .leading, spacing: Spacing.md) {
                    // Section header with badge
                    HStack {
                        VStack(alignment: .leading, spacing: Spacing.xs) {
                            Text("About You")
                                .font(.titleMedium)
                                .fontWeight(.semibold)
                            Text("Basic information that affects your metabolic calculations")
                                .font(.bodySmall)
                                .foregroundColor(.textSecondary)
                        }
                        Spacer()
                        Text("🔄")
                            .font(.system(size: 20))
                            .accessibilityLabel("Affects your plan")
                    }

                    // Date of Birth
                    VStack(alignment: .leading, spacing: Spacing.xs) {
                        DatePicker(
                            "Date of Birth",
                            selection: $viewModel.dateOfBirth,
                            in: ...Date(),
                            displayedComponents: .date
                        )
                        .accessibilityLabel("Date of birth")
                        .accessibilityHint("Select your date of birth. Used for metabolic calculations.")

                        Text("Your age affects calorie calculations. We use this to estimate your basal metabolic rate (BMR).")
                            .font(.labelSmall)
                            .foregroundColor(.textSecondary)

                        if let error = viewModel.ageError {
                            Text(error)
                                .font(.labelSmall)
                                .foregroundColor(.errorColor)
                        }
                    }

                    // Gender
                    VStack(alignment: .leading, spacing: Spacing.xs) {
                        Picker("Gender", selection: $viewModel.gender) {
                            ForEach(Gender.allCases, id: \.self) { gender in
                                Text(gender.displayName).tag(gender)
                            }
                        }
                        .accessibilityLabel("Gender")
                        .accessibilityHint("Select your gender. Used for metabolic calculations.")

                        Text("Used for accurate metabolic calculations. We support all gender identities.")
                            .font(.labelSmall)
                            .foregroundColor(.textSecondary)
                    }

                    // Height
                    VStack(alignment: .leading, spacing: Spacing.xs) {
                        HStack {
                            TextField("Height", text: $viewModel.heightCm)
                                .keyboardType(.decimalPad)
                                .accessibilityLabel("Height in centimeters")
                                .accessibilityHint("Enter your height. This affects BMI and calorie calculations.")

                            Text("cm")
                                .foregroundColor(.textSecondary)
                        }

                        Text("Enter your height. This affects BMI and calorie calculations.")
                            .font(.labelSmall)
                            .foregroundColor(.textSecondary)

                        if let error = viewModel.heightError {
                            Text(error)
                                .font(.labelSmall)
                                .foregroundColor(.errorColor)
                        }
                    }
                }
            }
            .listRowBackground(Color.backgroundSecondary.opacity(0.5))

            // Section 2: Current Status (Current Weight)
            Section {
                VStack(alignment: .leading, spacing: Spacing.md) {
                    HStack {
                        VStack(alignment: .leading, spacing: Spacing.xs) {
                            Text("Current Status")
                                .font(.titleMedium)
                                .fontWeight(.semibold)
                            Text("Track your current weight to monitor progress")
                                .font(.bodySmall)
                                .foregroundColor(.textSecondary)
                        }
                        Spacer()
                        Text("🔄")
                            .font(.system(size: 20))
                            .accessibilityLabel("Affects your plan")
                    }

                    VStack(alignment: .leading, spacing: Spacing.xs) {
                        HStack {
                            TextField("Current Weight", text: $viewModel.currentWeightKg)
                                .keyboardType(.decimalPad)
                                .font(.titleLarge)
                                .fontWeight(.semibold)
                                .accessibilityLabel("Current weight in kilograms")
                                .accessibilityHint("Enter your current weight for progress tracking")

                            Text("kg")
                                .font(.titleMedium)
                                .foregroundColor(.textSecondary)
                        }

                        Text("Update this regularly to track your progress. Changes >1kg may adjust your targets.")
                            .font(.labelSmall)
                            .foregroundColor(.textSecondary)

                        if let error = viewModel.currentWeightError {
                            Text(error)
                                .font(.labelSmall)
                                .foregroundColor(.errorColor)
                        }
                    }
                }
            }

            // Section 3: Your Goal
            Section {
                VStack(alignment: .leading, spacing: Spacing.md) {
                    HStack {
                        VStack(alignment: .leading, spacing: Spacing.xs) {
                            Text("Your Goal")
                                .font(.titleMedium)
                                .fontWeight(.semibold)
                            Text("Define what you want to achieve and when")
                                .font(.bodySmall)
                                .foregroundColor(.textSecondary)
                        }
                        Spacer()
                        Text("🔄")
                            .font(.system(size: 20))
                            .accessibilityLabel("Affects your plan")
                    }

                    // Primary Goal
                    VStack(alignment: .leading, spacing: Spacing.xs) {
                        Picker("Primary Goal", selection: $viewModel.primaryGoal) {
                            ForEach(PrimaryGoal.allCases, id: \.self) { goal in
                                Text(goal.displayName).tag(goal)
                            }
                        }
                        .accessibilityLabel("Primary fitness goal")

                        Text("Your goal determines your calorie surplus or deficit.")
                            .font(.labelSmall)
                            .foregroundColor(.textSecondary)
                    }

                    // Target Weight
                    VStack(alignment: .leading, spacing: Spacing.xs) {
                        HStack {
                            TextField("Target Weight", text: $viewModel.targetWeightKg)
                                .keyboardType(.decimalPad)
                                .accessibilityLabel("Target weight in kilograms")

                            Text("kg")
                                .foregroundColor(.textSecondary)
                        }

                        Text("Your desired weight. This affects your daily calorie target.")
                            .font(.labelSmall)
                            .foregroundColor(.textSecondary)

                        if let error = viewModel.targetWeightError {
                            Text(error)
                                .font(.labelSmall)
                                .foregroundColor(.errorColor)
                        }
                    }

                    // Target Date
                    VStack(alignment: .leading, spacing: Spacing.xs) {
                        DatePicker(
                            "Target Date",
                            selection: $viewModel.targetDate,
                            in: Date()...,
                            displayedComponents: .date
                        )
                        .accessibilityLabel("Target achievement date")

                        Text("When you want to reach your goal. This affects the pace of your plan.")
                            .font(.labelSmall)
                            .foregroundColor(.textSecondary)
                    }
                }
            }

            // Section 4: Activity & Lifestyle
            Section {
                VStack(alignment: .leading, spacing: Spacing.md) {
                    HStack {
                        VStack(alignment: .leading, spacing: Spacing.xs) {
                            Text("Activity & Lifestyle")
                                .font(.titleMedium)
                                .fontWeight(.semibold)
                            Text("How active are you on a typical day?")
                                .font(.bodySmall)
                                .foregroundColor(.textSecondary)
                        }
                        Spacer()
                        Text("🔄")
                            .font(.system(size: 20))
                            .accessibilityLabel("Affects your plan")
                    }

                    VStack(alignment: .leading, spacing: Spacing.xs) {
                        Picker("Activity Level", selection: $viewModel.activityLevel) {
                            ForEach(ActivityLevel.allCases, id: \.self) { level in
                                VStack(alignment: .leading) {
                                    Text(level.displayName)
                                        .font(.bodyMedium)
                                    Text(level.description)
                                        .font(.labelSmall)
                                        .foregroundColor(.textSecondary)
                                }
                                .tag(level)
                            }
                        }
                        .accessibilityLabel("Activity level")

                        Text("Your activity level affects your Total Daily Energy Expenditure (TDEE).")
                            .font(.labelSmall)
                            .foregroundColor(.textSecondary)
                    }
                }
            }

            // Section 5: Diet & Preferences
            Section {
                VStack(alignment: .leading, spacing: Spacing.md) {
                    VStack(alignment: .leading, spacing: Spacing.xs) {
                        Text("Diet & Preferences")
                            .font(.titleMedium)
                            .fontWeight(.semibold)
                        Text("Dietary restrictions and meal preferences")
                            .font(.bodySmall)
                            .foregroundColor(.textSecondary)
                    }

                    // Dietary Preferences
                    VStack(alignment: .leading, spacing: Spacing.xs) {
                        Text("Dietary Preferences")
                            .font(.bodyMedium)
                            .fontWeight(.medium)

                        TagInputField(
                            placeholder: "Type and press Enter (e.g., Vegetarian, Low Carb)",
                            tags: $viewModel.dietaryPreferences
                        )

                        Text("Add up to 10 dietary preferences. These help personalize your meal suggestions.")
                            .font(.labelSmall)
                            .foregroundColor(.textSecondary)

                        if viewModel.dietaryPreferences.count > 10 {
                            Text("Maximum 10 dietary preferences allowed")
                                .font(.labelSmall)
                                .foregroundColor(.errorColor)
                        }
                    }

                    // Allergies
                    VStack(alignment: .leading, spacing: Spacing.xs) {
                        Text("Allergies & Restrictions")
                            .font(.bodyMedium)
                            .fontWeight(.medium)

                        TagInputField(
                            placeholder: "Type and press Enter (e.g., Nuts, Dairy, Soy)",
                            tags: $viewModel.allergies
                        )

                        Text("Add up to 20 allergies or food restrictions. We'll exclude these from your meal plans.")
                            .font(.labelSmall)
                            .foregroundColor(.textSecondary)

                        if viewModel.allergies.count > 20 {
                            Text("Maximum 20 allergies allowed")
                                .font(.labelSmall)
                                .foregroundColor(.errorColor)
                        }
                    }

                    // Meals Per Day
                    VStack(alignment: .leading, spacing: Spacing.xs) {
                        Stepper(
                            "Meals Per Day: \(viewModel.mealsPerDay)",
                            value: $viewModel.mealsPerDay,
                            in: 1...10
                        )
                        .accessibilityLabel("Meals per day: \(viewModel.mealsPerDay)")

                        Text("How many meals you prefer to eat daily. This helps structure your meal plans.")
                            .font(.labelSmall)
                            .foregroundColor(.textSecondary)

                        if let error = viewModel.mealsPerDayError {
                            Text(error)
                                .font(.labelSmall)
                                .foregroundColor(.errorColor)
                        }
                    }
                }
            }

            // Section 6: Current Targets (Read-Only)
            if let profile = viewModel.originalProfile {
                Section {
                    VStack(alignment: .leading, spacing: Spacing.md) {
                        VStack(alignment: .leading, spacing: Spacing.xs) {
                            Text("Current Targets")
                                .font(.titleMedium)
                                .fontWeight(.semibold)
                            Text("Your daily nutrition targets (automatically calculated)")
                                .font(.bodySmall)
                                .foregroundColor(.textSecondary)
                        }

                        if let metrics = profile.calculatedMetrics {
                            VStack(spacing: Spacing.sm) {
                                targetRow(label: "BMR (Basal Metabolic Rate)", value: "\(metrics.bmr) cal", info: "Calories burned at rest")
                                Divider()
                                targetRow(label: "TDEE (Total Daily Energy)", value: "\(metrics.tdee) cal", info: "Total calories burned daily")
                                Divider()
                                targetRow(label: "Daily Calorie Target", value: "\(metrics.targetCalories) cal", info: "Your personalized calorie goal")
                                Divider()
                                targetRow(label: "Daily Protein Target", value: "\(metrics.targetProtein)g", info: "Recommended protein intake")
                            }
                        }
                    }
                }
                .listRowBackground(Color.backgroundSecondary.opacity(0.3))
            }

            // Section 7: Validation Errors Summary
            if !viewModel.validationErrors.isEmpty {
                Section {
                    VStack(alignment: .leading, spacing: Spacing.sm) {
                        HStack {
                            Image(systemName: "exclamationmark.triangle.fill")
                                .foregroundColor(.errorColor)
                            Text("Please fix the following errors:")
                                .font(.bodyMedium)
                                .fontWeight(.medium)
                                .foregroundColor(.errorColor)
                        }

                        ForEach(viewModel.validationErrors) { error in
                            Text("• \(error.message)")
                                .font(.bodySmall)
                                .foregroundColor(.textSecondary)
                        }
                    }
                }
                .listRowBackground(Color.errorColor.opacity(0.1))
            }
        }
        .scrollContentBackground(.hidden)
        .background(Color.backgroundPrimary)
    }

    // MARK: - Helper Views

    private func targetRow(label: String, value: String, info: String) -> some View {
        HStack(alignment: .top) {
            VStack(alignment: .leading, spacing: Spacing.xxs) {
                Text(label)
                    .font(.bodySmall)
                    .foregroundColor(.textSecondary)
                Text(info)
                    .font(.labelSmall)
                    .foregroundColor(.textTertiary)
            }

            Spacer()

            Text(value)
                .font(.bodyMedium)
                .fontWeight(.semibold)
                .foregroundColor(.textPrimary)
        }
        .accessibilityElement(children: .combine)
        .accessibilityLabel("\(label): \(value). \(info)")
    }
}

// MARK: - ProfileResponse Extension

extension ProfileResponse {
    struct CalculatedMetrics {
        let bmr: Int
        let tdee: Int
        let targetCalories: Int
        let targetProtein: Int
    }

    var calculatedMetrics: CalculatedMetrics? {
        // This would ideally come from the API response
        // For now, return nil until backend provides these values
        return nil
    }
}

// MARK: - Preview

#Preview {
    ProfileEditView()
}
