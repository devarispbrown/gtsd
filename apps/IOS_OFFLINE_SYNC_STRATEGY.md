# GTSD iOS App - Comprehensive Offline Sync Strategy

**Document Version:** 1.0
**Last Updated:** 2025-10-26
**Status:** Implementation Ready

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Architecture Overview](#architecture-overview)
3. [Offline Data Storage](#offline-data-storage)
4. [Sync State Machine](#sync-state-machine)
5. [Offline Queue Management](#offline-queue-management)
6. [Conflict Resolution](#conflict-resolution)
7. [Network Reachability](#network-reachability)
8. [Implementation Guide](#implementation-guide)
9. [Error Handling](#error-handling)
10. [User Experience](#user-experience)
11. [Testing Strategy](#testing-strategy)
12. [Performance Considerations](#performance-considerations)

---

## Executive Summary

### Overview

The GTSD iOS app requires a robust offline-first architecture that allows users to:

- View cached data when offline (tasks, photos, streaks, profile)
- Complete tasks and upload photos while offline
- Automatically sync queued operations when connection is restored
- Resolve conflicts intelligently
- Provide clear feedback on sync status

### Key Requirements

**Read Operations (Offline)**

- View today's tasks (from cache, max 24 hours old)
- View progress photos (thumbnails cached, full images on-demand)
- View streak data (last synced)
- View user profile (cached)

**Write Operations (Offline Queue)**

- Complete tasks with text evidence
- Complete tasks with photo evidence (queued upload)
- Update profile information (queued)

**Sync Operations (Online)**

- Upload queued operations sequentially
- Fetch latest data from server
- Resolve conflicts (server-wins for calculated fields)
- Handle partial failures gracefully

### Architecture Principles

1. **Offline-First**: App functions without network connectivity
2. **Eventual Consistency**: Changes sync when connection restored
3. **User Transparency**: Clear indicators of sync status
4. **Data Integrity**: No data loss during offline operations
5. **Performance**: Fast local reads, background sync

---

## Architecture Overview

### System Components

```
┌─────────────────────────────────────────────────────────────┐
│                      Presentation Layer                      │
│  ┌────────────────────────────────────────────────────┐    │
│  │  ViewModels (Observable)                            │    │
│  │  - Show sync status indicators                      │    │
│  │  - Display offline mode warnings                    │    │
│  │  - Handle user actions regardless of connectivity   │    │
│  └────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
                            │
┌─────────────────────────────────────────────────────────────┐
│                      Domain Layer                            │
│  ┌────────────────────────────────────────────────────┐    │
│  │  SyncCoordinator (Actor)                            │    │
│  │  - Orchestrates all sync operations                 │    │
│  │  - Manages sync state machine                       │    │
│  │  - Triggers background sync                         │    │
│  └────────────────────────────────────────────────────┘    │
│  ┌────────────────────────────────────────────────────┐    │
│  │  OfflineQueue (Actor)                               │    │
│  │  - Stores pending operations                        │    │
│  │  - Processes queue when online                      │    │
│  │  - Handles retries and failures                     │    │
│  └────────────────────────────────────────────────────┘    │
│  ┌────────────────────────────────────────────────────┐    │
│  │  ConflictResolver                                   │    │
│  │  - Resolves data conflicts                          │    │
│  │  - Implements merge strategies                      │    │
│  └────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
                            │
┌─────────────────────────────────────────────────────────────┐
│                       Data Layer                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ SwiftData    │  │ NetworkMonitor│  │ APIClient    │      │
│  │ (Local Cache)│  │ (Reachability)│  │ (Remote API) │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
```

### Data Flow: Offline Write Operation

```
┌──────────────┐
│ User Action  │
│ (Complete    │
│  Task)       │
└──────┬───────┘
       │
       ▼
┌──────────────────────┐
│ ViewModel            │
│ - Validate input     │
│ - Create operation   │
└──────┬───────────────┘
       │
       ▼
┌──────────────────────┐     ┌──────────────────┐
│ NetworkMonitor       │────►│ Online?          │
│ Check connectivity   │     └─────┬────────────┘
└──────────────────────┘           │
                                   ├─ YES ─► API Call ─► Success ─► Update Cache
                                   │                    ▼
                                   │                   Failure ─► Add to Queue
                                   │
                                   └─ NO ──► Add to OfflineQueue
                                             │
                                             ▼
                                    ┌────────────────────┐
                                    │ SwiftData          │
                                    │ - Save operation   │
                                    │ - Update local UI  │
                                    └────────────────────┘
                                             │
                                             ▼
                                    ┌────────────────────┐
                                    │ Show "Pending Sync"│
                                    │ indicator to user  │
                                    └────────────────────┘
```

### Data Flow: Online Sync

```
┌──────────────────┐
│ Network Available│
│ Event Triggered  │
└────────┬─────────┘
         │
         ▼
┌─────────────────────┐
│ SyncCoordinator     │
│ - Check queue size  │
│ - Start sync process│
└────────┬────────────┘
         │
         ▼
┌─────────────────────────┐
│ Process Queue           │
│ (Sequential Operations) │
└────────┬────────────────┘
         │
         ├─► Operation 1 ──► API Call ──► Success ──► Remove from Queue
         │                                           ├─► Update Cache
         │                                           └─► Notify UI
         │
         ├─► Operation 2 ──► API Call ──► Failure ──► Increment Retry Count
         │                                           ├─► Retry Later (Exponential Backoff)
         │                                           └─► Show Error if Max Retries
         │
         └─► Operation N ──► ...

                        ┌──────────────────┐
                        │ Fetch Latest     │
                        │ Server Data      │
                        └────────┬─────────┘
                                 │
                                 ▼
                        ┌──────────────────┐
                        │ Conflict         │
                        │ Resolution       │
                        └────────┬─────────┘
                                 │
                                 ▼
                        ┌──────────────────┐
                        │ Update UI with   │
                        │ Synced Data      │
                        └──────────────────┘
```

---

## Offline Data Storage

### SwiftData Models

#### 1. CachedTask

```swift
import SwiftData
import Foundation

@Model
final class CachedTask {
    @Attribute(.unique) var id: Int
    var userId: Int
    var planId: Int?
    var title: String
    var taskDescription: String?
    var taskType: String // Raw value of TaskType enum
    var status: String // Raw value of TaskStatus enum
    var dueDate: Date
    var dueTime: String? // HH:MM:SS format
    var completedAt: Date?
    var skippedAt: Date?
    var skipReason: String?
    var metadata: Data? // JSON encoded TaskMetadata
    var priority: Int
    var order: Int
    var createdAt: Date
    var updatedAt: Date
    var lastSyncedAt: Date
    var isSynced: Bool

    init(
        id: Int,
        userId: Int,
        planId: Int?,
        title: String,
        taskDescription: String?,
        taskType: String,
        status: String,
        dueDate: Date,
        dueTime: String?,
        priority: Int,
        order: Int,
        metadata: Data? = nil
    ) {
        self.id = id
        self.userId = userId
        self.planId = planId
        self.title = title
        self.taskDescription = taskDescription
        self.taskType = taskType
        self.status = status
        self.dueDate = dueDate
        self.dueTime = dueTime
        self.priority = priority
        self.order = order
        self.metadata = metadata
        self.createdAt = Date()
        self.updatedAt = Date()
        self.lastSyncedAt = Date()
        self.isSynced = true
    }
}

// Extension for domain model conversion
extension CachedTask {
    func toDomain() -> DailyTask? {
        guard let taskType = TaskType(rawValue: taskType),
              let status = TaskStatus(rawValue: status) else {
            return nil
        }

        let taskMetadata: TaskMetadata? = {
            guard let data = metadata else { return nil }
            return try? JSONDecoder().decode(TaskMetadata.self, from: data)
        }()

        return DailyTask(
            id: id,
            userId: userId,
            planId: planId,
            title: title,
            description: taskDescription,
            taskType: taskType,
            dueDate: dueDate,
            dueTime: dueTime,
            status: status,
            completedAt: completedAt,
            skippedAt: skippedAt,
            skipReason: skipReason,
            metadata: taskMetadata,
            priority: priority,
            order: order,
            createdAt: createdAt,
            updatedAt: updatedAt
        )
    }

    static func from(domain: DailyTask) -> CachedTask {
        let metadataData = try? JSONEncoder().encode(domain.metadata)

        return CachedTask(
            id: domain.id,
            userId: domain.userId,
            planId: domain.planId,
            title: domain.title,
            taskDescription: domain.description,
            taskType: domain.taskType.rawValue,
            status: domain.status.rawValue,
            dueDate: domain.dueDate,
            dueTime: domain.dueTime,
            priority: domain.priority,
            order: domain.order,
            metadata: metadataData
        )
    }
}
```

#### 2. CachedPhoto

```swift
@Model
final class CachedPhoto {
    @Attribute(.unique) var id: Int
    var userId: Int
    var fileKey: String
    var fileSize: Int
    var mimeType: String
    var width: Int?
    var height: Int?
    var takenAt: Date?
    var uploadedAt: Date?
    var downloadUrl: String?
    var thumbnailUrl: String?
    var localFileURL: String? // For offline captured photos
    var uploadStatus: String // pending, uploading, uploaded, failed
    var uploadProgress: Double // 0.0 to 1.0
    var uploadRetryCount: Int
    var lastUploadError: String?
    var createdAt: Date
    var lastSyncedAt: Date

    init(
        id: Int,
        userId: Int,
        fileKey: String,
        fileSize: Int,
        mimeType: String,
        takenAt: Date?,
        localFileURL: String? = nil,
        uploadStatus: String = "pending"
    ) {
        self.id = id
        self.userId = userId
        self.fileKey = fileKey
        self.fileSize = fileSize
        self.mimeType = mimeType
        self.takenAt = takenAt
        self.localFileURL = localFileURL
        self.uploadStatus = uploadStatus
        self.uploadProgress = 0.0
        self.uploadRetryCount = 0
        self.createdAt = Date()
        self.lastSyncedAt = Date()
    }
}
```

#### 3. PendingOperation

```swift
@Model
final class PendingOperation {
    @Attribute(.unique) var id: UUID
    var type: String // Raw value of OperationType enum
    var endpoint: String // API endpoint path
    var httpMethod: String // GET, POST, PUT, DELETE
    var payload: Data? // JSON encoded request body
    var headers: Data? // JSON encoded headers
    var taskId: Int? // Reference to related task
    var photoId: Int? // Reference to related photo
    var priority: Int // Higher = more important
    var retryCount: Int
    var maxRetries: Int
    var lastError: String?
    var createdAt: Date
    var lastAttemptAt: Date?
    var nextRetryAt: Date?

    init(
        type: String,
        endpoint: String,
        httpMethod: String,
        payload: Data?,
        headers: Data? = nil,
        taskId: Int? = nil,
        photoId: Int? = nil,
        priority: Int = 0,
        maxRetries: Int = 3
    ) {
        self.id = UUID()
        self.type = type
        self.endpoint = endpoint
        self.httpMethod = httpMethod
        self.payload = payload
        self.headers = headers
        self.taskId = taskId
        self.photoId = photoId
        self.priority = priority
        self.retryCount = 0
        self.maxRetries = maxRetries
        self.createdAt = Date()
    }
}

enum OperationType: String, Codable {
    case completeTask = "complete_task"
    case uploadPhoto = "upload_photo"
    case confirmPhotoUpload = "confirm_photo_upload"
    case updateProfile = "update_profile"
    case submitEvidence = "submit_evidence"
}
```

#### 4. SyncMetadata

```swift
@Model
final class SyncMetadata {
    @Attribute(.unique) var key: String
    var value: String
    var updatedAt: Date

    init(key: String, value: String) {
        self.key = key
        self.value = value
        self.updatedAt = Date()
    }
}

// Common keys
extension SyncMetadata {
    enum Key {
        static let lastFullSync = "last_full_sync"
        static let lastTasksSync = "last_tasks_sync"
        static let lastPhotosSync = "last_photos_sync"
        static let lastStreaksSync = "last_streaks_sync"
        static let pendingOperationsCount = "pending_operations_count"
    }
}
```

---

## Sync State Machine

### States

```swift
enum SyncState: Equatable {
    case idle
    case syncing(progress: Double, currentOperation: String)
    case offline(pendingCount: Int)
    case error(message: String)
    case conflictDetected(conflicts: [DataConflict])
}

struct DataConflict: Equatable {
    let id: UUID
    let type: String
    let localData: String
    let serverData: String
    let resolutionStrategy: ConflictResolutionStrategy
}

enum ConflictResolutionStrategy {
    case serverWins
    case clientWins
    case merge
    case manualReview
}
```

### State Transitions

```swift
actor SyncCoordinator: ObservableObject {
    @Published private(set) var syncState: SyncState = .idle

    private let networkMonitor: NetworkMonitor
    private let offlineQueue: OfflineQueue
    private let apiClient: APIClient
    private let modelContext: ModelContext

    init(
        networkMonitor: NetworkMonitor,
        offlineQueue: OfflineQueue,
        apiClient: APIClient,
        modelContext: ModelContext
    ) {
        self.networkMonitor = networkMonitor
        self.offlineQueue = offlineQueue
        self.apiClient = apiClient
        self.modelContext = modelContext

        setupNetworkObserver()
    }

    // MARK: - State Transitions

    private func transitionTo(_ newState: SyncState) {
        syncState = newState
        logStateTransition(newState)
    }

    private func setupNetworkObserver() {
        Task {
            for await isConnected in networkMonitor.isConnectedStream {
                await handleConnectivityChange(isConnected: isConnected)
            }
        }
    }

    private func handleConnectivityChange(isConnected: Bool) async {
        if isConnected {
            let pendingCount = await offlineQueue.pendingOperationsCount
            if pendingCount > 0 {
                await startSync()
            } else {
                transitionTo(.idle)
            }
        } else {
            let pendingCount = await offlineQueue.pendingOperationsCount
            transitionTo(.offline(pendingCount: pendingCount))
        }
    }

    // MARK: - Sync Triggers

    func startSync() async {
        guard await networkMonitor.isConnected else {
            let pendingCount = await offlineQueue.pendingOperationsCount
            transitionTo(.offline(pendingCount: pendingCount))
            return
        }

        guard case .idle = syncState else {
            // Already syncing
            return
        }

        transitionTo(.syncing(progress: 0.0, currentOperation: "Starting sync..."))

        do {
            // Step 1: Process offline queue
            try await processOfflineQueue()

            // Step 2: Fetch latest data from server
            try await fetchLatestData()

            // Step 3: Resolve any conflicts
            try await resolveConflicts()

            transitionTo(.idle)

        } catch {
            transitionTo(.error(message: error.localizedDescription))
            scheduleRetry()
        }
    }

    func triggerManualSync() async {
        await startSync()
    }

    func cancelSync() {
        guard case .syncing = syncState else { return }
        transitionTo(.idle)
    }

    // MARK: - Private Helpers

    private func processOfflineQueue() async throws {
        let operations = await offlineQueue.pendingOperations
        let totalOperations = operations.count

        for (index, operation) in operations.enumerated() {
            let progress = Double(index) / Double(totalOperations)
            transitionTo(.syncing(
                progress: progress,
                currentOperation: "Syncing \(operation.type) (\(index + 1)/\(totalOperations))"
            ))

            try await offlineQueue.processOperation(operation)
        }
    }

    private func fetchLatestData() async throws {
        transitionTo(.syncing(progress: 0.75, currentOperation: "Fetching latest data..."))

        // Fetch tasks
        let tasksResponse: TodayTasksResponse = try await apiClient.request(.getTodayTasks())
        try await updateLocalTasks(from: tasksResponse)

        // Fetch photos
        let photosResponse: PhotosListResponse = try await apiClient.request(.getPhotos())
        try await updateLocalPhotos(from: photosResponse)

        // Fetch streaks
        let streaksResponse: StreaksResponse = try await apiClient.request(.getMyStreaks)
        try await updateLocalStreaks(from: streaksResponse)
    }

    private func resolveConflicts() async throws {
        // Check for conflicts between local and server data
        let conflicts = try await detectConflicts()

        if !conflicts.isEmpty {
            transitionTo(.conflictDetected(conflicts: conflicts))

            // Auto-resolve based on strategy
            for conflict in conflicts {
                try await autoResolveConflict(conflict)
            }
        }
    }

    private func detectConflicts() async throws -> [DataConflict] {
        var conflicts: [DataConflict] = []

        // Example: Check for task conflicts
        let descriptor = FetchDescriptor<CachedTask>(
            predicate: #Predicate { !$0.isSynced }
        )

        let unsyncedTasks = try modelContext.fetch(descriptor)

        for task in unsyncedTasks {
            // Fetch server version
            // Compare timestamps
            // Detect conflicts
        }

        return conflicts
    }

    private func autoResolveConflict(_ conflict: DataConflict) async throws {
        switch conflict.resolutionStrategy {
        case .serverWins:
            // Use server data
            break
        case .clientWins:
            // Use client data
            break
        case .merge:
            // Merge both
            break
        case .manualReview:
            // Requires user input
            break
        }
    }

    private func scheduleRetry() {
        Task {
            try? await Task.sleep(nanoseconds: 30_000_000_000) // 30 seconds
            await startSync()
        }
    }

    private func updateLocalTasks(from response: TodayTasksResponse) async throws {
        // Update SwiftData cache
        for taskGroup in response.tasks {
            for task in taskGroup.tasks {
                let cachedTask = CachedTask.from(domain: task)
                modelContext.insert(cachedTask)
            }
        }

        try modelContext.save()
    }

    private func updateLocalPhotos(from response: PhotosListResponse) async throws {
        // Update SwiftData cache
        for photo in response.photos {
            let cachedPhoto = CachedPhoto(
                id: photo.id,
                userId: photo.userId,
                fileKey: photo.fileKey,
                fileSize: photo.fileSize,
                mimeType: photo.mimeType,
                takenAt: photo.takenAt,
                uploadStatus: "uploaded"
            )
            cachedPhoto.downloadUrl = photo.downloadUrl
            modelContext.insert(cachedPhoto)
        }

        try modelContext.save()
    }

    private func updateLocalStreaks(from response: StreaksResponse) async throws {
        // Update local streaks cache
    }

    private func logStateTransition(_ state: SyncState) {
        print("[SyncCoordinator] State: \(state)")
    }
}
```

---

## Offline Queue Management

### OfflineQueue Actor

```swift
actor OfflineQueue {
    private let modelContext: ModelContext
    private let apiClient: APIClient

    private(set) var pendingOperationsCount: Int = 0
    private var isProcessing: Bool = false

    init(modelContext: ModelContext, apiClient: APIClient) {
        self.modelContext = modelContext
        self.apiClient = apiClient

        Task {
            await updatePendingCount()
        }
    }

    // MARK: - Queue Operations

    var pendingOperations: [PendingOperation] {
        get async {
            let descriptor = FetchDescriptor<PendingOperation>(
                sortBy: [
                    SortDescriptor(\.priority, order: .reverse),
                    SortDescriptor(\.createdAt, order: .forward)
                ]
            )

            return (try? modelContext.fetch(descriptor)) ?? []
        }
    }

    func enqueue(_ operation: PendingOperation) async throws {
        modelContext.insert(operation)
        try modelContext.save()
        await updatePendingCount()
    }

    func enqueue(
        type: OperationType,
        endpoint: String,
        httpMethod: String,
        payload: Data?,
        taskId: Int? = nil,
        photoId: Int? = nil,
        priority: Int = 0
    ) async throws {
        let operation = PendingOperation(
            type: type.rawValue,
            endpoint: endpoint,
            httpMethod: httpMethod,
            payload: payload,
            taskId: taskId,
            photoId: photoId,
            priority: priority
        )

        try await enqueue(operation)
    }

    func processQueue() async throws {
        guard !isProcessing else { return }
        isProcessing = true
        defer { isProcessing = false }

        let operations = await pendingOperations

        for operation in operations {
            try await processOperation(operation)
        }
    }

    func processOperation(_ operation: PendingOperation) async throws {
        do {
            // Build request
            guard let url = URL(string: operation.endpoint) else {
                throw OfflineQueueError.invalidEndpoint
            }

            var request = URLRequest(url: url)
            request.httpMethod = operation.httpMethod
            request.httpBody = operation.payload

            // Add headers
            if let headersData = operation.headers,
               let headers = try? JSONDecoder().decode([String: String].self, from: headersData) {
                for (key, value) in headers {
                    request.addValue(value, forHTTPHeaderField: key)
                }
            }

            // Execute request
            let (data, response) = try await URLSession.shared.data(for: request)

            guard let httpResponse = response as? HTTPURLResponse,
                  (200...299).contains(httpResponse.statusCode) else {
                throw OfflineQueueError.requestFailed
            }

            // Success - remove from queue
            try await removeOperation(operation)

            // Update related cached data
            try await updateCacheAfterSync(operation: operation, responseData: data)

        } catch {
            // Failure - increment retry count
            operation.retryCount += 1
            operation.lastError = error.localizedDescription
            operation.lastAttemptAt = Date()

            if operation.retryCount >= operation.maxRetries {
                // Max retries exceeded - mark as failed
                try await markOperationAsFailed(operation)
            } else {
                // Schedule retry with exponential backoff
                let delaySeconds = pow(2.0, Double(operation.retryCount))
                operation.nextRetryAt = Date().addingTimeInterval(delaySeconds)
                try modelContext.save()
            }

            throw error
        }
    }

    func removeOperation(_ operation: PendingOperation) async throws {
        modelContext.delete(operation)
        try modelContext.save()
        await updatePendingCount()
    }

    func markOperationAsFailed(_ operation: PendingOperation) async throws {
        // Log failure
        print("[OfflineQueue] Operation failed after \(operation.maxRetries) retries: \(operation.type)")

        // Remove from queue
        try await removeOperation(operation)

        // Optionally: Store in failed operations table for user review
    }

    func clearQueue() async throws {
        let operations = await pendingOperations
        for operation in operations {
            modelContext.delete(operation)
        }
        try modelContext.save()
        await updatePendingCount()
    }

    // MARK: - Private Helpers

    private func updatePendingCount() async {
        let descriptor = FetchDescriptor<PendingOperation>()
        pendingOperationsCount = (try? modelContext.fetchCount(descriptor)) ?? 0
    }

    private func updateCacheAfterSync(operation: PendingOperation, responseData: Data) async throws {
        guard let operationType = OperationType(rawValue: operation.type) else { return }

        switch operationType {
        case .completeTask:
            if let taskId = operation.taskId {
                try await markTaskAsSynced(taskId: taskId)
            }

        case .uploadPhoto, .confirmPhotoUpload:
            if let photoId = operation.photoId {
                try await markPhotoAsUploaded(photoId: photoId, responseData: responseData)
            }

        case .updateProfile:
            // Update user profile cache
            break

        case .submitEvidence:
            // Update evidence cache
            break
        }
    }

    private func markTaskAsSynced(taskId: Int) async throws {
        let descriptor = FetchDescriptor<CachedTask>(
            predicate: #Predicate { $0.id == taskId }
        )

        if let task = try modelContext.fetch(descriptor).first {
            task.isSynced = true
            task.lastSyncedAt = Date()
            try modelContext.save()
        }
    }

    private func markPhotoAsUploaded(photoId: Int, responseData: Data) async throws {
        let descriptor = FetchDescriptor<CachedPhoto>(
            predicate: #Predicate { $0.id == photoId }
        )

        if let photo = try modelContext.fetch(descriptor).first {
            photo.uploadStatus = "uploaded"
            photo.uploadProgress = 1.0
            photo.lastSyncedAt = Date()

            // Parse response for download URL
            if let response = try? JSONDecoder().decode(ConfirmPhotoResponse.self, from: responseData) {
                photo.downloadUrl = response.downloadUrl
            }

            try modelContext.save()
        }
    }
}

enum OfflineQueueError: LocalizedError {
    case invalidEndpoint
    case requestFailed
    case maxRetriesExceeded

    var errorDescription: String? {
        switch self {
        case .invalidEndpoint:
            return "Invalid API endpoint"
        case .requestFailed:
            return "Network request failed"
        case .maxRetriesExceeded:
            return "Maximum retry attempts exceeded"
        }
    }
}
```

### Queue Operation Examples

#### Example 1: Complete Task Offline

```swift
extension TasksViewModel {
    func completeTask(_ task: DailyTask, notes: String?) async {
        // Update local cache immediately
        let cachedTask = CachedTask.from(domain: task)
        cachedTask.status = TaskStatus.completed.rawValue
        cachedTask.completedAt = Date()
        cachedTask.isSynced = false
        modelContext.insert(cachedTask)
        try? modelContext.save()

        // Update UI immediately
        await refreshTasks()

        // Queue for sync
        let request = CreateEvidenceRequest(
            taskId: task.id,
            type: .textLog,
            data: EvidenceData(text: notes, metrics: nil, photoUrl: nil),
            notes: notes
        )

        let payload = try? JSONEncoder().encode(request)

        try? await offlineQueue.enqueue(
            type: .completeTask,
            endpoint: "/v1/evidence",
            httpMethod: "POST",
            payload: payload,
            taskId: task.id,
            priority: 10
        )

        // Trigger sync if online
        if await networkMonitor.isConnected {
            await syncCoordinator.startSync()
        } else {
            showOfflineIndicator = true
        }
    }
}
```

#### Example 2: Upload Photo Offline

```swift
extension PhotoUploadViewModel {
    func uploadPhoto(_ image: UIImage) async throws {
        // Compress image
        guard let imageData = await imageCompressor.compress(image, maxSizeKB: 2048) else {
            throw PhotoUploadError.compressionFailed
        }

        // Save to local file system
        let fileURL = try saveImageLocally(imageData: imageData)

        // Create pending photo record
        let photoId = Int.random(in: 1...1000000) // Temporary local ID
        let cachedPhoto = CachedPhoto(
            id: photoId,
            userId: currentUserId,
            fileKey: "pending_\(UUID().uuidString)",
            fileSize: imageData.count,
            mimeType: "image/jpeg",
            takenAt: Date(),
            localFileURL: fileURL.path,
            uploadStatus: "pending"
        )
        modelContext.insert(cachedPhoto)
        try modelContext.save()

        // Queue upload operation
        let presignRequest = PresignRequest(
            fileName: "photo_\(Date().timeIntervalSince1970).jpg",
            contentType: "image/jpeg",
            fileSize: imageData.count
        )

        let payload = try JSONEncoder().encode(presignRequest)

        try await offlineQueue.enqueue(
            type: .uploadPhoto,
            endpoint: "/v1/progress/photo/presign",
            httpMethod: "POST",
            payload: payload,
            photoId: photoId,
            priority: 5
        )

        // Update UI
        photos.append(cachedPhoto)

        // Trigger sync if online
        if await networkMonitor.isConnected {
            await syncCoordinator.startSync()
        }
    }

    private func saveImageLocally(imageData: Data) throws -> URL {
        let documentsURL = FileManager.default.urls(
            for: .documentDirectory,
            in: .userDomainMask
        )[0]

        let photosURL = documentsURL.appendingPathComponent("OfflinePhotos", isDirectory: true)
        try FileManager.default.createDirectory(at: photosURL, withIntermediateDirectories: true)

        let fileURL = photosURL.appendingPathComponent("\(UUID().uuidString).jpg")
        try imageData.write(to: fileURL)

        return fileURL
    }
}
```

---

## Conflict Resolution

### Conflict Types

```swift
enum ConflictType {
    case taskStatusMismatch
    case photoUploadConflict
    case profileDataMismatch
    case streakCalculationDifference
}

struct ResolvedConflict {
    let conflictType: ConflictType
    let resolution: ConflictResolution
    let mergedData: Any
}

enum ConflictResolution {
    case usedServerData
    case usedClientData
    case merged
    case failed(reason: String)
}
```

### Resolution Strategies

#### 1. Server-Wins Strategy (Default for Calculated Fields)

```swift
actor ConflictResolver {

    // Server wins for calculated fields (BMR, TDEE, streaks, etc.)
    func resolveCalculatedFieldConflict(
        serverData: UserSettings,
        localData: UserSettings
    ) -> UserSettings {
        // Always trust server for calculated values
        var resolved = serverData

        // Keep client changes for user-editable fields
        if localData.updatedAt > serverData.updatedAt {
            resolved.currentWeight = localData.currentWeight
            resolved.targetWeight = localData.targetWeight
            resolved.height = localData.height
        }

        return resolved
    }
}
```

#### 2. Last-Write-Wins Strategy (Simple Fields)

```swift
extension ConflictResolver {
    func resolveSimpleFieldConflict<T>(
        serverValue: T,
        serverTimestamp: Date,
        localValue: T,
        localTimestamp: Date
    ) -> T {
        return localTimestamp > serverTimestamp ? localValue : serverValue
    }
}
```

#### 3. Client-Wins for User Actions

```swift
extension ConflictResolver {
    func resolveTaskCompletionConflict(
        serverTask: DailyTask,
        localTask: DailyTask
    ) -> DailyTask {
        // If user completed locally, keep local completion
        if localTask.status == .completed && serverTask.status != .completed {
            return localTask
        }

        // Otherwise use server data
        return serverTask
    }
}
```

#### 4. Merge Strategy (Complex Data)

```swift
extension ConflictResolver {
    func mergePhotoCollections(
        serverPhotos: [Photo],
        localPhotos: [CachedPhoto]
    ) -> [Photo] {
        var merged: [Photo] = []

        // Add all server photos
        for serverPhoto in serverPhotos {
            merged.append(serverPhoto)
        }

        // Add local photos that don't exist on server
        for localPhoto in localPhotos {
            if !merged.contains(where: { $0.id == localPhoto.id }) {
                // This is a pending upload
                if let photo = localPhoto.toDomain() {
                    merged.append(photo)
                }
            }
        }

        return merged
    }
}
```

### Conflict Detection

```swift
extension SyncCoordinator {
    private func detectTaskConflicts() async throws -> [DataConflict] {
        var conflicts: [DataConflict] = []

        // Fetch unsynced local tasks
        let descriptor = FetchDescriptor<CachedTask>(
            predicate: #Predicate { !$0.isSynced }
        )

        let unsyncedTasks = try modelContext.fetch(descriptor)

        for localTask in unsyncedTasks {
            // Fetch server version
            do {
                let endpoint = APIEndpoint.getTask(id: localTask.id)
                let serverTask: DailyTask = try await apiClient.request(endpoint)

                // Compare timestamps
                if serverTask.updatedAt > localTask.updatedAt {
                    // Server has newer data
                    if localTask.status != serverTask.status.rawValue {
                        // Conflict detected
                        let conflict = DataConflict(
                            id: UUID(),
                            type: "task_status",
                            localData: localTask.status,
                            serverData: serverTask.status.rawValue,
                            resolutionStrategy: .clientWins // User actions win
                        )
                        conflicts.append(conflict)
                    }
                }
            } catch {
                // Server task not found or network error
                continue
            }
        }

        return conflicts
    }
}
```

---

## Network Reachability

### NetworkMonitor Actor

```swift
import Network
import Combine

actor NetworkMonitor: ObservableObject {
    @Published private(set) var isConnected: Bool = false
    @Published private(set) var connectionType: ConnectionType = .unknown

    private let monitor: NWPathMonitor
    private let queue = DispatchQueue(label: "NetworkMonitor")

    var isConnectedStream: AsyncStream<Bool> {
        AsyncStream { continuation in
            Task {
                for await value in $isConnected.values {
                    continuation.yield(value)
                }
            }
        }
    }

    enum ConnectionType {
        case wifi
        case cellular
        case ethernet
        case unknown
    }

    init() {
        monitor = NWPathMonitor()
        startMonitoring()
    }

    deinit {
        stopMonitoring()
    }

    private func startMonitoring() {
        monitor.pathUpdateHandler = { [weak self] path in
            Task {
                await self?.updateConnectionStatus(path: path)
            }
        }

        monitor.start(queue: queue)
    }

    private func stopMonitoring() {
        monitor.cancel()
    }

    private func updateConnectionStatus(path: NWPath) {
        isConnected = path.status == .satisfied

        if path.usesInterfaceType(.wifi) {
            connectionType = .wifi
        } else if path.usesInterfaceType(.cellular) {
            connectionType = .cellular
        } else if path.usesInterfaceType(.wiredEthernet) {
            connectionType = .ethernet
        } else {
            connectionType = .unknown
        }

        NotificationCenter.default.post(
            name: .networkStatusChanged,
            object: nil,
            userInfo: ["isConnected": isConnected]
        )
    }

    func waitForConnection(timeout: TimeInterval = 30) async throws {
        let startTime = Date()

        while !isConnected {
            if Date().timeIntervalSince(startTime) > timeout {
                throw NetworkError.connectionTimeout
            }

            try await Task.sleep(nanoseconds: 500_000_000) // 0.5 seconds
        }
    }
}

extension Notification.Name {
    static let networkStatusChanged = Notification.Name("networkStatusChanged")
}

enum NetworkError: LocalizedError {
    case connectionTimeout
    case noConnection

    var errorDescription: String? {
        switch self {
        case .connectionTimeout:
            return "Connection timeout"
        case .noConnection:
            return "No network connection"
        }
    }
}
```

### Usage in ViewModels

```swift
@MainActor
class TasksViewModel: ObservableObject {
    @Published var showOfflineIndicator: Bool = false

    private let networkMonitor: NetworkMonitor
    private let syncCoordinator: SyncCoordinator

    init(networkMonitor: NetworkMonitor, syncCoordinator: SyncCoordinator) {
        self.networkMonitor = networkMonitor
        self.syncCoordinator = syncCoordinator

        observeNetworkChanges()
    }

    private func observeNetworkChanges() {
        Task {
            for await isConnected in networkMonitor.isConnectedStream {
                await handleNetworkChange(isConnected: isConnected)
            }
        }
    }

    private func handleNetworkChange(isConnected: Bool) async {
        showOfflineIndicator = !isConnected

        if isConnected {
            // Connection restored - trigger sync
            await syncCoordinator.startSync()
        }
    }
}
```

---

## Implementation Guide

### Phase 1: Foundation (Week 1)

**Objectives:**

- Set up SwiftData models
- Implement basic caching
- Create NetworkMonitor

**Tasks:**

1. Create SwiftData models (CachedTask, CachedPhoto, PendingOperation, SyncMetadata)
2. Set up ModelContainer with in-memory configuration for testing
3. Implement NetworkMonitor with NWPathMonitor
4. Create basic cache read/write operations

**Deliverables:**

- SwiftData models defined
- NetworkMonitor working
- Basic cache operations functional

### Phase 2: Offline Queue (Week 2)

**Objectives:**

- Implement OfflineQueue actor
- Create queue operations
- Add retry logic

**Tasks:**

1. Implement OfflineQueue actor with CRUD operations
2. Add queue processing with retry logic
3. Implement exponential backoff for failures
4. Create queue status tracking

**Deliverables:**

- OfflineQueue functional
- Retry mechanism working
- Queue persistence verified

### Phase 3: Sync Coordinator (Week 3)

**Objectives:**

- Implement SyncCoordinator
- Create sync state machine
- Add automatic sync triggers

**Tasks:**

1. Implement SyncCoordinator actor
2. Create sync state machine with transitions
3. Add automatic sync on network restore
4. Implement manual sync trigger
5. Add background sync support

**Deliverables:**

- SyncCoordinator operational
- State machine transitions working
- Automatic sync functional

### Phase 4: Conflict Resolution (Week 4)

**Objectives:**

- Implement conflict detection
- Add resolution strategies
- Test edge cases

**Tasks:**

1. Implement ConflictResolver
2. Add conflict detection logic
3. Implement resolution strategies (server-wins, client-wins, merge)
4. Test various conflict scenarios

**Deliverables:**

- Conflict detection working
- Resolution strategies implemented
- Edge cases handled

### Phase 5: UI Integration (Week 5)

**Objectives:**

- Add sync indicators
- Create offline mode UI
- Show sync progress

**Tasks:**

1. Add sync status indicators to UI
2. Create offline mode banners
3. Show sync progress in views
4. Add pull-to-refresh for manual sync

**Deliverables:**

- UI reflects sync status
- Offline indicators visible
- Progress tracking displayed

### Phase 6: Testing & Optimization (Week 6)

**Objectives:**

- Test offline scenarios
- Optimize performance
- Fix bugs

**Tasks:**

1. Write unit tests for queue operations
2. Write integration tests for sync flow
3. Test offline scenarios (airplane mode, poor connection)
4. Performance profiling and optimization
5. Bug fixes

**Deliverables:**

- Test coverage > 80%
- Performance optimized
- Bugs resolved

---

## Error Handling

### Error Types

```swift
enum OfflineSyncError: LocalizedError {
    case networkUnavailable
    case queueFull
    case operationFailed(operation: OperationType, reason: String)
    case conflictResolutionFailed
    case dataCorruption
    case storageQuotaExceeded

    var errorDescription: String? {
        switch self {
        case .networkUnavailable:
            return "No network connection available"
        case .queueFull:
            return "Offline queue is full. Please sync when online."
        case .operationFailed(let operation, let reason):
            return "Failed to sync \(operation.rawValue): \(reason)"
        case .conflictResolutionFailed:
            return "Unable to resolve data conflicts"
        case .dataCorruption:
            return "Local data is corrupted. Please clear cache and sync."
        case .storageQuotaExceeded:
            return "Device storage is full. Please free up space."
        }
    }

    var recoverySuggestion: String? {
        switch self {
        case .networkUnavailable:
            return "Your changes will be synced when you're back online"
        case .queueFull:
            return "Connect to a network to sync pending changes"
        case .operationFailed:
            return "We'll retry automatically. Check your connection."
        case .conflictResolutionFailed:
            return "Please contact support if this issue persists"
        case .dataCorruption:
            return "Go to Settings > Clear Cache to fix this issue"
        case .storageQuotaExceeded:
            return "Delete some photos or apps to free up space"
        }
    }
}
```

### Error Recovery Strategies

#### 1. Network Errors

```swift
extension OfflineQueue {
    private func handleNetworkError(_ error: Error, for operation: PendingOperation) async throws {
        // Increment retry count
        operation.retryCount += 1

        if operation.retryCount < operation.maxRetries {
            // Schedule retry with exponential backoff
            let delaySeconds = pow(2.0, Double(operation.retryCount))
            operation.nextRetryAt = Date().addingTimeInterval(delaySeconds)
            try modelContext.save()

            // Log retry attempt
            print("[OfflineQueue] Retry \(operation.retryCount)/\(operation.maxRetries) for \(operation.type)")
        } else {
            // Max retries exceeded - notify user
            try await markOperationAsFailed(operation)

            NotificationCenter.default.post(
                name: .syncOperationFailed,
                object: nil,
                userInfo: ["operation": operation.type]
            )
        }
    }
}
```

#### 2. Server Errors

```swift
extension OfflineQueue {
    private func handleServerError(
        statusCode: Int,
        for operation: PendingOperation
    ) async throws {
        switch statusCode {
        case 401:
            // Unauthorized - refresh token and retry
            try await refreshAuthToken()
            try await processOperation(operation)

        case 409:
            // Conflict - trigger conflict resolution
            NotificationCenter.default.post(
                name: .syncConflictDetected,
                object: nil,
                userInfo: ["operation": operation]
            )

        case 422:
            // Validation error - remove from queue (won't succeed on retry)
            try await removeOperation(operation)

        case 500...599:
            // Server error - retry with backoff
            try await handleNetworkError(
                APIError.serverError(statusCode: statusCode, message: "Server error"),
                for: operation
            )

        default:
            // Unknown error - retry
            try await handleNetworkError(
                APIError.unknown("HTTP \(statusCode)"),
                for: operation
            )
        }
    }
}
```

#### 3. Data Corruption

```swift
extension SyncCoordinator {
    func handleDataCorruption() async throws {
        // Clear local cache
        try await clearLocalCache()

        // Fetch fresh data from server
        try await fetchLatestData()

        // Notify user
        NotificationCenter.default.post(
            name: .dataCacheCleared,
            object: nil
        )
    }

    private func clearLocalCache() async throws {
        // Delete all cached data
        try modelContext.delete(model: CachedTask.self)
        try modelContext.delete(model: CachedPhoto.self)
        try modelContext.save()
    }
}
```

---

## User Experience

### Sync Status Indicators

#### 1. Offline Mode Banner

```swift
struct OfflineBanner: View {
    let pendingCount: Int

    var body: some View {
        HStack(spacing: 12) {
            Image(systemName: "wifi.slash")
                .foregroundColor(.white)

            VStack(alignment: .leading, spacing: 2) {
                Text("Offline Mode")
                    .font(.headline)
                    .foregroundColor(.white)

                Text("\(pendingCount) change\(pendingCount == 1 ? "" : "s") pending sync")
                    .font(.caption)
                    .foregroundColor(.white.opacity(0.8))
            }

            Spacer()
        }
        .padding()
        .background(Color.orange)
    }
}
```

#### 2. Sync Progress Indicator

```swift
struct SyncProgressView: View {
    let progress: Double
    let currentOperation: String

    var body: some View {
        VStack(spacing: 8) {
            HStack {
                Image(systemName: "arrow.triangle.2.circlepath")
                    .rotationEffect(.degrees(progress * 360))
                    .animation(.linear(duration: 1).repeatForever(autoreverses: false), value: progress)

                Text("Syncing...")
                    .font(.subheadline)

                Spacer()

                Text("\(Int(progress * 100))%")
                    .font(.caption)
                    .foregroundColor(.secondary)
            }

            ProgressView(value: progress)
                .progressViewStyle(LinearProgressViewStyle())

            Text(currentOperation)
                .font(.caption2)
                .foregroundColor(.secondary)
        }
        .padding()
        .background(Color(.systemBackground))
        .cornerRadius(12)
        .shadow(radius: 4)
    }
}
```

#### 3. Task Card Pending Indicator

```swift
struct TaskCard: View {
    let task: DailyTask
    let isPendingSync: Bool

    var body: some View {
        HStack {
            // Task content
            VStack(alignment: .leading) {
                Text(task.title)
                    .font(.headline)
            }

            Spacer()

            if isPendingSync {
                Image(systemName: "clock.arrow.circlepath")
                    .foregroundColor(.orange)
                    .help("Pending sync")
            }

            // Completion checkmark
        }
    }
}
```

#### 4. Photo Upload Status

```swift
struct PhotoCell: View {
    let photo: CachedPhoto

    var body: some View {
        ZStack(alignment: .bottomTrailing) {
            AsyncImage(url: photo.thumbnailURL) { image in
                image.resizable()
                    .aspectRatio(contentMode: .fill)
            } placeholder: {
                ProgressView()
            }
            .frame(width: 100, height: 100)
            .clipped()

            if photo.uploadStatus == "pending" || photo.uploadStatus == "uploading" {
                VStack {
                    if photo.uploadStatus == "uploading" {
                        CircularProgressView(progress: photo.uploadProgress)
                            .frame(width: 30, height: 30)
                    } else {
                        Image(systemName: "icloud.and.arrow.up")
                            .foregroundColor(.white)
                            .padding(8)
                            .background(Color.orange.opacity(0.8))
                            .clipShape(Circle())
                    }
                }
            }
        }
    }
}
```

### Pull-to-Refresh

```swift
struct TasksListView: View {
    @ObservedObject var viewModel: TasksViewModel

    var body: some View {
        List(viewModel.tasks) { task in
            TaskCard(task: task, isPendingSync: !task.isSynced)
        }
        .refreshable {
            await viewModel.refresh()
        }
    }
}

extension TasksViewModel {
    func refresh() async {
        await syncCoordinator.startSync()
        await loadTasks()
    }
}
```

### Error Notifications

```swift
struct SyncErrorAlert: ViewModifier {
    @Binding var error: OfflineSyncError?

    func body(content: Content) -> some View {
        content
            .alert("Sync Error", isPresented: .constant(error != nil)) {
                Button("Retry") {
                    Task {
                        // Retry sync
                    }
                }
                Button("Cancel", role: .cancel) {
                    error = nil
                }
            } message: {
                if let error = error {
                    VStack(alignment: .leading) {
                        Text(error.errorDescription ?? "Unknown error")
                        if let suggestion = error.recoverySuggestion {
                            Text(suggestion)
                                .font(.caption)
                        }
                    }
                }
            }
    }
}
```

---

## Testing Strategy

### Unit Tests

#### 1. OfflineQueue Tests

```swift
final class OfflineQueueTests: XCTestCase {
    var sut: OfflineQueue!
    var modelContext: ModelContext!
    var mockAPIClient: MockAPIClient!

    override func setUp() async throws {
        // Create in-memory model container
        let config = ModelConfiguration(isStoredInMemoryOnly: true)
        let container = try ModelContainer(
            for: PendingOperation.self,
            configurations: config
        )
        modelContext = ModelContext(container)

        mockAPIClient = MockAPIClient()
        sut = OfflineQueue(modelContext: modelContext, apiClient: mockAPIClient)
    }

    func testEnqueue_ShouldAddOperationToQueue() async throws {
        // Given
        let operation = PendingOperation(
            type: OperationType.completeTask.rawValue,
            endpoint: "/v1/evidence",
            httpMethod: "POST",
            payload: nil,
            taskId: 123
        )

        // When
        try await sut.enqueue(operation)

        // Then
        let pendingCount = await sut.pendingOperationsCount
        XCTAssertEqual(pendingCount, 1)
    }

    func testProcessQueue_WithSuccessfulOperation_ShouldRemoveFromQueue() async throws {
        // Given
        mockAPIClient.shouldSucceed = true
        let operation = PendingOperation(
            type: OperationType.completeTask.rawValue,
            endpoint: "/v1/evidence",
            httpMethod: "POST",
            payload: nil,
            taskId: 123
        )
        try await sut.enqueue(operation)

        // When
        try await sut.processQueue()

        // Then
        let pendingCount = await sut.pendingOperationsCount
        XCTAssertEqual(pendingCount, 0)
    }

    func testProcessQueue_WithFailedOperation_ShouldRetry() async throws {
        // Given
        mockAPIClient.shouldSucceed = false
        let operation = PendingOperation(
            type: OperationType.completeTask.rawValue,
            endpoint: "/v1/evidence",
            httpMethod: "POST",
            payload: nil,
            taskId: 123,
            maxRetries: 3
        )
        try await sut.enqueue(operation)

        // When
        do {
            try await sut.processQueue()
            XCTFail("Should have thrown error")
        } catch {
            // Then
            let operations = await sut.pendingOperations
            XCTAssertEqual(operations.first?.retryCount, 1)
            XCTAssertNotNil(operations.first?.nextRetryAt)
        }
    }

    func testProcessQueue_WithMaxRetriesExceeded_ShouldRemoveOperation() async throws {
        // Given
        mockAPIClient.shouldSucceed = false
        let operation = PendingOperation(
            type: OperationType.completeTask.rawValue,
            endpoint: "/v1/evidence",
            httpMethod: "POST",
            payload: nil,
            taskId: 123,
            maxRetries: 1
        )
        try await sut.enqueue(operation)

        // When
        // First attempt
        do { try await sut.processQueue() } catch {}

        // Second attempt (should exceed max retries)
        do { try await sut.processQueue() } catch {}

        // Then
        let pendingCount = await sut.pendingOperationsCount
        XCTAssertEqual(pendingCount, 0)
    }
}
```

#### 2. SyncCoordinator Tests

```swift
final class SyncCoordinatorTests: XCTestCase {
    var sut: SyncCoordinator!
    var mockNetworkMonitor: MockNetworkMonitor!
    var mockOfflineQueue: MockOfflineQueue!
    var mockAPIClient: MockAPIClient!

    func testStartSync_WhenOffline_ShouldTransitionToOfflineState() async {
        // Given
        mockNetworkMonitor.isConnected = false
        mockOfflineQueue.pendingOperationsCount = 5

        // When
        await sut.startSync()

        // Then
        let state = await sut.syncState
        if case .offline(let count) = state {
            XCTAssertEqual(count, 5)
        } else {
            XCTFail("Expected offline state")
        }
    }

    func testStartSync_WhenOnline_ShouldProcessQueue() async {
        // Given
        mockNetworkMonitor.isConnected = true
        mockOfflineQueue.pendingOperationsCount = 3
        mockAPIClient.shouldSucceed = true

        // When
        await sut.startSync()

        // Then
        XCTAssertTrue(mockOfflineQueue.processQueueCalled)

        let state = await sut.syncState
        XCTAssertEqual(state, .idle)
    }

    func testNetworkRestore_ShouldTriggerAutomaticSync() async {
        // Given
        mockNetworkMonitor.isConnected = false
        mockOfflineQueue.pendingOperationsCount = 2

        // When
        mockNetworkMonitor.simulateNetworkRestore()

        // Wait for async observer to trigger
        try? await Task.sleep(nanoseconds: 100_000_000)

        // Then
        XCTAssertTrue(mockOfflineQueue.processQueueCalled)
    }
}
```

### Integration Tests

#### 1. Offline Task Completion Flow

```swift
final class OfflineTaskCompletionTests: XCTestCase {
    func testCompleteTask_WhileOffline_ShouldQueueAndSyncWhenOnline() async throws {
        // Given
        let container = try ModelContainer(
            for: CachedTask.self, PendingOperation.self,
            configurations: ModelConfiguration(isStoredInMemoryOnly: true)
        )
        let modelContext = ModelContext(container)

        let networkMonitor = NetworkMonitor()
        let apiClient = APIClient(baseURL: URL(string: "http://localhost:3000")!)
        let offlineQueue = OfflineQueue(modelContext: modelContext, apiClient: apiClient)
        let syncCoordinator = SyncCoordinator(
            networkMonitor: networkMonitor,
            offlineQueue: offlineQueue,
            apiClient: apiClient,
            modelContext: modelContext
        )

        // Simulate offline
        await networkMonitor.setConnected(false)

        // When - Complete task offline
        let task = DailyTask(
            id: 1,
            userId: 1,
            planId: 1,
            title: "Test Task",
            description: nil,
            taskType: .workout,
            dueDate: Date(),
            dueTime: nil,
            status: .pending,
            completedAt: nil,
            skippedAt: nil,
            skipReason: nil,
            metadata: nil,
            priority: 0,
            order: 0,
            createdAt: Date(),
            updatedAt: Date()
        )

        // Complete task (should queue)
        let request = CreateEvidenceRequest(
            taskId: task.id,
            type: .textLog,
            data: EvidenceData(text: "Completed offline", metrics: nil, photoUrl: nil),
            notes: "Completed offline"
        )
        let payload = try JSONEncoder().encode(request)

        try await offlineQueue.enqueue(
            type: .completeTask,
            endpoint: "/v1/evidence",
            httpMethod: "POST",
            payload: payload,
            taskId: task.id
        )

        // Then - Verify queued
        let pendingCount = await offlineQueue.pendingOperationsCount
        XCTAssertEqual(pendingCount, 1)

        // When - Go online
        await networkMonitor.setConnected(true)

        // Wait for sync
        try await Task.sleep(nanoseconds: 1_000_000_000)

        // Then - Verify synced
        let finalPendingCount = await offlineQueue.pendingOperationsCount
        XCTAssertEqual(finalPendingCount, 0)
    }
}
```

### UI Tests

#### 1. Offline Indicator

```swift
final class OfflineIndicatorUITests: XCTestCase {
    var app: XCUIApplication!

    func testOfflineBanner_WhenOffline_ShouldDisplay() {
        // Given
        app.launch()
        app.launchArguments.append("--uitesting-offline-mode")

        // Then
        let offlineBanner = app.staticTexts["Offline Mode"]
        XCTAssertTrue(offlineBanner.exists)
    }

    func testSyncIndicator_WhenSyncing_ShouldShowProgress() {
        // Given
        app.launch()
        app.launchArguments.append("--uitesting-syncing")

        // Then
        let syncProgress = app.progressIndicators["syncProgress"]
        XCTAssertTrue(syncProgress.exists)

        let syncLabel = app.staticTexts["Syncing..."]
        XCTAssertTrue(syncLabel.exists)
    }
}
```

---

## Performance Considerations

### 1. Queue Size Limits

```swift
extension OfflineQueue {
    private let maxQueueSize = 100

    func enqueue(_ operation: PendingOperation) async throws {
        let currentCount = await pendingOperationsCount

        guard currentCount < maxQueueSize else {
            throw OfflineSyncError.queueFull
        }

        modelContext.insert(operation)
        try modelContext.save()
        await updatePendingCount()
    }
}
```

### 2. Batch Processing

```swift
extension SyncCoordinator {
    private func processOfflineQueueInBatches(batchSize: Int = 10) async throws {
        let operations = await offlineQueue.pendingOperations

        for batch in operations.chunked(into: batchSize) {
            try await withThrowingTaskGroup(of: Void.self) { group in
                for operation in batch {
                    group.addTask {
                        try await self.offlineQueue.processOperation(operation)
                    }
                }

                try await group.waitForAll()
            }
        }
    }
}

extension Array {
    func chunked(into size: Int) -> [[Element]] {
        stride(from: 0, to: count, by: size).map {
            Array(self[$0..<Swift.min($0 + size, count)])
        }
    }
}
```

### 3. Cache Expiration

```swift
extension SyncCoordinator {
    private let cacheExpirationSeconds: TimeInterval = 86400 // 24 hours

    private func clearExpiredCache() async throws {
        let cutoffDate = Date().addingTimeInterval(-cacheExpirationSeconds)

        let descriptor = FetchDescriptor<CachedTask>(
            predicate: #Predicate { $0.lastSyncedAt < cutoffDate }
        )

        let expiredTasks = try modelContext.fetch(descriptor)

        for task in expiredTasks {
            modelContext.delete(task)
        }

        try modelContext.save()
    }
}
```

### 4. Background Sync

```swift
// AppDelegate.swift
func application(
    _ application: UIApplication,
    didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?
) -> Bool {
    // Register background task
    BGTaskScheduler.shared.register(
        forTaskWithIdentifier: "com.gtsd.sync",
        using: nil
    ) { task in
        self.handleBackgroundSync(task: task as! BGAppRefreshTask)
    }

    return true
}

func handleBackgroundSync(task: BGAppRefreshTask) {
    let syncCoordinator = // Get from DI container

    task.expirationHandler = {
        task.setTaskCompleted(success: false)
    }

    Task {
        do {
            try await syncCoordinator.startSync()
            task.setTaskCompleted(success: true)
        } catch {
            task.setTaskCompleted(success: false)
        }

        // Schedule next background sync
        scheduleBackgroundSync()
    }
}

func scheduleBackgroundSync() {
    let request = BGAppRefreshTaskRequest(identifier: "com.gtsd.sync")
    request.earliestBeginDate = Date(timeIntervalSinceNow: 15 * 60) // 15 minutes

    try? BGTaskScheduler.shared.submit(request)
}
```

---

## Summary

### Key Components

1. **SwiftData Models**: Cache tasks, photos, pending operations
2. **OfflineQueue**: Manages pending sync operations with retry logic
3. **SyncCoordinator**: Orchestrates sync process and state management
4. **NetworkMonitor**: Tracks network connectivity
5. **ConflictResolver**: Handles data conflicts intelligently

### Sync Flow

```
User Action → Update Local Cache → Queue Operation → Network Check
                                                          │
                ┌─────────────────────────────────────────┼─────────────────────┐
                │                                         │                     │
           OFFLINE                                    ONLINE                SYNCING
                │                                         │                     │
        Show Pending                              Execute Immediately      Process Queue
        Indicator                                        │                     │
                │                                         │                     │
                └─────────────► Wait for Network ◄────────┴─────────────────────┘
                                         │
                                    Auto Sync
                                         │
                                    Update UI
```

### Success Criteria

- All read operations work offline using cached data
- Write operations queue successfully
- Sync happens automatically when online
- Conflicts resolve without data loss
- User sees clear sync status
- No blocking UI operations

### Next Steps

1. Implement Phase 1 (Foundation)
2. Test with airplane mode
3. Measure performance
4. Iterate based on feedback
5. Monitor sync success rate in production

---

## Appendix A: File Locations

```
GTSDApp/
├── Data/
│   ├── LocalStorage/
│   │   ├── SwiftDataModels/
│   │   │   ├── CachedTask.swift
│   │   │   ├── CachedPhoto.swift
│   │   │   ├── PendingOperation.swift
│   │   │   └── SyncMetadata.swift
│   │   ├── OfflineQueue.swift
│   │   └── SyncCoordinator.swift
│   └── Network/
│       └── NetworkMonitor.swift
├── Domain/
│   └── Services/
│       └── ConflictResolver.swift
└── Presentation/
    └── Common/
        └── Components/
            ├── OfflineBanner.swift
            ├── SyncProgressView.swift
            └── SyncErrorAlert.swift
```

## Appendix B: Configuration Constants

```swift
enum SyncConfiguration {
    static let maxQueueSize = 100
    static let maxRetries = 3
    static let cacheExpirationSeconds: TimeInterval = 86400 // 24 hours
    static let backgroundSyncInterval: TimeInterval = 900 // 15 minutes
    static let retryBaseDelay: TimeInterval = 2 // seconds
    static let batchSize = 10
}
```

---

**Document Version:** 1.0
**Status:** Ready for Implementation
**Estimated Effort:** 6 weeks
**Last Updated:** 2025-10-26
