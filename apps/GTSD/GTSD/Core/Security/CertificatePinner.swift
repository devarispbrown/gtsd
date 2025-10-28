//
//  CertificatePinner.swift
//  GTSD
//
//  Created by Claude on 2025-10-27.
//

import Foundation
import Security

/// Certificate pinning implementation to prevent MITM attacks
/// Validates SSL certificates against known public keys for production environment
final class CertificatePinner: NSObject {

    /// Pinned certificate public key hashes (SHA256)
    /// These should be updated when certificates are rotated
    private let pinnedPublicKeyHashes: Set<String>

    /// Whether to enforce certificate pinning (disabled for dev/staging)
    private let enforcePinning: Bool

    /// Host that requires pinning
    private let pinnedHost: String

    // MARK: - Initialization

    /// Initialize certificate pinner with configuration
    /// - Parameters:
    ///   - pinnedHost: Host to pin certificates for (e.g., "api.production.com")
    ///   - publicKeyHashes: Set of SHA256 hashes of trusted public keys
    ///   - enforcePinning: Whether to enforce pinning (false for dev/staging)
    init(
        pinnedHost: String,
        publicKeyHashes: Set<String>,
        enforcePinning: Bool = true
    ) {
        self.pinnedHost = pinnedHost
        self.pinnedPublicKeyHashes = publicKeyHashes
        self.enforcePinning = enforcePinning

        super.init()

        Logger.log(
            "Certificate pinner initialized for \(pinnedHost) with pinning \(enforcePinning ? "enabled" : "disabled")",
            level: .info
        )
    }

    // MARK: - Public Methods

    /// Validate server trust for given host
    /// - Parameters:
    ///   - serverTrust: Server trust to validate
    ///   - host: Host being validated
    /// - Returns: Whether the server trust is valid
    func validate(serverTrust: SecTrust, forHost host: String) -> Bool {
        // Only validate if this is our pinned host
        guard host == pinnedHost else {
            Logger.log("Host \(host) doesn't match pinned host, allowing connection", level: .debug)
            return true
        }

        // Allow all connections if pinning is disabled (dev/staging)
        guard enforcePinning else {
            Logger.log("Pinning disabled, allowing connection to \(host)", level: .debug)
            return true
        }

        // Evaluate server trust
        var error: CFError?
        let trustResult = SecTrustEvaluateWithError(serverTrust, &error)

        if let error = error {
            Logger.error("Trust evaluation failed: \(error.localizedDescription)")
            return false
        }

        guard trustResult else {
            Logger.error("Server trust evaluation failed")
            return false
        }

        // Extract and validate public keys
        guard let serverPublicKey = extractPublicKey(from: serverTrust) else {
            Logger.error("Failed to extract public key from server certificate")
            return false
        }

        let serverKeyHash = sha256Hash(of: serverPublicKey)

        // Check if server's public key matches any of our pinned keys
        let isValid = pinnedPublicKeyHashes.contains(serverKeyHash)

        if isValid {
            Logger.log("Certificate pinning validation successful for \(host)", level: .info)
        } else {
            Logger.error("Certificate pinning validation failed for \(host). Server key hash: \(serverKeyHash)")
        }

        return isValid
    }

    // MARK: - Private Helpers

    /// Extract public key from server trust
    /// - Parameter serverTrust: Server trust containing certificates
    /// - Returns: Public key data, if available
    private func extractPublicKey(from serverTrust: SecTrust) -> SecKey? {
        // Get certificate chain
        guard let certificate = SecTrustGetCertificateAtIndex(serverTrust, 0) else {
            return nil
        }

        // Extract public key from certificate
        return SecCertificateCopyKey(certificate)
    }

    /// Compute SHA256 hash of public key
    /// - Parameter publicKey: Public key to hash
    /// - Returns: Hex string representation of hash
    private func sha256Hash(of publicKey: SecKey) -> String {
        guard let publicKeyData = SecKeyCopyExternalRepresentation(publicKey, nil) as Data? else {
            return ""
        }

        var hash = [UInt8](repeating: 0, count: Int(CC_SHA256_DIGEST_LENGTH))
        publicKeyData.withUnsafeBytes { buffer in
            _ = CC_SHA256(buffer.baseAddress, CC_LONG(publicKeyData.count), &hash)
        }

        return hash.map { String(format: "%02x", $0) }.joined()
    }
}

// MARK: - URLSessionDelegate Extension

extension CertificatePinner: URLSessionDelegate {

    /// Handle authentication challenge with certificate pinning
    func urlSession(
        _ session: URLSession,
        didReceive challenge: URLAuthenticationChallenge,
        completionHandler: @escaping (URLSession.AuthChallengeDisposition, URLCredential?) -> Void
    ) {
        // Only handle server trust challenges
        guard challenge.protectionSpace.authenticationMethod == NSURLAuthenticationMethodServerTrust else {
            completionHandler(.performDefaultHandling, nil)
            return
        }

        guard let serverTrust = challenge.protectionSpace.serverTrust else {
            Logger.error("No server trust available")
            completionHandler(.cancelAuthenticationChallenge, nil)
            return
        }

        let host = challenge.protectionSpace.host

        // Validate certificate pinning
        if validate(serverTrust: serverTrust, forHost: host) {
            let credential = URLCredential(trust: serverTrust)
            completionHandler(.useCredential, credential)
        } else {
            Logger.error("Certificate pinning failed for \(host)")
            completionHandler(.cancelAuthenticationChallenge, nil)
        }
    }
}

// MARK: - CommonCrypto Bridge

/// Import CommonCrypto for SHA256 hashing
import CommonCrypto

// MARK: - Certificate Hash Utility

extension CertificatePinner {

    /// Extract public key hash from certificate file
    /// - Parameter certificateName: Name of certificate file (without extension)
    /// - Returns: SHA256 hash of public key, if extraction succeeds
    static func extractPublicKeyHash(fromCertificate certificateName: String) -> String? {
        guard let certificatePath = Bundle.main.path(forResource: certificateName, ofType: "cer"),
              let certificateData = try? Data(contentsOf: URL(fileURLWithPath: certificatePath)),
              let certificate = SecCertificateCreateWithData(nil, certificateData as CFData),
              let publicKey = SecCertificateCopyKey(certificate) else {
            Logger.error("Failed to load certificate: \(certificateName)")
            return nil
        }

        guard let publicKeyData = SecKeyCopyExternalRepresentation(publicKey, nil) as Data? else {
            Logger.error("Failed to extract public key from certificate")
            return nil
        }

        var hash = [UInt8](repeating: 0, count: Int(CC_SHA256_DIGEST_LENGTH))
        publicKeyData.withUnsafeBytes { buffer in
            _ = CC_SHA256(buffer.baseAddress, CC_LONG(publicKeyData.count), &hash)
        }

        let hashString = hash.map { String(format: "%02x", $0) }.joined()
        Logger.log("Extracted public key hash: \(hashString)", level: .info)

        return hashString
    }
}
