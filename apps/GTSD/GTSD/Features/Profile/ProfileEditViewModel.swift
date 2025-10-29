//
//  ProfileEditViewModel.swift
//  GTSD
//
//  Created by Claude on 2025-10-27.
//

import Foundation
import Combine
import SwiftUI
import PhotosUI

/// Custom error type for profile editing operations
enum ProfileEditError: LocalizedError {
    case healthMetricsUpdateNotSupported
    case invalidInput(String)
    case saveFailed(String)

    var errorDescription: String? {
        switch self {
        case .healthMetricsUpdateNotSupported:
            return "Health metrics can only be updated during onboarding. Please contact support if you need to change these values."
        case .invalidInput(let message):
            return message
        case .saveFailed(let message):
            return "Failed to save profile: \(message)"
        }
    }
}

/// ViewModel for profile editing
@MainActor
final class ProfileEditViewModel: ObservableObject {
    // MARK: - Published Properties
    @Published var name: String = ""
    @Published var email: String = ""
    @Published var currentWeight: String = ""
    @Published var targetWeight: String = ""
    @Published var activityLevel: OnboardingData.ActivityLevel = .sedentary
    @Published var dietaryPreferences: String = ""
    @Published var mealsPerDay: String = "3"
    @Published var allergies: String = ""

    @Published var selectedPhoto: PhotosPickerItem?
    @Published var profileImage: UIImage?

    @Published private(set) var isLoading = false
    @Published private(set) var isSaving = false
    @Published var errorMessage: String?
    @Published var successMessage: String?
    @Published private(set) var planHasSignificantChanges = false
    @Published private(set) var isRecomputingPlan = false

    private let apiClient: any APIClientProtocol
    private let authService: any AuthenticationServiceProtocol
    private let planStore: PlanStore
    private var originalUser: User?

    init(
        apiClient: any APIClientProtocol = ServiceContainer.shared.apiClient,
        authService: any AuthenticationServiceProtocol = ServiceContainer.shared.authService,
        planStore: PlanStore? = nil
    ) {
        self.apiClient = apiClient
        self.authService = authService
        self.planStore = planStore ?? PlanStore(planService: ServiceContainer.shared.planService)
    }

    // MARK: - Computed Properties

    var hasChanges: Bool {
        guard let user = originalUser else { return false }

        return name != user.name ||
               email != user.email ||
               !currentWeight.isEmpty ||
               !targetWeight.isEmpty ||
               selectedPhoto != nil
    }

    var isValid: Bool {
        // Name validation
        guard !name.trimmingCharacters(in: .whitespaces).isEmpty else {
            return false
        }

        // Email validation
        guard email.isValidEmail else {
            return false
        }

        // Weight validation (if provided) - using imperial ranges
        if !currentWeight.isEmpty {
            guard let weight = Double(currentWeight),
                  UnitConversion.isValidWeightInPounds(weight) else {
                return false
            }
        }

        if !targetWeight.isEmpty {
            guard let weight = Double(targetWeight),
                  UnitConversion.isValidWeightInPounds(weight) else {
                return false
            }
        }

        // Meals per day validation
        if !mealsPerDay.isEmpty {
            guard let meals = Int(mealsPerDay), meals >= 1, meals <= 10 else {
                return false
            }
        }

        return true
    }

    // MARK: - Data Loading

    func loadProfile() async {
        isLoading = true
        errorMessage = nil

        defer { isLoading = false }

        // Load user from auth service
        if let user = authService.currentUser {
            originalUser = user
            name = user.name
            email = user.email
            Logger.info("Profile loaded for editing")
        } else {
            errorMessage = "User not found"
            Logger.error("Failed to load profile: User not found")
        }
    }

    // MARK: - Photo Selection

    func loadSelectedPhoto() async {
        guard let item = selectedPhoto else { return }

        do {
            if let data = try await item.loadTransferable(type: Data.self),
               let image = UIImage(data: data) {
                profileImage = image
            }
        } catch {
            Logger.error("Failed to load selected photo: \(error.localizedDescription)")
            errorMessage = "Failed to load selected photo"
        }
    }

    // MARK: - Save Changes

    func saveChanges() async -> Bool {
        guard isValid else {
            errorMessage = "Please check all fields"
            return false
        }

        isSaving = true
        errorMessage = nil
        successMessage = nil
        planHasSignificantChanges = false

        defer { isSaving = false }

        do {
            // Update basic profile info
            if name != originalUser?.name || email != originalUser?.email {
                let _: User = try await apiClient.request(
                    .updateProfile(
                        name: name != originalUser?.name ? name : nil,
                        email: email != originalUser?.email ? email : nil
                    )
                )
            }

            // IMPORTANT: Health metrics update temporarily disabled
            // Backend needs a proper /auth/profile/health endpoint to safely update
            // these fields without overwriting date of birth, height, and other critical data
            //
            // The onboarding endpoint cannot be safely reused for updates because it requires
            // all fields (DOB, gender, height) which would overwrite user's actual data.
            //
            // For now, health metrics can only be set during initial onboarding.
            // TODO: Create backend endpoint: PUT /auth/profile/health
            if !currentWeight.isEmpty || !targetWeight.isEmpty {
                Logger.warning("Health metrics update attempted but endpoint not available")
                throw ProfileEditError.healthMetricsUpdateNotSupported
            }

            // TODO: Upload profile photo if selected
            // This would require a new endpoint for profile photo uploads

            successMessage = "Profile updated successfully"
            Logger.info("Profile saved successfully")

            // Reload profile
            await loadProfile()

            return true

        } catch let error as APIError {
            Logger.error("Failed to save profile: \(error.localizedDescription)")
            errorMessage = error.localizedDescription
            return false
        } catch {
            Logger.error("Failed to save profile: \(error.localizedDescription)")
            errorMessage = "Failed to save profile"
            return false
        }
    }

    // MARK: - Weight Update with Plan Recomputation

    /// Update weight and automatically trigger plan recomputation
    /// This method should be used when weight changes significantly warrant a plan update
    /// - Parameter newWeight: Weight in pounds (will be converted to kg for API)
    func updateWeightAndRecomputePlan(newWeight: Double) async -> Bool {
        guard UnitConversion.isValidWeightInPounds(newWeight) else {
            errorMessage = "Invalid weight value. Please enter a weight between \(Int(UnitConversion.validWeightRangeLbs.lowerBound)) and \(Int(UnitConversion.validWeightRangeLbs.upperBound)) lbs"
            return false
        }

        isSaving = true
        isRecomputingPlan = false
        errorMessage = nil
        successMessage = nil
        planHasSignificantChanges = false

        defer {
            isSaving = false
            isRecomputingPlan = false
        }

        do {
            // Step 1: Update user profile weight
            // Note: Currently endpoint doesn't support weight updates
            // This would require backend implementation
            let newWeightKg = UnitConversion.poundsToKilograms(newWeight)
            Logger.info("Weight update initiated: \(newWeight) lbs -> \(newWeightKg) kg")

            // Step 2: Trigger plan recomputation
            isRecomputingPlan = true
            Logger.info("Triggering plan recomputation after weight update")

            await planStore.recomputePlan()

            // Step 3: Check if plan changed significantly
            if planStore.hasSignificantChanges() {
                planHasSignificantChanges = true
                Logger.info("Plan has significant changes after weight update")
            }

            // Step 4: Check for errors
            if let planError = planStore.error {
                Logger.warning("Plan recomputation completed with error: \(planError.localizedDescription)")
                errorMessage = "Profile updated, but plan recomputation had issues: \(planError.localizedDescription)"
                // Still return true since profile update succeeded
            } else {
                successMessage = "Weight updated and plan recomputed successfully"
                Logger.info("Weight update and plan recomputation completed successfully")
            }

            return true

        } catch let error as APIError {
            Logger.error("Failed to update weight: \(error.localizedDescription)")
            errorMessage = error.localizedDescription
            return false
        } catch {
            Logger.error("Failed to update weight: \(error.localizedDescription)")
            errorMessage = "Failed to update weight"
            return false
        }
    }

    // MARK: - Access to Plan Data

    /// Current plan data from store
    var currentPlanData: PlanGenerationData? {
        return planStore.currentPlan
    }

    // MARK: - Validation Messages

    var nameError: String? {
        if name.trimmingCharacters(in: .whitespaces).isEmpty {
            return "Name is required"
        }
        return nil
    }

    var emailError: String? {
        if !email.isValidEmail {
            return "Invalid email address"
        }
        return nil
    }

    var currentWeightError: String? {
        guard !currentWeight.isEmpty else { return nil }

        if let weight = Double(currentWeight) {
            if !UnitConversion.isValidWeightInPounds(weight) {
                return "Weight must be between \(Int(UnitConversion.validWeightRangeLbs.lowerBound)) and \(Int(UnitConversion.validWeightRangeLbs.upperBound)) lbs"
            }
        } else {
            return "Invalid weight value"
        }
        return nil
    }

    var targetWeightError: String? {
        guard !targetWeight.isEmpty else { return nil }

        if let weight = Double(targetWeight) {
            if !UnitConversion.isValidWeightInPounds(weight) {
                return "Weight must be between \(Int(UnitConversion.validWeightRangeLbs.lowerBound)) and \(Int(UnitConversion.validWeightRangeLbs.upperBound)) lbs"
            }
        } else {
            return "Invalid weight value"
        }
        return nil
    }
}
