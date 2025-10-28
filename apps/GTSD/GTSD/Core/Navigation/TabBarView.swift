//
//  TabBarView.swift
//  GTSD
//
//  Created by Claude on 2025-10-26.
//

import SwiftUI

struct TabBarView: View {
    @StateObject private var coordinator = NavigationCoordinator()
    @EnvironmentObject var authService: AuthenticationService

    var body: some View {
        TabView(selection: $coordinator.selectedTab) {
            HomeView()
                .tabItem {
                    Label("Home", systemImage: "house.fill")
                }
                .tag(NavigationCoordinator.TabItem.home)

            PlanSummaryView()
                .tabItem {
                    Label("Plans", systemImage: "list.bullet.clipboard.fill")
                }
                .tag(NavigationCoordinator.TabItem.plans)

            TasksView()
                .tabItem {
                    Label("Tasks", systemImage: "list.bullet")
                }
                .tag(NavigationCoordinator.TabItem.tasks)

            StreaksView()
                .tabItem {
                    Label("Streaks", systemImage: "flame.fill")
                }
                .tag(NavigationCoordinator.TabItem.streaks)

            ProfileView()
                .tabItem {
                    Label("Profile", systemImage: "person.fill")
                }
                .tag(NavigationCoordinator.TabItem.profile)
        }
        .tint(.primaryColor)
        .environmentObject(coordinator)
        .sheet(isPresented: $coordinator.showOnboarding) {
            OnboardingCoordinator()
        }
        .onOpenURL { url in
            coordinator.handle(url: url)
        }
    }
}

// MARK: - Preview

#Preview {
    TabBarView()
        .environmentObject(ServiceContainer.shared.authService as! AuthenticationService)
}
