//
//  GTSDApp.swift
//  GTSD
//
//  Created by Claude on 2025-10-26.
//

import SwiftUI

@main
struct GTSDApp: App {
    @StateObject private var serviceContainer = ServiceContainer.shared

    private var authService: AuthenticationService {
        serviceContainer.authService as! AuthenticationService
    }

    init() {
        // Initialize and validate configuration
        configureApplication()
        configureAppearance()
    }

    var body: some Scene {
        WindowGroup {
            ContentView()
                .environmentObject(authService)
        }
    }

    // MARK: - Configuration

    private func configureApplication() {
        // Get configuration instance (this triggers initialization)
        let config = Configuration.shared

        // Validate configuration settings
        config.validateConfiguration()

        // Log environment information
        Logger.log("GTSD iOS App starting...", level: .info)
        Logger.log("Environment: \(config.environment.name)", level: .info)
        Logger.log("API Base URL: \(config.apiBaseURL)", level: .info)

        // Configure security features
        if config.isCertificatePinningEnabled {
            Logger.log("Certificate pinning enabled for production", level: .info)
        }

        if config.isRequestSigningEnabled {
            Logger.log("Request signing enabled", level: .info)
        }

        if config.isEncryptedCacheEnabled {
            Logger.log("Encrypted cache enabled", level: .info)
        }

        // Configure analytics if enabled
        if config.analyticsEnabled {
            // TODO: Initialize analytics SDK
            Logger.log("Analytics enabled", level: .info)
        }

        // Configure crash reporting if enabled
        if config.crashReportingEnabled {
            // TODO: Initialize crash reporting SDK
            Logger.log("Crash reporting enabled", level: .info)
        }

        #if DEBUG
        Logger.log("Debug mode active", level: .warning)
        if config.showDebugUI {
            Logger.log("Debug UI enabled", level: .debug)
        }
        #endif
    }

    private func configureAppearance() {
        // Configure navigation bar appearance
        let appearance = UINavigationBarAppearance()
        appearance.configureWithOpaqueBackground()
        UINavigationBar.appearance().standardAppearance = appearance
        UINavigationBar.appearance().compactAppearance = appearance
        UINavigationBar.appearance().scrollEdgeAppearance = appearance
    }
}

// MARK: - Content View

struct ContentView: View {
    @EnvironmentObject var authService: AuthenticationService

    var body: some View {
        Group {
            if authService.isAuthenticated {
                if let user = authService.currentUser, !user.hasCompletedOnboarding {
                    OnboardingCoordinator()
                } else {
                    TabBarView()
                }
            } else {
                LoginView()
            }
        }
        .animation(.easeInOut, value: authService.isAuthenticated)
    }
}

// MARK: - Photos View Placeholder

struct PhotosView: View {
    @StateObject private var photoService: PhotoService

    init() {
        _photoService = StateObject(wrappedValue: ServiceContainer.shared.photoService as! PhotoService)
    }

    var body: some View {
        NavigationStack {
            ScrollView {
                if photoService.photos.isEmpty {
                    VStack(spacing: 16) {
                        Image(systemName: "photo")
                            .font(.system(size: 60))
                            .foregroundColor(.gray)

                        Text("No Photos")
                            .font(.title3)
                            .fontWeight(.semibold)

                        Text("Upload photos for your tasks")
                            .font(.subheadline)
                            .foregroundColor(.secondary)
                    }
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
                    .padding()
                } else {
                    LazyVGrid(columns: [
                        GridItem(.flexible()),
                        GridItem(.flexible()),
                        GridItem(.flexible())
                    ], spacing: 2) {
                        ForEach(photoService.photos) { photo in
                            AsyncImage(url: URL(string: photo.url)) { image in
                                image
                                    .resizable()
                                    .aspectRatio(contentMode: .fill)
                            } placeholder: {
                                Rectangle()
                                    .fill(Color.gray.opacity(0.2))
                                    .overlay(
                                        ProgressView()
                                    )
                            }
                            .frame(width: UIScreen.main.bounds.width / 3 - 1, height: UIScreen.main.bounds.width / 3 - 1)
                            .clipped()
                        }
                    }
                }
            }
            .navigationTitle("Photos")
            .task {
                do {
                    try await photoService.fetchPhotos()
                } catch {
                    Logger.error("Failed to load photos: \(error)")
                }
            }
        }
    }
}

// MARK: - Stats View Placeholder

struct StatsView: View {
    @State private var stats: UserStats?
    @State private var streak: CurrentStreak?
    @State private var badges: [UserBadge] = []

    private let apiClient: any APIClientProtocol

    init() {
        self.apiClient = ServiceContainer.shared.apiClient
    }

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 24) {
                    // Stats Section
                    if let stats = stats {
                        VStack(spacing: 16) {
                            Text("Your Statistics")
                                .font(.headline)

                            LazyVGrid(columns: [
                                GridItem(.flexible()),
                                GridItem(.flexible())
                            ], spacing: 16) {
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
                                    color: .secondaryColor
                                )
                            }
                        }
                        .padding()
                    }

                    // Streak Section
                    if let streak = streak {
                        VStack(alignment: .leading, spacing: 16) {
                            Text("Streak")
                                .font(.headline)

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
                        .padding(.horizontal)
                    }

                    // Badges Section
                    if !badges.isEmpty {
                        VStack(alignment: .leading, spacing: 16) {
                            Text("Badges")
                                .font(.headline)
                                .padding(.horizontal)

                            ScrollView(.horizontal, showsIndicators: false) {
                                HStack(spacing: 16) {
                                    ForEach(badges) { userBadge in
                                        VStack(spacing: 8) {
                                            Image(systemName: userBadge.badge.icon)
                                                .font(.system(size: 40))
                                                .foregroundColor(.primaryColor)

                                            Text(userBadge.badge.name)
                                                .font(.caption)
                                                .multilineTextAlignment(.center)
                                        }
                                        .frame(width: 100)
                                        .padding()
                                        .background(Color(.systemBackground))
                                        .cornerRadius(12)
                                        .shadow(color: Color.black.opacity(0.05), radius: 4)
                                    }
                                }
                                .padding(.horizontal)
                            }
                        }
                    }
                }
                .padding(.vertical)
            }
            .navigationTitle("Statistics")
            .task {
                await loadData()
            }
        }
    }

    private func loadData() async {
        do {
            // Note: Stats endpoint not yet implemented in backend
            // async let statsResult: UserStats = apiClient.request(.getStats)
            async let streakResult: CurrentStreak = apiClient.request(.getCurrentStreak)
            async let badgesResult: [UserBadge] = apiClient.request(.getUserBadges)

            // stats = try await statsResult
            streak = try await streakResult
            badges = try await badgesResult

        } catch {
            Logger.error("Failed to load stats: \(error)")
        }
    }
}

#Preview {
    ContentView()
        .environmentObject(ServiceContainer.shared.authService as! AuthenticationService)
}
