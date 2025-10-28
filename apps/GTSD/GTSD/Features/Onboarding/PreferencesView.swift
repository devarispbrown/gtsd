//
//  PreferencesView.swift
//  GTSD
//
//  Created by Claude on 2025-10-27.
//

import SwiftUI

struct PreferencesView: View {
    @Binding var onboardingData: OnboardingData
    let onNext: () -> Void

    @State private var dietaryPreference: String = ""
    @State private var mealsPerDay: Double = 3
    @State private var allergies: [String] = []
    @State private var newAllergy: String = ""
    @FocusState private var focusedField: Field?

    enum Field {
        case dietary, allergy
    }

    // Common dietary preferences
    private let commonDietaryPreferences = [
        "No restrictions",
        "Vegetarian",
        "Vegan",
        "Pescatarian",
        "Keto",
        "Paleo",
        "Gluten-Free",
        "Dairy-Free"
    ]

    var body: some View {
        VStack(spacing: Spacing.lg) {
            // Header
            VStack(spacing: Spacing.md) {
                Image(systemName: "fork.knife")
                    .font(.system(size: IconSize.xxl))
                    .foregroundColor(.primaryColor)

                Text("Dietary Preferences")
                    .font(.headlineMedium)
                    .foregroundColor(.textPrimary)

                Text("Help us personalize your meal recommendations")
                    .font(.bodyMedium)
                    .foregroundColor(.textSecondary)
                    .multilineTextAlignment(.center)
            }
            .padding(.top, Spacing.xl)
            .padding(.horizontal, Spacing.lg)

            ScrollView {
                VStack(alignment: .leading, spacing: Spacing.lg) {
                    // Dietary Preference Selection
                    VStack(alignment: .leading, spacing: Spacing.sm) {
                        Text("Dietary Preference")
                            .font(.labelMedium)
                            .foregroundColor(.textSecondary)

                        VStack(spacing: Spacing.xs) {
                            ForEach(commonDietaryPreferences, id: \.self) { preference in
                                DietaryPreferenceButton(
                                    title: preference,
                                    isSelected: dietaryPreference == preference
                                ) {
                                    dietaryPreference = preference
                                }
                            }
                        }

                        // Custom dietary preference
                        TextField("Custom preference", text: $dietaryPreference)
                            .focused($focusedField, equals: .dietary)
                            .padding(Spacing.md)
                            .background(Color.backgroundSecondary)
                            .cornerRadius(CornerRadius.md)
                    }

                    // Meals Per Day
                    VStack(alignment: .leading, spacing: Spacing.sm) {
                        Text("Meals Per Day")
                            .font(.labelMedium)
                            .foregroundColor(.textSecondary)

                        VStack(spacing: Spacing.sm) {
                            HStack {
                                Text("1")
                                    .font(.bodySmall)
                                    .foregroundColor(.textTertiary)
                                Spacer()
                                Text("10")
                                    .font(.bodySmall)
                                    .foregroundColor(.textTertiary)
                            }

                            Slider(value: $mealsPerDay, in: 1...10, step: 1)
                                .tint(.primaryColor)

                            Text("\(Int(mealsPerDay)) meals per day")
                                .font(.bodyMedium)
                                .foregroundColor(.textPrimary)
                                .frame(maxWidth: .infinity, alignment: .center)
                                .padding(.vertical, Spacing.sm)
                                .background(Color.primaryColor.opacity(0.1))
                                .cornerRadius(CornerRadius.sm)
                        }
                        .padding(Spacing.md)
                        .background(Color.backgroundSecondary)
                        .cornerRadius(CornerRadius.md)
                    }

                    // Allergies
                    VStack(alignment: .leading, spacing: Spacing.sm) {
                        Text("Food Allergies")
                            .font(.labelMedium)
                            .foregroundColor(.textSecondary)

                        // Allergy input
                        HStack {
                            TextField("Add allergy", text: $newAllergy)
                                .focused($focusedField, equals: .allergy)
                                .padding(Spacing.md)
                                .background(Color.backgroundSecondary)
                                .cornerRadius(CornerRadius.md)

                            Button(action: addAllergy) {
                                Image(systemName: "plus.circle.fill")
                                    .font(.system(size: IconSize.lg))
                                    .foregroundColor(.primaryColor)
                            }
                            .disabled(newAllergy.isEmpty)
                        }

                        // Allergy chips
                        if !allergies.isEmpty {
                            FlowLayout(spacing: Spacing.sm) {
                                ForEach(allergies, id: \.self) { allergy in
                                    AllergyChip(allergy: allergy) {
                                        removeAllergy(allergy)
                                    }
                                }
                            }
                            .padding(.top, Spacing.sm)
                        }
                    }
                }
                .padding(.horizontal, Spacing.lg)
            }

            // Next Button
            GTSDButton(
                "Continue",
                style: .primary,
                isDisabled: dietaryPreference.isEmpty
            ) {
                saveData()
                onNext()
            }
            .padding(.horizontal, Spacing.lg)
            .padding(.bottom, Spacing.lg)
        }
    }

    // MARK: - Helpers

    private func addAllergy() {
        let trimmed = newAllergy.trimmingCharacters(in: .whitespaces)
        if !trimmed.isEmpty && !allergies.contains(trimmed) {
            allergies.append(trimmed)
            newAllergy = ""
        }
    }

    private func removeAllergy(_ allergy: String) {
        allergies.removeAll { $0 == allergy }
    }

    private func saveData() {
        // Save to onboarding data
        // Note: These fields would need to be added to OnboardingData
        // For now, we're just storing them locally
    }
}

// MARK: - Dietary Preference Button

struct DietaryPreferenceButton: View {
    let title: String
    let isSelected: Bool
    let onTap: () -> Void

    var body: some View {
        Button(action: onTap) {
            HStack {
                Text(title)
                    .font(.bodyMedium)
                    .foregroundColor(isSelected ? .primaryColor : .textPrimary)

                Spacer()

                if isSelected {
                    Image(systemName: "checkmark")
                        .font(.system(size: IconSize.sm))
                        .foregroundColor(.primaryColor)
                }
            }
            .padding(Spacing.md)
            .background(
                isSelected ? Color.primaryColor.opacity(0.1) : Color.backgroundSecondary
            )
            .cornerRadius(CornerRadius.sm)
        }
        .buttonStyle(PlainButtonStyle())
    }
}

// MARK: - Allergy Chip

struct AllergyChip: View {
    let allergy: String
    let onRemove: () -> Void

    var body: some View {
        HStack(spacing: Spacing.xs) {
            Text(allergy)
                .font(.labelMedium)
                .foregroundColor(.textPrimary)

            Button(action: onRemove) {
                Image(systemName: "xmark.circle.fill")
                    .font(.system(size: IconSize.sm))
                    .foregroundColor(.textSecondary)
            }
        }
        .padding(.horizontal, Spacing.md)
        .padding(.vertical, Spacing.sm)
        .background(Color.backgroundSecondary)
        .cornerRadius(CornerRadius.full)
    }
}

// MARK: - Flow Layout

struct FlowLayout: Layout {
    var spacing: CGFloat = 8

    func sizeThatFits(proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) -> CGSize {
        let rows = arrangeRows(proposal: proposal, subviews: subviews)
        return rows.size
    }

    func placeSubviews(in bounds: CGRect, proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) {
        let rows = arrangeRows(proposal: proposal, subviews: subviews)
        var y = bounds.minY

        for row in rows.rows {
            var x = bounds.minX

            for index in row {
                let subview = subviews[index]
                let size = subview.sizeThatFits(.unspecified)

                subview.place(
                    at: CGPoint(x: x, y: y),
                    proposal: ProposedViewSize(size)
                )

                x += size.width + spacing
            }

            y += rows.rowHeight + spacing
        }
    }

    private func arrangeRows(proposal: ProposedViewSize, subviews: Subviews) -> (rows: [[Int]], size: CGSize, rowHeight: CGFloat) {
        var rows: [[Int]] = [[]]
        var currentRow = 0
        var x: CGFloat = 0
        var maxHeight: CGFloat = 0
        let maxWidth = proposal.width ?? .infinity

        for (index, subview) in subviews.enumerated() {
            let size = subview.sizeThatFits(.unspecified)

            if x + size.width > maxWidth && !rows[currentRow].isEmpty {
                rows.append([])
                currentRow += 1
                x = 0
            }

            rows[currentRow].append(index)
            x += size.width + spacing
            maxHeight = max(maxHeight, size.height)
        }

        let totalHeight = CGFloat(rows.count) * maxHeight + CGFloat(max(0, rows.count - 1)) * spacing

        return (rows, CGSize(width: maxWidth, height: totalHeight), maxHeight)
    }
}

// MARK: - Preview

#Preview {
    PreferencesView(
        onboardingData: .constant(OnboardingData()),
        onNext: {}
    )
}
