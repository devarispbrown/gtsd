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
