//
//  AccountBasicsView.swift
//  GTSD
//
//  Created by Claude on 2025-10-27.
//

import SwiftUI

struct AccountBasicsView: View {
    @Binding var onboardingData: OnboardingData
    let onNext: () -> Void

    @State private var name: String = ""
    @State private var dateOfBirth: Date = Calendar.current.date(byAdding: .year, value: -25, to: Date()) ?? Date()
    @FocusState private var focusedField: Field?
    @EnvironmentObject private var authService: AuthenticationService

    enum Field {
        case name
    }

    var body: some View {
        VStack(spacing: Spacing.xl) {
            // Header
            VStack(spacing: Spacing.md) {
                Image(systemName: "person.circle.fill")
                    .font(.system(size: IconSize.xxl))
                    .foregroundColor(.primaryColor)

                Text("Account Basics")
                    .font(.headlineMedium)
                    .foregroundColor(.textPrimary)

                Text("Tell us a bit about yourself")
                    .font(.bodyMedium)
                    .foregroundColor(.textSecondary)
                    .multilineTextAlignment(.center)
            }
            .padding(.top, Spacing.xl)

            // Form
            VStack(alignment: .leading, spacing: Spacing.lg) {
                // Name Field
                VStack(alignment: .leading, spacing: Spacing.xs) {
                    Text("Full Name")
                        .font(.labelMedium)
                        .foregroundColor(.textSecondary)

                    TextField("Enter your name", text: $name)
                        .textContentType(.name)
                        .autocapitalization(.words)
                        .focused($focusedField, equals: .name)
                        .padding(Spacing.md)
                        .background(Color.backgroundSecondary)
                        .cornerRadius(CornerRadius.md)
                }

                // Date of Birth
                VStack(alignment: .leading, spacing: Spacing.xs) {
                    Text("Date of Birth")
                        .font(.labelMedium)
                        .foregroundColor(.textSecondary)

                    DatePicker(
                        "Date of Birth",
                        selection: $dateOfBirth,
                        in: ...Date(),
                        displayedComponents: .date
                    )
                    .datePickerStyle(.compact)
                    .labelsHidden()
                    .padding(Spacing.md)
                    .background(Color.backgroundSecondary)
                    .cornerRadius(CornerRadius.md)
                }

                // Age Display
                if let age = calculateAge() {
                    Text("Age: \(age) years")
                        .font(.bodySmall)
                        .foregroundColor(.textTertiary)
                        .padding(.leading, Spacing.sm)
                }
            }
            .padding(.horizontal, Spacing.lg)

            Spacer()

            // Next Button
            GTSDButton(
                "Continue",
                style: .primary,
                isDisabled: !isValid
            ) {
                saveData()
                onNext()
            }
            .padding(.horizontal, Spacing.lg)
            .padding(.bottom, Spacing.lg)
        }
        .onAppear {
            loadData()
        }
    }

    // MARK: - Helpers

    private var isValid: Bool {
        !name.trimmingCharacters(in: .whitespaces).isEmpty
    }

    private func calculateAge() -> Int? {
        let calendar = Calendar.current
        let ageComponents = calendar.dateComponents([.year], from: dateOfBirth, to: Date())
        return ageComponents.year
    }

    private func loadData() {
        // Load name from current user
        if let currentUser = authService.currentUser {
            name = currentUser.name
        }

        // Load existing data if available
        if let dob = onboardingData.dateOfBirth {
            dateOfBirth = dob
        }
    }

    private func saveData() {
        // Save dateOfBirth to onboarding data
        onboardingData.dateOfBirth = dateOfBirth

        // Note: Name is typically handled in the signup flow
        // but we could add it to a separate profile update
    }
}

// MARK: - Preview

#Preview {
    AccountBasicsView(
        onboardingData: .constant(OnboardingData()),
        onNext: {}
    )
}
