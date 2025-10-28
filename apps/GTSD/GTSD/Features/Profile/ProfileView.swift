//
//  ProfileView.swift
//  GTSD
//
//  Created by Claude on 2025-10-26.
//

import SwiftUI

struct ProfileView: View {
    @StateObject private var viewModel = ProfileViewModel()
    @State private var showingSettings = false
    @State private var showingEditProfile = false
    @State private var showingLogoutAlert = false

    var body: some View {
        NavigationStack {
            Group {
                if viewModel.isLoading {
                    LoadingView(message: "Loading profile...")
                } else if let errorMessage = viewModel.errorMessage {
                    ErrorView(message: errorMessage) {
                        _Concurrency.Task { await viewModel.loadProfile() }
                    }
                } else if let user = viewModel.currentUser {
                    ScrollView {
                        VStack(spacing: Spacing.lg) {
                            // Profile Header
                            ProfileHeader(user: user)
                                .padding(.top, Spacing.lg)

                            // Quick Stats from Streak Data
                            if let streak = viewModel.currentStreak {
                                QuickStats(
                                    currentStreak: streak.currentStreak,
                                    longestStreak: streak.longestStreak,
                                    totalBadges: 0
                                )
                                .padding(.horizontal, Spacing.md)
                            }

                            // Action Buttons
                            VStack(spacing: Spacing.md) {
                                Button(action: { showingEditProfile = true }) {
                                    HStack {
                                        Image(systemName: "pencil.circle.fill")
                                            .font(.system(size: IconSize.sm))
                                        Text("Edit Profile")
                                            .font(.titleMedium)
                                        Spacer()
                                        Image(systemName: "chevron.right")
                                            .font(.system(size: IconSize.xs))
                                    }
                                    .foregroundColor(.textPrimary)
                                    .padding(Spacing.md)
                                    .background(Color.backgroundSecondary)
                                    .cornerRadius(CornerRadius.md)
                                }

                                Button(action: { showingSettings = true }) {
                                    HStack {
                                        Image(systemName: "gearshape.fill")
                                            .font(.system(size: IconSize.sm))
                                        Text("Settings")
                                            .font(.titleMedium)
                                        Spacer()
                                        Image(systemName: "chevron.right")
                                            .font(.system(size: IconSize.xs))
                                    }
                                    .foregroundColor(.textPrimary)
                                    .padding(Spacing.md)
                                    .background(Color.backgroundSecondary)
                                    .cornerRadius(CornerRadius.md)
                                }

                                Button(action: { showingLogoutAlert = true }) {
                                    HStack {
                                        Image(systemName: "rectangle.portrait.and.arrow.right")
                                            .font(.system(size: IconSize.sm))
                                        Text("Logout")
                                            .font(.titleMedium)
                                        Spacer()
                                    }
                                    .foregroundColor(.errorColor)
                                    .padding(Spacing.md)
                                    .background(Color.errorColor.opacity(0.1))
                                    .cornerRadius(CornerRadius.md)
                                }
                            }
                            .padding(.horizontal, Spacing.md)
                        }
                        .padding(.vertical, Spacing.md)
                    }
                    .refreshable {
                        await viewModel.loadProfile()
                    }
                }
            }
            .navigationTitle("Profile")
            .task {
                await viewModel.loadProfile()
            }
            .sheet(isPresented: $showingEditProfile) {
                ProfileEditView()
            }
            .sheet(isPresented: $showingSettings) {
                SettingsView()
            }
            .alert("Logout", isPresented: $showingLogoutAlert) {
                Button("Cancel", role: .cancel) {}
                Button("Logout", role: .destructive) {
                    _Concurrency.Task {
                        await viewModel.logout()
                    }
                }
            } message: {
                Text("Are you sure you want to logout?")
            }
        }
    }
}

// MARK: - Profile Header

struct ProfileHeader: View {
    let user: User

    var body: some View {
        VStack(spacing: Spacing.md) {
            // Avatar
            ZStack {
                Circle()
                    .fill(Color.primaryColor.gradient)
                    .frame(width: 100, height: 100)

                Text(initials)
                    .font(.system(size: 40, weight: .bold))
                    .foregroundColor(.white)
            }

            // User Info
            VStack(spacing: Spacing.xs) {
                Text(user.name)
                    .font(.headlineMedium)
                    .foregroundColor(.textPrimary)

                Text(user.email)
                    .font(.bodyMedium)
                    .foregroundColor(.textSecondary)

                if let createdAt = user.createdAt {
                    Text("Member since \(createdAt, style: .date)")
                        .font(.bodySmall)
                        .foregroundColor(.textTertiary)
                }
            }
        }
    }

    private var initials: String {
        let components = user.name.components(separatedBy: " ")
        if components.count >= 2 {
            let first = components[0].prefix(1)
            let last = components[1].prefix(1)
            return "\(first)\(last)".uppercased()
        } else {
            return String(user.name.prefix(2)).uppercased()
        }
    }
}

// MARK: - Stats Grid

struct StatsGrid: View {
    let stats: UserStats

    var body: some View {
        VStack(alignment: .leading, spacing: Spacing.md) {
            Text("Your Progress")
                .font(.titleMedium)
                .foregroundColor(.textPrimary)

            LazyVGrid(columns: [
                GridItem(.flexible()),
                GridItem(.flexible())
            ], spacing: Spacing.md) {
                StatCard(
                    title: "Total Tasks",
                    value: "\(stats.totalTasks)",
                    icon: "list.bullet",
                    color: .primaryColor
                )

                StatCard(
                    title: "Completed",
                    value: "\(stats.completedTasks)",
                    icon: "checkmark.circle.fill",
                    color: .successColor
                )

                StatCard(
                    title: "In Progress",
                    value: "\(stats.inProgressTasks)",
                    icon: "clock.fill",
                    color: .warningColor
                )

                StatCard(
                    title: "Photos",
                    value: "\(stats.totalPhotos)",
                    icon: "photo.fill",
                    color: .infoColor
                )
            }
        }
    }
}

// MARK: - Quick Stats

struct QuickStats: View {
    let currentStreak: Int
    let longestStreak: Int
    let totalBadges: Int

    var body: some View {
        GTSDCard {
            VStack(spacing: Spacing.md) {
                HStack(alignment: .top, spacing: Spacing.lg) {
                    QuickStatItem(
                        icon: "flame.fill",
                        value: "\(currentStreak)",
                        label: "Current Streak",
                        color: .orange
                    )

                    Divider()

                    QuickStatItem(
                        icon: "star.fill",
                        value: "\(longestStreak)",
                        label: "Longest Streak",
                        color: .yellow
                    )

                    Divider()

                    QuickStatItem(
                        icon: "trophy.fill",
                        value: "\(totalBadges)",
                        label: "Badges",
                        color: .purple
                    )
                }
            }
        }
    }
}

// MARK: - Quick Stat Item

struct QuickStatItem: View {
    let icon: String
    let value: String
    let label: String
    let color: Color

    var body: some View {
        VStack(spacing: Spacing.xs) {
            Image(systemName: icon)
                .font(.system(size: IconSize.md))
                .foregroundColor(color)

            Text(value)
                .font(.headlineMedium)
                .foregroundColor(.textPrimary)

            Text(label)
                .font(.labelSmall)
                .foregroundColor(.textSecondary)
                .multilineTextAlignment(.center)
        }
        .frame(maxWidth: .infinity)
    }
}

// MARK: - Preview

#Preview {
    ProfileView()
}
