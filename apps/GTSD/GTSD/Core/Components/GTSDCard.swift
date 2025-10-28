//
//  GTSDCard.swift
//  GTSD
//
//  Created by Claude on 2025-10-26.
//

import SwiftUI

struct GTSDCard<Content: View>: View {
    let content: Content
    var padding: CGFloat = Spacing.md
    var cornerRadius: CGFloat = CornerRadius.md

    init(
        padding: CGFloat = Spacing.md,
        cornerRadius: CGFloat = CornerRadius.md,
        @ViewBuilder content: () -> Content
    ) {
        self.padding = padding
        self.cornerRadius = cornerRadius
        self.content = content()
    }

    var body: some View {
        content
            .padding(padding)
            .background(Color.backgroundPrimary)
            .cornerRadius(cornerRadius)
            .cardShadow()
    }
}

// MARK: - Task Card Component

struct TaskCard: View {
    let task: Task
    var onTap: (() -> Void)?

    var body: some View {
        Button(action: { onTap?() }) {
            VStack(alignment: .leading, spacing: Spacing.sm) {
                HStack {
                    Image(systemName: task.taskCategory.icon)
                        .font(.system(size: IconSize.sm))
                        .foregroundColor(.primaryColor)

                    Text(task.title)
                        .font(.titleMedium)
                        .foregroundColor(.textPrimary)
                        .lineLimit(1)

                    Spacer()

                    StatusBadge(status: task.taskStatus)
                }

                if let description = task.description {
                    Text(description)
                        .font(.bodyMedium)
                        .foregroundColor(.textSecondary)
                        .lineLimit(2)
                }

                HStack {
                    if let dueDate = task.dueDate {
                        HStack(spacing: Spacing.xs) {
                            Image(systemName: "calendar")
                                .font(.system(size: IconSize.xs))
                            Text(dueDate, style: .date)
                                .font(.bodySmall)
                        }
                        .foregroundColor(task.isOverdue ? .errorColor : .textSecondary)
                    }

                    Spacer()

                    if let photoCount = task.photoCount, photoCount > 0 {
                        HStack(spacing: Spacing.xs) {
                            Image(systemName: "photo")
                                .font(.system(size: IconSize.xs))
                            Text("\(photoCount)")
                                .font(.bodySmall)
                        }
                        .foregroundColor(.textSecondary)
                    }
                }
            }
        }
        .buttonStyle(PlainButtonStyle())
        .card()
    }
}

// MARK: - Status Badge

struct StatusBadge: View {
    let status: TaskStatus

    var body: some View {
        Text(status.displayName)
            .font(.labelSmall)
            .foregroundColor(textColor)
            .padding(.horizontal, Spacing.sm)
            .padding(.vertical, Spacing.xs)
            .background(backgroundColor)
            .cornerRadius(CornerRadius.xs)
    }

    private var backgroundColor: Color {
        switch status {
        case .pending:
            return Color.warningColor.opacity(0.2)
        case .inProgress:
            return Color.infoColor.opacity(0.2)
        case .completed:
            return Color.successColor.opacity(0.2)
        case .archived:
            return Color.gray.opacity(0.2)
        }
    }

    private var textColor: Color {
        switch status {
        case .pending:
            return Color.warningColor
        case .inProgress:
            return Color.infoColor
        case .completed:
            return Color.successColor
        case .archived:
            return Color.gray
        }
    }
}

// MARK: - Preview

#Preview {
    VStack(spacing: Spacing.md) {
        GTSDCard {
            VStack(alignment: .leading, spacing: Spacing.sm) {
                Text("Card Title")
                    .font(.titleMedium)
                Text("This is a card with custom content")
                    .font(.bodyMedium)
                    .foregroundColor(.textSecondary)
            }
        }

        let sampleTask = Task(
            id: "1",
            userId: "1",
            title: "Complete workout",
            description: "30 minutes cardio session",
            category: "health",
            status: "in-progress",
            priority: "high",
            dueDate: Date(),
            completedAt: nil,
            createdAt: Date(),
            updatedAt: Date(),
            photoCount: 2
        )

        TaskCard(task: sampleTask)
    }
    .padding()
    .background(Color.backgroundSecondary)
}
