//
//  Photo.swift
//  GTSD
//
//  Created by Claude on 2025-10-26.
//

import Foundation
import Combine

/// Photo model matching backend schema
struct Photo: Codable, Identifiable, Sendable, Hashable {
    let id: String
    let userId: String
    let taskId: String
    let url: String
    let thumbnailUrl: String?
    let caption: String?
    let createdAt: Date
    let updatedAt: Date

    enum CodingKeys: String, CodingKey {
        case id
        case userId
        case taskId
        case url
        case thumbnailUrl
        case caption
        case createdAt
        case updatedAt
    }

    // Hashable conformance
    func hash(into hasher: inout Hasher) {
        hasher.combine(id)
    }

    static func == (lhs: Photo, rhs: Photo) -> Bool {
        lhs.id == rhs.id
    }
}

/// Photo upload response
struct PhotoUploadResponse: Codable, Sendable {
    let photo: Photo

    enum CodingKeys: String, CodingKey {
        case photo
    }
}

// MARK: - Photo Codable Extension
extension Photo {
    nonisolated init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        self.id = try container.decode(String.self, forKey: .id)
        self.userId = try container.decode(String.self, forKey: .userId)
        self.taskId = try container.decode(String.self, forKey: .taskId)
        self.url = try container.decode(String.self, forKey: .url)
        self.thumbnailUrl = try container.decodeIfPresent(String.self, forKey: .thumbnailUrl)
        self.caption = try container.decodeIfPresent(String.self, forKey: .caption)
        self.createdAt = try container.decode(Date.self, forKey: .createdAt)
        self.updatedAt = try container.decode(Date.self, forKey: .updatedAt)
    }

    nonisolated func encode(to encoder: Encoder) throws {
        var container = encoder.container(keyedBy: CodingKeys.self)
        try container.encode(id, forKey: .id)
        try container.encode(userId, forKey: .userId)
        try container.encode(taskId, forKey: .taskId)
        try container.encode(url, forKey: .url)
        try container.encodeIfPresent(thumbnailUrl, forKey: .thumbnailUrl)
        try container.encodeIfPresent(caption, forKey: .caption)
        try container.encode(createdAt, forKey: .createdAt)
        try container.encode(updatedAt, forKey: .updatedAt)
    }
}

// MARK: - PhotoUploadResponse Codable Extension
extension PhotoUploadResponse {
    nonisolated init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        self.photo = try container.decode(Photo.self, forKey: .photo)
    }

    nonisolated func encode(to encoder: Encoder) throws {
        var container = encoder.container(keyedBy: CodingKeys.self)
        try container.encode(photo, forKey: .photo)
    }
}
