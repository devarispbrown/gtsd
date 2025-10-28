//
//  StreaksView.swift
//  GTSD
//
//  Created by Claude on 2025-10-26.
//

import SwiftUI

struct StreaksView: View {
    @StateObject private var viewModel = StreaksViewModel()

    var body: some View {
        NavigationStack {
            Group {
                if viewModel.isLoading {
                    LoadingView(message: "Loading your achievements...")
                } else if let errorMessage = viewModel.errorMessage {
                    ErrorView(message: errorMessage) {
                        _Concurrency.Task { await viewModel.loadData() }
                    }
                } else {
                    ScrollView {
                        VStack(spacing: Spacing.lg) {
                            // Current Streak Card
                            if let streak = viewModel.currentStreak {
                                CurrentStreakCard(streak: streak)
                                    .padding(.horizontal, Spacing.md)
                            }

                            // Calendar Heatmap
                            CalendarHeatmap(viewModel: viewModel)
                                .card()
                                .padding(.horizontal, Spacing.md)

                            // Badges Section
                            VStack(alignment: .leading, spacing: Spacing.md) {
                                HStack {
                                    Text("Achievements")
                                        .font(.headlineMedium)
                                        .foregroundColor(.textPrimary)

                                    Spacer()

                                    Text("\(viewModel.badges.count)")
                                        .font(.titleMedium)
                                        .foregroundColor(.textSecondary)
                                }
                                .padding(.horizontal, Spacing.md)

                                if viewModel.badges.isEmpty {
                                    EmptyStateView(
                                        icon: "trophy",
                                        title: "No Badges Yet",
                                        message: "Complete tasks and build streaks to earn achievements!"
                                    )
                                    .frame(height: 300)
                                } else {
                                    ScrollView(.horizontal, showsIndicators: false) {
                                        HStack(spacing: Spacing.md) {
                                            ForEach(viewModel.badges) { userBadge in
                                                BadgeCard(userBadge: userBadge)
                                            }
                                        }
                                        .padding(.horizontal, Spacing.md)
                                    }
                                }
                            }

                            // Streak Stats
                            if !viewModel.streakHistory.isEmpty {
                                StreakStatsCard(history: viewModel.streakHistory)
                                    .padding(.horizontal, Spacing.md)
                            }
                        }
                        .padding(.vertical, Spacing.md)
                    }
                    .refreshable {
                        await viewModel.loadData()
                    }
                }
            }
            .navigationTitle("Streaks & Badges")
            .task {
                await viewModel.loadData()
            }
        }
    }
}

// MARK: - Current Streak Card

struct CurrentStreakCard: View {
    let streak: CurrentStreak

    var body: some View {
        HStack(spacing: Spacing.lg) {
            // Flame Icon
            ZStack {
                Circle()
                    .fill(Color.orange.opacity(0.2))
                    .frame(width: 80, height: 80)

                Image(systemName: "flame.fill")
                    .font(.system(size: IconSize.xl))
                    .foregroundColor(.orange)
            }

            // Streak Info
            VStack(alignment: .leading, spacing: Spacing.xs) {
                Text("Current Streak")
                    .font(.labelMedium)
                    .foregroundColor(.textSecondary)

                HStack(alignment: .firstTextBaseline, spacing: Spacing.xs) {
                    Text("\(streak.currentStreak)")
                        .font(.system(size: 48, weight: .bold))
                        .foregroundColor(.textPrimary)

                    Text("days")
                        .font(.titleMedium)
                        .foregroundColor(.textSecondary)
                }

                Text("Longest: \(streak.longestStreak) days")
                    .font(.bodyMedium)
                    .foregroundColor(.textSecondary)

                if streak.streakActive {
                    HStack(spacing: Spacing.xs) {
                        Image(systemName: "checkmark.circle.fill")
                            .font(.system(size: IconSize.xs))
                        Text("Active")
                            .font(.labelSmall)
                    }
                    .foregroundColor(.successColor)
                    .padding(.horizontal, Spacing.sm)
                    .padding(.vertical, Spacing.xs)
                    .background(Color.successColor.opacity(0.1))
                    .cornerRadius(CornerRadius.xs)
                }
            }

            Spacer()
        }
        .card()
    }
}

// MARK: - Streak Stats Card

struct StreakStatsCard: View {
    let history: [StreakHistory]

    var body: some View {
        VStack(alignment: .leading, spacing: Spacing.md) {
            Text("Statistics")
                .font(.titleMedium)
                .foregroundColor(.textPrimary)

            LazyVGrid(columns: [
                GridItem(.flexible()),
                GridItem(.flexible())
            ], spacing: Spacing.md) {
                StatCard(
                    title: "Total Days",
                    value: "\(history.count)",
                    icon: "calendar",
                    color: .primaryColor
                )

                StatCard(
                    title: "Tasks Done",
                    value: "\(totalTasks)",
                    icon: "checkmark.circle.fill",
                    color: .successColor
                )

                StatCard(
                    title: "Photos Uploaded",
                    value: "\(totalPhotos)",
                    icon: "photo.fill",
                    color: .infoColor
                )

                StatCard(
                    title: "Avg Per Day",
                    value: String(format: "%.1f", averagePerDay),
                    icon: "chart.line.uptrend.xyaxis",
                    color: .warningColor
                )
            }
        }
        .card()
    }

    private var totalTasks: Int {
        history.reduce(0) { $0 + $1.tasksCompleted }
    }

    private var totalPhotos: Int {
        history.reduce(0) { $0 + $1.photosUploaded }
    }

    private var averagePerDay: Double {
        guard !history.isEmpty else { return 0 }
        let total = Double(totalTasks + totalPhotos)
        return total / Double(history.count)
    }
}

// MARK: - Preview

#Preview {
    StreaksView()
}
