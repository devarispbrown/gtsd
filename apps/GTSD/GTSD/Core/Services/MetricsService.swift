//
//  MetricsService.swift
//  GTSD
//
//  Created by Claude on 2025-10-28.
//

import Foundation

// MARK: - Protocol

/// Protocol for metrics-related operations
protocol MetricsServiceProtocol: Sendable {
    /// Fetch today's metrics with explanations
    func getTodayMetrics() async throws -> MetricsSummaryData

    /// Acknowledge metrics after viewing summary
    func acknowledgeMetrics(version: Int, metricsComputedAt: String) async throws -> AcknowledgeResponse

    /// Check if new metrics are available (for background refresh)
    func checkForNewMetrics(lastComputedAt: Date?) async throws -> Bool
}

// MARK: - Implementation

/// Service for managing health metrics operations
final class MetricsService: MetricsServiceProtocol {
    private let apiClient: any APIClientProtocol

    init(apiClient: any APIClientProtocol) {
        self.apiClient = apiClient
    }

    // MARK: - Public Methods

    func getTodayMetrics() async throws -> MetricsSummaryData {
        Logger.info("Fetching today's metrics")

        do {
            let response: MetricsSummaryResponse = try await apiClient.request(.getTodayMetrics)

            if response.success {
                Logger.info("Successfully fetched today's metrics")
                return response.data
            } else {
                Logger.error("Metrics fetch returned success=false")
                throw MetricsError.invalidResponse
            }
        } catch let error as APIError {
            Logger.error("API error fetching metrics: \(error)")
            throw mapAPIError(error)
        } catch {
            Logger.error("Unexpected error fetching metrics: \(error)")
            throw MetricsError.networkError(error)
        }
    }

    func acknowledgeMetrics(version: Int, metricsComputedAt: String) async throws -> AcknowledgeResponse {
        Logger.info("Acknowledging metrics version \(version)")

        let request = AcknowledgeMetricsRequest(
            version: version,
            metricsComputedAt: metricsComputedAt
        )

        do {
            let response: AcknowledgeResponse = try await apiClient.request(
                .acknowledgeMetrics(request)
            )

            if response.success {
                Logger.info("Successfully acknowledged metrics")
                return response
            } else {
                Logger.error("Metrics acknowledgement returned success=false")
                throw MetricsError.invalidResponse
            }
        } catch let error as APIError {
            Logger.error("API error acknowledging metrics: \(error)")
            throw mapAPIError(error)
        } catch {
            Logger.error("Unexpected error acknowledging metrics: \(error)")
            throw MetricsError.networkError(error)
        }
    }

    func checkForNewMetrics(lastComputedAt: Date?) async throws -> Bool {
        Logger.debug("Checking for new metrics")

        do {
            let data = try await getTodayMetrics()

            // If we have no previous timestamp, consider it new
            guard let lastComputedAt = lastComputedAt else {
                Logger.debug("No previous metrics timestamp, considering new")
                return true
            }

            // Check if metrics were computed after our last known timestamp
            let hasNewMetrics = data.metrics.computedAt > lastComputedAt
            Logger.debug("New metrics available: \(hasNewMetrics)")
            return hasNewMetrics

        } catch MetricsError.notFound {
            // No metrics available yet
            Logger.debug("No metrics found")
            return false
        } catch {
            // Don't throw on background checks, just log and return false
            Logger.warning("Error checking for new metrics: \(error)")
            return false
        }
    }

    // MARK: - Private Helpers

    private func mapAPIError(_ error: APIError) -> MetricsError {
        switch error {
        case .httpError(let statusCode, let message):
            if statusCode == 404 {
                return .notFound
            } else if statusCode == 409 {
                return .alreadyAcknowledged
            } else {
                return .serverError(message ?? "Server error occurred")
            }
        case .networkError:
            return .networkError(error)
        case .decodingError:
            return .invalidResponse
        default:
            return .serverError("An unexpected error occurred")
        }
    }
}

// MARK: - Mock Implementation (for testing)

#if DEBUG
final class MockMetricsService: MetricsServiceProtocol {
    var shouldFail = false
    var mockMetrics: MetricsSummaryData?
    var mockAcknowledgeResponse: AcknowledgeResponse?

    func getTodayMetrics() async throws -> MetricsSummaryData {
        if shouldFail {
            throw MetricsError.notFound
        }

        if let mockMetrics = mockMetrics {
            return mockMetrics
        }

        // Return default mock data
        return MetricsSummaryData(
            metrics: HealthMetrics(
                bmi: 24.5,
                bmr: 1650,
                tdee: 2475,
                computedAt: Date(),
                version: 1
            ),
            explanations: MetricsExplanations(
                bmi: "Your BMI of 24.5 is in the normal range (18.5-24.9). This indicates a healthy weight for your height.",
                bmr: "Your Basal Metabolic Rate is 1,650 calories per day. This is the energy your body needs at rest to maintain vital functions.",
                tdee: "Your Total Daily Energy Expenditure is 2,475 calories per day. This includes your BMR plus calories burned through activity."
            ),
            acknowledged: false,
            acknowledgement: nil
        )
    }

    func acknowledgeMetrics(version: Int, metricsComputedAt: String) async throws -> AcknowledgeResponse {
        if shouldFail {
            throw MetricsError.serverError("Mock error")
        }

        if let mockResponse = mockAcknowledgeResponse {
            return mockResponse
        }

        return AcknowledgeResponse(
            success: true,
            data: AcknowledgeResponseData(
                acknowledged: true,
                acknowledgement: Acknowledgement(
                    acknowledgedAt: Date(),
                    version: version
                )
            )
        )
    }

    func checkForNewMetrics(lastComputedAt: Date?) async throws -> Bool {
        if shouldFail {
            return false
        }
        return true
    }
}
#endif
