//
//  PerformanceMonitor.swift
//  GTSD
//
//  Created by Claude on 2025-10-28.
//  Runtime performance monitoring and logging
//

import Foundation
import SwiftUI
import Combine

/// Performance monitoring utility for tracking runtime metrics
///
/// ## Usage
/// ```swift
/// // Track request time
/// let duration = await PerformanceMonitor.track("API Call") {
///     return try await apiClient.request(.endpoint)
/// }
///
/// // Manual timing
/// let timer = PerformanceMonitor.startTimer("Operation")
/// // ... do work ...
/// timer.stop()
/// ```
///
/// ## Features
/// - Automatic timing of operations
/// - SLA violation detection
/// - Memory usage tracking
/// - FPS monitoring
/// - Logging integration
enum PerformanceMonitor {

    // MARK: - SLA Thresholds

    enum SLA {
        static let apiRequest: TimeInterval = 0.3        // 300ms
        static let cacheHit: TimeInterval = 0.05         // 50ms
        static let cacheWrite: TimeInterval = 0.01       // 10ms
        static let jsonDecode: TimeInterval = 0.05       // 50ms
        static let uiUpdate: TimeInterval = 0.1          // 100ms
        static let backgroundRefresh: TimeInterval = 0.3 // 300ms
        static let weightUpdateFlow: TimeInterval = 2.0  // 2000ms
    }

    // MARK: - Timer

    /// Performance timer for manual timing
    final class Timer {
        private let name: String
        private let startTime: CFAbsoluteTime
        private let sla: TimeInterval?
        private var stopped = false

        fileprivate init(name: String, sla: TimeInterval? = nil) {
            self.name = name
            self.startTime = CFAbsoluteTimeGetCurrent()
            self.sla = sla

            Logger.debug("⏱️ Started: \(name)")
        }

        /// Stop the timer and log results
        @discardableResult
        func stop() -> TimeInterval {
            guard !stopped else { return 0 }
            stopped = true

            let duration = CFAbsoluteTimeGetCurrent() - startTime
            let durationMs = duration * 1000

            // Check SLA violation
            if let sla = sla, duration > sla {
                Logger.warning("⚠️ SLA VIOLATION: \(name) took \(String(format: "%.2f", durationMs))ms (SLA: \(String(format: "%.0f", sla * 1000))ms)")
            } else {
                Logger.debug("⏱️ Completed: \(name) in \(String(format: "%.2f", durationMs))ms")
            }

            // Log to analytics/monitoring service here
            logToAnalytics(name: name, duration: duration, slaViolation: sla != nil && duration > sla!)

            return duration
        }

        deinit {
            if !stopped {
                stop()
            }
        }
    }

    // MARK: - Public Methods

    /// Start a performance timer
    /// - Parameters:
    ///   - name: Name of the operation being timed
    ///   - sla: Optional SLA threshold for violation detection
    /// - Returns: Timer that will log when stopped
    static func startTimer(_ name: String, sla: TimeInterval? = nil) -> Timer {
        return Timer(name: name, sla: sla)
    }

    /// Track an async operation's performance
    /// - Parameters:
    ///   - name: Name of the operation
    ///   - sla: Optional SLA threshold
    ///   - operation: Async operation to track
    /// - Returns: Result of the operation and its duration
    static func track<T>(
        _ name: String,
        sla: TimeInterval? = nil,
        operation: () async throws -> T
    ) async rethrows -> T {
        let timer = startTimer(name, sla: sla)
        defer { timer.stop() }
        return try await operation()
    }

    /// Track a synchronous operation's performance
    /// - Parameters:
    ///   - name: Name of the operation
    ///   - sla: Optional SLA threshold
    ///   - operation: Synchronous operation to track
    /// - Returns: Result of the operation
    static func track<T>(
        _ name: String,
        sla: TimeInterval? = nil,
        operation: () throws -> T
    ) rethrows -> T {
        let timer = startTimer(name, sla: sla)
        defer { timer.stop() }
        return try operation()
    }

    // MARK: - Memory Monitoring

    /// Get current memory usage in MB
    static func getCurrentMemoryUsage() -> Double {
        var info = mach_task_basic_info()
        var count = mach_msg_type_number_t(MemoryLayout<mach_task_basic_info>.size) / 4

        let kerr: kern_return_t = withUnsafeMutablePointer(to: &info) {
            $0.withMemoryRebound(to: integer_t.self, capacity: 1) {
                task_info(
                    mach_task_self_,
                    task_flavor_t(MACH_TASK_BASIC_INFO),
                    $0,
                    &count
                )
            }
        }

        guard kerr == KERN_SUCCESS else {
            Logger.error("Failed to get memory usage")
            return 0
        }

        let usedMB = Double(info.resident_size) / 1024 / 1024
        return usedMB
    }

    /// Log current memory usage
    static func logMemoryUsage(_ context: String = "") {
        let usage = getCurrentMemoryUsage()
        let contextStr = context.isEmpty ? "" : " [\(context)]"
        Logger.debug("💾 Memory Usage\(contextStr): \(String(format: "%.2f", usage)) MB")

        // Check if over baseline threshold
        if usage > 50.0 {
            Logger.warning("⚠️ Memory usage exceeds 50MB baseline: \(String(format: "%.2f", usage)) MB")
        }
    }

    // MARK: - Private Helpers

    private static func logToAnalytics(name: String, duration: TimeInterval, slaViolation: Bool) {
        // TODO: Integrate with analytics service (Firebase, Mixpanel, etc.)
        // For now, just use OSLog which can be viewed in Instruments

        #if DEBUG
        // In debug, print to console for visibility
        let durationMs = duration * 1000
        print("[PERF] \(name): \(String(format: "%.2f", durationMs))ms \(slaViolation ? "⚠️ SLA VIOLATION" : "")")
        #endif
    }
}

// MARK: - FPS Monitor

/// Real-time FPS monitoring for detecting frame drops
@MainActor
final class FPSMonitor: ObservableObject {
    @Published private(set) var currentFPS: Double = 60.0
    @Published private(set) var hasFrameDrops: Bool = false

    private var displayLink: CADisplayLink?
    private var lastTimestamp: CFTimeInterval = 0
    private var fpsValues: [Double] = []
    private let targetFPS: Double = 60.0
    private let frameDropThreshold: Double = 55.0

    init() {
        startMonitoring()
    }

    private func startMonitoring() {
        displayLink = CADisplayLink(target: self, selector: #selector(update))
        displayLink?.add(to: .main, forMode: .common)
    }

    @objc private func update(displayLink: CADisplayLink) {
        if lastTimestamp == 0 {
            lastTimestamp = displayLink.timestamp
            return
        }

        let elapsed = displayLink.timestamp - lastTimestamp
        if elapsed > 0 {
            let fps = 1.0 / elapsed
            lastTimestamp = displayLink.timestamp

            // Keep rolling average of last 10 frames
            fpsValues.append(fps)
            if fpsValues.count > 10 {
                fpsValues.removeFirst()
            }

            let avgFPS = fpsValues.reduce(0, +) / Double(fpsValues.count)
            currentFPS = avgFPS

            // Check for frame drops
            hasFrameDrops = avgFPS < frameDropThreshold

            if hasFrameDrops {
                Logger.warning("📉 Frame drops detected: \(String(format: "%.1f", avgFPS)) FPS")
            }
        }
    }

    nonisolated func stopMonitoring() {
        _Concurrency.Task { @MainActor [weak self] in
            self?.displayLink?.invalidate()
            self?.displayLink = nil
        }
    }

    deinit {
        stopMonitoring()
    }
}

// MARK: - Performance Overlay View

/// Debug overlay showing real-time performance metrics
struct PerformanceOverlay: View {
    @StateObject private var fpsMonitor = FPSMonitor()
    @State private var memoryUsage: Double = 0
    @State private var updateTimer: Timer?

    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            HStack(spacing: 8) {
                Circle()
                    .fill(fpsMonitor.hasFrameDrops ? Color.red : Color.green)
                    .frame(width: 8, height: 8)

                Text("FPS: \(Int(fpsMonitor.currentFPS))")
                    .font(.system(size: 12, weight: .bold, design: .monospaced))
                    .foregroundColor(fpsMonitor.hasFrameDrops ? .red : .green)
            }

            Text("MEM: \(String(format: "%.1f", memoryUsage)) MB")
                .font(.system(size: 12, weight: .bold, design: .monospaced))
                .foregroundColor(memoryUsage > 50 ? .orange : .green)
        }
        .padding(8)
        .background(Color.black.opacity(0.7))
        .cornerRadius(8)
        .onAppear {
            updateMemory()
            updateTimer = Timer.scheduledTimer(withTimeInterval: 1.0, repeats: true) { _ in
                updateMemory()
            }
        }
        .onDisappear {
            updateTimer?.invalidate()
            fpsMonitor.stopMonitoring()
        }
    }

    private func updateMemory() {
        memoryUsage = PerformanceMonitor.getCurrentMemoryUsage()
    }
}

// MARK: - View Modifier

extension View {
    /// Add performance overlay for debugging
    /// Only shows in DEBUG builds
    func performanceOverlay(enabled: Bool = true) -> some View {
        #if DEBUG
        if enabled {
            return AnyView(
                overlay(alignment: .topTrailing) {
                    PerformanceOverlay()
                        .padding(8)
                }
            )
        }
        #endif
        return AnyView(self)
    }
}
