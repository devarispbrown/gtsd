//
//  ProfileViewModel.swift
//  GTSD
//
//  Created by Claude on 2025-10-26.
//

import Foundation
import Combine

@MainActor
class ProfileViewModel: ObservableObject {
    @Published var currentUser: User?
    @Published var currentStreak: CurrentStreak?
    @Published var isLoading: Bool = false
    @Published var errorMessage: String?

    private let apiClient: any APIClientProtocol
    private let authService: any AuthenticationServiceProtocol

    init(
        apiClient: any APIClientProtocol = ServiceContainer.shared.apiClient,
        authService: any AuthenticationServiceProtocol = ServiceContainer.shared.authService
    ) {
        self.apiClient = apiClient
        self.authService = authService
        self.currentUser = authService.currentUser
    }

    func loadProfile() async {
        isLoading = true
        errorMessage = nil

        do {
            // Load user data from auth service
            currentUser = authService.currentUser

            // Load streak data to show in profile
            let streak: CurrentStreak = try await apiClient.request(.getCurrentStreak)
            currentStreak = streak

            Logger.info("Profile loaded successfully")
        } catch {
            Logger.error("Failed to load profile: \(error)")
            errorMessage = error.localizedDescription
        }

        isLoading = false
    }

    func logout() async {
        await authService.logout()
    }
}
