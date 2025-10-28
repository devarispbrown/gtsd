//
//  TaskDetailView.swift
//  GTSD
//
//  Created by Claude on 2025-10-26.
//

import SwiftUI
import PhotosUI

struct TaskDetailView: View {
    let task: Task
    @StateObject private var viewModel: TaskDetailViewModel
    @Environment(\.dismiss) private var dismiss

    init(task: Task) {
        self.task = task
        self._viewModel = StateObject(wrappedValue: TaskDetailViewModel(task: task))
    }

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: Spacing.lg) {
                // Task Header
                VStack(alignment: .leading, spacing: Spacing.md) {
                    HStack {
                        Image(systemName: task.taskCategory.icon)
                            .font(.system(size: IconSize.lg))
                            .foregroundColor(.primaryColor)

                        Text(task.title)
                            .font(.headlineMedium)
                            .foregroundColor(.textPrimary)
                    }

                    if let description = task.description {
                        Text(description)
                            .font(.bodyMedium)
                            .foregroundColor(.textSecondary)
                    }

                    HStack {
                        StatusBadge(status: task.taskStatus)

                        if let priority = task.taskPriority {
                            PriorityBadge(priority: priority)
                        }

                        Spacer()

                        if let dueDate = task.dueDate {
                            HStack(spacing: Spacing.xs) {
                                Image(systemName: "calendar")
                                    .font(.system(size: IconSize.xs))
                                Text(dueDate, style: .date)
                                    .font(.bodySmall)
                            }
                            .foregroundColor(task.isOverdue ? .errorColor : .textSecondary)
                        }
                    }
                }
                .card()

                // Status Actions
                if !task.isCompleted {
                    VStack(spacing: Spacing.md) {
                        Text("Update Status")
                            .font(.titleMedium)
                            .foregroundColor(.textPrimary)
                            .frame(maxWidth: .infinity, alignment: .leading)

                        HStack(spacing: Spacing.sm) {
                            ForEach([TaskStatus.inProgress, TaskStatus.completed], id: \.self) { status in
                                Button(action: {
                                    _Concurrency.Task {
                                        await viewModel.updateStatus(status)
                                    }
                                }) {
                                    VStack(spacing: Spacing.xs) {
                                        Image(systemName: statusIcon(status))
                                            .font(.system(size: IconSize.md))
                                        Text(status.displayName)
                                            .font(.labelMedium)
                                    }
                                    .foregroundColor(.primaryColor)
                                    .frame(maxWidth: .infinity)
                                    .padding(.vertical, Spacing.md)
                                    .background(Color.primaryColor.opacity(0.1))
                                    .cornerRadius(CornerRadius.md)
                                }
                            }
                        }
                    }
                    .card()
                }

                // Evidence Section
                VStack(alignment: .leading, spacing: Spacing.md) {
                    Text("Add Evidence")
                        .font(.titleMedium)
                        .foregroundColor(.textPrimary)

                    // Text Evidence
                    VStack(alignment: .leading, spacing: Spacing.xs) {
                        Text("Notes")
                            .font(.labelMedium)
                            .foregroundColor(.textSecondary)

                        TextEditor(text: $viewModel.evidenceText)
                            .frame(height: 100)
                            .padding(Spacing.sm)
                            .background(Color.backgroundSecondary)
                            .cornerRadius(CornerRadius.md)
                    }

                    // Metrics
                    VStack(alignment: .leading, spacing: Spacing.xs) {
                        Text("Metrics (Optional)")
                            .font(.labelMedium)
                            .foregroundColor(.textSecondary)

                        HStack(spacing: Spacing.sm) {
                            Image(systemName: "number")
                                .font(.system(size: IconSize.sm))
                                .foregroundColor(.textSecondary)

                            TextField("e.g., weight, reps, time", text: $viewModel.metrics)
                        }
                        .padding(Spacing.md)
                        .background(Color.backgroundSecondary)
                        .cornerRadius(CornerRadius.md)
                    }

                    // Photo Picker
                    PhotosPicker(
                        selection: $viewModel.selectedPhotos,
                        maxSelectionCount: 5,
                        matching: .images
                    ) {
                        HStack {
                            Image(systemName: "photo.badge.plus")
                                .font(.system(size: IconSize.sm))
                            Text(viewModel.selectedImages.isEmpty ? "Add Photo Evidence" : "Add More Photos (\(viewModel.selectedImages.count)/5)")
                                .font(.titleMedium)
                        }
                        .foregroundColor(.primaryColor)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, Spacing.md)
                        .background(Color.primaryColor.opacity(0.1))
                        .cornerRadius(CornerRadius.md)
                    }

                    // Selected Photos Preview
                    if !viewModel.selectedImages.isEmpty {
                        VStack(alignment: .leading, spacing: Spacing.sm) {
                            Text("Selected Photos (\(viewModel.selectedImages.count))")
                                .font(.labelMedium)
                                .foregroundColor(.textSecondary)

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
                                                    .frame(width: 100, height: 100)
                                                    .clipped()
                                                    .cornerRadius(CornerRadius.sm)

                                                Button(action: {
                                                    viewModel.removeSelectedImage(at: index)
                                                }) {
                                                    Image(systemName: "xmark.circle.fill")
                                                        .font(.system(size: IconSize.sm))
                                                        .foregroundColor(.white)
                                                        .background(
                                                            Circle()
                                                                .fill(Color.black.opacity(0.5))
                                                                .frame(width: 24, height: 24)
                                                        )
                                                }
                                                .padding(4)
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }

                    // Submit Button
                    GTSDButton(
                        "Submit Evidence",
                        style: .primary,
                        isLoading: viewModel.isSubmitting,
                        isDisabled: !viewModel.canSubmit
                    ) {
                        _Concurrency.Task {
                            await viewModel.submitEvidence()
                            if viewModel.errorMessage == nil {
                                dismiss()
                            }
                        }
                    }
                }
                .card()

                // Existing Photos
                if !viewModel.photos.isEmpty {
                    VStack(alignment: .leading, spacing: Spacing.md) {
                        Text("Evidence Photos")
                            .font(.titleMedium)
                            .foregroundColor(.textPrimary)

                        LazyVGrid(columns: [
                            GridItem(.flexible()),
                            GridItem(.flexible()),
                            GridItem(.flexible())
                        ], spacing: Spacing.sm) {
                            ForEach(viewModel.photos) { photo in
                                AsyncImage(url: URL(string: photo.url)) { image in
                                    image
                                        .resizable()
                                        .aspectRatio(contentMode: .fill)
                                } placeholder: {
                                    Rectangle()
                                        .fill(Color.gray.opacity(0.2))
                                        .overlay(ProgressView())
                                }
                                .frame(height: 100)
                                .clipped()
                                .cornerRadius(CornerRadius.sm)
                            }
                        }
                    }
                    .card()
                }
            }
            .padding(Spacing.md)
        }
        .navigationTitle("Task Details")
        .navigationBarTitleDisplayMode(.inline)
        .task {
            await viewModel.loadPhotos()
        }
        .alert("Error", isPresented: .constant(viewModel.errorMessage != nil)) {
            Button("OK") {
                viewModel.errorMessage = nil
            }
        } message: {
            Text(viewModel.errorMessage ?? "")
        }
    }

    private func statusIcon(_ status: TaskStatus) -> String {
        switch status {
        case .inProgress:
            return "clock.fill"
        case .completed:
            return "checkmark.circle.fill"
        default:
            return "circle"
        }
    }
}

// MARK: - Priority Badge

struct PriorityBadge: View {
    let priority: TaskPriority

    var body: some View {
        Text(priority.displayName)
            .font(.labelSmall)
            .foregroundColor(.white)
            .padding(.horizontal, Spacing.sm)
            .padding(.vertical, Spacing.xs)
            .background(backgroundColor)
            .cornerRadius(CornerRadius.xs)
    }

    private var backgroundColor: Color {
        switch priority {
        case .low:
            return Color.gray
        case .medium:
            return Color.infoColor
        case .high:
            return Color.warningColor
        case .urgent:
            return Color.errorColor
        }
    }
}
