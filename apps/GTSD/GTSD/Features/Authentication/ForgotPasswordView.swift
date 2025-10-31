//
//  ForgotPasswordView.swift
//  GTSD
//
//  Created by Claude on 2025-10-29.
//

import SwiftUI
import Combine

@MainActor
struct ForgotPasswordView: View {
    @StateObject private var viewModel = ForgotPasswordViewModel()
    @Environment(\.dismiss) private var dismiss
    @FocusState private var isEmailFocused: Bool

    var body: some View {
        ZStack {
            // Background
            LinearGradient(
                colors: [Color.primaryColor.opacity(0.1), Color.secondaryColor.opacity(0.1)],
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )
            .ignoresSafeArea()

            ScrollView {
                VStack(spacing: Spacing.xl) {
                    // Icon
                    Image(systemName: "lock.rotation")
                        .font(.system(size: IconSize.xl * 2))
                        .foregroundColor(.primaryColor)
                        .padding(.top, Spacing.xxl)

                    // Header
                    VStack(spacing: Spacing.sm) {
                        Text("Forgot Password?")
                            .font(.headlineLarge)
                            .foregroundColor(.textPrimary)

                        Text("Enter your email address and we'll send you instructions to reset your password.")
                            .font(.bodyMedium)
                            .foregroundColor(.textSecondary)
                            .multilineTextAlignment(.center)
                            .padding(.horizontal, Spacing.xl)
                    }

                    if viewModel.emailSent {
                        // Success State
                        VStack(spacing: Spacing.lg) {
                            Image(systemName: "checkmark.circle.fill")
                                .font(.system(size: IconSize.xl * 1.5))
                                .foregroundColor(.green)

                            VStack(spacing: Spacing.sm) {
                                Text("Check Your Email")
                                    .font(.titleLarge)
                                    .foregroundColor(.textPrimary)

                                Text("We've sent password reset instructions to \(viewModel.email)")
                                    .font(.bodyMedium)
                                    .foregroundColor(.textSecondary)
                                    .multilineTextAlignment(.center)
                                    .padding(.horizontal, Spacing.xl)

                                Text("If you don't see the email, check your spam folder.")
                                    .font(.bodySmall)
                                    .foregroundColor(.textTertiary)
                                    .multilineTextAlignment(.center)
                                    .padding(.horizontal, Spacing.xl)
                                    .padding(.top, Spacing.sm)
                            }

                            GTSDButton(
                                "Back to Login",
                                style: .primary
                            ) {
                                dismiss()
                            }
                            .padding(.horizontal, Spacing.xl)
                            .padding(.top, Spacing.lg)
                        }
                        .padding(.vertical, Spacing.xl)
                    } else {
                        // Input Form
                        VStack(spacing: Spacing.lg) {
                            VStack(alignment: .leading, spacing: Spacing.xs) {
                                GTSDTextField(
                                    title: "Email",
                                    placeholder: "Enter your email",
                                    text: $viewModel.email,
                                    keyboardType: .emailAddress,
                                    icon: "envelope"
                                )
                                .focused($isEmailFocused)
                                .submitLabel(.send)
                                .onSubmit {
                                    _Concurrency.Task {
                                        await viewModel.sendResetEmail()
                                    }
                                }

                                if let error = viewModel.emailError {
                                    Text(error)
                                        .font(.labelSmall)
                                        .foregroundColor(.errorColor)
                                }
                            }

                            GTSDButton(
                                "Send Reset Instructions",
                                style: .primary,
                                isLoading: viewModel.isLoading,
                                isDisabled: !viewModel.isValid
                            ) {
                                _Concurrency.Task {
                                    await viewModel.sendResetEmail()
                                }
                            }

                            Button {
                                dismiss()
                            } label: {
                                Text("Back to Login")
                                    .font(.bodyMedium)
                                    .foregroundColor(.primaryColor)
                            }
                            .padding(.top, Spacing.sm)
                        }
                        .padding(.horizontal, Spacing.xl)
                    }

                    Spacer(minLength: Spacing.xxl)
                }
            }
        }
        .navigationTitle("Reset Password")
        .navigationBarTitleDisplayMode(.inline)
        .alert("Error", isPresented: .constant(viewModel.errorMessage != nil && !viewModel.emailSent)) {
            Button("OK") {
                viewModel.errorMessage = nil
            }
        } message: {
            Text(viewModel.errorMessage ?? "")
        }
    }
}

// MARK: - ViewModel

@MainActor
final class ForgotPasswordViewModel: ObservableObject {
    @Published var email: String = ""
    @Published var isLoading: Bool = false
    @Published var errorMessage: String?
    @Published var emailSent: Bool = false

    private let apiClient: any APIClientProtocol

    init(apiClient: any APIClientProtocol = ServiceContainer.shared.apiClient) {
        self.apiClient = apiClient
    }

    var isValid: Bool {
        email.isValidEmail
    }

    var emailError: String? {
        guard !email.isEmpty else { return nil }
        return email.isValidEmail ? nil : "Invalid email address"
    }

    func sendResetEmail() async {
        guard isValid else {
            errorMessage = "Please enter a valid email address"
            return
        }

        isLoading = true
        errorMessage = nil

        defer { isLoading = false }

        do {
            Logger.info("Sending password reset email to \(email)")

            let _: ForgotPasswordResponse = try await apiClient.request(.forgotPassword(email: email))

            // Success - show confirmation
            emailSent = true
            Logger.info("Password reset email sent successfully")

        } catch let error as APIError {
            Logger.error("Failed to send reset email: \(error.localizedDescription)")
            errorMessage = error.localizedDescription
        } catch {
            Logger.error("Unexpected error sending reset email: \(error.localizedDescription)")
            errorMessage = "Failed to send reset instructions. Please try again."
        }
    }
}

// MARK: - Preview

#Preview("Initial") {
    NavigationStack {
        ForgotPasswordView()
    }
}

#Preview("Success") {
    let viewModel = ForgotPasswordViewModel()
    NavigationStack {
        ForgotPasswordView()
            .task {
                viewModel.email = "user@example.com"
                viewModel.emailSent = true
            }
    }
}
