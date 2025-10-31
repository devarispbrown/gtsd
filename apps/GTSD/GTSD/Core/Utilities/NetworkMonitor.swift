//
//  NetworkMonitor.swift
//  GTSD
//
//  Created by Claude on 2025-10-28.
//

import Foundation
import Network
import Combine
import SwiftUI

/// Monitor network connectivity status
///
/// NetworkMonitor observes network reachability and notifies the app
/// of connectivity changes. Supports both cellular and WiFi connections.
///
/// ## Usage Example
/// ```swift
/// @StateObject private var networkMonitor = NetworkMonitor.shared
///
/// var body: some View {
///     VStack {
///         if !networkMonitor.isConnected {
///             OfflineBanner()
///         }
///         // Your content
///     }
/// }
/// ```
@MainActor
final class NetworkMonitor: ObservableObject {

    // MARK: - Singleton

    static let shared = NetworkMonitor()

    // MARK: - Published State

    @Published private(set) var isConnected: Bool = true
    @Published private(set) var connectionType: ConnectionType = .unknown

    // MARK: - Private Properties

    private let monitor = NWPathMonitor()
    private let queue = DispatchQueue(label: "com.gtsd.networkmonitor")

    // MARK: - Connection Type

    enum ConnectionType {
        case wifi
        case cellular
        case ethernet
        case unknown
    }

    // MARK: - Initialization

    private init() {
        startMonitoring()
    }

    deinit {
        // Note: monitor.cancel() is called directly here since deinit cannot be MainActor-isolated
        monitor.cancel()
    }

    // MARK: - Public Methods

    func startMonitoring() {
        monitor.pathUpdateHandler = { [weak self] path in
            _Concurrency.Task { @MainActor [weak self] in
                self?.isConnected = path.status == .satisfied
                self?.connectionType = self?.determineConnectionType(from: path) ?? .unknown

                if path.status == .satisfied {
                    Logger.log("Network connection restored: \(self?.connectionType ?? .unknown)", level: .info)
                } else {
                    Logger.log("Network connection lost", level: .warning)
                }
            }
        }

        monitor.start(queue: queue)
        Logger.log("Network monitoring started", level: .info)
    }

    func stopMonitoring() {
        monitor.cancel()
        Logger.log("Network monitoring stopped", level: .info)
    }

    // MARK: - Private Methods

    private func determineConnectionType(from path: NWPath) -> ConnectionType {
        if path.usesInterfaceType(.wifi) {
            return .wifi
        } else if path.usesInterfaceType(.cellular) {
            return .cellular
        } else if path.usesInterfaceType(.wiredEthernet) {
            return .ethernet
        } else {
            return .unknown
        }
    }
}

// MARK: - Offline Banner Component

struct OfflineBanner: View {
    @StateObject private var networkMonitor = NetworkMonitor.shared
    @State private var isVisible = false

    var body: some View {
        if !networkMonitor.isConnected {
            HStack(spacing: Spacing.sm) {
                Image(systemName: "wifi.slash")
                    .font(.system(size: IconSize.sm))
                    .foregroundColor(.white)

                Text("No Internet Connection")
                    .font(.bodyMedium)
                    .foregroundColor(.white)

                Spacer()

                Text("Offline Mode")
                    .font(.labelSmall)
                    .foregroundColor(.white.opacity(0.8))
            }
            .padding(.horizontal, Spacing.md)
            .padding(.vertical, Spacing.sm)
            .background(Color.red)
            .offset(y: isVisible ? 0 : -100)
            .animation(.spring(response: 0.4, dampingFraction: 0.8), value: isVisible)
            .onAppear {
                withAnimation {
                    isVisible = true
                }
                HapticManager.warning()
            }
            .onDisappear {
                isVisible = false
            }
        }
    }
}

// MARK: - Network Aware Modifier

struct NetworkAwareModifier: ViewModifier {
    @StateObject private var networkMonitor = NetworkMonitor.shared
    let showBanner: Bool
    let onReconnect: (() -> Void)?

    @State private var wasDisconnected = false

    func body(content: Content) -> some View {
        VStack(spacing: 0) {
            if showBanner {
                OfflineBanner()
            }

            content
        }
        .onChange(of: networkMonitor.isConnected) { isConnected in
            if isConnected && wasDisconnected {
                // Network restored
                HapticManager.success()
                onReconnect?()
                wasDisconnected = false
            } else if !isConnected {
                wasDisconnected = true
            }
        }
    }
}

extension View {
    /// Add network monitoring with optional offline banner
    func networkAware(showBanner: Bool = true, onReconnect: (() -> Void)? = nil) -> some View {
        modifier(NetworkAwareModifier(showBanner: showBanner, onReconnect: onReconnect))
    }
}

// MARK: - Preview

#Preview {
    VStack(spacing: Spacing.lg) {
        OfflineBanner()

        Text("App Content")
            .font(.headlineLarge)

        Spacer()
    }
    .networkAware()
}
