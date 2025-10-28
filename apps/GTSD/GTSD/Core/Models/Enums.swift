//
//  Enums.swift
//  GTSD
//
//  Created by Claude on 2025-10-26.
//

import Foundation

/// Task status enumeration
enum TaskStatus: String, Codable, CaseIterable, Sendable {
    case pending = "pending"
    case inProgress = "in-progress"
    case completed = "completed"
    case archived = "archived"

    var displayName: String {
        switch self {
        case .pending: return "Pending"
        case .inProgress: return "In Progress"
        case .completed: return "Completed"
        case .archived: return "Archived"
        }
    }
}

/// Task category enumeration
enum TaskCategory: String, Codable, CaseIterable, Sendable {
    case work = "work"
    case personal = "personal"
    case health = "health"
    case finance = "finance"
    case education = "education"
    case other = "other"

    var displayName: String {
        switch self {
        case .work: return "Work"
        case .personal: return "Personal"
        case .health: return "Health"
        case .finance: return "Finance"
        case .education: return "Education"
        case .other: return "Other"
        }
    }

    var icon: String {
        switch self {
        case .work: return "briefcase.fill"
        case .personal: return "person.fill"
        case .health: return "heart.fill"
        case .finance: return "dollarsign.circle.fill"
        case .education: return "book.fill"
        case .other: return "square.grid.2x2.fill"
        }
    }
}

/// Task priority enumeration
enum TaskPriority: String, Codable, CaseIterable, Sendable {
    case low = "low"
    case medium = "medium"
    case high = "high"
    case urgent = "urgent"

    var displayName: String {
        switch self {
        case .low: return "Low"
        case .medium: return "Medium"
        case .high: return "High"
        case .urgent: return "Urgent"
        }
    }

    var sortOrder: Int {
        switch self {
        case .urgent: return 0
        case .high: return 1
        case .medium: return 2
        case .low: return 3
        }
    }
}

/// Badge rarity levels
enum BadgeRarity: String, Codable, Sendable {
    case common = "common"
    case rare = "rare"
    case epic = "epic"
    case legendary = "legendary"
}

/// Badge categories
enum BadgeCategory: String, Codable, Sendable {
    case streaks = "streaks"
    case tasks = "tasks"
    case photos = "photos"
    case special = "special"
}
