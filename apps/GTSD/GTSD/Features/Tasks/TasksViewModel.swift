//
//  TasksViewModel.swift
//  GTSD
//
//  Created by Claude on 2025-10-26.
//

import Foundation
import Combine
import SwiftUI

/// View model for tasks screen
@MainActor
final class TasksViewModel: ObservableObject {
    @Published var tasks: [Task] = []
    @Published var isLoading = false
    @Published var errorMessage: String?
    @Published var selectedFilter: TaskFilter = .all
    @Published var selectedCategory: TaskCategory?

    private let taskService: any TaskServiceProtocol

    /// Initialize with dependencies
    init(taskService: any TaskServiceProtocol) {
        self.taskService = taskService
    }

    /// Convenience initializer using shared container
    convenience init() {
        self.init(taskService: ServiceContainer.shared.taskService)
    }

    enum TaskFilter: String, CaseIterable {
        case all = "All"
        case pending = "Pending"
        case inProgress = "In Progress"
        case completed = "Completed"

        var taskStatus: TaskStatus? {
            switch self {
            case .all: return nil
            case .pending: return .pending
            case .inProgress: return .inProgress
            case .completed: return .completed
            }
        }
    }

    var filteredTasks: [Task] {
        var filtered = tasks

        // Filter by status
        if let status = selectedFilter.taskStatus {
            filtered = filtered.filter { $0.taskStatus == status }
        }

        // Filter by category
        if let category = selectedCategory {
            filtered = filtered.filter { $0.taskCategory == category }
        }

        return filtered
    }

    var groupedTasks: [(String, [Task])] {
        let grouped = Dictionary(grouping: filteredTasks) { task -> String in
            if task.isOverdue {
                return "Overdue"
            } else if let dueDate = task.dueDate {
                if dueDate.isToday {
                    return "Today"
                } else if Calendar.current.isDateInTomorrow(dueDate) {
                    return "Tomorrow"
                } else if Calendar.current.isDate(dueDate, equalTo: Date(), toGranularity: .weekOfYear) {
                    return "This Week"
                } else {
                    return "Later"
                }
            } else {
                return "No Due Date"
            }
        }

        let sortOrder = ["Overdue", "Today", "Tomorrow", "This Week", "Later", "No Due Date"]
        return sortOrder.compactMap { key in
            guard let tasks = grouped[key], !tasks.isEmpty else { return nil }
            return (key, tasks.sorted { ($0.dueDate ?? Date.distantFuture) < ($1.dueDate ?? Date.distantFuture) })
        }
    }

    // MARK: - Data Loading

    func loadTasks() async {
        isLoading = true
        errorMessage = nil

        do {
            try await taskService.fetchTasks(
                page: 1,
                limit: 100,
                status: selectedFilter.taskStatus,
                category: selectedCategory
            )
            tasks = taskService.tasks
        } catch {
            Logger.error("Failed to load tasks: \(error)")
            errorMessage = "Failed to load tasks"
        }

        isLoading = false
    }

    // MARK: - Task Actions

    func toggleTaskCompletion(_ task: Task) async {
        do {
            if task.isCompleted {
                try await taskService.uncompleteTask(id: task.id)
            } else {
                try await taskService.completeTask(id: task.id)
            }

            // Reload tasks to reflect changes
            await loadTasks()

        } catch {
            Logger.error("Failed to toggle task completion: \(error)")
            errorMessage = "Failed to update task"
        }
    }

    func deleteTask(_ task: Task) async {
        do {
            try await taskService.deleteTask(id: task.id)

            // Remove from local list
            tasks.removeAll { $0.id == task.id }

        } catch {
            Logger.error("Failed to delete task: \(error)")
            errorMessage = "Failed to delete task"
        }
    }
}
