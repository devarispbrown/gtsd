//
//  APIClient.swift
//  GTSD
//
//  Created by Claude on 2025-10-26.
//

import Foundation
import Combine

/// Main API client for all network requests with security features
@MainActor
final class APIClient: ObservableObject, APIClientProtocol {
    @Published private(set) var isLoading = false

    private let baseURL: String
    private let session: URLSession
    private var authToken: String?
    private var isRefreshingToken = false
    private weak var authService: (any AuthenticationServiceProtocol)?

    // Security components
    private let configuration: Configuration
    private let requestSigner: RequestSigner?

    /// Initialize API client with optional base URL
    init(baseURL: String? = nil, configuration: Configuration = .shared) {
        self.configuration = configuration

        // Load base URL from configuration
        if let configuredURL = baseURL {
            self.baseURL = configuredURL
        } else {
            self.baseURL = configuration.apiBaseURL
        }

        // Initialize request signer if enabled
        self.requestSigner = configuration.requestSigner

        // Create URLSession with certificate pinning
        self.session = configuration.createURLSession()

        Logger.log("APIClient initialized with base URL: \(self.baseURL)", level: .info)
        Logger.log("Security features - Cert Pinning: \(configuration.isCertificatePinningEnabled), Request Signing: \(configuration.isRequestSigningEnabled)", level: .info)
    }

    /// Set reference to auth service for token refresh
    func setAuthService(_ service: (any AuthenticationServiceProtocol)?) {
        self.authService = service
    }

    // MARK: - Token Management

    func setAuthToken(_ token: String?) {
        self.authToken = token
        Logger.log("Auth token \(token == nil ? "cleared" : "set")", level: .debug)
    }

    func getAuthToken() -> String? {
        return authToken
    }

    // MARK: - Request Methods

    /// Generic request method for endpoints that return data
    func request<T: Codable & Sendable>(
        _ endpoint: APIEndpoint
    ) async throws -> T {
        isLoading = true
        defer { isLoading = false }

        let request = try buildRequest(for: endpoint)

        Logger.log("[\(endpoint.method.rawValue)] \(request.url?.absoluteString ?? "unknown")", level: .debug)

        do {
            let (data, response) = try await session.data(for: request)

            guard let httpResponse = response as? HTTPURLResponse else {
                throw APIError.invalidResponse
            }

            Logger.log("Response status: \(httpResponse.statusCode)", level: .debug)

            // Handle HTTP errors
            guard (200...299).contains(httpResponse.statusCode) else {
                return try handleHTTPError(statusCode: httpResponse.statusCode, data: data)
            }

            // Decode response
            do {
                let decoder = JSONDecoder()
                decoder.dateDecodingStrategy = .iso8601

                // Try to decode as APIResponse wrapper first
                if let apiResponse = try? decoder.decode(APIResponse<T>.self, from: data) {
                    if apiResponse.success, let responseData = apiResponse.data {
                        return responseData
                    } else if let error = apiResponse.error {
                        throw APIError.httpError(statusCode: httpResponse.statusCode, message: error)
                    }
                }

                // If not wrapped, decode directly
                let result = try decoder.decode(T.self, from: data)
                return result

            } catch {
                Logger.log("Decoding error: \(error)", level: .error)
                throw APIError.decodingError(error)
            }

        } catch let error as APIError {
            throw error
        } catch {
            Logger.log("Network error: \(error)", level: .error)
            throw APIError.networkError(error)
        }
    }

    /// Request method for endpoints that don't return data (void responses)
    func requestVoid(_ endpoint: APIEndpoint) async throws {
        isLoading = true
        defer { isLoading = false }

        let request = try buildRequest(for: endpoint)

        Logger.log("[\(endpoint.method.rawValue)] \(request.url?.absoluteString ?? "unknown")", level: .debug)

        do {
            let (data, response) = try await session.data(for: request)

            guard let httpResponse = response as? HTTPURLResponse else {
                throw APIError.invalidResponse
            }

            Logger.log("Response status: \(httpResponse.statusCode)", level: .debug)

            guard (200...299).contains(httpResponse.statusCode) else {
                let _: EmptyResponse = try handleHTTPError(statusCode: httpResponse.statusCode, data: data)
                return
            }

        } catch let error as APIError {
            throw error
        } catch {
            Logger.log("Network error: \(error)", level: .error)
            throw APIError.networkError(error)
        }
    }

    /// Upload multipart form data (for photo uploads)
    func uploadMultipart<T: Codable & Sendable>(
        _ endpoint: APIEndpoint,
        imageData: Data,
        fileName: String = "photo.jpg",
        mimeType: String = "image/jpeg"
    ) async throws -> T {
        isLoading = true
        defer { isLoading = false }

        var request = try buildURLRequest(for: endpoint)

        let boundary = "Boundary-\(UUID().uuidString)"
        request.setValue("multipart/form-data; boundary=\(boundary)", forHTTPHeaderField: "Content-Type")

        var body = Data()

        // Add form fields - using safe Data conversion
        if case .uploadPhoto(let taskId, _, let caption) = endpoint {
            // Add taskId field
            body.append(try Data.from("--\(boundary)\r\n"))
            body.append(try Data.from("Content-Disposition: form-data; name=\"taskId\"\r\n\r\n"))
            body.append(try Data.from("\(taskId)\r\n"))

            // Add caption field if present
            if let caption = caption {
                body.append(try Data.from("--\(boundary)\r\n"))
                body.append(try Data.from("Content-Disposition: form-data; name=\"caption\"\r\n\r\n"))
                body.append(try Data.from("\(caption)\r\n"))
            }
        }

        // Add image data
        body.append(try Data.from("--\(boundary)\r\n"))
        body.append(try Data.from("Content-Disposition: form-data; name=\"photo\"; filename=\"\(fileName)\"\r\n"))
        body.append(try Data.from("Content-Type: \(mimeType)\r\n\r\n"))
        body.append(imageData)
        body.append(try Data.from("\r\n"))
        body.append(try Data.from("--\(boundary)--\r\n"))

        request.httpBody = body

        Logger.log("[\(endpoint.method.rawValue)] \(request.url?.absoluteString ?? "unknown") [multipart]", level: .debug)

        do {
            let (data, response) = try await session.data(for: request)

            guard let httpResponse = response as? HTTPURLResponse else {
                throw APIError.invalidResponse
            }

            Logger.log("Response status: \(httpResponse.statusCode)", level: .debug)

            guard (200...299).contains(httpResponse.statusCode) else {
                return try handleHTTPError(statusCode: httpResponse.statusCode, data: data)
            }

            let decoder = JSONDecoder()
            decoder.dateDecodingStrategy = .iso8601

            if let apiResponse = try? decoder.decode(APIResponse<T>.self, from: data) {
                if apiResponse.success, let responseData = apiResponse.data {
                    return responseData
                } else if let error = apiResponse.error {
                    throw APIError.httpError(statusCode: httpResponse.statusCode, message: error)
                }
            }

            return try decoder.decode(T.self, from: data)

        } catch let error as APIError {
            throw error
        } catch {
            Logger.log("Network error: \(error)", level: .error)
            throw APIError.networkError(error)
        }
    }

    // MARK: - Private Helpers

    private func buildRequest(for endpoint: APIEndpoint) throws -> URLRequest {
        return try buildURLRequest(for: endpoint)
    }

    private func buildURLRequest(for endpoint: APIEndpoint) throws -> URLRequest {
        guard var urlComponents = URLComponents(string: baseURL + endpoint.path) else {
            throw APIError.invalidURL
        }

        // Add query parameters
        if let queryItems = endpoint.queryItems() {
            urlComponents.queryItems = queryItems
        }

        guard let url = urlComponents.url else {
            throw APIError.invalidURL
        }

        var request = URLRequest(url: url)
        request.httpMethod = endpoint.method.rawValue

        // Add headers
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue("application/json", forHTTPHeaderField: "Accept")

        // Add device info headers
        let deviceInfo = configuration.deviceInfo
        request.setValue(deviceInfo["platform"], forHTTPHeaderField: "X-Platform")
        request.setValue(deviceInfo["osVersion"], forHTTPHeaderField: "X-OS-Version")
        request.setValue(deviceInfo["appVersion"], forHTTPHeaderField: "X-App-Version")
        request.setValue(deviceInfo["deviceModel"], forHTTPHeaderField: "X-Device-Model")

        // Add auth token if required
        if endpoint.requiresAuth, let token = authToken {
            request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        }

        // Add body if needed
        if let body = try endpoint.body() {
            request.httpBody = body
        }

        // Sign request if request signing is enabled
        if let requestSigner = requestSigner {
            do {
                request = try requestSigner.sign(request)
            } catch {
                Logger.error("Failed to sign request: \(error)")
                // Continue without signature in development, fail in production
                if configuration.environment.isProduction {
                    throw error
                }
            }
        }

        return request
    }

    private func handleHTTPError<T: Codable & Sendable>(statusCode: Int, data: Data) throws -> T {
        // Try to decode error message from response
        var errorMessage: String?

        if let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any] {
            // Check various error message formats
            if let error = json["error"] as? [String: Any],
               let message = error["message"] as? String {
                // Nested error object: { error: { message: "..." } }
                errorMessage = message
            } else if let message = json["message"] as? String {
                // Simple message: { message: "..." }
                errorMessage = message
            } else if let error = json["error"] as? String {
                // Simple error: { error: "..." }
                errorMessage = error
            }
        }

        // Create user-friendly messages with backend message if available
        switch statusCode {
        case 401:
            let message = errorMessage ?? "Invalid credentials. Please check your email and password."
            throw APIError.httpError(statusCode: 401, message: message)
        case 403:
            let message = errorMessage ?? "Access denied. You don't have permission to perform this action."
            throw APIError.httpError(statusCode: 403, message: message)
        case 404:
            let message = errorMessage ?? "The requested resource was not found."
            throw APIError.httpError(statusCode: 404, message: message)
        case 409:
            let message = errorMessage ?? "This resource already exists. Please try a different value."
            throw APIError.httpError(statusCode: 409, message: message)
        case 500...599:
            let message = errorMessage ?? "Server error. Please try again later."
            throw APIError.httpError(statusCode: statusCode, message: message)
        default:
            let message = errorMessage ?? "An error occurred. Please try again."
            throw APIError.httpError(statusCode: statusCode, message: message)
        }
    }

    // MARK: - Token Refresh

    /// Attempt to refresh token and retry request
    private func requestWithTokenRefresh<T: Codable & Sendable>(
        _ endpoint: APIEndpoint,
        retryCount: Int = 0
    ) async throws -> T {
        do {
            return try await request(endpoint)
        } catch APIError.unauthorized {
            // Only attempt refresh once
            guard retryCount == 0, !isRefreshingToken else {
                throw APIError.unauthorized
            }

            // Try to refresh token
            isRefreshingToken = true
            defer { isRefreshingToken = false }

            guard let authService = authService else {
                Logger.warning("No auth service available for token refresh")
                throw APIError.unauthorized
            }

            do {
                try await authService.refreshToken()
                // Retry the request with new token
                return try await requestWithTokenRefresh(endpoint, retryCount: retryCount + 1)
            } catch {
                Logger.error("Token refresh failed: \(error)")
                throw APIError.unauthorized
            }
        }
    }
}

// MARK: - Helper Extensions

private extension Data {
    /// Safely convert string to Data
    static func from(_ string: String, encoding: String.Encoding = .utf8) throws -> Data {
        guard let data = string.data(using: encoding) else {
            throw APIError.encodingError(NSError(
                domain: "APIClient",
                code: -1,
                userInfo: [NSLocalizedDescriptionKey: "Failed to encode string: \(string)"]
            ))
        }
        return data
    }
}
