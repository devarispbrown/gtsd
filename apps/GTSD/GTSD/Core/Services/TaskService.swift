//
//  TaskService.swift
//  GTSD
//
//  Created by Claude on 2025-10-26.
//

import Foundation
import Combine

/// Service for managing tasks with encrypted cache support
@MainActor
final class TaskService: ObservableObject, TaskServiceProtocol {
    @Published private(set) var isLoading = false
    @Published var errorMessage: String?

    private let apiClient: any APIClientProtocol
    private let cache: BoundedCache<Task>
    private let secureStorage: SecureStorage
    private let useEncryptedCache: Bool

    /// Maximum number of tasks to keep in memory
    private static let maxCacheSize = 100

    /// Initialize task service with dependencies
    init(
        apiClient: any APIClientProtocol,
        maxCacheSize: Int = TaskService.maxCacheSize,
        secureStorage: SecureStorage = .shared,
        configuration: Configuration = .shared
    ) {
        self.apiClient = apiClient
        self.cache = BoundedCache<Task>(maxSize: maxCacheSize)
        self.secureStorage = secureStorage
        self.useEncryptedCache = configuration.isEncryptedCacheEnabled

        // Load cached tasks from secure storage
        if useEncryptedCache {
            loadCachedTasks()
        }

        Logger.log("TaskService initialized with encrypted cache: \(useEncryptedCache)", level: .info)
    }

    /// Published tasks from cache
    var tasks: [Task] {
        cache.all
    }

    // MARK: - Cache Persistence

    /// Load cached tasks from encrypted storage
    private func loadCachedTasks() {
        do {
            if let cachedTasks: [Task] = try secureStorage.load(forKey: SecureStorage.CacheKey.tasks) {
                cache.replaceAll(cachedTasks)
                Logger.log("Loaded \(cachedTasks.count) tasks from encrypted cache", level: .debug)
            }
        } catch {
            Logger.error("Failed to load cached tasks: \(error)")
        }
    }

    /// Save tasks to encrypted storage
    private func saveCachedTasks() {
        guard useEncryptedCache else { return }

        do {
            try secureStorage.save(cache.all, forKey: SecureStorage.CacheKey.tasks)
            Logger.log("Saved \(cache.count) tasks to encrypted cache", level: .debug)
        } catch {
            Logger.error("Failed to save cached tasks: \(error)")
        }
    }

    /// Clear cached tasks from encrypted storage
    private func clearCachedTasks() {
        guard useEncryptedCache else { return }

        secureStorage.remove(forKey: SecureStorage.CacheKey.tasks)
        Logger.log("Cleared cached tasks", level: .debug)
    }

    // MARK: - Task Operations

    /// Fetch all tasks with optional filters
    func fetchTasks(
        page: Int? = nil,
        limit: Int? = nil,
        status: TaskStatus? = nil,
        category: TaskCategory? = nil
    ) async throws {
        isLoading = true
        errorMessage = nil

        defer { isLoading = false }

        Logger.info("Fetching tasks")

        do {
            let response: PaginatedResponse<Task> = try await apiClient.request(
                .getTasks(
                    page: page,
                    limit: limit,
                    status: status?.rawValue,
                    category: category?.rawValue
                )
            )

            // Replace cache with new items (bounded to max size)
            cache.replaceAll(response.items)
            Logger.info("Fetched \(cache.count) tasks")

            // Save to encrypted storage
            saveCachedTasks()

        } catch let error as APIError {
            Logger.error("Failed to fetch tasks: \(error.localizedDescription)")
            errorMessage = error.localizedDescription
            throw error
        }
    }

    /// Create new task
    func createTask(
        title: String,
        description: String?,
        category: TaskCategory,
        dueDate: Date?,
        priority: TaskPriority?
    ) async throws -> Task {
        isLoading = true
        errorMessage = nil

        defer { isLoading = false }

        Logger.info("Creating task: \(title)")

        do {
            let task: Task = try await apiClient.request(
                .createTask(
                    title: title,
                    description: description,
                    category: category.rawValue,
                    dueDate: dueDate,
                    priority: priority?.rawValue
                )
            )

            // Add to cache
            cache.upsert(task)

            // Save to encrypted storage
            saveCachedTasks()

            Logger.info("Task created: \(task.id)")
            return task

        } catch let error as APIError {
            Logger.error("Failed to create task: \(error.localizedDescription)")
            errorMessage = error.localizedDescription
            throw error
        }
    }

    /// Get single task by ID
    func getTask(id: String) async throws -> Task {
        Logger.info("Fetching task: \(id)")

        do {
            let task: Task = try await apiClient.request(.getTask(id: id))

            // Update cache
            cache.upsert(task)

            return task

        } catch let error as APIError {
            Logger.error("Failed to fetch task: \(error.localizedDescription)")
            throw error
        }
    }

    /// Update existing task
    func updateTask(
        id: String,
        title: String? = nil,
        description: String? = nil,
        category: TaskCategory? = nil,
        dueDate: Date? = nil,
        priority: TaskPriority? = nil,
        status: TaskStatus? = nil
    ) async throws -> Task {
        isLoading = true
        errorMessage = nil

        defer { isLoading = false }

        Logger.info("Updating task: \(id)")

        do {
            let task: Task = try await apiClient.request(
                .updateTask(
                    id: id,
                    title: title,
                    description: description,
                    category: category?.rawValue,
                    dueDate: dueDate,
                    priority: priority?.rawValue,
                    status: status?.rawValue
                )
            )

            // Update cache
            cache.update(id: id, with: task)

            // Save to encrypted storage
            saveCachedTasks()

            Logger.info("Task updated: \(id)")
            return task

        } catch let error as APIError {
            Logger.error("Failed to update task: \(error.localizedDescription)")
            errorMessage = error.localizedDescription
            throw error
        }
    }

    /// Delete task
    func deleteTask(id: String) async throws {
        isLoading = true
        errorMessage = nil

        defer { isLoading = false }

        Logger.info("Deleting task: \(id)")

        do {
            try await apiClient.requestVoid(.deleteTask(id: id))

            // Remove from cache
            cache.remove(id: id)

            // Save to encrypted storage
            saveCachedTasks()

            Logger.info("Task deleted: \(id)")

        } catch let error as APIError {
            Logger.error("Failed to delete task: \(error.localizedDescription)")
            errorMessage = error.localizedDescription
            throw error
        }
    }

    /// Complete task
    func completeTask(id: String) async throws {
        isLoading = true
        errorMessage = nil

        defer { isLoading = false }

        Logger.info("Completing task: \(id)")

        do {
            let task: Task = try await apiClient.request(.completeTask(id: id))

            // Update cache
            cache.update(id: id, with: task)

            Logger.info("Task completed: \(id)")

        } catch let error as APIError {
            Logger.error("Failed to complete task: \(error.localizedDescription)")
            errorMessage = error.localizedDescription
            throw error
        }
    }

    /// Uncomplete task
    func uncompleteTask(id: String) async throws {
        isLoading = true
        errorMessage = nil

        defer { isLoading = false }

        Logger.info("Uncompleting task: \(id)")

        do {
            let task: Task = try await apiClient.request(.uncompleteTask(id: id))

            // Update cache
            cache.update(id: id, with: task)

            Logger.info("Task uncompleted: \(id)")

        } catch let error as APIError {
            Logger.error("Failed to uncomplete task: \(error.localizedDescription)")
            errorMessage = error.localizedDescription
            throw error
        }
    }

    // MARK: - Computed Properties

    var pendingTasks: [Task] {
        cache.filter { $0.taskStatus == .pending }
    }

    var inProgressTasks: [Task] {
        cache.filter { $0.taskStatus == .inProgress }
    }

    var completedTasks: [Task] {
        cache.filter { $0.taskStatus == .completed }
    }

    var overdueTasks: [Task] {
        cache.filter { $0.isOverdue }
    }
}
