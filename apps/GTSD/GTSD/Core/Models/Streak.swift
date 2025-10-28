//
//  Streak.swift
//  GTSD
//
//  Created by Claude on 2025-10-26.
//

import Foundation
import Combine

/// Backend streak response wrapper (matches GetMyStreakResponse)
struct CurrentStreak: Codable, Sendable {
    let streak: StreakData
    let todayCompliance: DailyCompliance?
    let canIncrementToday: Bool

    enum CodingKeys: String, CodingKey {
        case streak
        case todayCompliance
        case canIncrementToday
    }

    // Convenience accessors for backward compatibility
    var userId: String { String(streak.userId) }
    var currentStreak: Int { streak.currentStreak }
    var longestStreak: Int { streak.longestStreak }
    var lastActivityDate: Date? { streak.lastComplianceDate }
    var streakActive: Bool { streak.currentStreak > 0 }
}

/// Streak data (matches DailyComplianceStreak from backend)
struct StreakData: Codable, Sendable {
    let id: Int
    let userId: Int
    let currentStreak: Int
    let longestStreak: Int
    let totalCompliantDays: Int
    let lastComplianceDate: Date?
    let streakStartDate: Date?
    let createdAt: Date
    let updatedAt: Date

    enum CodingKeys: String, CodingKey {
        case id, userId, currentStreak, longestStreak, totalCompliantDays
        case lastComplianceDate, streakStartDate, createdAt, updatedAt
    }
}

/// Daily compliance information
struct DailyCompliance: Codable, Sendable {
    let date: String
    let totalTasks: Int
    let completedTasks: Int
    let completionPercentage: Double
    let isCompliant: Bool

    enum CodingKeys: String, CodingKey {
        case date, totalTasks, completedTasks, completionPercentage, isCompliant
    }
}

/// Streak history entry
struct StreakHistory: Codable, Identifiable, Sendable, Hashable {
    let id: String
    let userId: String
    let date: Date
    let tasksCompleted: Int
    let photosUploaded: Int
    let streakCount: Int
    let createdAt: Date

    enum CodingKeys: String, CodingKey {
        case id
        case userId
        case date
        case tasksCompleted
        case photosUploaded
        case streakCount
        case createdAt
    }

    // Hashable conformance
    func hash(into hasher: inout Hasher) {
        hasher.combine(id)
    }

    static func == (lhs: StreakHistory, rhs: StreakHistory) -> Bool {
        lhs.id == rhs.id
    }
}

/// Badge model
struct Badge: Codable, Identifiable, Sendable, Hashable {
    let id: String
    let name: String
    let description: String
    let icon: String
    let category: String
    let rarity: String
    let requirement: Int
    let createdAt: Date
    let updatedAt: Date

    enum CodingKeys: String, CodingKey {
        case id
        case name
        case description
        case icon
        case category
        case rarity
        case requirement
        case createdAt
        case updatedAt
    }

    var badgeRarity: BadgeRarity {
        BadgeRarity(rawValue: rarity) ?? .common
    }

    var badgeCategory: BadgeCategory {
        BadgeCategory(rawValue: category) ?? .special
    }

    // Hashable conformance
    func hash(into hasher: inout Hasher) {
        hasher.combine(id)
    }

    static func == (lhs: Badge, rhs: Badge) -> Bool {
        lhs.id == rhs.id
    }
}

/// User badge (earned badge)
struct UserBadge: Codable, Identifiable, Sendable, Hashable {
    let id: String
    let userId: String
    let badgeId: String
    let earnedAt: Date
    let badge: Badge

    enum CodingKeys: String, CodingKey {
        case id
        case userId
        case badgeId
        case earnedAt
        case badge
    }

    // Hashable conformance
    func hash(into hasher: inout Hasher) {
        hasher.combine(id)
    }

    static func == (lhs: UserBadge, rhs: UserBadge) -> Bool {
        lhs.id == rhs.id
    }
}

// MARK: - CurrentStreak Codable Extension
extension CurrentStreak {
    nonisolated init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        self.streak = try container.decode(StreakData.self, forKey: .streak)
        self.todayCompliance = try container.decodeIfPresent(DailyCompliance.self, forKey: .todayCompliance)
        self.canIncrementToday = try container.decode(Bool.self, forKey: .canIncrementToday)
    }

    nonisolated func encode(to encoder: Encoder) throws {
        var container = encoder.container(keyedBy: CodingKeys.self)
        try container.encode(streak, forKey: .streak)
        try container.encodeIfPresent(todayCompliance, forKey: .todayCompliance)
        try container.encode(canIncrementToday, forKey: .canIncrementToday)
    }
}

// MARK: - StreakData Codable Extension
extension StreakData {
    nonisolated init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        self.id = try container.decode(Int.self, forKey: .id)
        // Handle userId as either Int or String
        if let intId = try? container.decode(Int.self, forKey: .userId) {
            self.userId = intId
        } else if let stringId = try? container.decode(String.self, forKey: .userId) {
            self.userId = Int(stringId) ?? 0
        } else {
            self.userId = 0
        }
        self.currentStreak = try container.decode(Int.self, forKey: .currentStreak)
        self.longestStreak = try container.decode(Int.self, forKey: .longestStreak)
        self.totalCompliantDays = try container.decode(Int.self, forKey: .totalCompliantDays)
        self.lastComplianceDate = try? container.decodeIfPresent(Date.self, forKey: .lastComplianceDate)
        self.streakStartDate = try? container.decodeIfPresent(Date.self, forKey: .streakStartDate)
        self.createdAt = try container.decode(Date.self, forKey: .createdAt)
        self.updatedAt = try container.decode(Date.self, forKey: .updatedAt)
    }

    nonisolated func encode(to encoder: Encoder) throws {
        var container = encoder.container(keyedBy: CodingKeys.self)
        try container.encode(id, forKey: .id)
        try container.encode(userId, forKey: .userId)
        try container.encode(currentStreak, forKey: .currentStreak)
        try container.encode(longestStreak, forKey: .longestStreak)
        try container.encode(totalCompliantDays, forKey: .totalCompliantDays)
        try container.encodeIfPresent(lastComplianceDate, forKey: .lastComplianceDate)
        try container.encodeIfPresent(streakStartDate, forKey: .streakStartDate)
        try container.encode(createdAt, forKey: .createdAt)
        try container.encode(updatedAt, forKey: .updatedAt)
    }
}

// MARK: - DailyCompliance Codable Extension
extension DailyCompliance {
    nonisolated init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        self.date = try container.decode(String.self, forKey: .date)
        self.totalTasks = try container.decode(Int.self, forKey: .totalTasks)
        self.completedTasks = try container.decode(Int.self, forKey: .completedTasks)
        self.completionPercentage = try container.decode(Double.self, forKey: .completionPercentage)
        self.isCompliant = try container.decode(Bool.self, forKey: .isCompliant)
    }

    nonisolated func encode(to encoder: Encoder) throws {
        var container = encoder.container(keyedBy: CodingKeys.self)
        try container.encode(date, forKey: .date)
        try container.encode(totalTasks, forKey: .totalTasks)
        try container.encode(completedTasks, forKey: .completedTasks)
        try container.encode(completionPercentage, forKey: .completionPercentage)
        try container.encode(isCompliant, forKey: .isCompliant)
    }
}

// MARK: - StreakHistory Codable Extension
extension StreakHistory {
    nonisolated init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        self.id = try container.decode(String.self, forKey: .id)
        self.userId = try container.decode(String.self, forKey: .userId)
        self.date = try container.decode(Date.self, forKey: .date)
        self.tasksCompleted = try container.decode(Int.self, forKey: .tasksCompleted)
        self.photosUploaded = try container.decode(Int.self, forKey: .photosUploaded)
        self.streakCount = try container.decode(Int.self, forKey: .streakCount)
        self.createdAt = try container.decode(Date.self, forKey: .createdAt)
    }

    nonisolated func encode(to encoder: Encoder) throws {
        var container = encoder.container(keyedBy: CodingKeys.self)
        try container.encode(id, forKey: .id)
        try container.encode(userId, forKey: .userId)
        try container.encode(date, forKey: .date)
        try container.encode(tasksCompleted, forKey: .tasksCompleted)
        try container.encode(photosUploaded, forKey: .photosUploaded)
        try container.encode(streakCount, forKey: .streakCount)
        try container.encode(createdAt, forKey: .createdAt)
    }
}

// MARK: - Badge Codable Extension
extension Badge {
    nonisolated init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        self.id = try container.decode(String.self, forKey: .id)
        self.name = try container.decode(String.self, forKey: .name)
        self.description = try container.decode(String.self, forKey: .description)
        self.icon = try container.decode(String.self, forKey: .icon)
        self.category = try container.decode(String.self, forKey: .category)
        self.rarity = try container.decode(String.self, forKey: .rarity)
        self.requirement = try container.decode(Int.self, forKey: .requirement)
        self.createdAt = try container.decode(Date.self, forKey: .createdAt)
        self.updatedAt = try container.decode(Date.self, forKey: .updatedAt)
    }

    nonisolated func encode(to encoder: Encoder) throws {
        var container = encoder.container(keyedBy: CodingKeys.self)
        try container.encode(id, forKey: .id)
        try container.encode(name, forKey: .name)
        try container.encode(description, forKey: .description)
        try container.encode(icon, forKey: .icon)
        try container.encode(category, forKey: .category)
        try container.encode(rarity, forKey: .rarity)
        try container.encode(requirement, forKey: .requirement)
        try container.encode(createdAt, forKey: .createdAt)
        try container.encode(updatedAt, forKey: .updatedAt)
    }
}

// MARK: - UserBadge Codable Extension
extension UserBadge {
    nonisolated init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        self.id = try container.decode(String.self, forKey: .id)
        self.userId = try container.decode(String.self, forKey: .userId)
        self.badgeId = try container.decode(String.self, forKey: .badgeId)
        self.earnedAt = try container.decode(Date.self, forKey: .earnedAt)
        self.badge = try container.decode(Badge.self, forKey: .badge)
    }

    nonisolated func encode(to encoder: Encoder) throws {
        var container = encoder.container(keyedBy: CodingKeys.self)
        try container.encode(id, forKey: .id)
        try container.encode(userId, forKey: .userId)
        try container.encode(badgeId, forKey: .badgeId)
        try container.encode(earnedAt, forKey: .earnedAt)
        try container.encode(badge, forKey: .badge)
    }
}
