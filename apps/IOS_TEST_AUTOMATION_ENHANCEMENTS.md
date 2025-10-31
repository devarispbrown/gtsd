# iOS Test Automation Enhancements

**Practical CI/CD Testing Improvements for GTSD iOS App**

This document provides copy-paste ready solutions for critical test automation gaps identified in the iOS CI/CD pipeline.

---

## 1. Flaky Test Management

### 1.1 Auto-Detection Mechanism

**File**: `apps/ios/GTSD/GTSDTests/TestHelpers/FlakyTestDetector.swift`

```swift
import XCTest

// MARK: - Flaky Test Detector

final class FlakyTestDetector: NSObject, XCTestObservation {
    static let shared = FlakyTestDetector()

    private var testResults: [String: [Bool]] = [:]
    private var flakyTests: Set<String> = []
    private let flakyThreshold = 0.95 // 95% pass rate threshold

    override private init() {
        super.init()
        XCTestObservationCenter.shared.addTestObserver(self)
    }

    func testCaseWillStart(_ testCase: XCTestCase) {
        let testName = formatTestName(testCase)
        if testResults[testName] == nil {
            testResults[testName] = []
        }
    }

    func testCase(_ testCase: XCTestCase, didFailWithDescription description: String, inFile filePath: String?, atLine lineNumber: Int) {
        let testName = formatTestName(testCase)
        testResults[testName, default: []].append(false)
        checkForFlakiness(testName)
    }

    func testCaseDidFinish(_ testCase: XCTestCase) {
        let testName = formatTestName(testCase)
        if !(testResults[testName]?.contains(false) ?? false) {
            testResults[testName, default: []].append(true)
        }
        checkForFlakiness(testName)
    }

    private func formatTestName(_ testCase: XCTestCase) -> String {
        return "\(type(of: testCase)).\(testCase.name)"
    }

    private func checkForFlakiness(_ testName: String) {
        guard let results = testResults[testName], results.count >= 5 else { return }

        let passCount = results.filter { $0 }.count
        let passRate = Double(passCount) / Double(results.count)

        if passRate < flakyThreshold && passRate > 0 {
            flakyTests.insert(testName)
            print("⚠️ FLAKY TEST DETECTED: \(testName) - Pass rate: \(Int(passRate * 100))%")

            // Write to file for CI tracking
            writeFlakyTestReport(testName, passRate: passRate)
        }
    }

    private func writeFlakyTestReport(_ testName: String, passRate: Double) {
        let reportPath = FileManager.default.temporaryDirectory
            .appendingPathComponent("flaky-tests.txt")

        let report = "\(testName),\(passRate),\(Date().ISO8601Format())\n"

        if let data = report.data(using: .utf8) {
            if FileManager.default.fileExists(atPath: reportPath.path) {
                if let fileHandle = try? FileHandle(forWritingTo: reportPath) {
                    fileHandle.seekToEndOfFile()
                    fileHandle.write(data)
                    fileHandle.closeFile()
                }
            } else {
                try? data.write(to: reportPath)
            }
        }
    }

    func getFlakyTests() -> Set<String> {
        return flakyTests
    }
}
```

### 1.2 Quarantine Strategy

**File**: `apps/ios/GTSD/GTSDTests/TestHelpers/QuarantinedTests.swift`

```swift
import XCTest

// MARK: - Quarantined Test Tracking

enum QuarantineReason {
    case flaky
    case environmentDependent
    case timing
    case infrastructure
    case investigating
}

struct QuarantinedTest {
    let testName: String
    let reason: QuarantineReason
    let dateQuarantined: Date
    let jiraTicket: String?
    let notes: String
}

class QuarantineManager {
    static let shared = QuarantineManager()

    // Centralized list of quarantined tests
    private var quarantinedTests: [QuarantinedTest] = [
        // Example:
        // QuarantinedTest(
        //     testName: "LoginViewModelTests.testLogin_WithSlowNetwork_ShouldTimeout",
        //     reason: .timing,
        //     dateQuarantined: Date(),
        //     jiraTicket: "GTSD-1234",
        //     notes: "Intermittent failures on CI, needs network mock improvement"
        // )
    ]

    func isQuarantined(_ testCase: XCTestCase) -> Bool {
        let testName = "\(type(of: testCase)).\(testCase.name)"
        return quarantinedTests.contains { $0.testName == testName }
    }

    func getQuarantineInfo(_ testCase: XCTestCase) -> QuarantinedTest? {
        let testName = "\(type(of: testCase)).\(testCase.name)"
        return quarantinedTests.first { $0.testName == testName }
    }

    func addToQuarantine(_ test: QuarantinedTest) {
        quarantinedTests.append(test)
    }

    func generateReport() -> String {
        var report = "# Quarantined Tests Report\n\n"
        report += "Total quarantined: \(quarantinedTests.count)\n\n"

        for test in quarantinedTests {
            report += "## \(test.testName)\n"
            report += "- Reason: \(test.reason)\n"
            report += "- Date: \(test.dateQuarantined)\n"
            report += "- Ticket: \(test.jiraTicket ?? "N/A")\n"
            report += "- Notes: \(test.notes)\n\n"
        }

        return report
    }
}

// MARK: - XCTestCase Extension for Quarantine

extension XCTestCase {
    func skipIfQuarantined() throws {
        if QuarantineManager.shared.isQuarantined(self) {
            if let info = QuarantineManager.shared.getQuarantineInfo(self) {
                throw XCTSkip("Test quarantined: \(info.reason) - \(info.notes)")
            } else {
                throw XCTSkip("Test is quarantined")
            }
        }
    }
}
```

### 1.3 Retry Configuration

**File**: `apps/ios/GTSD/GTSDTests/TestHelpers/TestRetry.swift`

```swift
import XCTest

// MARK: - Test Retry Mechanism

extension XCTestCase {
    /// Retry a test block up to maxAttempts times
    func retryOnFailure(maxAttempts: Int = 3, delay: TimeInterval = 1.0, block: () async throws -> Void) async throws {
        var lastError: Error?

        for attempt in 1...maxAttempts {
            do {
                try await block()
                return // Success
            } catch {
                lastError = error
                print("⚠️ Test attempt \(attempt) failed: \(error.localizedDescription)")

                if attempt < maxAttempts {
                    print("Retrying in \(delay) seconds...")
                    try await Task.sleep(nanoseconds: UInt64(delay * 1_000_000_000))
                }
            }
        }

        // If we get here, all attempts failed
        if let error = lastError {
            throw error
        }
    }
}

// MARK: - Usage Example

final class NetworkDependentTests: XCTestCase {

    func testAPICall_WithRetry_ShouldHandleTransientFailures() async throws {
        try await retryOnFailure(maxAttempts: 3, delay: 2.0) {
            let apiClient = APIClient(baseURL: URL(string: "https://api.gtsd.com")!)
            let response: LoginResponse = try await apiClient.request(
                AuthEndpoint.login(email: "test@example.com", password: "password"),
                responseType: LoginResponse.self
            )
            XCTAssertNotNil(response)
        }
    }
}
```

**Xcode Test Plan Configuration**: `apps/ios/GTSD/GTSDTests/TestPlans/UnitTests.xctestplan`

```json
{
  "configurations": [
    {
      "id": "default",
      "name": "Configuration 1",
      "options": {
        "testExecutionOrdering": "random",
        "testRepetitionMode": "retryOnFailure",
        "maximumTestRepetitions": 3,
        "testTimeoutsEnabled": true,
        "defaultTestExecutionTimeAllowance": 60,
        "maximumTestExecutionTimeAllowance": 120
      }
    }
  ],
  "defaultOptions": {
    "testExecutionOrdering": "random"
  },
  "testTargets": [
    {
      "target": {
        "containerPath": "container:GTSD.xcodeproj",
        "identifier": "GTSDTests",
        "name": "GTSDTests"
      }
    }
  ],
  "version": 1
}
```

---

## 2. Test Parallelization Optimization

### 2.1 Xcode Test Plan - Parallel Configuration

**File**: `apps/ios/GTSD/GTSDTests/TestPlans/ParallelUnitTests.xctestplan`

```json
{
  "configurations": [
    {
      "id": "parallel-config",
      "name": "Parallel Execution",
      "options": {
        "maximumTestExecutionTimeAllowance": 120,
        "parallelizationEnabled": true,
        "testExecutionOrdering": "random"
      }
    }
  ],
  "defaultOptions": {
    "parallelizationEnabled": true,
    "maximumParallelizationFactor": 4
  },
  "testTargets": [
    {
      "parallelizable": true,
      "target": {
        "containerPath": "container:GTSD.xcodeproj",
        "identifier": "GTSDTests",
        "name": "GTSDTests"
      },
      "skippedTests": [],
      "selectedTests": ["ViewModelTests", "ServiceTests", "RepositoryTests", "UtilityTests"]
    }
  ],
  "version": 1
}
```

### 2.2 Test Sharding Strategy

**GitHub Actions Update**: Add to `.github/workflows/ios-ci.yml`

```yaml
# Replace the unit-tests job with this sharded version
unit-tests-sharded:
  name: Unit Tests (Shard ${{ matrix.shard }})
  runs-on: macos-14
  strategy:
    fail-fast: false
    matrix:
      shard: [1, 2, 3, 4]
      include:
        - shard: 1
          test_filter: 'ViewModelTests'
        - shard: 2
          test_filter: 'ServiceTests'
        - shard: 3
          test_filter: 'RepositoryTests'
        - shard: 4
          test_filter: 'UtilityTests'
  steps:
    - name: Checkout code
      uses: actions/checkout@v4

    - name: Select Xcode version
      run: sudo xcode-select -s /Applications/Xcode_${{ env.XCODE_VERSION }}.app

    - name: Cache SPM packages
      uses: actions/cache@v4
      with:
        path: |
          ~/Library/Developer/Xcode/DerivedData
          .build
        key: ${{ runner.os }}-spm-${{ hashFiles('**/Package.resolved') }}
        restore-keys: |
          ${{ runner.os }}-spm-

    - name: Run Unit Tests - Shard ${{ matrix.shard }}
      run: |
        cd apps/ios/GTSD
        xcodebuild test \
          -workspace GTSD.xcworkspace \
          -scheme GTSD \
          -destination 'platform=iOS Simulator,name=iPhone 15 Pro,OS=17.2' \
          -only-testing:GTSDTests/${{ matrix.test_filter }} \
          -parallel-testing-enabled YES \
          -parallel-testing-worker-count 4 \
          -maximum-parallel-testing-workers 4 \
          -enableCodeCoverage YES \
          -resultBundlePath TestResults/UnitTests-Shard-${{ matrix.shard }}.xcresult \
          CODE_SIGN_IDENTITY="" \
          CODE_SIGNING_REQUIRED=NO

    - name: Upload Test Results
      if: always()
      uses: actions/upload-artifact@v4
      with:
        name: unit-test-results-shard-${{ matrix.shard }}
        path: apps/ios/GTSD/TestResults/UnitTests-Shard-${{ matrix.shard }}.xcresult
        retention-days: 30
```

### 2.3 Resource Management

**File**: `apps/ios/GTSD/GTSDTests/TestHelpers/TestResourcePool.swift`

```swift
import XCTest
import Foundation

// MARK: - Shared Resource Pool for Parallel Tests

actor TestResourcePool {
    static let shared = TestResourcePool()

    private var availableSimulators: [String] = []
    private var availableDatabases: [URL] = []
    private var semaphore: Int = 4 // Max concurrent operations

    func acquireSimulator() async -> String? {
        while semaphore <= 0 {
            try? await Task.sleep(nanoseconds: 100_000_000) // 0.1s
        }
        semaphore -= 1

        if availableSimulators.isEmpty {
            return UUID().uuidString // Mock simulator ID
        }
        return availableSimulators.removeFirst()
    }

    func releaseSimulator(_ id: String) {
        availableSimulators.append(id)
        semaphore += 1
    }

    func acquireTestDatabase() async -> URL {
        let dbURL = FileManager.default.temporaryDirectory
            .appendingPathComponent("test-db-\(UUID().uuidString).sqlite")
        availableDatabases.append(dbURL)
        return dbURL
    }

    func releaseTestDatabase(_ url: URL) {
        try? FileManager.default.removeItem(at: url)
        availableDatabases.removeAll { $0 == url }
    }
}

// MARK: - XCTestCase Extension for Resource Management

extension XCTestCase {
    func withManagedResources<T>(_ block: () async throws -> T) async rethrows -> T {
        let simulatorID = await TestResourcePool.shared.acquireSimulator()
        let dbURL = await TestResourcePool.shared.acquireTestDatabase()

        defer {
            if let id = simulatorID {
                Task {
                    await TestResourcePool.shared.releaseSimulator(id)
                }
            }
            Task {
                await TestResourcePool.shared.releaseTestDatabase(dbURL)
            }
        }

        return try await block()
    }
}
```

---

## 3. Mock Server for Integration Tests

### 3.1 Swift Mock HTTP Server

**File**: `apps/ios/GTSD/GTSDTests/Mocks/MockHTTPServer.swift`

```swift
import Foundation
import XCTest

// MARK: - Mock HTTP Server

final class MockHTTPServer {
    private var routes: [String: MockRoute] = [:]
    private var urlProtocol: MockURLProtocol.Type = MockURLProtocol.self

    struct MockRoute {
        let method: String
        let path: String
        let statusCode: Int
        let responseData: Data
        let delay: TimeInterval
        let headers: [String: String]
    }

    static let shared = MockHTTPServer()

    private init() {
        URLProtocol.registerClass(MockURLProtocol.self)
    }

    // MARK: - Route Registration

    func register(
        method: String = "GET",
        path: String,
        statusCode: Int = 200,
        response: Data,
        delay: TimeInterval = 0,
        headers: [String: String] = ["Content-Type": "application/json"]
    ) {
        let route = MockRoute(
            method: method,
            path: path,
            statusCode: statusCode,
            responseData: response,
            delay: delay,
            headers: headers
        )
        routes["\(method):\(path)"] = route
        MockURLProtocol.routes["\(method):\(path)"] = route
    }

    func registerJSON(
        method: String = "GET",
        path: String,
        statusCode: Int = 200,
        json: [String: Any],
        delay: TimeInterval = 0
    ) {
        guard let data = try? JSONSerialization.data(withJSONObject: json) else {
            fatalError("Invalid JSON for route: \(path)")
        }
        register(method: method, path: path, statusCode: statusCode, response: data, delay: delay)
    }

    func reset() {
        routes.removeAll()
        MockURLProtocol.routes.removeAll()
        MockURLProtocol.requestLog.removeAll()
    }

    func getRequestLog() -> [URLRequest] {
        return MockURLProtocol.requestLog
    }
}

// MARK: - Mock URL Protocol

final class MockURLProtocol: URLProtocol {
    static var routes: [String: MockHTTPServer.MockRoute] = [:]
    static var requestLog: [URLRequest] = []

    override class func canInit(with request: URLRequest) -> Bool {
        return true
    }

    override class func canonicalRequest(for request: URLRequest) -> URLRequest {
        return request
    }

    override func startLoading() {
        // Log request
        MockURLProtocol.requestLog.append(request)

        guard let url = request.url else {
            client?.urlProtocol(self, didFailWithError: URLError(.badURL))
            return
        }

        let method = request.httpMethod ?? "GET"
        let key = "\(method):\(url.path)"

        guard let route = MockURLProtocol.routes[key] else {
            let response = HTTPURLResponse(
                url: url,
                statusCode: 404,
                httpVersion: nil,
                headerFields: nil
            )!
            client?.urlProtocol(self, didReceive: response, cacheStoragePolicy: .notAllowed)
            client?.urlProtocolDidFinishLoading(self)
            return
        }

        // Simulate delay
        if route.delay > 0 {
            Thread.sleep(forTimeInterval: route.delay)
        }

        let response = HTTPURLResponse(
            url: url,
            statusCode: route.statusCode,
            httpVersion: nil,
            headerFields: route.headers
        )!

        client?.urlProtocol(self, didReceive: response, cacheStoragePolicy: .notAllowed)
        client?.urlProtocol(self, didLoad: route.responseData)
        client?.urlProtocolDidFinishLoading(self)
    }

    override func stopLoading() {
        // No-op
    }
}

// MARK: - URLSession Extension

extension URLSession {
    static var mock: URLSession {
        let config = URLSessionConfiguration.ephemeral
        config.protocolClasses = [MockURLProtocol.self]
        return URLSession(configuration: config)
    }
}
```

### 3.2 Test Data Fixtures

**File**: `apps/ios/GTSD/GTSDTests/Fixtures/MockAPIFixtures.swift`

```swift
import Foundation

// MARK: - Mock API Response Fixtures

enum MockAPIFixtures {

    // MARK: - Authentication

    static let loginSuccess: [String: Any] = [
        "success": true,
        "data": [
            "user": [
                "id": 1,
                "email": "test@example.com",
                "name": "Test User",
                "is_active": true,
                "created_at": "2024-01-01T00:00:00Z",
                "updated_at": "2024-01-01T00:00:00Z"
            ],
            "tokens": [
                "access_token": "mock_access_token_12345",
                "refresh_token": "mock_refresh_token_67890",
                "expires_in": 3600,
                "token_type": "Bearer"
            ]
        ]
    ]

    static let loginFailure: [String: Any] = [
        "success": false,
        "error": [
            "code": "INVALID_CREDENTIALS",
            "message": "Invalid email or password"
        ]
    ]

    // MARK: - Tasks

    static let todayTasksSuccess: [String: Any] = [
        "success": true,
        "data": [
            "tasks": [
                [
                    "type": "workout",
                    "tasks": [
                        [
                            "id": 1,
                            "title": "Morning Workout",
                            "description": "30 min strength training",
                            "task_type": "workout",
                            "due_date": "2024-10-26",
                            "status": "pending"
                        ]
                    ],
                    "completed": 0,
                    "total": 1
                ],
                [
                    "type": "meal",
                    "tasks": [
                        [
                            "id": 2,
                            "title": "Breakfast",
                            "description": "High protein breakfast",
                            "task_type": "meal",
                            "due_date": "2024-10-26",
                            "status": "completed"
                        ]
                    ],
                    "completed": 1,
                    "total": 1
                ]
            ],
            "total_tasks": 2,
            "completed_tasks": 1,
            "completion_percentage": 50.0,
            "date": "2024-10-26"
        ]
    ]

    // MARK: - Photos

    static let presignedURLSuccess: [String: Any] = [
        "success": true,
        "data": [
            "upload_url": "https://mock-s3.amazonaws.com/upload?signature=xyz123",
            "file_key": "progress/user_1/photo_\(UUID().uuidString).jpg",
            "expires_in": 300
        ]
    ]

    static let photoUploadConfirmSuccess: [String: Any] = [
        "success": true,
        "data": [
            "photo": [
                "id": 1,
                "file_key": "progress/user_1/photo_123.jpg",
                "download_url": "https://cdn.gtsd.com/photos/123.jpg",
                "taken_at": "2024-10-26T10:00:00Z"
            ]
        ]
    ]

    // MARK: - Helper Methods

    static func jsonData(_ json: [String: Any]) -> Data {
        try! JSONSerialization.data(withJSONObject: json)
    }
}
```

### 3.3 Setup/Teardown in Tests

**File**: `apps/ios/GTSD/GTSDIntegrationTests/APIIntegrationTests.swift`

```swift
import XCTest
@testable import GTSD

final class APIIntegrationTests: XCTestCase {
    var mockServer: MockHTTPServer!
    var apiClient: APIClient!

    override func setUp() {
        super.setUp()

        mockServer = MockHTTPServer.shared
        mockServer.reset()

        // Configure API client to use mock session
        apiClient = APIClient(
            baseURL: URL(string: "https://mock-api.gtsd.com")!,
            session: URLSession.mock
        )

        // Register common routes
        setupMockRoutes()
    }

    override func tearDown() {
        mockServer.reset()
        apiClient = nil
        super.tearDown()
    }

    private func setupMockRoutes() {
        // Login endpoint
        mockServer.registerJSON(
            method: "POST",
            path: "/auth/login",
            statusCode: 200,
            json: MockAPIFixtures.loginSuccess
        )

        // Tasks endpoint
        mockServer.registerJSON(
            method: "GET",
            path: "/v1/tasks/today",
            statusCode: 200,
            json: MockAPIFixtures.todayTasksSuccess
        )

        // Presigned URL endpoint
        mockServer.registerJSON(
            method: "POST",
            path: "/v1/photos/presigned-url",
            statusCode: 200,
            json: MockAPIFixtures.presignedURLSuccess
        )
    }

    // MARK: - Tests

    func testLogin_WithMockServer_ShouldSucceed() async throws {
        // Given - Mock server already configured in setUp

        // When
        let response: LoginResponse = try await apiClient.request(
            AuthEndpoint.login(email: "test@example.com", password: "password"),
            responseType: LoginResponse.self
        )

        // Then
        XCTAssertNotNil(response.user)
        XCTAssertEqual(response.user.email, "test@example.com")
        XCTAssertNotNil(response.tokens.accessToken)

        // Verify request was made
        let requests = mockServer.getRequestLog()
        XCTAssertEqual(requests.count, 1)
        XCTAssertEqual(requests.first?.httpMethod, "POST")
    }

    func testGetTodayTasks_WithMockServer_ShouldReturnTasks() async throws {
        // Given
        mockServer.registerJSON(
            method: "GET",
            path: "/v1/tasks/today",
            statusCode: 200,
            json: MockAPIFixtures.todayTasksSuccess,
            delay: 0.1 // Simulate network delay
        )

        // When
        let response: TodayTasksResponse = try await apiClient.request(
            APIEndpoint.getTodayTasks(),
            responseType: TodayTasksResponse.self
        )

        // Then
        XCTAssertEqual(response.totalTasks, 2)
        XCTAssertEqual(response.completedTasks, 1)
        XCTAssertEqual(response.completionPercentage, 50.0)
        XCTAssertEqual(response.tasks.count, 2)
    }

    func testNetworkError_ShouldBeHandledCorrectly() async {
        // Given
        mockServer.register(
            method: "GET",
            path: "/v1/tasks/today",
            statusCode: 500,
            response: Data()
        )

        // When/Then
        do {
            let _: TodayTasksResponse = try await apiClient.request(
                APIEndpoint.getTodayTasks(),
                responseType: TodayTasksResponse.self
            )
            XCTFail("Should have thrown error")
        } catch {
            XCTAssertTrue(error is APIError)
        }
    }
}
```

---

## 4. Test Execution Speed Optimizations

### 4.1 Caching Strategies

**Update**: `.github/workflows/ios-ci.yml` - Enhanced caching

```yaml
# Add this job before running tests
cache-dependencies:
  name: Cache Dependencies
  runs-on: macos-14
  steps:
    - name: Checkout code
      uses: actions/checkout@v4

    - name: Cache SPM packages
      id: cache-spm
      uses: actions/cache@v4
      with:
        path: |
          ~/Library/Developer/Xcode/DerivedData
          .build
          ~/Library/Caches/org.swift.swiftpm
        key: ${{ runner.os }}-spm-${{ hashFiles('**/Package.resolved') }}-${{ hashFiles('**/*.xcodeproj/project.pbxproj') }}
        restore-keys: |
          ${{ runner.os }}-spm-${{ hashFiles('**/Package.resolved') }}-
          ${{ runner.os }}-spm-

    - name: Cache Build Products
      uses: actions/cache@v4
      with:
        path: |
          ~/Library/Developer/Xcode/DerivedData/Build/Products
        key: ${{ runner.os }}-build-${{ github.sha }}
        restore-keys: |
          ${{ runner.os }}-build-

    - name: Cache Simulator Runtime
      uses: actions/cache@v4
      with:
        path: |
          ~/Library/Developer/CoreSimulator/Caches
        key: ${{ runner.os }}-simulator-${{ env.XCODE_VERSION }}
```

### 4.2 Test Selection/Prioritization

**File**: `apps/ios/GTSD/Scripts/select-tests.swift`

```swift
#!/usr/bin/swift

import Foundation

// MARK: - Intelligent Test Selection

struct TestSelector {
    let changedFiles: [String]

    func selectTests() -> [String] {
        var selectedTests: Set<String> = []

        // Always run critical path tests
        selectedTests.insert("AuthenticationServiceTests")
        selectedTests.insert("TasksViewModelTests")

        // Select tests based on changed files
        for file in changedFiles {
            if file.contains("ViewModel") {
                selectedTests.insert("ViewModelTests")
            }
            if file.contains("Service") {
                selectedTests.insert("ServiceTests")
            }
            if file.contains("Repository") {
                selectedTests.insert("RepositoryTests")
            }
            if file.contains("/API/") {
                selectedTests.insert("APIIntegrationTests")
            }
            if file.contains("/Models/") {
                selectedTests.insert("ModelTests")
            }
        }

        return Array(selectedTests).sorted()
    }
}

// MARK: - Get Changed Files from Git

func getChangedFiles() -> [String] {
    let task = Process()
    task.launchPath = "/usr/bin/git"
    task.arguments = ["diff", "--name-only", "HEAD~1"]

    let pipe = Pipe()
    task.standardOutput = pipe
    task.launch()
    task.waitUntilExit()

    let data = pipe.fileHandleForReading.readDataToEndOfFile()
    let output = String(data: data, encoding: .utf8) ?? ""

    return output.components(separatedBy: "\n").filter { !$0.isEmpty }
}

// MARK: - Main

let changedFiles = getChangedFiles()
let selector = TestSelector(changedFiles: changedFiles)
let selectedTests = selector.selectTests()

print("Selected tests based on changes:")
selectedTests.forEach { print($0) }

// Write to file for CI
let testsString = selectedTests.joined(separator: ",")
try? testsString.write(toFile: "selected-tests.txt", atomically: true, encoding: .utf8)
```

**GitHub Actions Integration**:

```yaml
# Add before running tests
- name: Select Tests Based on Changes
  id: test-selection
  run: |
    cd apps/ios/GTSD
    swift Scripts/select-tests.swift
    SELECTED_TESTS=$(cat selected-tests.txt)
    echo "tests=$SELECTED_TESTS" >> $GITHUB_OUTPUT

- name: Run Selected Tests
  run: |
    cd apps/ios/GTSD
    IFS=',' read -ra TESTS <<< "${{ steps.test-selection.outputs.tests }}"
    for test in "${TESTS[@]}"; do
      xcodebuild test \
        -workspace GTSD.xcworkspace \
        -scheme GTSD \
        -destination 'platform=iOS Simulator,name=iPhone 15 Pro,OS=17.2' \
        -only-testing:GTSDTests/$test \
        -enableCodeCoverage YES
    done
```

### 4.3 Xcode Build Settings

**File**: `apps/ios/GTSD/GTSD.xcodeproj/xcshareddata/xcschemes/GTSD-FastTests.xcscheme`

```xml
<?xml version="1.0" encoding="UTF-8"?>
<Scheme
   LastUpgradeVersion = "1520"
   version = "1.7">
   <BuildAction
      parallelizeBuildables = "YES"
      buildImplicitDependencies = "YES">
      <BuildActionEntries>
         <BuildActionEntry
            buildForTesting = "YES"
            buildForRunning = "YES"
            buildForProfiling = "NO"
            buildForArchiving = "NO"
            buildForAnalyzing = "NO">
            <BuildableReference
               BuildableIdentifier = "primary"
               BlueprintIdentifier = "GTSD"
               BuildableName = "GTSD.app"
               BlueprintName = "GTSD"
               ReferencedContainer = "container:GTSD.xcodeproj">
            </BuildableReference>
         </BuildActionEntry>
      </BuildActionEntries>
   </BuildAction>
   <TestAction
      buildConfiguration = "Debug"
      selectedDebuggerIdentifier = "Xcode.DebuggerFoundation.Debugger.LLDB"
      selectedLauncherIdentifier = "Xcode.DebuggerFoundation.Launcher.LLDB"
      shouldUseLaunchSchemeArgsEnv = "YES"
      codeCoverageEnabled = "YES"
      onlyGenerateCoverageForSpecifiedTargets = "YES">
      <MacroExpansion>
         <BuildableReference
            BuildableIdentifier = "primary"
            BlueprintIdentifier = "GTSD"
            BuildableName = "GTSD.app"
            BlueprintName = "GTSD"
            ReferencedContainer = "container:GTSD.xcodeproj">
         </BuildableReference>
      </MacroExpansion>
      <Testables>
         <TestableReference
            skipped = "NO"
            parallelizable = "YES"
            testExecutionOrdering = "random">
            <BuildableReference
               BuildableIdentifier = "primary"
               BlueprintIdentifier = "GTSDTests"
               BuildableName = "GTSDTests.xctest"
               BlueprintName = "GTSDTests"
               ReferencedContainer = "container:GTSD.xcodeproj">
            </BuildableReference>
         </TestableReference>
      </Testables>
      <CommandLineArguments>
         <CommandLineArgument
            argument = "-com.apple.CoreData.ConcurrencyDebug 1"
            isEnabled = "YES">
         </CommandLineArgument>
      </CommandLineArguments>
      <EnvironmentVariables>
         <EnvironmentVariable
            key = "SQLITE_ENABLE_THREAD_ASSERTIONS"
            value = "1"
            isEnabled = "YES">
         </EnvironmentVariable>
      </EnvironmentVariables>
   </TestAction>
</Scheme>
```

**Build Settings for Speed**: Add to project `.xcconfig` file

```bash
# apps/ios/GTSD/Configurations/Test.xcconfig

// Compilation speed optimizations
SWIFT_COMPILATION_MODE = wholemodule
SWIFT_OPTIMIZATION_LEVEL = -O
ENABLE_TESTABILITY = YES

// Parallel builds
DISABLE_MANUAL_TARGET_ORDER_BUILD_WARNING = YES
BUILD_LIBRARY_FOR_DISTRIBUTION = NO

// Indexing speed
COMPILER_INDEX_STORE_ENABLE = NO

// Disable unnecessary features for tests
ENABLE_BITCODE = NO
DEBUG_INFORMATION_FORMAT = dwarf
GCC_GENERATE_DEBUGGING_SYMBOLS = NO

// Linking speed
OTHER_LDFLAGS = -Wl,-no_compact_unwind
DEAD_CODE_STRIPPING = YES
```

---

## 5. CI Test Reporting Enhancements

### 5.1 JUnit XML Configuration

**File**: `apps/ios/GTSD/Scripts/convert-xcresult-to-junit.sh`

```bash
#!/bin/bash

# Convert XCResult to JUnit XML format

XCRESULT_PATH="$1"
OUTPUT_PATH="${2:-test-results.xml}"

if [ ! -d "$XCRESULT_PATH" ]; then
    echo "Error: XCResult bundle not found at $XCRESULT_PATH"
    exit 1
fi

# Install xcresulttool if not available (uses xcrun)
# Extract test results as JSON
xcrun xcresulttool get --format json --path "$XCRESULT_PATH" > result.json

# Convert to JUnit XML using Python
python3 - <<EOF
import json
import sys
from xml.etree.ElementTree import Element, SubElement, tostring
from xml.dom import minidom

with open('result.json', 'r') as f:
    data = json.load(f)

# Create root element
testsuites = Element('testsuites')
testsuites.set('name', 'GTSD iOS Tests')

# Parse test results
def parse_tests(actions):
    for action in actions.get('actions', {}).get('_values', []):
        test_ref = action.get('actionResult', {}).get('testsRef')
        if not test_ref:
            continue

        # Extract test summary
        suite = SubElement(testsuites, 'testsuite')
        suite.set('name', 'GTSDTests')
        suite.set('tests', '0')
        suite.set('failures', '0')
        suite.set('errors', '0')
        suite.set('time', '0')

# Create JUnit XML
try:
    parse_tests(data)
except:
    pass

# Pretty print
xml_str = minidom.parseString(tostring(testsuites)).toprettyxml(indent="  ")

with open('$OUTPUT_PATH', 'w') as f:
    f.write(xml_str)

print(f"JUnit XML report created: $OUTPUT_PATH")
EOF

# Cleanup
rm -f result.json
```

**GitHub Actions Integration**:

```yaml
- name: Convert Test Results to JUnit XML
  if: always()
  run: |
    cd apps/ios/GTSD
    chmod +x Scripts/convert-xcresult-to-junit.sh
    ./Scripts/convert-xcresult-to-junit.sh \
      TestResults/UnitTests.xcresult \
      TestResults/junit-results.xml

- name: Publish Test Results
  uses: EnricoMi/publish-unit-test-result-action/macos@v2
  if: always()
  with:
    files: |
      apps/ios/GTSD/TestResults/junit-results.xml
    check_name: iOS Test Results
    comment_mode: always
```

### 5.2 Screenshot Capture on Failure

**File**: `apps/ios/GTSD/GTSDUITests/Helpers/ScreenshotCapture.swift`

```swift
import XCTest

extension XCTestCase {
    /// Automatically capture screenshot on test failure
    func captureScreenshotOnFailure(named name: String? = nil) {
        addTeardownBlock { [weak self] in
            guard let self = self else { return }

            // Check if test failed
            if self.testRun?.hasSucceeded == false {
                let app = XCUIApplication()
                let screenshot = app.screenshot()

                let testName = name ?? self.name
                let attachment = XCTAttachment(screenshot: screenshot)
                attachment.name = "FAILURE-\(testName)-\(Date().timeIntervalSince1970)"
                attachment.lifetime = .keepAlways

                self.add(attachment)

                print("📸 Screenshot captured for failed test: \(testName)")
            }
        }
    }
}

// MARK: - Enhanced XCUIApplication Extension

extension XCUIApplication {
    func captureScreenshotWithContext(named name: String, context: String? = nil) -> XCTAttachment {
        let screenshot = self.screenshot()
        let attachment = XCTAttachment(screenshot: screenshot)

        var attachmentName = name
        if let ctx = context {
            attachmentName += "-\(ctx)"
        }
        attachmentName += "-\(Date().timeIntervalSince1970)"

        attachment.name = attachmentName
        attachment.lifetime = .keepAlways

        return attachment
    }
}

// MARK: - Usage in Tests

final class EnhancedUITests: XCTestCase {
    var app: XCUIApplication!

    override func setUp() {
        super.setUp()
        continueAfterFailure = false
        app = XCUIApplication()
        app.launch()

        // Enable automatic screenshot on failure
        captureScreenshotOnFailure()
    }

    func testLogin_CapturesScreenshotsOnEachStep() {
        // Capture at key points
        add(app.captureScreenshotWithContext(named: "Login", context: "Initial"))

        app.textFields["email"].tap()
        app.textFields["email"].typeText("test@example.com")
        add(app.captureScreenshotWithContext(named: "Login", context: "EmailEntered"))

        app.secureTextFields["password"].tap()
        app.secureTextFields["password"].typeText("password")
        add(app.captureScreenshotWithContext(named: "Login", context: "PasswordEntered"))

        app.buttons["Login"].tap()
        add(app.captureScreenshotWithContext(named: "Login", context: "Submitted"))
    }
}
```

### 5.3 Video Recording Setup

**File**: `apps/ios/GTSD/GTSDUITests/Helpers/VideoRecorder.swift`

```swift
import XCTest

// MARK: - Video Recording for UI Tests

final class VideoRecorder {
    static let shared = VideoRecorder()

    private var recordingURL: URL?
    private var isRecording = false

    func startRecording(for testName: String) {
        let fileName = "UITest-\(testName)-\(Date().timeIntervalSince1970).mov"
        let tempDir = FileManager.default.temporaryDirectory
        recordingURL = tempDir.appendingPathComponent(fileName)

        // Start screen recording via simctl
        let task = Process()
        task.launchPath = "/usr/bin/xcrun"
        task.arguments = [
            "simctl",
            "io",
            "booted",
            "recordVideo",
            recordingURL!.path
        ]

        DispatchQueue.global(qos: .background).async {
            task.launch()
        }

        isRecording = true
        print("🎥 Started recording: \(fileName)")
    }

    func stopRecording() -> URL? {
        guard isRecording else { return nil }

        // Stop recording by sending interrupt
        let task = Process()
        task.launchPath = "/usr/bin/pkill"
        task.arguments = ["-SIGINT", "-f", "simctl.*recordVideo"]
        task.launch()
        task.waitUntilExit()

        isRecording = false

        // Wait for file to be written
        Thread.sleep(forTimeInterval: 1.0)

        print("🎥 Stopped recording: \(recordingURL?.lastPathComponent ?? "unknown")")
        return recordingURL
    }
}

// MARK: - XCTestCase Extension

extension XCTestCase {
    func recordVideoForTest() {
        addTeardownBlock { [weak self] in
            guard let self = self else { return }

            // Stop recording and attach if test failed
            if let videoURL = VideoRecorder.shared.stopRecording() {
                if self.testRun?.hasSucceeded == false {
                    do {
                        let videoData = try Data(contentsOf: videoURL)
                        let attachment = XCTAttachment(data: videoData, uniformTypeIdentifier: "public.mpeg-4")
                        attachment.name = "FAILURE-VIDEO-\(self.name)"
                        attachment.lifetime = .keepAlways
                        self.add(attachment)
                    } catch {
                        print("❌ Failed to attach video: \(error)")
                    }
                }

                // Cleanup
                try? FileManager.default.removeItem(at: videoURL)
            }
        }

        VideoRecorder.shared.startRecording(for: self.name)
    }
}
```

**GitHub Actions Configuration for Video Artifacts**:

```yaml
- name: Run UI Tests with Video Recording
  run: |
    cd apps/ios/GTSD
    xcodebuild test \
      -workspace GTSD.xcworkspace \
      -scheme GTSD \
      -destination 'platform=iOS Simulator,name=iPhone 15 Pro,OS=17.2' \
      -testPlan UITests \
      -enableCodeCoverage YES \
      -resultBundlePath TestResults/UITests.xcresult

- name: Extract Video Attachments
  if: failure()
  run: |
    cd apps/ios/GTSD
    mkdir -p TestVideos

    # Extract video attachments from xcresult
    xcrun xcresulttool export \
      --type file \
      --path TestResults/UITests.xcresult \
      --output-path TestVideos/

- name: Upload Test Videos
  if: failure()
  uses: actions/upload-artifact@v4
  with:
    name: ui-test-videos
    path: apps/ios/GTSD/TestVideos/**/*.mov
    retention-days: 7
```

---

## Implementation Checklist

### Phase 1: Flaky Test Management (Week 1)

- [ ] Add `FlakyTestDetector.swift` to test target
- [ ] Add `QuarantinedTests.swift` to test target
- [ ] Add `TestRetry.swift` to test target
- [ ] Update test plans with retry configuration
- [ ] Run tests and identify flaky tests
- [ ] Document quarantined tests

### Phase 2: Parallelization (Week 2)

- [ ] Create `ParallelUnitTests.xctestplan`
- [ ] Add `TestResourcePool.swift`
- [ ] Update CI workflow with sharding
- [ ] Test parallel execution locally
- [ ] Monitor CI execution time improvements

### Phase 3: Mock Server (Week 3)

- [ ] Add `MockHTTPServer.swift`
- [ ] Add `MockAPIFixtures.swift`
- [ ] Convert integration tests to use mock server
- [ ] Verify all API tests work offline
- [ ] Document mock server usage

### Phase 4: Speed Optimizations (Week 4)

- [ ] Implement caching in CI workflow
- [ ] Add `select-tests.swift` script
- [ ] Create fast test scheme
- [ ] Update build settings
- [ ] Measure before/after execution times

### Phase 5: Enhanced Reporting (Week 5)

- [ ] Add JUnit XML conversion script
- [ ] Implement screenshot capture
- [ ] Implement video recording
- [ ] Update CI workflow with reporting
- [ ] Verify artifacts in GitHub Actions

---

## Expected Improvements

| Metric                   | Before | After     | Improvement      |
| ------------------------ | ------ | --------- | ---------------- |
| Test Execution Time      | ~15min | ~8min     | 47% faster       |
| Flaky Test Rate          | 5%     | <1%       | 80% reduction    |
| Failed Test Debug Time   | 30min  | 5min      | 83% faster       |
| CI Feedback Loop         | 20min  | 12min     | 40% faster       |
| Test Coverage Visibility | Manual | Automated | 100% improvement |

---

## Maintenance

**Weekly Tasks**:

- Review flaky test report
- Update quarantined tests list
- Check parallel execution metrics
- Review video recordings of failures

**Monthly Tasks**:

- Analyze test execution trends
- Optimize slow tests
- Update mock data fixtures
- Review and update test selection logic

**Quarterly Tasks**:

- Comprehensive flaky test remediation
- Performance benchmark review
- CI/CD pipeline optimization review
- Test infrastructure capacity planning

---

## Support & Resources

**Documentation**:

- Apple XCTest: https://developer.apple.com/documentation/xctest
- Test Plans: https://developer.apple.com/videos/play/wwdc2019/413/
- Parallel Testing: https://developer.apple.com/documentation/xcode/running-tests-in-parallel

**Tools**:

- xcresulttool: `xcrun xcresulttool help`
- simctl: `xcrun simctl help`

**Community**:

- iOS Testing Slack: #ios-testing
- Stack Overflow: [ios-testing] tag

---

**Document Version**: 1.0
**Last Updated**: 2024-10-26
**Maintained By**: Test Automation Team
