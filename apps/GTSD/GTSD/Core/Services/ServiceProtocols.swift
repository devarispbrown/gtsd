//
//  ServiceProtocols.swift
//  GTSD
//
//  Created by Claude on 2025-10-27.
//

import Foundation
#if canImport(UIKit)
import UIKit
#endif

// MARK: - Authentication Service Protocol

/// Protocol for authentication service
@MainActor
protocol AuthenticationServiceProtocol: ObservableObject {
    var isAuthenticated: Bool { get }
    var currentUser: User? { get }
    var isLoading: Bool { get }
    var errorMessage: String? { get }

    func checkAuthentication() async
    func signup(email: String, password: String, name: String) async throws
    func login(email: String, password: String) async throws
    func logout() async
    func refreshToken() async throws
    func updateProfile(name: String?, email: String?) async throws
    func updateCurrentUser(_ user: User) async
    func changePassword(currentPassword: String, newPassword: String) async throws
    func deleteAccount() async throws
}

// MARK: - Task Service Protocol

/// Protocol for task service
@MainActor
protocol TaskServiceProtocol: ObservableObject {
    var tasks: [Task] { get }
    var isLoading: Bool { get }
    var errorMessage: String? { get }

    func fetchTasks(
        page: Int?,
        limit: Int?,
        status: TaskStatus?,
        category: TaskCategory?
    ) async throws

    func createTask(
        title: String,
        description: String?,
        category: TaskCategory,
        dueDate: Date?,
        priority: TaskPriority?
    ) async throws -> Task

    func getTask(id: String) async throws -> Task

    func updateTask(
        id: String,
        title: String?,
        description: String?,
        category: TaskCategory?,
        dueDate: Date?,
        priority: TaskPriority?,
        status: TaskStatus?
    ) async throws -> Task

    func deleteTask(id: String) async throws
    func completeTask(id: String) async throws
    func uncompleteTask(id: String) async throws

    var pendingTasks: [Task] { get }
    var inProgressTasks: [Task] { get }
    var completedTasks: [Task] { get }
    var overdueTasks: [Task] { get }
}

// MARK: - Photo Service Protocol

/// Protocol for photo service
@MainActor
protocol PhotoServiceProtocol: ObservableObject {
    var photos: [Photo] { get }
    var isLoading: Bool { get }
    var errorMessage: String? { get }

    func uploadPhoto(
        taskId: String,
        image: UIImage,
        caption: String?
    ) async throws -> Photo

    func uploadPhoto(
        taskId: String,
        imageData: Data,
        caption: String?
    ) async throws -> Photo

    func fetchPhotos(
        taskId: String?,
        page: Int?,
        limit: Int?
    ) async throws

    func getPhoto(id: String) async throws -> Photo
    func deletePhoto(id: String) async throws
    func photosForTask(taskId: String) -> [Photo]
    func fetchPhotosForTask(taskId: String) async throws -> [Photo]
}

// MARK: - Keychain Manager Protocol

/// Protocol for keychain manager
protocol KeychainManagerProtocol: Sendable {
    func save(_ value: String, for key: String) -> Bool
    func get(_ key: String) -> String?
    @discardableResult func delete(_ key: String) -> Bool
    @discardableResult func clearAll() -> Bool
}
