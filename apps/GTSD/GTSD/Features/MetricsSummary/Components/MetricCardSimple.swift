//
//  MetricCardSimple.swift
//  GTSD
//
//  Created by Claude on 2025-10-29.
//

import SwiftUI

/// Simple card component for displaying health metrics without expand/collapse functionality
struct MetricCardSimple: View {
    let icon: String
    let title: String
    let value: String
    let explanation: String
    let color: Color

    var body: some View {
        GTSDCard(padding: Spacing.md) {
            HStack(alignment: .top, spacing: Spacing.md) {
                // Icon
                Image(systemName: icon)
                    .font(.system(size: IconSize.lg))
                    .foregroundColor(color)
                    .frame(width: IconSize.xl, height: IconSize.xl)
                    .background(color.opacity(0.15))
                    .clipShape(Circle())
                    .accessibilityHidden(true)

                VStack(alignment: .leading, spacing: Spacing.sm) {
                    // Title
                    Text(title)
                        .font(.titleMedium)
                        .foregroundColor(.textPrimary)

                    // Value
                    Text(value)
                        .font(.headlineMedium)
                        .fontWeight(.bold)
                        .foregroundColor(color)

                    // Explanation
                    Text(explanation)
                        .font(.bodyMedium)
                        .foregroundColor(.textSecondary)
                        .fixedSize(horizontal: false, vertical: true)
                }

                Spacer(minLength: 0)
            }
        }
        .accessibilityElement(children: .combine)
        .accessibilityLabel("\(title): \(value)")
        .accessibilityValue(explanation)
    }
}

// MARK: - Preview

#Preview {
    VStack(spacing: Spacing.md) {
        MetricCardSimple(
            icon: "scalemass.fill",
            title: "BMI (Body Mass Index)",
            value: "24.5",
            explanation: "Your BMI of 24.5 is in the normal range (18.5-24.9), which indicates a healthy weight for your height.",
            color: .infoColor
        )

        MetricCardSimple(
            icon: "flame.fill",
            title: "BMR (Basal Metabolic Rate)",
            value: "1,650 cal/day",
            explanation: "Your body burns approximately 1,650 calories per day at rest. This is the minimum energy needed for basic functions.",
            color: .warningColor
        )

        MetricCardSimple(
            icon: "bolt.heart.fill",
            title: "TDEE (Total Daily Energy)",
            value: "2,310 cal/day",
            explanation: "Based on your activity level, you burn approximately 2,310 calories per day in total. This includes your BMR plus activity.",
            color: .successColor
        )
    }
    .padding()
    .background(Color.backgroundSecondary)
}
