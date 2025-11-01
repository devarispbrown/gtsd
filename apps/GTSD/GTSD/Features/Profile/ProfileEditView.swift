//
//  ProfileEditView.swift
//  GTSD
//
//  Created by Claude on 2025-10-30.
//  Streamlined profile editing with clean UI, validation, and optimistic updates
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
            // Section 1: Basic Info
            Section("Basic Info") {
                DatePicker(
                    "Date of Birth",
                    selection: $viewModel.dateOfBirth,
                    in: ...Date(),
                    displayedComponents: .date
                )
                .accessibilityLabel("Date of birth")
                .accessibilityHint("Select your date of birth. Used for metabolic calculations.")

                if let error = viewModel.ageError {
                    Text(error)
                        .font(.labelSmall)
                        .foregroundColor(.errorColor)
                }

                Picker("Gender", selection: $viewModel.gender) {
                    ForEach(Gender.allCases, id: \.self) { gender in
                        Text(gender.displayName).tag(gender)
                    }
                }
                .accessibilityLabel("Gender")
                .accessibilityHint("Select your gender. Used for metabolic calculations.")

                HStack {
                    TextField("Height", text: $viewModel.heightCm)
                        .keyboardType(.decimalPad)
                        .accessibilityLabel("Height in centimeters")
                        .accessibilityHint("Enter your height. This affects BMI and calorie calculations.")

                    Text("cm")
                        .foregroundColor(.textSecondary)
                }

                if let error = viewModel.heightError {
                    Text(error)
                        .font(.labelSmall)
                        .foregroundColor(.errorColor)
                }
            }

            // Section 2: Health Metrics
            Section("Health Metrics") {
                HStack {
                    TextField("Current Weight", text: $viewModel.currentWeightKg)
                        .keyboardType(.decimalPad)
                        .accessibilityLabel("Current weight in kilograms")
                        .accessibilityHint("Enter your current weight for progress tracking")

                    Text("kg")
                        .foregroundColor(.textSecondary)
                }

                if let error = viewModel.currentWeightError {
                    Text(error)
                        .font(.labelSmall)
                        .foregroundColor(.errorColor)
                }

                HStack {
                    TextField("Target Weight", text: $viewModel.targetWeightKg)
                        .keyboardType(.decimalPad)
                        .accessibilityLabel("Target weight in kilograms")

                    Text("kg")
                        .foregroundColor(.textSecondary)
                }

                if let error = viewModel.targetWeightError {
                    Text(error)
                        .font(.labelSmall)
                        .foregroundColor(.errorColor)
                }

                DatePicker(
                    "Target Date",
                    selection: $viewModel.targetDate,
                    in: Date()...,
                    displayedComponents: .date
                )
                .accessibilityLabel("Target achievement date")
            }

            // Section 3: Activity & Goals
            Section("Activity & Goals") {
                Picker("Primary Goal", selection: $viewModel.primaryGoal) {
                    ForEach(PrimaryGoal.allCases, id: \.self) { goal in
                        Text(goal.displayName).tag(goal)
                    }
                }
                .accessibilityLabel("Primary fitness goal")

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
            }

            // Section 4: Dietary Preferences
            Section("Dietary Preferences") {
                VStack(alignment: .leading, spacing: Spacing.xs) {
                    Text("Preferences")
                        .font(.bodyMedium)
                        .fontWeight(.medium)

                    TagInputField(
                        placeholder: "Type and press Enter (e.g., Vegetarian, Low Carb)",
                        tags: $viewModel.dietaryPreferences
                    )

                    if viewModel.dietaryPreferences.count > 10 {
                        Text("Maximum 10 dietary preferences allowed")
                            .font(.labelSmall)
                            .foregroundColor(.errorColor)
                    }
                }

                VStack(alignment: .leading, spacing: Spacing.xs) {
                    Text("Allergies & Restrictions")
                        .font(.bodyMedium)
                        .fontWeight(.medium)

                    TagInputField(
                        placeholder: "Type and press Enter (e.g., Nuts, Dairy, Soy)",
                        tags: $viewModel.allergies
                    )

                    if viewModel.allergies.count > 20 {
                        Text("Maximum 20 allergies allowed")
                            .font(.labelSmall)
                            .foregroundColor(.errorColor)
                    }
                }

                Stepper(
                    "Meals Per Day: \(viewModel.mealsPerDay)",
                    value: $viewModel.mealsPerDay,
                    in: 1...10
                )
                .accessibilityLabel("Meals per day: \(viewModel.mealsPerDay)")

                if let error = viewModel.mealsPerDayError {
                    Text(error)
                        .font(.labelSmall)
                        .foregroundColor(.errorColor)
                }
            }

            // Section 5: Current Targets (Read-Only)
            if let profile = viewModel.originalProfile {
                Section("Current Targets") {
                    if let metrics = profile.calculatedMetrics {
                        targetRow(label: "BMR (Basal Metabolic Rate)", value: "\(metrics.bmr) cal", info: "Calories burned at rest")
                        targetRow(label: "TDEE (Total Daily Energy)", value: "\(metrics.tdee) cal", info: "Total calories burned daily")
                        targetRow(label: "Daily Calorie Target", value: "\(metrics.targetCalories) cal", info: "Your personalized calorie goal")
                        targetRow(label: "Daily Protein Target", value: "\(metrics.targetProtein)g", info: "Recommended protein intake")
                    }
                }
            }

            // Section 6: Validation Errors Summary
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
            VStack(alignment: .leading, spacing: Spacing.xs) {
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
