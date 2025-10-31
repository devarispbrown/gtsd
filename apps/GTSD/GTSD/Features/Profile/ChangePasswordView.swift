//
//  ChangePasswordView.swift
//  GTSD
//
//  Created by Claude on 2025-10-29.
//

import SwiftUI
import Combine

@MainActor
struct ChangePasswordView: View {
    @StateObject private var viewModel = ChangePasswordViewModel()
    @Environment(\.dismiss) private var dismiss
    @FocusState private var focusedField: Field?
    @State private var isCurrentPasswordVisible = false
    @State private var isNewPasswordVisible = false
    @State private var isConfirmPasswordVisible = false

    enum Field {
        case current, new, confirm
    }

    var body: some View {
        Form {
            // Current Password Section
            Section {
                HStack {
                    if isCurrentPasswordVisible {
                        TextField("Current Password", text: $viewModel.currentPassword)
                            .textContentType(.password)
                            .focused($focusedField, equals: .current)
                            .submitLabel(.next)
                            .onSubmit {
                                focusedField = .new
                            }
                            .accessibilityLabel("Current password field, text is visible")
                    } else {
                        SecureField("Current Password", text: $viewModel.currentPassword)
                            .textContentType(.password)
                            .focused($focusedField, equals: .current)
                            .submitLabel(.next)
                            .onSubmit {
                                focusedField = .new
                            }
                            .accessibilityLabel("Current password field, text is hidden")
                    }

                    Button(action: {
                        isCurrentPasswordVisible.toggle()
                    }) {
                        Image(systemName: isCurrentPasswordVisible ? "eye.slash.fill" : "eye.fill")
                            .foregroundColor(.gray)
                            .frame(width: 20, height: 20)
                    }
                    .accessibilityLabel(isCurrentPasswordVisible ? "Hide current password" : "Show current password")
                    .buttonStyle(.plain)
                }

                if let error = viewModel.currentPasswordError {
                    Text(error)
                        .font(.labelSmall)
                        .foregroundColor(.errorColor)
                }
            } header: {
                Text("Current Password")
            } footer: {
                Text("Enter your current password to verify your identity")
            }

            // New Password Section
            Section {
                HStack {
                    if isNewPasswordVisible {
                        TextField("New Password", text: $viewModel.newPassword)
                            .textContentType(.newPassword)
                            .focused($focusedField, equals: .new)
                            .submitLabel(.next)
                            .onSubmit {
                                focusedField = .confirm
                            }
                            .accessibilityLabel("New password field, text is visible")
                    } else {
                        SecureField("New Password", text: $viewModel.newPassword)
                            .textContentType(.newPassword)
                            .focused($focusedField, equals: .new)
                            .submitLabel(.next)
                            .onSubmit {
                                focusedField = .confirm
                            }
                            .accessibilityLabel("New password field, text is hidden")
                    }

                    Button(action: {
                        isNewPasswordVisible.toggle()
                    }) {
                        Image(systemName: isNewPasswordVisible ? "eye.slash.fill" : "eye.fill")
                            .foregroundColor(.gray)
                            .frame(width: 20, height: 20)
                    }
                    .accessibilityLabel(isNewPasswordVisible ? "Hide new password" : "Show new password")
                    .buttonStyle(.plain)
                }

                if let error = viewModel.newPasswordError {
                    Text(error)
                        .font(.labelSmall)
                        .foregroundColor(.errorColor)
                }
            } header: {
                Text("New Password")
            } footer: {
                Text("Password must be at least 8 characters long")
            }

            // Confirm Password Section
            Section {
                HStack {
                    if isConfirmPasswordVisible {
                        TextField("Confirm New Password", text: $viewModel.confirmPassword)
                            .textContentType(.newPassword)
                            .focused($focusedField, equals: .confirm)
                            .submitLabel(.done)
                            .onSubmit {
                                _Concurrency.Task {
                                    await viewModel.changePassword()
                                }
                            }
                            .accessibilityLabel("Confirm password field, text is visible")
                    } else {
                        SecureField("Confirm New Password", text: $viewModel.confirmPassword)
                            .textContentType(.newPassword)
                            .focused($focusedField, equals: .confirm)
                            .submitLabel(.done)
                            .onSubmit {
                                _Concurrency.Task {
                                    await viewModel.changePassword()
                                }
                            }
                            .accessibilityLabel("Confirm password field, text is hidden")
                    }

                    Button(action: {
                        isConfirmPasswordVisible.toggle()
                    }) {
                        Image(systemName: isConfirmPasswordVisible ? "eye.slash.fill" : "eye.fill")
                            .foregroundColor(.gray)
                            .frame(width: 20, height: 20)
                    }
                    .accessibilityLabel(isConfirmPasswordVisible ? "Hide confirm password" : "Show confirm password")
                    .buttonStyle(.plain)
                }

                if let error = viewModel.confirmPasswordError {
                    Text(error)
                        .font(.labelSmall)
                        .foregroundColor(.errorColor)
                }
            } header: {
                Text("Confirm Password")
            } footer: {
                Text("Re-enter your new password to confirm")
            }

            // Change Password Button
            Section {
                GTSDButton(
                    "Change Password",
                    style: .primary,
                    isLoading: viewModel.isLoading,
                    isDisabled: !viewModel.isValid
                ) {
                    _Concurrency.Task {
                        await viewModel.changePassword()
                    }
                }
                .listRowInsets(EdgeInsets())
                .listRowBackground(Color.clear)
            }

            // Password Requirements
            Section {
                VStack(alignment: .leading, spacing: Spacing.sm) {
                    Text("Password Requirements:")
                        .font(.labelMedium)
                        .foregroundColor(.textPrimary)

                    RequirementRow(
                        text: "At least 8 characters",
                        isMet: viewModel.newPassword.count >= 8
                    )
                }
            } header: {
                Text("Requirements")
            }
        }
        .navigationTitle("Change Password")
        .navigationBarTitleDisplayMode(.inline)
        .alert("Success", isPresented: $viewModel.showSuccess) {
            Button("OK") {
                dismiss()
            }
        } message: {
            Text("Your password has been changed successfully.")
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

// MARK: - Requirement Row

struct RequirementRow: View {
    let text: String
    let isMet: Bool

    var body: some View {
        HStack(spacing: Spacing.sm) {
            Image(systemName: isMet ? "checkmark.circle.fill" : "circle")
                .font(.system(size: IconSize.sm))
                .foregroundColor(isMet ? .green : .textTertiary)

            Text(text)
                .font(.bodySmall)
                .foregroundColor(isMet ? .textPrimary : .textSecondary)
        }
    }
}

// MARK: - ViewModel

@MainActor
final class ChangePasswordViewModel: ObservableObject {
    @Published var currentPassword: String = ""
    @Published var newPassword: String = ""
    @Published var confirmPassword: String = ""
    @Published var isLoading: Bool = false
    @Published var errorMessage: String?
    @Published var showSuccess: Bool = false

    private let apiClient: any APIClientProtocol

    init(apiClient: any APIClientProtocol = ServiceContainer.shared.apiClient) {
        self.apiClient = apiClient
    }

    var isValid: Bool {
        !currentPassword.isEmpty &&
        newPassword.count >= 8 &&
        newPassword == confirmPassword &&
        newPassword != currentPassword
    }

    var currentPasswordError: String? {
        guard !currentPassword.isEmpty else { return nil }
        return currentPassword.count < 8 ? "Current password too short" : nil
    }

    var newPasswordError: String? {
        guard !newPassword.isEmpty else { return nil }

        if newPassword.count < 8 {
            return "Password must be at least 8 characters"
        }

        if newPassword == currentPassword {
            return "New password must be different from current password"
        }

        return nil
    }

    var confirmPasswordError: String? {
        guard !confirmPassword.isEmpty else { return nil }
        return confirmPassword != newPassword ? "Passwords do not match" : nil
    }

    func changePassword() async {
        guard isValid else {
            errorMessage = "Please fix the errors above"
            return
        }

        isLoading = true
        errorMessage = nil

        defer { isLoading = false }

        do {
            Logger.info("Changing user password")

            let _: ChangePasswordResponse = try await apiClient.request(
                .changePassword(
                    currentPassword: currentPassword,
                    newPassword: newPassword
                )
            )

            Logger.info("Password changed successfully")

            // Clear fields
            currentPassword = ""
            newPassword = ""
            confirmPassword = ""

            // Show success
            showSuccess = true

        } catch let error as APIError {
            Logger.error("Failed to change password: \(error.localizedDescription)")
            errorMessage = error.localizedDescription
        } catch {
            Logger.error("Unexpected error changing password: \(error.localizedDescription)")
            errorMessage = "Failed to change password. Please try again."
        }
    }
}

// MARK: - Preview

#Preview {
    NavigationStack {
        ChangePasswordView()
    }
}
