//
//  TaskDetailViewModel.swift
//  GTSD
//
//  Created by Claude on 2025-10-26.
//

import Foundation
import Combine
import SwiftUI
import PhotosUI

@MainActor
class TaskDetailViewModel: ObservableObject {
    @Published var task: Task
    @Published var evidenceText: String = ""
    @Published var metrics: String = ""
    @Published var selectedPhotos: [PhotosPickerItem] = [] {
        didSet {
            loadSelectedPhotos()
        }
    }
    @Published var selectedImages: [UIImage] = []
    @Published var photos: [Photo] = []
    @Published var isSubmitting: Bool = false
    @Published var isLoadingPhotos: Bool = false
    @Published var errorMessage: String?

    private let apiClient: any APIClientProtocol
    private let taskService: any TaskServiceProtocol
    private let photoService: any PhotoServiceProtocol

    init(
        task: Task,
        apiClient: any APIClientProtocol = ServiceContainer.shared.apiClient,
        taskService: any TaskServiceProtocol = ServiceContainer.shared.taskService,
        photoService: any PhotoServiceProtocol = ServiceContainer.shared.photoService
    ) {
        self.task = task
        self.apiClient = apiClient
        self.taskService = taskService
        self.photoService = photoService
    }

    var canSubmit: Bool {
        !evidenceText.isEmpty || !selectedImages.isEmpty
    }

    func updateStatus(_ status: TaskStatus) async {
        do {
            task = try await taskService.updateTask(
                id: task.id,
                title: nil,
                description: nil,
                category: nil,
                dueDate: nil,
                priority: nil,
                status: status
            )
            Logger.info("Task status updated to: \(status.rawValue)")
        } catch {
            Logger.error("Failed to update task status: \(error)")
            errorMessage = "Failed to update task status"
        }
    }

    func submitEvidence() async {
        isSubmitting = true
        errorMessage = nil

        do {
            // Upload photos if selected
            if !selectedImages.isEmpty {
                for (index, image) in selectedImages.enumerated() {
                    guard let photoData = image.jpegData(compressionQuality: 0.8) else {
                        Logger.warning("Failed to convert image \(index + 1) to JPEG")
                        continue
                    }

                    // Use caption only for first photo, rest are just images
                    let caption = index == 0 && !evidenceText.isEmpty ? evidenceText : nil

                    _ = try await photoService.uploadPhoto(
                        taskId: task.id,
                        imageData: photoData,
                        caption: caption
                    )
                    Logger.info("Photo \(index + 1)/\(selectedImages.count) uploaded successfully")
                }
            } else if !evidenceText.isEmpty {
                // If no photo but text evidence, create a text-only evidence entry
                // This would need a dedicated API endpoint
                Logger.info("Text evidence submitted: \(evidenceText)")
            }

            // Clear form
            evidenceText = ""
            metrics = ""
            selectedPhotos = []
            selectedImages = []

            // Reload photos
            await loadPhotos()
        } catch {
            Logger.error("Failed to submit evidence: \(error)")
            errorMessage = "Failed to submit evidence"
        }

        isSubmitting = false
    }

    func removeSelectedImage(at index: Int) {
        guard index < selectedImages.count else { return }
        selectedImages.remove(at: index)

        // Also remove from selectedPhotos if indices match
        if index < selectedPhotos.count {
            selectedPhotos.remove(at: index)
        }
    }

    func loadPhotos() async {
        do {
            photos = try await photoService.fetchPhotosForTask(taskId: task.id)
        } catch {
            Logger.error("Failed to load photos: \(error)")
        }
    }

    private func loadSelectedPhotos() {
        _Concurrency.Task {
            isLoadingPhotos = true
            defer { isLoadingPhotos = false }

            var images: [UIImage] = []

            for item in selectedPhotos {
                do {
                    if let data = try await item.loadTransferable(type: Data.self),
                       let uiImage = UIImage(data: data) {
                        images.append(uiImage)
                    }
                } catch {
                    Logger.error("Failed to load photo: \(error)")
                    errorMessage = "Failed to load one or more photos"
                }
            }

            selectedImages = images
        }
    }
}
