//
//  SecureStorage.swift
//  GTSD
//
//  Created by Claude on 2025-10-27.
//

import Foundation
import Security
import CryptoKit

/// Secure storage implementation for encrypting sensitive data at rest
/// Uses iOS Data Protection and additional encryption for enhanced security
@MainActor
final class SecureStorage {

    /// Shared instance for app-wide secure storage
    static let shared = SecureStorage()

    /// Encryption key stored in keychain
    private let encryptionKeyTag = "com.gtsd.encryption.key"

    /// UserDefaults suite for encrypted storage
    private let defaults: UserDefaults

    /// Encryption key for data encryption
    private var encryptionKey: SymmetricKey

    // MARK: - Initialization

    private init() {
        // Use app group defaults if needed, or standard defaults
        self.defaults = UserDefaults.standard

        // Load or generate encryption key
        if let existingKey = Self.loadEncryptionKey() {
            self.encryptionKey = existingKey
            Logger.log("Loaded existing encryption key", level: .info)
        } else {
            let newKey = SymmetricKey(size: .bits256)
            Self.saveEncryptionKey(newKey)
            self.encryptionKey = newKey
            Logger.log("Generated new encryption key", level: .info)
        }
    }

    // MARK: - Public Methods

    /// Save encrypted data
    /// - Parameters:
    ///   - data: Data to encrypt and save
    ///   - key: Storage key
    /// - Throws: Encryption errors
    func save<T: Codable>(_ value: T, forKey key: String) throws {
        let encoder = JSONEncoder()
        let data = try encoder.encode(value)

        let encryptedData = try encrypt(data)
        let base64String = encryptedData.base64EncodedString()

        defaults.set(base64String, forKey: key)
        Logger.log("Saved encrypted data for key: \(key)", level: .debug)
    }

    /// Load and decrypt data
    /// - Parameter key: Storage key
    /// - Returns: Decrypted value, if available
    /// - Throws: Decryption or decoding errors
    func load<T: Codable>(forKey key: String) throws -> T? {
        guard let base64String = defaults.string(forKey: key) else {
            return nil
        }

        guard let encryptedData = Data(base64Encoded: base64String) else {
            Logger.error("Failed to decode base64 for key: \(key)")
            return nil
        }

        let decryptedData = try decrypt(encryptedData)

        let decoder = JSONDecoder()
        let value = try decoder.decode(T.self, from: decryptedData)

        Logger.log("Loaded encrypted data for key: \(key)", level: .debug)
        return value
    }

    /// Remove encrypted data
    /// - Parameter key: Storage key
    func remove(forKey key: String) {
        defaults.removeObject(forKey: key)
        Logger.log("Removed encrypted data for key: \(key)", level: .debug)
    }

    /// Clear all encrypted data
    func clearAll() {
        let dictionary = defaults.dictionaryRepresentation()
        dictionary.keys.forEach { key in
            defaults.removeObject(forKey: key)
        }
        Logger.log("Cleared all encrypted data", level: .info)
    }

    // MARK: - Encryption/Decryption

    /// Encrypt data using AES-GCM
    /// - Parameter data: Plain data to encrypt
    /// - Returns: Encrypted data including nonce
    /// - Throws: Encryption errors
    private func encrypt(_ data: Data) throws -> Data {
        let sealedBox = try AES.GCM.seal(data, using: encryptionKey)

        guard let combined = sealedBox.combined else {
            throw SecureStorageError.encryptionFailed
        }

        return combined
    }

    /// Decrypt data using AES-GCM
    /// - Parameter data: Encrypted data including nonce
    /// - Returns: Decrypted plain data
    /// - Throws: Decryption errors
    private func decrypt(_ data: Data) throws -> Data {
        let sealedBox = try AES.GCM.SealedBox(combined: data)
        let decryptedData = try AES.GCM.open(sealedBox, using: encryptionKey)

        return decryptedData
    }

    // MARK: - Keychain Management

    /// Load encryption key from keychain
    /// - Returns: Encryption key, if available
    private static func loadEncryptionKey() -> SymmetricKey? {
        let query: [String: Any] = [
            kSecClass as String: kSecClassKey,
            kSecAttrApplicationTag as String: "com.gtsd.encryption.key".data(using: .utf8)!,
            kSecReturnData as String: true
        ]

        var item: CFTypeRef?
        let status = SecItemCopyMatching(query as CFDictionary, &item)

        guard status == errSecSuccess,
              let keyData = item as? Data else {
            return nil
        }

        return SymmetricKey(data: keyData)
    }

    /// Save encryption key to keychain
    /// - Parameter key: Encryption key to save
    private static func saveEncryptionKey(_ key: SymmetricKey) {
        let keyData = key.withUnsafeBytes { Data($0) }

        let query: [String: Any] = [
            kSecClass as String: kSecClassKey,
            kSecAttrApplicationTag as String: "com.gtsd.encryption.key".data(using: .utf8)!,
            kSecValueData as String: keyData,
            kSecAttrAccessible as String: kSecAttrAccessibleAfterFirstUnlockThisDeviceOnly
        ]

        // Delete existing key if present
        SecItemDelete(query as CFDictionary)

        // Add new key
        let status = SecItemAdd(query as CFDictionary, nil)

        if status == errSecSuccess {
            Logger.log("Encryption key saved to keychain", level: .info)
        } else {
            Logger.error("Failed to save encryption key: \(status)")
        }
    }

    /// Delete encryption key from keychain (use with caution)
    static func deleteEncryptionKey() {
        let query: [String: Any] = [
            kSecClass as String: kSecClassKey,
            kSecAttrApplicationTag as String: "com.gtsd.encryption.key".data(using: .utf8)!
        ]

        SecItemDelete(query as CFDictionary)
        Logger.warning("Encryption key deleted from keychain")
    }
}

// MARK: - Errors

enum SecureStorageError: LocalizedError {
    case encryptionFailed
    case decryptionFailed
    case keyNotFound
    case invalidData

    var errorDescription: String? {
        switch self {
        case .encryptionFailed:
            return "Failed to encrypt data"
        case .decryptionFailed:
            return "Failed to decrypt data"
        case .keyNotFound:
            return "Encryption key not found"
        case .invalidData:
            return "Invalid data format"
        }
    }
}

// MARK: - Convenience Extensions

extension SecureStorage {

    /// Save string value
    func saveString(_ value: String, forKey key: String) throws {
        try save(value, forKey: key)
    }

    /// Load string value
    func loadString(forKey key: String) throws -> String? {
        return try load(forKey: key)
    }

    /// Save integer value
    func saveInt(_ value: Int, forKey key: String) throws {
        try save(value, forKey: key)
    }

    /// Load integer value
    func loadInt(forKey key: String) throws -> Int? {
        return try load(forKey: key)
    }

    /// Save boolean value
    func saveBool(_ value: Bool, forKey key: String) throws {
        try save(value, forKey: key)
    }

    /// Load boolean value
    func loadBool(forKey key: String) throws -> Bool? {
        return try load(forKey: key)
    }

    /// Save date value
    func saveDate(_ value: Date, forKey key: String) throws {
        try save(value, forKey: key)
    }

    /// Load date value
    func loadDate(forKey key: String) throws -> Date? {
        return try load(forKey: key)
    }
}

// MARK: - Cache Keys

extension SecureStorage {

    /// Storage keys for encrypted cache
    enum CacheKey {
        static let tasks = "encrypted.cache.tasks"
        static let photos = "encrypted.cache.photos"
        static let userProfile = "encrypted.cache.userProfile"
        static let userStats = "encrypted.cache.userStats"
        static let streakData = "encrypted.cache.streakData"
        static let badgeData = "encrypted.cache.badgeData"
        static let preferences = "encrypted.cache.preferences"
    }
}
