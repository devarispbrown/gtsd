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
            // Note: This may fail for new users who haven't completed any tasks yet
            do {
                let streak: CurrentStreak = try await apiClient.request(.getCurrentStreak)
                currentStreak = streak
                Logger.info("Profile loaded successfully with streak data")
            } catch let streakError as APIError {
                // Gracefully handle missing streak data for new users
                switch streakError {
                case .httpError(let statusCode, _) where statusCode == 404:
                    Logger.info("No streak data found for user (new user or no completed tasks)")
                    currentStreak = nil
                case .decodingError(let decodingError):
                    Logger.warning("Failed to decode streak data: \(decodingError.localizedDescription)")
                    currentStreak = nil
                default:
                    Logger.error("Failed to load streak data: \(streakError)")
                    currentStreak = nil
                }
            } catch {
                Logger.warning("Unexpected error loading streak data: \(error)")
                currentStreak = nil
            }

            // Check if user might have imperial data stored as metric
            // This is a one-time migration check for users who completed onboarding
            // before the unit conversion fix was implemented
            await detectAndReportImperialDataIssue()

            Logger.info("Profile loaded successfully")
        } catch {
            Logger.error("Failed to load profile: \(error)")
            errorMessage = error.localizedDescription
        }

        isLoading = false
    }

    /// Detect if the user might have imperial data incorrectly stored as metric values
    /// This happens when users completed onboarding before the unit conversion fix
    ///
    /// NOTE: This is a detection-only method. Due to API limitations, we cannot
    /// automatically fix the data. The actual fix requires the user to either:
    /// 1. Re-complete onboarding with correct values
    /// 2. Contact support for manual data correction
    /// 3. Use a backend migration script (recommended - see CRITICAL_FIXES_NEEDED.md)
    ///
    /// Detection heuristics:
    /// - If validation errors occur during plan generation
    /// - Errors like "weight > 300kg" or "height < 100cm" suggest imperial stored as metric
    /// - Example: 315 lbs stored as 315 kg, or 70 inches stored as 70 cm
    ///
    /// **CRITICAL CONTEXT FOR DEVELOPERS:**
    /// The root cause is that the user completed onboarding BEFORE the unit conversion
    /// fix was implemented (see UnitConversion.swift). Their imperial values were
    /// incorrectly stored as metric in the database:
    /// - currentWeight: 315 (should be 315 lbs → 142.88 kg, but stored as 315 kg)
    /// - height: 70 (should be 70 inches → 177.8 cm, but stored as 70 cm)
    ///
    /// When plan generation runs, backend validation rejects:
    /// - 315 kg > 300 kg max ❌
    /// - 70 cm < 100 cm min ❌
    ///
    /// **SOLUTION OPTIONS:**
    /// A. Backend Migration Script (RECOMMENDED):
    ///    - Query all users where currentWeight > 200 AND height < 100
    ///    - Assume these are imperial values stored as metric
    ///    - Convert and update: weight * 0.453592, height * 2.54
    ///
    /// B. iOS Manual Re-entry:
    ///    - Show "Data Update Required" dialog
    ///    - Guide user through re-entering weight/height
    ///    - Submit via completeOnboarding endpoint with correct conversion
    ///
    /// C. iOS Automatic Fix (REQUIRES NEW API ENDPOINT):
    ///    - Add GET /v1/onboarding/settings to fetch stored values
    ///    - Add PUT /v1/onboarding/settings to update only weight/height
    ///    - Detect, convert, and auto-fix imperial data
    ///
    /// This method implements detection for Option B (manual re-entry).
    private func detectAndReportImperialDataIssue() async {
        // Try to fetch the "How It Works" summary which includes user settings
        // If this fails with validation errors, it suggests data corruption
        do {
            let response: HowItWorksSummaryResponse = try await apiClient.request(.getHowItWorksSummary)
            Logger.info("User settings appear valid - no imperial data issue detected")
        } catch let error as APIError {
            // Check if error message suggests validation failure
            if case .httpError(let statusCode, let message) = error,
               statusCode == 400 || statusCode == 422 {
                let errorMessage = message ?? "Unknown error"
                if errorMessage.contains("weight") || errorMessage.contains("height") ||
                   errorMessage.contains("kg") || errorMessage.contains("cm") ||
                   errorMessage.contains("validation") {
                    Logger.warning("""
                        ⚠️ IMPERIAL DATA CORRUPTION DETECTED ⚠️
                        User likely completed onboarding before unit conversion fix.
                        Validation error suggests imperial values stored as metric.
                        User may need to re-complete onboarding or contact support.
                        Error: \(errorMessage)

                        Recommended: Implement backend migration script to fix all affected users.
                        See IMPERIAL_DATA_MIGRATION_SCRIPT.md for details.
                        """)
                    // Note: We're not setting errorMessage here to avoid alarming the user
                    // The error will surface when they try to generate a plan
                }
            }
        } catch {
            // Ignore other errors - this is just a diagnostic check
            Logger.debug("Could not check for imperial data issues: \(error.localizedDescription)")
        }
    }

    func logout() async {
        await authService.logout()
    }
}
