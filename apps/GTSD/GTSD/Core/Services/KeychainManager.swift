//
//  KeychainManager.swift
//  GTSD
//
//  Created by Claude on 2025-10-26.
//

import Foundation
import Security

/// Secure keychain storage for sensitive data
@MainActor
final class KeychainManager: KeychainManagerProtocol, Sendable {
    private let service: String

    /// Initialize keychain manager with service identifier
    init(service: String = "com.gtsd.app") {
        self.service = service
    }

    // MARK: - Public Methods

    /// Save string value to keychain
    func save(_ value: String, for key: String) -> Bool {
        guard let data = value.data(using: .utf8) else {
            Logger.error("Failed to convert string to data for key: \(key)")
            return false
        }
        return save(data, for: key)
    }

    /// Retrieve string value from keychain
    func get(_ key: String) -> String? {
        guard let data = getData(key) else {
            return nil
        }
        return String(data: data, encoding: .utf8)
    }

    /// Delete value from keychain
    @discardableResult
    func delete(_ key: String) -> Bool {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: key
        ]

        let status = SecItemDelete(query as CFDictionary)

        if status == errSecSuccess {
            Logger.debug("Successfully deleted keychain item for key: \(key)")
            return true
        } else if status == errSecItemNotFound {
            Logger.debug("Keychain item not found for key: \(key)")
            return true
        } else {
            Logger.error("Failed to delete keychain item for key: \(key), status: \(status)")
            return false
        }
    }

    /// Clear all keychain items for this service
    @discardableResult
    func clearAll() -> Bool {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service
        ]

        let status = SecItemDelete(query as CFDictionary)

        if status == errSecSuccess || status == errSecItemNotFound {
            Logger.debug("Successfully cleared all keychain items")
            return true
        } else {
            Logger.error("Failed to clear keychain items, status: \(status)")
            return false
        }
    }

    // MARK: - Private Methods

    private func save(_ data: Data, for key: String) -> Bool {
        // First, try to update existing item
        let updateQuery: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: key
        ]

        let updateAttributes: [String: Any] = [
            kSecValueData as String: data
        ]

        var status = SecItemUpdate(updateQuery as CFDictionary, updateAttributes as CFDictionary)

        // If item doesn't exist, create new one
        if status == errSecItemNotFound {
            let addQuery: [String: Any] = [
                kSecClass as String: kSecClassGenericPassword,
                kSecAttrService as String: service,
                kSecAttrAccount as String: key,
                kSecValueData as String: data,
                kSecAttrAccessible as String: kSecAttrAccessibleAfterFirstUnlock
            ]

            status = SecItemAdd(addQuery as CFDictionary, nil)
        }

        if status == errSecSuccess {
            Logger.debug("Successfully saved keychain item for key: \(key)")
            return true
        } else {
            Logger.error("Failed to save keychain item for key: \(key), status: \(status)")
            return false
        }
    }

    private func getData(_ key: String) -> Data? {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: key,
            kSecReturnData as String: true,
            kSecMatchLimit as String: kSecMatchLimitOne
        ]

        var result: AnyObject?
        let status = SecItemCopyMatching(query as CFDictionary, &result)

        if status == errSecSuccess {
            Logger.debug("Successfully retrieved keychain item for key: \(key)")
            return result as? Data
        } else if status == errSecItemNotFound {
            Logger.debug("Keychain item not found for key: \(key)")
            return nil
        } else {
            Logger.error("Failed to retrieve keychain item for key: \(key), status: \(status)")
            return nil
        }
    }
}

// MARK: - Keychain Keys

extension KeychainManager {
    enum Keys {
        static let accessToken = "accessToken"
        static let refreshToken = "refreshToken"
        static let userId = "userId"
        static let userEmail = "userEmail"
    }
}
