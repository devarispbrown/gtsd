//
//  MetricCard.swift
//  GTSD
//
//  Created by Claude on 2025-10-28.
//

import SwiftUI

/// Reusable card component for displaying health metrics
struct MetricCard: View {
    let icon: String
    let iconColor: Color
    let title: String
    let value: String
    let unit: String?
    let explanation: String
    let isExpanded: Bool
    let onToggle: () -> Void

    var body: some View {
        GTSDCard(padding: Spacing.md) {
            VStack(alignment: .leading, spacing: Spacing.md) {
                // Header with icon and title
                HStack(spacing: Spacing.sm) {
                    Image(systemName: icon)
                        .font(.system(size: IconSize.lg))
                        .foregroundColor(iconColor)
                        .frame(width: IconSize.xl, height: IconSize.xl)
                        .background(iconColor.opacity(0.1))
                        .clipShape(Circle())

                    VStack(alignment: .leading, spacing: Spacing.xs) {
                        Text(title)
                            .font(.titleMedium)
                            .foregroundColor(.textPrimary)

                        if let unit = unit {
                            Text(unit)
                                .font(.bodySmall)
                                .foregroundColor(.textSecondary)
                        }
                    }

                    Spacer()
                }
                .accessibilityElement(children: .combine)

                // Value display
                HStack(alignment: .lastTextBaseline, spacing: Spacing.xs) {
                    Text(value)
                        .font(.displaySmall)
                        .fontWeight(.bold)
                        .foregroundColor(.primaryColor)

                    if let unit = unit {
                        Text(unit)
                            .font(.titleMedium)
                            .foregroundColor(.textSecondary)
                    }
                }
                .accessibilityElement(children: .combine)
                .accessibilityLabel("\(title): \(value) \(unit ?? "")")

                Divider()

                // Brief explanation (always visible)
                Text(explanation)
                    .font(.bodyMedium)
                    .foregroundColor(.textSecondary)
                    .fixedSize(horizontal: false, vertical: true)

                // Learn More button
                Button(action: {
                    withAnimation(.springy) {
                        onToggle()
                    }
                }) {
                    HStack(spacing: Spacing.xs) {
                        Image(systemName: isExpanded ? "chevron.up.circle.fill" : "info.circle.fill")
                            .font(.system(size: IconSize.sm))
                        Text(isExpanded ? "Show Less" : "Learn More")
                            .font(.labelMedium)
                    }
                    .foregroundColor(.primaryColor)
                    .padding(.vertical, Spacing.xs)
                }
                .accessibilityLabel(isExpanded ? "Hide detailed explanation" : "Show detailed explanation")
                .accessibilityHint("Double tap to \(isExpanded ? "collapse" : "expand") additional information")
                .accessibilityAddTraits(.isButton)
            }
        }
        .accessibilityElement(children: .contain)
    }
}

// MARK: - Preview

#Preview {
    VStack(spacing: Spacing.md) {
        MetricCard(
            icon: "heart.text.square.fill",
            iconColor: .infoColor,
            title: "BMI",
            value: "24.5",
            unit: nil,
            explanation: "Your BMI of 24.5 is in the normal range (18.5-24.9).",
            isExpanded: false,
            onToggle: {}
        )

        MetricCard(
            icon: "flame.fill",
            iconColor: .warningColor,
            title: "BMR",
            value: "1,650",
            unit: "cal/day",
            explanation: "Your Basal Metabolic Rate is the energy your body needs at rest.",
            isExpanded: true,
            onToggle: {}
        )
    }
    .padding()
    .background(Color.backgroundSecondary)
}
