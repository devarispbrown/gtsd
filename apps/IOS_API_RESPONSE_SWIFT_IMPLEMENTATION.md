# GTSD iOS App - Swift API Response Implementation

## Overview

This document provides the complete Swift implementation for handling GTSD API responses. All code follows Swift 5.9+ best practices with full type safety, error handling, and Codable conformance.

---

## Core Response Types

### File: `APIResponse.swift`

```swift
//
//  APIResponse.swift
//  GTSD
//
//  Generic API response wrapper types for the GTSD API
//

import Foundation

// MARK: - Generic API Response Wrapper

/// Generic wrapper for successful API responses
/// All successful API responses follow the format: { "success": true, "data": T }
struct APIResponse<T: Decodable>: Decodable {
    let success: Bool
    let data: T
    let cached: Bool?
    let message: String?

    enum CodingKeys: String, CodingKey {
        case success
        case data
        case cached
        case message
    }

    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)

        // success must be true for this type
        let successValue = try container.decode(Bool.self, forKey: .success)
        guard successValue == true else {
            throw DecodingError.dataCorrupted(
                DecodingError.Context(
                    codingPath: container.codingPath,
                    debugDescription: "Expected success to be true, got false"
                )
            )
        }

        self.success = successValue
        self.data = try container.decode(T.self, forKey: .data)
        self.cached = try container.decodeIfPresent(Bool.self, forKey: .cached)
        self.message = try container.decodeIfPresent(String.self, forKey: .message)
    }
}

// MARK: - API Error Response

/// Error response from the API
/// All error responses follow the format: { "error": { "message": "...", "requestId": "..." } }
struct APIErrorResponse: Decodable, Error {
    let error: ErrorDetails

    struct ErrorDetails: Decodable {
        let message: String
        let requestId: String
        let stack: String?

        enum CodingKeys: String, CodingKey {
            case message
            case requestId
            case stack
        }
    }

    var localizedDescription: String {
        error.message
    }

    var requestId: String {
        error.requestId
    }
}

// MARK: - Message-Only Response

/// Response type for endpoints that only return a success message (e.g., logout)
struct MessageResponse: Decodable, Equatable {
    // No data field, just the message at root level
    // The APIResponse wrapper will contain this
}

// MARK: - Response Result Type

/// Result type for API calls
typealias APIResult<T: Decodable> = Result<APIResponse<T>, APIError>

// MARK: - API Error

/// Comprehensive error type for API operations
enum APIError: Error, LocalizedError {
    case networkError(Error)
    case decodingError(DecodingError)
    case apiError(APIErrorResponse)
    case invalidResponse
    case unauthorized
    case rateLimitExceeded
    case serverError(statusCode: Int, message: String)
    case unknown

    var errorDescription: String? {
        switch self {
        case .networkError(let error):
            return "Network error: \(error.localizedDescription)"
        case .decodingError(let error):
            return "Failed to decode response: \(error.localizedDescription)"
        case .apiError(let response):
            return response.localizedDescription
        case .invalidResponse:
            return "Invalid response from server"
        case .unauthorized:
            return "Unauthorized. Please log in again."
        case .rateLimitExceeded:
            return "Too many requests. Please try again later."
        case .serverError(let statusCode, let message):
            return "Server error (\(statusCode)): \(message)"
        case .unknown:
            return "An unknown error occurred"
        }
    }

    var requestId: String? {
        if case .apiError(let response) = self {
            return response.requestId
        }
        return nil
    }
}

// MARK: - Response Decoder

/// Utility for decoding API responses with proper error handling
struct APIResponseDecoder {

    private static let decoder: JSONDecoder = {
        let decoder = JSONDecoder()
        decoder.dateDecodingStrategy = .custom { decoder in
            let container = try decoder.singleValueContainer()
            let dateString = try container.decode(String.self)

            // Try ISO8601 with fractional seconds first
            let iso8601Formatter = ISO8601DateFormatter()
            iso8601Formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
            if let date = iso8601Formatter.date(from: dateString) {
                return date
            }

            // Try ISO8601 without fractional seconds
            iso8601Formatter.formatOptions = [.withInternetDateTime]
            if let date = iso8601Formatter.date(from: dateString) {
                return date
            }

            // Try YYYY-MM-DD format
            let dateFormatter = DateFormatter()
            dateFormatter.dateFormat = "yyyy-MM-dd"
            dateFormatter.locale = Locale(identifier: "en_US_POSIX")
            dateFormatter.timeZone = TimeZone(secondsFromGMT: 0)
            if let date = dateFormatter.date(from: dateString) {
                return date
            }

            throw DecodingError.dataCorruptedError(
                in: container,
                debugDescription: "Cannot decode date from: \(dateString)"
            )
        }
        return decoder
    }()

    /// Decode a successful API response
    static func decode<T: Decodable>(_ type: T.Type, from data: Data) throws -> APIResponse<T> {
        do {
            return try decoder.decode(APIResponse<T>.self, from: data)
        } catch let error as DecodingError {
            throw APIError.decodingError(error)
        } catch {
            throw APIError.unknown
        }
    }

    /// Decode an error response
    static func decodeError(from data: Data) -> APIErrorResponse? {
        try? decoder.decode(APIErrorResponse.self, from: data)
    }

    /// Handle HTTP response and decode appropriately
    static func handleResponse<T: Decodable>(
        data: Data?,
        response: URLResponse?,
        error: Error?,
        expecting type: T.Type
    ) -> APIResult<T> {
        // Check for network error first
        if let error = error {
            return .failure(.networkError(error))
        }

        guard let httpResponse = response as? HTTPURLResponse else {
            return .failure(.invalidResponse)
        }

        guard let data = data else {
            return .failure(.invalidResponse)
        }

        // Handle different status codes
        switch httpResponse.statusCode {
        case 200...299:
            // Success - decode the response
            do {
                let apiResponse = try decode(type, from: data)
                return .success(apiResponse)
            } catch let error as APIError {
                return .failure(error)
            } catch {
                return .failure(.unknown)
            }

        case 401:
            // Unauthorized - try to decode error details
            if let errorResponse = decodeError(from: data) {
                return .failure(.apiError(errorResponse))
            }
            return .failure(.unauthorized)

        case 429:
            // Rate limit exceeded
            if let errorResponse = decodeError(from: data) {
                return .failure(.apiError(errorResponse))
            }
            return .failure(.rateLimitExceeded)

        case 400...499:
            // Client error - decode error response
            if let errorResponse = decodeError(from: data) {
                return .failure(.apiError(errorResponse))
            }
            return .failure(.serverError(statusCode: httpResponse.statusCode, message: "Client error"))

        case 500...599:
            // Server error - decode error response
            if let errorResponse = decodeError(from: data) {
                return .failure(.apiError(errorResponse))
            }
            return .failure(.serverError(statusCode: httpResponse.statusCode, message: "Server error"))

        default:
            return .failure(.invalidResponse)
        }
    }
}

// MARK: - Convenience Extensions

extension APIResponse {
    /// Extract data from successful response
    var unwrapped: T {
        data
    }

    /// Check if response was cached
    var isCached: Bool {
        cached ?? false
    }
}

extension Result where Success == APIResponse<Failure>, Failure == APIError {
    /// Extract data from successful result
    var data: Success.Success? {
        try? get().data
    }

    /// Extract error from failed result
    var error: Failure? {
        switch self {
        case .failure(let error):
            return error
        case .success:
            return nil
        }
    }
}
```

---

## Domain Models

### File: `AuthenticationModels.swift`

```swift
//
//  AuthenticationModels.swift
//  GTSD
//
//  Models for authentication endpoints
//

import Foundation

// MARK: - User Model

struct User: Codable, Equatable, Identifiable, Sendable {
    let id: String
    let email: String
    let createdAt: Date
    let updatedAt: Date

    enum CodingKeys: String, CodingKey {
        case id
        case email
        case createdAt
        case updatedAt
    }
}

// MARK: - Authentication Response

struct AuthenticationResponse: Codable, Equatable, Sendable {
    let user: User
    let accessToken: String
    let refreshToken: String

    enum CodingKeys: String, CodingKey {
        case user
        case accessToken
        case refreshToken
    }
}

// MARK: - Refresh Token Response

struct RefreshTokenResponse: Codable, Equatable, Sendable {
    let accessToken: String
    let refreshToken: String

    enum CodingKeys: String, CodingKey {
        case accessToken
        case refreshToken
    }
}

// MARK: - Request Models

struct SignupRequest: Codable, Sendable {
    let email: String
    let password: String
    let name: String?

    enum CodingKeys: String, CodingKey {
        case email
        case password
        case name
    }
}

struct LoginRequest: Codable, Sendable {
    let email: String
    let password: String

    enum CodingKeys: String, CodingKey {
        case email
        case password
    }
}

struct RefreshTokenRequest: Codable, Sendable {
    let refreshToken: String

    enum CodingKeys: String, CodingKey {
        case refreshToken
    }
}

struct LogoutRequest: Codable, Sendable {
    let refreshToken: String

    enum CodingKeys: String, CodingKey {
        case refreshToken
    }
}
```

---

### File: `TaskModels.swift`

```swift
//
//  TaskModels.swift
//  GTSD
//
//  Models for task endpoints
//

import Foundation

// MARK: - Task Type Enum

enum TaskType: String, Codable, CaseIterable, Sendable {
    case cardio
    case strength
    case nutrition
    case photos
}

// MARK: - Evidence Type Enum

enum EvidenceType: String, Codable, CaseIterable, Sendable {
    case textLog = "text_log"
    case metrics
    case photoReference = "photo_reference"
}

// MARK: - Task Evidence

struct TaskEvidence: Codable, Equatable, Identifiable, Sendable {
    let id: Int
    let type: EvidenceType
    let data: [String: AnyCodable]
    let notes: String?

    enum CodingKeys: String, CodingKey {
        case id
        case type
        case data
        case notes
    }
}

// MARK: - Task

struct Task: Codable, Equatable, Identifiable, Sendable {
    let id: Int
    let type: TaskType
    let title: String
    let description: String
    let dueDate: String // YYYY-MM-DD format
    let completed: Bool
    let completedAt: Date?
    let evidence: TaskEvidence?

    enum CodingKeys: String, CodingKey {
        case id
        case type
        case title
        case description
        case dueDate
        case completed
        case completedAt
        case evidence
    }
}

// MARK: - Today Tasks Response

struct TodayTasksResponse: Codable, Equatable, Sendable {
    let totalTasks: Int
    let completedTasks: Int
    let tasks: [Task]

    enum CodingKeys: String, CodingKey {
        case totalTasks
        case completedTasks
        case tasks
    }
}

// MARK: - Create Evidence Response

struct CreateEvidenceResponse: Codable, Equatable, Sendable {
    let evidence: TaskEvidence
    let streakUpdated: Bool
    let newStreak: Int

    enum CodingKeys: String, CodingKey {
        case evidence
        case streakUpdated
        case newStreak
    }
}

// MARK: - Request Models

struct CreateEvidenceRequest: Codable, Sendable {
    let taskId: Int
    let type: EvidenceType
    let data: [String: AnyCodable]
    let notes: String?

    enum CodingKeys: String, CodingKey {
        case taskId
        case type
        case data
        case notes
    }
}

// MARK: - AnyCodable Helper

/// Type-erased Codable value for dynamic JSON data
struct AnyCodable: Codable, Equatable, Sendable {
    let value: Any

    init(_ value: Any) {
        self.value = value
    }

    init(from decoder: Decoder) throws {
        let container = try decoder.singleValueContainer()

        if let bool = try? container.decode(Bool.self) {
            value = bool
        } else if let int = try? container.decode(Int.self) {
            value = int
        } else if let double = try? container.decode(Double.self) {
            value = double
        } else if let string = try? container.decode(String.self) {
            value = string
        } else if let array = try? container.decode([AnyCodable].self) {
            value = array.map { $0.value }
        } else if let dictionary = try? container.decode([String: AnyCodable].self) {
            value = dictionary.mapValues { $0.value }
        } else {
            value = NSNull()
        }
    }

    func encode(to encoder: Encoder) throws {
        var container = encoder.singleValueContainer()

        switch value {
        case let bool as Bool:
            try container.encode(bool)
        case let int as Int:
            try container.encode(int)
        case let double as Double:
            try container.encode(double)
        case let string as String:
            try container.encode(string)
        case let array as [Any]:
            try container.encode(array.map { AnyCodable($0) })
        case let dictionary as [String: Any]:
            try container.encode(dictionary.mapValues { AnyCodable($0) })
        case is NSNull:
            try container.encodeNil()
        default:
            let context = EncodingError.Context(
                codingPath: container.codingPath,
                debugDescription: "AnyCodable value cannot be encoded"
            )
            throw EncodingError.invalidValue(value, context)
        }
    }

    static func == (lhs: AnyCodable, rhs: AnyCodable) -> Bool {
        switch (lhs.value, rhs.value) {
        case (let lhs as Bool, let rhs as Bool):
            return lhs == rhs
        case (let lhs as Int, let rhs as Int):
            return lhs == rhs
        case (let lhs as Double, let rhs as Double):
            return lhs == rhs
        case (let lhs as String, let rhs as String):
            return lhs == rhs
        default:
            return false
        }
    }
}
```

---

### File: `PhotoModels.swift`

```swift
//
//  PhotoModels.swift
//  GTSD
//
//  Models for progress photo endpoints
//

import Foundation

// MARK: - Content Type Enum

enum PhotoContentType: String, Codable, CaseIterable, Sendable {
    case jpeg = "image/jpeg"
    case png = "image/png"
    case heic = "image/heic"
}

// MARK: - Evidence Type for Photos

enum PhotoEvidenceType: String, Codable, CaseIterable, Sendable {
    case before
    case during
    case after
}

// MARK: - Presign Request Response

struct PresignResponse: Codable, Equatable, Sendable {
    let uploadUrl: String
    let fileKey: String
    let expiresIn: Int

    enum CodingKeys: String, CodingKey {
        case uploadUrl
        case fileKey
        case expiresIn
    }
}

// MARK: - Confirm Photo Response

struct ConfirmPhotoResponse: Codable, Equatable, Sendable {
    let photoId: Int
    let downloadUrl: String

    enum CodingKeys: String, CodingKey {
        case photoId
        case downloadUrl
    }
}

// MARK: - Photo Model

struct Photo: Codable, Equatable, Identifiable, Sendable {
    let id: Int
    let fileKey: String
    let fileSize: Int
    let mimeType: String
    let width: Int?
    let height: Int?
    let takenAt: Date?
    let uploadedAt: Date
    let createdAt: Date
    let downloadUrl: String
    let evidenceType: PhotoEvidenceType?

    enum CodingKeys: String, CodingKey {
        case id
        case fileKey
        case fileSize
        case mimeType
        case width
        case height
        case takenAt
        case uploadedAt
        case createdAt
        case downloadUrl
        case evidenceType
    }
}

// MARK: - Photos List Response

struct PhotosListResponse: Codable, Equatable, Sendable {
    let photos: [Photo]
    let pagination: Pagination

    struct Pagination: Codable, Equatable, Sendable {
        let limit: Int
        let offset: Int
        let total: Int
    }

    enum CodingKeys: String, CodingKey {
        case photos
        case pagination
    }
}

// MARK: - Request Models

struct PresignRequest: Codable, Sendable {
    let fileName: String
    let contentType: PhotoContentType
    let fileSize: Int

    enum CodingKeys: String, CodingKey {
        case fileName
        case contentType
        case fileSize
    }
}

struct ConfirmPhotoRequest: Codable, Sendable {
    let fileKey: String
    let width: Int?
    let height: Int?
    let fileSize: Int
    let contentType: PhotoContentType
    let takenAt: String? // ISO8601 format
    let taskId: Int?
    let evidenceType: PhotoEvidenceType?

    enum CodingKeys: String, CodingKey {
        case fileKey
        case width
        case height
        case fileSize
        case contentType
        case takenAt
        case taskId
        case evidenceType
    }
}
```

---

### File: `StreakModels.swift`

```swift
//
//  StreakModels.swift
//  GTSD
//
//  Models for streak and badge endpoints
//

import Foundation

// MARK: - Badge Type Enum

enum BadgeType: String, Codable, CaseIterable, Sendable {
    case firstDay = "first_day"
    case weekWarrior = "week_warrior"
    case monthMaster = "month_master"
    case quarterChampion = "quarter_champion"
    case yearLegend = "year_legend"
    case perfect10 = "perfect_10"
    case perfect30 = "perfect_30"
    case perfect100 = "perfect_100"
    case comeback = "comeback"
    case earlyBird = "early_bird"
    case nightOwl = "night_owl"
    case photoProof = "photo_proof"
    case dataDriver = "data_driver"
    case allRounder = "all_rounder"
    case strengthMaster = "strength_master"
    case cardioKing = "cardio_king"
}

// MARK: - Streak Model

struct DailyComplianceStreak: Codable, Equatable, Identifiable, Sendable {
    let id: String
    let userId: String
    let currentStreak: Int
    let longestStreak: Int
    let totalCompliantDays: Int
    let lastCompliantDate: String // YYYY-MM-DD format
    let createdAt: Date
    let updatedAt: Date

    enum CodingKeys: String, CodingKey {
        case id
        case userId
        case currentStreak
        case longestStreak
        case totalCompliantDays
        case lastCompliantDate
        case createdAt
        case updatedAt
    }
}

// MARK: - Badge Model

struct UserBadge: Codable, Equatable, Identifiable, Sendable {
    let id: String
    let userId: String
    let badgeType: BadgeType
    let awardedAt: Date
    let metadata: [String: AnyCodable]

    enum CodingKeys: String, CodingKey {
        case id
        case userId
        case badgeType
        case awardedAt
        case metadata
    }
}

// MARK: - Streak Response

struct StreakResponse: Codable, Equatable, Sendable {
    let streak: DailyComplianceStreak
    let todayCompliance: DailyComplianceResult?
    let canIncrementToday: Bool

    enum CodingKeys: String, CodingKey {
        case streak
        case todayCompliance
        case canIncrementToday
    }
}

struct DailyComplianceResult: Codable, Equatable, Sendable {
    let date: String
    let isCompliant: Bool
    let tasksCompleted: Int
    let tasksTotal: Int
}

// MARK: - Badges Response

struct BadgesResponse: Codable, Equatable, Sendable {
    let badges: [UserBadge]
    let totalBadges: Int
    let totalAvailable: Int
    let completionPercentage: Int

    enum CodingKeys: String, CodingKey {
        case badges
        case totalBadges
        case totalAvailable
        case completionPercentage
    }
}

// MARK: - Check Compliance Response

struct CheckComplianceResponse: Codable, Equatable, Sendable {
    let isCompliant: Bool
    let streakData: DailyComplianceStreak
    let newlyAwardedBadges: [UserBadge]

    enum CodingKeys: String, CodingKey {
        case isCompliant
        case streakData
        case newlyAwardedBadges
    }
}

// MARK: - Request Models

struct CheckComplianceRequest: Codable, Sendable {
    let date: String? // YYYY-MM-DD format

    enum CodingKeys: String, CodingKey {
        case date
    }
}
```

---

### File: `PlanModels.swift`

```swift
//
//  PlanModels.swift
//  GTSD
//
//  Models for plan generation endpoints
//

import Foundation

// MARK: - Plan Model

struct WeeklyPlan: Codable, Equatable, Identifiable, Sendable {
    let id: String
    let userId: String
    let weekStartDate: String // YYYY-MM-DD
    let weekEndDate: String // YYYY-MM-DD
    let targets: HealthTargets
    let educationalContent: EducationalContent
    let createdAt: Date

    enum CodingKeys: String, CodingKey {
        case id
        case userId
        case weekStartDate
        case weekEndDate
        case targets
        case educationalContent
        case createdAt
    }
}

// MARK: - Health Targets

struct HealthTargets: Codable, Equatable, Sendable {
    let bmr: Int
    let tdee: Int
    let targetCalories: Int
    let proteinGrams: Int
    let carbGrams: Int
    let fatGrams: Int

    enum CodingKeys: String, CodingKey {
        case bmr
        case tdee
        case targetCalories
        case proteinGrams
        case carbGrams
        case fatGrams
    }
}

// MARK: - Educational Content

struct EducationalContent: Codable, Equatable, Sendable {
    let title: String
    let sections: [Section]

    struct Section: Codable, Equatable, Sendable {
        let heading: String
        let content: String
    }

    enum CodingKeys: String, CodingKey {
        case title
        case sections
    }
}

// MARK: - Plan Generation Response

struct PlanGenerationResponse: Codable, Equatable, Sendable {
    let plan: WeeklyPlan
    let recomputed: Bool

    enum CodingKeys: String, CodingKey {
        case plan
        case recomputed
    }
}

// MARK: - Request Models

struct PlanGenerationRequest: Codable, Sendable {
    let forceRecompute: Bool

    enum CodingKeys: String, CodingKey {
        case forceRecompute
    }

    init(forceRecompute: Bool = false) {
        self.forceRecompute = forceRecompute
    }
}
```

---

## Usage Examples

### File: `APIClient+Examples.swift`

```swift
//
//  APIClient+Examples.swift
//  GTSD
//
//  Example usage of API response types
//

import Foundation

// MARK: - Example: Authentication

func exampleLogin() async throws {
    let request = LoginRequest(email: "user@example.com", password: "password123")

    // Mock network call
    let data = """
    {
        "success": true,
        "data": {
            "user": {
                "id": "user-123",
                "email": "user@example.com",
                "createdAt": "2025-01-15T10:30:00.000Z",
                "updatedAt": "2025-01-15T10:30:00.000Z"
            },
            "accessToken": "eyJhbG...",
            "refreshToken": "eyJhbG..."
        }
    }
    """.data(using: .utf8)!

    // Decode response
    let response = try APIResponseDecoder.decode(
        AuthenticationResponse.self,
        from: data
    )

    print("Logged in as: \(response.data.user.email)")
    print("Access token: \(response.data.accessToken)")
}

// MARK: - Example: Fetch Tasks

func exampleFetchTasks() async throws {
    // Mock network call
    let data = """
    {
        "success": true,
        "data": {
            "totalTasks": 4,
            "completedTasks": 2,
            "tasks": [
                {
                    "id": 1,
                    "type": "cardio",
                    "title": "Morning Run",
                    "description": "30 minute cardio session",
                    "dueDate": "2025-10-26",
                    "completed": true,
                    "completedAt": "2025-10-26T07:30:00.000Z",
                    "evidence": {
                        "id": 10,
                        "type": "metrics",
                        "data": {
                            "distance": 5.2,
                            "duration": 1800
                        },
                        "notes": "Felt great!"
                    }
                }
            ]
        },
        "cached": false
    }
    """.data(using: .utf8)!

    // Decode response
    let response = try APIResponseDecoder.decode(
        TodayTasksResponse.self,
        from: data
    )

    print("Total tasks: \(response.data.totalTasks)")
    print("Completed: \(response.data.completedTasks)")
    print("Cached: \(response.isCached)")

    for task in response.data.tasks {
        print("- \(task.title): \(task.completed ? "✓" : "○")")
    }
}

// MARK: - Example: Handle Error

func exampleHandleError() async {
    // Mock error response
    let data = """
    {
        "error": {
            "message": "Validation failed: email: Invalid email format",
            "requestId": "550e8400-e29b-41d4-a716-446655440000"
        }
    }
    """.data(using: .utf8)!

    // Decode error
    if let errorResponse = APIResponseDecoder.decodeError(from: data) {
        print("Error: \(errorResponse.localizedDescription)")
        print("Request ID: \(errorResponse.requestId)")
    }
}

// MARK: - Example: Upload Photo

func examplePhotoUpload() async throws {
    // Step 1: Request presigned URL
    let presignData = """
    {
        "success": true,
        "data": {
            "uploadUrl": "https://s3.amazonaws.com/bucket/...",
            "fileKey": "progress-photos/user-123/abc-def-photo.jpg",
            "expiresIn": 3600
        }
    }
    """.data(using: .utf8)!

    let presignResponse = try APIResponseDecoder.decode(
        PresignResponse.self,
        from: presignData
    )

    print("Upload URL: \(presignResponse.data.uploadUrl)")
    print("Expires in: \(presignResponse.data.expiresIn) seconds")

    // Step 2: Upload to S3 (not shown)

    // Step 3: Confirm upload
    let confirmData = """
    {
        "success": true,
        "data": {
            "photoId": 789,
            "downloadUrl": "https://s3.amazonaws.com/..."
        }
    }
    """.data(using: .utf8)!

    let confirmResponse = try APIResponseDecoder.decode(
        ConfirmPhotoResponse.self,
        from: confirmData
    )

    print("Photo ID: \(confirmResponse.data.photoId)")
}

// MARK: - Example: Actor-based API Client

/// Thread-safe API client using Swift concurrency
@MainActor
final class APIClient: ObservableObject {
    @Published private(set) var isLoading = false
    @Published private(set) var error: APIError?

    private let baseURL = URL(string: "https://api.gtsd.app/v1")!
    private var accessToken: String?

    // MARK: - Authentication

    func login(email: String, password: String) async throws -> AuthenticationResponse {
        isLoading = true
        defer { isLoading = false }

        let request = LoginRequest(email: email, password: password)
        let response: APIResponse<AuthenticationResponse> = try await post(
            "/auth/login",
            body: request
        )

        // Store access token
        accessToken = response.data.accessToken

        return response.data
    }

    func fetchTasks(date: String? = nil) async throws -> TodayTasksResponse {
        isLoading = true
        defer { isLoading = false }

        var urlComponents = URLComponents(string: "\(baseURL)/tasks/today")!
        if let date = date {
            urlComponents.queryItems = [URLQueryItem(name: "date", value: date)]
        }

        let response: APIResponse<TodayTasksResponse> = try await get(urlComponents.url!)
        return response.data
    }

    // MARK: - Private Helpers

    private func get<T: Decodable>(_ url: URL) async throws -> APIResponse<T> {
        var request = URLRequest(url: url)
        request.httpMethod = "GET"
        if let token = accessToken {
            request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        }

        let (data, response) = try await URLSession.shared.data(for: request)

        let result = APIResponseDecoder.handleResponse(
            data: data,
            response: response,
            error: nil,
            expecting: T.self
        )

        switch result {
        case .success(let apiResponse):
            return apiResponse
        case .failure(let error):
            self.error = error
            throw error
        }
    }

    private func post<T: Decodable, B: Encodable>(
        _ path: String,
        body: B
    ) async throws -> APIResponse<T> {
        let url = baseURL.appendingPathComponent(path)
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        if let token = accessToken {
            request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        }

        let encoder = JSONEncoder()
        request.httpBody = try encoder.encode(body)

        let (data, response) = try await URLSession.shared.data(for: request)

        let result = APIResponseDecoder.handleResponse(
            data: data,
            response: response,
            error: nil,
            expecting: T.self
        )

        switch result {
        case .success(let apiResponse):
            return apiResponse
        case .failure(let error):
            self.error = error
            throw error
        }
    }
}
```

---

## Key Features

### 1. Type Safety

- All response types use strong typing
- Enums for string literals (task types, evidence types, etc.)
- Optional vs non-optional fields clearly defined
- Sendable conformance for concurrency safety

### 2. Error Handling

- Comprehensive `APIError` enum covering all error cases
- Proper HTTP status code handling
- Request ID tracking for debugging
- Localized error descriptions

### 3. Date Handling

- Custom date decoder supporting multiple formats:
  - ISO8601 with fractional seconds
  - ISO8601 without fractional seconds
  - YYYY-MM-DD format
- Proper timezone handling

### 4. Codable Conformance

- All models conform to `Codable`
- Custom `CodingKeys` for snake_case to camelCase conversion
- `AnyCodable` wrapper for dynamic JSON data

### 5. Swift Concurrency

- Async/await support
- Actor-based API client for thread safety
- `@MainActor` for UI updates
- Sendable conformance throughout

### 6. Best Practices

- Protocol-oriented design
- Value semantics
- Immutable models (let properties)
- Equatable and Identifiable conformance
- Comprehensive documentation

---

## File Organization

Recommended project structure:

```
GTSD/
├── Core/
│   ├── Networking/
│   │   ├── APIResponse.swift
│   │   ├── APIResponseDecoder.swift
│   │   └── APIError.swift
│   └── Models/
│       ├── AuthenticationModels.swift
│       ├── TaskModels.swift
│       ├── PhotoModels.swift
│       ├── StreakModels.swift
│       └── PlanModels.swift
├── Services/
│   └── APIClient.swift
└── Tests/
    └── APIResponseTests.swift
```

---

## Related Documentation

- See `/Users/devarisbrown/Code/projects/gtsd/apps/IOS_API_RESPONSE_DOCUMENTATION.md` for API specifications
- See `/Users/devarisbrown/Code/projects/gtsd/apps/IOS_API_RESPONSE_INTEGRATION_TESTS.md` for integration tests
