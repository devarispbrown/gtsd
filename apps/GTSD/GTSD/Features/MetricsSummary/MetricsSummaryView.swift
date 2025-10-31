//
//  MetricsSummaryView.swift
//  GTSD
//
//  Created by Claude on 2025-10-28.
//

import SwiftUI

/// Post-onboarding health metrics summary screen
/// Shows BMI, BMR, and TDEE with explanations and requires acknowledgement
struct MetricsSummaryView: View {
    @StateObject private var viewModel: MetricsSummaryViewModel
    @Environment(\.dismiss) private var dismiss

    let onComplete: () -> Void

    // MARK: - Initialization

    init(
        viewModel: MetricsSummaryViewModel? = nil,
        onComplete: @escaping () -> Void
    ) {
        _viewModel = StateObject(wrappedValue: viewModel ?? MetricsSummaryViewModel())
        self.onComplete = onComplete
    }

    // MARK: - Body

    var body: some View {
        NavigationStack {
            ZStack {
                if viewModel.isLoadingState {
                    // Loading state
                    loadingView
                } else if let error = viewModel.error {
                    // Error state
                    MetricsErrorState(
                        error: error.localizedDescription,
                        retryAction: {
                            Task {
                                await viewModel.retry()
                            }
                        }
                    )
                } else if let metricsData = viewModel.metricsData {
                    // Content view
                    contentView(metricsData: metricsData)
                } else {
                    // Empty state (should not happen if properly implemented)
                    MetricsEmptyState(
                        message: "Complete your profile to see your personalized health metrics",
                        actionTitle: "Retry",
                        action: {
                            Task {
                                await viewModel.fetchMetrics()
                            }
                        }
                    )
                }
            }
            .navigationTitle("Your Health Metrics")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button(action: {
                        // Allow dismissing only if already acknowledged
                        if viewModel.acknowledged {
                            onComplete()
                            dismiss()
                        }
                    }) {
                        Image(systemName: "xmark")
                            .foregroundColor(.textSecondary)
                    }
                    .disabled(!viewModel.acknowledged)
                    .accessibilityLabel("Close")
                    .accessibilityHint(viewModel.acknowledged ? "Dismiss metrics summary" : "Complete acknowledgement before closing")
                }
            }
        }
        .task {
            // Fetch metrics on appear
            await viewModel.fetchMetrics()

            // Start background refresh
            viewModel.startBackgroundRefresh()
        }
        .onDisappear {
            viewModel.stopBackgroundRefresh()
        }
        .interactiveDismissDisabled(!viewModel.acknowledged)
    }

    // MARK: - Loading View

    private var loadingView: some View {
        VStack(spacing: Spacing.lg) {
            ProgressView()
                .scaleEffect(1.5)
                .tint(.primaryColor)

            Text("Loading your metrics...")
                .font(.bodyMedium)
                .foregroundColor(.textSecondary)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(Color.backgroundSecondary.opacity(0.3))
        .accessibilityElement(children: .combine)
        .accessibilityLabel("Loading your health metrics")
    }

    // MARK: - Content View

    private func contentView(metricsData: MetricsSummaryData) -> some View {
        ScrollView {
            VStack(spacing: Spacing.lg) {
                // Header section
                headerSection

                // BMI Card
                bmiCard(metrics: metricsData.metrics, explanations: metricsData.explanations)
                    .padding(.horizontal, Spacing.xl)

                // BMR Card
                bmrCard(metrics: metricsData.metrics, explanations: metricsData.explanations)
                    .padding(.horizontal, Spacing.xl)

                // TDEE Card
                tdeeCard(metrics: metricsData.metrics, explanations: metricsData.explanations)
                    .padding(.horizontal, Spacing.xl)

                // Info card
                infoCard
                    .padding(.horizontal, Spacing.xl)

                // Acknowledge button
                AcknowledgeButton(
                    isLoading: viewModel.isLoading,
                    isDisabled: !viewModel.canAcknowledge
                ) {
                    Task {
                        let success = await viewModel.acknowledgeAndContinue()
                        if success {
                            // Haptic feedback
                            let impactFeedback = UIImpactFeedbackGenerator(style: .medium)
                            impactFeedback.impactOccurred()

                            // Delay slightly for UX feedback
                            try? await Task.sleep(nanoseconds: 300_000_000) // 0.3 seconds

                            onComplete()
                            dismiss()
                        }
                    }
                }
                .padding(.horizontal, Spacing.xl)
                .padding(.top, Spacing.md)
                .padding(.bottom, Spacing.xxl)

                // Acknowledged indicator (if already acknowledged)
                if metricsData.acknowledged {
                    acknowledgedIndicator
                        .padding(.horizontal, Spacing.xl)
                }
            }
            .padding(.top, Spacing.md)
        }
        .background(Color.backgroundSecondary.opacity(0.3))
    }

    // MARK: - Header Section

    private var headerSection: some View {
        VStack(alignment: .leading, spacing: Spacing.sm) {
            Text("Review Your Metrics")
                .font(.headlineMedium)
                .foregroundColor(.textPrimary)

            Text("These metrics are calculated based on your profile. Please review them before continuing.")
                .font(.bodyMedium)
                .foregroundColor(.textSecondary)
                .fixedSize(horizontal: false, vertical: true)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(.horizontal, Spacing.xl)
        .accessibilityElement(children: .combine)
    }

    // MARK: - BMI Card

    private func bmiCard(metrics: HealthMetrics, explanations: MetricsExplanations) -> some View {
        VStack(alignment: .leading, spacing: 0) {
            MetricCard(
                icon: "heart.text.square.fill",
                iconColor: .infoColor,
                title: "Body Mass Index (BMI)",
                value: metrics.bmiFormatted,
                unit: nil,
                explanation: explanations.bmi,
                isExpanded: viewModel.isMetricExpanded("bmi"),
                onToggle: {
                    viewModel.toggleMetric("bmi")
                }
            )

            // Expandable detailed explanation
            if viewModel.isMetricExpanded("bmi") {
                GTSDCard(padding: Spacing.md) {
                    ExpandableSection(
                        title: "What is BMI?",
                        content: "BMI is a measure of body fat based on height and weight. A normal BMI is between 18.5 and 24.9. Your category: \(metrics.bmiCategory).",
                        isExpanded: true
                    )
                }
                .padding(.horizontal, Spacing.xl)
                .padding(.top, -Spacing.sm)
            }
        }
    }

    // MARK: - BMR Card

    private func bmrCard(metrics: HealthMetrics, explanations: MetricsExplanations) -> some View {
        VStack(alignment: .leading, spacing: 0) {
            MetricCard(
                icon: "flame.fill",
                iconColor: .warningColor,
                title: "Basal Metabolic Rate (BMR)",
                value: "\(metrics.bmr)",
                unit: "cal/day",
                explanation: explanations.bmr,
                isExpanded: viewModel.isMetricExpanded("bmr"),
                onToggle: {
                    viewModel.toggleMetric("bmr")
                }
            )

            // Expandable detailed explanation
            if viewModel.isMetricExpanded("bmr") {
                GTSDCard(padding: Spacing.md) {
                    ExpandableSection(
                        title: "Understanding BMR",
                        content: "Your BMR represents the minimum calories your body needs to maintain vital functions like breathing, circulation, and cell production while at rest. This is calculated using the Mifflin-St Jeor equation based on your age, gender, height, and weight.",
                        isExpanded: true
                    )
                }
                .padding(.horizontal, Spacing.xl)
                .padding(.top, -Spacing.sm)
            }
        }
    }

    // MARK: - TDEE Card

    private func tdeeCard(metrics: HealthMetrics, explanations: MetricsExplanations) -> some View {
        VStack(alignment: .leading, spacing: 0) {
            MetricCard(
                icon: "bolt.fill",
                iconColor: .yellow,
                title: "Total Daily Energy Expenditure (TDEE)",
                value: "\(metrics.tdee)",
                unit: "cal/day",
                explanation: explanations.tdee,
                isExpanded: viewModel.isMetricExpanded("tdee"),
                onToggle: {
                    viewModel.toggleMetric("tdee")
                }
            )

            // Expandable detailed explanation
            if viewModel.isMetricExpanded("tdee") {
                GTSDCard(padding: Spacing.md) {
                    ExpandableSection(
                        title: "What is TDEE?",
                        content: "TDEE is your total calorie burn per day, including your BMR plus calories burned through physical activity. This number is used to create your personalized calorie targets based on your goals.",
                        isExpanded: true
                    )
                }
                .padding(.horizontal, Spacing.xl)
                .padding(.top, -Spacing.sm)
            }
        }
    }

    // MARK: - Info Card

    private var infoCard: some View {
        GTSDCard(padding: Spacing.md) {
            HStack(alignment: .top, spacing: Spacing.md) {
                Image(systemName: "info.circle.fill")
                    .font(.system(size: IconSize.md))
                    .foregroundColor(.infoColor)
                    .accessibilityHidden(true)

                VStack(alignment: .leading, spacing: Spacing.xs) {
                    Text("Why These Metrics Matter")
                        .font(.labelMedium)
                        .fontWeight(.semibold)
                        .foregroundColor(.textPrimary)

                    Text("These metrics form the foundation of your personalized plan. They're calculated using scientifically-validated formulas and your unique profile data.")
                        .font(.bodySmall)
                        .foregroundColor(.textSecondary)
                        .fixedSize(horizontal: false, vertical: true)
                }
            }
        }
        .accessibilityElement(children: .combine)
    }

    // MARK: - Acknowledged Indicator

    private var acknowledgedIndicator: some View {
        HStack(spacing: Spacing.sm) {
            Image(systemName: "checkmark.seal.fill")
                .font(.system(size: IconSize.sm))
                .foregroundColor(.successColor)

            Text("Metrics Acknowledged")
                .font(.bodySmall)
                .foregroundColor(.textSecondary)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, Spacing.sm)
        .background(Color.successColor.opacity(0.1))
        .cornerRadius(CornerRadius.sm)
        .accessibilityElement(children: .combine)
        .accessibilityLabel("Metrics have been acknowledged")
    }
}

// MARK: - Preview

#Preview {
    MetricsSummaryView(
        viewModel: {
            let vm = MetricsSummaryViewModel(
                metricsService: MockMetricsService()
            )
            return vm
        }(),
        onComplete: {}
    )
}
