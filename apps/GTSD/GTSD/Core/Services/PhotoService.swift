//
//  PhotoService.swift
//  GTSD
//
//  Created by Claude on 2025-10-26.
//

import Foundation
#if canImport(UIKit)
import UIKit
#endif
import Combine

/// Service for managing photos with encrypted cache support
@MainActor
final class PhotoService: ObservableObject, PhotoServiceProtocol {
    @Published private(set) var isLoading = false
    @Published var errorMessage: String?

    private let apiClient: any APIClientProtocol
    private let cache: BoundedCache<Photo>
    private let secureStorage: SecureStorage
    private let useEncryptedCache: Bool

    /// Maximum number of photos to keep in memory
    private static let maxCacheSize = 50

    /// Initialize photo service with dependencies
    init(
        apiClient: any APIClientProtocol,
        maxCacheSize: Int = PhotoService.maxCacheSize,
        secureStorage: SecureStorage = .shared,
        configuration: Configuration = .shared
    ) {
        self.apiClient = apiClient
        self.cache = BoundedCache<Photo>(maxSize: maxCacheSize)
        self.secureStorage = secureStorage
        self.useEncryptedCache = configuration.isEncryptedCacheEnabled

        // Load cached photos from secure storage
        if useEncryptedCache {
            loadCachedPhotos()
        }

        Logger.log("PhotoService initialized with encrypted cache: \(useEncryptedCache)", level: .info)
    }

    /// Published photos from cache
    var photos: [Photo] {
        cache.all
    }

    // MARK: - Cache Persistence

    /// Load cached photos from encrypted storage
    private func loadCachedPhotos() {
        do {
            if let cachedPhotos: [Photo] = try secureStorage.load(forKey: SecureStorage.CacheKey.photos) {
                cache.replaceAll(cachedPhotos)
                Logger.log("Loaded \(cachedPhotos.count) photos from encrypted cache", level: .debug)
            }
        } catch {
            Logger.error("Failed to load cached photos: \(error)")
        }
    }

    /// Save photos to encrypted storage
    private func saveCachedPhotos() {
        guard useEncryptedCache else { return }

        do {
            try secureStorage.save(cache.all, forKey: SecureStorage.CacheKey.photos)
            Logger.log("Saved \(cache.count) photos to encrypted cache", level: .debug)
        } catch {
            Logger.error("Failed to save cached photos: \(error)")
        }
    }

    /// Clear cached photos from encrypted storage
    private func clearCachedPhotos() {
        guard useEncryptedCache else { return }

        secureStorage.remove(forKey: SecureStorage.CacheKey.photos)
        Logger.log("Cleared cached photos", level: .debug)
    }

    // MARK: - Photo Operations

    /// Upload photo for task
    func uploadPhoto(
        taskId: String,
        image: UIImage,
        caption: String? = nil
    ) async throws -> Photo {
        isLoading = true
        errorMessage = nil

        defer { isLoading = false }

        Logger.info("Uploading photo for task: \(taskId)")

        // Convert image to JPEG data
        guard let imageData = image.jpegData(compressionQuality: 0.8) else {
            Logger.error("Failed to convert image to JPEG data")
            throw APIError.encodingError(NSError(domain: "PhotoService", code: -1, userInfo: [NSLocalizedDescriptionKey: "Failed to convert image"]))
        }

        do {
            let response: PhotoUploadResponse = try await apiClient.uploadMultipart(
                .uploadPhoto(taskId: taskId, imageData: imageData, caption: caption),
                imageData: imageData
            )

            let photo = response.photo

            // Add to cache
            cache.upsert(photo)

            // Save to encrypted storage
            saveCachedPhotos()

            Logger.info("Photo uploaded: \(photo.id)")
            return photo

        } catch let error as APIError {
            Logger.error("Failed to upload photo: \(error.localizedDescription)")
            errorMessage = error.localizedDescription
            throw error
        }
    }

    /// Upload photo with image data
    func uploadPhoto(
        taskId: String,
        imageData: Data,
        caption: String? = nil
    ) async throws -> Photo {
        isLoading = true
        errorMessage = nil

        defer { isLoading = false }

        Logger.info("Uploading photo for task: \(taskId)")

        do {
            let response: PhotoUploadResponse = try await apiClient.uploadMultipart(
                .uploadPhoto(taskId: taskId, imageData: imageData, caption: caption),
                imageData: imageData
            )

            let photo = response.photo

            // Add to cache
            cache.upsert(photo)

            // Save to encrypted storage
            saveCachedPhotos()

            Logger.info("Photo uploaded: \(photo.id)")
            return photo

        } catch let error as APIError {
            Logger.error("Failed to upload photo: \(error.localizedDescription)")
            errorMessage = error.localizedDescription
            throw error
        }
    }

    /// Fetch photos with optional filters
    func fetchPhotos(
        taskId: String? = nil,
        page: Int? = nil,
        limit: Int? = nil
    ) async throws {
        isLoading = true
        errorMessage = nil

        defer { isLoading = false }

        Logger.info("Fetching photos")

        do {
            let response: PaginatedResponse<Photo> = try await apiClient.request(
                .getPhotos(taskId: taskId, page: page, limit: limit)
            )

            // Replace cache with new items (bounded to max size)
            cache.replaceAll(response.items)
            Logger.info("Fetched \(photos.count) photos")

            // Save to encrypted storage
            saveCachedPhotos()

        } catch let error as APIError {
            Logger.error("Failed to fetch photos: \(error.localizedDescription)")
            errorMessage = error.localizedDescription
            throw error
        }
    }

    /// Get single photo by ID
    func getPhoto(id: String) async throws -> Photo {
        Logger.info("Fetching photo: \(id)")

        do {
            let photo: Photo = try await apiClient.request(.getPhoto(id: id))

            // Update cache
            cache.upsert(photo)

            return photo

        } catch let error as APIError {
            Logger.error("Failed to fetch photo: \(error.localizedDescription)")
            throw error
        }
    }

    /// Delete photo
    func deletePhoto(id: String) async throws {
        isLoading = true
        errorMessage = nil

        defer { isLoading = false }

        Logger.info("Deleting photo: \(id)")

        do {
            try await apiClient.requestVoid(.deletePhoto(id: id))

            // Remove from cache
            cache.remove(id: id)

            // Save to encrypted storage
            saveCachedPhotos()

            Logger.info("Photo deleted: \(id)")

        } catch let error as APIError {
            Logger.error("Failed to delete photo: \(error.localizedDescription)")
            errorMessage = error.localizedDescription
            throw error
        }
    }

    /// Get photos for specific task
    func photosForTask(taskId: String) -> [Photo] {
        cache.filter { $0.taskId == taskId }
    }

    /// Fetch photos for a specific task
    func fetchPhotosForTask(taskId: String) async throws -> [Photo] {
        Logger.info("Fetching photos for task: \(taskId)")

        do {
            let response: PaginatedResponse<Photo> = try await apiClient.request(
                .getPhotos(taskId: taskId, page: nil, limit: nil)
            )

            return response.items

        } catch let error as APIError {
            Logger.error("Failed to fetch photos for task: \(error.localizedDescription)")
            throw error
        }
    }
}
