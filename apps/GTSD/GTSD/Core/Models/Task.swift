//
//  Task.swift
//  GTSD
//
//  Created by Claude on 2025-10-26.
//

import Foundation
import Combine

/// Task model matching backend schema
struct Task: Codable, Identifiable, Sendable, Hashable {
    let id: String
    let userId: String
    let title: String
    let description: String?
    let category: String
    let status: String
    let priority: String?
    let dueDate: Date?
    let completedAt: Date?
    let createdAt: Date
    let updatedAt: Date
    let photoCount: Int?

    enum CodingKeys: String, CodingKey {
        case id
        case userId
        case title
        case description
        case category
        case status
        case priority
        case dueDate
        case completedAt
        case createdAt
        case updatedAt
        case photoCount
    }

    // Computed properties for convenience
    var taskCategory: TaskCategory {
        TaskCategory(rawValue: category) ?? .other
    }

    var taskStatus: TaskStatus {
        TaskStatus(rawValue: status) ?? .pending
    }

    var taskPriority: TaskPriority? {
        guard let priority = priority else { return nil }
        return TaskPriority(rawValue: priority)
    }

    var isCompleted: Bool {
        taskStatus == .completed
    }

    var isOverdue: Bool {
        guard let dueDate = dueDate, !isCompleted else { return false }
        return dueDate < Date()
    }

    // Hashable conformance
    func hash(into hasher: inout Hasher) {
        hasher.combine(id)
    }

    static func == (lhs: Task, rhs: Task) -> Bool {
        lhs.id == rhs.id
    }
}

/// Task creation request
struct CreateTaskRequest: Codable, Sendable {
    let title: String
    let description: String?
    let category: String
    let priority: String?
    let dueDate: Date?
}

/// Task update request
struct UpdateTaskRequest: Codable, Sendable {
    let title: String?
    let description: String?
    let category: String?
    let status: String?
    let priority: String?
    let dueDate: Date?
}

// MARK: - Task Codable Extension
extension Task {
    nonisolated init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        self.id = try container.decode(String.self, forKey: .id)
        self.userId = try container.decode(String.self, forKey: .userId)
        self.title = try container.decode(String.self, forKey: .title)
        self.description = try container.decodeIfPresent(String.self, forKey: .description)
        self.category = try container.decode(String.self, forKey: .category)
        self.status = try container.decode(String.self, forKey: .status)
        self.priority = try container.decodeIfPresent(String.self, forKey: .priority)
        self.dueDate = try container.decodeIfPresent(Date.self, forKey: .dueDate)
        self.completedAt = try container.decodeIfPresent(Date.self, forKey: .completedAt)
        self.createdAt = try container.decode(Date.self, forKey: .createdAt)
        self.updatedAt = try container.decode(Date.self, forKey: .updatedAt)
        self.photoCount = try container.decodeIfPresent(Int.self, forKey: .photoCount)
    }

    nonisolated func encode(to encoder: Encoder) throws {
        var container = encoder.container(keyedBy: CodingKeys.self)
        try container.encode(id, forKey: .id)
        try container.encode(userId, forKey: .userId)
        try container.encode(title, forKey: .title)
        try container.encodeIfPresent(description, forKey: .description)
        try container.encode(category, forKey: .category)
        try container.encode(status, forKey: .status)
        try container.encodeIfPresent(priority, forKey: .priority)
        try container.encodeIfPresent(dueDate, forKey: .dueDate)
        try container.encodeIfPresent(completedAt, forKey: .completedAt)
        try container.encode(createdAt, forKey: .createdAt)
        try container.encode(updatedAt, forKey: .updatedAt)
        try container.encodeIfPresent(photoCount, forKey: .photoCount)
    }
}
