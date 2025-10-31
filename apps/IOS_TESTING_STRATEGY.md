# GTSD iOS Automated Testing Strategy

## Executive Summary

This document outlines a comprehensive automated testing strategy for the GTSD (Get That Shredded Done) native iOS fitness tracking application. The strategy focuses on achieving high test coverage (80%+), preventing regressions, and ensuring quality throughout the development lifecycle using XCTest, XCUITest, and modern Swift testing patterns.

---

## Table of Contents

1. [Testing Pyramid Overview](#1-testing-pyramid-overview)
2. [Unit Testing Strategy](#2-unit-testing-strategy)
3. [Integration Testing Strategy](#3-integration-testing-strategy)
4. [UI Testing Strategy](#4-ui-testing-strategy)
5. [Test Data Management](#5-test-data-management)
6. [Continuous Integration](#6-continuous-integration)
7. [Testing Tools & Frameworks](#7-testing-tools--frameworks)
8. [Example Test Implementations](#8-example-test-implementations)
9. [Test Acceptance Criteria](#9-test-acceptance-criteria)
10. [Performance Testing](#10-performance-testing)

---

## 1. Testing Pyramid Overview

### 1.1 Test Distribution

```
                    ╱╲
                   ╱  ╲
                  ╱ UI ╲           ~10% (Critical user journeys)
                 ╱ Tests╲          20-30 tests
                ╱────────╲
               ╱          ╲
              ╱Integration╲        ~25% (Service + API integration)
             ╱    Tests    ╲       60-80 tests
            ╱──────────────╲
           ╱                ╲
          ╱   Unit Tests     ╲     ~65% (ViewModels, Services, Utils)
         ╱____________________╲    200+ tests
```

### 1.2 Coverage Goals

| Test Type         | Coverage Target | Count Target | Execution Time |
| ----------------- | --------------- | ------------ | -------------- |
| Unit Tests        | 80-90%          | 200+ tests   | < 10 seconds   |
| Integration Tests | 60-70%          | 60-80 tests  | < 30 seconds   |
| UI Tests          | Critical paths  | 20-30 tests  | < 3 minutes    |
| Performance Tests | Key features    | 10-15 tests  | < 2 minutes    |

### 1.3 Test Execution Frequency

- **Unit Tests**: Every build (pre-commit hook)
- **Integration Tests**: Every PR
- **UI Tests**: Before merge to main
- **Performance Tests**: Weekly + before release

---

## 2. Unit Testing Strategy

### 2.1 What to Test

#### ViewModels (Priority: Critical)

- State management and data flow
- User action handling
- Form validation logic
- Error state handling
- Loading states
- Business logic execution

#### Services (Priority: Critical)

- Authentication flows
- Token management
- Photo upload workflows
- Image compression
- Biometric authentication
- Data transformation

#### Repositories (Priority: High)

- API request construction
- Response parsing
- Cache management
- Error mapping
- Offline queue handling

#### Utilities (Priority: Medium)

- Date formatting
- String validation
- Extensions
- Helpers
- Calculations (BMR, TDEE, etc.)

### 2.2 Mocking Strategy

```swift
// MARK: - Protocol-Based Mocking

// Real Service Protocol
protocol AuthenticationServiceProtocol {
    func login(email: String, password: String) async throws -> UserProfile
    func signup(email: String, password: String, name: String) async throws -> UserProfile
    func logout() async throws
    func restoreSession() async throws -> UserProfile
}

// Mock Implementation
final class MockAuthenticationService: AuthenticationServiceProtocol {
    var loginResult: Result<UserProfile, Error>?
    var signupResult: Result<UserProfile, Error>?
    var logoutResult: Result<Void, Error>?
    var restoreSessionResult: Result<UserProfile, Error>?

    var loginCallCount = 0
    var lastLoginEmail: String?
    var lastLoginPassword: String?

    func login(email: String, password: String) async throws -> UserProfile {
        loginCallCount += 1
        lastLoginEmail = email
        lastLoginPassword = password

        switch loginResult {
        case .success(let profile):
            return profile
        case .failure(let error):
            throw error
        case .none:
            fatalError("loginResult not configured in mock")
        }
    }

    func signup(email: String, password: String, name: String) async throws -> UserProfile {
        switch signupResult {
        case .success(let profile):
            return profile
        case .failure(let error):
            throw error
        case .none:
            fatalError("signupResult not configured in mock")
        }
    }

    func logout() async throws {
        switch logoutResult {
        case .success:
            return
        case .failure(let error):
            throw error
        case .none:
            return
        }
    }

    func restoreSession() async throws -> UserProfile {
        switch restoreSessionResult {
        case .success(let profile):
            return profile
        case .failure(let error):
            throw error
        case .none:
            fatalError("restoreSessionResult not configured in mock")
        }
    }
}
```

### 2.3 Test Organization

```
GTSDTests/
├── ViewModelTests/
│   ├── Authentication/
│   │   ├── LoginViewModelTests.swift
│   │   ├── SignupViewModelTests.swift
│   │   └── BiometricViewModelTests.swift
│   ├── Onboarding/
│   │   └── OnboardingViewModelTests.swift
│   ├── Tasks/
│   │   ├── TasksViewModelTests.swift
│   │   └── TaskDetailViewModelTests.swift
│   └── Progress/
│       └── PhotoUploadViewModelTests.swift
├── ServiceTests/
│   ├── AuthenticationServiceTests.swift
│   ├── PhotoUploadServiceTests.swift
│   ├── ImageCompressionServiceTests.swift
│   └── BiometricServiceTests.swift
├── RepositoryTests/
│   ├── AuthRepositoryTests.swift
│   ├── TaskRepositoryTests.swift
│   └── PhotoRepositoryTests.swift
├── UtilityTests/
│   ├── DateExtensionsTests.swift
│   ├── ValidationExtensionsTests.swift
│   └── HealthCalculationsTests.swift
├── Mocks/
│   ├── MockAPIClient.swift
│   ├── MockAuthenticationService.swift
│   ├── MockKeychainManager.swift
│   └── MockPhotoUploadService.swift
└── TestHelpers/
    ├── TestFixtures.swift
    ├── XCTestCase+Extensions.swift
    └── URLProtocolMock.swift
```

### 2.4 Code Coverage Targets

| Component    | Target Coverage | Rationale              |
| ------------ | --------------- | ---------------------- |
| ViewModels   | 90%+            | Core business logic    |
| Services     | 85%+            | Critical functionality |
| Repositories | 80%+            | Data layer reliability |
| Utilities    | 75%+            | Helper functions       |
| UI Views     | 30-40%          | Snapshot tests only    |

---

## 3. Integration Testing Strategy

### 3.1 API Integration Tests

Test the full request/response cycle with mock server responses.

```swift
// MARK: - Mock URL Protocol for API Testing

final class URLProtocolMock: URLProtocol {
    static var mockData: [String: Data] = [:]
    static var mockErrors: [String: Error] = [:]
    static var mockStatusCodes: [String: Int] = [:]

    override class func canInit(with request: URLRequest) -> Bool {
        return true
    }

    override class func canonicalRequest(for request: URLRequest) -> URLRequest {
        return request
    }

    override func startLoading() {
        guard let url = request.url else { return }
        let key = url.absoluteString

        // Check for mock error
        if let error = URLProtocolMock.mockErrors[key] {
            client?.urlProtocol(self, didFailWithError: error)
            return
        }

        // Get mock data and status code
        let data = URLProtocolMock.mockData[key] ?? Data()
        let statusCode = URLProtocolMock.mockStatusCodes[key] ?? 200

        let response = HTTPURLResponse(
            url: url,
            statusCode: statusCode,
            httpVersion: nil,
            headerFields: ["Content-Type": "application/json"]
        )!

        client?.urlProtocol(self, didReceive: response, cacheStoragePolicy: .notAllowed)
        client?.urlProtocol(self, didLoad: data)
        client?.urlProtocolDidFinishLoading(self)
    }

    override func stopLoading() {
        // No-op
    }

    static func reset() {
        mockData = [:]
        mockErrors = [:]
        mockStatusCodes = [:]
    }
}
```

### 3.2 Repository + Service Integration

Test the interaction between repositories and services with real-like data flow.

### 3.3 Data Persistence Tests

Test SwiftData models and local caching behavior.

```swift
// MARK: - SwiftData Integration Tests

final class TaskCacheIntegrationTests: XCTestCase {
    var modelContainer: ModelContainer!
    var modelContext: ModelContext!

    @MainActor
    override func setUp() async throws {
        try await super.setUp()

        // Create in-memory model container for testing
        let schema = Schema([CachedTask.self, CachedPhoto.self])
        let configuration = ModelConfiguration(isStoredInMemoryOnly: true)
        modelContainer = try ModelContainer(for: schema, configurations: [configuration])
        modelContext = ModelContext(modelContainer)
    }

    @MainActor
    override func tearDown() async throws {
        modelContext = nil
        modelContainer = nil
        try await super.tearDown()
    }

    @MainActor
    func testCachedTask_SaveAndRetrieve_ShouldSucceed() throws {
        // Given
        let task = CachedTask(
            id: 1,
            title: "Morning Workout",
            taskDescription: "Complete 30 min strength training",
            taskType: "workout",
            status: "pending",
            dueDate: Date(),
            planId: 1,
            isSynced: true
        )

        // When
        modelContext.insert(task)
        try modelContext.save()

        // Fetch the task
        let descriptor = FetchDescriptor<CachedTask>(
            predicate: #Predicate { $0.id == 1 }
        )
        let fetchedTasks = try modelContext.fetch(descriptor)

        // Then
        XCTAssertEqual(fetchedTasks.count, 1)
        XCTAssertEqual(fetchedTasks.first?.title, "Morning Workout")
        XCTAssertEqual(fetchedTasks.first?.taskType, "workout")
    }
}
```

### 3.4 Authentication Flow Integration

Test the complete authentication workflow including token storage and refresh.

---

## 4. UI Testing Strategy

### 4.1 Critical User Journeys

#### Priority 1: Must Have

1. Complete signup flow (new user)
2. Login with email/password
3. Complete onboarding wizard (8 steps)
4. View and complete daily task
5. Upload progress photo
6. View streaks and badges

#### Priority 2: Should Have

7. Login with biometrics
8. Edit profile information
9. Filter tasks by type
10. View photo gallery
11. Logout and re-login

#### Priority 3: Nice to Have

12. Submit task evidence with notes
13. View badge detail
14. Change app settings
15. Delete account

### 4.2 Page Object Pattern

```swift
// MARK: - Page Object Base

class BasePage {
    let app: XCUIApplication

    init(app: XCUIApplication) {
        self.app = app
    }

    func waitForElement(_ element: XCUIElement, timeout: TimeInterval = 5) -> Bool {
        return element.waitForExistence(timeout: timeout)
    }
}

// MARK: - Login Page Object

class LoginPage: BasePage {

    // Elements
    var emailTextField: XCUIElement {
        app.textFields["login_email_field"]
    }

    var passwordTextField: XCUIElement {
        app.secureTextFields["login_password_field"]
    }

    var loginButton: XCUIElement {
        app.buttons["login_button"]
    }

    var biometricButton: XCUIElement {
        app.buttons["biometric_login_button"]
    }

    var signupLink: XCUIElement {
        app.buttons["signup_link"]
    }

    var errorMessage: XCUIElement {
        app.staticTexts["login_error_message"]
    }

    // Actions
    @discardableResult
    func enterEmail(_ email: String) -> Self {
        emailTextField.tap()
        emailTextField.typeText(email)
        return self
    }

    @discardableResult
    func enterPassword(_ password: String) -> Self {
        passwordTextField.tap()
        passwordTextField.typeText(password)
        return self
    }

    func tapLogin() {
        loginButton.tap()
    }

    func tapBiometricLogin() {
        biometricButton.tap()
    }

    func tapSignup() {
        signupLink.tap()
    }

    // Assertions
    func verifyOnLoginScreen() -> Bool {
        return waitForElement(emailTextField) &&
               waitForElement(passwordTextField) &&
               waitForElement(loginButton)
    }

    func verifyErrorMessage(_ message: String) -> Bool {
        return errorMessage.label.contains(message)
    }
}

// MARK: - Home Page Object

class HomePage: BasePage {

    // Elements
    var greetingLabel: XCUIElement {
        app.staticTexts["home_greeting_label"]
    }

    var streakCounter: XCUIElement {
        app.staticTexts["home_streak_counter"]
    }

    var progressRing: XCUIElement {
        app.otherElements["home_progress_ring"]
    }

    var tasksTab: XCUIElement {
        app.tabBars.buttons["Tasks"]
    }

    var progressTab: XCUIElement {
        app.tabBars.buttons["Progress"]
    }

    var streaksTab: XCUIElement {
        app.tabBars.buttons["Streaks"]
    }

    var profileTab: XCUIElement {
        app.tabBars.buttons["Profile"]
    }

    // Actions
    func navigateToTasks() {
        tasksTab.tap()
    }

    func navigateToProgress() {
        progressTab.tap()
    }

    func navigateToStreaks() {
        streaksTab.tap()
    }

    func navigateToProfile() {
        profileTab.tap()
    }

    // Assertions
    func verifyOnHomeScreen() -> Bool {
        return waitForElement(greetingLabel) &&
               waitForElement(streakCounter)
    }

    func verifyStreak(count: Int) -> Bool {
        return streakCounter.label.contains("\(count)")
    }
}

// MARK: - Tasks Page Object

class TasksPage: BasePage {

    // Elements
    var allSegment: XCUIElement {
        app.buttons["tasks_segment_all"]
    }

    var pendingSegment: XCUIElement {
        app.buttons["tasks_segment_pending"]
    }

    var completedSegment: XCUIElement {
        app.buttons["tasks_segment_completed"]
    }

    func taskCard(withTitle title: String) -> XCUIElement {
        app.otherElements["task_card_\(title)"]
    }

    func completeButton(forTask title: String) -> XCUIElement {
        app.buttons["task_complete_\(title)"]
    }

    var emptyState: XCUIElement {
        app.staticTexts["tasks_empty_state"]
    }

    // Actions
    func selectAllTasks() {
        allSegment.tap()
    }

    func selectPendingTasks() {
        pendingSegment.tap()
    }

    func selectCompletedTasks() {
        completedSegment.tap()
    }

    func tapTask(_ title: String) {
        taskCard(withTitle: title).tap()
    }

    func completeTask(_ title: String) {
        completeButton(forTask: title).tap()
    }

    // Assertions
    func verifyTaskExists(_ title: String) -> Bool {
        return taskCard(withTitle: title).exists
    }

    func verifyTaskCompleted(_ title: String) -> Bool {
        return taskCard(withTitle: title).images["checkmark.circle.fill"].exists
    }
}
```

### 4.3 Accessibility Testing

```swift
// MARK: - Accessibility Tests

final class AccessibilityUITests: XCTestCase {
    var app: XCUIApplication!

    override func setUpWithError() throws {
        continueAfterFailure = false
        app = XCUIApplication()
        app.launch()
    }

    func testLoginScreen_AllElementsHaveAccessibilityLabels() {
        let emailField = app.textFields["login_email_field"]
        let passwordField = app.secureTextFields["login_password_field"]
        let loginButton = app.buttons["login_button"]

        XCTAssertNotNil(emailField.label)
        XCTAssertNotNil(passwordField.label)
        XCTAssertNotNil(loginButton.label)

        // Verify labels are descriptive
        XCTAssertFalse(emailField.label.isEmpty)
        XCTAssertFalse(passwordField.label.isEmpty)
        XCTAssertFalse(loginButton.label.isEmpty)
    }

    func testTaskList_VoiceOverNavigation() {
        // Enable VoiceOver simulation
        app.launchArguments.append("--uitest-voiceover")
        app.launch()

        // Navigate to tasks screen
        let tasksTab = app.tabBars.buttons["Tasks"]
        XCTAssertTrue(tasksTab.isAccessibilityElement)
        tasksTab.tap()

        // Verify task cards are accessible
        let taskCards = app.cells.matching(identifier: "task_card")
        XCTAssertGreaterThan(taskCards.count, 0)

        for i in 0..<taskCards.count {
            let card = taskCards.element(boundBy: i)
            XCTAssertTrue(card.isAccessibilityElement)
            XCTAssertFalse(card.label.isEmpty)
        }
    }

    func testColorContrast_DarkMode() {
        // Enable dark mode
        app.launchArguments.append("--uitest-darkmode")
        app.launch()

        // Verify important text elements are visible
        let loginButton = app.buttons["login_button"]
        XCTAssertTrue(loginButton.exists)

        // In a real test, you would capture screenshots and run
        // color contrast analysis tools
    }
}
```

### 4.4 Screenshot Testing

```swift
// MARK: - Screenshot Tests

final class ScreenshotUITests: XCTestCase {
    var app: XCUIApplication!

    override func setUpWithError() throws {
        continueAfterFailure = false
        app = XCUIApplication()
        app.launchArguments.append("--uitest")
        app.launch()
    }

    func testCaptureScreenshots_LoginFlow() {
        // Capture login screen
        takeScreenshot(name: "01_Login_Screen")

        // Fill in email
        let emailField = app.textFields["login_email_field"]
        emailField.tap()
        emailField.typeText("test@example.com")
        takeScreenshot(name: "02_Email_Entered")

        // Fill in password
        let passwordField = app.secureTextFields["login_password_field"]
        passwordField.tap()
        passwordField.typeText("password123")
        takeScreenshot(name: "03_Password_Entered")
    }

    func testCaptureScreenshots_OnboardingFlow() {
        // Navigate through all onboarding steps
        let steps = [
            "Welcome",
            "Basic_Info",
            "Goals",
            "Health_Metrics",
            "Activity_Level",
            "Preferences",
            "Partners",
            "Review"
        ]

        for (index, step) in steps.enumerated() {
            takeScreenshot(name: "\(index + 1)_Onboarding_\(step)")

            // Tap next button if not last step
            if index < steps.count - 1 {
                app.buttons["onboarding_next_button"].tap()
            }
        }
    }

    private func takeScreenshot(name: String) {
        let screenshot = app.screenshot()
        let attachment = XCTAttachment(screenshot: screenshot)
        attachment.name = name
        attachment.lifetime = .keepAlways
        add(attachment)
    }
}
```

---

## 5. Test Data Management

### 5.1 Test Fixtures

```swift
// MARK: - Test Fixtures

struct TestFixtures {

    // MARK: - User Fixtures

    static var validUser: User {
        User(
            id: 1,
            email: "test@example.com",
            name: "Test User",
            isActive: true,
            createdAt: Date(),
            updatedAt: Date()
        )
    }

    static var testUserProfile: UserProfile {
        UserProfile(
            user: validUser,
            settings: validUserSettings,
            requiresOnboarding: false
        )
    }

    static var validUserSettings: UserSettings {
        UserSettings(
            id: 1,
            userId: 1,
            dateOfBirth: Calendar.current.date(byAdding: .year, value: -25, to: Date()),
            gender: .male,
            primaryGoal: .loseWeight,
            targetWeight: 75.0,
            targetDate: Calendar.current.date(byAdding: .month, value: 3, to: Date()),
            activityLevel: .moderatelyActive,
            currentWeight: 85.0,
            height: 180.0,
            bmr: 1800.0,
            tdee: 2500.0,
            calorieTarget: 2000.0,
            proteinTarget: 150.0,
            waterTarget: 3000.0,
            dietaryPreferences: ["vegetarian"],
            allergies: nil,
            mealsPerDay: 4,
            onboardingCompleted: true,
            onboardingCompletedAt: Date(),
            createdAt: Date(),
            updatedAt: Date()
        )
    }

    // MARK: - Task Fixtures

    static var pendingWorkoutTask: DailyTask {
        DailyTask(
            id: 1,
            userId: 1,
            planId: 1,
            title: "Morning Strength Training",
            description: "Complete 45 minutes of strength training",
            taskType: .workout,
            dueDate: Date(),
            dueTime: "08:00:00",
            status: .pending,
            completedAt: nil,
            skippedAt: nil,
            skipReason: nil,
            metadata: TaskMetadata(
                exerciseName: "Full Body Workout",
                sets: 4,
                reps: 12,
                weight: 50.0,
                duration: 45,
                mealType: nil,
                calories: nil,
                protein: nil,
                carbs: nil,
                fats: nil,
                supplementName: nil,
                dosage: nil,
                timing: nil,
                targetOunces: nil,
                currentOunces: nil
            ),
            priority: 1,
            order: 1,
            createdAt: Date(),
            updatedAt: Date()
        )
    }

    static var completedMealTask: DailyTask {
        DailyTask(
            id: 2,
            userId: 1,
            planId: 1,
            title: "Breakfast",
            description: "High protein breakfast",
            taskType: .meal,
            dueDate: Date(),
            dueTime: "07:00:00",
            status: .completed,
            completedAt: Date(),
            skippedAt: nil,
            skipReason: nil,
            metadata: TaskMetadata(
                exerciseName: nil,
                sets: nil,
                reps: nil,
                weight: nil,
                duration: nil,
                mealType: "breakfast",
                calories: 450,
                protein: 35.0,
                carbs: 40.0,
                fats: 15.0,
                supplementName: nil,
                dosage: nil,
                timing: nil,
                targetOunces: nil,
                currentOunces: nil
            ),
            priority: 1,
            order: 1,
            createdAt: Date(),
            updatedAt: Date()
        )
    }

    // MARK: - Auth Fixtures

    static var validTokens: AuthTokens {
        AuthTokens(
            accessToken: "test_access_token_12345",
            refreshToken: "test_refresh_token_67890",
            expiresIn: 3600,
            tokenType: "Bearer"
        )
    }

    static var loginResponse: LoginResponse {
        LoginResponse(
            user: validUser,
            tokens: validTokens
        )
    }

    // MARK: - Photo Fixtures

    static var testPhoto: Photo {
        Photo(
            id: 1,
            fileKey: "progress/user_1/photo_123.jpg",
            fileSize: 1024000,
            mimeType: "image/jpeg",
            width: 1920,
            height: 1080,
            takenAt: Date(),
            uploadedAt: Date(),
            createdAt: Date(),
            downloadUrl: "https://cdn.gtsd.com/progress/user_1/photo_123.jpg"
        )
    }

    static var presignedURLResponse: PresignedURLResponse {
        PresignedURLResponse(
            uploadUrl: "https://s3.amazonaws.com/gtsd-photos/upload?signature=xyz",
            fileKey: "progress/user_1/photo_123.jpg",
            expiresIn: 300
        )
    }

    // MARK: - Error Fixtures

    static var networkError: APIError {
        .networkError(NSError(domain: "network", code: -1009))
    }

    static var unauthorizedError: APIError {
        .unauthorized(message: "Invalid credentials")
    }

    static var serverError: APIError {
        .serverError(statusCode: 500, message: "Internal server error")
    }

    // MARK: - Mock JSON Responses

    static var loginSuccessJSON: Data {
        """
        {
            "success": true,
            "data": {
                "user": {
                    "id": 1,
                    "email": "test@example.com",
                    "name": "Test User",
                    "is_active": true,
                    "created_at": "2024-01-01T00:00:00.000Z",
                    "updated_at": "2024-01-01T00:00:00.000Z"
                },
                "tokens": {
                    "access_token": "test_access_token",
                    "refresh_token": "test_refresh_token",
                    "expires_in": 3600,
                    "token_type": "Bearer"
                }
            }
        }
        """.data(using: .utf8)!
    }

    static var tasksSuccessJSON: Data {
        """
        {
            "success": true,
            "data": {
                "tasks": [
                    {
                        "type": "workout",
                        "tasks": [],
                        "completed": 0,
                        "total": 1
                    }
                ],
                "total_tasks": 7,
                "completed_tasks": 3,
                "completion_percentage": 42.86,
                "date": "2024-10-26"
            }
        }
        """.data(using: .utf8)!
    }
}
```

### 5.2 Test User Accounts

Create dedicated test accounts for different scenarios:

```swift
enum TestAccounts {
    static let newUser = TestAccount(
        email: "newuser@gtsd-test.com",
        password: "Test1234!",
        needsOnboarding: true
    )

    static let activeUser = TestAccount(
        email: "active@gtsd-test.com",
        password: "Test1234!",
        needsOnboarding: false,
        hasStreak: true
    )

    static let premiumUser = TestAccount(
        email: "premium@gtsd-test.com",
        password: "Test1234!",
        needsOnboarding: false,
        isPremium: true
    )
}

struct TestAccount {
    let email: String
    let password: String
    let needsOnboarding: Bool
    let hasStreak: Bool
    let isPremium: Bool

    init(
        email: String,
        password: String,
        needsOnboarding: Bool = false,
        hasStreak: Bool = false,
        isPremium: Bool = false
    ) {
        self.email = email
        self.password = password
        self.needsOnboarding = needsOnboarding
        self.hasStreak = hasStreak
        self.isPremium = isPremium
    }
}
```

### 5.3 Database Seeding for Tests

```swift
// MARK: - Test Database Seeder

@MainActor
final class TestDatabaseSeeder {
    private let modelContext: ModelContext

    init(modelContext: ModelContext) {
        self.modelContext = modelContext
    }

    func seedTasks(count: Int = 10) throws {
        let tasks = (1...count).map { index in
            CachedTask(
                id: index,
                title: "Task \(index)",
                taskDescription: "Description for task \(index)",
                taskType: "workout",
                status: index % 2 == 0 ? "completed" : "pending",
                dueDate: Date(),
                planId: 1,
                isSynced: true
            )
        }

        tasks.forEach { modelContext.insert($0) }
        try modelContext.save()
    }

    func seedPhotos(count: Int = 5) throws {
        let photos = (1...count).map { index in
            CachedPhoto(
                id: index,
                userId: 1,
                s3Key: "progress/photo_\(index).jpg",
                photoType: "front",
                takenAt: Date().addingTimeInterval(-Double(index) * 86400),
                uploadStatus: "completed"
            )
        }

        photos.forEach { modelContext.insert($0) }
        try modelContext.save()
    }

    func clearAll() throws {
        try modelContext.delete(model: CachedTask.self)
        try modelContext.delete(model: CachedPhoto.self)
        try modelContext.save()
    }
}
```

---

## 6. Continuous Integration

### 6.1 GitHub Actions Workflow

```yaml
# .github/workflows/ios-tests.yml

name: iOS Tests

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  unit-tests:
    name: Unit Tests
    runs-on: macos-14

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Set up Xcode
        uses: maxim-lobanov/setup-xcode@v1
        with:
          xcode-version: '15.4'

      - name: Cache SPM packages
        uses: actions/cache@v3
        with:
          path: .build
          key: ${{ runner.os }}-spm-${{ hashFiles('**/Package.resolved') }}
          restore-keys: |
            ${{ runner.os }}-spm-

      - name: Run unit tests
        run: |
          xcodebuild test \
            -scheme GTSD \
            -destination 'platform=iOS Simulator,name=iPhone 15 Pro,OS=17.5' \
            -only-testing:GTSDTests \
            -enableCodeCoverage YES \
            -resultBundlePath ./test-results

      - name: Generate code coverage
        run: |
          xcrun xccov view --report ./test-results.xcresult > coverage.txt
          cat coverage.txt

      - name: Upload coverage to Codecov
        uses: codecov/codecov-action@v3
        with:
          files: ./coverage.txt
          fail_ci_if_error: true

  integration-tests:
    name: Integration Tests
    runs-on: macos-14
    needs: unit-tests

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Set up Xcode
        uses: maxim-lobanov/setup-xcode@v1
        with:
          xcode-version: '15.4'

      - name: Run integration tests
        run: |
          xcodebuild test \
            -scheme GTSD \
            -destination 'platform=iOS Simulator,name=iPhone 15 Pro,OS=17.5' \
            -only-testing:GTSDIntegrationTests \
            -resultBundlePath ./integration-results

  ui-tests:
    name: UI Tests
    runs-on: macos-14
    needs: integration-tests

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Set up Xcode
        uses: maxim-lobanov/setup-xcode@v1
        with:
          xcode-version: '15.4'

      - name: Run UI tests
        run: |
          xcodebuild test \
            -scheme GTSD \
            -destination 'platform=iOS Simulator,name=iPhone 15 Pro,OS=17.5' \
            -only-testing:GTSDUITests \
            -resultBundlePath ./ui-results

      - name: Upload screenshots
        if: failure()
        uses: actions/upload-artifact@v3
        with:
          name: ui-test-screenshots
          path: ./ui-results/Attachments/*.png
```

### 6.2 Test Reporting

```swift
// MARK: - Test Observer for Custom Reporting

final class TestReporter: NSObject, XCTestObservation {
    var testResults: [String: TestResult] = [:]

    struct TestResult {
        let testName: String
        let passed: Bool
        let duration: TimeInterval
        let failureMessage: String?
    }

    func testCase(
        _ testCase: XCTestCase,
        didFailWithDescription description: String,
        inFile filePath: String?,
        atLine lineNumber: Int
    ) {
        let testName = "\(type(of: testCase)).\(testCase.name)"
        testResults[testName] = TestResult(
            testName: testName,
            passed: false,
            duration: 0,
            failureMessage: description
        )
    }

    func testCaseDidFinish(_ testCase: XCTestCase) {
        let testName = "\(type(of: testCase)).\(testCase.name)"
        if testResults[testName] == nil {
            testResults[testName] = TestResult(
                testName: testName,
                passed: true,
                duration: 0,
                failureMessage: nil
            )
        }
    }

    func testBundleDidFinish(_ testBundle: Bundle) {
        generateReport()
    }

    private func generateReport() {
        let passedCount = testResults.values.filter { $0.passed }.count
        let failedCount = testResults.count - passedCount

        print("=== Test Summary ===")
        print("Total: \(testResults.count)")
        print("Passed: \(passedCount)")
        print("Failed: \(failedCount)")
        print("Success Rate: \(Double(passedCount) / Double(testResults.count) * 100)%")

        if failedCount > 0 {
            print("\n=== Failed Tests ===")
            testResults.values.filter { !$0.passed }.forEach { result in
                print("\(result.testName)")
                if let message = result.failureMessage {
                    print("  Error: \(message)")
                }
            }
        }
    }
}
```

### 6.3 Performance Benchmarking

Track test execution times and fail if they exceed thresholds.

```swift
// MARK: - Performance Test Configuration

final class PerformanceTestConfig {
    static let maxUnitTestDuration: TimeInterval = 10.0 // 10 seconds
    static let maxIntegrationTestDuration: TimeInterval = 30.0 // 30 seconds
    static let maxUITestDuration: TimeInterval = 180.0 // 3 minutes

    static func validateTestDuration(
        _ duration: TimeInterval,
        for testType: TestType
    ) -> Bool {
        switch testType {
        case .unit:
            return duration <= maxUnitTestDuration
        case .integration:
            return duration <= maxIntegrationTestDuration
        case .ui:
            return duration <= maxUITestDuration
        }
    }

    enum TestType {
        case unit
        case integration
        case ui
    }
}
```

---

## 7. Testing Tools & Frameworks

### 7.1 Primary Frameworks

| Framework         | Purpose                  | Version  |
| ----------------- | ------------------------ | -------- |
| XCTest            | Unit & Integration Tests | Built-in |
| XCUITest          | UI Automation            | Built-in |
| XCTestExpectation | Async Testing            | Built-in |
| Combine           | Reactive Testing         | Built-in |

### 7.2 Additional Tools

| Tool       | Purpose            | Installation  |
| ---------- | ------------------ | ------------- |
| SwiftLint  | Code quality       | SPM/Homebrew  |
| Fastlane   | CI/CD automation   | Gem           |
| Codecov    | Coverage reporting | GitHub Action |
| TestFlight | Beta testing       | Xcode         |

### 7.3 Mock Utilities

```swift
// MARK: - Mock API Client

final class MockAPIClient: Sendable {
    private let configuration: MockConfiguration

    struct MockConfiguration {
        var shouldSucceed: Bool = true
        var delay: TimeInterval = 0
        var customError: Error?
    }

    init(configuration: MockConfiguration = MockConfiguration()) {
        self.configuration = configuration
    }

    func request<T: Decodable>(
        _ endpoint: APIEndpoint,
        responseType: T.Type
    ) async throws -> T {
        // Simulate network delay
        if configuration.delay > 0 {
            try await Task.sleep(nanoseconds: UInt64(configuration.delay * 1_000_000_000))
        }

        // Return error if configured
        if !configuration.shouldSucceed {
            throw configuration.customError ?? APIError.serverError(
                statusCode: 500,
                message: "Mock error"
            )
        }

        // Return mock data based on endpoint
        return try mockResponse(for: endpoint, as: responseType)
    }

    private func mockResponse<T: Decodable>(
        for endpoint: APIEndpoint,
        as type: T.Type
    ) throws -> T {
        // Return appropriate mock data based on endpoint path
        switch endpoint.path {
        case "/auth/login":
            return try JSONDecoder().decode(T.self, from: TestFixtures.loginSuccessJSON)
        case "/v1/tasks/today":
            return try JSONDecoder().decode(T.self, from: TestFixtures.tasksSuccessJSON)
        default:
            throw APIError.notFound
        }
    }
}
```

---

## 8. Example Test Implementations

### 8.1 AuthenticationService Unit Tests

```swift
// MARK: - Authentication Service Tests

@available(iOS 17.0, *)
final class AuthenticationServiceTests: XCTestCase {
    var sut: AuthenticationService!
    var mockAPIClient: MockAPIClient!
    var mockKeychainManager: MockKeychainManager!

    @MainActor
    override func setUp() async throws {
        try await super.setUp()

        mockAPIClient = MockAPIClient()
        mockKeychainManager = MockKeychainManager()

        sut = AuthenticationService(
            apiClient: mockAPIClient,
            keychainManager: mockKeychainManager
        )
    }

    @MainActor
    override func tearDown() async throws {
        sut = nil
        mockAPIClient = nil
        mockKeychainManager = nil

        try await super.tearDown()
    }

    // MARK: - Login Tests

    @MainActor
    func testLogin_WithValidCredentials_ShouldSucceed() async throws {
        // Given
        let email = "test@example.com"
        let password = "password123"

        mockAPIClient.configuration.shouldSucceed = true

        // When
        let profile = try await sut.login(email: email, password: password)

        // Then
        XCTAssertNotNil(profile)
        XCTAssertEqual(profile.email, email)
        XCTAssertTrue(sut.isAuthenticated)
        XCTAssertFalse(sut.isLoading)
        XCTAssertNil(sut.authError)

        // Verify tokens were stored
        XCTAssertTrue(mockKeychainManager.saveCallCount > 0)
    }

    @MainActor
    func testLogin_WithInvalidCredentials_ShouldFail() async {
        // Given
        let email = "test@example.com"
        let password = "wrong"

        mockAPIClient.configuration.shouldSucceed = false
        mockAPIClient.configuration.customError = APIError.unauthorized(
            message: "Invalid credentials"
        )

        // When/Then
        do {
            _ = try await sut.login(email: email, password: password)
            XCTFail("Expected error to be thrown")
        } catch {
            XCTAssertFalse(sut.isAuthenticated)
            XCTAssertNotNil(sut.authError)
        }
    }

    @MainActor
    func testLogin_WithEmptyEmail_ShouldFailValidation() async {
        // Given
        let email = ""
        let password = "password123"

        // When/Then
        do {
            _ = try await sut.login(email: email, password: password)
            XCTFail("Expected validation error")
        } catch {
            // Validation should happen before API call
            XCTAssertEqual(mockAPIClient.requestCallCount, 0)
        }
    }

    // MARK: - Signup Tests

    @MainActor
    func testSignup_WithValidData_ShouldCreateAccount() async throws {
        // Given
        let email = "newuser@example.com"
        let password = "securePass123!"
        let name = "New User"

        mockAPIClient.configuration.shouldSucceed = true

        // When
        let profile = try await sut.signup(
            email: email,
            password: password,
            name: name
        )

        // Then
        XCTAssertNotNil(profile)
        XCTAssertEqual(profile.email, email)
        XCTAssertEqual(profile.name, name)
        XCTAssertTrue(sut.isAuthenticated)
        XCTAssertTrue(profile.requiresOnboarding)
    }

    @MainActor
    func testSignup_WithExistingEmail_ShouldFail() async {
        // Given
        let email = "existing@example.com"
        let password = "password123"
        let name = "Test User"

        mockAPIClient.configuration.shouldSucceed = false
        mockAPIClient.configuration.customError = APIError.serverError(
            statusCode: 409,
            message: "Email already exists"
        )

        // When/Then
        do {
            _ = try await sut.signup(email: email, password: password, name: name)
            XCTFail("Expected error to be thrown")
        } catch {
            XCTAssertFalse(sut.isAuthenticated)
        }
    }

    // MARK: - Session Restore Tests

    @MainActor
    func testRestoreSession_WithValidTokens_ShouldSucceed() async throws {
        // Given
        mockKeychainManager.mockAccessToken = "valid_token"
        mockKeychainManager.mockRefreshToken = "valid_refresh"
        mockAPIClient.configuration.shouldSucceed = true

        // When
        let profile = try await sut.restoreSession()

        // Then
        XCTAssertNotNil(profile)
        XCTAssertTrue(sut.isAuthenticated)
    }

    @MainActor
    func testRestoreSession_WithExpiredTokens_ShouldRefreshAndSucceed() async throws {
        // Given
        mockKeychainManager.mockAccessToken = "expired_token"
        mockKeychainManager.mockRefreshToken = "valid_refresh"

        // First call fails with 401, second succeeds after refresh
        mockAPIClient.configuration.shouldRetry = true

        // When
        let profile = try await sut.restoreSession()

        // Then
        XCTAssertNotNil(profile)
        XCTAssertTrue(sut.isAuthenticated)
        // Verify refresh was called
        XCTAssertTrue(mockAPIClient.refreshCallCount > 0)
    }

    @MainActor
    func testRestoreSession_WithNoTokens_ShouldFail() async {
        // Given
        mockKeychainManager.mockAccessToken = nil
        mockKeychainManager.mockRefreshToken = nil

        // When/Then
        do {
            _ = try await sut.restoreSession()
            XCTFail("Expected error to be thrown")
        } catch {
            XCTAssertFalse(sut.isAuthenticated)
        }
    }

    // MARK: - Logout Tests

    @MainActor
    func testLogout_ShouldClearSessionAndTokens() async throws {
        // Given
        // First login
        mockAPIClient.configuration.shouldSucceed = true
        _ = try await sut.login(email: "test@example.com", password: "password123")
        XCTAssertTrue(sut.isAuthenticated)

        // When
        try await sut.logout()

        // Then
        XCTAssertFalse(sut.isAuthenticated)
        XCTAssertNil(sut.currentUser)
        XCTAssertTrue(mockKeychainManager.deleteCallCount > 0)
    }

    // MARK: - Biometric Auth Tests

    @MainActor
    func testEnableBiometricAuth_WithSuccessfulAuthentication_ShouldEnable() async throws {
        // Given
        let mockBiometricService = MockBiometricService()
        mockBiometricService.shouldSucceed = true

        // When
        try await sut.enableBiometricAuth()

        // Then
        // Verify keychain was updated
        XCTAssertTrue(mockKeychainManager.saveCallCount > 0)
    }
}

// MARK: - Mock Keychain Manager

final class MockKeychainManager: KeychainManager {
    var saveCallCount = 0
    var deleteCallCount = 0
    var retrieveCallCount = 0

    var mockAccessToken: String?
    var mockRefreshToken: String?

    override func save(_ value: String, for key: String) async throws {
        saveCallCount += 1

        if key.contains("accessToken") {
            mockAccessToken = value
        } else if key.contains("refreshToken") {
            mockRefreshToken = value
        }
    }

    override func retrieveString(for key: String) async throws -> String {
        retrieveCallCount += 1

        if key.contains("accessToken") {
            guard let token = mockAccessToken else {
                throw KeychainError.itemNotFound
            }
            return token
        } else if key.contains("refreshToken") {
            guard let token = mockRefreshToken else {
                throw KeychainError.itemNotFound
            }
            return token
        }

        throw KeychainError.itemNotFound
    }

    override func delete(for key: String) async throws {
        deleteCallCount += 1

        if key.contains("accessToken") {
            mockAccessToken = nil
        } else if key.contains("refreshToken") {
            mockRefreshToken = nil
        }
    }
}
```

### 8.2 APIClient Integration Tests

```swift
// MARK: - API Client Integration Tests

@available(iOS 17.0, *)
final class APIClientIntegrationTests: XCTestCase {
    var sut: APIClient!
    var mockSession: URLSession!
    var mockTokenManager: MockTokenManager!

    override func setUp() async throws {
        try await super.setUp()

        // Configure mock URL session
        let configuration = URLSessionConfiguration.ephemeral
        configuration.protocolClasses = [URLProtocolMock.self]
        mockSession = URLSession(configuration: configuration)

        mockTokenManager = MockTokenManager()

        sut = APIClient(
            baseURL: URL(string: "https://api.gtsd-test.com")!,
            session: mockSession,
            tokenManager: mockTokenManager
        )
    }

    override func tearDown() async throws {
        URLProtocolMock.reset()
        sut = nil
        mockSession = nil
        mockTokenManager = nil

        try await super.tearDown()
    }

    // MARK: - Request Tests

    func testRequest_WithSuccessfulResponse_ShouldReturnDecodedData() async throws {
        // Given
        let endpoint = AuthEndpoint.login(
            email: "test@example.com",
            password: "password123"
        )

        URLProtocolMock.mockData["https://api.gtsd-test.com/auth/login"] =
            TestFixtures.loginSuccessJSON
        URLProtocolMock.mockStatusCodes["https://api.gtsd-test.com/auth/login"] = 200

        // When
        let response: LoginResponse = try await sut.request(
            endpoint,
            responseType: LoginResponse.self
        )

        // Then
        XCTAssertNotNil(response.user)
        XCTAssertNotNil(response.tokens)
        XCTAssertEqual(response.user.email, "test@example.com")
    }

    func testRequest_With401Response_ShouldRefreshTokenAndRetry() async throws {
        // Given
        let endpoint = APIEndpoint.getTodayTasks()

        mockTokenManager.mockAccessToken = "expired_token"
        mockTokenManager.mockRefreshToken = "valid_refresh"

        // First request returns 401
        URLProtocolMock.mockStatusCodes["https://api.gtsd-test.com/v1/tasks/today"] = 401

        // After refresh, return 200
        URLProtocolMock.mockData["https://api.gtsd-test.com/v1/tasks/today"] =
            TestFixtures.tasksSuccessJSON

        // When
        let response: TodayTasksResponse = try await sut.request(
            endpoint,
            responseType: TodayTasksResponse.self
        )

        // Then
        XCTAssertNotNil(response)
        XCTAssertTrue(mockTokenManager.refreshCallCount > 0)
    }

    func testRequest_WithNetworkError_ShouldThrowError() async {
        // Given
        let endpoint = AuthEndpoint.login(
            email: "test@example.com",
            password: "password123"
        )

        URLProtocolMock.mockErrors["https://api.gtsd-test.com/auth/login"] =
            NSError(domain: NSURLErrorDomain, code: NSURLErrorNotConnectedToInternet)

        // When/Then
        do {
            let _: LoginResponse = try await sut.request(
                endpoint,
                responseType: LoginResponse.self
            )
            XCTFail("Expected error to be thrown")
        } catch {
            XCTAssertTrue(error is APIError)
        }
    }

    func testRequest_With500Response_ShouldThrowServerError() async {
        // Given
        let endpoint = AuthEndpoint.login(
            email: "test@example.com",
            password: "password123"
        )

        URLProtocolMock.mockStatusCodes["https://api.gtsd-test.com/auth/login"] = 500
        URLProtocolMock.mockData["https://api.gtsd-test.com/auth/login"] =
            """
            {
                "success": false,
                "message": "Internal server error"
            }
            """.data(using: .utf8)!

        // When/Then
        do {
            let _: LoginResponse = try await sut.request(
                endpoint,
                responseType: LoginResponse.self
            )
            XCTFail("Expected error to be thrown")
        } catch let error as APIError {
            if case .serverError(let code, _) = error {
                XCTAssertEqual(code, 500)
            } else {
                XCTFail("Wrong error type")
            }
        }
    }
}

// MARK: - Mock Token Manager

actor MockTokenManager {
    var mockAccessToken: String?
    var mockRefreshToken: String?
    var refreshCallCount = 0

    func getAccessToken() async throws -> String {
        guard let token = mockAccessToken else {
            throw AuthError(code: .TOKEN_INVALID, message: "No token")
        }
        return token
    }

    func refreshToken() async throws {
        refreshCallCount += 1
        // Simulate token refresh
        mockAccessToken = "new_access_token"
    }
}
```

### 8.3 Photo Upload Flow Tests

```swift
// MARK: - Photo Upload Integration Tests

@available(iOS 17.0, *)
final class PhotoUploadIntegrationTests: XCTestCase {
    var sut: PhotoUploadService!
    var mockAPIClient: MockAPIClient!
    var mockImageCompressor: MockImageCompressionService!

    @MainActor
    override func setUp() async throws {
        try await super.setUp()

        mockAPIClient = MockAPIClient()
        mockImageCompressor = MockImageCompressionService()

        sut = PhotoUploadService(
            apiClient: mockAPIClient,
            imageCompressor: mockImageCompressor
        )
    }

    @MainActor
    override func tearDown() async throws {
        sut = nil
        mockAPIClient = nil
        mockImageCompressor = nil

        try await super.tearDown()
    }

    // MARK: - Upload Tests

    @MainActor
    func testUploadPhoto_WithValidImage_ShouldSucceed() async throws {
        // Given
        let testImage = UIImage(systemName: "photo")!
        let fileName = "test_photo.jpg"

        mockAPIClient.configuration.shouldSucceed = true
        mockImageCompressor.shouldSucceed = true

        // When
        let result = try await sut.uploadPhoto(
            testImage,
            fileName: fileName,
            taskId: 1,
            evidenceType: "progress"
        )

        // Then
        XCTAssertNotNil(result)
        XCTAssertEqual(result.photoId, 1)
        XCTAssertNotNil(result.downloadUrl)

        // Verify compression was called
        XCTAssertTrue(mockImageCompressor.compressCallCount > 0)
    }

    @MainActor
    func testUploadPhoto_WithLargeImage_ShouldCompress() async throws {
        // Given
        let largeImage = createLargeTestImage()

        mockAPIClient.configuration.shouldSucceed = true
        mockImageCompressor.shouldSucceed = true

        // When
        _ = try await sut.uploadPhoto(largeImage)

        // Then
        XCTAssertTrue(mockImageCompressor.compressCallCount > 0)
        XCTAssertLessThanOrEqual(
            mockImageCompressor.lastCompressedSize ?? 0,
            10 * 1024 * 1024 // 10MB
        )
    }

    @MainActor
    func testUploadPhoto_WithNetworkError_ShouldTrackError() async {
        // Given
        let testImage = UIImage(systemName: "photo")!

        mockAPIClient.configuration.shouldSucceed = false
        mockAPIClient.configuration.customError = APIError.networkError(
            NSError(domain: "network", code: -1009)
        )

        // When/Then
        do {
            _ = try await sut.uploadPhoto(testImage)
            XCTFail("Expected error to be thrown")
        } catch {
            // Verify error was tracked
            XCTAssertFalse(sut.uploadErrors.isEmpty)
        }
    }

    @MainActor
    func testUploadPhotos_WithMultipleImages_ShouldUploadInParallel() async throws {
        // Given
        let images = [
            UIImage(systemName: "photo")!,
            UIImage(systemName: "photo.fill")!,
            UIImage(systemName: "photo.circle")!
        ]

        mockAPIClient.configuration.shouldSucceed = true
        mockImageCompressor.shouldSucceed = true

        let startTime = Date()

        // When
        let results = try await sut.uploadPhotos(images, taskId: 1)

        let duration = Date().timeIntervalSince(startTime)

        // Then
        XCTAssertEqual(results.count, 3)

        // Should be faster than sequential uploads
        // (with 0.1s mock delay, parallel should be ~0.1s, sequential would be ~0.3s)
        XCTAssertLessThan(duration, 0.2)
    }

    // MARK: - Progress Tracking Tests

    @MainActor
    func testUploadPhoto_ShouldTrackProgress() async throws {
        // Given
        let testImage = UIImage(systemName: "photo")!
        var progressUpdates: [Double] = []

        mockAPIClient.configuration.shouldSucceed = true
        mockImageCompressor.shouldSucceed = true

        // Observe progress
        let expectation = expectation(description: "Progress updates")
        expectation.expectedFulfillmentCount = 3 // Expect at least 3 progress updates

        // When
        Task { @MainActor in
            for await progress in sut.$uploadProgress.values {
                if !progress.isEmpty {
                    progressUpdates.append(progress.values.first ?? 0)
                    expectation.fulfill()
                }
            }
        }

        _ = try await sut.uploadPhoto(testImage)

        // Then
        await fulfillment(of: [expectation], timeout: 5)
        XCTAssertFalse(progressUpdates.isEmpty)
        XCTAssertTrue(progressUpdates.last ?? 0 >= 1.0) // Final progress should be 100%
    }

    // MARK: - Helper Methods

    private func createLargeTestImage() -> UIImage {
        let size = CGSize(width: 4000, height: 3000)
        let renderer = UIGraphicsImageRenderer(size: size)
        return renderer.image { context in
            UIColor.blue.setFill()
            context.fill(CGRect(origin: .zero, size: size))
        }
    }
}

// MARK: - Mock Image Compression Service

actor MockImageCompressionService {
    var shouldSucceed = true
    var compressCallCount = 0
    var lastCompressedSize: Int?

    func compress(
        _ image: UIImage,
        maxSizeKB: Int,
        quality: CGFloat = 0.8
    ) async -> Data? {
        compressCallCount += 1

        guard shouldSucceed else {
            return nil
        }

        let data = image.jpegData(compressionQuality: quality) ?? Data()
        lastCompressedSize = data.count
        return data
    }
}
```

### 8.4 Task Completion UI Test

```swift
// MARK: - Task Completion UI Tests

final class TaskCompletionUITests: XCTestCase {
    var app: XCUIApplication!
    var loginPage: LoginPage!
    var homePage: HomePage!
    var tasksPage: TasksPage!

    override func setUpWithError() throws {
        continueAfterFailure = false

        app = XCUIApplication()
        app.launchArguments = ["--uitest", "--mock-api"]
        app.launch()

        loginPage = LoginPage(app: app)
        homePage = HomePage(app: app)
        tasksPage = TasksPage(app: app)
    }

    func testCompleteTask_WithTextEvidence_ShouldMarkAsCompleted() {
        // Given - Login
        loginPage
            .enterEmail("test@example.com")
            .enterPassword("password123")
            .tapLogin()

        // Verify home screen loaded
        XCTAssertTrue(homePage.verifyOnHomeScreen())

        // Navigate to tasks
        homePage.navigateToTasks()

        // When - Complete a task
        let taskTitle = "Morning Workout"
        XCTAssertTrue(tasksPage.verifyTaskExists(taskTitle))

        tasksPage.tapTask(taskTitle)

        // Enter evidence
        let evidenceField = app.textViews["evidence_notes_field"]
        XCTAssertTrue(evidenceField.waitForExistence(timeout: 2))
        evidenceField.tap()
        evidenceField.typeText("Completed 45 minutes of strength training")

        // Submit
        let submitButton = app.buttons["submit_evidence_button"]
        submitButton.tap()

        // Then - Verify task is marked as completed
        XCTAssertTrue(tasksPage.verifyTaskCompleted(taskTitle))

        // Verify streak was updated
        homePage.navigateToStreaks()
        let streakLabel = app.staticTexts["current_streak_label"]
        XCTAssertTrue(streakLabel.waitForExistence(timeout: 2))
    }

    func testCompleteTask_WithPhotoEvidence_ShouldUploadAndComplete() {
        // Given - Login and navigate to tasks
        loginPage
            .enterEmail("test@example.com")
            .enterPassword("password123")
            .tapLogin()

        homePage.navigateToTasks()

        // When - Complete progress photo task
        let taskTitle = "Progress Photo"
        tasksPage.tapTask(taskTitle)

        // Tap camera button
        let cameraButton = app.buttons["camera_button"]
        cameraButton.tap()

        // Take photo (simulated)
        let captureButton = app.buttons["capture_photo_button"]
        XCTAssertTrue(captureButton.waitForExistence(timeout: 2))
        captureButton.tap()

        // Confirm photo
        let usePhotoButton = app.buttons["use_photo_button"]
        XCTAssertTrue(usePhotoButton.waitForExistence(timeout: 2))
        usePhotoButton.tap()

        // Submit
        let submitButton = app.buttons["submit_evidence_button"]
        submitButton.tap()

        // Then - Verify upload progress
        let progressBar = app.progressIndicators["upload_progress"]
        XCTAssertTrue(progressBar.waitForExistence(timeout: 2))

        // Wait for completion
        let completionMessage = app.staticTexts["upload_complete_message"]
        XCTAssertTrue(completionMessage.waitForExistence(timeout: 10))

        // Verify task is completed
        XCTAssertTrue(tasksPage.verifyTaskCompleted(taskTitle))
    }

    func testFilterTasks_ByStatus_ShouldShowCorrectTasks() {
        // Given - Login and navigate to tasks
        loginPage
            .enterEmail("test@example.com")
            .enterPassword("password123")
            .tapLogin()

        homePage.navigateToTasks()

        // When - Filter by completed
        tasksPage.selectCompletedTasks()

        // Then - Verify only completed tasks are shown
        let taskCards = app.cells.matching(identifier: "task_card")
        let count = taskCards.count

        for i in 0..<count {
            let card = taskCards.element(boundBy: i)
            XCTAssertTrue(card.images["checkmark.circle.fill"].exists)
        }

        // When - Filter by pending
        tasksPage.selectPendingTasks()

        // Then - Verify only pending tasks are shown
        let pendingCards = app.cells.matching(identifier: "task_card")
        let pendingCount = pendingCards.count

        for i in 0..<pendingCount {
            let card = pendingCards.element(boundBy: i)
            XCTAssertFalse(card.images["checkmark.circle.fill"].exists)
        }
    }

    func testSwipeToCompleteTask_ShouldMarkAsCompleted() {
        // Given - Login and navigate to tasks
        loginPage
            .enterEmail("test@example.com")
            .enterPassword("password123")
            .tapLogin()

        homePage.navigateToTasks()

        // When - Swipe to complete
        let taskTitle = "Morning Protein Shake"
        let taskCard = app.otherElements["task_card_\(taskTitle)"]
        XCTAssertTrue(taskCard.exists)

        taskCard.swipeLeft()

        let completeAction = app.buttons["Complete"]
        XCTAssertTrue(completeAction.waitForExistence(timeout: 1))
        completeAction.tap()

        // Then - Verify task is completed
        XCTAssertTrue(tasksPage.verifyTaskCompleted(taskTitle))
    }
}
```

### 8.5 ViewModel Tests

```swift
// MARK: - Tasks ViewModel Tests

@available(iOS 17.0, *)
@MainActor
final class TasksViewModelTests: XCTestCase {
    var sut: TasksViewModel!
    var mockTasksRepository: MockTasksRepository!

    override func setUp() async throws {
        try await super.setUp()

        mockTasksRepository = MockTasksRepository()
        sut = TasksViewModel(tasksRepository: mockTasksRepository)
    }

    override func tearDown() async throws {
        sut = nil
        mockTasksRepository = nil

        try await super.tearDown()
    }

    // MARK: - Load Tasks Tests

    func testLoadTasks_WithSuccessfulResponse_ShouldPopulateTasks() async {
        // Given
        mockTasksRepository.mockTasksResponse = TodayTasksResponse(
            tasks: [
                TodayTasksResponse.TaskGroup(
                    type: .workout,
                    tasks: [TestFixtures.pendingWorkoutTask],
                    completed: 0,
                    total: 1
                ),
                TodayTasksResponse.TaskGroup(
                    type: .meal,
                    tasks: [TestFixtures.completedMealTask],
                    completed: 1,
                    total: 1
                )
            ],
            totalTasks: 2,
            completedTasks: 1,
            completionPercentage: 50.0,
            date: "2024-10-26"
        )

        // When
        await sut.loadTasks()

        // Then
        XCTAssertFalse(sut.isLoading)
        XCTAssertNil(sut.errorMessage)
        XCTAssertEqual(sut.taskGroups.count, 2)
        XCTAssertEqual(sut.completionPercentage, 50.0)
    }

    func testLoadTasks_WithNetworkError_ShouldSetErrorMessage() async {
        // Given
        mockTasksRepository.shouldFail = true
        mockTasksRepository.mockError = APIError.networkError(
            NSError(domain: "network", code: -1009)
        )

        // When
        await sut.loadTasks()

        // Then
        XCTAssertFalse(sut.isLoading)
        XCTAssertNotNil(sut.errorMessage)
        XCTAssertTrue(sut.taskGroups.isEmpty)
    }

    func testLoadTasks_ShouldSetLoadingState() async {
        // Given
        mockTasksRepository.delay = 0.1 // Add small delay

        // When
        let loadTask = Task {
            await sut.loadTasks()
        }

        // Check loading state immediately
        try? await Task.sleep(nanoseconds: 10_000_000) // 0.01s
        XCTAssertTrue(sut.isLoading)

        // Wait for completion
        await loadTask.value
        XCTAssertFalse(sut.isLoading)
    }

    // MARK: - Complete Task Tests

    func testCompleteTask_WithValidTask_ShouldMarkAsCompleted() async {
        // Given
        let task = TestFixtures.pendingWorkoutTask
        mockTasksRepository.mockEvidenceResponse = CreateEvidenceResponse(
            evidence: Evidence(
                id: 1,
                taskId: task.id,
                userId: 1,
                evidenceType: .textLog,
                notes: "Completed",
                metrics: nil,
                photoUrl: nil,
                photoStorageKey: nil,
                recordedAt: Date(),
                createdAt: Date(),
                updatedAt: Date()
            ),
            streakUpdated: true,
            newStreak: 5
        )

        // When
        await sut.completeTask(task, notes: "Completed workout")

        // Then
        XCTAssertNil(sut.errorMessage)
        // Verify tasks were reloaded
        XCTAssertTrue(mockTasksRepository.getTodayTasksCallCount >= 2)
    }

    func testCompleteTask_WithError_ShouldSetErrorMessage() async {
        // Given
        let task = TestFixtures.pendingWorkoutTask
        mockTasksRepository.shouldFail = true
        mockTasksRepository.mockError = APIError.serverError(
            statusCode: 500,
            message: "Server error"
        )

        // When
        await sut.completeTask(task, notes: "Test")

        // Then
        XCTAssertNotNil(sut.errorMessage)
        XCTAssertTrue(sut.errorMessage!.contains("Failed to complete task"))
    }
}

// MARK: - Mock Tasks Repository

actor MockTasksRepository {
    var mockTasksResponse: TodayTasksResponse?
    var mockEvidenceResponse: CreateEvidenceResponse?
    var shouldFail = false
    var mockError: Error?
    var delay: TimeInterval = 0

    var getTodayTasksCallCount = 0
    var createEvidenceCallCount = 0

    func getTodayTasks(
        date: Date = Date(),
        limit: Int = 50,
        offset: Int = 0,
        type: String? = nil
    ) async throws -> TodayTasksResponse {
        getTodayTasksCallCount += 1

        if delay > 0 {
            try await Task.sleep(nanoseconds: UInt64(delay * 1_000_000_000))
        }

        if shouldFail {
            throw mockError ?? APIError.serverError(statusCode: 500, message: "Mock error")
        }

        guard let response = mockTasksResponse else {
            throw APIError.serverError(statusCode: 500, message: "Mock not configured")
        }

        return response
    }

    func createEvidence(
        taskId: Int,
        type: EvidenceType,
        data: EvidenceData,
        notes: String?
    ) async throws -> CreateEvidenceResponse {
        createEvidenceCallCount += 1

        if shouldFail {
            throw mockError ?? APIError.serverError(statusCode: 500, message: "Mock error")
        }

        guard let response = mockEvidenceResponse else {
            throw APIError.serverError(statusCode: 500, message: "Mock not configured")
        }

        return response
    }
}
```

---

## 9. Test Acceptance Criteria

### 9.1 Definition of Done for Testing

A feature is considered "done" when:

#### Code Coverage

- [ ] Unit test coverage >= 80% for new code
- [ ] Integration test coverage >= 60% for new code
- [ ] All critical paths have UI tests
- [ ] No decrease in overall project coverage

#### Test Quality

- [ ] All tests are passing
- [ ] No flaky tests (must pass 100 times consecutively)
- [ ] Tests are deterministic and isolated
- [ ] Proper mocking and dependency injection
- [ ] Clear test names following Given/When/Then

#### Documentation

- [ ] Complex test scenarios documented
- [ ] Mock data fixtures documented
- [ ] Test helpers have usage examples
- [ ] Known limitations documented

#### CI/CD Integration

- [ ] Tests run automatically on PR
- [ ] Coverage report generated
- [ ] Performance benchmarks recorded
- [ ] No increase in test execution time > 10%

### 9.2 Minimum Coverage Requirements

| Component    | Minimum Coverage | Target Coverage |
| ------------ | ---------------- | --------------- |
| ViewModels   | 85%              | 95%             |
| Services     | 80%              | 90%             |
| Repositories | 75%              | 85%             |
| Utilities    | 70%              | 80%             |
| Overall      | 75%              | 85%             |

### 9.3 Critical Paths That Must Be Tested

#### Authentication (Priority: P0)

1. Signup with valid credentials
2. Login with email/password
3. Login with biometrics
4. Token refresh on expiry
5. Logout and session clear
6. Session restoration on app launch

#### Onboarding (Priority: P0)

1. Complete all 8 onboarding steps
2. Navigate back through steps
3. Form validation at each step
4. Submit onboarding data
5. Skip optional steps (partners)

#### Daily Tasks (Priority: P0)

1. Load tasks for today
2. Complete task with text evidence
3. Complete task with photo evidence
4. Filter tasks by status
5. View task details
6. Streak updates after completion

#### Photo Upload (Priority: P0)

1. Take photo with camera
2. Select photo from gallery
3. Compress large images
4. Upload to S3 via presigned URL
5. Confirm upload with API
6. Track upload progress

#### Streaks & Badges (Priority: P1)

1. View current streak
2. View streak history
3. View earned badges
4. View locked badges
5. Badge unlock animation

#### Profile & Settings (Priority: P1)

1. View profile
2. Edit profile information
3. Change notification settings
4. Toggle biometric authentication
5. Logout

### 9.4 Performance Benchmarks

| Operation          | Target  | Maximum |
| ------------------ | ------- | ------- |
| App Launch         | < 1.5s  | < 2.5s  |
| Login API Call     | < 800ms | < 1.5s  |
| Load Tasks         | < 500ms | < 1s    |
| Photo Upload (2MB) | < 3s    | < 5s    |
| Image Compression  | < 500ms | < 1s    |
| Local DB Query     | < 50ms  | < 100ms |
| View Transition    | < 200ms | < 400ms |

---

## 10. Performance Testing

### 10.1 Performance Test Suite

```swift
// MARK: - Performance Tests

final class PerformanceTests: XCTestCase {

    // MARK: - API Performance

    func testAPILogin_MeasurePerformance() {
        measure(metrics: [XCTClockMetric()]) {
            let expectation = expectation(description: "Login completes")

            Task {
                // Configure real API client
                let apiClient = APIClient(
                    baseURL: URL(string: "https://api.gtsd-test.com")!
                )

                do {
                    let _: LoginResponse = try await apiClient.request(
                        AuthEndpoint.login(
                            email: "perf-test@gtsd-test.com",
                            password: "TestPassword123!"
                        ),
                        responseType: LoginResponse.self
                    )
                    expectation.fulfill()
                } catch {
                    XCTFail("Login failed: \(error)")
                }
            }

            wait(for: [expectation], timeout: 5.0)
        }

        // Assert performance baseline
        // Login should complete in < 1.5s
    }

    // MARK: - Image Compression Performance

    func testImageCompression_MeasurePerformance() async {
        let largeImage = createTestImage(size: CGSize(width: 4000, height: 3000))
        let compressor = ImageCompressionService()

        measure(metrics: [XCTClockMetric(), XCTMemoryMetric()]) {
            let expectation = expectation(description: "Compression completes")

            Task {
                _ = await compressor.compress(
                    largeImage,
                    maxSizeKB: 2048,
                    quality: 0.8
                )
                expectation.fulfill()
            }

            wait(for: [expectation], timeout: 2.0)
        }

        // Assert compression completes in < 500ms
    }

    // MARK: - Database Performance

    @MainActor
    func testSwiftDataQuery_MeasurePerformance() throws {
        // Create in-memory database
        let schema = Schema([CachedTask.self])
        let configuration = ModelConfiguration(isStoredInMemoryOnly: true)
        let container = try ModelContainer(for: schema, configurations: [configuration])
        let context = ModelContext(container)

        // Seed 1000 tasks
        for i in 1...1000 {
            let task = CachedTask(
                id: i,
                title: "Task \(i)",
                taskType: "workout",
                status: "pending",
                dueDate: Date(),
                planId: 1
            )
            context.insert(task)
        }
        try context.save()

        // Measure query performance
        measure(metrics: [XCTClockMetric()]) {
            let descriptor = FetchDescriptor<CachedTask>(
                predicate: #Predicate { $0.status == "pending" },
                sortBy: [SortDescriptor(\.dueDate)]
            )

            _ = try? context.fetch(descriptor)
        }

        // Assert query completes in < 50ms
    }

    // MARK: - View Rendering Performance

    @MainActor
    func testTaskListRendering_MeasurePerformance() {
        let tasks = (1...100).map { TestFixtures.taskWithId($0) }
        let viewModel = TasksViewModel(tasksRepository: MockTasksRepository())

        measure(metrics: [XCTCPUMetric(), XCTMemoryMetric()]) {
            // Simulate rendering task list
            _ = tasks.map { task in
                // Create view for each task
                TaskCard(task: task, onTap: {}, onComplete: {})
            }
        }

        // Assert rendering completes with acceptable CPU/memory usage
    }

    // MARK: - Memory Leak Detection

    func testAuthenticationService_NoMemoryLeak() {
        weak var weakService: AuthenticationService?

        autoreleasepool {
            let apiClient = MockAPIClient()
            let keychainManager = MockKeychainManager()
            let service = AuthenticationService(
                apiClient: apiClient,
                keychainManager: keychainManager
            )

            weakService = service

            // Use the service
            Task { @MainActor in
                _ = try? await service.login(
                    email: "test@example.com",
                    password: "password"
                )
            }
        }

        // Wait for deallocation
        Thread.sleep(forTimeInterval: 0.1)

        XCTAssertNil(weakService, "AuthenticationService should be deallocated")
    }

    // MARK: - Helpers

    private func createTestImage(size: CGSize) -> UIImage {
        let renderer = UIGraphicsImageRenderer(size: size)
        return renderer.image { context in
            UIColor.blue.setFill()
            context.fill(CGRect(origin: .zero, size: size))
        }
    }
}
```

### 10.2 Performance Monitoring

```swift
// MARK: - Performance Monitor

final class PerformanceMonitor {
    static let shared = PerformanceMonitor()

    private var measurements: [String: [TimeInterval]] = [:]

    func measure<T>(_ operation: String, block: () async throws -> T) async rethrows -> T {
        let start = Date()
        let result = try await block()
        let duration = Date().timeIntervalSince(start)

        record(operation: operation, duration: duration)

        return result
    }

    private func record(operation: String, duration: TimeInterval) {
        if measurements[operation] == nil {
            measurements[operation] = []
        }
        measurements[operation]?.append(duration)

        // Log slow operations
        if duration > 1.0 {
            print("SLOW OPERATION: \(operation) took \(duration)s")
        }
    }

    func printReport() {
        print("\n=== Performance Report ===")

        for (operation, durations) in measurements.sorted(by: { $0.key < $1.key }) {
            let average = durations.reduce(0, +) / Double(durations.count)
            let max = durations.max() ?? 0
            let min = durations.min() ?? 0

            print("\(operation):")
            print("  Average: \(String(format: "%.3f", average))s")
            print("  Min: \(String(format: "%.3f", min))s")
            print("  Max: \(String(format: "%.3f", max))s")
            print("  Count: \(durations.count)")
        }
    }
}

// Usage:
// await PerformanceMonitor.shared.measure("Login") {
//     try await authService.login(email: email, password: password)
// }
```

---

## 11. Summary & Recommendations

### 11.1 Testing Best Practices

1. **Write tests first (TDD)** for critical business logic
2. **Use mocks extensively** to isolate components
3. **Keep tests fast** - aim for < 10s total unit test execution
4. **Make tests deterministic** - no random data, fixed dates
5. **Test edge cases** - empty states, errors, boundary conditions
6. **Use meaningful assertions** - specific, descriptive messages
7. **Avoid testing implementation details** - test behavior, not internals
8. **Maintain test code quality** - refactor tests like production code

### 11.2 Common Pitfalls to Avoid

- Testing private methods directly
- Over-mocking leading to brittle tests
- Slow tests blocking development
- Flaky tests eroding confidence
- Insufficient error scenario coverage
- Testing UI implementation instead of user behavior
- Ignoring test maintenance

### 11.3 Continuous Improvement

- Review test coverage weekly
- Identify and fix flaky tests immediately
- Update tests when requirements change
- Refactor test code regularly
- Share testing knowledge within team
- Celebrate testing milestones

### 11.4 Success Metrics

Track these metrics to measure testing effectiveness:

| Metric              | Target      | Measurement                  |
| ------------------- | ----------- | ---------------------------- |
| Code Coverage       | 80%+        | Xcode coverage report        |
| Defect Escape Rate  | < 5%        | Production bugs / Total bugs |
| Test Execution Time | < 5 minutes | CI pipeline duration         |
| Flaky Test Rate     | 0%          | Tests failing inconsistently |
| Test Pass Rate      | 100%        | Passing tests / Total tests  |

---

## Conclusion

This comprehensive testing strategy provides a solid foundation for building a high-quality, reliable GTSD iOS application. By following the testing pyramid, maintaining high coverage, and continuously improving test quality, you'll catch bugs early, ship with confidence, and deliver an exceptional user experience.

**Key Takeaways:**

- Prioritize unit tests (65% of test suite)
- Mock dependencies for fast, isolated tests
- Use Page Object pattern for UI tests
- Test critical user journeys thoroughly
- Monitor performance continuously
- Integrate testing into CI/CD pipeline
- Maintain test code quality

**Estimated Testing Effort:**

- Initial setup: 1-2 weeks
- Per feature: 30-40% of development time
- Maintenance: Ongoing

Good luck building a well-tested GTSD iOS app!
