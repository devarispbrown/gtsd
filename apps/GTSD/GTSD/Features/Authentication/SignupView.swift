//
//  SignupView.swift
//  GTSD
//
//  Created by Claude on 2025-10-26.
//

import SwiftUI

struct SignupView: View {
    @StateObject private var viewModel = LoginViewModel()
    @Environment(\.dismiss) private var dismiss
    @FocusState private var focusedField: Field?
    @State private var isPasswordVisible = false
    @State private var isConfirmPasswordVisible = false

    enum Field {
        case name, email, password, confirmPassword
    }

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
                VStack(spacing: 24) {
                    // Header
                    VStack(spacing: 12) {
                        Image(systemName: "person.circle.fill")
                            .font(.system(size: 60))
                            .foregroundColor(.primaryColor)

                        Text("Create Account")
                            .font(.system(size: 32, weight: .bold, design: .rounded))
                            .foregroundColor(.primary)

                        Text("Join GTSD to start achieving your goals")
                            .font(.subheadline)
                            .foregroundColor(.secondary)
                            .multilineTextAlignment(.center)
                    }
                    .padding(.top, 40)

                    // Signup Form
                    VStack(spacing: 16) {
                        // Name Field
                        VStack(alignment: .leading, spacing: 8) {
                            TextField("Full Name", text: $viewModel.name)
                                .textFieldStyle(RoundedTextFieldStyle())
                                .textContentType(.name)
                                .focused($focusedField, equals: .name)
                                .submitLabel(.next)
                                .onSubmit {
                                    focusedField = .email
                                }
                        }

                        // Email Field
                        VStack(alignment: .leading, spacing: 8) {
                            TextField("Email", text: $viewModel.email)
                                .textFieldStyle(RoundedTextFieldStyle())
                                .textContentType(.emailAddress)
                                .autocapitalization(.none)
                                .keyboardType(.emailAddress)
                                .focused($focusedField, equals: .email)
                                .submitLabel(.next)
                                .onSubmit {
                                    focusedField = .password
                                }

                            if let error = viewModel.emailError {
                                Text(error)
                                    .font(.caption)
                                    .foregroundColor(.errorColor)
                            }
                        }

                        // Password Field
                        VStack(alignment: .leading, spacing: 8) {
                            HStack {
                                Group {
                                    if isPasswordVisible {
                                        TextField("Password", text: $viewModel.password)
                                            .textContentType(.newPassword)
                                            .autocapitalization(.none)
                                    } else {
                                        SecureField("Password", text: $viewModel.password)
                                            .textContentType(.newPassword)
                                    }
                                }
                                .focused($focusedField, equals: .password)
                                .submitLabel(.next)
                                .onSubmit {
                                    focusedField = .confirmPassword
                                }

                                Button(action: {
                                    isPasswordVisible.toggle()
                                }) {
                                    Image(systemName: isPasswordVisible ? "eye.slash.fill" : "eye.fill")
                                        .foregroundColor(.secondary)
                                        .frame(width: 20, height: 20)
                                }
                                .buttonStyle(.plain)
                            }
                            .padding(12)
                            .background(Color(.systemGray6))
                            .cornerRadius(12)

                            if let error = viewModel.passwordError {
                                Text(error)
                                    .font(.caption)
                                    .foregroundColor(.errorColor)
                            }
                        }

                        // Confirm Password Field
                        VStack(alignment: .leading, spacing: 8) {
                            HStack {
                                Group {
                                    if isConfirmPasswordVisible {
                                        TextField("Confirm Password", text: $viewModel.confirmPassword)
                                            .textContentType(.newPassword)
                                            .autocapitalization(.none)
                                    } else {
                                        SecureField("Confirm Password", text: $viewModel.confirmPassword)
                                            .textContentType(.newPassword)
                                    }
                                }
                                .focused($focusedField, equals: .confirmPassword)
                                .submitLabel(.go)
                                .onSubmit {
                                    _Concurrency.Task {
                                        await viewModel.signup()
                                    }
                                }

                                Button(action: {
                                    isConfirmPasswordVisible.toggle()
                                }) {
                                    Image(systemName: isConfirmPasswordVisible ? "eye.slash.fill" : "eye.fill")
                                        .foregroundColor(.secondary)
                                        .frame(width: 20, height: 20)
                                }
                                .buttonStyle(.plain)
                            }
                            .padding(12)
                            .background(Color(.systemGray6))
                            .cornerRadius(12)

                            if let error = viewModel.confirmPasswordError {
                                Text(error)
                                    .font(.caption)
                                    .foregroundColor(.errorColor)
                            }
                        }

                        // Signup Button
                        Button(action: {
                            _Concurrency.Task {
                                await viewModel.signup()
                            }
                        }) {
                            HStack {
                                if viewModel.isLoading {
                                    ProgressView()
                                        .progressViewStyle(CircularProgressViewStyle(tint: .white))
                                } else {
                                    Text("Sign Up")
                                        .fontWeight(.semibold)
                                }
                            }
                            .frame(maxWidth: .infinity)
                            .padding()
                            .background(viewModel.isSignupValid ? Color.primaryColor : Color.gray)
                            .foregroundColor(.white)
                            .cornerRadius(12)
                        }
                        .disabled(!viewModel.isSignupValid || viewModel.isLoading)

                        // Terms Text
                        Text("By signing up, you agree to our Terms of Service and Privacy Policy")
                            .font(.caption)
                            .foregroundColor(.secondary)
                            .multilineTextAlignment(.center)
                            .padding(.top, 8)
                    }
                    .padding(.horizontal, 32)

                    Spacer(minLength: 40)
                }
            }
        }
        .navigationBarTitleDisplayMode(.inline)
        .alert("Error", isPresented: $viewModel.showError) {
            Button("OK", role: .cancel) {}
        } message: {
            Text(viewModel.errorMessage ?? "An unknown error occurred")
        }
        .onChange(of: viewModel.isAuthenticated) { _, isAuthenticated in
            if isAuthenticated {
                dismiss()
            }
        }
    }
}

#Preview {
    NavigationStack {
        SignupView()
    }
}
