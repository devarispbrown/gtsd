//
//  PlanStore.swift
//  GTSD
//
//  Created by Claude on 2025-10-28.
//

import Foundation
import Combine
import SwiftUI

/// Centralized plan state management with intelligent caching
///
/// PlanStore manages the lifecycle of plan data, including:
/// - Fetching from API with automatic caching
/// - Cache invalidation on user data changes
/// - Optimistic updates for better UX
/// - Error recovery and retry logic
///
/// ## Thread Safety
/// All methods must be called from MainActor.
///
/// ## Cache Strategy
/// Two-tier caching:
/// 1. Memory cache (instant access)
/// 2. Disk cache via UserDefaults (survives app restart)
/// Cache TTL: 1 hour
///
/// ## Usage Example
/// ```swift
/// let planStore = PlanStore(
///     planService: ServiceContainer.shared.planService
/// )
///
/// // Fetch plan (uses cache if valid)
/// await planStore.fetchPlan()
///
/// // Force recompute (after weight update)
/// await planStore.recomputePlan()
/// ```
@MainActor
final class PlanStore: ObservableObject {

    // MARK: - Published State

    @Published private(set) var currentPlan: PlanGenerationData?
    @Published private(set) var isLoading: Bool = false
    @Published private(set) var error: PlanError?
    @Published private(set) var lastUpdated: Date?

    // MARK: - Dependencies

    private let planService: any PlanServiceProtocol
    private let notificationManager: any NotificationManaging
    private let userDefaults: UserDefaults

    // MARK: - Constants

    private enum CacheKeys {
        static let planData = "gtsd.cache.planData"
        static let lastUpdated = "gtsd.cache.planLastUpdated"
    }

    private let cacheExpirationInterval: TimeInterval = 3600 // 1 hour

    // MARK: - Initialization

    init(
        planService: any PlanServiceProtocol,
        notificationManager: any NotificationManaging = NotificationManager.shared,
        userDefaults: UserDefaults = .standard
    ) {
        self.planService = planService
        self.notificationManager = notificationManager
        self.userDefaults = userDefaults

        // Load from cache on init
        loadFromCache()

        Logger.log("PlanStore initialized", level: .info)
    }

    // MARK: - Public Methods

    /// Fetch plan with automatic cache management
    /// - Parameter forceRecompute: Force recomputation even if cache is valid
    func fetchPlan(forceRecompute: Bool = false) async {
        // Check if cache is still valid
        if !forceRecompute && isCacheValid() && currentPlan != nil {
            Logger.log("Using cached plan data", level: .debug)

            // Silently refresh in background if cache is older than 30 minutes
            if let lastUpdated = lastUpdated,
               Date().timeIntervalSince(lastUpdated) > 1800 {
                _Concurrency.Task.detached { [weak self] in
                    await self?.silentRefresh()
                }
            }

            return
        }

        isLoading = true
        error = nil

        do {
            let planData = try await planService.generatePlan(forceRecompute: forceRecompute)

            // Check for significant changes and trigger notification if needed
            if let previousTargets = planData.previousTargets,
               planData.hasSignificantChanges() {
                Logger.log("Plan has significant changes, triggering notification", level: .info)

                // Trigger notification on background thread to not block UI
                _Concurrency.Task.detached { [weak self] in
                    await self?.notificationManager.notifyPlanUpdated(
                        oldTargets: previousTargets,
                        newTargets: planData.targets
                    )
                }
            }

            // Update state
            self.currentPlan = planData
            self.lastUpdated = Date()

            // Persist to cache
            saveToCache(planData)

            Logger.log("Plan fetched successfully", level: .info)
        } catch let planError as PlanError {
            self.error = planError
            Logger.error("Failed to fetch plan: \(planError)")

            // If API fails and we have cached data, keep showing it
            if currentPlan != nil {
                self.error = .networkError("Showing last saved plan")
            }
        } catch {
            self.error = .unknown(error.localizedDescription)
            Logger.error("Unexpected error fetching plan: \(error)")
        }

        isLoading = false
    }

    /// Force recompute plan (after weight update, etc.)
    func recomputePlan() async {
        Logger.log("Force recomputing plan", level: .info)
        await fetchPlan(forceRecompute: true)
    }

    /// Invalidate cache and reload
    func refresh() async {
        Logger.log("Refreshing plan (invalidating cache)", level: .info)
        invalidateCache()
        await fetchPlan(forceRecompute: false)
    }

    /// Clear error state
    func clearError() {
        error = nil
    }

    /// Check if targets have changed significantly from previous
    func hasSignificantChanges() -> Bool {
        return currentPlan?.hasSignificantChanges() ?? false
    }

    // MARK: - Cache Management

    private func loadFromCache() {
        let timer = PerformanceMonitor.startTimer("Cache Load", sla: PerformanceMonitor.SLA.cacheHit)
        defer { timer.stop() }

        guard let data = userDefaults.data(forKey: CacheKeys.planData) else {
            Logger.log("No cached plan data found", level: .debug)
            return
        }

        do {
            let decoder = JSONDecoder()
            decoder.dateDecodingStrategy = .iso8601

            let cachedPlan = try decoder.decode(PlanGenerationData.self, from: data)
            self.currentPlan = cachedPlan

            if let lastUpdatedTimestamp = userDefaults.object(forKey: CacheKeys.lastUpdated) as? TimeInterval {
                self.lastUpdated = Date(timeIntervalSince1970: lastUpdatedTimestamp)
            }

            Logger.log("Loaded plan from cache", level: .info)
        } catch {
            Logger.error("Failed to decode cached plan: \(error)")
            invalidateCache()
        }
    }

    private func saveToCache(_ plan: PlanGenerationData) {
        let timer = PerformanceMonitor.startTimer("Cache Write", sla: PerformanceMonitor.SLA.cacheWrite)
        defer { timer.stop() }

        do {
            let encoder = JSONEncoder()
            encoder.dateEncodingStrategy = .iso8601

            let data = try encoder.encode(plan)
            userDefaults.set(data, forKey: CacheKeys.planData)
            userDefaults.set(Date().timeIntervalSince1970, forKey: CacheKeys.lastUpdated)

            Logger.log("Saved plan to cache", level: .debug)
        } catch {
            Logger.error("Failed to cache plan: \(error)")
        }
    }

    private func isCacheValid() -> Bool {
        guard let lastUpdated = lastUpdated else {
            return false
        }

        let elapsed = Date().timeIntervalSince(lastUpdated)
        return elapsed < cacheExpirationInterval
    }

    private func invalidateCache() {
        userDefaults.removeObject(forKey: CacheKeys.planData)
        userDefaults.removeObject(forKey: CacheKeys.lastUpdated)
        self.lastUpdated = nil
        Logger.log("Cache invalidated", level: .debug)
    }

    /// Silently refresh data in the background (don't show loading state)
    private func silentRefresh() async {
        Logger.log("Silent background refresh", level: .debug)

        do {
            let planData = try await planService.generatePlan(forceRecompute: false)

            await MainActor.run {
                self.currentPlan = planData
                self.lastUpdated = Date()
                saveToCache(planData)
            }

            Logger.log("Silent refresh completed", level: .debug)
        } catch {
            Logger.error("Silent refresh failed (non-critical): \(error)")
            // Don't update error state for silent refresh failures
        }
    }

    // MARK: - Computed Properties

    /// Time since last update in readable format
    var timeSinceUpdate: String? {
        guard let lastUpdated = lastUpdated else {
            return nil
        }

        let elapsed = Date().timeIntervalSince(lastUpdated)
        let minutes = Int(elapsed / 60)

        if minutes < 1 {
            return "Just now"
        } else if minutes < 60 {
            return "\(minutes) minute\(minutes == 1 ? "" : "s") ago"
        } else {
            let hours = minutes / 60
            return "\(hours) hour\(hours == 1 ? "" : "s") ago"
        }
    }

    /// Check if current data is stale (> 1 hour old)
    var isStale: Bool {
        guard let lastUpdated = lastUpdated else {
            return true
        }

        let elapsed = Date().timeIntervalSince(lastUpdated)
        return elapsed > cacheExpirationInterval
    }
}

// MARK: - SwiftUI Environment

private struct PlanStoreKey: EnvironmentKey {
    static let defaultValue: PlanStore? = nil
}

extension EnvironmentValues {
    var planStore: PlanStore? {
        get { self[PlanStoreKey.self] }
        set { self[PlanStoreKey.self] = newValue }
    }
}

extension View {
    /// Inject plan store into environment
    func planStore(_ store: PlanStore) -> some View {
        environment(\.planStore, store)
    }
}
