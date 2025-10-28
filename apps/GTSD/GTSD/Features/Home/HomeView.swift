//
//  HomeView.swift
//  GTSD
//
//  Created by Claude on 2025-10-26.
//

import SwiftUI

struct HomeView: View {
    @StateObject private var viewModel = HomeViewModel()
    @State private var showingProfile = false
    @State private var showingOnboarding = false

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 24) {
                    // Zero State Card (if profile is incomplete)
                    if viewModel.shouldShowZeroState {
                        ProfileZeroStateCard(
                            userName: viewModel.currentUser?.name ?? "there",
                            onComplete: {
                                showingOnboarding = true
                            },
                            onDismiss: {
                                viewModel.dismissZeroState()
                            }
                        )
                    }

                    // Stats Cards
                    statsSection

                    // Streak Card
                    if let streak = viewModel.currentStreak {
                        streakCard(streak)
                    }

                    // Today's Tasks
                    if !viewModel.todayTasks.isEmpty {
                        taskSection(
                            title: "Today's Tasks",
                            tasks: viewModel.todayTasks
                        )
                    }

                    // Overdue Tasks
                    if !viewModel.overdueTasks.isEmpty {
                        taskSection(
                            title: "Overdue",
                            tasks: viewModel.overdueTasks,
                            color: .errorColor
                        )
                    }

                    // Recent Tasks
                    if !viewModel.recentTasks.isEmpty {
                        taskSection(
                            title: "Recent Tasks",
                            tasks: viewModel.recentTasks
                        )
                    }
                }
                .padding()
            }
            .navigationTitle("Home")
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button(action: { showingProfile = true }) {
                        Image(systemName: "person.circle")
                            .font(.title3)
                    }
                }
            }
            .refreshable {
                await viewModel.loadData()
            }
            .task {
                await viewModel.loadData()
            }
            .sheet(isPresented: $showingProfile) {
                ProfileView()
            }
            .sheet(isPresented: $showingOnboarding) {
                OnboardingCoordinator()
            }
        }
    }

    // MARK: - Stats Section

    private var statsSection: some View {
        VStack(spacing: 16) {
            // Welcome Text
            if let user = viewModel.currentUser {
                HStack {
                    VStack(alignment: .leading, spacing: 4) {
                        Text("Welcome back,")
                            .font(.subheadline)
                            .foregroundColor(.secondary)
                        Text(user.name)
                            .font(.title2)
                            .fontWeight(.bold)
                    }
                    Spacer()
                }
            }

            // Task Stats Grid (computed from viewModel.tasks)
            LazyVGrid(columns: [
                GridItem(.flexible()),
                GridItem(.flexible())
            ], spacing: 16) {
                StatCard(
                    title: "Total Tasks",
                    value: "\(viewModel.tasks.count)",
                    icon: "list.bullet",
                    color: .primaryColor
                )

                StatCard(
                    title: "Completed",
                    value: "\(viewModel.tasks.filter { $0.taskStatus == .completed }.count)",
                    icon: "checkmark.circle.fill",
                    color: .successColor
                )

                StatCard(
                    title: "In Progress",
                    value: "\(viewModel.tasks.filter { $0.taskStatus == .inProgress }.count)",
                    icon: "clock.fill",
                    color: .warningColor
                )

                StatCard(
                    title: "Pending",
                    value: "\(viewModel.tasks.filter { $0.taskStatus == .pending }.count)",
                    icon: "clock",
                    color: .secondaryColor
                )
            }
        }
    }

    // MARK: - Streak Card

    private func streakCard(_ streak: CurrentStreak) -> some View {
        HStack {
            VStack(alignment: .leading, spacing: 8) {
                HStack {
                    Image(systemName: "flame.fill")
                        .foregroundColor(.orange)
                    Text("Current Streak")
                        .font(.headline)
                }

                Text("\(streak.currentStreak) days")
                    .font(.system(size: 32, weight: .bold))
                    .foregroundColor(.primary)

                Text("Longest: \(streak.longestStreak) days")
                    .font(.caption)
                    .foregroundColor(.secondary)
            }

            Spacer()

            Image(systemName: "flame.circle.fill")
                .font(.system(size: 60))
                .foregroundColor(.orange)
        }
        .padding()
        .background(Color.orange.opacity(0.1))
        .cornerRadius(16)
    }

    // MARK: - Task Section

    private func taskSection(
        title: String,
        tasks: [Task],
        color: Color = .primaryColor
    ) -> some View {
        VStack(alignment: .leading, spacing: 12) {
            Text(title)
                .font(.headline)
                .foregroundColor(color)

            VStack(spacing: 8) {
                ForEach(tasks) { task in
                    NavigationLink(destination: TaskDetailView(task: task)) {
                        TaskRowView(task: task)
                    }
                }
            }
        }
    }
}

// MARK: - Task Row View

struct TaskRowView: View {
    let task: Task

    var body: some View {
        HStack(spacing: 12) {
            // Category Icon
            Image(systemName: task.taskCategory.icon)
                .font(.title3)
                .foregroundColor(.white)
                .frame(width: 40, height: 40)
                .background(Color.primaryColor)
                .cornerRadius(8)

            // Task Info
            VStack(alignment: .leading, spacing: 4) {
                Text(task.title)
                    .font(.subheadline)
                    .fontWeight(.medium)
                    .foregroundColor(.primary)

                HStack {
                    Text(task.taskCategory.displayName)
                        .font(.caption)
                        .foregroundColor(.secondary)

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

            // Status Badge
            Text(task.taskStatus.displayName)
                .font(.caption)
                .padding(.horizontal, 8)
                .padding(.vertical, 4)
                .background(statusColor(for: task.taskStatus).opacity(0.2))
                .foregroundColor(statusColor(for: task.taskStatus))
                .cornerRadius(8)
        }
        .padding()
        .background(Color(.systemBackground))
        .cornerRadius(12)
        .shadow(color: Color.black.opacity(0.05), radius: 4, x: 0, y: 2)
    }

    private func statusColor(for status: TaskStatus) -> Color {
        switch status {
        case .pending: return .warningColor
        case .inProgress: return .primaryColor
        case .completed: return .successColor
        case .archived: return .gray
        }
    }
}

#Preview {
    HomeView()
}
