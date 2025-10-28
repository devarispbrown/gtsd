//
//  TasksView.swift
//  GTSD
//
//  Created by Claude on 2025-10-26.
//

import SwiftUI

struct TasksView: View {
    @StateObject private var viewModel = TasksViewModel()
    @State private var showingAddTask = false

    var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                // Filter Tabs
                filterTabs

                // Task List
                if viewModel.isLoading {
                    ProgressView()
                        .frame(maxWidth: .infinity, maxHeight: .infinity)
                } else if viewModel.filteredTasks.isEmpty {
                    emptyState
                } else {
                    taskList
                }
            }
            .navigationTitle("Tasks")
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button(action: { showingAddTask = true }) {
                        Image(systemName: "plus")
                    }
                }
            }
            .refreshable {
                await viewModel.loadTasks()
            }
            .task {
                await viewModel.loadTasks()
            }
            .sheet(isPresented: $showingAddTask) {
                AddTaskView()
            }
        }
    }

    // MARK: - Filter Tabs

    private var filterTabs: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 12) {
                ForEach(TasksViewModel.TaskFilter.allCases, id: \.self) { filter in
                    Button(action: {
                        viewModel.selectedFilter = filter
                        _Concurrency.Task {
                            await viewModel.loadTasks()
                        }
                    }) {
                        Text(filter.rawValue)
                            .font(.subheadline)
                            .fontWeight(.medium)
                            .padding(.horizontal, 16)
                            .padding(.vertical, 8)
                            .background(
                                viewModel.selectedFilter == filter
                                    ? Color.primaryColor
                                    : Color.gray.opacity(0.2)
                            )
                            .foregroundColor(
                                viewModel.selectedFilter == filter
                                    ? .white
                                    : .primary
                            )
                            .cornerRadius(20)
                    }
                }
            }
            .padding()
        }
    }

    // MARK: - Task List

    private var taskList: some View {
        List {
            ForEach(viewModel.groupedTasks, id: \.0) { section, tasks in
                Section(section) {
                    ForEach(tasks) { task in
                        NavigationLink(destination: TaskDetailView(task: task)) {
                            TaskListRow(
                                task: task,
                                onToggleCompletion: {
                                    _Concurrency.Task {
                                        await viewModel.toggleTaskCompletion(task)
                                    }
                                }
                            )
                        }
                        .swipeActions(edge: .trailing, allowsFullSwipe: false) {
                            Button(role: .destructive) {
                                _Concurrency.Task {
                                    await viewModel.deleteTask(task)
                                }
                            } label: {
                                Label("Delete", systemImage: "trash")
                            }
                        }
                    }
                }
            }
        }
        .listStyle(.insetGrouped)
    }

    // MARK: - Empty State

    private var emptyState: some View {
        VStack(spacing: 16) {
            Image(systemName: "checkmark.circle")
                .font(.system(size: 60))
                .foregroundColor(.gray)

            Text("No Tasks")
                .font(.title3)
                .fontWeight(.semibold)

            Text("Create a task to get started")
                .font(.subheadline)
                .foregroundColor(.secondary)

            Button(action: { showingAddTask = true }) {
                Text("Add Task")
                    .fontWeight(.semibold)
                    .padding(.horizontal, 24)
                    .padding(.vertical, 12)
                    .background(Color.primaryColor)
                    .foregroundColor(.white)
                    .cornerRadius(10)
            }
            .padding(.top, 8)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }
}

// MARK: - Task List Row

struct TaskListRow: View {
    let task: Task
    let onToggleCompletion: () -> Void

    var body: some View {
        HStack(spacing: 12) {
            // Completion Button
            Button(action: onToggleCompletion) {
                Image(systemName: task.isCompleted ? "checkmark.circle.fill" : "circle")
                    .font(.title3)
                    .foregroundColor(task.isCompleted ? .successColor : .gray)
            }
            .buttonStyle(BorderlessButtonStyle())

            // Task Info
            VStack(alignment: .leading, spacing: 4) {
                Text(task.title)
                    .font(.subheadline)
                    .fontWeight(.medium)
                    .strikethrough(task.isCompleted)
                    .foregroundColor(task.isCompleted ? .secondary : .primary)

                HStack {
                    // Category
                    Label(task.taskCategory.displayName, systemImage: task.taskCategory.icon)
                        .font(.caption)
                        .foregroundColor(.secondary)

                    // Priority
                    if let priority = task.taskPriority {
                        Text("•")
                            .font(.caption)
                            .foregroundColor(.secondary)

                        Text(priority.displayName)
                            .font(.caption)
                            .foregroundColor(priorityColor(priority))
                    }

                    // Due Date
                    if let dueDate = task.dueDate {
                        Text("•")
                            .font(.caption)
                            .foregroundColor(.secondary)

                        Text(dueDate.formatted())
                            .font(.caption)
                            .foregroundColor(task.isOverdue ? .errorColor : .secondary)
                    }
                }
            }

            Spacer()

            // Overdue Badge
            if task.isOverdue {
                Image(systemName: "exclamationmark.triangle.fill")
                    .font(.caption)
                    .foregroundColor(.errorColor)
            }
        }
        .padding(.vertical, 4)
    }

    private func priorityColor(_ priority: TaskPriority) -> Color {
        switch priority {
        case .low: return .gray
        case .medium: return .primaryColor
        case .high: return .warningColor
        case .urgent: return .errorColor
        }
    }
}

// MARK: - Add Task View

struct AddTaskView: View {
    @Environment(\.dismiss) private var dismiss
    @State private var title = ""
    @State private var description = ""
    @State private var selectedCategory = TaskCategory.personal
    @State private var selectedPriority = TaskPriority.medium
    @State private var dueDate = Date()
    @State private var hasDueDate = false
    @State private var isLoading = false

    private let taskService: any TaskServiceProtocol

    init(taskService: any TaskServiceProtocol = ServiceContainer.shared.taskService) {
        self.taskService = taskService
    }

    var body: some View {
        NavigationStack {
            Form {
                Section("Task Details") {
                    TextField("Title", text: $title)
                    TextField("Description", text: $description, axis: .vertical)
                        .lineLimit(3...6)
                }

                Section("Category") {
                    Picker("Category", selection: $selectedCategory) {
                        ForEach(TaskCategory.allCases, id: \.self) { category in
                            Label(category.displayName, systemImage: category.icon)
                                .tag(category)
                        }
                    }
                }

                Section("Priority") {
                    Picker("Priority", selection: $selectedPriority) {
                        ForEach(TaskPriority.allCases, id: \.self) { priority in
                            Text(priority.displayName)
                                .tag(priority)
                        }
                    }
                    .pickerStyle(.segmented)
                }

                Section("Due Date") {
                    Toggle("Set Due Date", isOn: $hasDueDate)

                    if hasDueDate {
                        DatePicker("Due Date", selection: $dueDate, displayedComponents: [.date])
                    }
                }
            }
            .navigationTitle("New Task")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button("Cancel") {
                        dismiss()
                    }
                }

                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("Create") {
                        _Concurrency.Task {
                            await createTask()
                        }
                    }
                    .disabled(title.trimmed.isEmpty || isLoading)
                }
            }
        }
    }

    private func createTask() async {
        isLoading = true

        do {
            _ = try await taskService.createTask(
                title: title,
                description: description.isEmpty ? nil : description,
                category: selectedCategory,
                dueDate: hasDueDate ? dueDate : nil,
                priority: selectedPriority
            )

            dismiss()

        } catch {
            Logger.error("Failed to create task: \(error)")
            // Show error alert
        }

        isLoading = false
    }
}

#Preview {
    TasksView()
}
