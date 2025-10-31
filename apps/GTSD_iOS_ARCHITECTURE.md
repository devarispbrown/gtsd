# GTSD iOS Application - Swift Architecture

## Overview

This document provides a comprehensive Swift architecture for the GTSD (Get That Shredded Done) fitness tracking iOS application. The architecture leverages Swift 6+ features including async/await, actors, Sendable conformance, and modern concurrency patterns.

## Table of Contents

1. [Project Structure](#project-structure)
2. [Core Networking Layer](#core-networking-layer)
3. [Data Models](#data-models)
4. [Authentication Service](#authentication-service)
5. [Image Upload Service](#image-upload-service)
6. [State Management](#state-management)
7. [Repository Pattern](#repository-pattern)
8. [Dependency Injection](#dependency-injection)
9. [Error Handling](#error-handling)
10. [Testing Strategy](#testing-strategy)

---

## Project Structure

```
GTSDApp/
├── App/
│   ├── GTSDApp.swift                    # App entry point
│   └── AppDependencies.swift            # DI container
├── Core/
│   ├── Networking/
│   │   ├── APIClient.swift              # Base HTTP client
│   │   ├── APIEndpoint.swift            # Endpoint definitions
│   │   ├── APIError.swift               # Error types
│   │   └── HTTPMethod.swift             # HTTP methods enum
│   ├── Storage/
│   │   ├── KeychainManager.swift        # Secure storage
│   │   └── UserDefaultsManager.swift    # App preferences
│   └── Extensions/
│       ├── Date+Extensions.swift
│       └── Encodable+Extensions.swift
├── Domain/
│   ├── Models/
│   │   ├── User.swift
│   │   ├── Task.swift
│   │   ├── Evidence.swift
│   │   ├── Photo.swift
│   │   └── Enums.swift
│   └── Services/
│       ├── AuthenticationService.swift
│       ├── OnboardingService.swift
│       ├── TasksService.swift
│       ├── PhotoUploadService.swift
│       └── StreaksService.swift
├── Data/
│   └── Repositories/
│       ├── AuthRepository.swift
│       ├── TasksRepository.swift
│       ├── PhotoRepository.swift
│       └── UserRepository.swift
├── Presentation/
│   ├── Authentication/
│   │   ├── LoginView.swift
│   │   └── LoginViewModel.swift
│   ├── Onboarding/
│   │   ├── OnboardingView.swift
│   │   └── OnboardingViewModel.swift
│   └── Tasks/
│       ├── TasksListView.swift
│       └── TasksViewModel.swift
└── Resources/
    ├── Assets.xcassets
    └── Info.plist
```

---

## Core Networking Layer

### 1. APIClient.swift

```swift
import Foundation

/// Thread-safe API client using Swift 6 actors
actor APIClient {

    // MARK: - Properties

    private let baseURL: URL
    private let session: URLSession
    private let decoder: JSONDecoder
    private let encoder: JSONEncoder

    /// Token storage for automatic injection
    private var accessToken: String?

    /// Refresh token for token renewal
    private var refreshToken: String?

    /// Queue for token refresh to prevent duplicate requests
    private var tokenRefreshTask: Task<AuthTokens, Error>?

    // MARK: - Initialization

    init(
        baseURL: URL,
        session: URLSession = .shared,
        decoder: JSONDecoder = .gtsdDecoder,
        encoder: JSONEncoder = .gtsdEncoder
    ) {
        self.baseURL = baseURL
        self.session = session
        self.decoder = decoder
        self.encoder = encoder
    }

    // MARK: - Token Management

    func setTokens(access: String, refresh: String) {
        self.accessToken = access
        self.refreshToken = refresh
    }

    func clearTokens() {
        self.accessToken = nil
        self.refreshToken = nil
        self.tokenRefreshTask = nil
    }

    // MARK: - Request Execution

    /// Execute an API request with automatic token refresh
    func request<T: Decodable>(
        _ endpoint: APIEndpoint,
        authRequired: Bool = true
    ) async throws -> T {
        var request = try buildRequest(for: endpoint)

        // Add authentication if required
        if authRequired {
            guard let token = accessToken else {
                throw APIError.unauthorized(message: "No access token available")
            }
            request.addValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        }

        // Execute request with retry logic
        do {
            return try await execute(request)
        } catch APIError.unauthorized {
            // Token expired, attempt refresh
            guard authRequired else { throw APIError.unauthorized(message: "Authentication required") }

            try await refreshAccessToken()

            // Retry original request with new token
            guard let newToken = accessToken else {
                throw APIError.unauthorized(message: "Token refresh failed")
            }
            request.setValue("Bearer \(newToken)", forHTTPHeaderField: "Authorization")
            return try await execute(request)
        }
    }

    /// Execute request without response body (for DELETE, etc.)
    func requestVoid(
        _ endpoint: APIEndpoint,
        authRequired: Bool = true
    ) async throws {
        var request = try buildRequest(for: endpoint)

        if authRequired {
            guard let token = accessToken else {
                throw APIError.unauthorized(message: "No access token available")
            }
            request.addValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        }

        let (_, response) = try await session.data(for: request)
        try validateResponse(response, data: Data())
    }

    /// Upload data with progress tracking
    func upload<T: Decodable>(
        to url: URL,
        data: Data,
        contentType: String,
        progress: @escaping @Sendable (Double) -> Void
    ) async throws -> T {
        var request = URLRequest(url: url)
        request.httpMethod = "PUT"
        request.setValue(contentType, forHTTPHeaderField: "Content-Type")

        // Use delegate for progress tracking
        let delegate = UploadProgressDelegate(progressHandler: progress)
        let configuration = URLSessionConfiguration.default
        let uploadSession = URLSession(configuration: configuration, delegate: delegate, delegateQueue: nil)

        let (responseData, response) = try await uploadSession.upload(for: request, from: data)
        try validateResponse(response, data: responseData)

        return try decoder.decode(T.self, from: responseData)
    }

    // MARK: - Private Helpers

    private func buildRequest(for endpoint: APIEndpoint) throws -> URLRequest {
        let url = baseURL.appendingPathComponent(endpoint.path)
        var components = URLComponents(url: url, resolvingAgainstBaseURL: false)

        // Add query parameters
        if let queryItems = endpoint.queryItems, !queryItems.isEmpty {
            components?.queryItems = queryItems
        }

        guard let finalURL = components?.url else {
            throw APIError.invalidURL(endpoint.path)
        }

        var request = URLRequest(url: finalURL)
        request.httpMethod = endpoint.method.rawValue
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue("application/json", forHTTPHeaderField: "Accept")
        request.timeoutInterval = 30

        // Add custom headers
        endpoint.headers?.forEach { key, value in
            request.setValue(value, forHTTPHeaderField: key)
        }

        // Encode body if present
        if let body = endpoint.body {
            request.httpBody = try encoder.encode(body)
        }

        return request
    }

    private func execute<T: Decodable>(_ request: URLRequest) async throws -> T {
        let (data, response) = try await session.data(for: request)
        try validateResponse(response, data: data)

        // Handle API wrapper format: { success: true, data: T }
        let apiResponse = try decoder.decode(APIResponse<T>.self, from: data)

        guard apiResponse.success else {
            throw APIError.serverError(
                statusCode: (response as? HTTPURLResponse)?.statusCode ?? 500,
                message: "Server returned success: false"
            )
        }

        return apiResponse.data
    }

    private func validateResponse(_ response: URLResponse, data: Data) throws {
        guard let httpResponse = response as? HTTPURLResponse else {
            throw APIError.invalidResponse
        }

        switch httpResponse.statusCode {
        case 200...299:
            return
        case 401:
            throw APIError.unauthorized(message: "Unauthorized access")
        case 403:
            throw APIError.forbidden
        case 404:
            throw APIError.notFound
        case 429:
            throw APIError.rateLimitExceeded
        case 500...599:
            // Try to decode error message from server
            if let errorResponse = try? decoder.decode(ErrorResponse.self, from: data) {
                throw APIError.serverError(
                    statusCode: httpResponse.statusCode,
                    message: errorResponse.message ?? "Server error"
                )
            }
            throw APIError.serverError(statusCode: httpResponse.statusCode, message: "Server error")
        default:
            throw APIError.serverError(statusCode: httpResponse.statusCode, message: "Unknown error")
        }
    }

    private func refreshAccessToken() async throws {
        // Prevent duplicate refresh requests
        if let existingTask = tokenRefreshTask {
            _ = try await existingTask.value
            return
        }

        guard let refreshToken = self.refreshToken else {
            throw APIError.unauthorized(message: "No refresh token available")
        }

        // Create refresh task
        let task = Task<AuthTokens, Error> {
            let endpoint = APIEndpoint.refreshToken(refreshToken: refreshToken)
            let tokens: AuthTokens = try await self.requestWithoutAuth(endpoint)

            // Update stored tokens
            self.accessToken = tokens.accessToken
            self.refreshToken = tokens.refreshToken

            return tokens
        }

        self.tokenRefreshTask = task

        do {
            _ = try await task.value
            self.tokenRefreshTask = nil
        } catch {
            self.tokenRefreshTask = nil
            throw error
        }
    }

    /// Execute request without authentication (used for refresh)
    private func requestWithoutAuth<T: Decodable>(_ endpoint: APIEndpoint) async throws -> T {
        let request = try buildRequest(for: endpoint)
        return try await execute(request)
    }
}

// MARK: - Supporting Types

/// API response wrapper matching backend format
struct APIResponse<T: Decodable>: Decodable {
    let success: Bool
    let data: T
    let cached: Bool?

    enum CodingKeys: String, CodingKey {
        case success
        case data
        case cached
    }
}

/// Error response from API
struct ErrorResponse: Decodable {
    let success: Bool
    let message: String?
    let errors: [ValidationError]?

    struct ValidationError: Decodable {
        let field: String
        let message: String
    }
}

// MARK: - Upload Progress Delegate

private class UploadProgressDelegate: NSObject, URLSessionTaskDelegate, @unchecked Sendable {
    private let progressHandler: @Sendable (Double) -> Void

    init(progressHandler: @escaping @Sendable (Double) -> Void) {
        self.progressHandler = progressHandler
    }

    func urlSession(
        _ session: URLSession,
        task: URLSessionTask,
        didSendBodyData bytesSent: Int64,
        totalBytesSent: Int64,
        totalBytesExpectedToSend: Int64
    ) {
        let progress = Double(totalBytesSent) / Double(totalBytesExpectedToSend)
        progressHandler(progress)
    }
}

// MARK: - JSONDecoder/Encoder Extensions

extension JSONDecoder {
    static let gtsdDecoder: JSONDecoder = {
        let decoder = JSONDecoder()
        decoder.dateDecodingStrategy = .custom { decoder in
            let container = try decoder.singleValueContainer()
            let dateString = try container.decode(String.self)

            // Try ISO8601 with fractional seconds first
            let formatter = ISO8601DateFormatter()
            formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]

            if let date = formatter.date(from: dateString) {
                return date
            }

            // Fallback to standard ISO8601
            formatter.formatOptions = [.withInternetDateTime]
            if let date = formatter.date(from: dateString) {
                return date
            }

            throw DecodingError.dataCorruptedError(
                in: container,
                debugDescription: "Cannot decode date string \(dateString)"
            )
        }
        decoder.keyDecodingStrategy = .convertFromSnakeCase
        return decoder
    }()
}

extension JSONEncoder {
    static let gtsdEncoder: JSONEncoder = {
        let encoder = JSONEncoder()
        encoder.dateEncodingStrategy = .iso8601
        encoder.keyEncodingStrategy = .convertToSnakeCase
        return encoder
    }()
}
```

### 2. APIEndpoint.swift

```swift
import Foundation

/// API endpoint definitions matching GTSD API routes
struct APIEndpoint {
    let path: String
    let method: HTTPMethod
    let body: Encodable?
    let queryItems: [URLQueryItem]?
    let headers: [String: String]?

    init(
        path: String,
        method: HTTPMethod,
        body: Encodable? = nil,
        queryItems: [URLQueryItem]? = nil,
        headers: [String: String]? = nil
    ) {
        self.path = path
        self.method = method
        self.body = body
        self.queryItems = queryItems
        self.headers = headers
    }
}

// MARK: - Authentication Endpoints

extension APIEndpoint {
    static func signup(email: String, password: String, name: String) -> APIEndpoint {
        let body = SignupRequest(email: email, password: password, name: name)
        return APIEndpoint(path: "/auth/signup", method: .post, body: body)
    }

    static func login(email: String, password: String) -> APIEndpoint {
        let body = LoginRequest(email: email, password: password)
        return APIEndpoint(path: "/auth/login", method: .post, body: body)
    }

    static func refreshToken(refreshToken: String) -> APIEndpoint {
        let body = RefreshTokenRequest(refreshToken: refreshToken)
        return APIEndpoint(path: "/auth/refresh", method: .post, body: body)
    }

    static func logout(refreshToken: String) -> APIEndpoint {
        let body = LogoutRequest(refreshToken: refreshToken)
        return APIEndpoint(path: "/auth/logout", method: .post, body: body)
    }

    static var getCurrentUser: APIEndpoint {
        APIEndpoint(path: "/auth/me", method: .get)
    }
}

// MARK: - Onboarding Endpoints

extension APIEndpoint {
    static func completeOnboarding(data: OnboardingData) -> APIEndpoint {
        APIEndpoint(path: "/v1/onboarding", method: .post, body: data)
    }

    static var getHowItWorks: APIEndpoint {
        APIEndpoint(path: "/v1/summary/how-it-works", method: .get)
    }
}

// MARK: - Tasks Endpoints

extension APIEndpoint {
    static func getTodayTasks(
        date: String? = nil,
        limit: Int = 50,
        offset: Int = 0,
        type: String? = nil
    ) -> APIEndpoint {
        var queryItems: [URLQueryItem] = [
            URLQueryItem(name: "limit", value: "\(limit)"),
            URLQueryItem(name: "offset", value: "\(offset)")
        ]

        if let date = date {
            queryItems.append(URLQueryItem(name: "date", value: date))
        }

        if let type = type {
            queryItems.append(URLQueryItem(name: "type", value: type))
        }

        return APIEndpoint(
            path: "/v1/tasks/today",
            method: .get,
            queryItems: queryItems
        )
    }

    static func createEvidence(taskId: Int, type: EvidenceType, data: EvidenceData, notes: String? = nil) -> APIEndpoint {
        let body = CreateEvidenceRequest(
            taskId: taskId,
            type: type,
            data: data,
            notes: notes
        )
        return APIEndpoint(path: "/v1/evidence", method: .post, body: body)
    }
}

// MARK: - Photo Endpoints

extension APIEndpoint {
    static func requestPresignedURL(
        fileName: String,
        contentType: String,
        fileSize: Int
    ) -> APIEndpoint {
        let body = PresignRequest(
            fileName: fileName,
            contentType: contentType,
            fileSize: fileSize
        )
        return APIEndpoint(path: "/v1/progress/photo/presign", method: .post, body: body)
    }

    static func confirmPhoto(
        fileKey: String,
        fileSize: Int,
        contentType: String,
        width: Int? = nil,
        height: Int? = nil,
        takenAt: Date? = nil,
        taskId: Int? = nil,
        evidenceType: String? = nil
    ) -> APIEndpoint {
        let body = ConfirmPhotoRequest(
            fileKey: fileKey,
            fileSize: fileSize,
            contentType: contentType,
            width: width,
            height: height,
            takenAt: takenAt?.iso8601String,
            taskId: taskId,
            evidenceType: evidenceType
        )
        return APIEndpoint(path: "/v1/progress/photo/confirm", method: .post, body: body)
    }

    static func getPhotos(limit: Int = 50, offset: Int = 0, taskId: Int? = nil) -> APIEndpoint {
        var queryItems = [
            URLQueryItem(name: "limit", value: "\(limit)"),
            URLQueryItem(name: "offset", value: "\(offset)")
        ]

        if let taskId = taskId {
            queryItems.append(URLQueryItem(name: "taskId", value: "\(taskId)"))
        }

        return APIEndpoint(path: "/v1/progress/photos", method: .get, queryItems: queryItems)
    }

    static func deletePhoto(photoId: Int) -> APIEndpoint {
        APIEndpoint(path: "/v1/progress/photo/\(photoId)", method: .delete)
    }
}

// MARK: - Streaks & Badges Endpoints

extension APIEndpoint {
    static var getMyStreaks: APIEndpoint {
        APIEndpoint(path: "/v1/streaks/me", method: .get)
    }

    static var getMyBadges: APIEndpoint {
        APIEndpoint(path: "/v1/badges/me", method: .get)
    }

    static func checkCompliance(date: String? = nil) -> APIEndpoint {
        let body = date.map { ["date": $0] }
        return APIEndpoint(path: "/v1/streaks/check-compliance", method: .post, body: body)
    }
}
```

### 3. HTTPMethod.swift

```swift
/// HTTP methods enum
enum HTTPMethod: String {
    case get = "GET"
    case post = "POST"
    case put = "PUT"
    case patch = "PATCH"
    case delete = "DELETE"
}
```

### 4. APIError.swift

```swift
import Foundation

/// Comprehensive API error types
enum APIError: LocalizedError, Equatable {
    case invalidURL(String)
    case invalidResponse
    case unauthorized(message: String)
    case forbidden
    case notFound
    case rateLimitExceeded
    case serverError(statusCode: Int, message: String)
    case networkError(Error)
    case decodingError(DecodingError)
    case encodingError(EncodingError)
    case validationError(fields: [String: String])
    case unknown(String)

    var errorDescription: String? {
        switch self {
        case .invalidURL(let url):
            return "Invalid URL: \(url)"
        case .invalidResponse:
            return "Invalid response from server"
        case .unauthorized(let message):
            return "Unauthorized: \(message)"
        case .forbidden:
            return "Access forbidden"
        case .notFound:
            return "Resource not found"
        case .rateLimitExceeded:
            return "Rate limit exceeded. Please try again later."
        case .serverError(let statusCode, let message):
            return "Server error (\(statusCode)): \(message)"
        case .networkError(let error):
            return "Network error: \(error.localizedDescription)"
        case .decodingError(let error):
            return "Failed to decode response: \(error.localizedDescription)"
        case .encodingError(let error):
            return "Failed to encode request: \(error.localizedDescription)"
        case .validationError(let fields):
            let fieldErrors = fields.map { "\($0.key): \($0.value)" }.joined(separator: ", ")
            return "Validation failed: \(fieldErrors)"
        case .unknown(let message):
            return "Unknown error: \(message)"
        }
    }

    var recoverySuggestion: String? {
        switch self {
        case .unauthorized:
            return "Please log in again"
        case .rateLimitExceeded:
            return "Wait a few minutes before trying again"
        case .networkError:
            return "Check your internet connection"
        case .serverError:
            return "Please try again later"
        default:
            return nil
        }
    }

    static func == (lhs: APIError, rhs: APIError) -> Bool {
        switch (lhs, rhs) {
        case (.invalidURL(let l), .invalidURL(let r)):
            return l == r
        case (.invalidResponse, .invalidResponse):
            return true
        case (.unauthorized(let l), .unauthorized(let r)):
            return l == r
        case (.forbidden, .forbidden):
            return true
        case (.notFound, .notFound):
            return true
        case (.rateLimitExceeded, .rateLimitExceeded):
            return true
        case (.serverError(let l1, let l2), .serverError(let r1, let r2)):
            return l1 == r1 && l2 == r2
        case (.validationError(let l), .validationError(let r)):
            return l == r
        case (.unknown(let l), .unknown(let r)):
            return l == r
        default:
            return false
        }
    }
}
```

---

## Data Models

### User.swift

```swift
import Foundation

// MARK: - User Entity

struct User: Codable, Identifiable, Sendable {
    let id: Int
    let email: String
    let name: String
    let isActive: Bool
    let createdAt: Date
    let updatedAt: Date
}

// MARK: - User Settings

struct UserSettings: Codable, Sendable {
    let id: Int
    let userId: Int

    // Account basics
    let dateOfBirth: Date?
    let gender: Gender?

    // Goals
    let primaryGoal: PrimaryGoal?
    let targetWeight: Double? // kg
    let targetDate: Date?
    let activityLevel: ActivityLevel?

    // Health metrics
    let currentWeight: Double? // kg
    let height: Double? // cm

    // Calculated values
    let bmr: Double? // Basal Metabolic Rate
    let tdee: Double? // Total Daily Energy Expenditure
    let calorieTarget: Double?
    let proteinTarget: Double? // grams/day
    let waterTarget: Double? // ml/day

    // Preferences
    let dietaryPreferences: [String]?
    let allergies: [String]?
    let mealsPerDay: Int

    // Onboarding
    let onboardingCompleted: Bool
    let onboardingCompletedAt: Date?

    let createdAt: Date
    let updatedAt: Date
}

// MARK: - User Profile (combines User + Settings)

struct UserProfile: Codable, Sendable {
    let user: User
    let settings: UserSettings?
    let requiresOnboarding: Bool

    var id: Int { user.id }
    var email: String { user.email }
    var name: String { user.name }
}
```

### Enums.swift

```swift
import Foundation

// MARK: - Gender

enum Gender: String, Codable, CaseIterable, Sendable {
    case male
    case female
    case other
}

// MARK: - Primary Goal

enum PrimaryGoal: String, Codable, CaseIterable, Sendable {
    case loseWeight = "lose_weight"
    case gainMuscle = "gain_muscle"
    case maintain
    case improveHealth = "improve_health"

    var displayName: String {
        switch self {
        case .loseWeight: return "Lose Weight"
        case .gainMuscle: return "Gain Muscle"
        case .maintain: return "Maintain Weight"
        case .improveHealth: return "Improve Health"
        }
    }
}

// MARK: - Activity Level

enum ActivityLevel: String, Codable, CaseIterable, Sendable {
    case sedentary
    case lightlyActive = "lightly_active"
    case moderatelyActive = "moderately_active"
    case veryActive = "very_active"
    case extremelyActive = "extremely_active"

    var displayName: String {
        switch self {
        case .sedentary: return "Sedentary (little to no exercise)"
        case .lightlyActive: return "Lightly Active (1-3 days/week)"
        case .moderatelyActive: return "Moderately Active (3-5 days/week)"
        case .veryActive: return "Very Active (6-7 days/week)"
        case .extremelyActive: return "Extremely Active (athlete)"
        }
    }

    var multiplier: Double {
        switch self {
        case .sedentary: return 1.2
        case .lightlyActive: return 1.375
        case .moderatelyActive: return 1.55
        case .veryActive: return 1.725
        case .extremelyActive: return 1.9
        }
    }
}

// MARK: - Task Type

enum TaskType: String, Codable, CaseIterable, Sendable {
    case workout
    case supplement
    case meal
    case hydration
    case cardio
    case weightLog = "weight_log"
    case progressPhoto = "progress_photo"

    var icon: String {
        switch self {
        case .workout: return "figure.strengthtraining.traditional"
        case .supplement: return "pills.fill"
        case .meal: return "fork.knife"
        case .hydration: return "drop.fill"
        case .cardio: return "figure.run"
        case .weightLog: return "scalemass.fill"
        case .progressPhoto: return "camera.fill"
        }
    }

    var displayName: String {
        switch self {
        case .workout: return "Workout"
        case .supplement: return "Supplement"
        case .meal: return "Meal"
        case .hydration: return "Hydration"
        case .cardio: return "Cardio"
        case .weightLog: return "Weight Log"
        case .progressPhoto: return "Progress Photo"
        }
    }
}

// MARK: - Task Status

enum TaskStatus: String, Codable, Sendable {
    case pending
    case inProgress = "in_progress"
    case completed
    case skipped

    var displayName: String {
        switch self {
        case .pending: return "Pending"
        case .inProgress: return "In Progress"
        case .completed: return "Completed"
        case .skipped: return "Skipped"
        }
    }
}

// MARK: - Evidence Type

enum EvidenceType: String, Codable, Sendable {
    case textLog = "text_log"
    case metrics
    case photoReference = "photo_reference"
}

// MARK: - Badge Type

enum BadgeType: String, Codable, CaseIterable, Sendable {
    // Current badges
    case dayOneDone = "day_one_done"

    // Streak badges
    case weekWarrior = "week_warrior"
    case consistencyKing = "consistency_king"
    case hundredClub = "hundred_club"
    case perfectMonth = "perfect_month"

    // Task-specific badges
    case hydrationNation = "hydration_nation"
    case proteinPro = "protein_pro"
    case workoutWarrior = "workout_warrior"
    case supplementChampion = "supplement_champion"
    case cardioKing = "cardio_king"

    // Time-based badges
    case earlyBird = "early_bird"
    case nightOwl = "night_owl"
    case weekendWarrior = "weekend_warrior"

    // Special badges
    case comebackKid = "comeback_kid"
    case milestoneMaster = "milestone_master"
    case photoFinisher = "photo_finisher"

    var displayName: String {
        switch self {
        case .dayOneDone: return "Day One Done"
        case .weekWarrior: return "Week Warrior"
        case .consistencyKing: return "Consistency King"
        case .hundredClub: return "100 Club"
        case .perfectMonth: return "Perfect Month"
        case .hydrationNation: return "Hydration Nation"
        case .proteinPro: return "Protein Pro"
        case .workoutWarrior: return "Workout Warrior"
        case .supplementChampion: return "Supplement Champion"
        case .cardioKing: return "Cardio King"
        case .earlyBird: return "Early Bird"
        case .nightOwl: return "Night Owl"
        case .weekendWarrior: return "Weekend Warrior"
        case .comebackKid: return "Comeback Kid"
        case .milestoneMaster: return "Milestone Master"
        case .photoFinisher: return "Photo Finisher"
        }
    }
}

// MARK: - Plan Status

enum PlanStatus: String, Codable, Sendable {
    case active
    case completed
    case archived
    case draft
}
```

### Task.swift

```swift
import Foundation

// MARK: - Daily Task

struct DailyTask: Codable, Identifiable, Sendable {
    let id: Int
    let userId: Int
    let planId: Int?
    let title: String
    let description: String?
    let taskType: TaskType
    let dueDate: Date
    let dueTime: String? // HH:MM:SS format
    let status: TaskStatus
    let completedAt: Date?
    let skippedAt: Date?
    let skipReason: String?
    let metadata: TaskMetadata?
    let priority: Int
    let order: Int
    let createdAt: Date
    let updatedAt: Date

    var isCompleted: Bool {
        status == .completed
    }

    var isOverdue: Bool {
        guard status == .pending || status == .inProgress else { return false }
        return dueDate < Date()
    }
}

// MARK: - Task Metadata

struct TaskMetadata: Codable, Sendable {
    // Workout metadata
    let exerciseName: String?
    let sets: Int?
    let reps: Int?
    let weight: Double?
    let duration: Int? // minutes

    // Meal metadata
    let mealType: String?
    let calories: Int?
    let protein: Double?
    let carbs: Double?
    let fats: Double?

    // Supplement metadata
    let supplementName: String?
    let dosage: String?
    let timing: String?

    // Hydration metadata
    let targetOunces: Int?
    let currentOunces: Int?
}

// MARK: - Evidence

struct Evidence: Codable, Identifiable, Sendable {
    let id: Int
    let taskId: Int
    let userId: Int
    let evidenceType: EvidenceType
    let notes: String?
    let metrics: EvidenceMetrics?
    let photoUrl: String?
    let photoStorageKey: String?
    let recordedAt: Date
    let createdAt: Date
    let updatedAt: Date
}

// MARK: - Evidence Metrics

struct EvidenceMetrics: Codable, Sendable {
    // Weight log metrics
    let weight: Double?
    let bodyFat: Double?

    // Workout metrics
    let sets: Int?
    let reps: Int?
    let weightLifted: Double?
    let duration: Int?

    // Meal metrics
    let calories: Int?
    let protein: Double?
    let carbs: Double?
    let fats: Double?

    // Hydration metrics
    let ouncesConsumed: Int?
}

// MARK: - Tasks Response

struct TodayTasksResponse: Codable, Sendable {
    let tasks: [TaskGroup]
    let totalTasks: Int
    let completedTasks: Int
    let completionPercentage: Double
    let date: String

    struct TaskGroup: Codable, Sendable {
        let type: TaskType
        let tasks: [DailyTask]
        let completed: Int
        let total: Int
    }
}

// MARK: - Create Evidence Request

struct CreateEvidenceRequest: Codable {
    let taskId: Int
    let type: EvidenceType
    let data: EvidenceData
    let notes: String?
}

struct EvidenceData: Codable {
    let text: String?
    let metrics: EvidenceMetrics?
    let photoUrl: String?
}

// MARK: - Create Evidence Response

struct CreateEvidenceResponse: Codable, Sendable {
    let evidence: Evidence
    let streakUpdated: Bool
    let newStreak: Int
}
```

### Photo.swift

```swift
import Foundation

// MARK: - Photo

struct Photo: Codable, Identifiable, Sendable {
    let id: Int
    let fileKey: String
    let fileSize: Int
    let mimeType: String
    let width: Int?
    let height: Int?
    let takenAt: Date?
    let uploadedAt: Date?
    let createdAt: Date
    let downloadUrl: String?
}

// MARK: - Presigned URL Request/Response

struct PresignRequest: Codable {
    let fileName: String
    let contentType: String
    let fileSize: Int
}

struct PresignedURLResponse: Codable, Sendable {
    let uploadUrl: String
    let fileKey: String
    let expiresIn: Int
}

// MARK: - Confirm Photo Request

struct ConfirmPhotoRequest: Codable {
    let fileKey: String
    let fileSize: Int
    let contentType: String
    let width: Int?
    let height: Int?
    let takenAt: String?
    let taskId: Int?
    let evidenceType: String?
}

// MARK: - Confirm Photo Response

struct ConfirmPhotoResponse: Codable, Sendable {
    let photoId: Int
    let downloadUrl: String
}

// MARK: - Photos List Response

struct PhotosListResponse: Codable, Sendable {
    let photos: [Photo]
    let pagination: Pagination

    struct Pagination: Codable, Sendable {
        let limit: Int
        let offset: Int
        let total: Int
    }
}
```

### Authentication.swift

```swift
import Foundation

// MARK: - Authentication Tokens

struct AuthTokens: Codable, Sendable {
    let accessToken: String
    let refreshToken: String
    let expiresIn: Int // seconds
    let tokenType: String // "Bearer"
}

// MARK: - Login/Signup Requests

struct LoginRequest: Codable {
    let email: String
    let password: String
}

struct SignupRequest: Codable {
    let email: String
    let password: String
    let name: String
}

struct RefreshTokenRequest: Codable {
    let refreshToken: String
}

struct LogoutRequest: Codable {
    let refreshToken: String
}

// MARK: - Authentication Responses

struct LoginResponse: Codable, Sendable {
    let user: User
    let tokens: AuthTokens
}

struct SignupResponse: Codable, Sendable {
    let user: User
    let tokens: AuthTokens
}
```

### Onboarding.swift

```swift
import Foundation

// MARK: - Onboarding Data

struct OnboardingData: Codable {
    let dateOfBirth: Date
    let gender: Gender
    let primaryGoal: PrimaryGoal
    let targetWeight: Double
    let targetDate: Date
    let activityLevel: ActivityLevel
    let currentWeight: Double
    let height: Double
    let dietaryPreferences: [String]
    let allergies: [String]
    let mealsPerDay: Int
    let partners: [PartnerData]
}

struct PartnerData: Codable {
    let name: String
    let email: String?
    let phone: String?
    let relationship: String?
}

// MARK: - Onboarding Response

struct OnboardingResponse: Codable, Sendable {
    let settings: UserSettings
    let projection: HealthProjection
}

struct HealthProjection: Codable, Sendable {
    let estimatedWeeks: Int
    let weeklyWeightChangeRate: Double
    let projectedCompletionDate: Date
}
```

---

## Authentication Service

### KeychainManager.swift

```swift
import Foundation
import Security

/// Thread-safe keychain manager using actor
actor KeychainManager {

    enum KeychainError: LocalizedError {
        case duplicateItem
        case itemNotFound
        case invalidData
        case unexpectedStatus(OSStatus)

        var errorDescription: String? {
            switch self {
            case .duplicateItem:
                return "Item already exists in keychain"
            case .itemNotFound:
                return "Item not found in keychain"
            case .invalidData:
                return "Invalid data format"
            case .unexpectedStatus(let status):
                return "Unexpected keychain status: \(status)"
            }
        }
    }

    private let service: String

    init(service: String = Bundle.main.bundleIdentifier ?? "com.gtsd.app") {
        self.service = service
    }

    // MARK: - Save

    func save(_ data: Data, for key: String) throws {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: key,
            kSecValueData as String: data,
            kSecAttrAccessible as String: kSecAttrAccessibleAfterFirstUnlock
        ]

        // Try to delete existing item first
        SecItemDelete(query as CFDictionary)

        let status = SecItemAdd(query as CFDictionary, nil)

        guard status == errSecSuccess else {
            throw KeychainError.unexpectedStatus(status)
        }
    }

    func save(_ string: String, for key: String) throws {
        guard let data = string.data(using: .utf8) else {
            throw KeychainError.invalidData
        }
        try save(data, for: key)
    }

    func save<T: Codable>(_ value: T, for key: String) throws {
        let data = try JSONEncoder().encode(value)
        try save(data, for: key)
    }

    // MARK: - Retrieve

    func retrieve(for key: String) throws -> Data {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: key,
            kSecReturnData as String: true,
            kSecMatchLimit as String: kSecMatchLimitOne
        ]

        var result: AnyObject?
        let status = SecItemCopyMatching(query as CFDictionary, &result)

        guard status == errSecSuccess else {
            throw status == errSecItemNotFound
                ? KeychainError.itemNotFound
                : KeychainError.unexpectedStatus(status)
        }

        guard let data = result as? Data else {
            throw KeychainError.invalidData
        }

        return data
    }

    func retrieveString(for key: String) throws -> String {
        let data = try retrieve(for: key)
        guard let string = String(data: data, encoding: .utf8) else {
            throw KeychainError.invalidData
        }
        return string
    }

    func retrieve<T: Codable>(for key: String, as type: T.Type) throws -> T {
        let data = try retrieve(for: key)
        return try JSONDecoder().decode(T.self, from: data)
    }

    // MARK: - Delete

    func delete(for key: String) throws {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: key
        ]

        let status = SecItemDelete(query as CFDictionary)

        guard status == errSecSuccess || status == errSecItemNotFound else {
            throw KeychainError.unexpectedStatus(status)
        }
    }

    // MARK: - Clear All

    func clearAll() throws {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service
        ]

        let status = SecItemDelete(query as CFDictionary)

        guard status == errSecSuccess || status == errSecItemNotFound else {
            throw KeychainError.unexpectedStatus(status)
        }
    }
}
```

### AuthenticationService.swift

```swift
import Foundation
import LocalAuthentication
import Combine

/// Authentication service managing user sessions and biometrics
@MainActor
final class AuthenticationService: ObservableObject {

    // MARK: - Published Properties

    @Published private(set) var currentUser: UserProfile?
    @Published private(set) var isAuthenticated: Bool = false
    @Published private(set) var isLoading: Bool = false
    @Published private(set) var authError: AuthError?

    // MARK: - Dependencies

    private let apiClient: APIClient
    private let keychainManager: KeychainManager

    // MARK: - Constants

    private enum KeychainKeys {
        static let accessToken = "gtsd.accessToken"
        static let refreshToken = "gtsd.refreshToken"
        static let biometricEnabled = "gtsd.biometricEnabled"
    }

    // MARK: - Initialization

    init(apiClient: APIClient, keychainManager: KeychainManager) {
        self.apiClient = apiClient
        self.keychainManager = keychainManager
    }

    // MARK: - Authentication Methods

    /// Sign up new user
    func signup(email: String, password: String, name: String) async throws -> UserProfile {
        isLoading = true
        defer { isLoading = false }

        do {
            let endpoint = APIEndpoint.signup(email: email, password: password, name: name)
            let response: SignupResponse = try await apiClient.request(endpoint, authRequired: false)

            // Store tokens
            try await storeTokens(response.tokens)

            // Update API client
            await apiClient.setTokens(
                access: response.tokens.accessToken,
                refresh: response.tokens.refreshToken
            )

            // Create user profile
            let profile = UserProfile(
                user: response.user,
                settings: nil,
                requiresOnboarding: true
            )

            currentUser = profile
            isAuthenticated = true

            return profile

        } catch let error as APIError {
            authError = mapAPIError(error)
            throw error
        }
    }

    /// Log in existing user
    func login(email: String, password: String) async throws -> UserProfile {
        isLoading = true
        defer { isLoading = false }

        do {
            let endpoint = APIEndpoint.login(email: email, password: password)
            let response: LoginResponse = try await apiClient.request(endpoint, authRequired: false)

            // Store tokens
            try await storeTokens(response.tokens)

            // Update API client
            await apiClient.setTokens(
                access: response.tokens.accessToken,
                refresh: response.tokens.refreshToken
            )

            // Fetch user settings
            let userResponse: UserProfile = try await apiClient.request(.getCurrentUser)

            currentUser = userResponse
            isAuthenticated = true

            return userResponse

        } catch let error as APIError {
            authError = mapAPIError(error)
            throw error
        }
    }

    /// Logout current user
    func logout() async throws {
        guard let refreshToken = try? await keychainManager.retrieveString(for: KeychainKeys.refreshToken) else {
            // No refresh token, just clear local state
            await clearSession()
            return
        }

        do {
            let endpoint = APIEndpoint.logout(refreshToken: refreshToken)
            try await apiClient.requestVoid(endpoint, authRequired: false)
        } catch {
            // Continue logout even if API call fails
            print("Logout API call failed: \(error)")
        }

        await clearSession()
    }

    /// Restore session from stored tokens
    func restoreSession() async throws -> UserProfile {
        guard let accessToken = try? await keychainManager.retrieveString(for: KeychainKeys.accessToken),
              let refreshToken = try? await keychainManager.retrieveString(for: KeychainKeys.refreshToken) else {
            throw AuthError(
                code: .TOKEN_INVALID,
                message: "No stored session found"
            )
        }

        // Set tokens in API client
        await apiClient.setTokens(access: accessToken, refresh: refreshToken)

        // Fetch current user (this will auto-refresh if token expired)
        do {
            let userResponse: UserProfile = try await apiClient.request(.getCurrentUser)

            currentUser = userResponse
            isAuthenticated = true

            return userResponse
        } catch {
            // Failed to restore, clear session
            await clearSession()
            throw error
        }
    }

    // MARK: - Biometric Authentication

    /// Check if biometric authentication is available
    func biometricAuthenticationAvailable() -> (available: Bool, type: LABiometryType) {
        let context = LAContext()
        var error: NSError?

        let available = context.canEvaluatePolicy(.deviceOwnerAuthenticationWithBiometrics, error: &error)
        return (available, context.biometryType)
    }

    /// Enable biometric authentication
    func enableBiometricAuth() async throws {
        let context = LAContext()
        context.localizedCancelTitle = "Cancel"

        let reason = "Enable biometric authentication for quick access"

        do {
            let success = try await context.evaluatePolicy(
                .deviceOwnerAuthenticationWithBiometrics,
                localizedReason: reason
            )

            if success {
                try await keychainManager.save("true", for: KeychainKeys.biometricEnabled)
            }
        } catch {
            throw AuthError(
                code: .UNKNOWN_ERROR,
                message: "Biometric authentication failed: \(error.localizedDescription)"
            )
        }
    }

    /// Authenticate with biometrics
    func authenticateWithBiometrics() async throws {
        guard try await keychainManager.retrieveString(for: KeychainKeys.biometricEnabled) == "true" else {
            throw AuthError(code: .UNKNOWN_ERROR, message: "Biometric authentication not enabled")
        }

        let context = LAContext()
        context.localizedCancelTitle = "Use Password"

        let reason = "Authenticate to access your account"

        do {
            let success = try await context.evaluatePolicy(
                .deviceOwnerAuthenticationWithBiometrics,
                localizedReason: reason
            )

            if success {
                _ = try await restoreSession()
            }
        } catch {
            throw AuthError(
                code: .UNKNOWN_ERROR,
                message: "Biometric authentication failed"
            )
        }
    }

    // MARK: - Helper Methods

    private func storeTokens(_ tokens: AuthTokens) async throws {
        try await keychainManager.save(tokens.accessToken, for: KeychainKeys.accessToken)
        try await keychainManager.save(tokens.refreshToken, for: KeychainKeys.refreshToken)
    }

    private func clearSession() async {
        currentUser = nil
        isAuthenticated = false
        authError = nil

        // Clear keychain
        try? await keychainManager.delete(for: KeychainKeys.accessToken)
        try? await keychainManager.delete(for: KeychainKeys.refreshToken)

        // Clear API client tokens
        await apiClient.clearTokens()
    }

    private func mapAPIError(_ error: APIError) -> AuthError {
        switch error {
        case .unauthorized:
            return AuthError(code: .INVALID_CREDENTIALS, message: "Invalid email or password")
        case .rateLimitExceeded:
            return AuthError(code: .RATE_LIMIT_EXCEEDED, message: "Too many attempts. Try again later.")
        case .networkError:
            return AuthError(code: .NETWORK_ERROR, message: "Network connection failed")
        case .validationError(let fields):
            let message = fields.values.joined(separator: ", ")
            return AuthError(code: .PASSWORD_TOO_WEAK, message: message)
        default:
            return AuthError(code: .UNKNOWN_ERROR, message: error.localizedDescription)
        }
    }
}

// MARK: - Auth Error

struct AuthError: LocalizedError, Identifiable {
    let id = UUID()
    let code: AuthErrorCode
    let message: String

    var errorDescription: String? { message }
}

enum AuthErrorCode {
    case INVALID_CREDENTIALS
    case USER_NOT_FOUND
    case TOKEN_EXPIRED
    case TOKEN_INVALID
    case RATE_LIMIT_EXCEEDED
    case NETWORK_ERROR
    case PASSWORD_TOO_WEAK
    case UNKNOWN_ERROR
}
```

---

## Image Upload Service

### PhotoUploadService.swift

```swift
import Foundation
import UIKit
import Combine

/// Service for uploading progress photos to S3
@MainActor
final class PhotoUploadService: ObservableObject {

    // MARK: - Published Properties

    @Published private(set) var uploadProgress: [UUID: Double] = [:]
    @Published private(set) var uploadErrors: [UUID: Error] = [:]

    // MARK: - Dependencies

    private let apiClient: APIClient

    // MARK: - Constants

    private let maxFileSize = 10 * 1024 * 1024 // 10MB
    private let allowedMimeTypes = ["image/jpeg", "image/png", "image/heic"]
    private let compressionQuality: CGFloat = 0.8

    // MARK: - Initialization

    init(apiClient: APIClient) {
        self.apiClient = apiClient
    }

    // MARK: - Upload Methods

    /// Upload photo with automatic compression and progress tracking
    func uploadPhoto(
        _ image: UIImage,
        fileName: String? = nil,
        taskId: Int? = nil,
        evidenceType: String? = nil
    ) async throws -> ConfirmPhotoResponse {
        let uploadId = UUID()

        // Prepare image data
        let (imageData, contentType) = try prepareImageData(image)

        // Validate file size
        guard imageData.count <= maxFileSize else {
            throw PhotoUploadError.fileTooLarge(size: imageData.count, max: maxFileSize)
        }

        // Get image dimensions
        let width = Int(image.size.width * image.scale)
        let height = Int(image.size.height * image.scale)

        // Request presigned URL
        let fileName = fileName ?? "photo_\(Date().timeIntervalSince1970).jpg"
        let presignEndpoint = APIEndpoint.requestPresignedURL(
            fileName: fileName,
            contentType: contentType,
            fileSize: imageData.count
        )

        let presignResponse: PresignedURLResponse = try await apiClient.request(presignEndpoint)

        // Upload to S3 with progress tracking
        try await uploadToS3(
            data: imageData,
            url: presignResponse.uploadUrl,
            contentType: contentType,
            uploadId: uploadId
        )

        // Confirm upload with backend
        let confirmEndpoint = APIEndpoint.confirmPhoto(
            fileKey: presignResponse.fileKey,
            fileSize: imageData.count,
            contentType: contentType,
            width: width,
            height: height,
            takenAt: Date(),
            taskId: taskId,
            evidenceType: evidenceType
        )

        let confirmResponse: ConfirmPhotoResponse = try await apiClient.request(confirmEndpoint)

        // Clean up progress tracking
        uploadProgress.removeValue(forKey: uploadId)

        return confirmResponse
    }

    /// Upload multiple photos in parallel
    func uploadPhotos(
        _ images: [UIImage],
        taskId: Int? = nil
    ) async throws -> [ConfirmPhotoResponse] {
        try await withThrowingTaskGroup(of: ConfirmPhotoResponse.self) { group in
            for (index, image) in images.enumerated() {
                group.addTask {
                    try await self.uploadPhoto(
                        image,
                        fileName: "photo_\(index)_\(Date().timeIntervalSince1970).jpg",
                        taskId: taskId,
                        evidenceType: index == 0 ? "before" : "during"
                    )
                }
            }

            var results: [ConfirmPhotoResponse] = []
            for try await result in group {
                results.append(result)
            }
            return results
        }
    }

    // MARK: - Private Helpers

    private func prepareImageData(_ image: UIImage) throws -> (Data, String) {
        // Try JPEG compression first
        if let jpegData = image.jpegData(compressionQuality: compressionQuality) {
            return (jpegData, "image/jpeg")
        }

        // Fallback to PNG if JPEG fails
        if let pngData = image.pngData() {
            return (pngData, "image/png")
        }

        throw PhotoUploadError.compressionFailed
    }

    private func uploadToS3(
        data: Data,
        url: String,
        contentType: String,
        uploadId: UUID
    ) async throws {
        guard let uploadURL = URL(string: url) else {
            throw PhotoUploadError.invalidURL
        }

        var request = URLRequest(url: uploadURL)
        request.httpMethod = "PUT"
        request.setValue(contentType, forHTTPHeaderField: "Content-Type")

        // Create upload task with progress tracking
        let delegate = UploadProgressDelegate { [weak self] progress in
            Task { @MainActor in
                self?.uploadProgress[uploadId] = progress
            }
        }

        let configuration = URLSessionConfiguration.default
        let session = URLSession(configuration: configuration, delegate: delegate, delegateQueue: nil)

        let (_, response) = try await session.upload(for: request, from: data)

        guard let httpResponse = response as? HTTPURLResponse,
              (200...299).contains(httpResponse.statusCode) else {
            throw PhotoUploadError.uploadFailed
        }
    }
}

// MARK: - Photo Upload Error

enum PhotoUploadError: LocalizedError {
    case fileTooLarge(size: Int, max: Int)
    case compressionFailed
    case invalidURL
    case uploadFailed
    case invalidMimeType

    var errorDescription: String? {
        switch self {
        case .fileTooLarge(let size, let max):
            let sizeMB = Double(size) / 1024 / 1024
            let maxMB = Double(max) / 1024 / 1024
            return "File size (\(String(format: "%.1f", sizeMB))MB) exceeds maximum (\(String(format: "%.1f", maxMB))MB)"
        case .compressionFailed:
            return "Failed to compress image"
        case .invalidURL:
            return "Invalid upload URL"
        case .uploadFailed:
            return "Upload to S3 failed"
        case .invalidMimeType:
            return "Invalid image format"
        }
    }
}

// MARK: - Upload Progress Delegate

private class UploadProgressDelegate: NSObject, URLSessionTaskDelegate, @unchecked Sendable {
    private let progressHandler: @Sendable (Double) -> Void

    init(progressHandler: @escaping @Sendable (Double) -> Void) {
        self.progressHandler = progressHandler
    }

    func urlSession(
        _ session: URLSession,
        task: URLSessionTask,
        didSendBodyData bytesSent: Int64,
        totalBytesSent: Int64,
        totalBytesExpectedToSend: Int64
    ) {
        let progress = Double(totalBytesSent) / Double(totalBytesExpectedToSend)
        progressHandler(progress)
    }
}
```

---

## State Management & ViewModels

### LoginViewModel.swift

```swift
import Foundation
import Combine

/// Login screen view model
@MainActor
final class LoginViewModel: ObservableObject {

    // MARK: - Published Properties

    @Published var email: String = ""
    @Published var password: String = ""
    @Published var isLoading: Bool = false
    @Published var errorMessage: String?

    // MARK: - Dependencies

    private let authService: AuthenticationService

    // MARK: - Validation

    var isFormValid: Bool {
        !email.isEmpty && email.contains("@") && password.count >= 8
    }

    // MARK: - Initialization

    init(authService: AuthenticationService) {
        self.authService = authService
    }

    // MARK: - Actions

    func login() async {
        guard isFormValid else {
            errorMessage = "Please enter valid credentials"
            return
        }

        isLoading = true
        errorMessage = nil

        do {
            _ = try await authService.login(email: email, password: password)
            // Navigation handled by parent view observing authService.isAuthenticated
        } catch {
            errorMessage = error.localizedDescription
        }

        isLoading = false
    }

    func loginWithBiometrics() async {
        isLoading = true
        errorMessage = nil

        do {
            try await authService.authenticateWithBiometrics()
        } catch {
            errorMessage = "Biometric authentication failed"
        }

        isLoading = false
    }
}
```

### TasksViewModel.swift

```swift
import Foundation
import Combine

/// Tasks list view model
@MainActor
final class TasksViewModel: ObservableObject {

    // MARK: - Published Properties

    @Published private(set) var taskGroups: [TaskGroup] = []
    @Published private(set) var isLoading: Bool = false
    @Published private(set) var errorMessage: String?
    @Published private(set) var completionPercentage: Double = 0.0

    // MARK: - Dependencies

    private let tasksRepository: TasksRepository
    private var cancellables = Set<AnyCancellable>()

    // MARK: - State

    private var selectedDate: Date = Date()

    // MARK: - Initialization

    init(tasksRepository: TasksRepository) {
        self.tasksRepository = tasksRepository
    }

    // MARK: - Data Loading

    func loadTasks(for date: Date = Date()) async {
        selectedDate = date
        isLoading = true
        errorMessage = nil

        do {
            let response = try await tasksRepository.getTodayTasks(date: date)
            taskGroups = response.tasks.map { group in
                TaskGroup(
                    type: group.type,
                    tasks: group.tasks,
                    completed: group.completed,
                    total: group.total
                )
            }
            completionPercentage = response.completionPercentage
        } catch {
            errorMessage = error.localizedDescription
        }

        isLoading = false
    }

    func completeTask(_ task: DailyTask, notes: String? = nil) async {
        do {
            _ = try await tasksRepository.createEvidence(
                taskId: task.id,
                type: .textLog,
                data: EvidenceData(text: notes, metrics: nil, photoUrl: nil),
                notes: notes
            )

            // Reload tasks to reflect changes
            await loadTasks(for: selectedDate)
        } catch {
            errorMessage = "Failed to complete task: \(error.localizedDescription)"
        }
    }

    func completeTaskWithPhoto(_ task: DailyTask, image: UIImage) async {
        // Handled by PhotoUploadService
    }
}

// MARK: - Task Group

struct TaskGroup: Identifiable {
    let id = UUID()
    let type: TaskType
    let tasks: [DailyTask]
    let completed: Int
    let total: Int

    var progress: Double {
        guard total > 0 else { return 0 }
        return Double(completed) / Double(total)
    }
}
```

---

## Repository Pattern

### TasksRepository.swift

```swift
import Foundation

/// Repository for tasks data access
actor TasksRepository {

    // MARK: - Dependencies

    private let apiClient: APIClient

    // MARK: - Cache

    private var cachedTasks: [String: TodayTasksResponse] = [:]
    private let cacheExpiration: TimeInterval = 60 // 60 seconds

    // MARK: - Initialization

    init(apiClient: APIClient) {
        self.apiClient = apiClient
    }

    // MARK: - Public Methods

    func getTodayTasks(
        date: Date = Date(),
        limit: Int = 50,
        offset: Int = 0,
        type: String? = nil
    ) async throws -> TodayTasksResponse {
        let dateString = date.iso8601DateString
        let cacheKey = "\(dateString)_\(limit)_\(offset)_\(type ?? "all")"

        // Check cache
        if let cached = cachedTasks[cacheKey] {
            return cached
        }

        // Fetch from API
        let endpoint = APIEndpoint.getTodayTasks(
            date: dateString,
            limit: limit,
            offset: offset,
            type: type
        )

        let response: TodayTasksResponse = try await apiClient.request(endpoint)

        // Cache response
        cachedTasks[cacheKey] = response

        // Schedule cache invalidation
        Task {
            try? await Task.sleep(nanoseconds: UInt64(cacheExpiration * 1_000_000_000))
            await invalidateCache(for: cacheKey)
        }

        return response
    }

    func createEvidence(
        taskId: Int,
        type: EvidenceType,
        data: EvidenceData,
        notes: String?
    ) async throws -> CreateEvidenceResponse {
        let endpoint = APIEndpoint.createEvidence(
            taskId: taskId,
            type: type,
            data: data,
            notes: notes
        )

        let response: CreateEvidenceResponse = try await apiClient.request(endpoint)

        // Invalidate all caches since task completion affects multiple queries
        await invalidateAllCaches()

        return response
    }

    // MARK: - Cache Management

    private func invalidateCache(for key: String) {
        cachedTasks.removeValue(forKey: key)
    }

    private func invalidateAllCaches() {
        cachedTasks.removeAll()
    }
}
```

---

## Dependency Injection

### AppDependencies.swift

```swift
import Foundation

/// Dependency injection container
@MainActor
final class AppDependencies {

    // MARK: - Core Dependencies

    let apiClient: APIClient
    let keychainManager: KeychainManager

    // MARK: - Services

    let authService: AuthenticationService
    let photoUploadService: PhotoUploadService

    // MARK: - Repositories

    let tasksRepository: TasksRepository

    // MARK: - Configuration

    private let baseURL: URL

    // MARK: - Initialization

    init(baseURL: URL) {
        self.baseURL = baseURL

        // Initialize core dependencies
        self.apiClient = APIClient(baseURL: baseURL)
        self.keychainManager = KeychainManager()

        // Initialize services
        self.authService = AuthenticationService(
            apiClient: apiClient,
            keychainManager: keychainManager
        )
        self.photoUploadService = PhotoUploadService(apiClient: apiClient)

        // Initialize repositories
        self.tasksRepository = TasksRepository(apiClient: apiClient)
    }

    // MARK: - Factory Methods

    func makeLoginViewModel() -> LoginViewModel {
        LoginViewModel(authService: authService)
    }

    func makeTasksViewModel() -> TasksViewModel {
        TasksViewModel(tasksRepository: tasksRepository)
    }
}

// MARK: - Environment Key

struct AppDependenciesKey: EnvironmentKey {
    static let defaultValue = AppDependencies(
        baseURL: URL(string: "https://api.gtsd.com")!
    )
}

extension EnvironmentValues {
    var dependencies: AppDependencies {
        get { self[AppDependenciesKey.self] }
        set { self[AppDependenciesKey.self] = newValue }
    }
}
```

### GTSDApp.swift

```swift
import SwiftUI

@main
struct GTSDApp: App {

    // MARK: - Dependencies

    @StateObject private var dependencies: AppDependencies

    // MARK: - Initialization

    init() {
        // Configure base URL based on environment
        #if DEBUG
        let baseURL = URL(string: "http://localhost:3000")!
        #else
        let baseURL = URL(string: "https://api.gtsd.com")!
        #endif

        let deps = AppDependencies(baseURL: baseURL)
        _dependencies = StateObject(wrappedValue: deps)
    }

    // MARK: - Body

    var body: some Scene {
        WindowGroup {
            RootView()
                .environmentObject(dependencies.authService)
                .environment(\.dependencies, dependencies)
        }
    }
}

// MARK: - Root View

struct RootView: View {
    @EnvironmentObject var authService: AuthenticationService

    var body: some View {
        Group {
            if authService.isAuthenticated {
                if let user = authService.currentUser, user.requiresOnboarding {
                    OnboardingView()
                } else {
                    MainTabView()
                }
            } else {
                LoginView()
            }
        }
        .task {
            // Attempt to restore session on app launch
            try? await authService.restoreSession()
        }
    }
}
```

---

## Utility Extensions

### Date+Extensions.swift

```swift
import Foundation

extension Date {
    /// ISO8601 date string (YYYY-MM-DD)
    var iso8601DateString: String {
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withFullDate]
        return formatter.string(from: self)
    }

    /// ISO8601 date-time string with fractional seconds
    var iso8601String: String {
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        return formatter.string(from: self)
    }
}
```

---

## Summary

This Swift architecture provides:

1. **Type-Safe Networking**: Actor-based `APIClient` with automatic token refresh, retry logic, and comprehensive error handling
2. **Secure Token Storage**: Keychain-based storage with biometric authentication support
3. **Clean Architecture**: Clear separation between networking, domain, data, and presentation layers
4. **Modern Concurrency**: Fully leverages Swift 6 async/await and actors for thread safety
5. **Reactive State Management**: Combine-based `@Published` properties for SwiftUI integration
6. **Image Upload**: Complete S3 presigned URL flow with progress tracking and compression
7. **Repository Pattern**: Cached data access layer with automatic invalidation
8. **Dependency Injection**: Environment-based DI for testability and modularity

### Key Files Reference

- **/Users/devarisbrown/Code/projects/gtsd/apps/api/src/routes/auth/index.ts** - Auth endpoints
- **/Users/devarisbrown/Code/projects/gtsd/apps/api/src/routes/tasks/index.ts** - Tasks endpoints
- **/Users/devarisbrown/Code/projects/gtsd/apps/api/src/routes/progress/photos.ts** - Photo upload endpoints
- **/Users/devarisbrown/Code/projects/gtsd/packages/shared-types/src/** - Shared TypeScript types

All Swift models are 1:1 matches with the TypeScript API types, ensuring perfect compatibility.
