//
//  PartnersView.swift
//  GTSD
//
//  Created by Claude on 2025-10-27.
//

import SwiftUI

struct PartnersView: View {
    @Binding var onboardingData: OnboardingData
    let onNext: () -> Void

    @State private var partnerEmail: String = ""
    @State private var partners: [String] = []
    @State private var showSkipAlert = false
    @FocusState private var isEmailFocused: Bool

    var body: some View {
        VStack(spacing: Spacing.xl) {
            // Header
            VStack(spacing: Spacing.md) {
                Image(systemName: "person.2.fill")
                    .font(.system(size: IconSize.xxl))
                    .foregroundColor(.primaryColor)

                Text("Accountability Partners")
                    .font(.headlineMedium)
                    .foregroundColor(.textPrimary)

                Text("Add friends or family to keep you motivated and accountable")
                    .font(.bodyMedium)
                    .foregroundColor(.textSecondary)
                    .multilineTextAlignment(.center)
            }
            .padding(.top, Spacing.xl)
            .padding(.horizontal, Spacing.lg)

            ScrollView {
                VStack(alignment: .leading, spacing: Spacing.lg) {
                    // Benefits Section
                    VStack(alignment: .leading, spacing: Spacing.md) {
                        Text("Why add partners?")
                            .font(.titleMedium)
                            .foregroundColor(.textPrimary)

                        BenefitRow(
                            icon: "chart.line.uptrend.xyaxis",
                            title: "Stay Motivated",
                            description: "Share progress and celebrate wins together"
                        )

                        BenefitRow(
                            icon: "bell.badge.fill",
                            title: "Get Reminders",
                            description: "Partners can help keep you on track"
                        )

                        BenefitRow(
                            icon: "trophy.fill",
                            title: "Compete & Compare",
                            description: "Friendly competition drives results"
                        )
                    }
                    .padding(Spacing.md)
                    .background(Color.backgroundSecondary)
                    .cornerRadius(CornerRadius.md)

                    // Add Partner Section
                    VStack(alignment: .leading, spacing: Spacing.md) {
                        Text("Add Partners")
                            .font(.titleMedium)
                            .foregroundColor(.textPrimary)

                        HStack {
                            TextField("Partner's email address", text: $partnerEmail)
                                .textContentType(.emailAddress)
                                .keyboardType(.emailAddress)
                                .autocapitalization(.none)
                                .focused($isEmailFocused)
                                .padding(Spacing.md)
                                .background(Color.backgroundSecondary)
                                .cornerRadius(CornerRadius.md)
                                .submitLabel(.done)
                                .onSubmit {
                                    addPartner()
                                }

                            Button(action: addPartner) {
                                Image(systemName: "plus.circle.fill")
                                    .font(.system(size: IconSize.lg))
                                    .foregroundColor(.primaryColor)
                            }
                            .disabled(!isValidEmail)
                        }

                        if !isValidEmail && !partnerEmail.isEmpty {
                            Text("Please enter a valid email address")
                                .font(.labelSmall)
                                .foregroundColor(.errorColor)
                        }
                    }

                    // Partners List
                    if !partners.isEmpty {
                        VStack(alignment: .leading, spacing: Spacing.md) {
                            Text("Partners (\(partners.count))")
                                .font(.titleMedium)
                                .foregroundColor(.textPrimary)

                            VStack(spacing: Spacing.sm) {
                                ForEach(Array(partners.enumerated()), id: \.element) { index, partner in
                                    PartnerRow(
                                        email: partner,
                                        index: index + 1
                                    ) {
                                        removePartner(partner)
                                    }
                                }
                            }
                        }
                    }

                    // Skip Message
                    if partners.isEmpty {
                        VStack(spacing: Spacing.sm) {
                            Text("You can add partners later")
                                .font(.bodySmall)
                                .foregroundColor(.textTertiary)
                                .multilineTextAlignment(.center)

                            Button(action: { showSkipAlert = true }) {
                                Text("Skip for now")
                                    .font(.labelMedium)
                                    .foregroundColor(.primaryColor)
                            }
                        }
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, Spacing.lg)
                    }
                }
                .padding(.horizontal, Spacing.lg)
            }

            // Action Buttons
            VStack(spacing: Spacing.md) {
                if !partners.isEmpty {
                    GTSDButton(
                        "Continue",
                        style: .primary
                    ) {
                        saveData()
                        onNext()
                    }
                }

                if partners.isEmpty {
                    GTSDButton(
                        "Skip This Step",
                        style: .secondary
                    ) {
                        onNext()
                    }
                }
            }
            .padding(.horizontal, Spacing.lg)
            .padding(.bottom, Spacing.lg)
        }
        .alert("Skip Partner Setup?", isPresented: $showSkipAlert) {
            Button("Go Back", role: .cancel) {}
            Button("Skip") {
                onNext()
            }
        } message: {
            Text("You can always add accountability partners later in your profile settings.")
        }
    }

    // MARK: - Computed Properties

    private var isValidEmail: Bool {
        partnerEmail.isValidEmail
    }

    // MARK: - Actions

    private func addPartner() {
        let trimmed = partnerEmail.trimmingCharacters(in: .whitespaces)

        guard trimmed.isValidEmail else { return }

        // Check for duplicates
        guard !partners.contains(where: { $0.lowercased() == trimmed.lowercased() }) else {
            return
        }

        partners.append(trimmed)
        partnerEmail = ""
        isEmailFocused = false
    }

    private func removePartner(_ partner: String) {
        partners.removeAll { $0 == partner }
    }

    private func saveData() {
        // Save partners to onboarding data
        // Note: This would need to be handled through an API call
        // to invite partners after onboarding completes
    }
}

// MARK: - Benefit Row

struct BenefitRow: View {
    let icon: String
    let title: String
    let description: String

    var body: some View {
        HStack(alignment: .top, spacing: Spacing.md) {
            Image(systemName: icon)
                .font(.system(size: IconSize.md))
                .foregroundColor(.primaryColor)
                .frame(width: IconSize.lg)

            VStack(alignment: .leading, spacing: Spacing.xs) {
                Text(title)
                    .font(.titleSmall)
                    .foregroundColor(.textPrimary)

                Text(description)
                    .font(.bodySmall)
                    .foregroundColor(.textSecondary)
            }
        }
    }
}

// MARK: - Partner Row

struct PartnerRow: View {
    let email: String
    let index: Int
    let onRemove: () -> Void

    var body: some View {
        HStack {
            HStack(spacing: Spacing.md) {
                ZStack {
                    Circle()
                        .fill(Color.primaryColor.gradient)
                        .frame(width: 40, height: 40)

                    Text("\(index)")
                        .font(.titleSmall)
                        .foregroundColor(.white)
                }

                VStack(alignment: .leading, spacing: Spacing.xs) {
                    Text(email)
                        .font(.bodyMedium)
                        .foregroundColor(.textPrimary)

                    Text("Invitation pending")
                        .font(.labelSmall)
                        .foregroundColor(.textTertiary)
                }
            }

            Spacer()

            Button(action: onRemove) {
                Image(systemName: "xmark.circle.fill")
                    .font(.system(size: IconSize.md))
                    .foregroundColor(.errorColor)
            }
        }
        .padding(Spacing.md)
        .background(Color.backgroundSecondary)
        .cornerRadius(CornerRadius.md)
    }
}

// MARK: - Preview

#Preview {
    PartnersView(
        onboardingData: .constant(OnboardingData()),
        onNext: {}
    )
}
