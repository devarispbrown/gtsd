//
//  RequestSigner.swift
//  GTSD
//
//  Created by Claude on 2025-10-27.
//

import Foundation
import CryptoKit

/// Request signing implementation using HMAC-SHA256
/// Provides request integrity verification and replay attack prevention
final class RequestSigner {

    /// HMAC signing key
    private let signingKey: SymmetricKey

    /// Maximum allowed time drift in seconds (prevents replay attacks)
    private let maxTimeDrift: TimeInterval = 300 // 5 minutes

    // MARK: - Initialization

    /// Initialize request signer with signing key
    /// - Parameter signingKey: Secret key for HMAC signing
    init(signingKey: String) {
        // Convert string key to SymmetricKey
        let keyData = Data(signingKey.utf8)
        self.signingKey = SymmetricKey(data: keyData)

        Logger.log("Request signer initialized", level: .info)
    }

    // MARK: - Request Signing

    /// Sign a URL request
    /// - Parameter request: URLRequest to sign
    /// - Returns: Signed URLRequest with authentication headers
    func sign(_ request: URLRequest) throws -> URLRequest {
        var signedRequest = request

        // Generate timestamp (ISO8601 format)
        let timestamp = ISO8601DateFormatter().string(from: Date())

        // Generate nonce for uniqueness
        let nonce = UUID().uuidString

        // Get request components for signing
        guard let url = request.url,
              let method = request.httpMethod else {
            throw RequestSignerError.invalidRequest
        }

        let path = url.path
        let query = url.query ?? ""
        let body = request.httpBody.map { String(data: $0, encoding: .utf8) ?? "" } ?? ""

        // Create signing string
        let signingString = createSigningString(
            method: method,
            path: path,
            query: query,
            body: body,
            timestamp: timestamp,
            nonce: nonce
        )

        // Generate signature
        let signature = generateSignature(for: signingString)

        // Add signature headers
        signedRequest.setValue(timestamp, forHTTPHeaderField: "X-Request-Timestamp")
        signedRequest.setValue(nonce, forHTTPHeaderField: "X-Request-Nonce")
        signedRequest.setValue(signature, forHTTPHeaderField: "X-Request-Signature")

        Logger.log("Request signed: \(method) \(path)", level: .debug)

        return signedRequest
    }

    /// Verify request signature (for testing/debugging)
    /// - Parameters:
    ///   - request: URLRequest to verify
    ///   - signature: Expected signature
    /// - Returns: Whether the signature is valid
    func verify(request: URLRequest, signature: String) -> Bool {
        guard let timestamp = request.value(forHTTPHeaderField: "X-Request-Timestamp"),
              let nonce = request.value(forHTTPHeaderField: "X-Request-Nonce"),
              let url = request.url,
              let method = request.httpMethod else {
            return false
        }

        // Check timestamp freshness (prevent replay attacks)
        guard isTimestampValid(timestamp) else {
            Logger.warning("Request timestamp is expired or invalid")
            return false
        }

        let path = url.path
        let query = url.query ?? ""
        let body = request.httpBody.map { String(data: $0, encoding: .utf8) ?? "" } ?? ""

        let signingString = createSigningString(
            method: method,
            path: path,
            query: query,
            body: body,
            timestamp: timestamp,
            nonce: nonce
        )

        let expectedSignature = generateSignature(for: signingString)

        return signature == expectedSignature
    }

    // MARK: - Private Helpers

    /// Create signing string from request components
    /// - Parameters:
    ///   - method: HTTP method
    ///   - path: URL path
    ///   - query: Query string
    ///   - body: Request body
    ///   - timestamp: Request timestamp
    ///   - nonce: Request nonce
    /// - Returns: String to be signed
    private func createSigningString(
        method: String,
        path: String,
        query: String,
        body: String,
        timestamp: String,
        nonce: String
    ) -> String {
        // Signing string format:
        // METHOD\nPATH\nQUERY\nBODY\nTIMESTAMP\nNONCE
        return [
            method,
            path,
            query,
            body,
            timestamp,
            nonce
        ].joined(separator: "\n")
    }

    /// Generate HMAC-SHA256 signature
    /// - Parameter data: Data to sign
    /// - Returns: Hex-encoded signature
    private func generateSignature(for data: String) -> String {
        let dataToSign = Data(data.utf8)
        let signature = HMAC<SHA256>.authenticationCode(for: dataToSign, using: signingKey)

        // Convert to hex string
        return signature.map { String(format: "%02x", $0) }.joined()
    }

    /// Validate timestamp to prevent replay attacks
    /// - Parameter timestamp: ISO8601 timestamp string
    /// - Returns: Whether timestamp is within allowed drift
    private func isTimestampValid(_ timestamp: String) -> Bool {
        let formatter = ISO8601DateFormatter()
        guard let requestDate = formatter.date(from: timestamp) else {
            return false
        }

        let timeDrift = abs(Date().timeIntervalSince(requestDate))
        return timeDrift <= maxTimeDrift
    }
}

// MARK: - Errors

enum RequestSignerError: LocalizedError {
    case invalidRequest
    case invalidTimestamp
    case signatureGenerationFailed

    var errorDescription: String? {
        switch self {
        case .invalidRequest:
            return "Invalid request for signing"
        case .invalidTimestamp:
            return "Invalid or expired timestamp"
        case .signatureGenerationFailed:
            return "Failed to generate request signature"
        }
    }
}

// MARK: - URLRequest Extension

extension URLRequest {

    /// Check if request has valid signature
    var hasValidSignature: Bool {
        return value(forHTTPHeaderField: "X-Request-Signature") != nil &&
               value(forHTTPHeaderField: "X-Request-Timestamp") != nil &&
               value(forHTTPHeaderField: "X-Request-Nonce") != nil
    }

    /// Get request signature
    var signature: String? {
        return value(forHTTPHeaderField: "X-Request-Signature")
    }

    /// Get request timestamp
    var timestamp: String? {
        return value(forHTTPHeaderField: "X-Request-Timestamp")
    }

    /// Get request nonce
    var nonce: String? {
        return value(forHTTPHeaderField: "X-Request-Nonce")
    }
}

// MARK: - Signature Verification Extension

extension RequestSigner {

    /// Create a test signature for validation
    /// - Parameters:
    ///   - method: HTTP method
    ///   - path: URL path
    ///   - body: Optional request body
    /// - Returns: Generated signature
    func createTestSignature(method: String, path: String, body: String? = nil) -> (signature: String, timestamp: String, nonce: String) {
        let timestamp = ISO8601DateFormatter().string(from: Date())
        let nonce = UUID().uuidString

        let signingString = createSigningString(
            method: method,
            path: path,
            query: "",
            body: body ?? "",
            timestamp: timestamp,
            nonce: nonce
        )

        let signature = generateSignature(for: signingString)

        return (signature, timestamp, nonce)
    }
}

// MARK: - Configuration Extension

extension RequestSigner {

    /// Maximum allowed timestamp drift
    static var maxTimeDrift: TimeInterval {
        return 300 // 5 minutes
    }

    /// Check if request signing should be enabled
    @MainActor
    static var isEnabled: Bool {
        return Configuration.shared.isRequestSigningEnabled
    }
}
