//
//  MetricsServiceTests.swift
//  GTSDTests
//
//  Created by Claude on 2025-10-28.
//  Comprehensive tests for MetricsService
//

import XCTest
@testable import GTSD

@MainActor
final class MetricsServiceTests: XCTestCase {

    // MARK: - Properties

    var mockAPIClient: MockMetricsAPIClient!
    var metricsService: MetricsService!

    // MARK: - Setup & Teardown

    override func setUp() {
        super.setUp()
        mockAPIClient = MockMetricsAPIClient()
        metricsService = MetricsService(apiClient: mockAPIClient)
    }

    override func tearDown() {
        metricsService = nil
        mockAPIClient = nil
        super.tearDown()
    }

    // MARK: - Get Today Metrics Tests

    func testGetTodayMetrics_Success_ReturnsMetricsData() async throws {
        // Arrange
        let expectedData = MetricsFixtures.unacknowledgedSummaryData
        let response = MetricsSummaryResponse(success: true, data: expectedData)
        mockAPIClient.mockResponse = response

        // Act
        let result = try await metricsService.getTodayMetrics()

        // Assert
        XCTAssertEqual(result.metrics.bmi, 24.5, "BMI should match")
        XCTAssertEqual(result.metrics.bmr, 1650, "BMR should match")
        XCTAssertEqual(result.metrics.tdee, 2475, "TDEE should match")
        XCTAssertFalse(result.acknowledged, "Should not be acknowledged")
        XCTAssertEqual(mockAPIClient.requestCallCount, 1, "Should make one API call")
    }

    func testGetTodayMetrics_Success_CallsCorrectEndpoint() async throws {
        // Arrange
        let response = MetricsSummaryResponse(
            success: true,
            data: MetricsFixtures.unacknowledgedSummaryData
        )
        mockAPIClient.mockResponse = response

        // Act
        _ = try await metricsService.getTodayMetrics()

        // Assert
        XCTAssertEqual(mockAPIClient.requestCallCount, 1, "Should call API once")

        // Verify correct endpoint was called
        if let lastEndpoint = mockAPIClient.lastEndpoint {
            XCTAssertEqual(lastEndpoint.path, "/v1/profile/metrics/today", "Should call correct path")
            XCTAssertEqual(lastEndpoint.method, .get, "Should use GET method")
        } else {
            XCTFail("No endpoint was called")
        }
    }

    func testGetTodayMetrics_SuccessFalse_ThrowsInvalidResponse() async {
        // Arrange: Response with success=false
        let response = MetricsSummaryResponse(
            success: false,
            data: MetricsFixtures.unacknowledgedSummaryData
        )
        mockAPIClient.mockResponse = response

        // Act & Assert
        do {
            _ = try await metricsService.getTodayMetrics()
            XCTFail("Should throw error when success is false")
        } catch let error as MetricsError {
            if case .invalidResponse = error {
                // Success: correct error thrown
            } else {
                XCTFail("Should throw .invalidResponse error, got: \(error)")
            }
        } catch {
            XCTFail("Should throw MetricsError, got: \(error)")
        }
    }

    func testGetTodayMetrics_NetworkError_ThrowsNetworkError() async {
        // Arrange
        let networkError = NSError(domain: NSURLErrorDomain, code: NSURLErrorNotConnectedToInternet)
        mockAPIClient.mockError = APIError.networkError(networkError)

        // Act & Assert
        do {
            _ = try await metricsService.getTodayMetrics()
            XCTFail("Should throw error on network failure")
        } catch let error as MetricsError {
            if case .networkError = error {
                // Success: correct error thrown
            } else {
                XCTFail("Should throw .networkError, got: \(error)")
            }
        } catch {
            XCTFail("Should throw MetricsError, got: \(error)")
        }
    }

    func testGetTodayMetrics_404Error_ThrowsNotFound() async {
        // Arrange
        mockAPIClient.mockError = APIError.httpError(statusCode: 404, message: "Metrics not found")

        // Act & Assert
        do {
            _ = try await metricsService.getTodayMetrics()
            XCTFail("Should throw error on 404")
        } catch let error as MetricsError {
            if case .notFound = error {
                // Success: correct error thrown
            } else {
                XCTFail("Should throw .notFound for 404, got: \(error)")
            }
        } catch {
            XCTFail("Should throw MetricsError, got: \(error)")
        }
    }

    func testGetTodayMetrics_500Error_ThrowsServerError() async {
        // Arrange
        mockAPIClient.mockError = APIError.httpError(statusCode: 500, message: "Internal server error")

        // Act & Assert
        do {
            _ = try await metricsService.getTodayMetrics()
            XCTFail("Should throw error on 500")
        } catch let error as MetricsError {
            if case .serverError(let message) = error {
                XCTAssertEqual(message, "Internal server error", "Error message should match")
            } else {
                XCTFail("Should throw .serverError for 500, got: \(error)")
            }
        } catch {
            XCTFail("Should throw MetricsError, got: \(error)")
        }
    }

    func testGetTodayMetrics_DecodingError_ThrowsInvalidResponse() async {
        // Arrange
        mockAPIClient.mockError = APIError.decodingError(NSError(domain: "test", code: -1))

        // Act & Assert
        do {
            _ = try await metricsService.getTodayMetrics()
            XCTFail("Should throw error on decoding failure")
        } catch let error as MetricsError {
            if case .invalidResponse = error {
                // Success: correct error thrown
            } else {
                XCTFail("Should throw .invalidResponse for decoding error, got: \(error)")
            }
        } catch {
            XCTFail("Should throw MetricsError, got: \(error)")
        }
    }

    // MARK: - Acknowledge Metrics Tests

    func testAcknowledgeMetrics_Success_ReturnsResponse() async throws {
        // Arrange
        let expectedResponse = MetricsFixtures.successfulAcknowledgeResponse
        mockAPIClient.mockResponse = expectedResponse
        let testDate = MetricsFixtures.fixedDate

        // Act
        let result = try await metricsService.acknowledgeMetrics(version: 1, metricsComputedAt: testDate)

        // Assert
        XCTAssertTrue(result.success, "Response should be successful")
        XCTAssertTrue(result.data.acknowledged, "Should be acknowledged")
        XCTAssertNotNil(result.data.acknowledgement, "Acknowledgement should be present")
        XCTAssertEqual(mockAPIClient.requestCallCount, 1, "Should make one API call")
    }

    func testAcknowledgeMetrics_CallsCorrectEndpoint() async throws {
        // Arrange
        mockAPIClient.mockResponse = MetricsFixtures.successfulAcknowledgeResponse
        let testDate = MetricsFixtures.fixedDate

        // Act
        _ = try await metricsService.acknowledgeMetrics(version: 5, metricsComputedAt: testDate)

        // Assert
        if let lastEndpoint = mockAPIClient.lastEndpoint {
            XCTAssertEqual(lastEndpoint.path, "/v1/profile/metrics/acknowledge", "Should call correct path")
            XCTAssertEqual(lastEndpoint.method, .post, "Should use POST method")
        } else {
            XCTFail("No endpoint was called")
        }
    }

    func testAcknowledgeMetrics_SendsCorrectRequestBody() async throws {
        // Arrange
        mockAPIClient.mockResponse = MetricsFixtures.successfulAcknowledgeResponse
        let testDate = MetricsFixtures.fixedDate
        let version = 3

        // Act
        _ = try await metricsService.acknowledgeMetrics(version: version, metricsComputedAt: testDate)

        // Assert
        XCTAssertNotNil(mockAPIClient.lastRequestBody, "Request body should be sent")

        // Decode and verify body
        if let bodyData = mockAPIClient.lastRequestBody {
            let decoder = JSONDecoder()
            decoder.dateDecodingStrategy = .iso8601
            let request = try decoder.decode(AcknowledgeMetricsRequest.self, from: bodyData)

            XCTAssertEqual(request.version, version, "Version should match")

            // Note: Date comparison might have precision issues with ISO8601
            let timeDiff = abs(request.metricsComputedAt.timeIntervalSince(testDate))
            XCTAssertLessThan(timeDiff, 1.0, "Date should match within 1 second")
        }
    }

    func testAcknowledgeMetrics_SuccessFalse_ThrowsInvalidResponse() async {
        // Arrange
        let response = AcknowledgeResponse(
            success: false,
            data: AcknowledgeResponseData(
                acknowledged: false,
                acknowledgement: MetricsFixtures.validAcknowledgement
            )
        )
        mockAPIClient.mockResponse = response

        // Act & Assert
        do {
            _ = try await metricsService.acknowledgeMetrics(version: 1, metricsComputedAt: Date())
            XCTFail("Should throw error when success is false")
        } catch let error as MetricsError {
            if case .invalidResponse = error {
                // Success: correct error thrown
            } else {
                XCTFail("Should throw .invalidResponse, got: \(error)")
            }
        } catch {
            XCTFail("Should throw MetricsError, got: \(error)")
        }
    }

    func testAcknowledgeMetrics_NetworkError_ThrowsNetworkError() async {
        // Arrange
        let networkError = NSError(domain: NSURLErrorDomain, code: NSURLErrorTimedOut)
        mockAPIClient.mockError = APIError.networkError(networkError)

        // Act & Assert
        do {
            _ = try await metricsService.acknowledgeMetrics(version: 1, metricsComputedAt: Date())
            XCTFail("Should throw error on network failure")
        } catch let error as MetricsError {
            if case .networkError = error {
                // Success
            } else {
                XCTFail("Should throw .networkError, got: \(error)")
            }
        } catch {
            XCTFail("Should throw MetricsError, got: \(error)")
        }
    }

    func testAcknowledgeMetrics_409Error_ThrowsAlreadyAcknowledged() async {
        // Arrange
        mockAPIClient.mockError = APIError.httpError(statusCode: 409, message: "Already acknowledged")

        // Act & Assert
        do {
            _ = try await metricsService.acknowledgeMetrics(version: 1, metricsComputedAt: Date())
            XCTFail("Should throw error on 409")
        } catch let error as MetricsError {
            if case .alreadyAcknowledged = error {
                // Success: correct error thrown
            } else {
                XCTFail("Should throw .alreadyAcknowledged for 409, got: \(error)")
            }
        } catch {
            XCTFail("Should throw MetricsError, got: \(error)")
        }
    }

    // MARK: - Check For New Metrics Tests

    func testCheckForNewMetrics_NoLastComputedAt_ReturnsTrue() async throws {
        // Arrange
        mockAPIClient.mockResponse = MetricsSummaryResponse(
            success: true,
            data: MetricsFixtures.unacknowledgedSummaryData
        )

        // Act
        let hasNew = try await metricsService.checkForNewMetrics(lastComputedAt: nil)

        // Assert
        XCTAssertTrue(hasNew, "Should return true when no previous timestamp")
    }

    func testCheckForNewMetrics_NewerMetricsAvailable_ReturnsTrue() async throws {
        // Arrange
        let oldDate = Date(timeIntervalSince1970: 1698768000) // Old date
        let newMetrics = MetricsFixtures.createMetrics()
        let newData = MetricsFixtures.createSummaryData(metrics: newMetrics)

        mockAPIClient.mockResponse = MetricsSummaryResponse(success: true, data: newData)

        // Act
        let hasNew = try await metricsService.checkForNewMetrics(lastComputedAt: oldDate)

        // Assert
        XCTAssertTrue(hasNew, "Should return true when newer metrics available")
    }

    func testCheckForNewMetrics_NoNewerMetrics_ReturnsFalse() async throws {
        // Arrange
        let futureDate = Date(timeIntervalSinceNow: 3600) // 1 hour in future

        mockAPIClient.mockResponse = MetricsSummaryResponse(
            success: true,
            data: MetricsFixtures.unacknowledgedSummaryData
        )

        // Act
        let hasNew = try await metricsService.checkForNewMetrics(lastComputedAt: futureDate)

        // Assert
        XCTAssertFalse(hasNew, "Should return false when no newer metrics")
    }

    func testCheckForNewMetrics_NotFoundError_ReturnsFalse() async throws {
        // Arrange
        mockAPIClient.mockError = APIError.httpError(statusCode: 404, message: "Not found")

        // Act
        let hasNew = try await metricsService.checkForNewMetrics(lastComputedAt: Date())

        // Assert
        XCTAssertFalse(hasNew, "Should return false when metrics not found")
    }

    func testCheckForNewMetrics_NetworkError_ReturnsFalse() async throws {
        // Arrange
        mockAPIClient.mockError = APIError.networkError(NSError(domain: "test", code: -1))

        // Act
        let hasNew = try await metricsService.checkForNewMetrics(lastComputedAt: Date())

        // Assert
        XCTAssertFalse(hasNew, "Should return false on network error (background check)")
    }

    func testCheckForNewMetrics_DoesNotThrowOnError() async {
        // Arrange
        mockAPIClient.mockError = APIError.networkError(NSError(domain: "test", code: -1))

        // Act & Assert: Should not throw
        do {
            let hasNew = try await metricsService.checkForNewMetrics(lastComputedAt: Date())
            XCTAssertFalse(hasNew, "Should return false instead of throwing")
        } catch {
            XCTFail("checkForNewMetrics should not throw errors, got: \(error)")
        }
    }

    // MARK: - Date Encoding Tests

    func testAcknowledgeMetrics_DateEncodedAsISO8601() async throws {
        // Arrange
        mockAPIClient.mockResponse = MetricsFixtures.successfulAcknowledgeResponse
        let testDate = Date(timeIntervalSince1970: 1698768000) // Fixed date for testing

        // Act
        _ = try await metricsService.acknowledgeMetrics(version: 1, metricsComputedAt: testDate)

        // Assert
        XCTAssertNotNil(mockAPIClient.lastRequestBody, "Should have request body")

        if let bodyData = mockAPIClient.lastRequestBody {
            let bodyString = String(data: bodyData, encoding: .utf8)!

            // Verify ISO8601 format is used
            XCTAssertTrue(bodyString.contains("metricsComputedAt"), "Should contain metricsComputedAt field")
            XCTAssertTrue(bodyString.contains("2023-10-31"), "Should use ISO8601 date format")
        }
    }
}

// MARK: - Mock API Client for Metrics Service

/// Mock API client specifically for testing MetricsService
@MainActor
final class MockMetricsAPIClient: APIClientProtocol {
    var isLoading: Bool = false
    var mockResponse: Any?
    var mockError: Error?
    var requestCallCount = 0
    var lastEndpoint: APIEndpoint?
    var lastRequestBody: Data?

    func request<T: Codable & Sendable>(_ endpoint: APIEndpoint) async throws -> T {
        requestCallCount += 1
        lastEndpoint = endpoint

        // Capture request body if present
        lastRequestBody = try endpoint.body()

        if let error = mockError {
            throw error
        }

        guard let response = mockResponse as? T else {
            throw APIError.invalidResponse
        }

        return response
    }

    func requestVoid(_ endpoint: APIEndpoint) async throws {
        requestCallCount += 1
        lastEndpoint = endpoint

        if let error = mockError {
            throw error
        }
    }

    func uploadMultipart<T: Codable & Sendable>(
        _ endpoint: APIEndpoint,
        imageData: Data,
        fileName: String,
        mimeType: String
    ) async throws -> T {
        throw APIError.invalidResponse
    }

    func setAuthToken(_ token: String?) {}
    func getAuthToken() -> String? { return nil }
}
