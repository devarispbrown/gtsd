//
//  APIResponse.swift
//  GTSD
//
//  Created by Claude on 2025-10-26.
//

import Foundation

/// Generic API response wrapper matching the backend format
struct APIResponse<T: Codable & Sendable>: Codable, Sendable {
    let success: Bool
    let data: T?
    let error: String?
    let message: String?

    enum CodingKeys: String, CodingKey {
        case success
        case data
        case error
        case message
    }
}

/// Empty response for endpoints that don't return data
struct EmptyResponse: Codable, Sendable {
    let success: Bool?
}

/// Pagination metadata
struct PaginationMeta: Codable, Sendable {
    let total: Int
    let page: Int
    let limit: Int
    let totalPages: Int
}

/// Paginated response wrapper
struct PaginatedResponse<T: Codable & Sendable>: Codable, Sendable {
    let items: [T]
    let meta: PaginationMeta

    enum CodingKeys: String, CodingKey {
        case items
        case meta
    }
}

// MARK: - APIResponse Codable Extension
extension APIResponse {
    nonisolated init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        self.success = try container.decode(Bool.self, forKey: .success)
        self.data = try container.decodeIfPresent(T.self, forKey: .data)
        self.error = try container.decodeIfPresent(String.self, forKey: .error)
        self.message = try container.decodeIfPresent(String.self, forKey: .message)
    }

    nonisolated func encode(to encoder: Encoder) throws {
        var container = encoder.container(keyedBy: CodingKeys.self)
        try container.encode(success, forKey: .success)
        try container.encodeIfPresent(data, forKey: .data)
        try container.encodeIfPresent(error, forKey: .error)
        try container.encodeIfPresent(message, forKey: .message)
    }
}

// MARK: - EmptyResponse Codable Extension
extension EmptyResponse {
    nonisolated init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        self.success = try container.decodeIfPresent(Bool.self, forKey: .success)
    }

    nonisolated func encode(to encoder: Encoder) throws {
        var container = encoder.container(keyedBy: CodingKeys.self)
        try container.encodeIfPresent(success, forKey: .success)
    }

    enum CodingKeys: String, CodingKey {
        case success
    }
}

// MARK: - PaginationMeta Codable Extension
extension PaginationMeta {
    nonisolated init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        self.total = try container.decode(Int.self, forKey: .total)
        self.page = try container.decode(Int.self, forKey: .page)
        self.limit = try container.decode(Int.self, forKey: .limit)
        self.totalPages = try container.decode(Int.self, forKey: .totalPages)
    }

    nonisolated func encode(to encoder: Encoder) throws {
        var container = encoder.container(keyedBy: CodingKeys.self)
        try container.encode(total, forKey: .total)
        try container.encode(page, forKey: .page)
        try container.encode(limit, forKey: .limit)
        try container.encode(totalPages, forKey: .totalPages)
    }

    enum CodingKeys: String, CodingKey {
        case total
        case page
        case limit
        case totalPages
    }
}

// MARK: - PaginatedResponse Codable Extension
extension PaginatedResponse {
    nonisolated init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        self.items = try container.decode([T].self, forKey: .items)
        self.meta = try container.decode(PaginationMeta.self, forKey: .meta)
    }

    nonisolated func encode(to encoder: Encoder) throws {
        var container = encoder.container(keyedBy: CodingKeys.self)
        try container.encode(items, forKey: .items)
        try container.encode(meta, forKey: .meta)
    }
}
