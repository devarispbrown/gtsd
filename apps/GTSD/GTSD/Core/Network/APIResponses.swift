//
//  APIResponses.swift
//  GTSD
//
//  Created by Claude on 2025-10-29.
//  Centralized response models for API endpoints
//

import Foundation

// MARK: - Authentication Responses

/// Response for forgot password request
/// Note: nonisolated to prevent MainActor isolation inference
nonisolated(unsafe) struct ForgotPasswordResponse: Codable, Sendable {
    let success: Bool
    let message: String
}

/// Response for change password request
/// Note: nonisolated to prevent MainActor isolation inference
nonisolated(unsafe) struct ChangePasswordResponse: Codable, Sendable {
    let message: String
}

/// Response for update preferences request
/// Note: nonisolated to prevent MainActor isolation inference
nonisolated(unsafe) struct UpdatePreferencesResponse: Codable, Sendable {
    let success: Bool
    let message: String
    let data: PreferencesData

    struct PreferencesData: Codable, Sendable {
        let dietaryPreferences: [String]
        let allergies: [String]
        let mealsPerDay: Int
    }
}

// MARK: - Profile Responses

/// Wrapper for GET /v1/profile response
nonisolated(unsafe) struct GetProfileResponse: Codable, Sendable {
    let success: Bool
    let profile: ProfileResponse
}

/// Complete profile data structure
nonisolated(unsafe) struct ProfileResponse: Codable, Sendable {
    let user: UserBasic
    let demographics: Demographics?
    let health: HealthMetrics?
    let goals: Goals?
    let preferences: Preferences?
    let targets: NutritionTargets?

    struct UserBasic: Codable, Sendable {
        let id: Int
        let email: String
        let name: String
    }

    struct Demographics: Codable, Sendable {
        let dateOfBirth: String?
        let gender: String?
        let height: Double?
    }

    struct HealthMetrics: Codable, Sendable {
        let currentWeight: Double?
        let targetWeight: Double?
    }

    struct Goals: Codable, Sendable {
        let primaryGoal: String?
        let targetDate: String?
        let activityLevel: String?
    }

    struct Preferences: Codable, Sendable {
        let dietaryPreferences: [String]?
        let allergies: [String]?
        let mealsPerDay: Int?
    }

    struct NutritionTargets: Codable, Sendable {
        let bmr: Int?
        let tdee: Int?
        let calorieTarget: Int?
        let proteinTarget: Int?
        let waterTarget: Int?
    }

    /// Convert to User model
    func toUser() -> User {
        User(
            id: user.id,
            email: user.email,
            name: user.name,
            emailVerified: true,
            hasCompletedOnboarding: true,
            dietaryPreferences: preferences?.dietaryPreferences,
            allergies: preferences?.allergies,
            mealsPerDay: preferences?.mealsPerDay
        )
    }
}

/// Update response from profile endpoints
nonisolated(unsafe) struct ProfileUpdateResponse: Codable, Sendable {
    let success: Bool
    let profile: ProfileData?
    let planUpdated: Bool?
    let targets: TargetsChange?
    let changes: TargetChanges?
    let message: String?

    struct ProfileData: Codable, Sendable {
        let currentWeight: String?
        let targetWeight: String?
        let height: String?
        let dateOfBirth: String?
        let primaryGoal: String?
        let targetDate: String?
        let activityLevel: String?
        let dietaryPreferences: [String]?
        let allergies: [String]?
        let mealsPerDay: Int?
    }

    struct TargetsChange: Codable, Sendable {
        let calorieTarget: Int?
        let proteinTarget: Int?
        let waterTarget: Int?
    }

    struct TargetChanges: Codable, Sendable {
        let previousCalories: Int?
        let newCalories: Int?
        let previousProtein: Int?
        let newProtein: Int?
    }
}
