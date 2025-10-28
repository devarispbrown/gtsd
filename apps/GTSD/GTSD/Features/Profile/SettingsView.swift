//
//  SettingsView.swift
//  GTSD
//
//  Created by Claude on 2025-10-26.
//

import SwiftUI

struct SettingsView: View {
    @Environment(\.dismiss) private var dismiss
    @Environment(\.colorScheme) private var colorScheme
    @StateObject private var biometricService = BiometricAuthService.shared

    @AppStorage("darkModeEnabled") private var darkModeEnabled = false
    @AppStorage("notificationsEnabled") private var notificationsEnabled = true
    @AppStorage("dailyReminderEnabled") private var dailyReminderEnabled = true
    @AppStorage("reminderTimeInterval") private var reminderTimeInterval: Double = Date().timeIntervalSince1970

    private var reminderTime: Binding<Date> {
        Binding(
            get: { Date(timeIntervalSince1970: reminderTimeInterval) },
            set: { reminderTimeInterval = $0.timeIntervalSince1970 }
        )
    }

    var body: some View {
        NavigationStack {
            Form {
                // Appearance Section
                Section {
                    Toggle(isOn: $darkModeEnabled) {
                        HStack {
                            Image(systemName: "moon.fill")
                                .foregroundColor(.primaryColor)
                            Text("Dark Mode")
                        }
                    }
                } header: {
                    Text("Appearance")
                } footer: {
                    Text("Enable dark mode for a better experience in low light")
                }

                // Security Section
                Section {
                    if biometricService.isAvailable {
                        Toggle(isOn: $biometricService.isBiometricEnabled) {
                            HStack {
                                Image(systemName: biometricService.biometricType.icon)
                                    .foregroundColor(.primaryColor)
                                Text(biometricService.biometricType.displayName)
                            }
                        }
                    } else {
                        HStack {
                            Image(systemName: "faceid")
                                .foregroundColor(.textTertiary)
                            Text("Biometric Authentication")
                            Spacer()
                            Text("Not Available")
                                .foregroundColor(.textTertiary)
                                .font(.bodySmall)
                        }
                    }
                } header: {
                    Text("Security")
                } footer: {
                    Text(biometricService.isAvailable ? biometricService.biometricDescription : "Biometric authentication is not supported on this device")
                }

                // Notifications Section
                Section {
                    Toggle(isOn: $notificationsEnabled) {
                        HStack {
                            Image(systemName: "bell.fill")
                                .foregroundColor(.primaryColor)
                            Text("Enable Notifications")
                        }
                    }

                    if notificationsEnabled {
                        Toggle(isOn: $dailyReminderEnabled) {
                            HStack {
                                Image(systemName: "clock.fill")
                                    .foregroundColor(.primaryColor)
                                Text("Daily Reminder")
                            }
                        }

                        if dailyReminderEnabled {
                            DatePicker(
                                "Reminder Time",
                                selection: reminderTime,
                                displayedComponents: .hourAndMinute
                            )
                        }
                    }
                } header: {
                    Text("Notifications")
                } footer: {
                    Text("Receive daily reminders to complete your tasks")
                }

                // Data & Privacy Section
                Section {
                    NavigationLink(destination: Text("About")) {
                        HStack {
                            Image(systemName: "info.circle")
                                .foregroundColor(.primaryColor)
                            Text("About")
                        }
                    }

                    NavigationLink(destination: Text("Privacy Policy")) {
                        HStack {
                            Image(systemName: "hand.raised.fill")
                                .foregroundColor(.primaryColor)
                            Text("Privacy Policy")
                        }
                    }

                    NavigationLink(destination: Text("Terms of Service")) {
                        HStack {
                            Image(systemName: "doc.text.fill")
                                .foregroundColor(.primaryColor)
                            Text("Terms of Service")
                        }
                    }
                } header: {
                    Text("Legal")
                }

                // Support Section
                Section {
                    Button(action: {
                        if let url = URL(string: "mailto:support@gtsd.app") {
                            UIApplication.shared.open(url)
                        }
                    }) {
                        HStack {
                            Image(systemName: "envelope.fill")
                                .foregroundColor(.primaryColor)
                            Text("Contact Support")
                            Spacer()
                            Image(systemName: "arrow.up.right")
                                .font(.system(size: IconSize.xs))
                                .foregroundColor(.textSecondary)
                        }
                    }

                    Button(action: {
                        if let url = URL(string: "https://gtsd.app") {
                            UIApplication.shared.open(url)
                        }
                    }) {
                        HStack {
                            Image(systemName: "globe")
                                .foregroundColor(.primaryColor)
                            Text("Visit Website")
                            Spacer()
                            Image(systemName: "arrow.up.right")
                                .font(.system(size: IconSize.xs))
                                .foregroundColor(.textSecondary)
                        }
                    }
                } header: {
                    Text("Support")
                }

                // App Info Section
                Section {
                    HStack {
                        Text("Version")
                        Spacer()
                        Text("1.0.0")
                            .foregroundColor(.textSecondary)
                    }

                    HStack {
                        Text("Build")
                        Spacer()
                        Text("100")
                            .foregroundColor(.textSecondary)
                    }
                } header: {
                    Text("App Information")
                }
            }
            .navigationTitle("Settings")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("Done") {
                        dismiss()
                    }
                }
            }
        }
    }
}

// MARK: - Preview

#Preview {
    SettingsView()
}
