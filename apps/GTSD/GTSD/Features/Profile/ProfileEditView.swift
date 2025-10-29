//
//  ProfileEditView.swift
//  GTSD
//
//  Created by Claude on 2025-10-27.
//

import SwiftUI
import PhotosUI

struct ProfileEditView: View {
    @StateObject private var viewModel = ProfileEditViewModel()
    @Environment(\.dismiss) private var dismiss
    @State private var showPlanChanges = false

    var body: some View {
        NavigationStack {
            Group {
                if viewModel.isLoading {
                    LoadingView(message: "Loading profile...")
                } else {
                    editForm
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
                            let success = await viewModel.saveChanges()
                            if success {
                                // Check if plan has significant changes
                                if viewModel.planHasSignificantChanges {
                                    showPlanChanges = true
                                } else {
                                    dismiss()
                                }
                            }
                        }
                    }
                    .disabled(!viewModel.isValid || viewModel.isSaving)
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
            .sheet(isPresented: $showPlanChanges) {
                PlanChangeSummaryView(planData: viewModel.currentPlanData)
                    .onDisappear {
                        // Dismiss profile edit view after showing plan changes
                        dismiss()
                    }
            }
        }
    }

    private var editForm: some View {
        Form {
            // Profile Photo Section
            Section {
                VStack(spacing: Spacing.md) {
                    if let image = viewModel.profileImage {
                        Image(uiImage: image)
                            .resizable()
                            .aspectRatio(contentMode: .fill)
                            .frame(width: 100, height: 100)
                            .clipShape(Circle())
                    } else {
                        ZStack {
                            Circle()
                                .fill(Color.primaryColor.gradient)
                                .frame(width: 100, height: 100)

                            Image(systemName: "person.fill")
                                .font(.system(size: 40))
                                .foregroundColor(.white)
                        }
                    }

                    PhotosPicker(
                        selection: $viewModel.selectedPhoto,
                        matching: .images
                    ) {
                        HStack {
                            Image(systemName: "camera.fill")
                                .font(.system(size: IconSize.sm))
                            Text("Change Photo")
                                .font(.titleMedium)
                        }
                        .foregroundColor(.primaryColor)
                    }
                    .onChange(of: viewModel.selectedPhoto) { _, _ in
                        _Concurrency.Task {
                            await viewModel.loadSelectedPhoto()
                        }
                    }
                    .accessibilityLabel("Change profile photo")
                    .accessibilityHint("Double tap to select a new profile photo from your library")
                    .minimumTouchTarget()
                }
                .frame(maxWidth: .infinity)
                .padding(.vertical, Spacing.md)
            }

            // Basic Info Section
            Section("Basic Information") {
                VStack(alignment: .leading, spacing: Spacing.xs) {
                    TextField("Full Name", text: $viewModel.name)
                        .textContentType(.name)
                        .autocapitalization(.words)
                        .accessibilityLabel("Full name")
                        .accessibilityHint("Enter your full name")

                    if let error = viewModel.nameError, !viewModel.name.isEmpty {
                        Text(error)
                            .font(.labelSmall)
                            .foregroundColor(.errorColor)
                            .accessibilityLabel("Name validation error: \(error)")
                    }
                }

                VStack(alignment: .leading, spacing: Spacing.xs) {
                    TextField("Email", text: $viewModel.email)
                        .textContentType(.emailAddress)
                        .keyboardType(.emailAddress)
                        .autocapitalization(.none)
                        .accessibilityLabel("Email address")
                        .accessibilityHint("Enter your email address")

                    if let error = viewModel.emailError, !viewModel.email.isEmpty {
                        Text(error)
                            .font(.labelSmall)
                            .foregroundColor(.errorColor)
                            .accessibilityLabel("Email validation error: \(error)")
                    }
                }
            }

            // Health Metrics Section (Read-Only)
            Section {
                VStack(alignment: .leading, spacing: Spacing.sm) {
                    HStack {
                        Image(systemName: "info.circle")
                            .foregroundColor(.secondaryColor)
                        Text("Health Metrics")
                            .font(.titleSmall)
                            .fontWeight(.semibold)
                    }

                    Text("Health metrics (weight, height, activity level) can only be updated during initial onboarding. To make changes, please contact support or re-complete onboarding.")
                        .font(.bodySmall)
                        .foregroundColor(.textSecondary)
                        .padding(.top, Spacing.xs)

                    // Show current values as read-only
                    if !viewModel.currentWeight.isEmpty || !viewModel.targetWeight.isEmpty {
                        VStack(alignment: .leading, spacing: Spacing.xs) {
                            if !viewModel.currentWeight.isEmpty {
                                HStack {
                                    Text("Current Weight:")
                                        .foregroundColor(.textSecondary)
                                    Spacer()
                                    Text("\(viewModel.currentWeight) kg")
                                        .fontWeight(.medium)
                                }
                            }
                            if !viewModel.targetWeight.isEmpty {
                                HStack {
                                    Text("Target Weight:")
                                        .foregroundColor(.textSecondary)
                                    Spacer()
                                    Text("\(viewModel.targetWeight) kg")
                                        .fontWeight(.medium)
                                }
                            }
                        }
                        .padding(.top, Spacing.sm)
                    }
                }
            }

            // Dietary Preferences Section
            Section("Dietary Preferences") {
                TextField("None", text: $viewModel.dietaryPreferences)
                    .accessibilityLabel("Dietary preferences")
                    .accessibilityHint("Enter any dietary preferences or restrictions")

                HStack {
                    TextField("Meals per Day", text: $viewModel.mealsPerDay)
                        .keyboardType(.numberPad)
                        .accessibilityLabel("Number of meals per day")
                        .accessibilityHint("Enter the number of meals you prefer each day")

                    Text("meals")
                        .foregroundColor(.textSecondary)
                }
            }

            // Allergies Section
            Section("Allergies") {
                TextField("None", text: $viewModel.allergies)
                    .accessibilityLabel("Food allergies")
                    .accessibilityHint("Enter any food allergies or sensitivities")
            }

            // Save Button Section
            Section {
                GTSDButton(
                    viewModel.isRecomputingPlan ? "Updating Plan..." : "Save Changes",
                    style: .primary,
                    isLoading: viewModel.isSaving,
                    isDisabled: !viewModel.isValid || !viewModel.hasChanges
                ) {
                    _Concurrency.Task {
                        let success = await viewModel.saveChanges()
                        if success {
                            // Check if plan has significant changes
                            if viewModel.planHasSignificantChanges {
                                showPlanChanges = true
                            } else {
                                dismiss()
                            }
                        }
                    }
                }
                .listRowInsets(EdgeInsets())
                .listRowBackground(Color.clear)
            }
        }
    }
}

// MARK: - Placeholder Modifier

extension View {
    func placeholder<Content: View>(
        when shouldShow: Bool,
        alignment: Alignment = .leading,
        @ViewBuilder placeholder: () -> Content
    ) -> some View {
        ZStack(alignment: alignment) {
            placeholder().opacity(shouldShow ? 1 : 0)
            self
        }
    }
}

// MARK: - Preview

#Preview {
    ProfileEditView()
}
