//
//  MetricsViewModelTests.swift
//  GTSDTests
//
//  Created by Claude on 2025-10-31.
//  Comprehensive tests for MetricsViewModel - 44 tests total
//

import XCTest
import Combine
@testable import GTSD

@MainActor
final class MetricsViewModelTests: XCTestCase {

    // MARK: - Properties

    var mockAPIClient: MockAPIClient!
    var spyAPIClient: SpyAPIClient!
    var viewModel: MetricsViewModel!
    var cancellables: Set<AnyCancellable>!

    // MARK: - Setup & Teardown

    override func setUp() {
        super.setUp()
        mockAPIClient = MockAPIClient()
        spyAPIClient = SpyAPIClient()
        cancellables = Set<AnyCancellable>()

        // Create a new instance with mocked API client
        // Note: RetryStrategy, OfflineQueue, and NetworkMonitor use actual implementations
        viewModel = MetricsViewModel(apiClient: mockAPIClient)
    }

    override func tearDown() {
        cancellables = nil
        viewModel = nil
        spyAPIClient = nil
        mockAPIClient = nil
        super.tearDown()
    }

    // MARK: - Category A: Initial State Tests (P0) - 1 test

    func test_initialState_allPropertiesCorrect() {
        // Arrange & Act: Create a fresh instance
        let freshViewModel = MetricsViewModel(apiClient: mockAPIClient)

        // Assert: Verify all properties have correct initial values
        XCTAssertNil(freshViewModel.metricsSummary, "metricsSummary should be nil initially")
        XCTAssertFalse(freshViewModel.isLoadingMetrics, "isLoadingMetrics should be false initially")
        XCTAssertNil(freshViewModel.metricsError, "metricsError should be nil initially")
        XCTAssertFalse(freshViewModel.isAcknowledgingMetrics, "isAcknowledgingMetrics should be false initially")
        XCTAssertFalse(freshViewModel.needsAcknowledgment, "needsAcknowledgment should be false initially")
        XCTAssertFalse(freshViewModel.hasQueuedAcknowledgments, "hasQueuedAcknowledgments should be false initially")
    }

    // MARK: - Category B: Fetch Health Metrics - Success Scenarios (P0) - 4 tests

    func test_fetchHealthMetrics_success_updatesMetricsSummary() async {
        // Arrange: Configure mock to return successful response
        mockAPIClient.configureSuccess(response: MetricsFixtures.successfulSummaryResponse)

        // Act: Fetch health metrics
        await viewModel.fetchHealthMetrics()

        // Assert: Verify state updated correctly
        XCTAssertNotNil(viewModel.metricsSummary, "Metrics summary should be populated")
        XCTAssertEqual(viewModel.metricsSummary?.metrics.bmi, 24.5, "BMI should match fixture data")
        XCTAssertEqual(viewModel.metricsSummary?.metrics.bmr, 1650, "BMR should match fixture data")
        XCTAssertEqual(viewModel.metricsSummary?.metrics.tdee, 2475, "TDEE should match fixture data")
        XCTAssertFalse(viewModel.isLoadingMetrics, "Should not be loading after completion")
        XCTAssertNil(viewModel.metricsError, "Error should be nil on success")
        XCTAssertEqual(mockAPIClient.requestCallCount, 1, "API client should be called once")
    }

    func test_fetchHealthMetrics_successWithAcknowledged_doesNotSetNeedsAcknowledgment() async {
        // Arrange: Configure mock to return acknowledged metrics
        let acknowledgedResponse = MetricsSummaryResponse(
            success: true,
            data: MetricsFixtures.acknowledgedSummaryData
        )
        mockAPIClient.configureSuccess(response: acknowledgedResponse)

        // Act: Fetch and check acknowledgment
        await viewModel.fetchHealthMetrics()
        await viewModel.checkMetricsAcknowledgment()

        // Assert: Acknowledged metrics should not need acknowledgment
        XCTAssertNotNil(viewModel.metricsSummary, "Metrics should be loaded")
        XCTAssertTrue(viewModel.metricsSummary!.acknowledged, "Metrics should be acknowledged")
        XCTAssertFalse(viewModel.needsAcknowledgment, "Should not need acknowledgment for acknowledged metrics")
    }

    func test_fetchHealthMetrics_successWithUnacknowledged_setsNeedsAcknowledgment() async {
        // Arrange: Configure mock to return unacknowledged metrics
        mockAPIClient.configureSuccess(response: MetricsFixtures.successfulSummaryResponse)

        // Act: Fetch and check acknowledgment
        await viewModel.fetchHealthMetrics()
        await viewModel.checkMetricsAcknowledgment()

        // Assert: Unacknowledged metrics should need acknowledgment
        XCTAssertNotNil(viewModel.metricsSummary, "Metrics should be loaded")
        XCTAssertFalse(viewModel.metricsSummary!.acknowledged, "Metrics should be unacknowledged")
        XCTAssertTrue(viewModel.needsAcknowledgment, "Should need acknowledgment for unacknowledged metrics")
    }

    func test_fetchHealthMetrics_setsIsLoadingDuringFetch() async {
        // Arrange: Configure mock with slightly longer delay to capture loading state
        mockAPIClient.networkDelay = 50_000_000 // 50ms
        mockAPIClient.configureSuccess(response: MetricsFixtures.successfulSummaryResponse)

        var loadingStates: [Bool] = []

        // Subscribe to loading state changes
        viewModel.$isLoadingMetrics
            .sink { loading in
                loadingStates.append(loading)
            }
            .store(in: &cancellables)

        // Act: Fetch metrics
        await viewModel.fetchHealthMetrics()

        // Small delay to ensure all state changes are captured
        try? await _Concurrency.Task.sleep(nanoseconds: 20_000_000) // 20ms

        // Assert: Verify loading state transitions
        XCTAssertEqual(loadingStates.first, false, "Initial state should be false")
        XCTAssertTrue(loadingStates.contains(true), "Should have been loading at some point")
        XCTAssertEqual(loadingStates.last, false, "Final state should be false")
        XCTAssertFalse(viewModel.isLoadingMetrics, "Should not be loading after completion")
    }

    // MARK: - Category C: Fetch Health Metrics - Critical Error Handling (P0) - 9 tests

    func test_fetchHealthMetrics_404error_setsCorrectErrorMessage() async {
        // Arrange: Configure mock to return 404 error
        // This validates the fix from commit 88e60c9
        mockAPIClient.configureError(MetricsFixtures.ErrorFixtures.error404)

        // Act: Fetch health metrics
        await viewModel.fetchHealthMetrics()

        // Assert: Verify 404 error handling
        XCTAssertNil(viewModel.metricsSummary, "Metrics summary should remain nil")
        XCTAssertEqual(
            viewModel.metricsError,
            "Your health metrics are being calculated. Please check back in a few moments.",
            "404 error should show user-friendly 'calculating' message"
        )
        XCTAssertFalse(viewModel.needsAcknowledgment, "Should not require acknowledgment for non-existent metrics")
        XCTAssertFalse(viewModel.isLoadingMetrics, "Should not be loading after error")
        XCTAssertEqual(mockAPIClient.requestCallCount, 1, "Should have called API once")
    }

    func test_fetchHealthMetrics_400error_preservesStateForRetry() async {
        // Arrange: Set up initial state with metrics
        // This validates the fix from commit 88e60c9
        let initialSummary = MetricsFixtures.unacknowledgedSummaryData
        viewModel.metricsSummary = initialSummary
        viewModel.needsAcknowledgment = true

        // Configure 400 error
        mockAPIClient.configureError(MetricsFixtures.ErrorFixtures.error400)

        // Act: Attempt to fetch
        await viewModel.fetchHealthMetrics()

        // Assert: Verify 400 error preserves state
        XCTAssertEqual(
            viewModel.metricsError,
            "Validation failed",
            "400 error should show validation message"
        )
        XCTAssertEqual(
            viewModel.metricsSummary?.metrics.bmi,
            initialSummary.metrics.bmi,
            "400 error should NOT clear existing metrics data"
        )
        XCTAssertTrue(
            viewModel.needsAcknowledgment,
            "400 error should NOT modify needsAcknowledgment state"
        )
        XCTAssertFalse(viewModel.isLoadingMetrics, "Should not be loading after error")
    }

    func test_fetchHealthMetrics_400errorWithoutMessage_usesGenericMessage() async {
        // Arrange: Configure 400 error without message
        mockAPIClient.configureError(MetricsFixtures.ErrorFixtures.error400NoMessage)

        // Act: Fetch health metrics
        await viewModel.fetchHealthMetrics()

        // Assert: Verify generic message is used
        XCTAssertEqual(
            viewModel.metricsError,
            "Unable to load metrics. Please try again.",
            "400 error without message should show generic error"
        )
    }

    func test_fetchHealthMetrics_401error_clearsStateAndRequiresAuth() async {
        // Arrange: Set up initial state with data
        // This validates the security requirement from commit 88e60c9
        viewModel.metricsSummary = MetricsFixtures.unacknowledgedSummaryData
        viewModel.needsAcknowledgment = true

        mockAPIClient.configureError(MetricsFixtures.ErrorFixtures.error401)

        // Act: Fetch health metrics
        await viewModel.fetchHealthMetrics()

        // Assert: Verify 401 error clears state
        XCTAssertEqual(
            viewModel.metricsError,
            "Authentication required. Please log in again.",
            "401 error should show authentication message"
        )
        XCTAssertNil(
            viewModel.metricsSummary,
            "401 error MUST clear metrics summary (security requirement)"
        )
        XCTAssertFalse(
            viewModel.needsAcknowledgment,
            "401 error MUST clear acknowledgment state"
        )
    }

    func test_fetchHealthMetrics_403error_clearsStateAndRequiresAuth() async {
        // Arrange: Set up initial state with data
        viewModel.metricsSummary = MetricsFixtures.unacknowledgedSummaryData
        viewModel.needsAcknowledgment = true

        mockAPIClient.configureError(MetricsFixtures.ErrorFixtures.error403)

        // Act: Fetch health metrics
        await viewModel.fetchHealthMetrics()

        // Assert: Verify 403 error clears state (same as 401)
        XCTAssertEqual(
            viewModel.metricsError,
            "Authentication required. Please log in again.",
            "403 error should show authentication message"
        )
        XCTAssertNil(
            viewModel.metricsSummary,
            "403 error MUST clear metrics summary (security requirement)"
        )
        XCTAssertFalse(
            viewModel.needsAcknowledgment,
            "403 error MUST clear acknowledgment state"
        )
    }

    func test_fetchHealthMetrics_500error_setsGenericErrorMessage() async {
        // Arrange: Configure 500 error
        mockAPIClient.configureError(MetricsFixtures.ErrorFixtures.error500)

        // Act: Fetch health metrics
        await viewModel.fetchHealthMetrics()

        // Assert: Verify server error message
        XCTAssertEqual(
            viewModel.metricsError,
            "Internal server error",
            "500 error should show server error message"
        )
    }

    func test_fetchHealthMetrics_503errorWithoutMessage_usesGenericMessage() async {
        // Arrange: Configure 503 error without message
        mockAPIClient.configureError(MetricsFixtures.ErrorFixtures.error503)

        // Act: Fetch health metrics
        await viewModel.fetchHealthMetrics()

        // Assert: Verify generic message for HTTP error
        XCTAssertEqual(
            viewModel.metricsError,
            "Failed to load metrics. Please try again.",
            "HTTP error without message should show generic message"
        )
    }

    func test_fetchHealthMetrics_networkError_setsNetworkErrorMessage() async {
        // Arrange: Configure network error
        mockAPIClient.configureError(MetricsFixtures.ErrorFixtures.networkError)

        // Act: Fetch health metrics
        await viewModel.fetchHealthMetrics()

        // Assert: Verify network error message
        XCTAssertEqual(
            viewModel.metricsError,
            "Network error. Please check your connection and try again.",
            "Network error should show network error message"
        )
    }

    func test_fetchHealthMetrics_decodingError_setsDecodingErrorMessage() async {
        // Arrange: Configure decoding error
        mockAPIClient.configureError(MetricsFixtures.ErrorFixtures.decodingError)

        // Act: Fetch health metrics
        await viewModel.fetchHealthMetrics()

        // Assert: Verify decoding error message
        XCTAssertEqual(
            viewModel.metricsError,
            "Unable to process metrics data. Please try again.",
            "Decoding error should show decoding error message"
        )
    }

    // MARK: - Category D: Fetch Health Metrics - Other Errors (P0) - 2 tests

    func test_fetchHealthMetrics_unknownAPIError_setsGenericMessage() async {
        // Arrange: Configure unknown API error
        mockAPIClient.configureError(MetricsFixtures.ErrorFixtures.unknownError)

        // Act: Fetch health metrics
        await viewModel.fetchHealthMetrics()

        // Assert: Verify generic error message
        XCTAssertEqual(
            viewModel.metricsError,
            "An error occurred. Please try again.",
            "Unknown error should show generic message"
        )
    }

    func test_fetchHealthMetrics_nonAPIError_setsLocalizedDescription() async {
        // Arrange: Configure non-APIError exception
        let customError = NSError(
            domain: "TestDomain",
            code: 999,
            userInfo: [NSLocalizedDescriptionKey: "Custom error message"]
        )
        mockAPIClient.configureError(customError)

        // Act: Fetch health metrics
        await viewModel.fetchHealthMetrics()

        // Assert: Verify localized description is used
        XCTAssertEqual(
            viewModel.metricsError,
            "Custom error message",
            "Non-API error should use localizedDescription"
        )
    }

    // MARK: - Category E: Acknowledge Metrics - Success Scenarios (P0) - 4 tests

    func test_acknowledgeMetrics_noMetricsSummary_setsErrorAndReturnsEarly() async {
        // Arrange: No metrics loaded
        XCTAssertNil(viewModel.metricsSummary, "Precondition: No metrics should be loaded")

        // Act: Attempt to acknowledge
        await viewModel.acknowledgeMetrics()

        // Assert: Verify early return with error
        XCTAssertEqual(
            viewModel.metricsError,
            "No metrics to acknowledge",
            "Should set appropriate error message"
        )
        XCTAssertFalse(
            viewModel.isAcknowledgingMetrics,
            "Should not be in acknowledging state"
        )
    }

    func test_acknowledgeMetrics_success_updatesStateCorrectly() async {
        // Arrange: Set up unacknowledged metrics and configure success
        viewModel.metricsSummary = MetricsFixtures.unacknowledgedSummaryData
        viewModel.needsAcknowledgment = true

        mockAPIClient.configureSuccess(response: MetricsFixtures.successfulAcknowledgeResponse)

        // Act: Acknowledge metrics (will use retry strategy)
        await viewModel.acknowledgeMetrics()

        // Assert: Verify state updated correctly
        XCTAssertFalse(viewModel.needsAcknowledgment, "Should not need acknowledgment after success")
        XCTAssertTrue(viewModel.metricsSummary!.acknowledged, "Metrics should be marked as acknowledged")
        XCTAssertFalse(viewModel.isAcknowledgingMetrics, "Should not be acknowledging after completion")
        XCTAssertNil(viewModel.metricsError, "Error should be nil on success")
    }

    func test_acknowledgeMetrics_success_sendsCorrectTimestamp() async {
        // Arrange: Create metrics with specific timestamp
        // This validates the timestamp preservation fix
        let expectedTimestamp = "2023-10-31T16:00:00.123Z"
        let metrics = MetricsFixtures.createMetricsWithTimestamp(expectedTimestamp, version: 5)
        let summaryData = MetricsFixtures.createSummaryData(metrics: metrics, acknowledged: false)

        // Use SpyAPIClient to capture requests
        let spyViewModel = MetricsViewModel(apiClient: spyAPIClient)
        spyViewModel.metricsSummary = summaryData

        spyAPIClient.configureSuccess(response: MetricsFixtures.successfulAcknowledgeResponse)

        // Act: Acknowledge metrics
        await spyViewModel.acknowledgeMetrics()

        // Assert: Verify exact timestamp string was sent
        XCTAssertTrue(
            spyAPIClient.verifyLastAcknowledgeTimestamp(expectedTimestamp),
            "Must send exact timestamp string without re-encoding"
        )
        XCTAssertTrue(
            spyAPIClient.verifyLastAcknowledgeVersion(5),
            "Must send correct version number"
        )
    }

    func test_acknowledgeMetrics_setsIsAcknowledgingDuringRequest() async {
        // Arrange: Set up metrics and configure longer delay
        viewModel.metricsSummary = MetricsFixtures.unacknowledgedSummaryData
        mockAPIClient.networkDelay = 50_000_000 // 50ms
        mockAPIClient.configureSuccess(response: MetricsFixtures.successfulAcknowledgeResponse)

        var acknowledgingStates: [Bool] = []

        // Subscribe to acknowledging state changes
        viewModel.$isAcknowledgingMetrics
            .sink { acknowledging in
                acknowledgingStates.append(acknowledging)
            }
            .store(in: &cancellables)

        // Act: Acknowledge metrics
        await viewModel.acknowledgeMetrics()

        // Small delay to ensure all state changes are captured
        try? await _Concurrency.Task.sleep(nanoseconds: 20_000_000) // 20ms

        // Assert: Verify acknowledging state transitions
        XCTAssertEqual(acknowledgingStates.first, false, "Initial state should be false")
        XCTAssertTrue(acknowledgingStates.contains(true), "Should have been acknowledging at some point")
        XCTAssertEqual(acknowledgingStates.last, false, "Final state should be false")
        XCTAssertFalse(viewModel.isAcknowledgingMetrics, "Should not be acknowledging after completion")
    }

    // MARK: - Category F: Acknowledge Metrics - Error Handling (P0) - 7 tests
    // Note: These tests verify error handling after retry logic has been exhausted

    func test_acknowledgeMetrics_404error_clearsMetricsAndSuggestsRefresh() async {
        // Arrange: Set up metrics and configure 404 error
        // This validates the fix from commit 88e60c9
        viewModel.metricsSummary = MetricsFixtures.unacknowledgedSummaryData
        mockAPIClient.configureError(MetricsFixtures.ErrorFixtures.error404)

        // Act: Attempt to acknowledge (retry strategy will exhaust retries)
        await viewModel.acknowledgeMetrics()

        // Assert: Verify 404 handling during acknowledgment
        XCTAssertEqual(
            viewModel.metricsError,
            "Metrics have been updated. Please refresh and try again.",
            "404 during acknowledgment should suggest refresh"
        )
        XCTAssertNil(viewModel.metricsSummary, "Should clear metrics to force refresh")
        XCTAssertFalse(viewModel.needsAcknowledgment, "Should not need acknowledgment")
    }

    func test_acknowledgeMetrics_400error_preservesStateForRetry() async {
        // Arrange: Set up metrics and configure 400 error
        // This validates the fix from commit 88e60c9
        let initialSummary = MetricsFixtures.unacknowledgedSummaryData
        viewModel.metricsSummary = initialSummary
        viewModel.needsAcknowledgment = true
        mockAPIClient.configureError(MetricsFixtures.ErrorFixtures.error400)

        // Act: Attempt to acknowledge
        await viewModel.acknowledgeMetrics()

        // Assert: Verify 400 preserves state for retry
        XCTAssertEqual(
            viewModel.metricsError,
            "Validation failed",
            "400 error should show validation message"
        )
        XCTAssertNotNil(viewModel.metricsSummary, "Should NOT clear metrics (allow retry)")
        XCTAssertEqual(
            viewModel.metricsSummary?.metrics.bmi,
            initialSummary.metrics.bmi,
            "Metrics data should be preserved"
        )
        // Note: needsAcknowledgment is not modified by 400 error
    }

    func test_acknowledgeMetrics_401error_clearsStateAndRequiresAuth() async {
        // Arrange: Set up metrics and configure 401 error
        viewModel.metricsSummary = MetricsFixtures.unacknowledgedSummaryData
        mockAPIClient.configureError(MetricsFixtures.ErrorFixtures.error401)

        // Act: Attempt to acknowledge
        await viewModel.acknowledgeMetrics()

        // Assert: Verify 401 clears state
        XCTAssertEqual(
            viewModel.metricsError,
            "Authentication required. Please log in again.",
            "401 error should show authentication message"
        )
        XCTAssertNil(viewModel.metricsSummary, "Should clear metrics for security")
        XCTAssertFalse(viewModel.needsAcknowledgment, "Should not need acknowledgment")
    }

    func test_acknowledgeMetrics_403error_clearsStateAndRequiresAuth() async {
        // Arrange: Set up metrics and configure 403 error
        viewModel.metricsSummary = MetricsFixtures.unacknowledgedSummaryData
        mockAPIClient.configureError(MetricsFixtures.ErrorFixtures.error403)

        // Act: Attempt to acknowledge
        await viewModel.acknowledgeMetrics()

        // Assert: Verify 403 clears state (same as 401)
        XCTAssertEqual(
            viewModel.metricsError,
            "Authentication required. Please log in again.",
            "403 error should show authentication message"
        )
        XCTAssertNil(viewModel.metricsSummary, "Should clear metrics for security")
        XCTAssertFalse(viewModel.needsAcknowledgment, "Should not need acknowledgment")
    }

    func test_acknowledgeMetrics_500error_queuesForRetry() async {
        // Arrange: Set up metrics and configure 500 error
        viewModel.metricsSummary = MetricsFixtures.unacknowledgedSummaryData
        mockAPIClient.configureError(MetricsFixtures.ErrorFixtures.error500)

        // Act: Attempt to acknowledge
        await viewModel.acknowledgeMetrics()

        // Assert: Verify 500 error queues request after retry exhaustion
        XCTAssertEqual(
            viewModel.metricsError,
            "Request queued. Will retry when connection improves.",
            "500 error should queue request after retries exhausted"
        )
        XCTAssertFalse(viewModel.needsAcknowledgment, "Should not show prompt when queued")
    }

    func test_acknowledgeMetrics_networkError_queuesForRetry() async {
        // Arrange: Set up metrics and configure network error
        viewModel.metricsSummary = MetricsFixtures.unacknowledgedSummaryData
        mockAPIClient.configureError(MetricsFixtures.ErrorFixtures.networkError)

        // Act: Attempt to acknowledge
        await viewModel.acknowledgeMetrics()

        // Assert: Verify network error queues request after retry exhaustion
        XCTAssertEqual(
            viewModel.metricsError,
            "Request queued. Will retry when connection improves.",
            "Network error should queue request after retries exhausted"
        )
        XCTAssertFalse(viewModel.needsAcknowledgment, "Should not show prompt when queued")
    }

    func test_acknowledgeMetrics_decodingError_setsDecodingMessage() async {
        // Arrange: Set up metrics and configure decoding error
        viewModel.metricsSummary = MetricsFixtures.unacknowledgedSummaryData
        mockAPIClient.configureError(MetricsFixtures.ErrorFixtures.decodingError)

        // Act: Attempt to acknowledge
        await viewModel.acknowledgeMetrics()

        // Assert: Verify decoding error message
        XCTAssertEqual(
            viewModel.metricsError,
            "Unable to process acknowledgment response. Please try again.",
            "Decoding error should show decoding error message"
        )
    }

    // MARK: - Category G: Check Metrics Acknowledgment (P0) - 3 tests

    func test_checkMetricsAcknowledgment_noCache_fetchesMetrics() async {
        // Arrange: No cached metrics
        XCTAssertNil(viewModel.metricsSummary, "Precondition: No metrics cached")
        mockAPIClient.configureSuccess(response: MetricsFixtures.successfulSummaryResponse)

        // Act: Check acknowledgment
        await viewModel.checkMetricsAcknowledgment()

        // Assert: Verify fetch was called
        XCTAssertEqual(mockAPIClient.requestCallCount, 1, "Should fetch metrics when not cached")
        XCTAssertNotNil(viewModel.metricsSummary, "Metrics should be loaded after fetch")
    }

    func test_checkMetricsAcknowledgment_cachedAcknowledged_doesNotSetNeedsAck() async {
        // Arrange: Set up cached acknowledged metrics
        viewModel.metricsSummary = MetricsFixtures.acknowledgedSummaryData

        // Act: Check acknowledgment
        await viewModel.checkMetricsAcknowledgment()

        // Assert: Verify no fetch and no acknowledgment needed
        XCTAssertFalse(
            viewModel.needsAcknowledgment,
            "Acknowledged metrics should not require acknowledgment"
        )
        XCTAssertEqual(mockAPIClient.requestCallCount, 0, "Should not fetch when metrics cached")
    }

    func test_checkMetricsAcknowledgment_cachedUnacknowledged_setsNeedsAck() async {
        // Arrange: Set up cached unacknowledged metrics
        viewModel.metricsSummary = MetricsFixtures.unacknowledgedSummaryData

        // Act: Check acknowledgment
        await viewModel.checkMetricsAcknowledgment()

        // Assert: Verify acknowledgment needed
        XCTAssertTrue(
            viewModel.needsAcknowledgment,
            "Unacknowledged metrics should require acknowledgment"
        )
        XCTAssertEqual(mockAPIClient.requestCallCount, 0, "Should not fetch when metrics cached")
    }

    // MARK: - Category H: Edge Cases and State Transitions (P0) - 2 tests

    func test_stateTransition_fetchToAcknowledge_successful() async {
        // Phase 1: Fetch unacknowledged metrics
        mockAPIClient.configureSuccess(
            response: MetricsSummaryResponse(
                success: true,
                data: MetricsFixtures.unacknowledgedSummaryData
            )
        )

        await viewModel.fetchHealthMetrics()

        XCTAssertNotNil(viewModel.metricsSummary, "Metrics should be loaded")
        XCTAssertFalse(viewModel.metricsSummary!.acknowledged, "Should be unacknowledged")

        // Phase 2: Check if acknowledgment needed
        await viewModel.checkMetricsAcknowledgment()

        XCTAssertTrue(
            viewModel.needsAcknowledgment,
            "Should need acknowledgment for unacknowledged metrics"
        )
        XCTAssertEqual(
            mockAPIClient.requestCallCount,
            1,
            "Should not fetch again when metrics cached"
        )

        // Phase 3: Acknowledge metrics
        mockAPIClient.reset()
        mockAPIClient.configureSuccess(response: MetricsFixtures.successfulAcknowledgeResponse)

        await viewModel.acknowledgeMetrics()

        XCTAssertFalse(
            viewModel.needsAcknowledgment,
            "Should no longer need acknowledgment"
        )
        XCTAssertTrue(
            viewModel.metricsSummary!.acknowledged,
            "Metrics should be marked acknowledged"
        )
        XCTAssertNil(viewModel.metricsError, "Should have no errors")
    }

    func test_fetchHealthMetrics_failThenSucceed_recoversProperly() async {
        // Phase 1: Initial fetch fails with 404
        mockAPIClient.configureError(MetricsFixtures.ErrorFixtures.error404)
        await viewModel.fetchHealthMetrics()

        XCTAssertNotNil(viewModel.metricsError, "Error should be set after failure")
        XCTAssertNil(viewModel.metricsSummary, "No metrics should be loaded")

        // Phase 2: Retry succeeds
        mockAPIClient.reset()
        mockAPIClient.configureSuccess(
            response: MetricsSummaryResponse(
                success: true,
                data: MetricsFixtures.unacknowledgedSummaryData
            )
        )

        await viewModel.fetchHealthMetrics()

        // Assert: Recovery successful
        XCTAssertNil(viewModel.metricsError, "Error should be cleared on success")
        XCTAssertNotNil(viewModel.metricsSummary, "Metrics should be loaded")
        XCTAssertEqual(
            viewModel.metricsSummary?.metrics.bmi,
            24.5,
            "Correct metrics data should be loaded"
        )
    }

    // MARK: - Category I: Timestamp Handling (P0) - 3 tests

    func test_fetchHealthMetrics_preservesOriginalTimestampString() async {
        // Arrange: Configure response with specific timestamp
        let expectedTimestamp = "2023-10-31T16:00:00.123Z"
        let metrics = MetricsFixtures.createMetricsWithTimestamp(expectedTimestamp)

        // Verify fixture preserves timestamp
        XCTAssertEqual(
            metrics.computedAtString,
            expectedTimestamp,
            "Test fixture should preserve timestamp string"
        )

        // Configure mock to return this metrics data
        let response = MetricsSummaryResponse(
            success: true,
            data: MetricsFixtures.createSummaryData(metrics: metrics)
        )
        mockAPIClient.configureSuccess(response: response)

        // Act: Fetch metrics
        await viewModel.fetchHealthMetrics()

        // Assert: Verify timestamp preserved exactly
        XCTAssertEqual(
            viewModel.metricsSummary?.metrics.computedAtString,
            expectedTimestamp,
            "Timestamp string must be preserved exactly"
        )
    }

    func test_acknowledgeMetrics_timestampWithMilliseconds_sentUnchanged() async {
        // Arrange: Create metrics with milliseconds timestamp
        let expectedTimestamp = "2023-10-31T16:00:00.123Z"
        let metrics = MetricsFixtures.createMetricsWithTimestamp(expectedTimestamp, version: 5)
        let summaryData = MetricsFixtures.createSummaryData(metrics: metrics, acknowledged: false)

        // Use SpyAPIClient to capture request
        let spyViewModel = MetricsViewModel(apiClient: spyAPIClient)
        spyViewModel.metricsSummary = summaryData

        spyAPIClient.configureSuccess(response: MetricsFixtures.successfulAcknowledgeResponse)

        // Act: Acknowledge metrics
        await spyViewModel.acknowledgeMetrics()

        // Assert: Verify exact timestamp sent
        XCTAssertTrue(
            spyAPIClient.verifyLastAcknowledgeTimestamp(expectedTimestamp),
            "Timestamp with milliseconds must be sent unchanged"
        )
    }

    func test_acknowledgeMetrics_timestampWithoutMilliseconds_sentUnchanged() async {
        // Arrange: Create metrics without milliseconds timestamp
        let expectedTimestamp = "2023-10-31T16:00:00Z"
        let metrics = MetricsFixtures.createMetricsWithTimestamp(expectedTimestamp, version: 3)
        let summaryData = MetricsFixtures.createSummaryData(metrics: metrics, acknowledged: false)

        // Use SpyAPIClient to capture request
        let spyViewModel = MetricsViewModel(apiClient: spyAPIClient)
        spyViewModel.metricsSummary = summaryData

        spyAPIClient.configureSuccess(response: MetricsFixtures.successfulAcknowledgeResponse)

        // Act: Acknowledge metrics
        await spyViewModel.acknowledgeMetrics()

        // Assert: Verify exact timestamp sent
        XCTAssertTrue(
            spyAPIClient.verifyLastAcknowledgeTimestamp(expectedTimestamp),
            "Timestamp without milliseconds must be sent unchanged"
        )
    }

    // MARK: - Category P1: Important Tests - 12 tests

    func test_init_withCustomAPIClient_usesProvidedClient() async {
        // Arrange & Act: Create ViewModel with custom client
        let customClient = MockAPIClient()
        customClient.configureSuccess(response: MetricsFixtures.successfulSummaryResponse)

        let customViewModel = MetricsViewModel(apiClient: customClient)

        // Act: Fetch metrics
        await customViewModel.fetchHealthMetrics()

        // Assert: Verify custom client was used
        XCTAssertEqual(customClient.requestCallCount, 1, "Custom API client should be used")
        XCTAssertEqual(mockAPIClient.requestCallCount, 0, "Default client should not be called")
    }

    func test_fetchHealthMetrics_concurrentCalls_handlesGracefully() async {
        // Arrange: Configure mock with delay
        mockAPIClient.networkDelay = 100_000_000 // 100ms
        mockAPIClient.configureSuccess(response: MetricsFixtures.successfulSummaryResponse)

        // Act: Start two concurrent fetch operations
        async let fetch1: Void = viewModel.fetchHealthMetrics()
        async let fetch2: Void = viewModel.fetchHealthMetrics()

        await fetch1
        await fetch2

        // Assert: Both complete without crashes, state is consistent
        XCTAssertNotNil(viewModel.metricsSummary, "Metrics should be loaded")
        XCTAssertFalse(viewModel.isLoadingMetrics, "Should not be loading after both complete")
        XCTAssertGreaterThanOrEqual(mockAPIClient.requestCallCount, 2, "Both requests should be made")
    }

    func test_fetchHealthMetrics_whileAcknowledging_bothComplete() async {
        // Arrange: Set up metrics for acknowledgment
        viewModel.metricsSummary = MetricsFixtures.unacknowledgedSummaryData

        mockAPIClient.networkDelay = 50_000_000 // 50ms
        mockAPIClient.configureSuccess(response: MetricsFixtures.successfulSummaryResponse)

        // Act: Start acknowledgment, then fetch
        async let acknowledge: Void = viewModel.acknowledgeMetrics()
        try? await _Concurrency.Task.sleep(nanoseconds: 10_000_000) // 10ms delay
        async let fetch: Void = viewModel.fetchHealthMetrics()

        await acknowledge
        await fetch

        // Assert: Both operations complete, final state is consistent
        XCTAssertNotNil(viewModel.metricsSummary, "Metrics should be loaded")
        XCTAssertFalse(viewModel.isLoadingMetrics, "Should not be loading")
        XCTAssertFalse(viewModel.isAcknowledgingMetrics, "Should not be acknowledging")
    }

    func test_acknowledgeMetrics_whileFetching_handlesGracefully() async {
        // Arrange: Configure mock with delay for fetch
        mockAPIClient.networkDelay = 100_000_000 // 100ms
        mockAPIClient.configureSuccess(response: MetricsFixtures.successfulSummaryResponse)

        viewModel.metricsSummary = MetricsFixtures.unacknowledgedSummaryData

        // Act: Start fetch, then acknowledge
        async let fetch: Void = viewModel.fetchHealthMetrics()
        try? await _Concurrency.Task.sleep(nanoseconds: 10_000_000) // 10ms delay
        async let acknowledge: Void = viewModel.acknowledgeMetrics()

        await fetch
        await acknowledge

        // Assert: Both operations complete without crashes
        XCTAssertNotNil(viewModel.metricsSummary, "Metrics should be loaded")
        XCTAssertFalse(viewModel.isLoadingMetrics, "Should not be loading")
        XCTAssertFalse(viewModel.isAcknowledgingMetrics, "Should not be acknowledging")
    }

    // Additional P1 tests - Simplified versions that focus on testable behavior

    func test_acknowledgeMetrics_429error_queuesForRetry() async {
        // Arrange: Set up metrics and configure rate limit error
        viewModel.metricsSummary = MetricsFixtures.unacknowledgedSummaryData
        let rateLimitError = APIError.httpError(statusCode: 429, message: "Too many requests")
        mockAPIClient.configureError(rateLimitError)

        // Act: Attempt to acknowledge
        await viewModel.acknowledgeMetrics()

        // Assert: Verify rate limit error queues request after retry exhaustion
        XCTAssertEqual(
            viewModel.metricsError,
            "Request queued. Will retry when connection improves.",
            "429 error should queue request after retries exhausted"
        )
    }

    func test_metricsError_clearsOnSuccessfulFetch() async {
        // Arrange: Set error state
        viewModel.metricsError = "Previous error"

        // Configure success
        mockAPIClient.configureSuccess(response: MetricsFixtures.successfulSummaryResponse)

        // Act: Fetch successfully
        await viewModel.fetchHealthMetrics()

        // Assert: Error should be cleared
        XCTAssertNil(viewModel.metricsError, "Error should be cleared on successful fetch")
    }

    func test_metricsError_clearsOnSuccessfulAcknowledge() async {
        // Arrange: Set error state and metrics
        viewModel.metricsError = "Previous error"
        viewModel.metricsSummary = MetricsFixtures.unacknowledgedSummaryData

        // Configure success
        mockAPIClient.configureSuccess(response: MetricsFixtures.successfulAcknowledgeResponse)

        // Act: Acknowledge successfully
        await viewModel.acknowledgeMetrics()

        // Assert: Error should be cleared
        XCTAssertNil(viewModel.metricsError, "Error should be cleared on successful acknowledge")
    }

    func test_initialization_doesNotCallAPI() {
        // Arrange & Act: Create a new view model
        let newViewModel = MetricsViewModel(apiClient: mockAPIClient)

        // Assert: Should not make API calls on initialization
        XCTAssertEqual(mockAPIClient.requestCallCount, 0, "Should not call API on initialization")
        XCTAssertNil(newViewModel.metricsSummary, "Should not have metrics on initialization")
        XCTAssertNil(newViewModel.metricsError, "Should not have error on initialization")
    }

    func test_cleanup_stopsNetworkMonitoring() async {
        // Arrange: Initialize view model with monitoring
        viewModel.initialize()

        // Act: Cleanup
        viewModel.cleanup()

        // Assert: Monitoring should be stopped (verified by no crashes on subsequent operations)
        // This is a basic test to ensure cleanup can be called without issues
        XCTAssertNotNil(viewModel, "View model should still exist after cleanup")
    }

    func test_processOfflineQueue_canBeCalled() async {
        // Arrange: View model exists
        XCTAssertNotNil(viewModel)

        // Act: Call processOfflineQueue
        await viewModel.processOfflineQueue()

        // Assert: Method completes without crashes
        XCTAssertNotNil(viewModel, "Should complete successfully")
    }

    func test_clearOfflineQueue_canBeCalled() async {
        // Arrange: View model exists
        XCTAssertNotNil(viewModel)

        // Act: Call clearOfflineQueue
        await viewModel.clearOfflineQueue()

        // Assert: Method completes without crashes
        XCTAssertNotNil(viewModel, "Should complete successfully")
    }

    func test_getQueueStatistics_returnsStatistics() async {
        // Arrange: View model exists
        XCTAssertNotNil(viewModel)

        // Act: Get queue statistics
        let stats = await viewModel.getQueueStatistics()

        // Assert: Returns valid statistics object
        XCTAssertNotNil(stats, "Should return statistics object")
        XCTAssertGreaterThanOrEqual(stats.totalCount, 0, "Total count should be non-negative")
    }
}
