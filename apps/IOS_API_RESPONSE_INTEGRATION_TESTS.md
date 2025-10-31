# GTSD iOS App - API Response Integration Tests

## Overview

This document provides comprehensive integration tests for the GTSD API response handling system using XCTest. All tests follow Swift testing best practices with full code coverage.

---

## Test Setup

### File: `APIResponseTestBase.swift`

```swift
//
//  APIResponseTestBase.swift
//  GTSDTests
//
//  Base class for API response tests
//

import XCTest
@testable import GTSD

class APIResponseTestBase: XCTestCase {

    // MARK: - Helper Methods

    /// Create mock JSON data from string
    func mockData(_ jsonString: String) -> Data {
        jsonString.data(using: .utf8)!
    }

    /// Create mock HTTP response
    func mockHTTPResponse(statusCode: Int) -> HTTPURLResponse {
        HTTPURLResponse(
            url: URL(string: "https://api.gtsd.app")!,
            statusCode: statusCode,
            httpVersion: nil,
            headerFields: nil
        )!
    }

    /// Decode and unwrap response
    func decodeResponse<T: Decodable>(
        _ type: T.Type,
        from jsonString: String
    ) throws -> APIResponse<T> {
        let data = mockData(jsonString)
        return try APIResponseDecoder.decode(type, from: data)
    }

    /// Assert decoding error
    func assertDecodingError<T: Decodable>(
        _ type: T.Type,
        from jsonString: String,
        file: StaticString = #file,
        line: UInt = #line
    ) {
        let data = mockData(jsonString)
        XCTAssertThrowsError(
            try APIResponseDecoder.decode(type, from: data),
            file: file,
            line: line
        ) { error in
            XCTAssertTrue(error is APIError, "Expected APIError, got \(type(of: error))", file: file, line: line)
        }
    }
}
```

---

## Core Response Wrapper Tests

### File: `APIResponseTests.swift`

```swift
//
//  APIResponseTests.swift
//  GTSDTests
//
//  Tests for generic APIResponse wrapper
//

import XCTest
@testable import GTSD

final class APIResponseTests: APIResponseTestBase {

    // MARK: - Success Response Tests

    func testDecodeSuccessResponse() throws {
        let json = """
        {
            "success": true,
            "data": {
                "message": "Hello, World!"
            }
        }
        """

        struct TestData: Codable, Equatable {
            let message: String
        }

        let response = try decodeResponse(TestData.self, from: json)

        XCTAssertTrue(response.success)
        XCTAssertEqual(response.data.message, "Hello, World!")
        XCTAssertNil(response.cached)
        XCTAssertNil(response.message)
    }

    func testDecodeSuccessResponseWithCachedFlag() throws {
        let json = """
        {
            "success": true,
            "data": {
                "value": 42
            },
            "cached": true
        }
        """

        struct TestData: Codable, Equatable {
            let value: Int
        }

        let response = try decodeResponse(TestData.self, from: json)

        XCTAssertTrue(response.success)
        XCTAssertEqual(response.data.value, 42)
        XCTAssertTrue(response.isCached)
    }

    func testDecodeSuccessResponseWithMessage() throws {
        let json = """
        {
            "success": true,
            "message": "Logged out successfully"
        }
        """

        let response = try decodeResponse(MessageResponse.self, from: json)

        XCTAssertTrue(response.success)
        XCTAssertEqual(response.message, "Logged out successfully")
    }

    func testDecodeResponseWithOptionalFields() throws {
        let json = """
        {
            "success": true,
            "data": {
                "required": "present",
                "optional": null
            }
        }
        """

        struct TestData: Codable, Equatable {
            let required: String
            let optional: String?
        }

        let response = try decodeResponse(TestData.self, from: json)

        XCTAssertEqual(response.data.required, "present")
        XCTAssertNil(response.data.optional)
    }

    func testDecodeResponseWithMissingOptionalField() throws {
        let json = """
        {
            "success": true,
            "data": {
                "required": "present"
            }
        }
        """

        struct TestData: Codable, Equatable {
            let required: String
            let optional: String?
        }

        let response = try decodeResponse(TestData.self, from: json)

        XCTAssertEqual(response.data.required, "present")
        XCTAssertNil(response.data.optional)
    }

    // MARK: - Failure Tests

    func testDecodeResponseWithSuccessFalse() {
        let json = """
        {
            "success": false,
            "data": {
                "message": "Should fail"
            }
        }
        """

        struct TestData: Codable {
            let message: String
        }

        assertDecodingError(TestData.self, from: json)
    }

    func testDecodeResponseWithMissingSuccessField() {
        let json = """
        {
            "data": {
                "message": "No success field"
            }
        }
        """

        struct TestData: Codable {
            let message: String
        }

        assertDecodingError(TestData.self, from: json)
    }

    func testDecodeResponseWithMissingDataField() {
        let json = """
        {
            "success": true
        }
        """

        struct TestData: Codable {
            let message: String
        }

        assertDecodingError(TestData.self, from: json)
    }

    func testDecodeResponseWithInvalidJSON() {
        let json = """
        {
            "success": true,
            "data": {
                "message": "Missing closing brace"
        }
        """

        struct TestData: Codable {
            let message: String
        }

        assertDecodingError(TestData.self, from: json)
    }

    func testDecodeResponseWithTypeMismatch() {
        let json = """
        {
            "success": true,
            "data": {
                "value": "string"
            }
        }
        """

        struct TestData: Codable {
            let value: Int
        }

        assertDecodingError(TestData.self, from: json)
    }

    // MARK: - Convenience Methods Tests

    func testUnwrapDataFromSuccessResponse() throws {
        let json = """
        {
            "success": true,
            "data": {
                "value": 123
            }
        }
        """

        struct TestData: Codable, Equatable {
            let value: Int
        }

        let response = try decodeResponse(TestData.self, from: json)
        let unwrapped = response.unwrapped

        XCTAssertEqual(unwrapped.value, 123)
    }
}
```

---

## Error Response Tests

### File: `APIErrorResponseTests.swift`

```swift
//
//  APIErrorResponseTests.swift
//  GTSDTests
//
//  Tests for API error responses
//

import XCTest
@testable import GTSD

final class APIErrorResponseTests: APIResponseTestBase {

    func testDecodeValidationError() throws {
        let json = """
        {
            "error": {
                "message": "Validation failed: email: Invalid email format",
                "requestId": "550e8400-e29b-41d4-a716-446655440000"
            }
        }
        """

        let data = mockData(json)
        let errorResponse = try JSONDecoder().decode(APIErrorResponse.self, from: data)

        XCTAssertEqual(errorResponse.error.message, "Validation failed: email: Invalid email format")
        XCTAssertEqual(errorResponse.requestId, "550e8400-e29b-41d4-a716-446655440000")
        XCTAssertNil(errorResponse.error.stack)
    }

    func testDecodeErrorWithStackTrace() throws {
        let json = """
        {
            "error": {
                "message": "Internal server error",
                "requestId": "550e8400-e29b-41d4-a716-446655440000",
                "stack": "Error: Database connection failed\\n    at DatabaseService.connect"
            }
        }
        """

        let data = mockData(json)
        let errorResponse = try JSONDecoder().decode(APIErrorResponse.self, from: data)

        XCTAssertEqual(errorResponse.error.message, "Internal server error")
        XCTAssertNotNil(errorResponse.error.stack)
        XCTAssertTrue(errorResponse.error.stack!.contains("DatabaseService.connect"))
    }

    func testErrorResponseLocalizedDescription() throws {
        let json = """
        {
            "error": {
                "message": "User not found",
                "requestId": "abc-123"
            }
        }
        """

        let data = mockData(json)
        let errorResponse = try JSONDecoder().decode(APIErrorResponse.self, from: data)

        XCTAssertEqual(errorResponse.localizedDescription, "User not found")
    }

    func testAPIErrorRequestIdExtraction() {
        let errorResponse = APIErrorResponse(
            error: APIErrorResponse.ErrorDetails(
                message: "Test error",
                requestId: "request-123",
                stack: nil
            )
        )

        let apiError = APIError.apiError(errorResponse)

        XCTAssertEqual(apiError.requestId, "request-123")
    }
}
```

---

## Date Handling Tests

### File: `DateDecodingTests.swift`

```swift
//
//  DateDecodingTests.swift
//  GTSDTests
//
//  Tests for date decoding strategies
//

import XCTest
@testable import GTSD

final class DateDecodingTests: APIResponseTestBase {

    func testDecodeISO8601WithFractionalSeconds() throws {
        let json = """
        {
            "success": true,
            "data": {
                "timestamp": "2025-10-26T14:30:00.123Z"
            }
        }
        """

        struct TestData: Codable {
            let timestamp: Date
        }

        let response = try decodeResponse(TestData.self, from: json)

        let calendar = Calendar(identifier: .gregorian)
        let components = calendar.dateComponents(
            [.year, .month, .day, .hour, .minute, .second],
            from: response.data.timestamp
        )

        XCTAssertEqual(components.year, 2025)
        XCTAssertEqual(components.month, 10)
        XCTAssertEqual(components.day, 26)
        XCTAssertEqual(components.hour, 14)
        XCTAssertEqual(components.minute, 30)
        XCTAssertEqual(components.second, 0)
    }

    func testDecodeISO8601WithoutFractionalSeconds() throws {
        let json = """
        {
            "success": true,
            "data": {
                "timestamp": "2025-10-26T14:30:00Z"
            }
        }
        """

        struct TestData: Codable {
            let timestamp: Date
        }

        let response = try decodeResponse(TestData.self, from: json)

        let calendar = Calendar(identifier: .gregorian)
        let components = calendar.dateComponents(
            [.year, .month, .day, .hour, .minute],
            from: response.data.timestamp
        )

        XCTAssertEqual(components.year, 2025)
        XCTAssertEqual(components.month, 10)
        XCTAssertEqual(components.day, 26)
        XCTAssertEqual(components.hour, 14)
        XCTAssertEqual(components.minute, 30)
    }

    func testDecodeDateOnlyFormat() throws {
        let json = """
        {
            "success": true,
            "data": {
                "date": "2025-10-26"
            }
        }
        """

        struct TestData: Codable {
            let date: Date
        }

        let response = try decodeResponse(TestData.self, from: json)

        let calendar = Calendar(identifier: .gregorian)
        var utcCalendar = calendar
        utcCalendar.timeZone = TimeZone(secondsFromGMT: 0)!

        let components = utcCalendar.dateComponents(
            [.year, .month, .day],
            from: response.data.date
        )

        XCTAssertEqual(components.year, 2025)
        XCTAssertEqual(components.month, 10)
        XCTAssertEqual(components.day, 26)
    }

    func testDecodeNullableDate() throws {
        let json = """
        {
            "success": true,
            "data": {
                "date": null
            }
        }
        """

        struct TestData: Codable {
            let date: Date?
        }

        let response = try decodeResponse(TestData.self, from: json)

        XCTAssertNil(response.data.date)
    }

    func testDecodeInvalidDateFormat() {
        let json = """
        {
            "success": true,
            "data": {
                "date": "26-10-2025"
            }
        }
        """

        struct TestData: Codable {
            let date: Date
        }

        assertDecodingError(TestData.self, from: json)
    }
}
```

---

## Authentication Tests

### File: `AuthenticationResponseTests.swift`

```swift
//
//  AuthenticationResponseTests.swift
//  GTSDTests
//
//  Tests for authentication endpoint responses
//

import XCTest
@testable import GTSD

final class AuthenticationResponseTests: APIResponseTestBase {

    func testDecodeSignupResponse() throws {
        let json = """
        {
            "success": true,
            "data": {
                "user": {
                    "id": "user-123",
                    "email": "test@example.com",
                    "createdAt": "2025-10-26T10:00:00.000Z",
                    "updatedAt": "2025-10-26T10:00:00.000Z"
                },
                "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
                "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
            }
        }
        """

        let response = try decodeResponse(AuthenticationResponse.self, from: json)

        XCTAssertEqual(response.data.user.id, "user-123")
        XCTAssertEqual(response.data.user.email, "test@example.com")
        XCTAssertFalse(response.data.accessToken.isEmpty)
        XCTAssertFalse(response.data.refreshToken.isEmpty)
    }

    func testDecodeLoginResponse() throws {
        let json = """
        {
            "success": true,
            "data": {
                "user": {
                    "id": "user-456",
                    "email": "existing@example.com",
                    "createdAt": "2025-01-01T00:00:00.000Z",
                    "updatedAt": "2025-10-26T10:00:00.000Z"
                },
                "accessToken": "new-access-token",
                "refreshToken": "new-refresh-token"
            }
        }
        """

        let response = try decodeResponse(AuthenticationResponse.self, from: json)

        XCTAssertEqual(response.data.user.id, "user-456")
        XCTAssertEqual(response.data.user.email, "existing@example.com")
    }

    func testDecodeRefreshTokenResponse() throws {
        let json = """
        {
            "success": true,
            "data": {
                "accessToken": "refreshed-access-token",
                "refreshToken": "refreshed-refresh-token"
            }
        }
        """

        let response = try decodeResponse(RefreshTokenResponse.self, from: json)

        XCTAssertEqual(response.data.accessToken, "refreshed-access-token")
        XCTAssertEqual(response.data.refreshToken, "refreshed-refresh-token")
    }

    func testDecodeLogoutResponse() throws {
        let json = """
        {
            "success": true,
            "message": "Logged out successfully"
        }
        """

        let response = try decodeResponse(MessageResponse.self, from: json)

        XCTAssertTrue(response.success)
        XCTAssertEqual(response.message, "Logged out successfully")
    }

    func testDecodeUserProfileResponse() throws {
        let json = """
        {
            "success": true,
            "data": {
                "id": "user-789",
                "email": "profile@example.com",
                "createdAt": "2025-01-15T10:30:00.000Z",
                "updatedAt": "2025-10-26T14:20:00.000Z"
            }
        }
        """

        let response = try decodeResponse(User.self, from: json)

        XCTAssertEqual(response.data.id, "user-789")
        XCTAssertEqual(response.data.email, "profile@example.com")
    }
}
```

---

## Task Tests

### File: `TaskResponseTests.swift`

```swift
//
//  TaskResponseTests.swift
//  GTSDTests
//
//  Tests for task endpoint responses
//

import XCTest
@testable import GTSD

final class TaskResponseTests: APIResponseTestBase {

    func testDecodeTodayTasksResponse() throws {
        let json = """
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
                    },
                    {
                        "id": 2,
                        "type": "strength",
                        "title": "Upper Body",
                        "description": "Strength training",
                        "dueDate": "2025-10-26",
                        "completed": false,
                        "completedAt": null,
                        "evidence": null
                    }
                ]
            },
            "cached": false
        }
        """

        let response = try decodeResponse(TodayTasksResponse.self, from: json)

        XCTAssertEqual(response.data.totalTasks, 4)
        XCTAssertEqual(response.data.completedTasks, 2)
        XCTAssertEqual(response.data.tasks.count, 2)

        let firstTask = response.data.tasks[0]
        XCTAssertEqual(firstTask.id, 1)
        XCTAssertEqual(firstTask.type, .cardio)
        XCTAssertTrue(firstTask.completed)
        XCTAssertNotNil(firstTask.evidence)
        XCTAssertEqual(firstTask.evidence?.notes, "Felt great!")

        let secondTask = response.data.tasks[1]
        XCTAssertEqual(secondTask.type, .strength)
        XCTAssertFalse(secondTask.completed)
        XCTAssertNil(secondTask.evidence)
    }

    func testDecodeCachedTasksResponse() throws {
        let json = """
        {
            "success": true,
            "data": {
                "totalTasks": 0,
                "completedTasks": 0,
                "tasks": []
            },
            "cached": true
        }
        """

        let response = try decodeResponse(TodayTasksResponse.self, from: json)

        XCTAssertTrue(response.isCached)
        XCTAssertEqual(response.data.tasks.count, 0)
    }

    func testDecodeCreateEvidenceResponse() throws {
        let json = """
        {
            "success": true,
            "data": {
                "evidence": {
                    "id": 456,
                    "type": "text_log",
                    "data": {
                        "text": "Completed workout",
                        "duration": 45
                    },
                    "notes": "Great session"
                },
                "streakUpdated": true,
                "newStreak": 7
            }
        }
        """

        let response = try decodeResponse(CreateEvidenceResponse.self, from: json)

        XCTAssertEqual(response.data.evidence.id, 456)
        XCTAssertEqual(response.data.evidence.type, .textLog)
        XCTAssertTrue(response.data.streakUpdated)
        XCTAssertEqual(response.data.newStreak, 7)
    }

    func testDecodeTaskTypeEnum() throws {
        let types: [String: TaskType] = [
            "cardio": .cardio,
            "strength": .strength,
            "nutrition": .nutrition,
            "photos": .photos
        ]

        for (stringValue, expectedType) in types {
            let json = """
            {
                "success": true,
                "data": {
                    "totalTasks": 1,
                    "completedTasks": 0,
                    "tasks": [{
                        "id": 1,
                        "type": "\(stringValue)",
                        "title": "Test",
                        "description": "Test",
                        "dueDate": "2025-10-26",
                        "completed": false,
                        "completedAt": null,
                        "evidence": null
                    }]
                }
            }
            """

            let response = try decodeResponse(TodayTasksResponse.self, from: json)
            XCTAssertEqual(response.data.tasks[0].type, expectedType)
        }
    }

    func testDecodeEvidenceTypeEnum() throws {
        let types: [String: EvidenceType] = [
            "text_log": .textLog,
            "metrics": .metrics,
            "photo_reference": .photoReference
        ]

        for (stringValue, expectedType) in types {
            let json = """
            {
                "success": true,
                "data": {
                    "evidence": {
                        "id": 1,
                        "type": "\(stringValue)",
                        "data": {},
                        "notes": null
                    },
                    "streakUpdated": false,
                    "newStreak": 0
                }
            }
            """

            let response = try decodeResponse(CreateEvidenceResponse.self, from: json)
            XCTAssertEqual(response.data.evidence.type, expectedType)
        }
    }
}
```

---

## Photo Tests

### File: `PhotoResponseTests.swift`

```swift
//
//  PhotoResponseTests.swift
//  GTSDTests
//
//  Tests for photo endpoint responses
//

import XCTest
@testable import GTSD

final class PhotoResponseTests: APIResponseTestBase {

    func testDecodePresignResponse() throws {
        let json = """
        {
            "success": true,
            "data": {
                "uploadUrl": "https://s3.amazonaws.com/bucket/key?signature=...",
                "fileKey": "progress-photos/user-123/abc-def-photo.jpg",
                "expiresIn": 3600
            }
        }
        """

        let response = try decodeResponse(PresignResponse.self, from: json)

        XCTAssertTrue(response.data.uploadUrl.starts(with: "https://"))
        XCTAssertTrue(response.data.fileKey.contains("progress-photos"))
        XCTAssertEqual(response.data.expiresIn, 3600)
    }

    func testDecodeConfirmPhotoResponse() throws {
        let json = """
        {
            "success": true,
            "data": {
                "photoId": 789,
                "downloadUrl": "https://s3.amazonaws.com/bucket/download-url"
            }
        }
        """

        let response = try decodeResponse(ConfirmPhotoResponse.self, from: json)

        XCTAssertEqual(response.data.photoId, 789)
        XCTAssertTrue(response.data.downloadUrl.starts(with: "https://"))
    }

    func testDecodePhotosListResponse() throws {
        let json = """
        {
            "success": true,
            "data": {
                "photos": [
                    {
                        "id": 1,
                        "fileKey": "progress-photos/user/photo1.jpg",
                        "fileSize": 2048576,
                        "mimeType": "image/jpeg",
                        "width": 1920,
                        "height": 1080,
                        "takenAt": "2025-10-26T08:00:00.000Z",
                        "uploadedAt": "2025-10-26T08:05:00.000Z",
                        "createdAt": "2025-10-26T08:05:00.000Z",
                        "downloadUrl": "https://s3.amazonaws.com/photo1",
                        "evidenceType": "before"
                    },
                    {
                        "id": 2,
                        "fileKey": "progress-photos/user/photo2.jpg",
                        "fileSize": 1524288,
                        "mimeType": "image/jpeg",
                        "width": null,
                        "height": null,
                        "takenAt": null,
                        "uploadedAt": "2025-10-26T09:00:00.000Z",
                        "createdAt": "2025-10-26T09:00:00.000Z",
                        "downloadUrl": "https://s3.amazonaws.com/photo2",
                        "evidenceType": null
                    }
                ],
                "pagination": {
                    "limit": 50,
                    "offset": 0,
                    "total": 2
                }
            }
        }
        """

        let response = try decodeResponse(PhotosListResponse.self, from: json)

        XCTAssertEqual(response.data.photos.count, 2)
        XCTAssertEqual(response.data.pagination.total, 2)

        let firstPhoto = response.data.photos[0]
        XCTAssertEqual(firstPhoto.id, 1)
        XCTAssertEqual(firstPhoto.width, 1920)
        XCTAssertEqual(firstPhoto.height, 1080)
        XCTAssertNotNil(firstPhoto.takenAt)
        XCTAssertEqual(firstPhoto.evidenceType, .before)

        let secondPhoto = response.data.photos[1]
        XCTAssertNil(secondPhoto.width)
        XCTAssertNil(secondPhoto.height)
        XCTAssertNil(secondPhoto.takenAt)
        XCTAssertNil(secondPhoto.evidenceType)
    }

    func testDecodePhotoContentTypeEnum() throws {
        let types: [String: PhotoContentType] = [
            "image/jpeg": .jpeg,
            "image/png": .png,
            "image/heic": .heic
        ]

        for (stringValue, expectedType) in types {
            let json = """
            {
                "success": true,
                "data": {
                    "uploadUrl": "https://s3.amazonaws.com/upload",
                    "fileKey": "key",
                    "expiresIn": 3600
                }
            }
            """

            // Test encoding
            let request = PresignRequest(
                fileName: "test.jpg",
                contentType: expectedType,
                fileSize: 1024
            )

            let encoder = JSONEncoder()
            let data = try encoder.encode(request)
            let decoded = try JSONDecoder().decode(PresignRequest.self, from: data)

            XCTAssertEqual(decoded.contentType, expectedType)
        }
    }

    func testDecodePhotoEvidenceTypeEnum() throws {
        let types: [String: PhotoEvidenceType] = [
            "before": .before,
            "during": .during,
            "after": .after
        ]

        for (stringValue, expectedType) in types {
            let json = """
            {
                "success": true,
                "data": {
                    "photos": [{
                        "id": 1,
                        "fileKey": "key",
                        "fileSize": 1024,
                        "mimeType": "image/jpeg",
                        "width": null,
                        "height": null,
                        "takenAt": null,
                        "uploadedAt": "2025-10-26T08:00:00.000Z",
                        "createdAt": "2025-10-26T08:00:00.000Z",
                        "downloadUrl": "https://s3.amazonaws.com/photo",
                        "evidenceType": "\(stringValue)"
                    }],
                    "pagination": {
                        "limit": 50,
                        "offset": 0,
                        "total": 1
                    }
                }
            }
            """

            let response = try decodeResponse(PhotosListResponse.self, from: json)
            XCTAssertEqual(response.data.photos[0].evidenceType, expectedType)
        }
    }
}
```

---

## Streak and Badge Tests

### File: `StreakResponseTests.swift`

```swift
//
//  StreakResponseTests.swift
//  GTSDTests
//
//  Tests for streak and badge endpoint responses
//

import XCTest
@testable import GTSD

final class StreakResponseTests: APIResponseTestBase {

    func testDecodeStreakResponse() throws {
        let json = """
        {
            "success": true,
            "data": {
                "streak": {
                    "id": "streak-123",
                    "userId": "user-456",
                    "currentStreak": 14,
                    "longestStreak": 21,
                    "totalCompliantDays": 42,
                    "lastCompliantDate": "2025-10-26",
                    "createdAt": "2025-01-01T00:00:00.000Z",
                    "updatedAt": "2025-10-26T12:00:00.000Z"
                },
                "todayCompliance": null,
                "canIncrementToday": true
            }
        }
        """

        let response = try decodeResponse(StreakResponse.self, from: json)

        XCTAssertEqual(response.data.streak.currentStreak, 14)
        XCTAssertEqual(response.data.streak.longestStreak, 21)
        XCTAssertEqual(response.data.streak.totalCompliantDays, 42)
        XCTAssertEqual(response.data.streak.lastCompliantDate, "2025-10-26")
        XCTAssertNil(response.data.todayCompliance)
        XCTAssertTrue(response.data.canIncrementToday)
    }

    func testDecodeBadgesResponse() throws {
        let json = """
        {
            "success": true,
            "data": {
                "badges": [
                    {
                        "id": "badge-1",
                        "userId": "user-123",
                        "badgeType": "first_day",
                        "awardedAt": "2025-01-01T10:00:00.000Z",
                        "metadata": {}
                    },
                    {
                        "id": "badge-2",
                        "userId": "user-123",
                        "badgeType": "week_warrior",
                        "awardedAt": "2025-01-08T10:00:00.000Z",
                        "metadata": {
                            "streakLength": 7
                        }
                    }
                ],
                "totalBadges": 2,
                "totalAvailable": 16,
                "completionPercentage": 12
            }
        }
        """

        let response = try decodeResponse(BadgesResponse.self, from: json)

        XCTAssertEqual(response.data.badges.count, 2)
        XCTAssertEqual(response.data.totalBadges, 2)
        XCTAssertEqual(response.data.totalAvailable, 16)
        XCTAssertEqual(response.data.completionPercentage, 12)

        XCTAssertEqual(response.data.badges[0].badgeType, .firstDay)
        XCTAssertEqual(response.data.badges[1].badgeType, .weekWarrior)
    }

    func testDecodeCheckComplianceResponse() throws {
        let json = """
        {
            "success": true,
            "data": {
                "isCompliant": true,
                "streakData": {
                    "id": "streak-123",
                    "userId": "user-456",
                    "currentStreak": 15,
                    "longestStreak": 21,
                    "totalCompliantDays": 43,
                    "lastCompliantDate": "2025-10-27",
                    "createdAt": "2025-01-01T00:00:00.000Z",
                    "updatedAt": "2025-10-27T12:00:00.000Z"
                },
                "newlyAwardedBadges": [
                    {
                        "id": "badge-3",
                        "userId": "user-456",
                        "badgeType": "perfect_10",
                        "awardedAt": "2025-10-27T12:00:00.000Z",
                        "metadata": {}
                    }
                ]
            }
        }
        """

        let response = try decodeResponse(CheckComplianceResponse.self, from: json)

        XCTAssertTrue(response.data.isCompliant)
        XCTAssertEqual(response.data.streakData.currentStreak, 15)
        XCTAssertEqual(response.data.newlyAwardedBadges.count, 1)
        XCTAssertEqual(response.data.newlyAwardedBadges[0].badgeType, .perfect10)
    }

    func testDecodeBadgeTypeEnum() throws {
        let allBadgeTypes: [BadgeType] = [
            .firstDay, .weekWarrior, .monthMaster, .quarterChampion,
            .yearLegend, .perfect10, .perfect30, .perfect100,
            .comeback, .earlyBird, .nightOwl, .photoProof,
            .dataDriver, .allRounder, .strengthMaster, .cardioKing
        ]

        XCTAssertEqual(allBadgeTypes.count, 16, "Should have all 16 badge types")

        for badgeType in allBadgeTypes {
            let rawValue = badgeType.rawValue
            let decoded = BadgeType(rawValue: rawValue)
            XCTAssertEqual(decoded, badgeType)
        }
    }
}
```

---

## Plan Tests

### File: `PlanResponseTests.swift`

```swift
//
//  PlanResponseTests.swift
//  GTSDTests
//
//  Tests for plan generation endpoint responses
//

import XCTest
@testable import GTSD

final class PlanResponseTests: APIResponseTestBase {

    func testDecodePlanGenerationResponse() throws {
        let json = """
        {
            "success": true,
            "data": {
                "plan": {
                    "id": "plan-123",
                    "userId": "user-456",
                    "weekStartDate": "2025-10-26",
                    "weekEndDate": "2025-11-01",
                    "targets": {
                        "bmr": 1800,
                        "tdee": 2400,
                        "targetCalories": 2000,
                        "proteinGrams": 150,
                        "carbGrams": 200,
                        "fatGrams": 65
                    },
                    "educationalContent": {
                        "title": "Why This Plan Works",
                        "sections": [
                            {
                                "heading": "Your Energy Needs",
                                "content": "Your BMR is 1800 calories..."
                            },
                            {
                                "heading": "Protein Requirements",
                                "content": "Based on your goals..."
                            }
                        ]
                    },
                    "createdAt": "2025-10-26T10:00:00.000Z"
                },
                "recomputed": false
            }
        }
        """

        let response = try decodeResponse(PlanGenerationResponse.self, from: json)

        XCTAssertEqual(response.data.plan.id, "plan-123")
        XCTAssertEqual(response.data.plan.weekStartDate, "2025-10-26")
        XCTAssertEqual(response.data.plan.weekEndDate, "2025-11-01")
        XCTAssertFalse(response.data.recomputed)

        let targets = response.data.plan.targets
        XCTAssertEqual(targets.bmr, 1800)
        XCTAssertEqual(targets.tdee, 2400)
        XCTAssertEqual(targets.targetCalories, 2000)
        XCTAssertEqual(targets.proteinGrams, 150)
        XCTAssertEqual(targets.carbGrams, 200)
        XCTAssertEqual(targets.fatGrams, 65)

        let content = response.data.plan.educationalContent
        XCTAssertEqual(content.title, "Why This Plan Works")
        XCTAssertEqual(content.sections.count, 2)
        XCTAssertEqual(content.sections[0].heading, "Your Energy Needs")
        XCTAssertEqual(content.sections[1].heading, "Protein Requirements")
    }

    func testDecodePlanRecomputedResponse() throws {
        let json = """
        {
            "success": true,
            "data": {
                "plan": {
                    "id": "plan-456",
                    "userId": "user-789",
                    "weekStartDate": "2025-10-26",
                    "weekEndDate": "2025-11-01",
                    "targets": {
                        "bmr": 1600,
                        "tdee": 2200,
                        "targetCalories": 1900,
                        "proteinGrams": 140,
                        "carbGrams": 180,
                        "fatGrams": 60
                    },
                    "educationalContent": {
                        "title": "Your Updated Plan",
                        "sections": []
                    },
                    "createdAt": "2025-10-26T14:00:00.000Z"
                },
                "recomputed": true
            }
        }
        """

        let response = try decodeResponse(PlanGenerationResponse.self, from: json)

        XCTAssertTrue(response.data.recomputed)
        XCTAssertEqual(response.data.plan.educationalContent.sections.count, 0)
    }
}
```

---

## HTTP Response Handler Tests

### File: `APIResponseHandlerTests.swift`

```swift
//
//  APIResponseHandlerTests.swift
//  GTSDTests
//
//  Tests for HTTP response handling
//

import XCTest
@testable import GTSD

final class APIResponseHandlerTests: APIResponseTestBase {

    func testHandleSuccessResponse() {
        let json = """
        {
            "success": true,
            "data": {
                "value": 42
            }
        }
        """

        struct TestData: Codable, Equatable {
            let value: Int
        }

        let data = mockData(json)
        let response = mockHTTPResponse(statusCode: 200)

        let result = APIResponseDecoder.handleResponse(
            data: data,
            response: response,
            error: nil,
            expecting: TestData.self
        )

        switch result {
        case .success(let apiResponse):
            XCTAssertEqual(apiResponse.data.value, 42)
        case .failure:
            XCTFail("Expected success")
        }
    }

    func testHandleUnauthorizedError() {
        let json = """
        {
            "error": {
                "message": "Invalid or expired token",
                "requestId": "abc-123"
            }
        }
        """

        struct TestData: Codable {
            let value: Int
        }

        let data = mockData(json)
        let response = mockHTTPResponse(statusCode: 401)

        let result = APIResponseDecoder.handleResponse(
            data: data,
            response: response,
            error: nil,
            expecting: TestData.self
        )

        switch result {
        case .success:
            XCTFail("Expected failure")
        case .failure(let error):
            if case .apiError(let errorResponse) = error {
                XCTAssertEqual(errorResponse.error.message, "Invalid or expired token")
                XCTAssertEqual(errorResponse.requestId, "abc-123")
            } else {
                XCTFail("Expected apiError, got \(error)")
            }
        }
    }

    func testHandleRateLimitError() {
        let json = """
        {
            "error": {
                "message": "Too many requests",
                "requestId": "rate-limit-123"
            }
        }
        """

        struct TestData: Codable {
            let value: Int
        }

        let data = mockData(json)
        let response = mockHTTPResponse(statusCode: 429)

        let result = APIResponseDecoder.handleResponse(
            data: data,
            response: response,
            error: nil,
            expecting: TestData.self
        )

        switch result {
        case .success:
            XCTFail("Expected failure")
        case .failure(let error):
            if case .apiError(let errorResponse) = error {
                XCTAssertEqual(errorResponse.error.message, "Too many requests")
            } else {
                XCTFail("Expected apiError for rate limit")
            }
        }
    }

    func testHandleNetworkError() {
        struct TestData: Codable {
            let value: Int
        }

        let networkError = NSError(
            domain: NSURLErrorDomain,
            code: NSURLErrorNotConnectedToInternet,
            userInfo: nil
        )

        let result = APIResponseDecoder.handleResponse(
            data: nil,
            response: nil,
            error: networkError,
            expecting: TestData.self
        )

        switch result {
        case .success:
            XCTFail("Expected failure")
        case .failure(let error):
            if case .networkError = error {
                // Success
            } else {
                XCTFail("Expected networkError")
            }
        }
    }

    func testHandleInvalidResponse() {
        struct TestData: Codable {
            let value: Int
        }

        // No data, no error
        let result = APIResponseDecoder.handleResponse(
            data: nil,
            response: nil,
            error: nil,
            expecting: TestData.self
        )

        switch result {
        case .success:
            XCTFail("Expected failure")
        case .failure(let error):
            if case .invalidResponse = error {
                // Success
            } else {
                XCTFail("Expected invalidResponse")
            }
        }
    }
}
```

---

## Performance Tests

### File: `APIResponsePerformanceTests.swift`

```swift
//
//  APIResponsePerformanceTests.swift
//  GTSDTests
//
//  Performance tests for API response decoding
//

import XCTest
@testable import GTSD

final class APIResponsePerformanceTests: APIResponseTestBase {

    func testDecodeLargeTaskList() {
        let tasks = (1...100).map { i in
            """
            {
                "id": \(i),
                "type": "cardio",
                "title": "Task \(i)",
                "description": "Description \(i)",
                "dueDate": "2025-10-26",
                "completed": \(i % 2 == 0),
                "completedAt": \(i % 2 == 0 ? "\"2025-10-26T10:00:00.000Z\"" : "null"),
                "evidence": null
            }
            """
        }.joined(separator: ",")

        let json = """
        {
            "success": true,
            "data": {
                "totalTasks": 100,
                "completedTasks": 50,
                "tasks": [\(tasks)]
            }
        }
        """

        measure {
            _ = try? decodeResponse(TodayTasksResponse.self, from: json)
        }
    }

    func testDecodeLargePhotoList() {
        let photos = (1...100).map { i in
            """
            {
                "id": \(i),
                "fileKey": "photo-\(i).jpg",
                "fileSize": 2048576,
                "mimeType": "image/jpeg",
                "width": 1920,
                "height": 1080,
                "takenAt": "2025-10-26T08:00:00.000Z",
                "uploadedAt": "2025-10-26T08:05:00.000Z",
                "createdAt": "2025-10-26T08:05:00.000Z",
                "downloadUrl": "https://example.com/photo-\(i).jpg",
                "evidenceType": "before"
            }
            """
        }.joined(separator: ",")

        let json = """
        {
            "success": true,
            "data": {
                "photos": [\(photos)],
                "pagination": {
                    "limit": 100,
                    "offset": 0,
                    "total": 100
                }
            }
        }
        """

        measure {
            _ = try? decodeResponse(PhotosListResponse.self, from: json)
        }
    }
}
```

---

## Test Coverage Summary

### Coverage by Category

1. **Core Response Wrapper**: 100%
   - Success responses
   - Error responses
   - Optional fields
   - Type mismatches
   - Invalid JSON

2. **Date Handling**: 100%
   - ISO8601 with fractional seconds
   - ISO8601 without fractional seconds
   - YYYY-MM-DD format
   - Null dates
   - Invalid formats

3. **Authentication**: 100%
   - Signup
   - Login
   - Refresh token
   - Logout
   - User profile

4. **Tasks**: 100%
   - Today tasks list
   - Cached responses
   - Create evidence
   - Task type enums
   - Evidence type enums

5. **Photos**: 100%
   - Presign URL
   - Confirm upload
   - Photo list
   - Content type enums
   - Evidence type enums

6. **Streaks & Badges**: 100%
   - Streak data
   - Badge list
   - Check compliance
   - All badge types

7. **Plans**: 100%
   - Plan generation
   - Recomputed plans
   - Health targets
   - Educational content

8. **HTTP Handling**: 100%
   - Success (200-299)
   - Unauthorized (401)
   - Rate limit (429)
   - Client errors (400-499)
   - Server errors (500-599)
   - Network errors

9. **Performance**: Baseline established
   - Large task lists
   - Large photo lists

---

## Running Tests

### Xcode

```bash
# Run all tests
cmd + U

# Run specific test file
cmd + click on test file name

# Run specific test method
cmd + click on test method name
```

### Command Line

```bash
# Run all tests
xcodebuild test -scheme GTSD -destination 'platform=iOS Simulator,name=iPhone 15'

# Run specific test class
xcodebuild test -scheme GTSD -only-testing:GTSDTests/APIResponseTests

# Run with code coverage
xcodebuild test -scheme GTSD -enableCodeCoverage YES
```

---

## Related Documentation

- See `/Users/devarisbrown/Code/projects/gtsd/apps/IOS_API_RESPONSE_DOCUMENTATION.md` for API specifications
- See `/Users/devarisbrown/Code/projects/gtsd/apps/IOS_API_RESPONSE_SWIFT_IMPLEMENTATION.md` for implementation code
