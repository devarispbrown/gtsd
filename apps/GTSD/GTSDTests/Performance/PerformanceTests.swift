//
//  PerformanceTests.swift
//  GTSDTests
//
//  Created by Claude on 2025-10-28.
//  Performance testing suite for critical app flows
//

import XCTest
@testable import GTSD

/// Comprehensive performance tests for critical app operations
///
/// ## Test Coverage
/// - Plan fetch performance (cache hit and miss)
/// - JSON decoding performance
/// - Cache operations performance
/// - Weight update flow end-to-end
/// - Memory usage and leak detection
///
/// ## Performance Targets
/// - Cache hit: < 50ms
/// - API call: < 300ms (backend SLA)
/// - JSON decode: < 50ms
/// - Cache update: < 10ms
/// - Weight update → Plan refresh: < 2000ms (p95)
///
/// ## Usage
/// Run with: `xcodebuild test -scheme GTSD -only-testing:GTSDTests/PerformanceTests`
/// Set baselines in Xcode: Product > Perform Action > Set Baseline
@MainActor
final class PerformanceTests: XCTestCase {

    // MARK: - Test Setup

    private var mockService: MockPlanService!
    private var planStore: PlanStore!

    override func setUp() async throws {
        try await super.setUp()
        mockService = MockPlanService()
        planStore = PlanStore(
            planService: mockService,
            notificationManager: NotificationManager.shared
        )
    }

    override func tearDown() async throws {
        planStore = nil
        mockService = nil
        try await super.tearDown()
    }

    // MARK: - Plan Fetch Performance

    /// Test plan fetch with cache miss (API call)
    /// Target: < 300ms (backend SLA)
    func testPlanFetchPerformance_CacheMiss() async throws {
        // Pre-conditions: No cached data
        planStore = PlanStore(
            planService: mockService,
            notificationManager: NotificationManager.shared
        )

        let options = XCTMeasureOptions()
        options.iterationCount = 10

        measure(metrics: [XCTClockMetric()], options: options) {
            let expectation = self.expectation(description: "Plan fetched")

            _Concurrency.Task { @MainActor in
                await planStore.fetchPlan(forceRecompute: true)
                expectation.fulfill()
            }

            wait(for: [expectation], timeout: 5.0)
        }

        // Expected: Average < 300ms
        // This baseline should be set in Xcode: Product > Perform Action > Set Baseline
    }

    /// Test plan fetch with cache hit
    /// Target: < 50ms
    func testPlanFetchPerformance_CacheHit() async throws {
        // Pre-populate cache
        await planStore.fetchPlan(forceRecompute: false)

        // Wait a moment for cache to settle
        try await _Concurrency.Task.sleep(nanoseconds: 100_000_000) // 100ms

        let options = XCTMeasureOptions()
        options.iterationCount = 10

        measure(metrics: [XCTClockMetric()], options: options) {
            let expectation = self.expectation(description: "Cache hit")

            _Concurrency.Task { @MainActor in
                // Second fetch should hit cache (cache is valid for 1 hour)
                await planStore.fetchPlan(forceRecompute: false)
                expectation.fulfill()
            }

            wait(for: [expectation], timeout: 1.0)
        }

        // Expected: Average < 50ms
    }

    // MARK: - JSON Decoding Performance

    /// Test JSON decoding performance
    /// Target: < 50ms
    func testJSONDecodingPerformance() throws {
        let jsonData = MockData.planGenerationResponseJSON.data(using: .utf8)!

        let options = XCTMeasureOptions()
        options.iterationCount = 100 // More iterations for fast operation

        measure(metrics: [XCTClockMetric()], options: options) {
            let decoder = JSONDecoder()
            decoder.dateDecodingStrategy = .iso8601
            _ = try? decoder.decode(PlanGenerationResponse.self, from: jsonData)
        }

        // Expected: Average < 5ms
    }

    /// Test JSON encoding performance
    /// Target: < 50ms
    func testJSONEncodingPerformance() throws {
        let planData = MockData.samplePlanGenerationData

        let options = XCTMeasureOptions()
        options.iterationCount = 100

        measure(metrics: [XCTClockMetric()], options: options) {
            let encoder = JSONEncoder()
            encoder.dateEncodingStrategy = .iso8601
            _ = try? encoder.encode(planData)
        }

        // Expected: Average < 5ms
    }

    // MARK: - Cache Operations Performance

    /// Test cache write performance
    /// Target: < 10ms
    func testCacheWritePerformance() async throws {
        let planData = MockData.samplePlanGenerationData

        let options = XCTMeasureOptions()
        options.iterationCount = 50

        measure(metrics: [XCTClockMetric()], options: options) {
            // Simulate cache write via UserDefaults
            let encoder = JSONEncoder()
            encoder.dateEncodingStrategy = .iso8601

            if let data = try? encoder.encode(planData) {
                UserDefaults.standard.set(data, forKey: "test.cache.write")
            }
        }

        // Cleanup
        UserDefaults.standard.removeObject(forKey: "test.cache.write")

        // Expected: Average < 10ms
    }

    /// Test cache read performance
    /// Target: < 10ms
    func testCacheReadPerformance() throws {
        // Pre-populate cache
        let planData = MockData.samplePlanGenerationData
        let encoder = JSONEncoder()
        encoder.dateEncodingStrategy = .iso8601

        if let data = try? encoder.encode(planData) {
            UserDefaults.standard.set(data, forKey: "test.cache.read")
        }

        let options = XCTMeasureOptions()
        options.iterationCount = 100

        measure(metrics: [XCTClockMetric()], options: options) {
            if let data = UserDefaults.standard.data(forKey: "test.cache.read") {
                let decoder = JSONDecoder()
                decoder.dateDecodingStrategy = .iso8601
                _ = try? decoder.decode(PlanGenerationData.self, from: data)
            }
        }

        // Cleanup
        UserDefaults.standard.removeObject(forKey: "test.cache.read")

        // Expected: Average < 10ms
    }

    // MARK: - End-to-End Performance

    /// Test complete weight update flow
    /// Target: < 2000ms (p95)
    func testWeightUpdateToPlanRefreshPerformance() async throws {
        // This simulates the complete flow:
        // 1. User updates weight
        // 2. API call to update profile
        // 3. Plan recomputation triggered
        // 4. New plan data fetched
        // 5. UI updates with new data

        let options = XCTMeasureOptions()
        options.iterationCount = 5 // Fewer iterations for complex flow

        measure(metrics: [XCTClockMetric()], options: options) {
            let expectation = self.expectation(description: "Weight update complete")

            _Concurrency.Task { @MainActor in
                // Simulate weight update and plan recomputation
                await planStore.recomputePlan()
                expectation.fulfill()
            }

            wait(for: [expectation], timeout: 5.0)
        }

        // Expected: Average < 1500ms, p95 < 2000ms
    }

    // MARK: - Memory Performance

    /// Test memory usage during repeated plan fetches
    /// Target: Growth < 5MB over 50 fetches
    func testMemoryUsageDuringRepeatedFetches() async throws {
        let options = XCTMeasureOptions()
        options.iterationCount = 1

        measure(metrics: [XCTMemoryMetric()], options: options) {
            let expectation = self.expectation(description: "Repeated fetches complete")

            _Concurrency.Task { @MainActor in
                // Fetch plan 50 times
                for _ in 0..<50 {
                    await planStore.fetchPlan(forceRecompute: true)
                }
                expectation.fulfill()
            }

            wait(for: [expectation], timeout: 30.0)
        }

        // Expected: Memory growth < 5MB
        // This will be visible in Xcode's Memory Report
    }

    /// Test for memory leaks in PlanStore
    func testPlanStoreMemoryLeaks() async throws {
        weak var weakStore: PlanStore?

        autoreleasepool {
            let store = PlanStore(
                planService: mockService,
                notificationManager: NotificationManager.shared
            )
            weakStore = store

            // Use store
            _Concurrency.Task { @MainActor in
                await store.fetchPlan()
            }
        }

        // Wait for any async operations to complete
        try await _Concurrency.Task.sleep(nanoseconds: 500_000_000) // 500ms

        // After autoreleasepool, weak reference should be nil
        XCTAssertNil(weakStore, "PlanStore should deallocate - possible memory leak detected")
    }

    /// Test for memory leaks in PlanService
    func testPlanServiceMemoryLeaks() async throws {
        weak var weakService: MockPlanService?

        autoreleasepool {
            let service = MockPlanService()
            weakService = service

            // Use service
            _Concurrency.Task {
                _ = try? await service.generatePlan(forceRecompute: false)
            }
        }

        // Wait for any async operations to complete
        try await _Concurrency.Task.sleep(nanoseconds: 500_000_000) // 500ms

        // After autoreleasepool, weak reference should be nil
        XCTAssertNil(weakService, "PlanService should deallocate - possible memory leak detected")
    }

    // MARK: - Background Refresh Performance

    /// Test silent background refresh
    /// Target: < 300ms, no UI blocking
    func testBackgroundRefreshPerformance() async throws {
        // Pre-populate cache with old data
        await planStore.fetchPlan()

        // Simulate cache being 31 minutes old (triggers background refresh)
        // Note: This would require modifying PlanStore to expose lastUpdated for testing
        // For now, we'll test the recompute path

        let options = XCTMeasureOptions()
        options.iterationCount = 5

        measure(metrics: [XCTClockMetric()], options: options) {
            let expectation = self.expectation(description: "Background refresh complete")

            _Concurrency.Task.detached {
                // Background refresh should not block main thread
                _ = try? await self.mockService.generatePlan(forceRecompute: false)
                expectation.fulfill()
            }

            wait(for: [expectation], timeout: 2.0)
        }

        // Expected: Average < 300ms
    }

    // MARK: - Validation Performance

    /// Test plan data validation performance
    /// Target: < 1ms
    func testPlanDataValidationPerformance() throws {
        let planData = MockData.samplePlanGenerationData

        let options = XCTMeasureOptions()
        options.iterationCount = 1000 // Many iterations for very fast operation

        measure(metrics: [XCTClockMetric()], options: options) {
            _ = planData.isValid()
            _ = planData.targets.isValid()
            _ = planData.hasSignificantChanges()
        }

        // Expected: Average < 1ms
    }
}

// MARK: - Mock Data

private enum MockData {
    static let planGenerationResponseJSON = """
    {
        "success": true,
        "data": {
            "plan": {
                "id": 1,
                "userId": 123,
                "name": "Weight Loss Plan",
                "description": "Personalized plan for sustainable weight loss",
                "startDate": "2025-10-01T00:00:00Z",
                "endDate": "2025-12-31T23:59:59Z",
                "status": "active"
            },
            "targets": {
                "bmr": 1650,
                "tdee": 2200,
                "calorieTarget": 1700,
                "proteinTarget": 140,
                "waterTarget": 2500,
                "weeklyRate": 0.5,
                "estimatedWeeks": 12,
                "projectedDate": "2025-12-31T00:00:00Z"
            },
            "whyItWorks": {
                "calorieTarget": {
                    "title": "Calorie Target",
                    "explanation": "Your calorie target is designed to create a sustainable deficit.",
                    "science": "A 500 calorie daily deficit leads to approximately 1 pound of fat loss per week."
                },
                "proteinTarget": {
                    "title": "Protein Target",
                    "explanation": "Higher protein intake helps preserve muscle mass during weight loss.",
                    "science": "Research shows 0.8-1g per pound of body weight is optimal for muscle preservation."
                },
                "waterTarget": {
                    "title": "Water Target",
                    "explanation": "Adequate hydration supports metabolism and reduces hunger.",
                    "science": "Studies show drinking water before meals can reduce calorie intake by 13%."
                },
                "weeklyRate": {
                    "title": "Weekly Rate",
                    "explanation": "A moderate rate ensures sustainable fat loss while preserving muscle.",
                    "science": "Losing 0.5-1% of body weight per week is considered optimal and sustainable."
                }
            },
            "recomputed": false,
            "previousTargets": null
        }
    }
    """

    static let samplePlanGenerationData: PlanGenerationData = {
        let jsonData = planGenerationResponseJSON.data(using: .utf8)!
        let decoder = JSONDecoder()
        decoder.dateDecodingStrategy = .iso8601
        let response = try! decoder.decode(PlanGenerationResponse.self, from: jsonData)
        return response.data
    }()
}
