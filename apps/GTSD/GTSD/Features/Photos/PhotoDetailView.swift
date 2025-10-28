//
//  PhotoDetailView.swift
//  GTSD
//
//  Created by Claude on 2025-10-27.
//

import SwiftUI

struct PhotoDetailView: View {
    let photo: Photo
    let allPhotos: [Photo]
    let onDelete: (Photo) -> Void

    @State private var currentPhoto: Photo
    @State private var scale: CGFloat = 1.0
    @State private var lastScale: CGFloat = 1.0
    @State private var offset: CGSize = .zero
    @State private var lastOffset: CGSize = .zero
    @Environment(\.dismiss) private var dismiss

    init(photo: Photo, allPhotos: [Photo], onDelete: @escaping (Photo) -> Void) {
        self.photo = photo
        self.allPhotos = allPhotos
        self.onDelete = onDelete
        self._currentPhoto = State(initialValue: photo)
    }

    var body: some View {
        NavigationStack {
            ZStack {
                Color.black
                    .ignoresSafeArea()

                TabView(selection: $currentPhoto) {
                    ForEach(allPhotos) { photo in
                        photoView(photo: photo)
                            .tag(photo)
                    }
                }
                .tabViewStyle(.page(indexDisplayMode: .always))
                .indexViewStyle(.page(backgroundDisplayMode: .always))
            }
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button(action: { dismiss() }) {
                        Image(systemName: "xmark")
                            .foregroundColor(.white)
                            .font(.system(size: IconSize.sm, weight: .semibold))
                    }
                }

                ToolbarItem(placement: .navigationBarTrailing) {
                    Button(action: {
                        onDelete(currentPhoto)
                    }) {
                        Image(systemName: "trash")
                            .foregroundColor(.white)
                            .font(.system(size: IconSize.sm))
                    }
                }
            }
            .toolbarBackground(.hidden, for: .navigationBar)
        }
    }

    private func photoView(photo: Photo) -> some View {
        GeometryReader { geometry in
            AsyncImage(url: URL(string: photo.url)) { phase in
                switch phase {
                case .empty:
                    ZStack {
                        Color.black
                        ProgressView()
                            .tint(.white)
                    }

                case .success(let image):
                    ZStack {
                        Color.black

                        image
                            .resizable()
                            .aspectRatio(contentMode: .fit)
                            .scaleEffect(scale)
                            .offset(offset)
                            .gesture(
                                MagnificationGesture()
                                    .onChanged { value in
                                        let delta = value / lastScale
                                        lastScale = value
                                        scale = min(max(scale * delta, 1.0), 5.0)
                                    }
                                    .onEnded { _ in
                                        lastScale = 1.0
                                        if scale < 1.0 {
                                            withAnimation(.springy) {
                                                scale = 1.0
                                            }
                                        }
                                    }
                            )
                            .gesture(
                                DragGesture()
                                    .onChanged { value in
                                        if scale > 1.0 {
                                            offset = CGSize(
                                                width: lastOffset.width + value.translation.width,
                                                height: lastOffset.height + value.translation.height
                                            )
                                        }
                                    }
                                    .onEnded { _ in
                                        lastOffset = offset
                                    }
                            )
                            .onTapGesture(count: 2) {
                                withAnimation(.springy) {
                                    if scale > 1.0 {
                                        scale = 1.0
                                        offset = .zero
                                        lastOffset = .zero
                                    } else {
                                        scale = 2.0
                                    }
                                }
                            }

                        // Photo info overlay
                        VStack {
                            Spacer()

                            if let caption = photo.caption {
                                Text(caption)
                                    .font(.bodyMedium)
                                    .foregroundColor(.white)
                                    .padding(Spacing.md)
                                    .background(
                                        Color.black.opacity(0.7)
                                            .cornerRadius(CornerRadius.md)
                                    )
                                    .padding(Spacing.md)
                            }

                            Text(photo.createdAt, style: .date)
                                .font(.labelSmall)
                                .foregroundColor(.white.opacity(0.8))
                                .padding(.bottom, Spacing.lg)
                        }
                    }

                case .failure:
                    ZStack {
                        Color.black
                        VStack(spacing: Spacing.md) {
                            Image(systemName: "exclamationmark.triangle")
                                .font(.system(size: IconSize.xl))
                                .foregroundColor(.errorColor)
                            Text("Failed to load photo")
                                .font(.bodyMedium)
                                .foregroundColor(.white)
                        }
                    }

                @unknown default:
                    Color.black
                }
            }
        }
        .onAppear {
            // Reset zoom when switching photos
            scale = 1.0
            offset = .zero
            lastOffset = .zero
        }
    }
}
