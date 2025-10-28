//
//  PhotoGalleryView.swift
//  GTSD
//
//  Created by Claude on 2025-10-27.
//

import SwiftUI

struct PhotoGalleryView: View {
    @StateObject private var viewModel: PhotoGalleryViewModel
    @State private var selectedPhoto: Photo?

    let taskId: String?

    init(taskId: String? = nil) {
        self.taskId = taskId
        self._viewModel = StateObject(wrappedValue: PhotoGalleryViewModel(taskId: taskId))
    }

    var body: some View {
        NavigationStack {
            Group {
                if viewModel.isLoading && viewModel.photos.isEmpty {
                    LoadingView(message: "Loading photos...")
                } else if let errorMessage = viewModel.errorMessage, viewModel.photos.isEmpty {
                    ErrorView(message: errorMessage) {
                        _Concurrency.Task { await viewModel.loadPhotos() }
                    }
                } else if viewModel.photos.isEmpty {
                    EmptyStateView(
                        icon: "photo.on.rectangle.angled",
                        title: "No Photos Yet",
                        message: "Upload photos to your tasks to see them here"
                    )
                } else {
                    photoGrid
                }
            }
            .navigationTitle(taskId != nil ? "Task Photos" : "All Photos")
            .navigationBarTitleDisplayMode(.large)
            .task {
                await viewModel.loadPhotos()
            }
            .refreshable {
                await viewModel.loadPhotos()
            }
            .alert("Delete Photo", isPresented: $viewModel.showingDeleteAlert) {
                Button("Cancel", role: .cancel) {
                    viewModel.cancelDelete()
                }
                Button("Delete", role: .destructive) {
                    _Concurrency.Task {
                        await viewModel.deletePhoto()
                    }
                }
            } message: {
                Text("Are you sure you want to delete this photo? This action cannot be undone.")
            }
            .sheet(item: $selectedPhoto) { photo in
                PhotoDetailView(
                    photo: photo,
                    allPhotos: viewModel.photos,
                    onDelete: { photo in
                        viewModel.confirmDelete(photo)
                        selectedPhoto = nil
                    }
                )
            }
        }
    }

    private var photoGrid: some View {
        ScrollView {
            LazyVGrid(
                columns: [
                    GridItem(.flexible(), spacing: Spacing.xs),
                    GridItem(.flexible(), spacing: Spacing.xs),
                    GridItem(.flexible(), spacing: Spacing.xs)
                ],
                spacing: Spacing.xs
            ) {
                ForEach(viewModel.photos) { photo in
                    PhotoGridItem(photo: photo)
                        .onTapGesture {
                            selectedPhoto = photo
                        }
                }
            }
            .padding(Spacing.xs)
        }
    }
}

// MARK: - Photo Grid Item

struct PhotoGridItem: View {
    let photo: Photo

    var body: some View {
        AsyncImage(url: URL(string: photo.thumbnailUrl ?? photo.url)) { phase in
            switch phase {
            case .empty:
                Rectangle()
                    .fill(Color.gray.opacity(0.2))
                    .overlay(ProgressView())
                    .aspectRatio(1, contentMode: .fill)

            case .success(let image):
                image
                    .resizable()
                    .aspectRatio(1, contentMode: .fill)
                    .clipped()

            case .failure:
                Rectangle()
                    .fill(Color.gray.opacity(0.2))
                    .overlay(
                        Image(systemName: "exclamationmark.triangle")
                            .foregroundColor(.errorColor)
                    )
                    .aspectRatio(1, contentMode: .fill)

            @unknown default:
                EmptyView()
            }
        }
        .cornerRadius(CornerRadius.xs)
    }
}

// MARK: - Preview

#Preview {
    PhotoGalleryView()
}
