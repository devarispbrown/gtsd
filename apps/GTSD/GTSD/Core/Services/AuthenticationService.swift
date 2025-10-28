//
//  AuthenticationService.swift
//  GTSD
//
//  Created by Claude on 2025-10-26.
//

import Foundation
import Combine

/// Authentication service managing user sessions and tokens
@MainActor
final class AuthenticationService: ObservableObject, AuthenticationServiceProtocol {
    @Published private(set) var isAuthenticated = false
    @Published private(set) var currentUser: User?
    @Published private(set) var isLoading = false
    @Published var errorMessage: String?

    private let apiClient: any APIClientProtocol
    private let keychain: KeychainManagerProtocol

    /// Initialize authentication service with dependencies
    init(apiClient: any APIClientProtocol, keychain: KeychainManagerProtocol) {
        self.apiClient = apiClient
        self.keychain = keychain
        // Note: Authentication check moved to explicit call to avoid race condition
    }

    // MARK: - Authentication State

    /// Check if user is authenticated by loading stored token
    func checkAuthentication() async {
        Logger.info("Checking authentication status")

        guard let token = keychain.get(KeychainManager.Keys.accessToken) else {
            Logger.info("No stored token found")
            isAuthenticated = false
            currentUser = nil
            return
        }

        // Set token in API client
        apiClient.setAuthToken(token)

        // Verify token by fetching current user
        do {
            let user: User = try await apiClient.request(.currentUser)
            currentUser = user
            isAuthenticated = true
            Logger.info("User authenticated: \(user.email)")
        } catch {
            Logger.error("Token validation failed: \(error)")
            // Token is invalid, clear it
            await logout()
        }
    }

    // MARK: - Authentication Actions

    /// Sign up new user
    func signup(email: String, password: String, name: String) async throws {
        isLoading = true
        errorMessage = nil

        defer { isLoading = false }

        Logger.info("Attempting signup for: \(email)")

        do {
            let response: AuthResponse = try await apiClient.request(
                .signup(email: email, password: password, name: name)
            )

            // Store tokens
            _ = keychain.save(response.accessToken, for: KeychainManager.Keys.accessToken)
            if let refreshToken = response.refreshToken {
                _ = keychain.save(refreshToken, for: KeychainManager.Keys.refreshToken)
            }

            // Set token in API client
            apiClient.setAuthToken(response.accessToken)

            // Update state
            currentUser = response.user
            isAuthenticated = true

            Logger.info("Signup successful for: \(email)")

        } catch let error as APIError {
            Logger.error("Signup failed: \(error.localizedDescription)")
            errorMessage = error.localizedDescription
            throw error
        } catch {
            Logger.error("Signup failed: \(error)")
            errorMessage = error.localizedDescription
            throw error
        }
    }

    /// Login existing user
    func login(email: String, password: String) async throws {
        isLoading = true
        errorMessage = nil

        defer { isLoading = false }

        Logger.info("Attempting login for: \(email)")

        do {
            let response: AuthResponse = try await apiClient.request(
                .login(email: email, password: password)
            )

            // Store tokens
            _ = keychain.save(response.accessToken, for: KeychainManager.Keys.accessToken)
            if let refreshToken = response.refreshToken {
                _ = keychain.save(refreshToken, for: KeychainManager.Keys.refreshToken)
            }

            // Set token in API client
            apiClient.setAuthToken(response.accessToken)

            // Update state
            currentUser = response.user
            isAuthenticated = true

            Logger.info("Login successful for: \(email)")

        } catch let error as APIError {
            Logger.error("Login failed: \(error.localizedDescription)")
            errorMessage = error.localizedDescription
            throw error
        } catch {
            Logger.error("Login failed: \(error)")
            errorMessage = error.localizedDescription
            throw error
        }
    }

    /// Logout current user
    func logout() async {
        Logger.info("Logging out user")

        // Call logout endpoint (best effort, don't throw on error)
        do {
            try await apiClient.requestVoid(.logout)
        } catch {
            Logger.warning("Logout endpoint failed: \(error)")
        }

        // Clear local state
        isAuthenticated = false
        currentUser = nil
        apiClient.setAuthToken(nil)

        // Clear keychain
        keychain.clearAll()

        Logger.info("Logout complete")
    }

    /// Refresh access token
    func refreshToken() async throws {
        Logger.info("Attempting to refresh token")

        guard let refreshToken = keychain.get(KeychainManager.Keys.refreshToken) else {
            Logger.error("No refresh token available")
            throw APIError.unauthorized
        }

        do {
            let response: AuthResponse = try await apiClient.request(.refreshToken)

            // Store new tokens
            _ = keychain.save(response.accessToken, for: KeychainManager.Keys.accessToken)
            if let newRefreshToken = response.refreshToken {
                _ = keychain.save(newRefreshToken, for: KeychainManager.Keys.refreshToken)
            }

            // Set token in API client
            apiClient.setAuthToken(response.accessToken)

            Logger.info("Token refresh successful")

        } catch {
            Logger.error("Token refresh failed: \(error)")
            // If refresh fails, logout user
            await logout()
            throw error
        }
    }

    // MARK: - Profile Management

    /// Update user profile
    func updateProfile(name: String?, email: String?) async throws {
        isLoading = true
        errorMessage = nil

        defer { isLoading = false }

        Logger.info("Updating profile")

        do {
            let user: User = try await apiClient.request(
                .updateProfile(name: name, email: email)
            )

            currentUser = user
            Logger.info("Profile updated successfully")

        } catch let error as APIError {
            Logger.error("Profile update failed: \(error.localizedDescription)")
            errorMessage = error.localizedDescription
            throw error
        }
    }

    /// Update current user (used after onboarding completion)
    func updateCurrentUser(_ user: User) async {
        currentUser = user
        Logger.info("Current user updated with hasCompletedOnboarding: \(user.hasCompletedOnboarding)")
    }

    /// Change password
    func changePassword(currentPassword: String, newPassword: String) async throws {
        isLoading = true
        errorMessage = nil

        defer { isLoading = false }

        Logger.info("Changing password")

        do {
            try await apiClient.requestVoid(
                .changePassword(currentPassword: currentPassword, newPassword: newPassword)
            )

            Logger.info("Password changed successfully")

        } catch let error as APIError {
            Logger.error("Password change failed: \(error.localizedDescription)")
            errorMessage = error.localizedDescription
            throw error
        }
    }

    /// Delete account
    func deleteAccount() async throws {
        isLoading = true
        errorMessage = nil

        defer { isLoading = false }

        Logger.info("Deleting account")

        do {
            try await apiClient.requestVoid(.deleteAccount)
            await logout()

            Logger.info("Account deleted successfully")

        } catch let error as APIError {
            Logger.error("Account deletion failed: \(error.localizedDescription)")
            errorMessage = error.localizedDescription
            throw error
        }
    }
}
