//
//  MetricsSummaryViewModel.swift
//  GTSD
//
//  Created by Claude on 2025-10-28.
//

import Foundation
import SwiftUI
import Combine

/// ViewModel for managing metrics summary state and operations
@MainActor
final class MetricsSummaryViewModel: ObservableObject {
    // MARK: - Published Properties

    @Published var metricsData: MetricsSummaryData?
    @Published var isLoading = false
    @Published var error: MetricsError?
    @Published var acknowledged = false
    @Published var expandedMetrics: Set<String> = []

    // MARK: - Private Properties

    private let metricsService: any MetricsServiceProtocol
    private var lastComputedAt: Date?
    private var refreshTask: Task<Void, Never>?

    // MARK: - Initialization

    init(metricsService: any MetricsServiceProtocol) {
        self.metricsService = metricsService
    }

    convenience init() {
        self.init(metricsService: ServiceContainer.shared.metricsService)
    }

    // MARK: - Public Methods

    /// Fetch today's metrics from the backend with automatic retry
    func fetchMetrics() async {
        guard !isLoading else {
            Logger.debug("Metrics fetch already in progress")
            return
        }

        isLoading = true
        error = nil

        Logger.info("Fetching metrics summary")

        // Retry logic for post-onboarding scenario
        var retryCount = 0
        let maxRetries = 3
        let retryDelay: UInt64 = 2_000_000_000 // 2 seconds in nanoseconds

        while retryCount <= maxRetries {
            do {
                let data = try await metricsService.getTodayMetrics()
                self.metricsData = data
                self.lastComputedAt = data.metrics.computedAt
                self.acknowledged = data.acknowledged

                Logger.info("Successfully loaded metrics: BMI=\(data.metrics.bmi), BMR=\(data.metrics.bmr), TDEE=\(data.metrics.tdee)")

                // Success - exit the retry loop
                isLoading = false
                return

            } catch let metricsError as MetricsError {
                if retryCount < maxRetries {
                    retryCount += 1
                    Logger.warning("Metrics fetch failed, retrying (\(retryCount)/\(maxRetries)): \(metricsError.localizedDescription)")

                    // Wait before retrying
                    try? await Task.sleep(nanoseconds: retryDelay)
                } else {
                    // Max retries reached
                    Logger.error("Failed to fetch metrics after \(maxRetries) retries: \(metricsError.localizedDescription)")
                    self.error = metricsError
                    isLoading = false
                    return
                }
            } catch {
                if retryCount < maxRetries {
                    retryCount += 1
                    Logger.warning("Unexpected error fetching metrics, retrying (\(retryCount)/\(maxRetries)): \(error)")

                    // Wait before retrying
                    try? await Task.sleep(nanoseconds: retryDelay)
                } else {
                    // Max retries reached
                    Logger.error("Unexpected error fetching metrics after \(maxRetries) retries: \(error)")
                    self.error = .networkError(error)
                    isLoading = false
                    return
                }
            }
        }

        isLoading = false
    }

    /// Acknowledge metrics and continue to next screen
    /// Returns true if acknowledgement was successful
    func acknowledgeAndContinue() async -> Bool {
        guard let metricsData = metricsData else {
            Logger.warning("Cannot acknowledge metrics: no data available")
            return false
        }

        // Check if already acknowledged
        if metricsData.acknowledged {
            Logger.info("Metrics already acknowledged, proceeding")
            acknowledged = true
            return true
        }

        isLoading = true
        error = nil

        Logger.info("Acknowledging metrics version \(metricsData.metrics.version)")

        do {
            let response = try await metricsService.acknowledgeMetrics(
                version: metricsData.metrics.version,
                metricsComputedAt: metricsData.metrics.computedAtString
            )

            if response.data.acknowledged {
                Logger.info("Successfully acknowledged metrics")
                self.acknowledged = true

                // Update local data with acknowledgement
                self.metricsData = MetricsSummaryData(
                    metrics: metricsData.metrics,
                    explanations: metricsData.explanations,
                    acknowledged: true,
                    acknowledgement: response.data.acknowledgement
                )

                isLoading = false
                return true
            } else {
                Logger.error("Acknowledgement returned false")
                self.error = .invalidResponse
                isLoading = false
                return false
            }
        } catch let metricsError as MetricsError {
            Logger.error("Failed to acknowledge metrics: \(metricsError.localizedDescription)")
            self.error = metricsError
            isLoading = false
            return false
        } catch {
            Logger.error("Unexpected error acknowledging metrics: \(error)")
            self.error = .networkError(error)
            isLoading = false
            return false
        }
    }

    /// Refresh metrics if new data is available
    func refreshMetrics() async {
        Logger.debug("Checking for new metrics")

        do {
            let hasNewMetrics = try await metricsService.checkForNewMetrics(
                lastComputedAt: lastComputedAt
            )

            if hasNewMetrics {
                Logger.info("New metrics available, fetching")
                await fetchMetrics()
            } else {
                Logger.debug("No new metrics available")
            }
        } catch {
            Logger.warning("Error checking for new metrics: \(error)")
        }
    }

    /// Start background refresh monitoring
    func startBackgroundRefresh() {
        // Cancel any existing task
        refreshTask?.cancel()

        // Create new background refresh task
        refreshTask = Task {
            // Check every 30 seconds for new metrics
            while !Task.isCancelled {
                try? await Task.sleep(nanoseconds: 30_000_000_000) // 30 seconds

                if !Task.isCancelled {
                    await refreshMetrics()
                }
            }
        }
    }

    /// Stop background refresh monitoring
    func stopBackgroundRefresh() {
        refreshTask?.cancel()
        refreshTask = nil
    }

    /// Toggle expansion state for a metric
    func toggleMetric(_ metricId: String) {
        withAnimation(.springy) {
            if expandedMetrics.contains(metricId) {
                expandedMetrics.remove(metricId)
            } else {
                expandedMetrics.insert(metricId)
            }
        }
        Logger.debug("Toggled metric \(metricId): \(expandedMetrics.contains(metricId) ? "expanded" : "collapsed")")
    }

    /// Check if a metric is expanded
    func isMetricExpanded(_ metricId: String) -> Bool {
        expandedMetrics.contains(metricId)
    }

    /// Retry loading metrics after an error
    func retry() async {
        Logger.info("Retrying metrics fetch")
        await fetchMetrics()
    }

    /// Clear error state
    func clearError() {
        error = nil
    }

    // MARK: - Computed Properties

    /// Whether the view is in a loading state
    var isLoadingState: Bool {
        isLoading && metricsData == nil
    }

    /// Whether the view has an error
    var hasError: Bool {
        error != nil
    }

    /// Whether metrics can be acknowledged (data available and not already acknowledged)
    var canAcknowledge: Bool {
        guard let metricsData = metricsData else { return false }
        return !metricsData.acknowledged && !isLoading
    }

    // MARK: - Lifecycle

    deinit {
        // Cancel refresh task directly without calling MainActor method
        refreshTask?.cancel()
    }
}
