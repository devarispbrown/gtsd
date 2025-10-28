//
//  PhotoGalleryViewModel.swift
//  GTSD
//
//  Created by Claude on 2025-10-27.
//

import Foundation
import SwiftUI
import Combine

/// ViewModel for photo gallery
@MainActor
final class PhotoGalleryViewModel: ObservableObject {
    @Published private(set) var photos: [Photo] = []
    @Published private(set) var isLoading = false
    @Published var errorMessage: String?
    @Published var selectedPhoto: Photo?
    @Published var showingDeleteAlert = false

    private let photoService: any PhotoServiceProtocol
    private let taskId: String?

    init(
        taskId: String? = nil,
        photoService: (any PhotoServiceProtocol)? = nil
    ) {
        self.taskId = taskId
        self.photoService = photoService ?? ServiceContainer.shared.photoService
    }

    // MARK: - Data Loading

    func loadPhotos() async {
        isLoading = true
        errorMessage = nil

        defer { isLoading = false }

        do {
            if let taskId = taskId {
                // Load photos for specific task
                photos = try await photoService.fetchPhotosForTask(taskId: taskId)
            } else {
                // Load all photos
                try await photoService.fetchPhotos(taskId: nil, page: 1, limit: 50)
                photos = photoService.photos
            }

            Logger.info("Loaded \(photos.count) photos")

        } catch let error as APIError {
            Logger.error("Failed to load photos: \(error.localizedDescription)")
            errorMessage = error.localizedDescription
        } catch {
            Logger.error("Failed to load photos: \(error.localizedDescription)")
            errorMessage = "Failed to load photos"
        }
    }

    // MARK: - Photo Actions

    func selectPhoto(_ photo: Photo) {
        selectedPhoto = photo
    }

    func confirmDelete(_ photo: Photo) {
        selectedPhoto = photo
        showingDeleteAlert = true
    }

    func deletePhoto() async {
        guard let photo = selectedPhoto else { return }

        isLoading = true
        errorMessage = nil

        defer { isLoading = false }

        do {
            try await photoService.deletePhoto(id: photo.id)

            // Remove from local array
            photos.removeAll { $0.id == photo.id }

            // Clear selection
            selectedPhoto = nil
            showingDeleteAlert = false

            Logger.info("Photo deleted: \(photo.id)")

        } catch let error as APIError {
            Logger.error("Failed to delete photo: \(error.localizedDescription)")
            errorMessage = error.localizedDescription
        } catch {
            Logger.error("Failed to delete photo: \(error.localizedDescription)")
            errorMessage = "Failed to delete photo"
        }
    }

    func cancelDelete() {
        selectedPhoto = nil
        showingDeleteAlert = false
    }
}
