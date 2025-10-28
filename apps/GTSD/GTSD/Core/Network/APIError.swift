//
//  APIError.swift
//  GTSD
//
//  Created by Claude on 2025-10-26.
//

import Foundation

/// Comprehensive error type for all API-related errors
enum APIError: Error, LocalizedError, Sendable {
    case invalidURL
    case invalidResponse
    case networkError(Error)
    case decodingError(Error)
    case encodingError(Error)
    case httpError(statusCode: Int, message: String?)
    case unauthorized
    case forbidden
    case notFound
    case serverError
    case noData
    case unknown

    var errorDescription: String? {
        switch self {
        case .invalidURL:
            return "Invalid URL"
        case .invalidResponse:
            return "Invalid response from server"
        case .networkError(let error):
            return "Network error: \(error.localizedDescription)"
        case .decodingError(let error):
            return "Failed to decode response: \(error.localizedDescription)"
        case .encodingError(let error):
            return "Failed to encode request: \(error.localizedDescription)"
        case .httpError(let statusCode, let message):
            return message ?? "HTTP error \(statusCode)"
        case .unauthorized:
            return "Unauthorized. Please log in again."
        case .forbidden:
            return "Access forbidden"
        case .notFound:
            return "Resource not found"
        case .serverError:
            return "Server error. Please try again later."
        case .noData:
            return "No data received"
        case .unknown:
            return "An unknown error occurred"
        }
    }

    var isAuthenticationError: Bool {
        if case .unauthorized = self {
            return true
        }
        return false
    }
}
