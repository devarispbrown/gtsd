//
//  MetricsAcknowledgmentCard.swift
//  GTSD
//
//  Created by Claude on 2025-10-29.
//

import SwiftUI

/// Card shown on home screen when user needs to acknowledge their health metrics
struct MetricsAcknowledgmentCard: View {
    let metricsSummary: MetricsSummaryData?
    let isLoading: Bool
    let error: String?
    let onNavigateToPlans: () -> Void
    let onDismiss: (() -> Void)?

    var body: some View {
        GTSDCard(padding: Spacing.md) {
            VStack(spacing: Spacing.md) {
                // Icon and Header
                HStack(spacing: Spacing.md) {
                    Image(systemName: "heart.text.square.fill")
                        .font(.system(size: 50))
                        .foregroundColor(.red)
                        .accessibilityHidden(true)

                    VStack(alignment: .leading, spacing: Spacing.xs) {
                        Text("Your Health Metrics Are Ready!")
                            .font(.headlineSmall)
                            .fontWeight(.bold)
                            .foregroundColor(.textPrimary)

                        Text("Review your personalized metrics")
                            .font(.bodySmall)
                            .foregroundColor(.textSecondary)
                    }

                    Spacer()
                }

                // Show different content based on state
                if isLoading {
                    loadingContent
                } else if let error = error {
                    errorContent(error)
                } else if let summary = metricsSummary {
                    metricsPreview(summary)
                } else {
                    defaultContent
                }

                // CTA Button
                GTSDButton(
                    "View Your Plan",
                    style: .primary,
                    isLoading: isLoading
                ) {
                    onNavigateToPlans()
                }
                .accessibilityLabel("View your nutrition plan")
                .accessibilityHint("Navigate to Plans tab to review and acknowledge your health metrics")

                // Optional dismiss button
                if let onDismiss = onDismiss {
                    Button(action: onDismiss) {
                        Text("Remind Me Later")
                            .font(.bodySmall)
                            .foregroundColor(.textTertiary)
                    }
                    .accessibilityLabel("Dismiss metrics reminder")
                    .accessibilityHint("Hide this card temporarily")
                }
            }
        }
        .accessibilityElement(children: .contain)
        .accessibilityLabel("Health metrics acknowledgment")
    }

    // MARK: - Content States

    private var loadingContent: some View {
        HStack(spacing: Spacing.sm) {
            ProgressView()
                .scaleEffect(0.8)

            Text("Loading your metrics...")
                .font(.bodySmall)
                .foregroundColor(.textSecondary)
        }
        .padding(.vertical, Spacing.sm)
    }

    private func errorContent(_ error: String) -> some View {
        HStack(spacing: Spacing.sm) {
            Image(systemName: "exclamationmark.triangle.fill")
                .font(.system(size: IconSize.sm))
                .foregroundColor(.orange)

            Text(error)
                .font(.bodySmall)
                .foregroundColor(.textSecondary)
                .lineLimit(2)
        }
        .padding(.vertical, Spacing.xs)
    }

    private func metricsPreview(_ summary: MetricsSummaryData) -> some View {
        VStack(spacing: Spacing.sm) {
            // Quick metrics preview
            HStack(spacing: Spacing.md) {
                metricBadge(
                    icon: "scalemass.fill",
                    label: "BMI",
                    value: String(format: "%.1f", summary.metrics.bmi),
                    color: .blue
                )

                metricBadge(
                    icon: "flame.fill",
                    label: "BMR",
                    value: "\(summary.metrics.bmr)",
                    color: .orange
                )

                metricBadge(
                    icon: "bolt.heart.fill",
                    label: "TDEE",
                    value: "\(summary.metrics.tdee)",
                    color: .green
                )
            }

            Divider()
                .padding(.vertical, Spacing.xs)

            // Message
            Text("These metrics power your personalized nutrition plan. Tap below to review and confirm.")
                .font(.bodySmall)
                .foregroundColor(.textSecondary)
                .multilineTextAlignment(.center)
        }
    }

    private var defaultContent: some View {
        VStack(spacing: Spacing.sm) {
            Text("We've calculated your BMI, BMR, and TDEE based on your health profile.")
                .font(.bodySmall)
                .foregroundColor(.textSecondary)
                .multilineTextAlignment(.center)

            // Benefits
            HStack(spacing: Spacing.lg) {
                benefitIcon(icon: "checkmark.circle.fill", text: "Science-based")
                benefitIcon(icon: "chart.bar.fill", text: "Personalized")
                benefitIcon(icon: "heart.fill", text: "Safe")
            }
            .padding(.vertical, Spacing.xs)
        }
    }

    // MARK: - Helper Views

    private func metricBadge(icon: String, label: String, value: String, color: Color) -> some View {
        VStack(spacing: Spacing.xs) {
            Image(systemName: icon)
                .font(.system(size: IconSize.sm))
                .foregroundColor(color)
                .accessibilityHidden(true)

            Text(value)
                .font(.titleSmall)
                .fontWeight(.bold)
                .foregroundColor(.textPrimary)

            Text(label)
                .font(.caption2)
                .foregroundColor(.textSecondary)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, Spacing.xs)
        .background(color.opacity(0.1))
        .cornerRadius(CornerRadius.sm)
        .accessibilityElement(children: .combine)
        .accessibilityLabel("\(label): \(value)")
    }

    private func benefitIcon(icon: String, text: String) -> some View {
        VStack(spacing: Spacing.xs) {
            Image(systemName: icon)
                .font(.system(size: IconSize.sm))
                .foregroundColor(.primaryColor)
                .accessibilityHidden(true)

            Text(text)
                .font(.caption2)
                .foregroundColor(.textSecondary)
        }
    }
}

// MARK: - Preview

#Preview("With Metrics") {
    ScrollView {
        VStack(spacing: Spacing.lg) {
            MetricsAcknowledgmentCard(
                metricsSummary: MetricsSummaryData(
                    metrics: HealthMetrics(
                        bmi: 24.5,
                        bmr: 1800,
                        tdee: 2400,
                        computedAt: Date(),
                        version: 1
                    ),
                    explanations: MetricsExplanations(
                        bmi: "Your BMI is in the normal range",
                        bmr: "Your body burns 1800 calories at rest",
                        tdee: "You burn 2400 calories per day"
                    ),
                    acknowledged: false,
                    acknowledgement: nil
                ),
                isLoading: false,
                error: nil,
                onNavigateToPlans: {},
                onDismiss: {}
            )

            Text("Other Home Content")
                .font(.headline)
                .padding()
        }
        .padding()
    }
}

#Preview("Loading") {
    ScrollView {
        MetricsAcknowledgmentCard(
            metricsSummary: nil,
            isLoading: true,
            error: nil,
            onNavigateToPlans: {},
            onDismiss: nil
        )
        .padding()
    }
}

#Preview("Error") {
    ScrollView {
        MetricsAcknowledgmentCard(
            metricsSummary: nil,
            isLoading: false,
            error: "Unable to load metrics. Please try again.",
            onNavigateToPlans: {},
            onDismiss: {}
        )
        .padding()
    }
}

#Preview("Default") {
    ScrollView {
        MetricsAcknowledgmentCard(
            metricsSummary: nil,
            isLoading: false,
            error: nil,
            onNavigateToPlans: {},
            onDismiss: {}
        )
        .padding()
    }
}
