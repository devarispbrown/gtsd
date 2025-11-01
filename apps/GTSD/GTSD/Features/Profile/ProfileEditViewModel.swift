//
//  ProfileEditViewModel.swift
//  GTSD
//
//  Created by Claude on 2025-10-30.
//  Comprehensive profile editing with validation, optimistic UI, and offline support
//

import Foundation
import Combine
import SwiftUI
import PhotosUI

/// Validation error type for profile fields
struct ValidationError: Identifiable {
    let id = UUID()
    let field: String
    let message: String
}

/// Activity level enum matching backend
enum ActivityLevel: String, CaseIterable {
    case sedentary = "sedentary"
    case lightlyActive = "lightly_active"
    case moderatelyActive = "moderately_active"
    case veryActive = "very_active"
    case extremelyActive = "extremely_active"

    var displayName: String {
        switch self {
        case .sedentary: return "Sedentary"
        case .lightlyActive: return "Lightly Active"
        case .moderatelyActive: return "Moderately Active"
        case .veryActive: return "Very Active"
        case .extremelyActive: return "Extremely Active"
        }
    }

    var description: String {
        switch self {
        case .sedentary: return "Desk job, little to no exercise"
        case .lightlyActive: return "Light exercise 1-3 days/week"
        case .moderatelyActive: return "Moderate exercise 3-5 days/week"
        case .veryActive: return "Hard exercise 6-7 days/week"
        case .extremelyActive: return "Physical job + daily intense training"
        }
    }
}

/// Primary goal enum matching backend
enum PrimaryGoal: String, CaseIterable {
    case loseWeight = "lose_weight"
    case gainMuscle = "gain_muscle"
    case maintain = "maintain"
    case improveHealth = "improve_health"

    var displayName: String {
        switch self {
        case .loseWeight: return "Lose Weight"
        case .gainMuscle: return "Gain Muscle"
        case .maintain: return "Maintain Weight"
        case .improveHealth: return "Improve General Health"
        }
    }
}

/// Gender enum matching backend
enum Gender: String, CaseIterable {
    case male = "male"
    case female = "female"
    case other = "other"
    case preferNotToSay = "prefer_not_to_say"

    var displayName: String {
        switch self {
        case .male: return "Male"
        case .female: return "Female"
        case .other: return "Other"
        case .preferNotToSay: return "Prefer not to say"
        }
    }
}

/// ViewModel for comprehensive profile editing
@MainActor
final class ProfileEditViewModel: ObservableObject {
    // MARK: - Published Properties

    // Basic Info
    @Published var name: String = ""
    @Published var email: String = ""

    // Demographics
    @Published var dateOfBirth: Date = Calendar.current.date(byAdding: .year, value: -25, to: Date()) ?? Date()
    @Published var gender: Gender = .preferNotToSay
    @Published var heightCm: String = ""

    // Health Metrics
    @Published var currentWeightKg: String = ""
    @Published var targetWeightKg: String = ""

    // Goals & Timeline
    @Published var primaryGoal: PrimaryGoal = .loseWeight
    @Published var targetDate: Date = Calendar.current.date(byAdding: .month, value: 3, to: Date()) ?? Date()
    @Published var activityLevel: ActivityLevel = .sedentary

    // Dietary Preferences
    @Published var dietaryPreferences: [String] = []
    @Published var allergies: [String] = []
    @Published var mealsPerDay: Int = 3

    // Photo
    @Published var selectedPhoto: PhotosPickerItem?
    @Published var profileImage: UIImage?

    // State
    @Published private(set) var isLoading = false
    @Published private(set) var isSaving = false
    @Published var errorMessage: String?
    @Published var successMessage: String?
    @Published var validationErrors: [ValidationError] = []

    // Success toast state
    @Published var showSuccessToast = false
    @Published var toastPlanWillUpdate = false
    @Published var toastTargetChanges: ProfileUpdateResponse.TargetChanges?

    // Plan impact
    @Published private(set) var planUpdated = false
    @Published private(set) var targetChanges: ProfileUpdateResponse.TargetChanges?

    // Offline state
    @Published private(set) var isOffline = false

    // Dependencies
    private let apiClient: any APIClientProtocol
    private let authService: any AuthenticationServiceProtocol
    private var cancellables = Set<AnyCancellable>()

    // Original state for rollback
    var originalProfile: ProfileResponse?
    private var savedProfile: ProfileResponse?

    init(
        apiClient: any APIClientProtocol = ServiceContainer.shared.apiClient,
        authService: any AuthenticationServiceProtocol = ServiceContainer.shared.authService
    ) {
        self.apiClient = apiClient
        self.authService = authService

        // Monitor network status if NetworkMonitor exists
        setupNetworkMonitoring()
    }

    // MARK: - Network Monitoring

    private func setupNetworkMonitoring() {
        // Check if NetworkMonitor is available
        // This will be implemented when we add offline support
        // For now, assume we're always online
        isOffline = false
    }

    // MARK: - Data Loading

    func loadProfile() async {
        isLoading = true
        errorMessage = nil
        validationErrors = []

        defer { isLoading = false }

        do {
            // Fetch full profile from API
            let response: GetProfileResponse = try await apiClient.request(.getProfile)
            let profile = response.profile

            originalProfile = profile
            savedProfile = profile

            // Populate form fields
            populateFields(from: profile)

            Logger.info("Profile loaded successfully for editing")

        } catch let error as APIError {
            Logger.error("Failed to load profile: \(error.localizedDescription)")
            errorMessage = error.localizedDescription
        } catch {
            Logger.error("Failed to load profile: \(error.localizedDescription)")
            errorMessage = "Failed to load profile"
        }
    }

    private func populateFields(from profile: ProfileResponse) {
        // Basic info
        name = profile.user.name
        email = profile.user.email

        // Demographics
        if let dob = profile.demographics?.dateOfBirth {
            // Configure formatter to handle fractional seconds from API
            let formatter = ISO8601DateFormatter()
            formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]

            if let date = formatter.date(from: dob) {
                Logger.info("Loading profile dateOfBirth: \(dob) → Date: \(date)")
                dateOfBirth = date
            } else {
                Logger.error("Failed to parse dateOfBirth: \(dob)")
            }
        } else {
            Logger.error("No dateOfBirth found in profile response")
        }
        if let genderStr = profile.demographics?.gender,
           let genderEnum = Gender(rawValue: genderStr) {
            gender = genderEnum
        }
        if let height = profile.demographics?.height {
            heightCm = String(format: "%.0f", height)
        }

        // Health metrics
        if let weight = profile.health?.currentWeight {
            currentWeightKg = String(format: "%.1f", weight)
        }
        if let target = profile.health?.targetWeight {
            targetWeightKg = String(format: "%.1f", target)
        }

        // Goals
        if let goalStr = profile.goals?.primaryGoal,
           let goalEnum = PrimaryGoal(rawValue: goalStr) {
            primaryGoal = goalEnum
        }
        if let targetDateStr = profile.goals?.targetDate {
            // Configure formatter to handle fractional seconds from API
            let formatter = ISO8601DateFormatter()
            formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]

            if let date = formatter.date(from: targetDateStr) {
                targetDate = date
            }
        }
        if let activityStr = profile.goals?.activityLevel,
           let activityEnum = ActivityLevel(rawValue: activityStr) {
            activityLevel = activityEnum
        }

        // Preferences
        dietaryPreferences = profile.preferences?.dietaryPreferences ?? []
        allergies = profile.preferences?.allergies ?? []
        mealsPerDay = profile.preferences?.mealsPerDay ?? 3
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

    // MARK: - Validation (Zod-Mirrored)

    func validateProfile() -> [ValidationError] {
        var errors: [ValidationError] = []

        // Name validation
        if name.trimmingCharacters(in: .whitespaces).isEmpty {
            errors.append(ValidationError(field: "name", message: "Name is required"))
        }

        // Email validation
        if !email.isValidEmail {
            errors.append(ValidationError(field: "email", message: "Invalid email address"))
        }

        // Age validation (18-100 years)
        let age = Calendar.current.dateComponents([.year], from: dateOfBirth, to: Date()).year ?? 0
        if age < 18 || age > 100 {
            errors.append(ValidationError(field: "age", message: "Age must be between 18 and 100"))
        }

        // Height validation (50-300 cm)
        if !heightCm.isEmpty {
            if let height = Double(heightCm) {
                if height < 50 || height > 300 {
                    errors.append(ValidationError(field: "height", message: "Height must be between 50 and 300 cm"))
                }
            } else {
                errors.append(ValidationError(field: "height", message: "Invalid height value"))
            }
        }

        // Weight validation (20-500 kg)
        if !currentWeightKg.isEmpty {
            if let weight = Double(currentWeightKg) {
                if weight < 20 || weight > 500 {
                    errors.append(ValidationError(field: "currentWeight", message: "Weight must be between 20 and 500 kg"))
                }
            } else {
                errors.append(ValidationError(field: "currentWeight", message: "Invalid weight value"))
            }
        }

        if !targetWeightKg.isEmpty {
            if let weight = Double(targetWeightKg) {
                if weight < 20 || weight > 500 {
                    errors.append(ValidationError(field: "targetWeight", message: "Target weight must be between 20 and 500 kg"))
                }
            } else {
                errors.append(ValidationError(field: "targetWeight", message: "Invalid target weight value"))
            }
        }

        // Target date validation (must be in future)
        if targetDate <= Date() {
            errors.append(ValidationError(field: "targetDate", message: "Target date must be in the future"))
        }

        // Meals per day validation (1-10)
        if mealsPerDay < 1 || mealsPerDay > 10 {
            errors.append(ValidationError(field: "mealsPerDay", message: "Meals per day must be between 1 and 10"))
        }

        // Dietary preferences limit (max 10)
        if dietaryPreferences.count > 10 {
            errors.append(ValidationError(field: "dietaryPreferences", message: "Maximum 10 dietary preferences allowed"))
        }

        // Allergies limit (max 20)
        if allergies.count > 20 {
            errors.append(ValidationError(field: "allergies", message: "Maximum 20 allergies allowed"))
        }

        return errors
    }

    var isValid: Bool {
        validateProfile().isEmpty
    }

    var hasChanges: Bool {
        guard let original = originalProfile else { return false }

        // Check basic info changes
        let nameChanged = name != original.user.name
        let emailChanged = email != original.user.email

        // Check demographic changes
        let dobChanged: Bool = {
            guard let originalDob = original.demographics?.dateOfBirth,
                  let originalDate = ISO8601DateFormatter().date(from: originalDob) else {
                return false
            }
            return !Calendar.current.isDate(dateOfBirth, inSameDayAs: originalDate)
        }()

        let genderChanged: Bool = {
            guard let originalGender = original.demographics?.gender else { return false }
            return gender.rawValue != originalGender
        }()

        let heightChanged: Bool = {
            let originalHeight = original.demographics?.height
            let currentHeight = heightCm.isEmpty ? nil : Double(heightCm)

            // Both nil - no change
            if originalHeight == nil && currentHeight == nil {
                return false
            }

            // One nil, other has value - change detected
            if (originalHeight == nil) != (currentHeight == nil) {
                return true
            }

            // Both have values - compare with tolerance
            if let orig = originalHeight, let curr = currentHeight {
                return abs(curr - orig) > 0.1
            }

            return false
        }()

        // Check health metrics changes
        let currentWeightChanged: Bool = {
            let originalWeight = original.health?.currentWeight
            let currentWeight = currentWeightKg.isEmpty ? nil : Double(currentWeightKg)

            // Both nil - no change
            if originalWeight == nil && currentWeight == nil {
                return false
            }

            // One nil, other has value - change detected
            if (originalWeight == nil) != (currentWeight == nil) {
                return true
            }

            // Both have values - compare with tolerance
            if let orig = originalWeight, let curr = currentWeight {
                return abs(curr - orig) > 0.1
            }

            return false
        }()

        let targetWeightChanged: Bool = {
            let originalTarget = original.health?.targetWeight
            let currentTarget = targetWeightKg.isEmpty ? nil : Double(targetWeightKg)

            // Both nil - no change
            if originalTarget == nil && currentTarget == nil {
                return false
            }

            // One nil, other has value - change detected
            if (originalTarget == nil) != (currentTarget == nil) {
                return true
            }

            // Both have values - compare with tolerance
            if let orig = originalTarget, let curr = currentTarget {
                return abs(curr - orig) > 0.1
            }

            return false
        }()

        // Check goals changes
        let primaryGoalChanged: Bool = {
            guard let originalGoal = original.goals?.primaryGoal else { return false }
            return primaryGoal.rawValue != originalGoal
        }()

        let targetDateChanged: Bool = {
            guard let originalTargetDate = original.goals?.targetDate,
                  let originalDate = ISO8601DateFormatter().date(from: originalTargetDate) else {
                return false
            }
            return !Calendar.current.isDate(targetDate, inSameDayAs: originalDate)
        }()

        let activityLevelChanged: Bool = {
            guard let originalActivity = original.goals?.activityLevel else { return false }
            return activityLevel.rawValue != originalActivity
        }()

        // Check preferences changes
        let dietaryPreferencesChanged = dietaryPreferences != (original.preferences?.dietaryPreferences ?? [])
        let allergiesChanged = allergies != (original.preferences?.allergies ?? [])
        let mealsPerDayChanged = mealsPerDay != (original.preferences?.mealsPerDay ?? 3)

        // Check photo changes
        let photoChanged = selectedPhoto != nil

        return nameChanged ||
               emailChanged ||
               dobChanged ||
               genderChanged ||
               heightChanged ||
               currentWeightChanged ||
               targetWeightChanged ||
               primaryGoalChanged ||
               targetDateChanged ||
               activityLevelChanged ||
               dietaryPreferencesChanged ||
               allergiesChanged ||
               mealsPerDayChanged ||
               photoChanged
    }

    // MARK: - Optimistic UI Updates with Rollback

    func saveProfile() async -> Bool {
        // Check offline status
        guard !isOffline else {
            errorMessage = "You're offline. Please check your connection and try again."
            return false
        }

        // Validate
        let errors = validateProfile()
        guard errors.isEmpty else {
            validationErrors = errors
            errorMessage = "Please fix the errors below before saving"
            return false
        }

        // Check for changes
        guard hasChanges else {
            successMessage = "No changes to save"
            return true
        }

        isSaving = true
        errorMessage = nil
        successMessage = nil
        validationErrors = []
        planUpdated = false
        targetChanges = nil

        // Save current state for rollback
        let previousState = savedProfile

        defer { isSaving = false }

        do {
            // Build unified request with all changed fields
            let request = buildUnifiedRequest()

            // Log for debugging
            Logger.info("Saving profile with changes: \(request.changedFields.joined(separator: ", "))")

            // Make single API call
            let response: ProfileUpdateResponse = try await apiClient.request(.updateProfileData(request))

            // Update plan state
            if let updated = response.planUpdated, updated {
                planUpdated = true
                targetChanges = response.changes
            }

            // Show success toast with plan impact
            toastPlanWillUpdate = planUpdated
            toastTargetChanges = targetChanges
            showSuccessToast = true

            // Trigger haptic feedback
            let generator = UINotificationFeedbackGenerator()
            generator.notificationOccurred(.success)

            // Reload profile to get fresh data
            await loadProfile()

            Logger.info("Profile saved successfully. Plan updated: \(planUpdated)")
            return true

        } catch let error as APIError {
            // Rollback on error
            if let previous = previousState {
                populateFields(from: previous)
            }

            Logger.error("Failed to save profile: \(error.localizedDescription)")
            errorMessage = error.localizedDescription

            // Error haptic
            let generator = UINotificationFeedbackGenerator()
            generator.notificationOccurred(.error)

            return false
        } catch {
            // Rollback on error
            if let previous = previousState {
                populateFields(from: previous)
            }

            Logger.error("Failed to save profile: \(error.localizedDescription)")
            errorMessage = "Failed to save profile"

            // Error haptic
            let generator = UINotificationFeedbackGenerator()
            generator.notificationOccurred(.error)

            return false
        }
    }

    // MARK: - Request Builder

    private func buildUnifiedRequest() -> ProfileUpdateRequest {
        // Configure formatter to match API format (with fractional seconds)
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]

        guard let original = originalProfile else {
            // If no original profile, send all fields
            return ProfileUpdateRequest(
                dateOfBirth: formatter.string(from: dateOfBirth),
                gender: gender.rawValue,
                height: Double(heightCm),
                currentWeight: Double(currentWeightKg),
                targetWeight: Double(targetWeightKg),
                primaryGoal: primaryGoal.rawValue,
                targetDate: formatter.string(from: targetDate),
                activityLevel: activityLevel.rawValue,
                dietaryPreferences: dietaryPreferences.isEmpty ? nil : dietaryPreferences,
                allergies: allergies.isEmpty ? nil : allergies,
                mealsPerDay: mealsPerDay
            )
        }

        // Build request with only changed fields
        return ProfileUpdateRequest(
            dateOfBirth: {
                let dob = formatter.string(from: dateOfBirth)
                return dob != original.demographics?.dateOfBirth ? dob : nil
            }(),
            gender: {
                let newGender = gender.rawValue
                return newGender != original.demographics?.gender ? newGender : nil
            }(),
            height: {
                guard let height = Double(heightCm) else { return nil }
                if let originalHeight = original.demographics?.height {
                    return abs(height - originalHeight) > 0.1 ? height : nil
                }
                return height
            }(),
            currentWeight: {
                guard let weight = Double(currentWeightKg) else { return nil }
                if let originalWeight = original.health?.currentWeight {
                    return abs(weight - originalWeight) > 0.1 ? weight : nil
                }
                return weight
            }(),
            targetWeight: {
                guard let target = Double(targetWeightKg) else { return nil }
                if let originalTarget = original.health?.targetWeight {
                    return abs(target - originalTarget) > 0.1 ? target : nil
                }
                return target
            }(),
            primaryGoal: {
                let newGoal = primaryGoal.rawValue
                return newGoal != original.goals?.primaryGoal ? newGoal : nil
            }(),
            targetDate: {
                let targetDateStr = formatter.string(from: targetDate)
                return targetDateStr != original.goals?.targetDate ? targetDateStr : nil
            }(),
            activityLevel: {
                let newActivity = activityLevel.rawValue
                return newActivity != original.goals?.activityLevel ? newActivity : nil
            }(),
            dietaryPreferences: {
                let newPrefs = dietaryPreferences
                let originalPrefs = original.preferences?.dietaryPreferences ?? []
                return newPrefs != originalPrefs ? (newPrefs.isEmpty ? nil : newPrefs) : nil
            }(),
            allergies: {
                let newAllergies = allergies
                let originalAllergies = original.preferences?.allergies ?? []
                return newAllergies != originalAllergies ? (newAllergies.isEmpty ? nil : newAllergies) : nil
            }(),
            mealsPerDay: {
                let newMeals = mealsPerDay
                let originalMeals = original.preferences?.mealsPerDay ?? 3
                return newMeals != originalMeals ? newMeals : nil
            }()
        )
    }


    // MARK: - Field-Specific Error Messages

    func errorMessage(for field: String) -> String? {
        validationErrors.first(where: { $0.field == field })?.message
    }

    var nameError: String? {
        errorMessage(for: "name")
    }

    var emailError: String? {
        errorMessage(for: "email")
    }

    var ageError: String? {
        errorMessage(for: "age")
    }

    var heightError: String? {
        errorMessage(for: "height")
    }

    var currentWeightError: String? {
        errorMessage(for: "currentWeight")
    }

    var targetWeightError: String? {
        errorMessage(for: "targetWeight")
    }

    var mealsPerDayError: String? {
        errorMessage(for: "mealsPerDay")
    }
}
