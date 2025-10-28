//
//  Configuration.swift
//  GTSD
//
//  Created by Claude on 2025-10-27.
//

import Foundation
import UIKit

/// Central configuration manager for the application
/// Provides unified access to environment settings and feature flags
@MainActor
final class Configuration {

    /// Shared configuration instance
    static let shared = Configuration()

    /// Current environment
    let environment: AppEnvironment

    /// Certificate pinner for SSL pinning
    private(set) var certificatePinner: CertificatePinner?

    /// Request signer for API request signing
    private(set) var requestSigner: RequestSigner?

    // MARK: - Initialization

    private init() {
        self.environment = AppEnvironment.current

        // Initialize certificate pinner for production
        if environment.enforceCertificatePinning {
            self.certificatePinner = CertificatePinner(
                pinnedHost: environment.apiHost,
                publicKeyHashes: environment.pinnedPublicKeyHashes,
                enforcePinning: true
            )
            Logger.log("Certificate pinning enabled for \(environment.apiHost)", level: .info)
        } else {
            // Create non-enforcing pinner for dev/staging
            self.certificatePinner = CertificatePinner(
                pinnedHost: environment.apiHost,
                publicKeyHashes: [],
                enforcePinning: false
            )
            Logger.log("Certificate pinning disabled for \(environment.name)", level: .info)
        }

        // Initialize request signer if enabled
        if environment.requestSigningEnabled, let signingKey = environment.requestSigningKey {
            self.requestSigner = RequestSigner(signingKey: signingKey)
            Logger.log("Request signing enabled", level: .info)
        } else {
            Logger.log("Request signing disabled", level: .info)
        }

        // Log environment info on initialization
        AppEnvironment.printEnvironmentInfo()
    }

    // MARK: - API Configuration

    /// Get configured API base URL
    var apiBaseURL: String {
        return environment.apiBaseURL
    }

    /// Get API host for certificate pinning
    var apiHost: String {
        return environment.apiHost
    }

    /// Get request timeout configuration
    var requestTimeout: TimeInterval {
        return environment.requestTimeout
    }

    /// Get resource timeout configuration
    var resourceTimeout: TimeInterval {
        return environment.resourceTimeout
    }

    // MARK: - Security Configuration

    /// Whether certificate pinning is enforced
    var isCertificatePinningEnabled: Bool {
        return environment.enforceCertificatePinning
    }

    /// Whether request signing is enabled
    var isRequestSigningEnabled: Bool {
        return environment.requestSigningEnabled
    }

    /// Whether encrypted cache is enabled
    var isEncryptedCacheEnabled: Bool {
        return environment.useEncryptedCache
    }

    // MARK: - Cache Configuration

    /// Memory capacity for URL cache
    var cacheMemoryCapacity: Int {
        return environment.cacheMemoryCapacity
    }

    /// Disk capacity for URL cache
    var cacheDiskCapacity: Int {
        return environment.cacheDiskCapacity
    }

    // MARK: - Feature Flags

    /// Whether debug UI should be shown
    var showDebugUI: Bool {
        return environment.showDebugUI
    }

    /// Whether analytics are enabled
    var analyticsEnabled: Bool {
        return environment.analyticsEnabled
    }

    /// Whether crash reporting is enabled
    var crashReportingEnabled: Bool {
        return environment.crashReportingEnabled
    }

    /// Whether network logging is enabled
    var networkLoggingEnabled: Bool {
        return environment.networkLoggingEnabled
    }

    /// Whether debug logging is enabled
    var debugLoggingEnabled: Bool {
        return environment.debugLoggingEnabled
    }

    // MARK: - URLSession Configuration

    /// Create configured URLSession for API requests
    func createURLSession(delegate: URLSessionDelegate? = nil) -> URLSession {
        let configuration = URLSessionConfiguration.default

        // Set timeouts
        configuration.timeoutIntervalForRequest = requestTimeout
        configuration.timeoutIntervalForResource = resourceTimeout

        // Configure cache
        configuration.requestCachePolicy = .returnCacheDataElseLoad
        configuration.urlCache = URLCache(
            memoryCapacity: cacheMemoryCapacity,
            diskCapacity: cacheDiskCapacity
        )

        // Use certificate pinner as delegate if available
        let sessionDelegate = delegate ?? certificatePinner

        return URLSession(
            configuration: configuration,
            delegate: sessionDelegate,
            delegateQueue: nil
        )
    }

    // MARK: - App Information

    /// App version string
    var appVersion: String {
        let version = Bundle.main.object(forInfoDictionaryKey: "CFBundleShortVersionString") as? String ?? "Unknown"
        let build = Bundle.main.object(forInfoDictionaryKey: "CFBundleVersion") as? String ?? "Unknown"
        return "\(version) (\(build))"
    }

    /// Bundle identifier
    var bundleIdentifier: String {
        return Bundle.main.bundleIdentifier ?? environment.bundleIdentifier
    }

    /// Device information for API headers
    var deviceInfo: [String: String] {
        return [
            "platform": "iOS",
            "osVersion": UIDevice.current.systemVersion,
            "appVersion": appVersion,
            "deviceModel": deviceModel,
            "environment": environment.identifier
        ]
    }

    /// Device model identifier
    private var deviceModel: String {
        var systemInfo = utsname()
        uname(&systemInfo)
        let modelCode = withUnsafePointer(to: &systemInfo.machine) {
            $0.withMemoryRebound(to: CChar.self, capacity: 1) {
                String(validatingUTF8: $0)
            }
        }
        return modelCode ?? "Unknown"
    }
}

// MARK: - Configuration Validation

extension Configuration {

    /// Validate configuration settings
    /// Should be called during app startup
    func validateConfiguration() {
        var warnings: [String] = []

        // Check production certificate pinning
        if environment.isProduction {
            if !environment.enforceCertificatePinning {
                warnings.append("Certificate pinning is disabled in production")
            }

            if environment.pinnedPublicKeyHashes.isEmpty {
                warnings.append("No certificate hashes configured for production")
            }

            if environment.pinnedPublicKeyHashes.contains("your_production_cert_hash_here") {
                warnings.append("Production certificate hashes not updated")
            }

            if !environment.requestSigningEnabled {
                warnings.append("Request signing is disabled in production")
            }

            if environment.requestSigningKey == nil {
                warnings.append("Request signing key not configured for production")
            }
        }

        // Check API URL configuration
        if apiBaseURL.isEmpty {
            warnings.append("API base URL is not configured")
        }

        if apiBaseURL.hasPrefix("http://") && environment.isProduction {
            warnings.append("Production API is using HTTP instead of HTTPS")
        }

        // Log warnings
        if !warnings.isEmpty {
            Logger.warning("Configuration warnings:")
            warnings.forEach { warning in
                Logger.warning("  - \(warning)")
            }
        } else {
            Logger.log("Configuration validation passed", level: .info)
        }
    }
}

// MARK: - Debug Utilities

#if DEBUG
extension Configuration {

    /// Override API base URL for testing
    func overrideAPIBaseURL(_ url: String) {
        // This would require making environment mutable
        // For now, use environment variables instead
        Logger.warning("To override API URL, set API_BASE_URL environment variable")
    }

    /// Get current configuration as string for debugging
    var debugDescription: String {
        return """
        Configuration:
          Environment: \(environment.name)
          API URL: \(apiBaseURL)
          API Host: \(apiHost)
          Cert Pinning: \(isCertificatePinningEnabled)
          Request Signing: \(isRequestSigningEnabled)
          Encrypted Cache: \(isEncryptedCacheEnabled)
          App Version: \(appVersion)
          Bundle ID: \(bundleIdentifier)
        """
    }
}
#endif
