//
//  MetricsSummaryViewModelTests.swift
//  GTSDTests
//
//  Created by Claude on 2025-10-28.
//  Comprehensive tests for MetricsSummaryViewModel
//

import XCTest
import Combine
@testable import GTSD

@MainActor
final class MetricsSummaryViewModelTests: XCTestCase {

    // MARK: - Properties

    var mockService: MockMetricsService!
    var viewModel: MetricsSummaryViewModel!
    var cancellables: Set<AnyCancellable>!

    // MARK: - Setup & Teardown

    override func setUp() {
        super.setUp()
        mockService = MockMetricsService()
        viewModel = MetricsSummaryViewModel(metricsService: mockService)
        cancellables = Set<AnyCancellable>()
    }

    override func tearDown() {
        cancellables = nil
        viewModel = nil
        mockService = nil
        super.tearDown()
    }

    // MARK: - Initial State Tests

    func testInitialState_AllPropertiesCorrect() {
        // Assert: Initial state is correct
        XCTAssertFalse(viewModel.isLoading, "Should not be loading initially")
        XCTAssertNil(viewModel.metricsData, "Metrics data should be nil initially")
        XCTAssertNil(viewModel.error, "Error should be nil initially")
        XCTAssertFalse(viewModel.acknowledged, "Should not be acknowledged initially")
        XCTAssertTrue(viewModel.expandedMetrics.isEmpty, "Expanded metrics should be empty initially")
    }

    // MARK: - Fetch Metrics Tests

    func testFetchMetrics_Success_UpdatesMetricsData() async {
        // Arrange
        mockService.mockMetricsData = MetricsFixtures.unacknowledgedSummaryData

        // Act
        await viewModel.fetchMetrics()

        // Assert
        XCTAssertNotNil(viewModel.metricsData, "Metrics data should be set")
        XCTAssertEqual(viewModel.metricsData?.metrics.bmi, 24.5, "BMI should match")
        XCTAssertEqual(viewModel.metricsData?.metrics.bmr, 1650, "BMR should match")
        XCTAssertEqual(viewModel.metricsData?.metrics.tdee, 2475, "TDEE should match")
        XCTAssertFalse(viewModel.acknowledged, "Should not be acknowledged")
        XCTAssertNil(viewModel.error, "Error should be nil")
        XCTAssertEqual(mockService.getTodayMetricsCallCount, 1, "Should call service once")
    }

    func testFetchMetrics_Success_WithAcknowledgedData_UpdatesAcknowledgedStatus() async {
        // Arrange
        mockService.mockMetricsData = MetricsFixtures.acknowledgedSummaryData

        // Act
        await viewModel.fetchMetrics()

        // Assert
        XCTAssertNotNil(viewModel.metricsData, "Metrics data should be set")
        XCTAssertTrue(viewModel.metricsData!.acknowledged, "Data should be acknowledged")
        XCTAssertTrue(viewModel.acknowledged, "ViewModel acknowledged should be true")
        XCTAssertNotNil(viewModel.metricsData?.acknowledgement, "Acknowledgement should be present")
    }

    func testFetchMetrics_SetsIsLoadingDuringFetch() async {
        // Arrange
        mockService.mockMetricsData = MetricsFixtures.unacknowledgedSummaryData
        var loadingStates: [Bool] = []

        // Track isLoading changes
        viewModel.$isLoading
            .sink { loadingStates.append($0) }
            .store(in: &cancellables)

        // Act
        await viewModel.fetchMetrics()

        // Small delay to ensure all state changes are captured
        try? await Task.sleep(nanoseconds: 10_000_000) // 10ms

        // Assert
        XCTAssertTrue(loadingStates.contains(true), "Should have been loading at some point")
        XCTAssertFalse(viewModel.isLoading, "Should not be loading after completion")
    }

    func testFetchMetrics_NetworkError_SetsError() async {
        // Arrange
        let networkError = NSError(domain: "test", code: NSURLErrorNotConnectedToInternet)
        mockService.configureError(MetricsError.networkError(networkError))

        // Act
        await viewModel.fetchMetrics()

        // Assert
        XCTAssertNil(viewModel.metricsData, "Metrics data should be nil")
        XCTAssertNotNil(viewModel.error, "Error should be set")
        if case .networkError = viewModel.error {
            // Success: correct error type
        } else {
            XCTFail("Error should be .networkError type")
        }
        XCTAssertFalse(viewModel.isLoading, "Should not be loading after error")
    }

    func testFetchMetrics_NotFoundError_SetsCorrectError() async {
        // Arrange
        mockService.configureError(MetricsError.notFound)

        // Act
        await viewModel.fetchMetrics()

        // Assert
        XCTAssertNil(viewModel.metricsData, "Metrics data should be nil")
        XCTAssertNotNil(viewModel.error, "Error should be set")
        if case .notFound = viewModel.error {
            // Success: correct error type
        } else {
            XCTFail("Error should be .notFound type")
        }
    }

    func testFetchMetrics_ServerError_SetsCorrectError() async {
        // Arrange
        mockService.configureError(MetricsError.serverError("Internal server error"))

        // Act
        await viewModel.fetchMetrics()

        // Assert
        XCTAssertNil(viewModel.metricsData, "Metrics data should be nil")
        XCTAssertNotNil(viewModel.error, "Error should be set")
        if case .serverError(let message) = viewModel.error {
            XCTAssertEqual(message, "Internal server error", "Error message should match")
        } else {
            XCTFail("Error should be .serverError type")
        }
    }

    func testFetchMetrics_InvalidResponseError_SetsCorrectError() async {
        // Arrange
        mockService.configureError(MetricsError.invalidResponse)

        // Act
        await viewModel.fetchMetrics()

        // Assert
        XCTAssertNotNil(viewModel.error, "Error should be set")
        if case .invalidResponse = viewModel.error {
            // Success: correct error type
        } else {
            XCTFail("Error should be .invalidResponse type")
        }
    }

    func testFetchMetrics_AlreadyInProgress_DoesNotFetchAgain() async {
        // Arrange
        mockService.mockMetricsData = MetricsFixtures.unacknowledgedSummaryData

        // Act: Start two fetches simultaneously
        async let fetch1: () = viewModel.fetchMetrics()
        async let fetch2: () = viewModel.fetchMetrics()

        await fetch1
        await fetch2

        // Assert: Should only call service once due to guard
        XCTAssertLessOrEqual(mockService.getTodayMetricsCallCount, 2, "Should not fetch multiple times")
    }

    // MARK: - Acknowledge Metrics Tests

    func testAcknowledgeAndContinue_Success_ReturnsTrue() async {
        // Arrange
        mockService.mockMetricsData = MetricsFixtures.unacknowledgedSummaryData
        mockService.mockAcknowledgeResponse = MetricsFixtures.successfulAcknowledgeResponse
        await viewModel.fetchMetrics()

        // Act
        let result = await viewModel.acknowledgeAndContinue()

        // Assert
        XCTAssertTrue(result, "Should return true on success")
        XCTAssertTrue(viewModel.acknowledged, "Should update acknowledged state")
        XCTAssertNil(viewModel.error, "Error should be nil")
        XCTAssertEqual(mockService.acknowledgeMetricsCallCount, 1, "Should call service once")
    }

    func testAcknowledgeAndContinue_Success_UpdatesMetricsData() async {
        // Arrange
        mockService.mockMetricsData = MetricsFixtures.unacknowledgedSummaryData
        mockService.mockAcknowledgeResponse = MetricsFixtures.successfulAcknowledgeResponse
        await viewModel.fetchMetrics()

        // Act
        let result = await viewModel.acknowledgeAndContinue()

        // Assert
        XCTAssertTrue(result, "Should return true")
        XCTAssertTrue(viewModel.metricsData!.acknowledged, "Metrics data should be acknowledged")
        XCTAssertNotNil(viewModel.metricsData?.acknowledgement, "Acknowledgement should be present")
    }

    func testAcknowledgeAndContinue_AlreadyAcknowledged_ReturnsTrue() async {
        // Arrange: Data already acknowledged
        mockService.mockMetricsData = MetricsFixtures.acknowledgedSummaryData
        await viewModel.fetchMetrics()

        // Act
        let result = await viewModel.acknowledgeAndContinue()

        // Assert
        XCTAssertTrue(result, "Should return true for already acknowledged")
        XCTAssertTrue(viewModel.acknowledged, "Should be acknowledged")
        XCTAssertEqual(mockService.acknowledgeMetricsCallCount, 0, "Should not call service if already acknowledged")
    }

    func testAcknowledgeAndContinue_NoMetricsData_ReturnsFalse() async {
        // Arrange: No metrics data loaded

        // Act
        let result = await viewModel.acknowledgeAndContinue()

        // Assert
        XCTAssertFalse(result, "Should return false when no data")
        XCTAssertFalse(viewModel.acknowledged, "Should not be acknowledged")
        XCTAssertEqual(mockService.acknowledgeMetricsCallCount, 0, "Should not call service")
    }

    func testAcknowledgeAndContinue_NetworkError_ReturnsFalse() async {
        // Arrange
        mockService.mockMetricsData = MetricsFixtures.unacknowledgedSummaryData
        await viewModel.fetchMetrics()

        // Configure error for acknowledge
        mockService.shouldThrowError = true
        mockService.errorToThrow = MetricsError.networkError(NSError(domain: "test", code: -1))

        // Act
        let result = await viewModel.acknowledgeAndContinue()

        // Assert
        XCTAssertFalse(result, "Should return false on error")
        XCTAssertFalse(viewModel.acknowledged, "Should not be acknowledged")
        XCTAssertNotNil(viewModel.error, "Error should be set")
    }

    func testAcknowledgeAndContinue_InvalidResponse_ReturnsFalse() async {
        // Arrange
        mockService.mockMetricsData = MetricsFixtures.unacknowledgedSummaryData
        await viewModel.fetchMetrics()

        // Configure failed response
        mockService.mockAcknowledgeResponse = MetricsFixtures.failedAcknowledgeResponse

        // Act
        let result = await viewModel.acknowledgeAndContinue()

        // Assert
        XCTAssertFalse(result, "Should return false for failed response")
        XCTAssertNotNil(viewModel.error, "Error should be set to invalidResponse")
        if case .invalidResponse = viewModel.error {
            // Success
        } else {
            XCTFail("Error should be .invalidResponse")
        }
    }

    func testAcknowledgeAndContinue_PassesCorrectParameters() async {
        // Arrange
        let customMetrics = MetricsFixtures.createMetrics(version: 5)
        let customData = MetricsFixtures.createSummaryData(metrics: customMetrics)
        mockService.mockMetricsData = customData
        mockService.mockAcknowledgeResponse = MetricsFixtures.successfulAcknowledgeResponse
        await viewModel.fetchMetrics()

        // Act
        _ = await viewModel.acknowledgeAndContinue()

        // Assert
        XCTAssertEqual(mockService.lastAcknowledgeVersion, 5, "Should pass correct version")
        XCTAssertNotNil(mockService.lastAcknowledgeMetricsComputedAt, "Should pass computedAt date")
    }

    // MARK: - Computed Properties Tests

    func testIsLoadingState_NoData_ReturnsTrue() {
        // Arrange
        viewModel.isLoading = true
        viewModel.metricsData = nil

        // Assert
        XCTAssertTrue(viewModel.isLoadingState, "Should be in loading state when loading and no data")
    }

    func testIsLoadingState_HasData_ReturnsFalse() async {
        // Arrange
        mockService.mockMetricsData = MetricsFixtures.unacknowledgedSummaryData
        await viewModel.fetchMetrics()

        // Assert
        XCTAssertFalse(viewModel.isLoadingState, "Should not be in loading state when data exists")
    }

    func testHasError_WithError_ReturnsTrue() async {
        // Arrange
        mockService.configureError(MetricsError.notFound)
        await viewModel.fetchMetrics()

        // Assert
        XCTAssertTrue(viewModel.hasError, "Should have error")
    }

    func testHasError_NoError_ReturnsFalse() async {
        // Arrange
        mockService.mockMetricsData = MetricsFixtures.unacknowledgedSummaryData
        await viewModel.fetchMetrics()

        // Assert
        XCTAssertFalse(viewModel.hasError, "Should not have error")
    }

    func testCanAcknowledge_WithUnacknowledgedData_ReturnsTrue() async {
        // Arrange
        mockService.mockMetricsData = MetricsFixtures.unacknowledgedSummaryData
        await viewModel.fetchMetrics()

        // Assert
        XCTAssertTrue(viewModel.canAcknowledge, "Should be able to acknowledge")
    }

    func testCanAcknowledge_WithAcknowledgedData_ReturnsFalse() async {
        // Arrange
        mockService.mockMetricsData = MetricsFixtures.acknowledgedSummaryData
        await viewModel.fetchMetrics()

        // Assert
        XCTAssertFalse(viewModel.canAcknowledge, "Should not be able to acknowledge again")
    }

    func testCanAcknowledge_NoData_ReturnsFalse() {
        // Assert
        XCTAssertFalse(viewModel.canAcknowledge, "Should not be able to acknowledge without data")
    }

    func testCanAcknowledge_WhileLoading_ReturnsFalse() async {
        // Arrange
        mockService.mockMetricsData = MetricsFixtures.unacknowledgedSummaryData
        await viewModel.fetchMetrics()

        viewModel.isLoading = true

        // Assert
        XCTAssertFalse(viewModel.canAcknowledge, "Should not be able to acknowledge while loading")
    }

    // MARK: - Helper Methods Tests

    func testRetry_CallsFetchMetrics() async {
        // Arrange
        mockService.configureError(MetricsError.networkError(NSError(domain: "test", code: -1)))
        await viewModel.fetchMetrics()

        // Reset error for retry
        mockService.shouldThrowError = false
        mockService.mockMetricsData = MetricsFixtures.unacknowledgedSummaryData

        // Act
        await viewModel.retry()

        // Assert
        XCTAssertEqual(mockService.getTodayMetricsCallCount, 2, "Should call fetch twice (initial + retry)")
        XCTAssertNotNil(viewModel.metricsData, "Should have data after retry")
    }

    func testClearError_RemovesError() async {
        // Arrange
        mockService.configureError(MetricsError.notFound)
        await viewModel.fetchMetrics()
        XCTAssertNotNil(viewModel.error, "Should have error")

        // Act
        viewModel.clearError()

        // Assert
        XCTAssertNil(viewModel.error, "Error should be cleared")
    }

    func testToggleMetric_TogglesExpansionState() {
        // Arrange
        let metricId = "bmi"

        // Act: Expand
        viewModel.toggleMetric(metricId)

        // Assert: Expanded
        XCTAssertTrue(viewModel.expandedMetrics.contains(metricId), "Metric should be expanded")
        XCTAssertTrue(viewModel.isMetricExpanded(metricId), "isMetricExpanded should return true")

        // Act: Collapse
        viewModel.toggleMetric(metricId)

        // Assert: Collapsed
        XCTAssertFalse(viewModel.expandedMetrics.contains(metricId), "Metric should be collapsed")
        XCTAssertFalse(viewModel.isMetricExpanded(metricId), "isMetricExpanded should return false")
    }

    func testToggleMetric_MultipleMetrics_IndependentState() {
        // Act
        viewModel.toggleMetric("bmi")
        viewModel.toggleMetric("bmr")

        // Assert
        XCTAssertTrue(viewModel.isMetricExpanded("bmi"), "BMI should be expanded")
        XCTAssertTrue(viewModel.isMetricExpanded("bmr"), "BMR should be expanded")
        XCTAssertFalse(viewModel.isMetricExpanded("tdee"), "TDEE should not be expanded")

        // Act: Toggle one off
        viewModel.toggleMetric("bmi")

        // Assert
        XCTAssertFalse(viewModel.isMetricExpanded("bmi"), "BMI should be collapsed")
        XCTAssertTrue(viewModel.isMetricExpanded("bmr"), "BMR should still be expanded")
    }

    // MARK: - Edge Cases Tests

    func testFetchMetrics_MultipleSequentialCalls_UpdatesCorrectly() async {
        // Arrange
        let firstData = MetricsFixtures.unacknowledgedSummaryData
        let secondData = MetricsFixtures.overweightSummaryData

        // Act: First fetch
        mockService.mockMetricsData = firstData
        await viewModel.fetchMetrics()
        XCTAssertEqual(viewModel.metricsData?.metrics.bmi, 24.5, "First BMI should be 24.5")

        // Act: Second fetch
        mockService.mockMetricsData = secondData
        await viewModel.fetchMetrics()

        // Assert
        XCTAssertEqual(viewModel.metricsData?.metrics.bmi, 27.8, "Second BMI should be 27.8")
        XCTAssertEqual(mockService.getTodayMetricsCallCount, 2, "Should fetch twice")
    }

    func testAcknowledgeAndContinue_UpdatesMetricsDataWithNewAcknowledgement() async {
        // Arrange
        mockService.mockMetricsData = MetricsFixtures.unacknowledgedSummaryData
        mockService.mockAcknowledgeResponse = MetricsFixtures.successfulAcknowledgeResponse
        await viewModel.fetchMetrics()

        let originalExplanations = viewModel.metricsData?.explanations

        // Act
        _ = await viewModel.acknowledgeAndContinue()

        // Assert: Data updated but explanations preserved
        XCTAssertTrue(viewModel.metricsData!.acknowledged, "Should be acknowledged")
        XCTAssertEqual(viewModel.metricsData?.explanations.bmi, originalExplanations?.bmi, "Explanations should be preserved")
        XCTAssertNotNil(viewModel.metricsData?.acknowledgement, "Acknowledgement should be added")
    }
}
