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
                }

                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("Save") {
                        _Concurrency.Task {
                            let success = await viewModel.saveChanges()
                            if success {
                                dismiss()
                            }
                        }
                    }
                    .disabled(!viewModel.isValid || viewModel.isSaving)
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

                    if let error = viewModel.nameError, !viewModel.name.isEmpty {
                        Text(error)
                            .font(.labelSmall)
                            .foregroundColor(.errorColor)
                    }
                }

                VStack(alignment: .leading, spacing: Spacing.xs) {
                    TextField("Email", text: $viewModel.email)
                        .textContentType(.emailAddress)
                        .keyboardType(.emailAddress)
                        .autocapitalization(.none)

                    if let error = viewModel.emailError, !viewModel.email.isEmpty {
                        Text(error)
                            .font(.labelSmall)
                            .foregroundColor(.errorColor)
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
                TextField("Dietary Preferences", text: $viewModel.dietaryPreferences)
                    .placeholder(when: viewModel.dietaryPreferences.isEmpty) {
                        Text("e.g., Vegetarian, Vegan, etc.")
                            .foregroundColor(.textTertiary)
                    }

                HStack {
                    TextField("Meals per Day", text: $viewModel.mealsPerDay)
                        .keyboardType(.numberPad)

                    Text("meals")
                        .foregroundColor(.textSecondary)
                }

                TextField("Allergies", text: $viewModel.allergies)
                    .placeholder(when: viewModel.allergies.isEmpty) {
                        Text("e.g., Nuts, Dairy, etc.")
                            .foregroundColor(.textTertiary)
                    }
            }

            // Save Button Section
            Section {
                GTSDButton(
                    "Save Changes",
                    style: .primary,
                    isLoading: viewModel.isSaving,
                    isDisabled: !viewModel.isValid || !viewModel.hasChanges
                ) {
                    _Concurrency.Task {
                        let success = await viewModel.saveChanges()
                        if success {
                            dismiss()
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
