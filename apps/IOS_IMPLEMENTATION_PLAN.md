# GTSD iOS Native App - Comprehensive Implementation Plan

## Executive Summary

This document provides a complete implementation plan for building a native iOS application for GTSD (Get That Shredded Done), a fitness tracking and accountability platform. The app will be built using SwiftUI, modern Swift concurrency (async/await), and iOS 17+ APIs.

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Project Structure](#2-project-structure)
3. [Core Features & Screens](#3-core-features--screens)
4. [Technical Implementation Details](#4-technical-implementation-details)
5. [SwiftUI Views & Components](#5-swiftui-views--components)
6. [Development Phases](#6-development-phases)
7. [Project Setup Instructions](#7-project-setup-instructions)
8. [Testing Strategy](#8-testing-strategy)
9. [Performance Optimization](#9-performance-optimization)
10. [Security Considerations](#10-security-considerations)

---

## 1. Architecture Overview

### 1.1 Architecture Pattern: Clean Architecture + MVVM

```
┌─────────────────────────────────────────────────────────────┐
│                     Presentation Layer                       │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │  SwiftUI     │  │  ViewModels  │  │   Models     │      │
│  │   Views      │──│ @Observable  │──│  (Display)   │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
                            │
┌─────────────────────────────────────────────────────────────┐
│                      Domain Layer                            │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   Use Cases  │  │  Entities    │  │ Repository   │      │
│  │              │──│              │──│  Protocols   │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
                            │
┌─────────────────────────────────────────────────────────────┐
│                       Data Layer                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │  API Client  │  │ Local Cache  │  │  Keychain    │      │
│  │  (URLSession)│  │ (SwiftData)  │  │  Service     │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
```

### 1.2 Key Architectural Principles

1. **Unidirectional Data Flow**: Data flows from repositories → use cases → view models → views
2. **Dependency Injection**: Protocol-based DI container for testability
3. **Reactive State Management**: SwiftUI's @Observable for view models
4. **Offline-First**: Local cache with background sync
5. **Protocol-Oriented**: Heavy use of protocols for abstraction

### 1.3 Core Frameworks & Dependencies

#### Apple Frameworks

- **SwiftUI**: Primary UI framework
- **SwiftData**: Local data persistence (iOS 17+)
- **Combine**: Reactive streams (complementing async/await)
- **PhotosUI**: Photo selection
- **AVFoundation**: Camera access
- **LocalAuthentication**: Biometric authentication
- **UserNotifications**: Push notifications
- **WidgetKit**: Home screen widgets (future)

#### Third-Party Dependencies (SPM)

- **Alamofire** (optional): Enhanced networking if needed
- **KeychainAccess**: Simplified keychain operations
- **SwiftLint**: Code quality and style enforcement

---

## 2. Project Structure

```
GTSDApp/
├── GTSDApp.swift                    # App entry point
├── Info.plist
├── Assets.xcassets/
│   ├── AppIcon.appiconset/
│   ├── Colors/
│   └── Images/
├── Configuration/
│   ├── Environment.swift            # API base URL, feature flags
│   └── AppConfiguration.swift
│
├── Core/                            # Shared utilities
│   ├── DependencyContainer.swift
│   ├── Logger.swift
│   ├── Constants.swift
│   └── Extensions/
│       ├── View+Extensions.swift
│       ├── Date+Extensions.swift
│       ├── Color+Theme.swift
│       └── String+Validation.swift
│
├── Domain/                          # Business logic layer
│   ├── Entities/
│   │   ├── User.swift
│   │   ├── Task.swift
│   │   ├── ProgressPhoto.swift
│   │   ├── Streak.swift
│   │   └── Badge.swift
│   ├── UseCases/
│   │   ├── Auth/
│   │   │   ├── LoginUseCase.swift
│   │   │   ├── SignupUseCase.swift
│   │   │   └── BiometricLoginUseCase.swift
│   │   ├── Onboarding/
│   │   │   └── CompleteOnboardingUseCase.swift
│   │   ├── Tasks/
│   │   │   ├── FetchTodayTasksUseCase.swift
│   │   │   └── SubmitEvidenceUseCase.swift
│   │   └── Photos/
│   │       ├── UploadPhotoUseCase.swift
│   │       └── FetchPhotosUseCase.swift
│   └── RepositoryProtocols/
│       ├── AuthRepositoryProtocol.swift
│       ├── TaskRepositoryProtocol.swift
│       ├── PhotoRepositoryProtocol.swift
│       └── UserRepositoryProtocol.swift
│
├── Data/                            # Data access layer
│   ├── Network/
│   │   ├── APIClient.swift
│   │   ├── APIEndpoint.swift
│   │   ├── APIError.swift
│   │   ├── NetworkMonitor.swift
│   │   └── Endpoints/
│   │       ├── AuthEndpoints.swift
│   │       ├── TaskEndpoints.swift
│   │       ├── PhotoEndpoints.swift
│   │       └── OnboardingEndpoints.swift
│   ├── Repositories/
│   │   ├── AuthRepository.swift
│   │   ├── TaskRepository.swift
│   │   ├── PhotoRepository.swift
│   │   └── UserRepository.swift
│   ├── LocalStorage/
│   │   ├── SwiftDataModels/
│   │   │   ├── CachedTask.swift
│   │   │   ├── CachedPhoto.swift
│   │   │   └── CachedUser.swift
│   │   ├── KeychainService.swift
│   │   ├── UserDefaultsService.swift
│   │   └── CacheManager.swift
│   └── DTOs/                        # Data Transfer Objects
│       ├── AuthDTOs.swift
│       ├── TaskDTOs.swift
│       ├── PhotoDTOs.swift
│       └── OnboardingDTOs.swift
│
├── Presentation/                    # UI layer
│   ├── Common/
│   │   ├── Components/
│   │   │   ├── Buttons/
│   │   │   │   ├── PrimaryButton.swift
│   │   │   │   └── SecondaryButton.swift
│   │   │   ├── TextFields/
│   │   │   │   ├── GTSDTextField.swift
│   │   │   │   └── SecureTextField.swift
│   │   │   ├── Cards/
│   │   │   │   ├── TaskCard.swift
│   │   │   │   ├── StatCard.swift
│   │   │   │   └── BadgeCard.swift
│   │   │   ├── LoadingView.swift
│   │   │   ├── ErrorView.swift
│   │   │   └── EmptyStateView.swift
│   │   ├── Modifiers/
│   │   │   ├── LoadingModifier.swift
│   │   │   └── ErrorAlertModifier.swift
│   │   └── Theme/
│   │       ├── Typography.swift
│   │       ├── Spacing.swift
│   │       └── ColorPalette.swift
│   │
│   ├── Authentication/
│   │   ├── Views/
│   │   │   ├── LoginView.swift
│   │   │   ├── SignupView.swift
│   │   │   ├── BiometricSetupView.swift
│   │   │   └── ForgotPasswordView.swift
│   │   └── ViewModels/
│   │       ├── LoginViewModel.swift
│   │       └── SignupViewModel.swift
│   │
│   ├── Onboarding/
│   │   ├── Views/
│   │   │   ├── OnboardingCoordinator.swift
│   │   │   ├── WelcomeView.swift
│   │   │   ├── BasicInfoView.swift
│   │   │   ├── GoalsView.swift
│   │   │   ├── HealthMetricsView.swift
│   │   │   ├── ActivityLevelView.swift
│   │   │   ├── PreferencesView.swift
│   │   │   ├── PartnersView.swift
│   │   │   └── ReviewView.swift
│   │   └── ViewModels/
│   │       └── OnboardingViewModel.swift
│   │
│   ├── Home/
│   │   ├── Views/
│   │   │   ├── HomeView.swift
│   │   │   ├── DashboardView.swift
│   │   │   └── QuickActionsView.swift
│   │   └── ViewModels/
│   │       └── HomeViewModel.swift
│   │
│   ├── Tasks/
│   │   ├── Views/
│   │   │   ├── TodayTasksView.swift
│   │   │   ├── TaskDetailView.swift
│   │   │   ├── SubmitEvidenceView.swift
│   │   │   └── TaskHistoryView.swift
│   │   └── ViewModels/
│   │       ├── TasksViewModel.swift
│   │       └── TaskDetailViewModel.swift
│   │
│   ├── Progress/
│   │   ├── Views/
│   │   │   ├── ProgressView.swift
│   │   │   ├── PhotoGalleryView.swift
│   │   │   ├── CameraView.swift
│   │   │   ├── PhotoComparisonView.swift
│   │   │   └── MeasurementsView.swift
│   │   └── ViewModels/
│   │       ├── ProgressViewModel.swift
│   │       └── PhotoUploadViewModel.swift
│   │
│   ├── Streaks/
│   │   ├── Views/
│   │   │   ├── StreaksView.swift
│   │   │   ├── BadgesView.swift
│   │   │   └── BadgeDetailView.swift
│   │   └── ViewModels/
│   │       ├── StreaksViewModel.swift
│   │       └── BadgesViewModel.swift
│   │
│   └── Profile/
│       ├── Views/
│       │   ├── ProfileView.swift
│       │   ├── SettingsView.swift
│       │   ├── EditProfileView.swift
│       │   └── NotificationSettingsView.swift
│       └── ViewModels/
│           ├── ProfileViewModel.swift
│           └── SettingsViewModel.swift
│
├── Navigation/
│   ├── AppCoordinator.swift
│   ├── Route.swift
│   └── TabBarView.swift
│
└── Services/
    ├── AuthenticationService.swift
    ├── NotificationService.swift
    ├── BiometricService.swift
    ├── CameraService.swift
    ├── ImageCompressionService.swift
    └── AnalyticsService.swift
```

---

## 3. Core Features & Screens

### 3.1 Authentication Flow

#### Login Screen

**Features:**

- Email/password login
- Biometric login (Face ID/Touch ID) for returning users
- "Remember Me" option
- Forgot password link
- Sign up navigation

**User Flow:**

```
Launch App
    │
    ├──→ Has Biometric Enabled? ──Yes──→ Biometric Auth ──Success──→ Home
    │                             │
    │                             No
    │                             │
    └──→ Login Screen ────────────→ Enter Credentials ──Success──→ Check Onboarding
                                                                    │
                                                    ┌───────────────┴──────────────┐
                                                    │                              │
                                            Complete?──No──→ Onboarding         Yes──→ Home
```

#### Signup Screen

**Features:**

- Name, email, password fields
- Password strength indicator
- Terms & conditions checkbox
- Social auth (future: Sign in with Apple)
- Auto-navigate to onboarding after signup

#### Biometric Setup

**Features:**

- Enable Face ID/Touch ID
- Security explanation
- Fallback to password option

### 3.2 Onboarding Flow (Multi-Step Wizard)

**Step 1: Welcome**

- App introduction
- Benefits overview
- Privacy assurance
- "Get Started" CTA

**Step 2: Basic Info**

- Date of birth (DatePicker)
- Gender selection (Segmented control)
- Progress indicator

**Step 3: Goals**

- Primary goal picker (Lose weight, Gain muscle, etc.)
- Target weight input
- Target date picker
- Motivation text (optional)

**Step 4: Health Metrics**

- Current weight (with unit toggle: kg/lbs)
- Height (with unit toggle: cm/inches)
- Real-time BMI calculation display

**Step 5: Activity Level**

- Visual cards for each level
- Sedentary → Extremely Active
- Descriptive text for each option

**Step 6: Preferences**

- Dietary preferences (multi-select chips)
- Allergies (tag input)
- Meals per day (stepper: 1-10)

**Step 7: Accountability Partners**

- Add partners (name, email/phone, relationship)
- Swipe to delete
- Optional but recommended

**Step 8: Review & Submit**

- Summary of all inputs
- Edit any section
- Calculated metrics preview (BMR, TDEE, calorie target)
- Submit button

**Navigation:**

- Swipe gestures between steps
- Progress bar at top
- Back button (with unsaved changes alert)
- Skip option for partners only

### 3.3 Home/Dashboard Screen

**Layout:**

```
┌──────────────────────────────────────┐
│  Good Morning, [Name]!        [🔔]   │
│  [Streak: 5 days] [New Badge: 🎖]    │
├──────────────────────────────────────┤
│  Today's Progress                     │
│  ┌────────────────────────────────┐  │
│  │ 3/7 Tasks Completed  ●●●○○○○  │  │
│  └────────────────────────────────┘  │
├──────────────────────────────────────┤
│  Quick Stats                          │
│  ┌──────┐ ┌──────┐ ┌──────┐         │
│  │Water │ │Cals  │ │Steps │         │
│  │ 65% │ │ 450  │ │ 5.2k │         │
│  └──────┘ └──────┘ └──────┘         │
├──────────────────────────────────────┤
│  Today's Tasks                        │
│  [Task Card: Morning Protein]  ✓     │
│  [Task Card: Workout]          →     │
│  [Task Card: Progress Photo]   →     │
│  [See All →]                          │
└──────────────────────────────────────┘
```

**Features:**

- Personalized greeting with time of day
- Streak counter (animated)
- Badge notification badges
- Today's task completion ring
- Quick action buttons (Add Photo, Log Weight)
- Swipe to refresh
- Pull up for task details

### 3.4 Daily Tasks Screen

**Features:**

- Segmented control: All | Pending | Completed
- Task cards with:
  - Task type icon
  - Title and description
  - Due time
  - Completion status
  - Evidence button
- Filter by task type
- Sort options (time, priority)
- Swipe actions (complete, skip, delete)

**Task Detail Sheet:**

- Full task description
- Attached metadata (reps, sets, calories, etc.)
- Evidence submission interface
- History of previous completions
- Edit/delete options

**Evidence Submission:**

- Text log (notes)
- Metrics input (weight, reps, calories)
- Photo reference (gallery or camera)
- Voice memo (future)

### 3.5 Progress Tracking

#### Progress Photos Screen

**Features:**

- Grid view of all photos (3 columns)
- Filter by angle (Front, Side, Back)
- Date range filter
- Comparison view (swipe between two photos)
- Before/After slider view
- Upload new photo FAB

**Camera/Upload Flow:**

```
Tap Upload
    │
    ├──→ Camera ──→ Take Photo ──→ Preview ──→ Select Angle ──→ Upload
    │
    └──→ Gallery ──→ Select Photo ──→ Preview ──→ Select Angle ──→ Upload
```

**Upload Process:**

1. Select/capture image
2. Compress image (max 2MB)
3. Request presigned URL from API
4. Upload to S3
5. Confirm upload to API
6. Update local cache

#### Measurements View

**Features:**

- Weight graph (line chart)
- Body measurements tracker
- Progress photos timeline
- Goal progress indicator

### 3.6 Streaks & Badges

#### Streaks View

**Features:**

- Current streak counter (large, animated)
- Streak type breakdown (workout, meals, etc.)
- Calendar heatmap (GitHub-style)
- Longest streak achievement
- Streak freeze count (future: in-app purchase)

#### Badges View

**Features:**

- Earned badges grid (with unlock animation)
- Locked badges (grayed out with unlock criteria)
- Badge detail modal:
  - Badge artwork
  - Title and description
  - Earned date
  - Rarity percentage
  - Share button

### 3.7 Profile & Settings

**Profile View:**

- User avatar (editable)
- Name and email
- Current weight and goal
- Plan subscription status (future)
- Edit profile button

**Settings View:**

- Account settings
- Notification preferences
- Biometric toggle
- Units preference (metric/imperial)
- Dark mode toggle (system/light/dark)
- Privacy policy
- Terms of service
- Logout button
- Delete account

---

## 4. Technical Implementation Details

### 4.1 Networking Layer

#### APIClient Implementation

```swift
// MARK: - API Client
@available(iOS 17.0, *)
final class APIClient: Sendable {
    private let baseURL: URL
    private let session: URLSession
    private let tokenManager: TokenManager

    init(
        baseURL: URL,
        session: URLSession = .shared,
        tokenManager: TokenManager
    ) {
        self.baseURL = baseURL
        self.session = session
        self.tokenManager = tokenManager
    }

    func request<T: Decodable>(
        _ endpoint: APIEndpoint,
        responseType: T.Type
    ) async throws -> T {
        var request = try endpoint.makeRequest(baseURL: baseURL)

        // Add auth token if available
        if endpoint.requiresAuth {
            let token = try await tokenManager.getAccessToken()
            request.addValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        }

        let (data, response) = try await session.data(for: request)

        guard let httpResponse = response as? HTTPURLResponse else {
            throw APIError.invalidResponse
        }

        // Handle token refresh if needed
        if httpResponse.statusCode == 401 {
            try await tokenManager.refreshToken()
            return try await request(endpoint, responseType: responseType)
        }

        guard (200...299).contains(httpResponse.statusCode) else {
            throw APIError.httpError(httpResponse.statusCode, data)
        }

        do {
            let decoded = try JSONDecoder().decode(T.self, from: data)
            return decoded
        } catch {
            throw APIError.decodingError(error)
        }
    }
}

// MARK: - API Endpoint Protocol
protocol APIEndpoint {
    var path: String { get }
    var method: HTTPMethod { get }
    var headers: [String: String] { get }
    var body: Encodable? { get }
    var queryItems: [URLQueryItem]? { get }
    var requiresAuth: Bool { get }

    func makeRequest(baseURL: URL) throws -> URLRequest
}

// MARK: - HTTP Method
enum HTTPMethod: String {
    case get = "GET"
    case post = "POST"
    case put = "PUT"
    case delete = "DELETE"
    case patch = "PATCH"
}

// MARK: - API Error
enum APIError: LocalizedError {
    case invalidURL
    case invalidResponse
    case httpError(Int, Data)
    case decodingError(Error)
    case encodingError(Error)
    case networkError(Error)
    case unauthorized
    case serverError(String)

    var errorDescription: String? {
        switch self {
        case .invalidURL:
            return "Invalid URL"
        case .invalidResponse:
            return "Invalid response from server"
        case .httpError(let code, _):
            return "HTTP error: \(code)"
        case .decodingError(let error):
            return "Failed to decode response: \(error.localizedDescription)"
        case .encodingError(let error):
            return "Failed to encode request: \(error.localizedDescription)"
        case .networkError(let error):
            return "Network error: \(error.localizedDescription)"
        case .unauthorized:
            return "Unauthorized. Please log in again."
        case .serverError(let message):
            return "Server error: \(message)"
        }
    }
}
```

#### Endpoint Examples

```swift
// MARK: - Auth Endpoints
enum AuthEndpoint: APIEndpoint {
    case login(email: String, password: String)
    case signup(name: String, email: String, password: String)
    case refresh(refreshToken: String)
    case logout
    case getCurrentUser

    var path: String {
        switch self {
        case .login: return "/auth/login"
        case .signup: return "/auth/signup"
        case .refresh: return "/auth/refresh"
        case .logout: return "/auth/logout"
        case .getCurrentUser: return "/auth/me"
        }
    }

    var method: HTTPMethod {
        switch self {
        case .login, .signup, .refresh, .logout: return .post
        case .getCurrentUser: return .get
        }
    }

    var requiresAuth: Bool {
        switch self {
        case .logout, .getCurrentUser: return true
        default: return false
        }
    }

    var body: Encodable? {
        switch self {
        case .login(let email, let password):
            return LoginRequestDTO(email: email, password: password)
        case .signup(let name, let email, let password):
            return SignupRequestDTO(name: name, email: email, password: password)
        case .refresh(let token):
            return RefreshTokenRequestDTO(refreshToken: token)
        default:
            return nil
        }
    }

    var queryItems: [URLQueryItem]? { nil }
    var headers: [String: String] { ["Content-Type": "application/json"] }
}
```

### 4.2 Token Management & Authentication

```swift
// MARK: - Token Manager
@available(iOS 17.0, *)
actor TokenManager {
    private let keychainService: KeychainService
    private var accessToken: String?
    private var refreshToken: String?
    private var tokenExpiresAt: Date?

    init(keychainService: KeychainService) {
        self.keychainService = keychainService
        self.loadTokensFromKeychain()
    }

    func getAccessToken() async throws -> String {
        // Check if token is expired
        if let expiresAt = tokenExpiresAt, Date() >= expiresAt {
            try await refreshToken()
        }

        guard let token = accessToken else {
            throw AuthError.noAccessToken
        }

        return token
    }

    func saveTokens(
        accessToken: String,
        refreshToken: String,
        expiresIn: Int
    ) async throws {
        self.accessToken = accessToken
        self.refreshToken = refreshToken
        self.tokenExpiresAt = Date().addingTimeInterval(TimeInterval(expiresIn))

        try keychainService.save(accessToken, for: .accessToken)
        try keychainService.save(refreshToken, for: .refreshToken)
    }

    func refreshToken() async throws {
        guard let currentRefreshToken = refreshToken else {
            throw AuthError.noRefreshToken
        }

        // Call refresh endpoint
        // Update tokens
        // This prevents race conditions by using actor isolation
    }

    func clearTokens() async {
        accessToken = nil
        refreshToken = nil
        tokenExpiresAt = nil
        keychainService.delete(.accessToken)
        keychainService.delete(.refreshToken)
    }

    private func loadTokensFromKeychain() {
        accessToken = try? keychainService.retrieve(.accessToken)
        refreshToken = try? keychainService.retrieve(.refreshToken)
    }
}

// MARK: - Keychain Service
final class KeychainService {
    enum KeychainKey: String {
        case accessToken = "com.gtsd.accessToken"
        case refreshToken = "com.gtsd.refreshToken"
        case biometricEnabled = "com.gtsd.biometricEnabled"
        case userEmail = "com.gtsd.userEmail"
    }

    func save(_ value: String, for key: KeychainKey) throws {
        let data = value.data(using: .utf8)!

        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrAccount as String: key.rawValue,
            kSecValueData as String: data,
            kSecAttrAccessible as String: kSecAttrAccessibleAfterFirstUnlock
        ]

        SecItemDelete(query as CFDictionary)

        let status = SecItemAdd(query as CFDictionary, nil)
        guard status == errSecSuccess else {
            throw KeychainError.saveFailed(status)
        }
    }

    func retrieve(_ key: KeychainKey) throws -> String? {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrAccount as String: key.rawValue,
            kSecReturnData as String: true
        ]

        var result: AnyObject?
        let status = SecItemCopyMatching(query as CFDictionary, &result)

        guard status == errSecSuccess,
              let data = result as? Data,
              let string = String(data: data, encoding: .utf8) else {
            if status == errSecItemNotFound {
                return nil
            }
            throw KeychainError.retrieveFailed(status)
        }

        return string
    }

    func delete(_ key: KeychainKey) {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrAccount as String: key.rawValue
        ]

        SecItemDelete(query as CFDictionary)
    }
}

enum KeychainError: LocalizedError {
    case saveFailed(OSStatus)
    case retrieveFailed(OSStatus)

    var errorDescription: String? {
        switch self {
        case .saveFailed(let status):
            return "Failed to save to keychain: \(status)"
        case .retrieveFailed(let status):
            return "Failed to retrieve from keychain: \(status)"
        }
    }
}
```

### 4.3 Local Data Persistence (SwiftData)

```swift
// MARK: - SwiftData Models
import SwiftData

@Model
final class CachedTask {
    @Attribute(.unique) var id: Int
    var title: String
    var taskDescription: String?
    var taskType: String
    var status: String
    var dueDate: Date
    var planId: Int
    var metadata: Data? // JSON encoded
    var createdAt: Date
    var updatedAt: Date
    var isSynced: Bool

    init(
        id: Int,
        title: String,
        taskDescription: String? = nil,
        taskType: String,
        status: String,
        dueDate: Date,
        planId: Int,
        metadata: Data? = nil,
        isSynced: Bool = true
    ) {
        self.id = id
        self.title = title
        self.taskDescription = taskDescription
        self.taskType = taskType
        self.status = status
        self.dueDate = dueDate
        self.planId = planId
        self.metadata = metadata
        self.createdAt = Date()
        self.updatedAt = Date()
        self.isSynced = isSynced
    }
}

@Model
final class CachedPhoto {
    @Attribute(.unique) var id: Int
    var userId: Int
    var s3Key: String
    var photoType: String
    var thumbnailUrl: String?
    var fullUrl: String?
    var takenAt: Date
    var localPath: String? // For offline uploads
    var uploadStatus: String // pending, uploading, completed, failed
    var createdAt: Date

    init(
        id: Int,
        userId: Int,
        s3Key: String,
        photoType: String,
        takenAt: Date,
        uploadStatus: String = "completed"
    ) {
        self.id = id
        self.userId = userId
        self.s3Key = s3Key
        self.photoType = photoType
        self.takenAt = takenAt
        self.uploadStatus = uploadStatus
        self.createdAt = Date()
    }
}

@Model
final class CachedUser {
    @Attribute(.unique) var id: Int
    var email: String
    var name: String
    var phoneNumber: String?
    var onboardingCompleted: Bool
    var lastSyncedAt: Date

    init(
        id: Int,
        email: String,
        name: String,
        phoneNumber: String? = nil,
        onboardingCompleted: Bool = false
    ) {
        self.id = id
        self.email = email
        self.name = name
        self.phoneNumber = phoneNumber
        self.onboardingCompleted = onboardingCompleted
        self.lastSyncedAt = Date()
    }
}
```

### 4.4 Image Upload Workflow

```swift
// MARK: - Photo Upload Use Case
@available(iOS 17.0, *)
final class UploadPhotoUseCase {
    private let apiClient: APIClient
    private let imageCompressor: ImageCompressionService

    init(apiClient: APIClient, imageCompressor: ImageCompressionService) {
        self.apiClient = apiClient
        self.imageCompressor = imageCompressor
    }

    func execute(
        image: UIImage,
        photoType: PhotoType,
        takenAt: Date
    ) async throws -> Photo {
        // Step 1: Compress image
        guard let compressedData = await imageCompressor.compress(
            image,
            maxSizeKB: 2048,
            quality: 0.8
        ) else {
            throw UploadError.compressionFailed
        }

        // Step 2: Request presigned URL
        let presignRequest = PresignRequestDTO(
            photoType: photoType.rawValue,
            takenAt: takenAt.iso8601String
        )

        let presignResponse = try await apiClient.request(
            PhotoEndpoint.requestPresignedURL(presignRequest),
            responseType: PresignResponseDTO.self
        )

        // Step 3: Upload to S3
        try await uploadToS3(
            data: compressedData,
            url: presignResponse.uploadUrl,
            contentType: "image/jpeg"
        )

        // Step 4: Confirm upload to API
        let confirmRequest = ConfirmUploadDTO(
            s3Key: presignResponse.s3Key,
            photoType: photoType.rawValue,
            takenAt: takenAt.iso8601String
        )

        let photo = try await apiClient.request(
            PhotoEndpoint.confirmUpload(confirmRequest),
            responseType: PhotoDTO.self
        )

        return photo.toDomain()
    }

    private func uploadToS3(
        data: Data,
        url: URL,
        contentType: String
    ) async throws {
        var request = URLRequest(url: url)
        request.httpMethod = "PUT"
        request.setValue(contentType, forHTTPHeaderField: "Content-Type")
        request.httpBody = data

        let (_, response) = try await URLSession.shared.data(for: request)

        guard let httpResponse = response as? HTTPURLResponse,
              (200...299).contains(httpResponse.statusCode) else {
            throw UploadError.s3UploadFailed
        }
    }
}

// MARK: - Image Compression Service
actor ImageCompressionService {
    func compress(
        _ image: UIImage,
        maxSizeKB: Int,
        quality: CGFloat = 0.8
    ) async -> Data? {
        var compression = quality
        var data = image.jpegData(compressionQuality: compression)

        while let currentData = data,
              currentData.count > maxSizeKB * 1024,
              compression > 0.1 {
            compression -= 0.1
            data = image.jpegData(compressionQuality: compression)
        }

        return data
    }

    func generateThumbnail(
        from image: UIImage,
        size: CGSize
    ) async -> UIImage? {
        await Task.detached {
            let renderer = UIGraphicsImageRenderer(size: size)
            return renderer.image { _ in
                image.draw(in: CGRect(origin: .zero, size: size))
            }
        }.value
    }
}
```

### 4.5 Biometric Authentication

```swift
// MARK: - Biometric Service
import LocalAuthentication

final class BiometricService {
    private let context = LAContext()
    private let keychainService: KeychainService

    init(keychainService: KeychainService) {
        self.keychainService = keychainService
    }

    var biometricType: BiometricType {
        var error: NSError?

        guard context.canEvaluatePolicy(.deviceOwnerAuthenticationWithBiometrics, error: &error) else {
            return .none
        }

        switch context.biometryType {
        case .faceID:
            return .faceID
        case .touchID:
            return .touchID
        case .opticID:
            return .opticID
        case .none:
            return .none
        @unknown default:
            return .none
        }
    }

    func authenticate() async throws -> Bool {
        let reason = "Authenticate to access your GTSD account"

        do {
            return try await context.evaluatePolicy(
                .deviceOwnerAuthenticationWithBiometrics,
                localizedReason: reason
            )
        } catch let error as LAError {
            throw BiometricError.from(error)
        }
    }

    func isBiometricEnabled() -> Bool {
        (try? keychainService.retrieve(.biometricEnabled)) == "true"
    }

    func setBiometricEnabled(_ enabled: Bool) {
        if enabled {
            try? keychainService.save("true", for: .biometricEnabled)
        } else {
            keychainService.delete(.biometricEnabled)
        }
    }
}

enum BiometricType {
    case faceID
    case touchID
    case opticID
    case none

    var description: String {
        switch self {
        case .faceID: return "Face ID"
        case .touchID: return "Touch ID"
        case .opticID: return "Optic ID"
        case .none: return "None"
        }
    }
}

enum BiometricError: LocalizedError {
    case authenticationFailed
    case userCancel
    case userFallback
    case biometryNotAvailable
    case biometryNotEnrolled
    case biometryLockout
    case unknown(Error)

    static func from(_ error: LAError) -> BiometricError {
        switch error.code {
        case .authenticationFailed:
            return .authenticationFailed
        case .userCancel:
            return .userCancel
        case .userFallback:
            return .userFallback
        case .biometryNotAvailable:
            return .biometryNotAvailable
        case .biometryNotEnrolled:
            return .biometryNotEnrolled
        case .biometryLockout:
            return .biometryLockout
        default:
            return .unknown(error)
        }
    }

    var errorDescription: String? {
        switch self {
        case .authenticationFailed:
            return "Authentication failed. Please try again."
        case .userCancel:
            return "Authentication was cancelled."
        case .userFallback:
            return "Fallback authentication method selected."
        case .biometryNotAvailable:
            return "Biometric authentication is not available on this device."
        case .biometryNotEnrolled:
            return "No biometric data enrolled. Please set up Face ID or Touch ID."
        case .biometryLockout:
            return "Biometric authentication is locked. Please try again later."
        case .unknown(let error):
            return error.localizedDescription
        }
    }
}
```

### 4.6 Push Notifications

```swift
// MARK: - Notification Service
import UserNotifications

final class NotificationService: NSObject {
    static let shared = NotificationService()

    private override init() {
        super.init()
    }

    func requestAuthorization() async throws -> Bool {
        let center = UNUserNotificationCenter.current()

        let options: UNAuthorizationOptions = [.alert, .sound, .badge]
        return try await center.requestAuthorization(options: options)
    }

    func registerForRemoteNotifications() {
        DispatchQueue.main.async {
            UIApplication.shared.registerForRemoteNotifications()
        }
    }

    func scheduleLocalNotification(
        title: String,
        body: String,
        date: Date,
        identifier: String
    ) async throws {
        let content = UNMutableNotificationContent()
        content.title = title
        content.body = body
        content.sound = .default

        let components = Calendar.current.dateComponents(
            [.year, .month, .day, .hour, .minute],
            from: date
        )

        let trigger = UNCalendarNotificationTrigger(
            dateMatching: components,
            repeats: false
        )

        let request = UNNotificationRequest(
            identifier: identifier,
            content: content,
            trigger: trigger
        )

        try await UNUserNotificationCenter.current().add(request)
    }

    func cancelNotification(identifier: String) {
        UNUserNotificationCenter.current().removePendingNotificationRequests(
            withIdentifiers: [identifier]
        )
    }
}

// MARK: - UNUserNotificationCenterDelegate
extension NotificationService: UNUserNotificationCenterDelegate {
    func userNotificationCenter(
        _ center: UNUserNotificationCenter,
        willPresent notification: UNNotification
    ) async -> UNNotificationPresentationOptions {
        return [.banner, .sound, .badge]
    }

    func userNotificationCenter(
        _ center: UNUserNotificationCenter,
        didReceive response: UNNotificationResponse
    ) async {
        // Handle notification tap
        let userInfo = response.notification.request.content.userInfo

        // Navigate to appropriate screen based on userInfo
        NotificationCenter.default.post(
            name: .didReceiveNotificationResponse,
            object: nil,
            userInfo: userInfo
        )
    }
}

extension Notification.Name {
    static let didReceiveNotificationResponse = Notification.Name("didReceiveNotificationResponse")
}
```

---

## 5. SwiftUI Views & Components

### 5.1 Design System

```swift
// MARK: - Color Palette
extension Color {
    // Primary colors
    static let gtsdPrimary = Color("Primary") // Vibrant blue
    static let gtsdSecondary = Color("Secondary") // Energetic orange
    static let gtsdAccent = Color("Accent") // Success green

    // Neutral colors
    static let gtsdBackground = Color("Background")
    static let gtsdSurface = Color("Surface")
    static let gtsdBorder = Color("Border")

    // Semantic colors
    static let gtsdSuccess = Color("Success")
    static let gtsdWarning = Color("Warning")
    static let gtsdError = Color("Error")
    static let gtsdInfo = Color("Info")

    // Text colors
    static let gtsdTextPrimary = Color("TextPrimary")
    static let gtsdTextSecondary = Color("TextSecondary")
    static let gtsdTextTertiary = Color("TextTertiary")
}

// MARK: - Typography
enum GTSDFont {
    case largeTitle
    case title1
    case title2
    case title3
    case headline
    case body
    case callout
    case subheadline
    case footnote
    case caption1
    case caption2

    var font: Font {
        switch self {
        case .largeTitle: return .system(size: 34, weight: .bold)
        case .title1: return .system(size: 28, weight: .bold)
        case .title2: return .system(size: 22, weight: .bold)
        case .title3: return .system(size: 20, weight: .semibold)
        case .headline: return .system(size: 17, weight: .semibold)
        case .body: return .system(size: 17, weight: .regular)
        case .callout: return .system(size: 16, weight: .regular)
        case .subheadline: return .system(size: 15, weight: .regular)
        case .footnote: return .system(size: 13, weight: .regular)
        case .caption1: return .system(size: 12, weight: .regular)
        case .caption2: return .system(size: 11, weight: .regular)
        }
    }
}

// MARK: - Spacing
enum Spacing {
    static let xs: CGFloat = 4
    static let sm: CGFloat = 8
    static let md: CGFloat = 16
    static let lg: CGFloat = 24
    static let xl: CGFloat = 32
    static let xxl: CGFloat = 48
}

// MARK: - Corner Radius
enum CornerRadius {
    static let sm: CGFloat = 4
    static let md: CGFloat = 8
    static let lg: CGFloat = 12
    static let xl: CGFloat = 16
    static let pill: CGFloat = 999
}
```

### 5.2 Reusable Components

```swift
// MARK: - Primary Button
struct PrimaryButton: View {
    let title: String
    let action: () -> Void
    var isLoading: Bool = false
    var isDisabled: Bool = false
    var fullWidth: Bool = true

    var body: some View {
        Button(action: action) {
            HStack {
                if isLoading {
                    ProgressView()
                        .progressViewStyle(CircularProgressViewStyle(tint: .white))
                } else {
                    Text(title)
                        .font(GTSDFont.headline.font)
                }
            }
            .frame(maxWidth: fullWidth ? .infinity : nil)
            .frame(height: 56)
            .foregroundColor(.white)
            .background(isDisabled ? Color.gray : Color.gtsdPrimary)
            .cornerRadius(CornerRadius.lg)
        }
        .disabled(isDisabled || isLoading)
    }
}

// MARK: - GTSD Text Field
struct GTSDTextField: View {
    let title: String
    @Binding var text: String
    var placeholder: String = ""
    var icon: String? = nil
    var keyboardType: UIKeyboardType = .default
    var autocapitalization: TextInputAutocapitalization = .sentences

    var body: some View {
        VStack(alignment: .leading, spacing: Spacing.xs) {
            if !title.isEmpty {
                Text(title)
                    .font(GTSDFont.subheadline.font)
                    .foregroundColor(.gtsdTextSecondary)
            }

            HStack(spacing: Spacing.sm) {
                if let icon = icon {
                    Image(systemName: icon)
                        .foregroundColor(.gtsdTextTertiary)
                }

                TextField(placeholder, text: $text)
                    .font(GTSDFont.body.font)
                    .keyboardType(keyboardType)
                    .textInputAutocapitalization(autocapitalization)
            }
            .padding(Spacing.md)
            .background(Color.gtsdSurface)
            .cornerRadius(CornerRadius.md)
            .overlay(
                RoundedRectangle(cornerRadius: CornerRadius.md)
                    .stroke(Color.gtsdBorder, lineWidth: 1)
            )
        }
    }
}

// MARK: - Task Card
struct TaskCard: View {
    let task: DailyTask
    let onTap: () -> Void
    let onComplete: () -> Void

    var body: some View {
        HStack(spacing: Spacing.md) {
            // Task type icon
            Circle()
                .fill(taskColor.opacity(0.2))
                .frame(width: 48, height: 48)
                .overlay(
                    Image(systemName: taskIcon)
                        .foregroundColor(taskColor)
                )

            // Task details
            VStack(alignment: .leading, spacing: 4) {
                Text(task.title)
                    .font(GTSDFont.headline.font)
                    .foregroundColor(.gtsdTextPrimary)

                if let description = task.taskDescription {
                    Text(description)
                        .font(GTSDFont.subheadline.font)
                        .foregroundColor(.gtsdTextSecondary)
                        .lineLimit(2)
                }

                HStack {
                    Image(systemName: "clock")
                        .font(.caption)
                    Text(task.dueDate, style: .time)
                        .font(GTSDFont.caption1.font)
                }
                .foregroundColor(.gtsdTextTertiary)
            }

            Spacer()

            // Completion button
            Button(action: onComplete) {
                Image(systemName: task.status == .completed ? "checkmark.circle.fill" : "circle")
                    .font(.title2)
                    .foregroundColor(task.status == .completed ? .gtsdSuccess : .gtsdTextTertiary)
            }
        }
        .padding(Spacing.md)
        .background(Color.gtsdSurface)
        .cornerRadius(CornerRadius.lg)
        .shadow(color: .black.opacity(0.05), radius: 8, y: 2)
        .onTapGesture(perform: onTap)
    }

    private var taskColor: Color {
        switch task.taskType {
        case .workout, .cardio: return .blue
        case .meal: return .orange
        case .supplement: return .purple
        case .hydration: return .cyan
        case .weightLog: return .green
        case .progressPhoto: return .pink
        }
    }

    private var taskIcon: String {
        switch task.taskType {
        case .workout: return "figure.strengthtraining.traditional"
        case .cardio: return "figure.run"
        case .meal: return "fork.knife"
        case .supplement: return "pills.fill"
        case .hydration: return "drop.fill"
        case .weightLog: return "scalemass.fill"
        case .progressPhoto: return "camera.fill"
        }
    }
}

// MARK: - Stat Card
struct StatCard: View {
    let title: String
    let value: String
    let icon: String
    let color: Color

    var body: some View {
        VStack(spacing: Spacing.sm) {
            Image(systemName: icon)
                .font(.title2)
                .foregroundColor(color)

            Text(value)
                .font(GTSDFont.title2.font)
                .foregroundColor(.gtsdTextPrimary)

            Text(title)
                .font(GTSDFont.caption1.font)
                .foregroundColor(.gtsdTextSecondary)
        }
        .frame(maxWidth: .infinity)
        .padding(Spacing.md)
        .background(Color.gtsdSurface)
        .cornerRadius(CornerRadius.lg)
    }
}

// MARK: - Loading View
struct LoadingView: View {
    var message: String = "Loading..."

    var body: some View {
        VStack(spacing: Spacing.md) {
            ProgressView()
                .scaleEffect(1.5)

            Text(message)
                .font(GTSDFont.subheadline.font)
                .foregroundColor(.gtsdTextSecondary)
        }
    }
}

// MARK: - Error View
struct ErrorView: View {
    let error: Error
    let retryAction: () -> Void

    var body: some View {
        VStack(spacing: Spacing.lg) {
            Image(systemName: "exclamationmark.triangle.fill")
                .font(.system(size: 48))
                .foregroundColor(.gtsdError)

            Text("Something went wrong")
                .font(GTSDFont.title3.font)
                .foregroundColor(.gtsdTextPrimary)

            Text(error.localizedDescription)
                .font(GTSDFont.body.font)
                .foregroundColor(.gtsdTextSecondary)
                .multilineTextAlignment(.center)
                .padding(.horizontal, Spacing.xl)

            PrimaryButton(title: "Try Again", action: retryAction, fullWidth: false)
                .padding(.horizontal, Spacing.xl)
        }
    }
}

// MARK: - Empty State View
struct EmptyStateView: View {
    let icon: String
    let title: String
    let message: String
    var actionTitle: String? = nil
    var action: (() -> Void)? = nil

    var body: some View {
        VStack(spacing: Spacing.lg) {
            Image(systemName: icon)
                .font(.system(size: 64))
                .foregroundColor(.gtsdTextTertiary)

            Text(title)
                .font(GTSDFont.title3.font)
                .foregroundColor(.gtsdTextPrimary)

            Text(message)
                .font(GTSDFont.body.font)
                .foregroundColor(.gtsdTextSecondary)
                .multilineTextAlignment(.center)
                .padding(.horizontal, Spacing.xl)

            if let actionTitle = actionTitle, let action = action {
                PrimaryButton(title: actionTitle, action: action, fullWidth: false)
                    .padding(.horizontal, Spacing.xl)
            }
        }
        .padding(Spacing.xl)
    }
}
```

### 5.3 View Model Example

```swift
// MARK: - Login ViewModel
@available(iOS 17.0, *)
@Observable
final class LoginViewModel {
    var email: String = ""
    var password: String = ""
    var rememberMe: Bool = false
    var isLoading: Bool = false
    var errorMessage: String?
    var isAuthenticated: Bool = false

    private let loginUseCase: LoginUseCase
    private let biometricService: BiometricService

    init(
        loginUseCase: LoginUseCase,
        biometricService: BiometricService
    ) {
        self.loginUseCase = loginUseCase
        self.biometricService = biometricService
    }

    @MainActor
    func login() async {
        guard validateInput() else { return }

        isLoading = true
        errorMessage = nil

        do {
            let result = try await loginUseCase.execute(
                email: email,
                password: password,
                rememberMe: rememberMe
            )

            isAuthenticated = true
            isLoading = false

            // Optionally setup biometric
            if rememberMe && biometricService.biometricType != .none {
                biometricService.setBiometricEnabled(true)
            }
        } catch {
            isLoading = false
            errorMessage = error.localizedDescription
        }
    }

    @MainActor
    func loginWithBiometric() async {
        guard biometricService.isBiometricEnabled() else {
            errorMessage = "Biometric authentication is not enabled"
            return
        }

        do {
            let success = try await biometricService.authenticate()
            if success {
                // Auto-login with saved credentials
                isAuthenticated = true
            }
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    private func validateInput() -> Bool {
        if email.isEmpty {
            errorMessage = "Please enter your email"
            return false
        }

        if !email.isValidEmail {
            errorMessage = "Please enter a valid email address"
            return false
        }

        if password.isEmpty {
            errorMessage = "Please enter your password"
            return false
        }

        if password.count < 8 {
            errorMessage = "Password must be at least 8 characters"
            return false
        }

        return true
    }
}

// MARK: - Email Validation Extension
extension String {
    var isValidEmail: Bool {
        let emailRegex = "[A-Z0-9a-z._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,64}"
        let emailPredicate = NSPredicate(format: "SELF MATCHES %@", emailRegex)
        return emailPredicate.evaluate(with: self)
    }
}
```

### 5.4 Navigation Structure

```swift
// MARK: - App Coordinator
@available(iOS 17.0, *)
@Observable
final class AppCoordinator {
    var authState: AuthState = .unauthenticated
    var showOnboarding: Bool = false
    var selectedTab: Tab = .home

    enum AuthState {
        case unauthenticated
        case authenticated
        case loading
    }

    enum Tab: String, CaseIterable {
        case home = "Home"
        case tasks = "Tasks"
        case progress = "Progress"
        case streaks = "Streaks"
        case profile = "Profile"

        var icon: String {
            switch self {
            case .home: return "house.fill"
            case .tasks: return "checkmark.circle.fill"
            case .progress: return "chart.line.uptrend.xyaxis"
            case .streaks: return "flame.fill"
            case .profile: return "person.fill"
            }
        }
    }

    func checkAuthenticationStatus() async {
        authState = .loading

        // Check if user is authenticated
        // If yes, check if onboarding is complete
        // Update authState accordingly
    }
}

// MARK: - Main App View
@main
struct GTSDApp: App {
    @State private var coordinator = AppCoordinator()

    var body: some Scene {
        WindowGroup {
            Group {
                switch coordinator.authState {
                case .loading:
                    LoadingView(message: "Loading your data...")

                case .unauthenticated:
                    LoginView()

                case .authenticated:
                    if coordinator.showOnboarding {
                        OnboardingCoordinator()
                    } else {
                        TabBarView()
                    }
                }
            }
            .environment(coordinator)
            .task {
                await coordinator.checkAuthenticationStatus()
            }
        }
    }
}

// MARK: - Tab Bar View
struct TabBarView: View {
    @Environment(AppCoordinator.self) private var coordinator

    var body: some View {
        @Bindable var coordinator = coordinator

        TabView(selection: $coordinator.selectedTab) {
            ForEach(AppCoordinator.Tab.allCases, id: \.self) { tab in
                destinationView(for: tab)
                    .tabItem {
                        Label(tab.rawValue, systemImage: tab.icon)
                    }
                    .tag(tab)
            }
        }
        .tint(.gtsdPrimary)
    }

    @ViewBuilder
    private func destinationView(for tab: AppCoordinator.Tab) -> some View {
        switch tab {
        case .home:
            HomeView()
        case .tasks:
            TodayTasksView()
        case .progress:
            ProgressView()
        case .streaks:
            StreaksView()
        case .profile:
            ProfileView()
        }
    }
}
```

---

## 6. Development Phases

### Phase 1: Foundation & Authentication (Week 1-2)

**Objectives:**

- Set up Xcode project
- Implement networking layer
- Build authentication flow
- Set up local storage

**Deliverables:**

- [ ] Xcode project created with proper structure
- [ ] APIClient and endpoint definitions
- [ ] Token management with Keychain
- [ ] Login/Signup screens functional
- [ ] Biometric authentication working
- [ ] Basic error handling

**Tasks:**

1. Create Xcode project with iOS 17 minimum target
2. Set up folder structure as defined in section 2
3. Implement APIClient with async/await
4. Create KeychainService for secure storage
5. Build LoginView and SignupView
6. Implement LoginViewModel with form validation
7. Add BiometricService integration
8. Test authentication flow end-to-end

### Phase 2: Onboarding Flow (Week 2-3)

**Objectives:**

- Multi-step onboarding wizard
- Form validation
- API integration for onboarding submission

**Deliverables:**

- [ ] All 8 onboarding screens completed
- [ ] Step-by-step navigation with progress bar
- [ ] Form validation for each step
- [ ] Onboarding API integration
- [ ] Calculated metrics display

**Tasks:**

1. Create OnboardingCoordinator for step management
2. Build all 8 onboarding screens
3. Implement OnboardingViewModel with state management
4. Add form validation for each step
5. Create custom pickers and steppers
6. Implement swipe gestures for navigation
7. Add onboarding API endpoint
8. Display calculated metrics (BMR, TDEE, etc.)
9. Handle back navigation with unsaved changes alert

### Phase 3: Home & Tasks (Week 3-4)

**Objectives:**

- Dashboard with stats
- Today's tasks list
- Task completion flow
- Evidence submission

**Deliverables:**

- [ ] HomeView with stats and quick actions
- [ ] TodayTasksView with filtering
- [ ] TaskCard component
- [ ] Task detail view
- [ ] Evidence submission (text, metrics)
- [ ] Swipe actions for tasks

**Tasks:**

1. Build HomeView with streak counter and stats
2. Create TasksViewModel to fetch today's tasks
3. Implement TaskCard component
4. Add task filtering and sorting
5. Build TaskDetailView
6. Create evidence submission UI
7. Integrate task completion API
8. Add swipe actions (complete, skip)
9. Implement pull-to-refresh

### Phase 4: Photo Uploads & Progress (Week 4-5)

**Objectives:**

- Camera and photo library access
- Image compression
- S3 upload workflow
- Photo gallery

**Deliverables:**

- [ ] Camera view
- [ ] Photo selection from library
- [ ] Image compression service
- [ ] Presigned URL upload flow
- [ ] Photo gallery with filters
- [ ] Before/after comparison

**Tasks:**

1. Request camera and photo library permissions
2. Build CameraView with AVFoundation
3. Implement photo picker with PhotosUI
4. Create ImageCompressionService
5. Implement UploadPhotoUseCase with S3 flow
6. Build PhotoGalleryView
7. Add photo filtering (angle, date range)
8. Create comparison view (slider)
9. Handle offline photo queue

### Phase 5: Streaks, Badges & Gamification (Week 5-6)

**Objectives:**

- Streak tracking
- Badge display
- Animations and celebrations
- Push notifications

**Deliverables:**

- [ ] StreaksView with calendar heatmap
- [ ] BadgesView with unlock animations
- [ ] Badge detail modal
- [ ] Confetti animation for new badges
- [ ] Daily reminder notifications

**Tasks:**

1. Fetch streaks data from API
2. Build StreaksView with current streak
3. Implement calendar heatmap (GitHub-style)
4. Create BadgeCard component
5. Build BadgesView with grid layout
6. Add badge unlock animation
7. Implement confetti celebration
8. Set up push notification permissions
9. Schedule daily reminder notifications

### Phase 6: Profile, Settings & Polish (Week 6-7)

**Objectives:**

- User profile management
- App settings
- Dark mode support
- Animations and polish
- Testing and bug fixes

**Deliverables:**

- [ ] ProfileView with editable fields
- [ ] SettingsView with preferences
- [ ] Dark mode support
- [ ] Smooth animations throughout
- [ ] Haptic feedback
- [ ] Accessibility improvements
- [ ] Bug fixes and optimization

**Tasks:**

1. Build ProfileView with user info
2. Add edit profile functionality
3. Create SettingsView
4. Implement notification preferences
5. Add dark mode color palette
6. Add animations (transitions, loading states)
7. Implement haptic feedback
8. Test accessibility with VoiceOver
9. Optimize performance (image caching, etc.)
10. Fix bugs and edge cases

### Phase 7: Advanced Features (Week 7-8)

**Objectives:**

- Offline mode improvements
- Background sync
- Widget (home screen)
- App Clips (optional)

**Deliverables:**

- [ ] Offline task queue
- [ ] Background refresh
- [ ] Home screen widget
- [ ] App Store submission preparation

**Tasks:**

1. Implement offline task queue
2. Add background refresh capability
3. Create Today widget with stats
4. Prepare App Store assets
5. Final testing on multiple devices
6. Performance profiling
7. Submit to TestFlight

---

## 7. Project Setup Instructions

### 7.1 Prerequisites

- **macOS**: Sonoma 14.0 or later
- **Xcode**: 15.0 or later
- **iOS Deployment Target**: iOS 17.0 or later
- **Swift**: 5.9 or later
- **CocoaPods or SPM**: For dependency management

### 7.2 Initial Xcode Project Setup

```bash
# 1. Create new Xcode project
# File > New > Project > iOS > App
# - Product Name: GTSD
# - Team: Your Apple Developer Team
# - Organization Identifier: com.gtsd (or your domain)
# - Interface: SwiftUI
# - Language: Swift
# - Include Tests: Yes

# 2. Set minimum deployment target
# Project Settings > General > Deployment Info > iOS 17.0

# 3. Enable required capabilities
# Signing & Capabilities > Add Capability
# - Push Notifications
# - Background Modes (Background fetch, Remote notifications)
# - App Groups (for widget, optional)
```

### 7.3 Info.plist Configuration

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <!-- Camera Access -->
    <key>NSCameraUsageDescription</key>
    <string>GTSD needs access to your camera to take progress photos.</string>

    <!-- Photo Library Access -->
    <key>NSPhotoLibraryUsageDescription</key>
    <string>GTSD needs access to your photo library to select progress photos.</string>

    <!-- Photo Library Add Only -->
    <key>NSPhotoLibraryAddUsageDescription</key>
    <string>GTSD needs permission to save your progress photos.</string>

    <!-- Face ID -->
    <key>NSFaceIDUsageDescription</key>
    <string>GTSD uses Face ID to securely log you in.</string>

    <!-- Notifications -->
    <key>NSUserNotificationsUsageDescription</key>
    <string>GTSD sends you reminders to complete your daily tasks.</string>

    <!-- App Transport Security (for development) -->
    <key>NSAppTransportSecurity</key>
    <dict>
        <key>NSAllowsArbitraryLoads</key>
        <false/>
        <!-- Only for development with local API -->
        <key>NSExceptionDomains</key>
        <dict>
            <key>localhost</key>
            <dict>
                <key>NSExceptionAllowsInsecureHTTPLoads</key>
                <true/>
            </dict>
        </dict>
    </dict>
</dict>
</plist>
```

### 7.4 Environment Configuration

Create `Environment.swift`:

```swift
enum Environment {
    enum Configuration {
        case development
        case staging
        case production
    }

    static var current: Configuration {
        #if DEBUG
        return .development
        #else
        return .production
        #endif
    }

    static var apiBaseURL: String {
        switch current {
        case .development:
            return "http://localhost:3000"
        case .staging:
            return "https://staging-api.gtsd.com"
        case .production:
            return "https://api.gtsd.com"
        }
    }

    static var enableLogging: Bool {
        current == .development
    }
}
```

### 7.5 Dependencies (Swift Package Manager)

Add dependencies in Xcode:

1. File > Add Package Dependencies
2. Add the following URLs:

```
# KeychainAccess
https://github.com/kishikawakatsumi/KeychainAccess

# Optional: Alamofire (if needed for advanced networking)
https://github.com/Alamofire/Alamofire
```

### 7.6 Build Configurations

Create separate schemes for development and production:

```
# Development Scheme
- Build Configuration: Debug
- Environment: development
- API URL: http://localhost:3000

# Production Scheme
- Build Configuration: Release
- Environment: production
- API URL: https://api.gtsd.com
```

### 7.7 Asset Catalog Setup

Create color sets in `Assets.xcassets`:

```
Colors/
├── Primary (Adaptive)
│   ├── Any Appearance: #007AFF
│   └── Dark Appearance: #0A84FF
├── Secondary (Adaptive)
│   ├── Any Appearance: #FF9500
│   └── Dark Appearance: #FF9F0A
├── Background (Adaptive)
│   ├── Any Appearance: #FFFFFF
│   └── Dark Appearance: #000000
├── Surface (Adaptive)
│   ├── Any Appearance: #F2F2F7
│   └── Dark Appearance: #1C1C1E
└── ... (other colors)
```

---

## 8. Testing Strategy

### 8.1 Unit Tests

```swift
// MARK: - ViewModel Tests
final class LoginViewModelTests: XCTestCase {
    var sut: LoginViewModel!
    var mockLoginUseCase: MockLoginUseCase!
    var mockBiometricService: MockBiometricService!

    override func setUp() {
        super.setUp()
        mockLoginUseCase = MockLoginUseCase()
        mockBiometricService = MockBiometricService()
        sut = LoginViewModel(
            loginUseCase: mockLoginUseCase,
            biometricService: mockBiometricService
        )
    }

    override func tearDown() {
        sut = nil
        mockLoginUseCase = nil
        mockBiometricService = nil
        super.tearDown()
    }

    func testLogin_WithValidCredentials_ShouldSucceed() async {
        // Given
        sut.email = "test@example.com"
        sut.password = "password123"
        mockLoginUseCase.shouldSucceed = true

        // When
        await sut.login()

        // Then
        XCTAssertTrue(sut.isAuthenticated)
        XCTAssertNil(sut.errorMessage)
        XCTAssertFalse(sut.isLoading)
    }

    func testLogin_WithInvalidEmail_ShouldShowError() async {
        // Given
        sut.email = "invalid-email"
        sut.password = "password123"

        // When
        await sut.login()

        // Then
        XCTAssertFalse(sut.isAuthenticated)
        XCTAssertNotNil(sut.errorMessage)
        XCTAssertEqual(sut.errorMessage, "Please enter a valid email address")
    }
}
```

### 8.2 Integration Tests

```swift
// MARK: - API Integration Tests
final class AuthRepositoryTests: XCTestCase {
    var sut: AuthRepository!
    var mockAPIClient: MockAPIClient!

    func testLogin_ShouldReturnUserAndTokens() async throws {
        // Given
        let email = "test@example.com"
        let password = "password123"

        // When
        let result = try await sut.login(email: email, password: password)

        // Then
        XCTAssertNotNil(result.user)
        XCTAssertNotNil(result.tokens)
        XCTAssertEqual(result.user.email, email)
    }
}
```

### 8.3 UI Tests

```swift
// MARK: - Login Flow UI Tests
final class LoginFlowUITests: XCTestCase {
    var app: XCUIApplication!

    override func setUpWithError() throws {
        continueAfterFailure = false
        app = XCUIApplication()
        app.launch()
    }

    func testLoginFlow_WithValidCredentials_ShouldNavigateToHome() {
        // Given
        let emailTextField = app.textFields["Email"]
        let passwordSecureField = app.secureTextFields["Password"]
        let loginButton = app.buttons["Log In"]

        // When
        emailTextField.tap()
        emailTextField.typeText("test@example.com")

        passwordSecureField.tap()
        passwordSecureField.typeText("password123")

        loginButton.tap()

        // Then
        let homeView = app.otherElements["HomeView"]
        XCTAssertTrue(homeView.waitForExistence(timeout: 5))
    }
}
```

---

## 9. Performance Optimization

### 9.1 Image Caching

```swift
// MARK: - Image Cache Manager
actor ImageCacheManager {
    static let shared = ImageCacheManager()

    private var cache = NSCache<NSString, UIImage>()
    private var diskCacheURL: URL

    init() {
        cache.countLimit = 100
        cache.totalCostLimit = 50 * 1024 * 1024 // 50 MB

        diskCacheURL = FileManager.default.urls(
            for: .cachesDirectory,
            in: .userDomainMask
        )[0].appendingPathComponent("ImageCache")

        try? FileManager.default.createDirectory(
            at: diskCacheURL,
            withIntermediateDirectories: true
        )
    }

    func image(for key: String) -> UIImage? {
        // Check memory cache
        if let cached = cache.object(forKey: key as NSString) {
            return cached
        }

        // Check disk cache
        let fileURL = diskCacheURL.appendingPathComponent(key)
        if let data = try? Data(contentsOf: fileURL),
           let image = UIImage(data: data) {
            cache.setObject(image, forKey: key as NSString)
            return image
        }

        return nil
    }

    func store(_ image: UIImage, for key: String) {
        // Store in memory cache
        cache.setObject(image, forKey: key as NSString)

        // Store on disk
        let fileURL = diskCacheURL.appendingPathComponent(key)
        if let data = image.jpegData(compressionQuality: 0.8) {
            try? data.write(to: fileURL)
        }
    }
}
```

### 9.2 Lazy Loading

```swift
// MARK: - Lazy List
struct LazyTaskList: View {
    @State private var tasks: [DailyTask] = []

    var body: some View {
        ScrollView {
            LazyVStack(spacing: Spacing.md) {
                ForEach(tasks) { task in
                    TaskCard(task: task, onTap: {}, onComplete: {})
                        .onAppear {
                            // Load more when reaching end
                            if task == tasks.last {
                                loadMoreTasks()
                            }
                        }
                }
            }
        }
    }

    private func loadMoreTasks() {
        // Fetch next page
    }
}
```

### 9.3 Background Refresh

```swift
// MARK: - App Delegate for Background Tasks
class AppDelegate: NSObject, UIApplicationDelegate {
    func application(
        _ application: UIApplication,
        didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?
    ) -> Bool {
        // Register background task
        BGTaskScheduler.shared.register(
            forTaskWithIdentifier: "com.gtsd.sync",
            using: nil
        ) { task in
            self.handleBackgroundSync(task: task as! BGAppRefreshTask)
        }

        return true
    }

    private func handleBackgroundSync(task: BGAppRefreshTask) {
        task.expirationHandler = {
            task.setTaskCompleted(success: false)
        }

        Task {
            // Sync data
            await syncTasksAndPhotos()
            task.setTaskCompleted(success: true)
        }
    }

    private func syncTasksAndPhotos() async {
        // Implement sync logic
    }
}
```

---

## 10. Security Considerations

### 10.1 Certificate Pinning

```swift
// MARK: - Certificate Pinning (URLSessionDelegate)
final class CertificatePinner: NSObject, URLSessionDelegate {
    private let pinnedCertificates: [Data]

    init(certificateNames: [String]) {
        var certificates: [Data] = []

        for name in certificateNames {
            if let certPath = Bundle.main.path(forResource: name, ofType: "cer"),
               let certData = try? Data(contentsOf: URL(fileURLWithPath: certPath)) {
                certificates.append(certData)
            }
        }

        self.pinnedCertificates = certificates
    }

    func urlSession(
        _ session: URLSession,
        didReceive challenge: URLAuthenticationChallenge,
        completionHandler: @escaping (URLSession.AuthChallengeDisposition, URLCredential?) -> Void
    ) {
        guard let serverTrust = challenge.protectionSpace.serverTrust,
              let serverCertificate = SecTrustGetCertificateAtIndex(serverTrust, 0) else {
            completionHandler(.cancelAuthenticationChallenge, nil)
            return
        }

        let serverCertificateData = SecCertificateCopyData(serverCertificate) as Data

        if pinnedCertificates.contains(serverCertificateData) {
            completionHandler(.useCredential, URLCredential(trust: serverTrust))
        } else {
            completionHandler(.cancelAuthenticationChallenge, nil)
        }
    }
}
```

### 10.2 API Key Protection

```swift
// MARK: - Secure API Key Storage
// DO NOT hardcode API keys in code
// Use environment variables or remote config

enum SecureConfig {
    static var apiKey: String {
        // Fetch from secure remote config or Keychain
        // For development, use local .env file (gitignored)
        return ProcessInfo.processInfo.environment["API_KEY"] ?? ""
    }
}
```

### 10.3 Data Encryption

```swift
// MARK: - Sensitive Data Encryption
final class EncryptionService {
    func encrypt(data: Data, using key: SymmetricKey) throws -> Data {
        let sealedBox = try AES.GCM.seal(data, using: key)
        return sealedBox.combined!
    }

    func decrypt(data: Data, using key: SymmetricKey) throws -> Data {
        let sealedBox = try AES.GCM.SealedBox(combined: data)
        return try AES.GCM.open(sealedBox, using: key)
    }
}
```

---

## 11. App Store Preparation

### 11.1 Required Assets

**App Icon:**

- 1024x1024 px (App Store)
- Multiple sizes for iOS (automatically generated)

**Screenshots:**

- iPhone 6.7" (Pro Max)
- iPhone 6.5" (Plus)
- iPhone 5.5"

**Preview Video:** (Optional but recommended)

- 30 seconds max
- Showcasing key features

### 11.2 App Metadata

```
App Name: GTSD - Get That Shredded Done

Subtitle: Track, Achieve, Transform

Description:
GTSD is your ultimate fitness accountability partner. Transform your body
and build lasting habits with science-based tracking, daily tasks, and
gamification that keeps you motivated.

Features:
• Personalized fitness plans based on your goals
• Daily task tracking with evidence submission
• Progress photos with before/after comparisons
• Streak tracking and achievement badges
• Secure biometric login
• Beautiful, intuitive interface

Whether you're looking to lose weight, gain muscle, or improve overall
health, GTSD provides the structure and motivation you need to succeed.

Keywords: fitness, health, workout, tracking, accountability, habits,
streaks, progress photos, meal planning, weight loss

Category: Health & Fitness
Age Rating: 4+
```

---

## 12. Summary & Next Steps

### Recommended Development Order

1. **Start with Phase 1**: Get authentication working end-to-end
2. **Build incrementally**: Don't try to implement everything at once
3. **Test frequently**: Write tests as you build features
4. **Use TestFlight**: Get beta testers involved early (Phase 4+)
5. **Iterate based on feedback**: Real user feedback is invaluable

### Key Success Metrics

- **App Launch Time**: < 2 seconds
- **API Response Time**: < 1 second for most endpoints
- **Crash Rate**: < 0.1%
- **User Retention**: Track D1, D7, D30
- **Task Completion Rate**: Monitor engagement

### Future Enhancements

- **Apple Watch App**: Workout tracking, quick task completion
- **Widget**: Home screen widget showing today's progress
- **Siri Shortcuts**: Voice commands for task completion
- **HealthKit Integration**: Sync with Apple Health
- **Social Features**: Friend challenges, leaderboards
- **In-App Purchases**: Premium plans, streak freezes
- **App Clips**: Quick task completion without full app install

---

## Appendix A: Code Snippets Library

### A.1 Date Formatting

```swift
extension Date {
    var iso8601String: String {
        let formatter = ISO8601DateFormatter()
        return formatter.string(from: self)
    }

    func formatted(style: DateFormatter.Style) -> String {
        let formatter = DateFormatter()
        formatter.dateStyle = style
        formatter.timeStyle = .none
        return formatter.string(from: self)
    }
}
```

### A.2 View Modifiers

```swift
extension View {
    func loading(_ isLoading: Bool) -> some View {
        self.overlay(
            Group {
                if isLoading {
                    Color.black.opacity(0.3)
                        .overlay(ProgressView())
                }
            }
        )
    }

    func errorAlert(_ error: Binding<Error?>) -> some View {
        self.alert("Error", isPresented: .constant(error.wrappedValue != nil)) {
            Button("OK") {
                error.wrappedValue = nil
            }
        } message: {
            if let error = error.wrappedValue {
                Text(error.localizedDescription)
            }
        }
    }
}
```

---

## Conclusion

This implementation plan provides a comprehensive roadmap for building a production-ready native iOS app for GTSD. The architecture is modern, scalable, and follows Apple's best practices.

**Key Takeaways:**

- Use Clean Architecture with MVVM for separation of concerns
- Leverage SwiftUI and modern Swift concurrency (async/await)
- Prioritize offline-first design with local caching
- Implement robust error handling and user feedback
- Focus on performance and security from day one
- Follow Apple Human Interface Guidelines for great UX

**Estimated Timeline**: 7-8 weeks for MVP
**Recommended Team Size**: 1-2 iOS developers

Good luck building GTSD for iOS! 🚀
