//
//  BiometricAuthService.swift
//  GTSD
//
//  Created by Claude on 2025-10-27.
//

import Foundation
import LocalAuthentication
import Combine

/// Service for managing biometric authentication
@MainActor
final class BiometricAuthService: ObservableObject {
    static let shared = BiometricAuthService()

    @Published private(set) var biometricType: BiometricType = .none
    @Published private(set) var isAvailable = false
    @Published private(set) var canEvaluatePolicy = false
    @Published var isBiometricEnabled: Bool {
        didSet {
            UserDefaults.standard.set(isBiometricEnabled, forKey: biometricEnabledKey)
            Logger.info("Biometric authentication \(isBiometricEnabled ? "enabled" : "disabled")")
        }
    }

    private let context = LAContext()
    private let biometricEnabledKey = "biometric_authentication_enabled"

    enum BiometricType {
        case none
        case faceID
        case touchID

        var displayName: String {
            switch self {
            case .none: return "None"
            case .faceID: return "Face ID"
            case .touchID: return "Touch ID"
            }
        }

        var icon: String {
            switch self {
            case .none: return "lock.fill"
            case .faceID: return "faceid"
            case .touchID: return "touchid"
            }
        }
    }

    enum BiometricError: LocalizedError {
        case notAvailable
        case authenticationFailed
        case userCanceled
        case userFallback
        case biometricsNotEnrolled
        case passcodeNotSet
        case systemCanceled
        case unknown(Error)

        var errorDescription: String? {
            switch self {
            case .notAvailable:
                return "Biometric authentication is not available on this device"
            case .authenticationFailed:
                return "Authentication failed. Please try again."
            case .userCanceled:
                return "Authentication was canceled"
            case .userFallback:
                return "User chose to enter password"
            case .biometricsNotEnrolled:
                return "Biometric authentication is not set up on this device"
            case .passcodeNotSet:
                return "Passcode is not set on this device"
            case .systemCanceled:
                return "Authentication was canceled by the system"
            case .unknown(let error):
                return error.localizedDescription
            }
        }
    }

    private init() {
        self.isBiometricEnabled = UserDefaults.standard.bool(forKey: biometricEnabledKey)
        checkBiometricAvailability()
    }

    // MARK: - Availability Check

    func checkBiometricAvailability() {
        var error: NSError?
        let context = LAContext()

        canEvaluatePolicy = context.canEvaluatePolicy(.deviceOwnerAuthenticationWithBiometrics, error: &error)
        isAvailable = canEvaluatePolicy

        if canEvaluatePolicy {
            switch context.biometryType {
            case .faceID:
                biometricType = .faceID
            case .touchID:
                biometricType = .touchID
            case .none:
                biometricType = .none
            @unknown default:
                biometricType = .none
            }

            Logger.info("Biometric type: \(biometricType.displayName)")
        } else {
            biometricType = .none

            if let error = error {
                Logger.warning("Biometric authentication not available: \(error.localizedDescription)")
            }
        }
    }

    // MARK: - Authentication

    /// Authenticate using biometrics
    /// - Parameter reason: Reason to display to user
    /// - Returns: True if authentication successful
    func authenticate(reason: String = "Authenticate to access your account") async throws -> Bool {
        guard isAvailable else {
            throw BiometricError.notAvailable
        }

        guard isBiometricEnabled else {
            Logger.debug("Biometric authentication is disabled by user")
            return false
        }

        let context = LAContext()
        context.localizedCancelTitle = "Enter Password"
        context.localizedFallbackTitle = "Use Password"

        do {
            let success = try await context.evaluatePolicy(
                .deviceOwnerAuthenticationWithBiometrics,
                localizedReason: reason
            )

            if success {
                Logger.info("Biometric authentication successful")
            }

            return success

        } catch let error as LAError {
            Logger.warning("Biometric authentication failed: \(error.localizedDescription)")

            switch error.code {
            case .authenticationFailed:
                throw BiometricError.authenticationFailed
            case .userCancel:
                throw BiometricError.userCanceled
            case .userFallback:
                throw BiometricError.userFallback
            case .biometryNotEnrolled:
                throw BiometricError.biometricsNotEnrolled
            case .passcodeNotSet:
                throw BiometricError.passcodeNotSet
            case .systemCancel:
                throw BiometricError.systemCanceled
            default:
                throw BiometricError.unknown(error)
            }
        } catch {
            Logger.error("Unexpected biometric authentication error: \(error.localizedDescription)")
            throw BiometricError.unknown(error)
        }
    }

    /// Authenticate with fallback to device passcode
    /// - Parameter reason: Reason to display to user
    /// - Returns: True if authentication successful
    func authenticateWithPasscode(reason: String = "Authenticate to access your account") async throws -> Bool {
        let context = LAContext()
        context.localizedCancelTitle = "Cancel"

        do {
            let success = try await context.evaluatePolicy(
                .deviceOwnerAuthentication,
                localizedReason: reason
            )

            if success {
                Logger.info("Device authentication successful")
            }

            return success

        } catch let error as LAError {
            Logger.warning("Device authentication failed: \(error.localizedDescription)")

            switch error.code {
            case .authenticationFailed:
                throw BiometricError.authenticationFailed
            case .userCancel:
                throw BiometricError.userCanceled
            case .systemCancel:
                throw BiometricError.systemCanceled
            default:
                throw BiometricError.unknown(error)
            }
        } catch {
            Logger.error("Unexpected device authentication error: \(error.localizedDescription)")
            throw BiometricError.unknown(error)
        }
    }

    // MARK: - Settings

    func enableBiometric() {
        guard isAvailable else {
            Logger.warning("Cannot enable biometric - not available")
            return
        }

        isBiometricEnabled = true
    }

    func disableBiometric() {
        isBiometricEnabled = false
    }

    func toggleBiometric() {
        if isBiometricEnabled {
            disableBiometric()
        } else {
            enableBiometric()
        }
    }

    // MARK: - Helper Methods

    var biometricDescription: String {
        switch biometricType {
        case .faceID:
            return "Face ID allows you to securely unlock the app using facial recognition."
        case .touchID:
            return "Touch ID allows you to securely unlock the app using your fingerprint."
        case .none:
            return "Biometric authentication is not available on this device."
        }
    }

    var settingsPrompt: String {
        switch biometricType {
        case .faceID:
            return "Enable Face ID to quickly and securely access your account."
        case .touchID:
            return "Enable Touch ID to quickly and securely access your account."
        case .none:
            return "Biometric authentication is not available on this device."
        }
    }
}
