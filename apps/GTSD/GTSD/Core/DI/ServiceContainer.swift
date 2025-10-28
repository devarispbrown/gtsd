//
//  ServiceContainer.swift
//  GTSD
//
//  Created by Claude on 2025-10-27.
//

import Foundation
import Combine

/// Dependency injection container for managing app services
/// Provides centralized service creation and lifecycle management
/// The container itself is nonisolated since services are thread-safe and immutable after init
final class ServiceContainer: ObservableObject {
    // MARK: - Singleton for App-Level Access

    static let shared = ServiceContainer()

    // MARK: - Core Services
    // Services are immutable after initialization and are thread-safe
    // They can be safely accessed from any isolation context

    let keychain: KeychainManagerProtocol
    let apiClient: any APIClientProtocol
    let authService: any AuthenticationServiceProtocol
    let taskService: any TaskServiceProtocol
    let photoService: any PhotoServiceProtocol

    // MARK: - Initialization

    /// Initialize with default production services
    private init() {
        // Create keychain manager
        self.keychain = KeychainManager()

        // Create API client
        let client = APIClient()
        self.apiClient = client

        // Create authentication service
        let auth = AuthenticationService(
            apiClient: client,
            keychain: keychain
        )
        self.authService = auth

        // Connect API client to auth service for token refresh
        client.setAuthService(auth)

        // Create task service
        self.taskService = TaskService(apiClient: client)

        // Create photo service
        self.photoService = PhotoService(apiClient: client)

        Logger.info("ServiceContainer initialized with production services")
    }

    /// Initialize with custom services (for testing)
    init(
        keychain: KeychainManagerProtocol,
        apiClient: any APIClientProtocol,
        authService: any AuthenticationServiceProtocol,
        taskService: any TaskServiceProtocol,
        photoService: any PhotoServiceProtocol
    ) {
        self.keychain = keychain
        self.apiClient = apiClient
        self.authService = authService
        self.taskService = taskService
        self.photoService = photoService

        Logger.info("ServiceContainer initialized with custom services")
    }

    // MARK: - Factory Methods

    /// Create a fresh task service (useful for isolated operations)
    func makeTaskService() -> TaskService {
        return TaskService(apiClient: apiClient)
    }

    /// Create a fresh photo service (useful for isolated operations)
    func makePhotoService() -> PhotoService {
        return PhotoService(apiClient: apiClient)
    }

    /// Create a mock container for testing
    static func makeMock(
        keychain: KeychainManagerProtocol? = nil,
        apiClient: (any APIClientProtocol)? = nil,
        authService: (any AuthenticationServiceProtocol)? = nil,
        taskService: (any TaskServiceProtocol)? = nil,
        photoService: (any PhotoServiceProtocol)? = nil
    ) -> ServiceContainer {
        let mockKeychain = keychain ?? KeychainManager(service: "com.gtsd.app.test")
        let mockAPIClient = apiClient ?? APIClient(baseURL: "http://localhost:3000")
        let mockAuthService = authService ?? AuthenticationService(
            apiClient: mockAPIClient,
            keychain: mockKeychain
        )
        let mockTaskService = taskService ?? TaskService(apiClient: mockAPIClient)
        let mockPhotoService = photoService ?? PhotoService(apiClient: mockAPIClient)

        return ServiceContainer(
            keychain: mockKeychain,
            apiClient: mockAPIClient,
            authService: mockAuthService,
            taskService: mockTaskService,
            photoService: mockPhotoService
        )
    }
}

// MARK: - SwiftUI Environment

import SwiftUI

/// Environment key for service container
private struct ServiceContainerKey: EnvironmentKey {
    static let defaultValue: ServiceContainer = .shared
}

extension EnvironmentValues {
    var serviceContainer: ServiceContainer {
        get { self[ServiceContainerKey.self] }
        set { self[ServiceContainerKey.self] = newValue }
    }
}

extension View {
    /// Inject service container into environment
    func serviceContainer(_ container: ServiceContainer) -> some View {
        environment(\.serviceContainer, container)
    }
}
