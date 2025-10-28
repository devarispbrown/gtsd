//
//  APIClientProtocol.swift
//  GTSD
//
//  Created by Claude on 2025-10-27.
//

import Foundation

/// Protocol for API client to enable dependency injection and testing
@MainActor
protocol APIClientProtocol: ObservableObject {
    /// Current loading state
    var isLoading: Bool { get }

    /// Set authentication token
    func setAuthToken(_ token: String?)

    /// Get current authentication token
    func getAuthToken() -> String?

    /// Generic request method for endpoints that return data
    func request<T: Codable & Sendable>(_ endpoint: APIEndpoint) async throws -> T

    /// Request method for endpoints that don't return data
    func requestVoid(_ endpoint: APIEndpoint) async throws

    /// Upload multipart form data (for photo uploads)
    func uploadMultipart<T: Codable & Sendable>(
        _ endpoint: APIEndpoint,
        imageData: Data,
        fileName: String,
        mimeType: String
    ) async throws -> T
}

// MARK: - Default Parameters Extension

extension APIClientProtocol {
    /// Upload multipart form data with default fileName and mimeType
    func uploadMultipart<T: Codable & Sendable>(
        _ endpoint: APIEndpoint,
        imageData: Data,
        fileName: String = "photo.jpg",
        mimeType: String = "image/jpeg"
    ) async throws -> T {
        try await uploadMultipart(endpoint, imageData: imageData, fileName: fileName, mimeType: mimeType)
    }
}
