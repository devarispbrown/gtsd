//
//  ProfileUpdateRequest.swift
//  GTSD
//
//  Created by Claude on 2025-11-01.
//  Unified request model for PUT /v1/profile endpoint
//

import Foundation

/// Unified request model for PUT /v1/profile
/// All fields are optional - only include what changed
/// Matches backend schema for profile updates
nonisolated(unsafe) struct ProfileUpdateRequest: Codable, Sendable {
    // MARK: - Demographics
    let dateOfBirth: String?       // ISO 8601: "1990-05-15"
    let gender: String?            // "male", "female", "other", "prefer_not_to_say"
    let height: Double?            // cm (120.0 - 250.0)

    // MARK: - Health Metrics
    let currentWeight: Double?     // kg (30.0 - 300.0)
    let targetWeight: Double?      // kg (30.0 - 300.0)

    // MARK: - Goals
    let primaryGoal: String?       // "lose_weight", "gain_muscle", "maintain", "improve_health"
    let targetDate: String?        // ISO 8601: "2025-12-31"
    let activityLevel: String?     // "sedentary", "lightly_active", "moderately_active", "very_active", "extremely_active"

    // MARK: - Preferences
    let dietaryPreferences: [String]?  // ["vegetarian", "gluten_free"]
    let allergies: [String]?           // ["peanuts", "shellfish"]
    let mealsPerDay: Int?              // 1-6

    // MARK: - Initializer
    init(
        dateOfBirth: String? = nil,
        gender: String? = nil,
        height: Double? = nil,
        currentWeight: Double? = nil,
        targetWeight: Double? = nil,
        primaryGoal: String? = nil,
        targetDate: String? = nil,
        activityLevel: String? = nil,
        dietaryPreferences: [String]? = nil,
        allergies: [String]? = nil,
        mealsPerDay: Int? = nil
    ) {
        self.dateOfBirth = dateOfBirth
        self.gender = gender
        self.height = height
        self.currentWeight = currentWeight
        self.targetWeight = targetWeight
        self.primaryGoal = primaryGoal
        self.targetDate = targetDate
        self.activityLevel = activityLevel
        self.dietaryPreferences = dietaryPreferences
        self.allergies = allergies
        self.mealsPerDay = mealsPerDay
    }

    // MARK: - Validation
    /// Returns true if at least one field has a value
    var hasChanges: Bool {
        dateOfBirth != nil ||
        gender != nil ||
        height != nil ||
        currentWeight != nil ||
        targetWeight != nil ||
        primaryGoal != nil ||
        targetDate != nil ||
        activityLevel != nil ||
        dietaryPreferences != nil ||
        allergies != nil ||
        mealsPerDay != nil
    }

    // MARK: - Debug
    var changedFields: [String] {
        var fields: [String] = []
        if dateOfBirth != nil { fields.append("dateOfBirth") }
        if gender != nil { fields.append("gender") }
        if height != nil { fields.append("height") }
        if currentWeight != nil { fields.append("currentWeight") }
        if targetWeight != nil { fields.append("targetWeight") }
        if primaryGoal != nil { fields.append("primaryGoal") }
        if targetDate != nil { fields.append("targetDate") }
        if activityLevel != nil { fields.append("activityLevel") }
        if dietaryPreferences != nil { fields.append("dietaryPreferences") }
        if allergies != nil { fields.append("allergies") }
        if mealsPerDay != nil { fields.append("mealsPerDay") }
        return fields
    }
}
