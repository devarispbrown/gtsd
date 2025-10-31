//
//  MetricsViewModel.swift
//  GTSD
//
//  Created by Claude on 2025-10-29.
//  Handles fetching and acknowledging health metrics
//

import Foundation
import Combine

@MainActor
class MetricsViewModel: ObservableObject {
    // Shared singleton instance
    static let shared = MetricsViewModel()

    @Published var metricsSummary: MetricsSummaryData?
    @Published var isLoadingMetrics: Bool = false
    @Published var metricsError: String?
    @Published var isAcknowledgingMetrics: Bool = false
    @Published var needsAcknowledgment: Bool = false

    private let apiClient: any APIClientProtocol

    nonisolated private init(apiClient: (any APIClientProtocol)? = nil) {
        self.apiClient = apiClient ?? ServiceContainer.shared.apiClient
    }

    /// Check if metrics need acknowledgment
    func checkMetricsAcknowledgment() async {
        // Only fetch if we don't already have metrics data
        if metricsSummary == nil {
            await fetchHealthMetrics()
        }
        // If metrics exist and are not acknowledged, show acknowledgment view
        if let summary = metricsSummary {
            needsAcknowledgment = !summary.acknowledged
        }
    }

    /// Fetch today's health metrics from the backend
    func fetchHealthMetrics() async {
        isLoadingMetrics = true
        metricsError = nil

        Logger.info("Fetching health metrics from API...")

        do {
            let response: MetricsSummaryResponse = try await apiClient.request(.getTodayMetrics)
            metricsSummary = response.data

            // Log the timestamp we received for debugging
            Logger.info("Health metrics fetched successfully. ComputedAt: \(response.data.metrics.computedAtString), Version: \(response.data.metrics.version), Acknowledged: \(response.data.acknowledged)")
        } catch let apiError as APIError {
            Logger.error("Failed to fetch health metrics: \(apiError)")

            // Handle specific error cases
            switch apiError {
            case .httpError(let statusCode, let message):
                if statusCode == 404 {
                    // 404 means metrics don't exist yet - computation job hasn't run
                    Logger.info("Metrics not found (404) - computation job hasn't run yet")
                    metricsError = "Your health metrics are being calculated. Please check back in a few moments."
                    // Don't require acknowledgment if metrics don't exist
                    needsAcknowledgment = false
                } else if statusCode == 400 {
                    // 400 is a validation error - show error but allow retry
                    Logger.error("HTTP Error 400 during metrics fetch: \(message ?? "Unknown error")")
                    metricsError = message ?? "Unable to load metrics. Please try again."
                    // Don't set needsAcknowledgment = false - preserve state to allow retry
                } else if statusCode == 401 || statusCode == 403 {
                    // Authentication/authorization error - clear state and require re-auth
                    Logger.error("Authentication error (\(statusCode)) during metrics fetch")
                    metricsError = "Authentication required. Please log in again."
                    metricsSummary = nil
                    needsAcknowledgment = false
                } else {
                    metricsError = message ?? "Failed to load metrics. Please try again."
                }
            case .networkError:
                metricsError = "Network error. Please check your connection and try again."
            case .decodingError:
                metricsError = "Unable to process metrics data. Please try again."
            default:
                metricsError = "An error occurred. Please try again."
            }
        } catch {
            Logger.error("Unexpected error fetching health metrics: \(error)")
            metricsError = error.localizedDescription
        }

        isLoadingMetrics = false
    }

    /// Acknowledge health metrics
    func acknowledgeMetrics() async {
        guard let summary = metricsSummary else {
            Logger.warning("Cannot acknowledge metrics: no summary data available")
            metricsError = "No metrics to acknowledge"
            return
        }

        isAcknowledgingMetrics = true
        metricsError = nil

        // Log what we're about to send
        Logger.info("Acknowledging metrics. Sending version: \(summary.metrics.version), computedAt: \(summary.metrics.computedAtString)")

        do {
            // Create the acknowledgment request using the original ISO string
            let request = AcknowledgeMetricsRequest(
                version: summary.metrics.version,
                metricsComputedAt: summary.metrics.computedAtString  // Use the original string!
            )

            let _: AcknowledgeResponse = try await apiClient.request(
                .acknowledgeMetrics(request)
            )

            Logger.info("Metrics acknowledged successfully")

            // Update local state
            needsAcknowledgment = false
            // Update the stored metrics to reflect acknowledgment
            if var currentSummary = metricsSummary {
                currentSummary.acknowledged = true
                metricsSummary = currentSummary
            }
        } catch let apiError as APIError {
            Logger.error("Failed to acknowledge metrics: \(apiError)")

            // Handle specific error cases for acknowledgment
            switch apiError {
            case .httpError(let statusCode, let message):
                if statusCode == 404 {
                    // Metrics not found - they may have been regenerated
                    Logger.error("HTTP Error 404 during metrics acknowledgment: Metrics not found")
                    metricsError = "Metrics have been updated. Please refresh and try again."
                    // Clear cached metrics to force refresh
                    metricsSummary = nil
                    needsAcknowledgment = false
                } else if statusCode == 400 {
                    // 400 is a validation error - show error but allow retry
                    Logger.error("HTTP Error 400 during metrics acknowledgment: \(message ?? "Unknown error")")
                    metricsError = message ?? "Failed to acknowledge metrics. Please try again."
                    // Don't set needsAcknowledgment = false - preserve state to allow retry
                } else if statusCode == 401 || statusCode == 403 {
                    // Authentication/authorization error - clear state and require re-auth
                    Logger.error("Authentication error (\(statusCode)) during metrics acknowledgment")
                    metricsError = "Authentication required. Please log in again."
                    metricsSummary = nil
                    needsAcknowledgment = false
                } else {
                    Logger.error("HTTP Error \(statusCode): \(message ?? "Unknown error")")
                    metricsError = message ?? "Failed to acknowledge metrics. Please try again."
                }
            case .networkError:
                metricsError = "Network error. Please check your connection and try again."
            case .decodingError:
                metricsError = "Unable to process acknowledgment response. Please try again."
            default:
                metricsError = "An error occurred. Please try again."
            }
        } catch {
            Logger.error("Unexpected error acknowledging metrics: \(error)")
            metricsError = error.localizedDescription
        }

        isAcknowledgingMetrics = false
    }
}
