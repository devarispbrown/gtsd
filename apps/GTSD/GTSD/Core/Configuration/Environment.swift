//
//  Environment.swift
//  GTSD
//
//  Created by Claude on 2025-10-27.
//

import Foundation

/// Application environment configuration
/// Manages different build configurations (dev, staging, production)
enum AppEnvironment {
    case development
    case staging
    case production

    // MARK: - Current Environment

    /// Current active environment based on build configuration
    static var current: AppEnvironment {
        #if DEBUG
            return .development
        #elseif STAGING
            return .staging
        #else
            return .production
        #endif
    }

    // MARK: - Environment Properties

    /// Display name for the environment
    var name: String {
        switch self {
        case .development:
            return "Development"
        case .staging:
            return "Staging"
        case .production:
            return "Production"
        }
    }

    /// Short identifier for logging
    var identifier: String {
        switch self {
        case .development:
            return "dev"
        case .staging:
            return "staging"
        case .production:
            return "prod"
        }
    }

    /// Whether this is a production build
    var isProduction: Bool {
        return self == .production
    }

    /// Whether debug logging is enabled
    var debugLoggingEnabled: Bool {
        switch self {
        case .development, .staging:
            return true
        case .production:
            return false
        }
    }

    /// Whether analytics are enabled
    var analyticsEnabled: Bool {
        switch self {
        case .development:
            return false
        case .staging, .production:
            return true
        }
    }

    /// Whether crash reporting is enabled
    var crashReportingEnabled: Bool {
        switch self {
        case .development:
            return false
        case .staging, .production:
            return true
        }
    }

    // MARK: - API Configuration

    /// Base URL for API requests
    var apiBaseURL: String {
        // Check for environment variable override first
        if let envURL = ProcessInfo.processInfo.environment["API_BASE_URL"] {
            return envURL
        }

        switch self {
        case .development:
            return "http://localhost:3000"
        case .staging:
            return "https://staging-api.gtsd.app"
        case .production:
            return "https://api.gtsd.app"
        }
    }

    /// API host for certificate pinning
    var apiHost: String {
        guard let url = URL(string: apiBaseURL),
              let host = url.host else {
            return "localhost"
        }
        return host
    }

    /// Whether to enforce certificate pinning
    var enforceCertificatePinning: Bool {
        switch self {
        case .development, .staging:
            return false
        case .production:
            return true
        }
    }

    /// Pinned certificate public key hashes (SHA256)
    /// These should be updated when production certificates are rotated
    var pinnedPublicKeyHashes: Set<String> {
        switch self {
        case .production:
            // TODO: Replace with actual production certificate hashes
            // Extract hashes using: CertificatePinner.extractPublicKeyHash(fromCertificate: "certificate_name")
            return [
                // Primary certificate hash
                "your_production_cert_hash_here",
                // Backup certificate hash (for rotation)
                "your_backup_cert_hash_here"
            ]
        case .development, .staging:
            return []
        }
    }

    // MARK: - Security Configuration

    /// Request timeout interval in seconds
    var requestTimeout: TimeInterval {
        switch self {
        case .development:
            return 60 // Longer timeout for debugging
        case .staging, .production:
            return 30
        }
    }

    /// Resource timeout interval in seconds
    var resourceTimeout: TimeInterval {
        switch self {
        case .development:
            return 600 // Longer timeout for debugging
        case .staging, .production:
            return 300
        }
    }

    /// Whether to enable request signing
    var requestSigningEnabled: Bool {
        switch self {
        case .development:
            return false // Disabled for easier debugging
        case .staging, .production:
            return true
        }
    }

    /// HMAC signing key for request signing
    /// In production, this should be loaded from secure storage or keychain
    var requestSigningKey: String? {
        switch self {
        case .development:
            return nil
        case .staging:
            // Staging key - should be different from production
            return ProcessInfo.processInfo.environment["SIGNING_KEY_STAGING"]
        case .production:
            // Production key - load from keychain or configuration
            return ProcessInfo.processInfo.environment["SIGNING_KEY_PRODUCTION"]
        }
    }

    // MARK: - Cache Configuration

    /// Cache memory capacity in bytes
    var cacheMemoryCapacity: Int {
        switch self {
        case .development:
            return 20_000_000 // 20 MB for debugging
        case .staging, .production:
            return 10_000_000 // 10 MB
        }
    }

    /// Cache disk capacity in bytes
    var cacheDiskCapacity: Int {
        switch self {
        case .development:
            return 100_000_000 // 100 MB for debugging
        case .staging, .production:
            return 50_000_000 // 50 MB
        }
    }

    /// Whether to use encrypted cache
    var useEncryptedCache: Bool {
        switch self {
        case .development:
            return false // Disabled for easier debugging
        case .staging, .production:
            return true
        }
    }

    // MARK: - Feature Flags

    /// Whether to show debug UI elements
    var showDebugUI: Bool {
        switch self {
        case .development, .staging:
            return true
        case .production:
            return false
        }
    }

    /// Whether to enable mock data for testing
    var mockDataEnabled: Bool {
        switch self {
        case .development:
            return ProcessInfo.processInfo.environment["MOCK_DATA"] == "true"
        case .staging, .production:
            return false
        }
    }

    /// Whether to enable network logging
    var networkLoggingEnabled: Bool {
        switch self {
        case .development:
            return true
        case .staging:
            return ProcessInfo.processInfo.environment["NETWORK_LOGGING"] == "true"
        case .production:
            return false
        }
    }
}

// MARK: - Environment Info

extension AppEnvironment {

    /// Get comprehensive environment information for logging
    static func printEnvironmentInfo() {
        let env = AppEnvironment.current
        let info = """

        ========================================
        GTSD iOS App - Environment Configuration
        ========================================
        Environment:              \(env.name)
        API Base URL:             \(env.apiBaseURL)
        API Host:                 \(env.apiHost)
        Certificate Pinning:      \(env.enforceCertificatePinning ? "Enabled" : "Disabled")
        Request Signing:          \(env.requestSigningEnabled ? "Enabled" : "Disabled")
        Encrypted Cache:          \(env.useEncryptedCache ? "Enabled" : "Disabled")
        Debug Logging:            \(env.debugLoggingEnabled ? "Enabled" : "Disabled")
        Network Logging:          \(env.networkLoggingEnabled ? "Enabled" : "Disabled")
        Analytics:                \(env.analyticsEnabled ? "Enabled" : "Disabled")
        Crash Reporting:          \(env.crashReportingEnabled ? "Enabled" : "Disabled")
        Request Timeout:          \(env.requestTimeout)s
        Cache Memory:             \(env.cacheMemoryCapacity / 1_000_000) MB
        Cache Disk:               \(env.cacheDiskCapacity / 1_000_000) MB
        ========================================

        """
        Logger.log(info, level: .info)
    }
}

// MARK: - Build Configuration Extensions

extension AppEnvironment {

    /// Bundle identifier for current environment
    var bundleIdentifier: String {
        switch self {
        case .development:
            return "com.gtsd.app.dev"
        case .staging:
            return "com.gtsd.app.staging"
        case .production:
            return "com.gtsd.app"
        }
    }

    /// Display name for the app
    var displayName: String {
        switch self {
        case .development:
            return "GTSD (Dev)"
        case .staging:
            return "GTSD (Staging)"
        case .production:
            return "GTSD"
        }
    }

    /// URL scheme for deep linking
    var urlScheme: String {
        switch self {
        case .development:
            return "gtsd-dev"
        case .staging:
            return "gtsd-staging"
        case .production:
            return "gtsd"
        }
    }
}
