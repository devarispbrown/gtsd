//
//  LoginViewModel.swift
//  GTSD
//
//  Created by Claude on 2025-10-26.
//

import Foundation
import SwiftUI
import Combine

/// View model for authentication screens
@MainActor
final class LoginViewModel: ObservableObject {
    @Published var email = ""
    @Published var password = ""
    @Published var name = ""
    @Published var confirmPassword = ""

    @Published var isLoading = false
    @Published var errorMessage: String?
    @Published var showError = false

    private let authService: any AuthenticationServiceProtocol
    private let biometricService = BiometricAuthService.shared
    private let keychainManager: KeychainManagerProtocol

    init(
        authService: (any AuthenticationServiceProtocol)? = nil,
        keychainManager: KeychainManagerProtocol? = nil
    ) {
        self.authService = authService ?? ServiceContainer.shared.authService
        self.keychainManager = keychainManager ?? ServiceContainer.shared.keychain
    }

    var isAuthenticated: Bool {
        authService.isAuthenticated
    }

    // MARK: - Validation

    var isLoginValid: Bool {
        email.isValidEmail && password.isValidPassword
    }

    var isSignupValid: Bool {
        email.isValidEmail &&
        password.isValidPassword &&
        !name.trimmed.isEmpty &&
        password == confirmPassword
    }

    var emailError: String? {
        guard !email.isEmpty else { return nil }
        return email.isValidEmail ? nil : "Invalid email address"
    }

    var passwordError: String? {
        guard !password.isEmpty else { return nil }
        return password.isValidPassword ? nil : "Password must be at least 8 characters"
    }

    var confirmPasswordError: String? {
        guard !confirmPassword.isEmpty else { return nil }
        return password == confirmPassword ? nil : "Passwords do not match"
    }

    // MARK: - Actions

    func login() async {
        guard isLoginValid else {
            showErrorMessage("Please enter valid email and password")
            return
        }

        isLoading = true
        errorMessage = nil
        showError = false

        do {
            try await authService.login(email: email, password: password)
            Logger.info("Login successful")
            // Navigation will be handled by the app state change

        } catch {
            Logger.error("Login failed: \(error)")
            showErrorMessage(error.localizedDescription)
        }

        isLoading = false
    }

    func signup() async {
        guard isSignupValid else {
            showErrorMessage("Please fill in all fields correctly")
            return
        }

        isLoading = true
        errorMessage = nil
        showError = false

        do {
            try await authService.signup(email: email, password: password, name: name)
            Logger.info("Signup successful")
            // Navigation will be handled by the app state change

        } catch {
            Logger.error("Signup failed: \(error)")
            showErrorMessage(error.localizedDescription)
        }

        isLoading = false
    }

    func loginWithBiometric() async {
        isLoading = true
        errorMessage = nil
        showError = false

        do {
            // Attempt biometric authentication
            let authenticated = try await biometricService.authenticate(
                reason: "Log in to GTSD"
            )

            if authenticated {
                // Retrieve stored credentials
                guard let storedEmail = keychainManager.get("biometric_email"),
                      let storedPassword = keychainManager.get("biometric_password") else {
                    showErrorMessage("No stored credentials found. Please log in with email and password first.")
                    isLoading = false
                    return
                }

                // Login with stored credentials
                try await authService.login(email: storedEmail, password: storedPassword)
                Logger.info("Biometric login successful")
            }

        } catch let error as BiometricAuthService.BiometricError {
            Logger.error("Biometric login failed: \(error.localizedDescription)")

            // Handle user fallback to password
            if case .userFallback = error {
                // User wants to use password - do nothing, they can use the login form
                Logger.info("User chose password fallback")
            } else {
                showErrorMessage(error.localizedDescription)
            }

        } catch {
            Logger.error("Biometric login failed: \(error)")
            showErrorMessage(error.localizedDescription)
        }

        isLoading = false
    }

    func clearForm() {
        email = ""
        password = ""
        name = ""
        confirmPassword = ""
        errorMessage = nil
        showError = false
    }

    private func showErrorMessage(_ message: String) {
        errorMessage = message
        showError = true
    }
}
