//
//  User.swift
//  GTSD
//
//  Created by Claude on 2025-10-26.
//

import Foundation
import Combine

/// User model matching backend schema
struct User: Codable, Identifiable, Sendable {
    let id: String
    let email: String
    let name: String
    let emailVerified: Bool
    let hasCompletedOnboarding: Bool
    let createdAt: Date?
    let updatedAt: Date?

    // Dietary preferences
    let dietaryPreferences: [String]?
    let allergies: [String]?
    let mealsPerDay: Int?

    enum CodingKeys: String, CodingKey {
        case id
        case email
        case name
        case emailVerified
        case hasCompletedOnboarding
        case createdAt
        case updatedAt
        case dietaryPreferences
        case allergies
        case mealsPerDay
    }

    /// Initialize from integer ID (for auth responses)
    init(id: Int, email: String, name: String, emailVerified: Bool, hasCompletedOnboarding: Bool = false, createdAt: Date? = nil, updatedAt: Date? = nil, dietaryPreferences: [String]? = nil, allergies: [String]? = nil, mealsPerDay: Int? = nil) {
        self.id = String(id)
        self.email = email
        self.name = name
        self.emailVerified = emailVerified
        self.hasCompletedOnboarding = hasCompletedOnboarding
        self.createdAt = createdAt
        self.updatedAt = updatedAt
        self.dietaryPreferences = dietaryPreferences
        self.allergies = allergies
        self.mealsPerDay = mealsPerDay
    }

    /// Initialize from string ID (for other endpoints)
    init(id: String, email: String, name: String, emailVerified: Bool, hasCompletedOnboarding: Bool = false, createdAt: Date? = nil, updatedAt: Date? = nil, dietaryPreferences: [String]? = nil, allergies: [String]? = nil, mealsPerDay: Int? = nil) {
        self.id = id
        self.email = email
        self.name = name
        self.emailVerified = emailVerified
        self.hasCompletedOnboarding = hasCompletedOnboarding
        self.createdAt = createdAt
        self.updatedAt = updatedAt
        self.dietaryPreferences = dietaryPreferences
        self.allergies = allergies
        self.mealsPerDay = mealsPerDay
    }
}

/// Authentication response with tokens
struct AuthResponse: Codable, Sendable {
    let user: User
    let accessToken: String
    let refreshToken: String?

    enum CodingKeys: String, CodingKey {
        case user
        case accessToken
        case refreshToken
    }
}

/// User profile with additional statistics
struct UserProfile: Codable, Sendable {
    let user: User
    let stats: UserStats?
    let currentStreak: Int?
    let longestStreak: Int?
    let totalBadges: Int?

    enum CodingKeys: String, CodingKey {
        case user
        case stats
        case currentStreak
        case longestStreak
        case totalBadges
    }
}

/// User statistics
struct UserStats: Codable, Sendable {
    let totalTasks: Int
    let completedTasks: Int
    let pendingTasks: Int
    let inProgressTasks: Int
    let totalPhotos: Int
    let currentStreak: Int
    let longestStreak: Int
    let totalBadges: Int

    enum CodingKeys: String, CodingKey {
        case totalTasks
        case completedTasks
        case pendingTasks
        case inProgressTasks
        case totalPhotos
        case currentStreak
        case longestStreak
        case totalBadges
    }
}

// MARK: - User Codable Extension
extension User {
    nonisolated init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)

        // Handle ID as either Int or String
        if let intId = try? container.decode(Int.self, forKey: .id) {
            self.id = String(intId)
        } else {
            self.id = try container.decode(String.self, forKey: .id)
        }

        self.email = try container.decode(String.self, forKey: .email)
        self.name = try container.decode(String.self, forKey: .name)
        self.emailVerified = try container.decode(Bool.self, forKey: .emailVerified)
        self.hasCompletedOnboarding = (try? container.decode(Bool.self, forKey: .hasCompletedOnboarding)) ?? false
        self.createdAt = try? container.decodeIfPresent(Date.self, forKey: .createdAt)
        self.updatedAt = try? container.decodeIfPresent(Date.self, forKey: .updatedAt)
        self.dietaryPreferences = try? container.decodeIfPresent([String].self, forKey: .dietaryPreferences)
        self.allergies = try? container.decodeIfPresent([String].self, forKey: .allergies)
        self.mealsPerDay = try? container.decodeIfPresent(Int.self, forKey: .mealsPerDay)
    }

    nonisolated func encode(to encoder: Encoder) throws {
        var container = encoder.container(keyedBy: CodingKeys.self)
        try container.encode(id, forKey: .id)
        try container.encode(email, forKey: .email)
        try container.encode(name, forKey: .name)
        try container.encode(emailVerified, forKey: .emailVerified)
        try container.encode(hasCompletedOnboarding, forKey: .hasCompletedOnboarding)
        try container.encodeIfPresent(createdAt, forKey: .createdAt)
        try container.encodeIfPresent(updatedAt, forKey: .updatedAt)
        try container.encodeIfPresent(dietaryPreferences, forKey: .dietaryPreferences)
        try container.encodeIfPresent(allergies, forKey: .allergies)
        try container.encodeIfPresent(mealsPerDay, forKey: .mealsPerDay)
    }
}

// MARK: - AuthResponse Codable Extension
extension AuthResponse {
    nonisolated init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        self.user = try container.decode(User.self, forKey: .user)
        self.accessToken = try container.decode(String.self, forKey: .accessToken)
        self.refreshToken = try container.decodeIfPresent(String.self, forKey: .refreshToken)
    }

    nonisolated func encode(to encoder: Encoder) throws {
        var container = encoder.container(keyedBy: CodingKeys.self)
        try container.encode(user, forKey: .user)
        try container.encode(accessToken, forKey: .accessToken)
        try container.encodeIfPresent(refreshToken, forKey: .refreshToken)
    }
}

// MARK: - UserProfile Codable Extension
extension UserProfile {
    nonisolated init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        self.user = try container.decode(User.self, forKey: .user)
        self.stats = try container.decodeIfPresent(UserStats.self, forKey: .stats)
        self.currentStreak = try container.decodeIfPresent(Int.self, forKey: .currentStreak)
        self.longestStreak = try container.decodeIfPresent(Int.self, forKey: .longestStreak)
        self.totalBadges = try container.decodeIfPresent(Int.self, forKey: .totalBadges)
    }

    nonisolated func encode(to encoder: Encoder) throws {
        var container = encoder.container(keyedBy: CodingKeys.self)
        try container.encode(user, forKey: .user)
        try container.encodeIfPresent(stats, forKey: .stats)
        try container.encodeIfPresent(currentStreak, forKey: .currentStreak)
        try container.encodeIfPresent(longestStreak, forKey: .longestStreak)
        try container.encodeIfPresent(totalBadges, forKey: .totalBadges)
    }
}

// MARK: - UserStats Codable Extension
extension UserStats {
    nonisolated init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        self.totalTasks = try container.decode(Int.self, forKey: .totalTasks)
        self.completedTasks = try container.decode(Int.self, forKey: .completedTasks)
        self.pendingTasks = try container.decode(Int.self, forKey: .pendingTasks)
        self.inProgressTasks = try container.decode(Int.self, forKey: .inProgressTasks)
        self.totalPhotos = try container.decode(Int.self, forKey: .totalPhotos)
        self.currentStreak = try container.decode(Int.self, forKey: .currentStreak)
        self.longestStreak = try container.decode(Int.self, forKey: .longestStreak)
        self.totalBadges = try container.decode(Int.self, forKey: .totalBadges)
    }

    nonisolated func encode(to encoder: Encoder) throws {
        var container = encoder.container(keyedBy: CodingKeys.self)
        try container.encode(totalTasks, forKey: .totalTasks)
        try container.encode(completedTasks, forKey: .completedTasks)
        try container.encode(pendingTasks, forKey: .pendingTasks)
        try container.encode(inProgressTasks, forKey: .inProgressTasks)
        try container.encode(totalPhotos, forKey: .totalPhotos)
        try container.encode(currentStreak, forKey: .currentStreak)
        try container.encode(longestStreak, forKey: .longestStreak)
        try container.encode(totalBadges, forKey: .totalBadges)
    }
}
