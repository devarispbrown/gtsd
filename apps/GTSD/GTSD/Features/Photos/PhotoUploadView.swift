//
//  PhotoUploadView.swift
//  GTSD
//
//  Created by Claude on 2025-10-30.
//

import SwiftUI
import PhotosUI
import Photos
import Combine

struct PhotoUploadView: View {
    let taskId: String
    @StateObject private var viewModel: PhotoUploadViewModel
    @Environment(\.dismiss) private var dismiss

    init(taskId: String) {
        self.taskId = taskId
        self._viewModel = StateObject(wrappedValue: PhotoUploadViewModel(taskId: taskId))
    }

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: Spacing.lg) {
                    // Header
                    VStack(spacing: Spacing.md) {
                        Image(systemName: "photo.badge.plus")
                            .font(.system(size: IconSize.xxl))
                            .foregroundColor(.primaryColor)

                        Text("Upload Photos")
                            .font(.headlineMedium)
                            .foregroundColor(.textPrimary)

                        Text("Add photo evidence for your task")
                            .font(.bodyMedium)
                            .foregroundColor(.textSecondary)
                            .multilineTextAlignment(.center)
                    }
                    .padding(.top, Spacing.xl)

                    // Photo Picker Button
                    VStack(spacing: Spacing.md) {
                        PhotosPicker(
                            selection: $viewModel.selectedPhotos,
                            maxSelectionCount: 5,
                            matching: .images
                        ) {
                            HStack {
                                Image(systemName: "photo.on.rectangle.angled")
                                    .font(.system(size: IconSize.sm))
                                Text(viewModel.selectedImages.isEmpty
                                    ? "Select Photos"
                                    : "Selected: \(viewModel.selectedImages.count)/5")
                                    .font(.titleMedium)
                            }
                            .foregroundColor(.white)
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, Spacing.md)
                            .background(Color.primaryColor)
                            .cornerRadius(CornerRadius.md)
                        }
                        .accessibilityLabel("Select photos from library")
                        .accessibilityHint("Choose up to 5 photos to upload")

                        Text("You can select up to 5 photos at a time")
                            .font(.labelMedium)
                            .foregroundColor(.textSecondary)
                    }

                    // Permission Status
                    if viewModel.showPermissionDenied {
                        VStack(spacing: Spacing.md) {
                            HStack(spacing: Spacing.sm) {
                                Image(systemName: "exclamationmark.triangle.fill")
                                    .foregroundColor(.warningColor)
                                Text("Photo Library Access Required")
                                    .font(.titleMedium)
                                    .foregroundColor(.textPrimary)
                            }

                            Text("GTSD needs permission to access your photo library to upload photos. Please enable access in Settings.")
                                .font(.bodySmall)
                                .foregroundColor(.textSecondary)
                                .multilineTextAlignment(.center)

                            Button(action: {
                                if let url = URL(string: UIApplication.openSettingsURLString) {
                                    UIApplication.shared.open(url)
                                }
                            }) {
                                HStack {
                                    Image(systemName: "gear")
                                    Text("Open Settings")
                                }
                                .font(.titleMedium)
                                .foregroundColor(.primaryColor)
                                .frame(maxWidth: .infinity)
                                .padding(.vertical, Spacing.md)
                                .background(Color.primaryColor.opacity(0.1))
                                .cornerRadius(CornerRadius.md)
                            }
                        }
                        .padding()
                        .background(Color.warningColor.opacity(0.1))
                        .cornerRadius(CornerRadius.md)
                    }

                    // Selected Photos Preview
                    if !viewModel.selectedImages.isEmpty {
                        VStack(alignment: .leading, spacing: Spacing.md) {
                            Text("Selected Photos (\(viewModel.selectedImages.count))")
                                .font(.titleMedium)
                                .foregroundColor(.textPrimary)

                            if viewModel.isLoadingPhotos {
                                HStack {
                                    ProgressView()
                                    Text("Loading photos...")
                                        .font(.bodySmall)
                                        .foregroundColor(.textSecondary)
                                }
                                .frame(maxWidth: .infinity)
                                .padding(Spacing.md)
                            } else {
                                ScrollView(.horizontal, showsIndicators: false) {
                                    HStack(spacing: Spacing.sm) {
                                        ForEach(Array(viewModel.selectedImages.enumerated()), id: \.offset) { index, image in
                                            ZStack(alignment: .topTrailing) {
                                                Image(uiImage: image)
                                                    .resizable()
                                                    .aspectRatio(contentMode: .fill)
                                                    .frame(width: 120, height: 120)
                                                    .clipped()
                                                    .cornerRadius(CornerRadius.md)

                                                Button(action: {
                                                    viewModel.removeSelectedImage(at: index)
                                                }) {
                                                    Image(systemName: "xmark.circle.fill")
                                                        .font(.system(size: IconSize.md))
                                                        .foregroundColor(.white)
                                                        .background(
                                                            Circle()
                                                                .fill(Color.black.opacity(0.6))
                                                                .frame(width: 28, height: 28)
                                                        )
                                                }
                                                .padding(Spacing.xs)
                                                .accessibilityLabel("Remove photo \(index + 1)")
                                            }
                                        }
                                    }
                                }
                            }
                        }
                        .card()
                    }

                    // Caption Field
                    if !viewModel.selectedImages.isEmpty {
                        VStack(alignment: .leading, spacing: Spacing.sm) {
                            Text("Caption (Optional)")
                                .font(.titleMedium)
                                .foregroundColor(.textPrimary)

                            TextEditor(text: $viewModel.caption)
                                .frame(height: 100)
                                .padding(Spacing.sm)
                                .background(Color.backgroundSecondary)
                                .cornerRadius(CornerRadius.md)
                                .overlay(
                                    RoundedRectangle(cornerRadius: CornerRadius.md)
                                        .stroke(Color.gray.opacity(0.3), lineWidth: 1)
                                )
                                .accessibilityLabel("Photo caption")
                                .accessibilityHint("Add an optional description for your photos")
                        }
                        .card()
                    }

                    // Upload Button
                    if !viewModel.selectedImages.isEmpty {
                        GTSDButton(
                            "Upload Photos",
                            style: .primary,
                            isLoading: viewModel.isUploading,
                            isDisabled: viewModel.selectedImages.isEmpty
                        ) {
                            _Concurrency.Task {
                                await viewModel.uploadPhotos()
                            }
                        }
                        .padding(.horizontal, Spacing.md)
                    }

                    Spacer(minLength: Spacing.xl)
                }
                .padding(Spacing.md)
            }
            .navigationTitle("Upload Photos")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button("Cancel") {
                        dismiss()
                    }
                }
            }
            .alert("Success", isPresented: $viewModel.showSuccess) {
                Button("Done") {
                    dismiss()
                }
            } message: {
                Text("Photos uploaded successfully!")
            }
            .alert("Error", isPresented: .constant(viewModel.errorMessage != nil)) {
                Button("OK") {
                    viewModel.errorMessage = nil
                }
            } message: {
                Text(viewModel.errorMessage ?? "")
            }
        }
    }
}

// MARK: - ViewModel

@MainActor
final class PhotoUploadViewModel: ObservableObject {
    @Published var selectedPhotos: [PhotosPickerItem] = [] {
        didSet {
            // When user selects photos, recheck permissions and load them
            _Concurrency.Task {
                await checkAndRequestPhotoLibraryPermission()
                await loadSelectedPhotos()
            }
        }
    }
    @Published var selectedImages: [UIImage] = []
    @Published var caption: String = ""
    @Published var isLoadingPhotos = false
    @Published var isUploading = false
    @Published var errorMessage: String?
    @Published var showSuccess = false
    @Published var showPermissionDenied = false

    private let taskId: String
    private let photoService: any PhotoServiceProtocol

    init(
        taskId: String,
        photoService: (any PhotoServiceProtocol)? = nil
    ) {
        self.taskId = taskId
        self.photoService = photoService ?? ServiceContainer.shared.photoService
        // Initial permission check
        _Concurrency.Task {
            await checkAndRequestPhotoLibraryPermission()
        }
    }

    /// Checks current photo library permission status and requests if needed
    /// This method ensures users can access their photo library for profile photos
    private func checkAndRequestPhotoLibraryPermission() async {
        let status = PHPhotoLibrary.authorizationStatus(for: .readWrite)

        Logger.info("Photo library permission status: \(status.rawValue)")

        switch status {
        case .notDetermined:
            // First time - request permission
            Logger.info("Requesting photo library permission...")
            let newStatus = await PHPhotoLibrary.requestAuthorization(for: .readWrite)
            Logger.info("Photo library permission granted: \(newStatus.rawValue)")
            showPermissionDenied = (newStatus == .denied || newStatus == .restricted)

        case .denied, .restricted:
            // Permission denied or restricted
            Logger.warning("Photo library access denied or restricted")
            showPermissionDenied = true

        case .authorized, .limited:
            // Permission granted (full or limited)
            Logger.info("Photo library access authorized")
            showPermissionDenied = false

        @unknown default:
            Logger.warning("Unknown photo library permission status")
            showPermissionDenied = true
        }
    }

    func removeSelectedImage(at index: Int) {
        guard index < selectedImages.count else { return }
        selectedImages.remove(at: index)

        if index < selectedPhotos.count {
            selectedPhotos.remove(at: index)
        }
    }

    /// Loads selected photos from PhotosPicker into UIImage array
    /// This handles the conversion from PhotosPickerItem to actual image data
    private func loadSelectedPhotos() async {
        isLoadingPhotos = true
        defer { isLoadingPhotos = false }

        Logger.info("Loading \(selectedPhotos.count) selected photos...")

        var images: [UIImage] = []

        for (index, item) in selectedPhotos.enumerated() {
            do {
                Logger.info("Loading photo \(index + 1)/\(selectedPhotos.count)...")

                // Load the transferable data from the photo picker item
                guard let data = try await item.loadTransferable(type: Data.self) else {
                    Logger.error("Photo \(index + 1): No data returned from PhotosPickerItem")
                    errorMessage = "Failed to load photo \(index + 1). Please try again."
                    continue
                }

                Logger.info("Photo \(index + 1): Loaded \(data.count) bytes")

                // Convert data to UIImage
                guard let uiImage = UIImage(data: data) else {
                    Logger.error("Photo \(index + 1): Failed to create UIImage from data")
                    errorMessage = "Failed to process photo \(index + 1). Invalid image format."
                    continue
                }

                // Verify image has valid dimensions
                guard uiImage.size.width > 0 && uiImage.size.height > 0 else {
                    Logger.error("Photo \(index + 1): Invalid dimensions \(uiImage.size)")
                    errorMessage = "Photo \(index + 1) has invalid dimensions."
                    continue
                }

                Logger.info("Photo \(index + 1): Successfully loaded \(Int(uiImage.size.width))x\(Int(uiImage.size.height))")
                images.append(uiImage)

            } catch let error as NSError {
                Logger.error("Photo \(index + 1): Failed to load - \(error.localizedDescription) (domain: \(error.domain), code: \(error.code))")

                // Provide specific error messages based on error type
                if error.domain == "NSCocoaErrorDomain" && (error.code == 257 || error.code == 260) {
                    errorMessage = "Unable to access photo \(index + 1). Please check photo library permissions in Settings."
                } else {
                    errorMessage = "Failed to load photo \(index + 1): \(error.localizedDescription)"
                }
            }
        }

        selectedImages = images
        Logger.info("Successfully loaded \(images.count)/\(selectedPhotos.count) photos")
    }

    func uploadPhotos() async {
        guard !selectedImages.isEmpty else {
            errorMessage = "Please select at least one photo"
            return
        }

        isUploading = true
        errorMessage = nil

        do {
            for (index, image) in selectedImages.enumerated() {
                guard let photoData = image.jpegData(compressionQuality: 0.8) else {
                    Logger.warning("Failed to convert image \(index + 1) to JPEG")
                    continue
                }

                // Use caption only for first photo
                let photoCaption = index == 0 && !caption.isEmpty ? caption : nil

                _ = try await photoService.uploadPhoto(
                    taskId: taskId,
                    imageData: photoData,
                    caption: photoCaption
                )
                Logger.info("Photo \(index + 1)/\(selectedImages.count) uploaded successfully")
            }

            // Success!
            showSuccess = true

            // Clear form
            caption = ""
            selectedPhotos = []
            selectedImages = []

        } catch let error as APIError {
            Logger.error("Failed to upload photos: \(error.localizedDescription)")
            errorMessage = error.localizedDescription
        } catch {
            Logger.error("Failed to upload photos: \(error.localizedDescription)")
            errorMessage = "Failed to upload photos. Please try again."
        }

        isUploading = false
    }
}

// MARK: - Preview

#Preview {
    PhotoUploadView(taskId: "task-123")
}
