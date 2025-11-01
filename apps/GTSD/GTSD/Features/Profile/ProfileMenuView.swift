//
//  ProfileMenuView.swift
//  GTSD
//
//  Created by Claude on 2025-10-31.
//  Initial profile menu screen with View Profile button
//

import SwiftUI

struct ProfileMenuView: View {
    @EnvironmentObject var authService: AuthenticationService
    @State private var showLogoutConfirmation = false

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: Spacing.lg) {
                    profileHeaderSection
                        .padding(.top, Spacing.xl)

                    viewProfileButton

                    settingsSection

                    accountSection

                    Spacer()
                }
                .padding(.horizontal, Spacing.md)
            }
            .navigationTitle("Profile")
            .navigationBarTitleDisplayMode(.large)
            .confirmationDialog(
                "Are you sure you want to logout?",
                isPresented: $showLogoutConfirmation,
                titleVisibility: .visible
            ) {
                Button("Logout", role: .destructive) {
                    _Concurrency.Task {
                        await authService.logout()
                    }
                }
                Button("Cancel", role: .cancel) {}
            }
        }
    }

    // MARK: - View Components

    @ViewBuilder
    private var profileHeaderSection: some View {
        VStack(spacing: Spacing.md) {
            Circle()
                .fill(Color.primaryColor.opacity(0.1))
                .frame(width: 100, height: 100)
                .overlay {
                    Image(systemName: "person.fill")
                        .font(.system(size: 50))
                        .foregroundColor(.primaryColor)
                }

            if let user = authService.currentUser {
                Text(user.name)
                    .font(.title2)
                    .fontWeight(.bold)

                Text(user.email)
                    .font(.subheadline)
                    .foregroundColor(.secondary)
            }
        }
    }

    @ViewBuilder
    private var viewProfileButton: some View {
        NavigationLink(destination: ProfileEditView()) {
            HStack {
                Image(systemName: "person.text.rectangle")
                    .font(.system(size: IconSize.md))
                    .foregroundColor(.primaryColor)

                VStack(alignment: .leading, spacing: 4) {
                    Text("View Profile")
                        .font(.headline)
                        .foregroundColor(.primary)

                    Text("See and edit your profile information")
                        .font(.caption)
                        .foregroundColor(.secondary)
                }

                Spacer()

                Image(systemName: "chevron.right")
                    .font(.system(size: IconSize.sm))
                    .foregroundColor(.secondary)
            }
            .padding(Spacing.md)
            .background(Color(.systemBackground))
            .cornerRadius(CornerRadius.md)
            .overlay(
                RoundedRectangle(cornerRadius: CornerRadius.md)
                    .stroke(Color.gray.opacity(0.2), lineWidth: 1)
            )
        }
        .buttonStyle(.plain)
        .accessibilityLabel("View Profile")
        .accessibilityHint("Navigate to your profile information")
    }

    @ViewBuilder
    private var settingsSection: some View {
        VStack(alignment: .leading, spacing: Spacing.md) {
            Text("Settings")
                .font(.headline)
                .foregroundColor(.secondary)
                .padding(.horizontal, Spacing.sm)

            NavigationLink(destination: Text("Preferences")) {
                MenuRowView(
                    icon: "gearshape.fill",
                    title: "Preferences",
                    subtitle: "App settings and preferences"
                )
            }
            .buttonStyle(.plain)

            NavigationLink(destination: Text("Privacy Settings")) {
                MenuRowView(
                    icon: "lock.fill",
                    title: "Privacy",
                    subtitle: "Manage your privacy settings"
                )
            }
            .buttonStyle(.plain)

            NavigationLink(destination: Text("Notification Settings")) {
                MenuRowView(
                    icon: "bell.fill",
                    title: "Notifications",
                    subtitle: "Manage notification preferences"
                )
            }
            .buttonStyle(.plain)
        }
    }

    @ViewBuilder
    private var accountSection: some View {
        VStack(alignment: .leading, spacing: Spacing.md) {
            Text("Account")
                .font(.headline)
                .foregroundColor(.secondary)
                .padding(.horizontal, Spacing.sm)

            Button(action: {
                showLogoutConfirmation = true
            }) {
                MenuRowView(
                    icon: "rectangle.portrait.and.arrow.right",
                    title: "Logout",
                    subtitle: "Sign out of your account",
                    iconColor: .errorColor
                )
            }
            .buttonStyle(.plain)
        }
    }
}

// MARK: - Menu Row View

struct MenuRowView: View {
    let icon: String
    let title: String
    let subtitle: String
    var iconColor: Color = .primaryColor

    var body: some View {
        HStack(spacing: Spacing.md) {
            Image(systemName: icon)
                .font(.system(size: IconSize.md))
                .foregroundColor(iconColor)
                .frame(width: 30)

            VStack(alignment: .leading, spacing: 4) {
                Text(title)
                    .font(.headline)
                    .foregroundColor(.primary)

                Text(subtitle)
                    .font(.caption)
                    .foregroundColor(.secondary)
            }

            Spacer()

            Image(systemName: "chevron.right")
                .font(.system(size: IconSize.sm))
                .foregroundColor(.secondary)
        }
        .padding(Spacing.md)
        .background(Color(.systemBackground))
        .cornerRadius(CornerRadius.md)
        .overlay(
            RoundedRectangle(cornerRadius: CornerRadius.md)
                .stroke(Color.gray.opacity(0.2), lineWidth: 1)
        )
    }
}

#Preview {
    ProfileMenuView()
        .environmentObject(ServiceContainer.shared.authService as! AuthenticationService)
}
