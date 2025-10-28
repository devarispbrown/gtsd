//
//  LoginView.swift
//  GTSD
//
//  Created by Claude on 2025-10-26.
//

import SwiftUI

struct LoginView: View {
    @StateObject private var viewModel = LoginViewModel()
    @StateObject private var biometricService = BiometricAuthService.shared
    @FocusState private var focusedField: Field?

    enum Field {
        case email, password
    }

    var body: some View {
        NavigationStack {
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
                        // Logo and Title
                        VStack(spacing: 12) {
                            Image(systemName: "checkmark.circle.fill")
                                .font(.system(size: 80))
                                .foregroundColor(.primaryColor)

                            Text("GTSD")
                                .font(.system(size: 42, weight: .bold, design: .rounded))
                                .foregroundColor(.primary)

                            Text("Get Things Successfully Done")
                                .font(.subheadline)
                                .foregroundColor(.secondary)
                        }
                        .padding(.top, 60)

                        // Login Form
                        VStack(spacing: 16) {
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
                                SecureField("Password", text: $viewModel.password)
                                    .textFieldStyle(RoundedTextFieldStyle())
                                    .textContentType(.password)
                                    .focused($focusedField, equals: .password)
                                    .submitLabel(.go)
                                    .onSubmit {
                                        _Concurrency.Task {
                                            await viewModel.login()
                                        }
                                    }

                                if let error = viewModel.passwordError {
                                    Text(error)
                                        .font(.caption)
                                        .foregroundColor(.errorColor)
                                }
                            }

                            // Login Button
                            Button(action: {
                                _Concurrency.Task {
                                    await viewModel.login()
                                }
                            }) {
                                HStack {
                                    if viewModel.isLoading {
                                        ProgressView()
                                            .progressViewStyle(CircularProgressViewStyle(tint: .white))
                                    } else {
                                        Text("Log In")
                                            .fontWeight(.semibold)
                                    }
                                }
                                .frame(maxWidth: .infinity)
                                .padding()
                                .background(viewModel.isLoginValid ? Color.primaryColor : Color.gray)
                                .foregroundColor(.white)
                                .cornerRadius(12)
                            }
                            .disabled(!viewModel.isLoginValid || viewModel.isLoading)

                            // Biometric Login Button
                            if biometricService.isAvailable && biometricService.isBiometricEnabled {
                                Button(action: {
                                    _Concurrency.Task {
                                        await viewModel.loginWithBiometric()
                                    }
                                }) {
                                    HStack {
                                        Image(systemName: biometricService.biometricType.icon)
                                            .font(.system(size: IconSize.sm))
                                        Text("Log In with \(biometricService.biometricType.displayName)")
                                            .fontWeight(.semibold)
                                    }
                                    .frame(maxWidth: .infinity)
                                    .padding()
                                    .background(Color.primaryColor.opacity(0.1))
                                    .foregroundColor(.primaryColor)
                                    .cornerRadius(12)
                                    .overlay(
                                        RoundedRectangle(cornerRadius: 12)
                                            .stroke(Color.primaryColor, lineWidth: 1)
                                    )
                                }
                            }

                            // Signup Navigation
                            NavigationLink(destination: SignupView()) {
                                Text("Don't have an account? Sign Up")
                                    .font(.subheadline)
                                    .foregroundColor(.primaryColor)
                            }
                            .padding(.top, 8)
                        }
                        .padding(.horizontal, 32)

                        Spacer(minLength: 40)
                    }
                }
            }
            .alert("Error", isPresented: $viewModel.showError) {
                Button("OK", role: .cancel) {}
            } message: {
                Text(viewModel.errorMessage ?? "An unknown error occurred")
            }
        }
    }
}

// MARK: - Custom Text Field Style

struct RoundedTextFieldStyle: TextFieldStyle {
    func _body(configuration: TextField<Self._Label>) -> some View {
        configuration
            .padding()
            .background(Color(.systemBackground))
            .cornerRadius(12)
            .overlay(
                RoundedRectangle(cornerRadius: 12)
                    .stroke(Color.gray.opacity(0.3), lineWidth: 1)
            )
    }
}

#Preview {
    LoginView()
}
