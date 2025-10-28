//
//  OnboardingModels.swift
//  GTSD
//
//  Created by Claude on 2025-10-26.
//

import Foundation

// MARK: - Onboarding Data Models

struct OnboardingData: Codable {
    var currentWeight: Double?
    var height: Double?
    var dateOfBirth: Date?
    var gender: Gender?
    var customGender: String?  // For when gender is "other"
    var targetWeight: Double?
    var targetDate: Date?
    var activityLevel: ActivityLevel?
    var primaryGoal: PrimaryGoal?
    var dietaryPreferences: [String]?
    var allergies: [String]?
    var mealsPerDay: Int = 3

    enum Gender: String, Codable, CaseIterable {
        case male = "male"
        case female = "female"
        case other = "other"

        var displayName: String {
            switch self {
            case .male: return "Male"
            case .female: return "Female"
            case .other: return "Other"
            }
        }
    }

    enum ActivityLevel: String, Codable, CaseIterable {
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
            case .sedentary: return "Little or no exercise"
            case .lightlyActive: return "Exercise 1-3 days/week"
            case .moderatelyActive: return "Exercise 3-5 days/week"
            case .veryActive: return "Exercise 6-7 days/week"
            case .extremelyActive: return "Physical job or training twice/day"
            }
        }
    }

    enum PrimaryGoal: String, Codable, CaseIterable {
        case loseWeight = "lose_weight"
        case gainMuscle = "gain_muscle"
        case maintain = "maintain"
        case improveHealth = "improve_health"

        var displayName: String {
            switch self {
            case .loseWeight: return "Lose Weight"
            case .gainMuscle: return "Gain Muscle"
            case .maintain: return "Maintain Weight"
            case .improveHealth: return "Improve Health"
            }
        }
    }
}

// MARK: - Onboarding Request

struct CompleteOnboardingRequest: Codable {
    let dateOfBirth: String  // ISO 8601 format
    let gender: String
    let primaryGoal: String
    let targetWeight: Double
    let targetDate: String  // ISO 8601 format
    let activityLevel: String
    let currentWeight: Double
    let height: Double
    let dietaryPreferences: [String]
    let allergies: [String]
    let mealsPerDay: Int
}
