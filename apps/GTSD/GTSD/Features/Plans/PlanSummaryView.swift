//
//  PlanSummaryView.swift
//  GTSD
//
//  Created by Claude on 2025-10-27.
//

import SwiftUI

struct PlanSummaryView: View {
    @StateObject private var viewModel: PlanSummaryViewModel
    @ObservedObject private var metricsViewModel = MetricsViewModel.shared
    @State private var expandedSections: Set<String> = []
    @State private var showChangeAlert = false
    @State private var showErrorAlert = false

    init(apiClient: (any APIClientProtocol)? = nil) {
        let client = apiClient ?? ServiceContainer.shared.apiClient
        _viewModel = StateObject(wrappedValue: PlanSummaryViewModel(apiClient: client))
    }

    var body: some View {
        NavigationStack {
            ZStack {
                // Check if metrics need acknowledgment first - HIGHEST PRIORITY
                if metricsViewModel.needsAcknowledgment {
                    metricsAcknowledgmentView
                } else if viewModel.isLoading && viewModel.planData == nil {
                    ProgressView("Loading your plan...")
                        .progressViewStyle(.circular)
                } else if let planError = viewModel.planError, viewModel.planData == nil, !shouldShowAcknowledgmentForError(planError) {
                    // Only show error if it's not a metrics acknowledgment error
                    ErrorView(message: planError.localizedDescription, retryAction: {
                        _Concurrency.Task {
                            await viewModel.fetchPlanSummary()
                        }
                    })
                } else {
                    ScrollView {
                        VStack(spacing: Spacing.lg) {
                            // Recomputation Banner (if plan was recomputed)
                            if viewModel.hasSignificantChanges {
                                recomputationBanner
                            }

                            // Last Updated Info
                            if let timeSinceUpdate = viewModel.timeSinceUpdate {
                                lastUpdatedBanner(timeSinceUpdate: timeSinceUpdate)
                            }

                            // Header Section
                            headerSection

                            // Health Metrics Section
                            healthMetricsSection

                            // Daily Targets Section
                            dailyTargetsSection

                            // Why It Works Section
                            if let whyItWorks = viewModel.planData?.whyItWorks {
                                whyItWorksSection(whyItWorks: whyItWorks)
                            }

                            // Plan Details Section
                            if let plan = viewModel.planData?.plan {
                                planDetailsSection(plan: plan)
                            }

                            // Refresh Button
                            refreshButton
                                .padding(.bottom, Spacing.xl)
                        }
                        .padding(.top, Spacing.md)
                    }
                    .refreshable {
                        await viewModel.fetchPlanSummary()
                    }
                }
            }
            .navigationTitle("Your Plan")
            .navigationBarTitleDisplayMode(.large)
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button {
                        _Concurrency.Task {
                            await viewModel.refreshPlan()
                        }
                    } label: {
                        Image(systemName: "arrow.clockwise")
                            .foregroundColor(.primaryColor)
                    }
                    .disabled(viewModel.isLoading)
                    .accessibilityLabel("Refresh plan")
                    .accessibilityHint("Double tap to reload your nutrition plan from the server")
                    .minimumTouchTarget()
                }
            }
            .alert("Plan Updated", isPresented: $showChangeAlert) {
                Button("OK", role: .cancel) {
                    showChangeAlert = false
                }
            } message: {
                if let timelineChange = viewModel.formatTimelineChange() {
                    Text(timelineChange)
                }
            }
            .onChange(of: viewModel.planError) { _, newValue in
                showErrorAlert = (newValue != nil && viewModel.planData != nil)
            }
            .alert("Error", isPresented: $showErrorAlert) {
                Button("OK") {
                    viewModel.clearErrors()
                    showErrorAlert = false
                }
                if viewModel.planError?.isRetryable == true {
                    Button("Retry") {
                        _Concurrency.Task {
                            await viewModel.refreshPlan()
                        }
                        showErrorAlert = false
                    }
                }
            } message: {
                if let error = viewModel.planError {
                    Text(error.localizedDescription)
                }
            }
            .task {
                // CRITICAL: Check if metrics need acknowledgment FIRST
                // This must complete before attempting to fetch the plan
                await metricsViewModel.checkMetricsAcknowledgment()

                // Wait for metrics check to complete and update state
                // Only fetch plan if:
                // 1. We don't have plan data yet
                // 2. Metrics are acknowledged (needsAcknowledgment is false)
                if viewModel.planData == nil && !metricsViewModel.needsAcknowledgment {
                    await viewModel.fetchPlanSummary()
                }
            }
            .onChange(of: viewModel.planError) { oldError, newError in
                // If we get a metrics acknowledgment error, trigger metrics check
                if let error = newError, shouldShowAcknowledgmentForError(error) {
                    _Concurrency.Task {
                        // Clear the error and show acknowledgment UI instead
                        viewModel.clearErrors()
                        await metricsViewModel.checkMetricsAcknowledgment()
                    }
                }
            }
        }
    }

    // MARK: - Metrics Acknowledgment View

    private var metricsAcknowledgmentView: some View {
        ScrollView {
            VStack(spacing: Spacing.xl) {
                // Header
                VStack(spacing: Spacing.sm) {
                    Image(systemName: "heart.text.square.fill")
                        .font(.system(size: 60))
                        .foregroundColor(.primaryColor)
                        .padding(.top, Spacing.xl)

                    Text("Review Your Health Metrics")
                        .font(.headlineLarge)
                        .foregroundColor(.textPrimary)
                        .multilineTextAlignment(.center)

                    Text("Before we generate your personalized plan, please review your health metrics")
                        .font(.bodyMedium)
                        .foregroundColor(.textSecondary)
                        .multilineTextAlignment(.center)
                        .padding(.horizontal, Spacing.xl)
                }

                if metricsViewModel.isLoadingMetrics {
                    VStack(spacing: Spacing.md) {
                        ProgressView()
                            .scaleEffect(1.5)
                        Text("Loading metrics...")
                            .font(.bodyMedium)
                            .foregroundColor(.textSecondary)
                    }
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, Spacing.xxl)
                } else if let summary = metricsViewModel.metricsSummary {
                    VStack(spacing: Spacing.lg) {
                        // BMI Card
                        MetricCardSimple(
                            icon: "scalemass.fill",
                            title: "BMI (Body Mass Index)",
                            value: String(format: "%.1f", summary.metrics.bmi),
                            explanation: summary.explanations.bmi,
                            color: .infoColor
                        )

                        // BMR Card
                        MetricCardSimple(
                            icon: "flame.fill",
                            title: "BMR (Basal Metabolic Rate)",
                            value: "\(summary.metrics.bmr) cal/day",
                            explanation: summary.explanations.bmr,
                            color: .warningColor
                        )

                        // TDEE Card
                        MetricCardSimple(
                            icon: "bolt.heart.fill",
                            title: "TDEE (Total Daily Energy)",
                            value: "\(summary.metrics.tdee) cal/day",
                            explanation: summary.explanations.tdee,
                            color: .successColor
                        )
                    }
                    .padding(.horizontal, Spacing.xl)

                    // Acknowledge Button
                    VStack(spacing: Spacing.md) {
                        Text("These metrics form the foundation of your personalized nutrition plan")
                            .font(.bodySmall)
                            .foregroundColor(.textSecondary)
                            .multilineTextAlignment(.center)
                            .padding(.horizontal, Spacing.xl)

                        GTSDButton(
                            "I Understand, Generate My Plan",
                            style: .primary,
                            isLoading: metricsViewModel.isAcknowledgingMetrics
                        ) {
                            _Concurrency.Task {
                                await metricsViewModel.acknowledgeMetrics()
                                // After acknowledgment, fetch the plan
                                if !metricsViewModel.needsAcknowledgment {
                                    await viewModel.fetchPlanSummary()
                                }
                            }
                        }
                        .padding(.horizontal, Spacing.xl)
                    }
                    .padding(.vertical, Spacing.lg)
                } else if let errorMessage = metricsViewModel.metricsError {
                    VStack(spacing: Spacing.md) {
                        // Check if this is a "metrics being calculated" message vs actual error
                        let isCalculating = errorMessage.contains("being calculated")

                        Image(systemName: isCalculating ? "clock.fill" : "exclamationmark.triangle.fill")
                            .font(.system(size: 48))
                            .foregroundColor(isCalculating ? .orange : .red)

                        Text(isCalculating ? "Metrics Being Calculated" : "Unable to Load Metrics")
                            .font(.titleMedium)
                            .foregroundColor(.textPrimary)

                        Text(errorMessage)
                            .font(.bodyMedium)
                            .foregroundColor(.textSecondary)
                            .multilineTextAlignment(.center)
                            .padding(.horizontal, Spacing.xl)

                        if isCalculating {
                            Text("This usually takes just a few seconds. The app will automatically refresh when your metrics are ready.")
                                .font(.bodySmall)
                                .foregroundColor(.textTertiary)
                                .multilineTextAlignment(.center)
                                .padding(.horizontal, Spacing.xl)
                        }

                        GTSDButton("Try Again", style: .primary) {
                            _Concurrency.Task {
                                await metricsViewModel.fetchHealthMetrics()
                            }
                        }
                        .padding(.horizontal, Spacing.xl)
                    }
                    .padding(.vertical, Spacing.xl)
                }
            }
        }
    }

    // MARK: - Banners

    private var recomputationBanner: some View {
        GTSDCard(padding: Spacing.md) {
            HStack(spacing: Spacing.sm) {
                Image(systemName: "arrow.triangle.2.circlepath")
                    .font(.system(size: IconSize.md))
                    .foregroundColor(.primaryColor)
                    .accessibilityHidden(true)

                VStack(alignment: .leading, spacing: Spacing.xs) {
                    Text("Plan Updated")
                        .font(.labelLarge)
                        .foregroundColor(.textPrimary)

                    if let timelineChange = viewModel.formatTimelineChange() {
                        Text(timelineChange)
                            .font(.bodySmall)
                            .foregroundColor(.textSecondary)
                    }

                    if let calorieChange = viewModel.formatCalorieChange() {
                        Text(calorieChange)
                            .font(.bodySmall)
                            .foregroundColor(.textSecondary)
                    }

                    if let proteinChange = viewModel.formatProteinChange() {
                        Text(proteinChange)
                            .font(.bodySmall)
                            .foregroundColor(.textSecondary)
                    }
                }

                Spacer()
            }
        }
        .padding(.horizontal, Spacing.xl)
        .accessibilityElement(children: .combine)
        .accessibilityLabel("Plan updated")
        .accessibilityHint("Your nutrition plan has been recalculated with new targets")
    }

    private func lastUpdatedBanner(timeSinceUpdate: String) -> some View {
        HStack {
            Image(systemName: "clock")
                .font(.system(size: IconSize.xs))
                .foregroundColor(.textTertiary)

            Text("Last updated \(timeSinceUpdate)")
                .font(.bodySmall)
                .foregroundColor(.textTertiary)

            if viewModel.isStale {
                Text("• Outdated")
                    .font(.bodySmall)
                    .foregroundColor(.orange)
            }

            Spacer()
        }
        .padding(.horizontal, Spacing.xl)
        .padding(.vertical, Spacing.xs)
    }

    // MARK: - Header Section

    private var headerSection: some View {
        VStack(alignment: .leading, spacing: Spacing.sm) {
            if let userName = viewModel.summaryData?.user.name {
                Text("Welcome, \(userName)!")
                    .font(.headlineLarge)
                    .foregroundColor(.textPrimary)
            }

            if let goal = viewModel.summaryData?.goals.primaryGoal {
                Text("Your goal: \(goalDisplayName(goal))")
                    .font(.bodyLarge)
                    .foregroundColor(.textSecondary)
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(.horizontal, Spacing.xl)
    }

    // MARK: - Health Metrics Section

    private var healthMetricsSection: some View {
        GTSDCard(padding: Spacing.md) {
            VStack(alignment: .leading, spacing: Spacing.md) {
                HStack {
                    Image(systemName: "heart.text.square.fill")
                        .font(.system(size: IconSize.lg))
                        .foregroundColor(.red)

                    Text("Health Metrics")
                        .font(.titleMedium)
                        .foregroundColor(.textPrimary)

                    Spacer()
                }

                Divider()

                // BMI
                if let bmi = viewModel.bmiValue {
                    metricRow(
                        icon: "figure.stand",
                        color: viewModel.bmiCategoryColor,
                        label: "BMI",
                        value: String(format: "%.1f", bmi),
                        subtitle: viewModel.bmiCategory
                    )
                }

                // BMR
                if let bmr = viewModel.planData?.targets.bmr {
                    metricRow(
                        icon: "flame.fill",
                        color: .orange,
                        label: "BMR (Basal Metabolic Rate)",
                        value: "\(bmr) cal/day",
                        subtitle: "Calories burned at rest"
                    )
                }

                // TDEE
                if let tdee = viewModel.planData?.targets.tdee {
                    metricRow(
                        icon: "bolt.fill",
                        color: .yellow,
                        label: "TDEE (Total Daily Energy)",
                        value: "\(tdee) cal/day",
                        subtitle: "Total calories burned daily"
                    )
                }

                if let activityLevel = viewModel.summaryData?.currentMetrics.activityLevel {
                    HStack {
                        Image(systemName: "figure.walk")
                            .font(.system(size: IconSize.sm))
                            .foregroundColor(.textSecondary)
                        Text("Activity Level: \(activityLevelDisplayName(activityLevel))")
                            .font(.bodySmall)
                            .foregroundColor(.textSecondary)
                    }
                }
            }
        }
        .padding(.horizontal, Spacing.xl)
    }

    // MARK: - Daily Targets Section

    private var dailyTargetsSection: some View {
        GTSDCard(padding: Spacing.md) {
            VStack(alignment: .leading, spacing: Spacing.md) {
                HStack {
                    Image(systemName: "target")
                        .font(.system(size: IconSize.lg))
                        .foregroundColor(.primaryColor)

                    Text("Daily Targets")
                        .font(.titleMedium)
                        .foregroundColor(.textPrimary)

                    Spacer()
                }

                Divider()

                if let targets = viewModel.planData?.targets {
                    // Calories
                    targetRow(
                        icon: "flame.fill",
                        color: .orange,
                        label: "Calories",
                        value: "\(targets.calorieTarget) cal",
                        progress: nil
                    )

                    // Protein
                    targetRow(
                        icon: "leaf.fill",
                        color: .green,
                        label: "Protein",
                        value: "\(targets.proteinTarget)g",
                        progress: nil
                    )

                    // Water
                    targetRow(
                        icon: "drop.fill",
                        color: .blue,
                        label: "Water",
                        value: "\(targets.waterTarget)ml",
                        progress: nil
                    )

                    // Weekly Rate
                    HStack {
                        Image(systemName: "chart.line.uptrend.xyaxis")
                            .font(.system(size: IconSize.sm))
                            .foregroundColor(.textSecondary)
                        Text("Weekly Rate: \(String(format: "%.2f", targets.weeklyRate)) lbs/week")
                            .font(.bodySmall)
                            .foregroundColor(.textSecondary)
                    }
                }
            }
        }
        .padding(.horizontal, Spacing.xl)
    }

    // MARK: - Why It Works Section

    private func whyItWorksSection(whyItWorks: WhyItWorks) -> some View {
        GTSDCard(padding: Spacing.md) {
            VStack(alignment: .leading, spacing: Spacing.md) {
                HStack {
                    Image(systemName: "lightbulb.fill")
                        .font(.system(size: IconSize.lg))
                        .foregroundColor(.yellow)

                    Text("Why It Works")
                        .font(.titleMedium)
                        .foregroundColor(.textPrimary)

                    Spacer()
                }

                Divider()

                // BMR
                whyItWorksItem(
                    icon: "flame",
                    color: .red,
                    title: whyItWorks.bmr.title,
                    explanation: whyItWorks.bmr.explanation,
                    metric: whyItWorks.bmr.formula,
                    sectionId: "bmr"
                )

                // TDEE
                whyItWorksItem(
                    icon: "bolt.fill",
                    color: .yellow,
                    title: whyItWorks.tdee.title,
                    explanation: whyItWorks.tdee.explanation,
                    metric: "Activity multiplier: \(String(format: "%.2f", whyItWorks.tdee.activityMultiplier))",
                    sectionId: "tdee"
                )

                // Calorie Target
                whyItWorksItem(
                    icon: "flame.fill",
                    color: .orange,
                    title: whyItWorks.calorieTarget.title,
                    explanation: whyItWorks.calorieTarget.explanation,
                    metric: whyItWorks.calorieTarget.deficit > 0 ? "\(whyItWorks.calorieTarget.deficit) cal deficit" : whyItWorks.calorieTarget.deficit < 0 ? "\(abs(whyItWorks.calorieTarget.deficit)) cal surplus" : "Maintenance",
                    sectionId: "calories"
                )

                // Protein Target
                whyItWorksItem(
                    icon: "leaf.fill",
                    color: .green,
                    title: whyItWorks.proteinTarget.title,
                    explanation: whyItWorks.proteinTarget.explanation,
                    metric: "\(String(format: "%.1f", whyItWorks.proteinTarget.gramsPerKg))g per kg body weight",
                    sectionId: "protein"
                )

                // Water Target
                whyItWorksItem(
                    icon: "drop.fill",
                    color: .blue,
                    title: whyItWorks.waterTarget.title,
                    explanation: whyItWorks.waterTarget.explanation,
                    metric: "\(whyItWorks.waterTarget.mlPerKg)ml per kg body weight",
                    sectionId: "water"
                )

                // Timeline
                whyItWorksItem(
                    icon: "chart.line.uptrend.xyaxis",
                    color: .purple,
                    title: whyItWorks.timeline.title,
                    explanation: whyItWorks.timeline.explanation,
                    metric: whyItWorks.timeline.estimatedWeeks > 0 ? "~\(whyItWorks.timeline.estimatedWeeks) weeks to goal" : "Maintenance mode",
                    sectionId: "timeline"
                )
            }
        }
        .padding(.horizontal, Spacing.xl)
    }

    // MARK: - Plan Details Section

    private func planDetailsSection(plan: Plan) -> some View {
        GTSDCard(padding: Spacing.md) {
            VStack(alignment: .leading, spacing: Spacing.md) {
                HStack {
                    Image(systemName: "calendar")
                        .font(.system(size: IconSize.lg))
                        .foregroundColor(.primaryColor)

                    Text("Plan Details")
                        .font(.titleMedium)
                        .foregroundColor(.textPrimary)

                    Spacer()
                }

                Divider()

                VStack(alignment: .leading, spacing: Spacing.sm) {
                    Text(plan.name)
                        .font(.titleSmall)
                        .foregroundColor(.textPrimary)

                    Text(plan.description)
                        .font(.bodyMedium)
                        .foregroundColor(.textSecondary)

                    HStack {
                        Image(systemName: "calendar.badge.clock")
                            .font(.system(size: IconSize.sm))
                            .foregroundColor(.textSecondary)
                        Text("\(plan.startDate, format: .dateTime.month().day()) - \(plan.endDate, format: .dateTime.month().day())")
                            .font(.bodySmall)
                            .foregroundColor(.textSecondary)
                    }

                    HStack {
                        Image(systemName: "checkmark.circle.fill")
                            .font(.system(size: IconSize.sm))
                            .foregroundColor(plan.status == "active" ? .green : .gray)
                        Text("Status: \(plan.status.capitalized)")
                            .font(.bodySmall)
                            .foregroundColor(.textSecondary)
                    }
                }
            }
        }
        .padding(.horizontal, Spacing.xl)
    }

    // MARK: - Refresh Button

    private var refreshButton: some View {
        GTSDButton(
            "Recalculate Plan",
            style: .secondary,
            isLoading: viewModel.isLoading
        ) {
            _Concurrency.Task {
                await viewModel.refreshPlan()
            }
        }
        .padding(.horizontal, Spacing.xl)
        .accessibilityLabel("Recalculate nutrition plan")
        .accessibilityHint("Double tap to refresh your plan based on current health metrics and goals")
    }

    // MARK: - Helper Views

    private func metricRow(icon: String, color: Color, label: String, value: String, subtitle: String?) -> some View {
        VStack(spacing: Spacing.xs) {
            HStack(spacing: Spacing.sm) {
                Image(systemName: icon)
                    .font(.system(size: IconSize.md))
                    .foregroundColor(color)
                    .frame(width: IconSize.lg)
                    .accessibilityHidden(true)

                Text(label)
                    .font(.bodyMedium)
                    .foregroundColor(.textPrimary)

                Spacer()

                Text(value)
                    .font(.titleSmall)
                    .fontWeight(.semibold)
                    .foregroundColor(.textPrimary)
            }

            if let subtitle = subtitle {
                HStack {
                    Spacer()
                    Text(subtitle)
                        .font(.bodySmall)
                        .foregroundColor(.textSecondary)
                }
            }
        }
        .accessibilityElement(children: .combine)
        .accessibilityLabel("\(label): \(value)")
        .accessibilityValue(subtitle ?? "")
    }

    private func targetRow(icon: String, color: Color, label: String, value: String, progress: Double?) -> some View {
        VStack(spacing: Spacing.xs) {
            HStack(spacing: Spacing.sm) {
                Image(systemName: icon)
                    .font(.system(size: IconSize.md))
                    .foregroundColor(color)
                    .frame(width: IconSize.lg)
                    .accessibilityHidden(true)

                Text(label)
                    .font(.bodyMedium)
                    .foregroundColor(.textPrimary)

                Spacer()

                Text(value)
                    .font(.titleSmall)
                    .fontWeight(.semibold)
                    .foregroundColor(.textPrimary)
            }

            if let progress = progress {
                ProgressView(value: progress, total: 1.0)
                    .tint(.primaryColor)
                    .accessibilityLabel("Progress")
                    .accessibilityValue("\(Int(progress * 100)) percent")
            }
        }
        .accessibilityElement(children: .combine)
        .accessibilityLabel("Daily \(label.lowercased()) target")
        .accessibilityValue(value)
    }

    private func whyItWorksItem(icon: String, color: Color, title: String, explanation: String, metric: String, sectionId: String) -> some View {
        VStack(alignment: .leading, spacing: Spacing.sm) {
            HStack(alignment: .top, spacing: Spacing.sm) {
                Image(systemName: icon)
                    .font(.system(size: IconSize.md))
                    .foregroundColor(color)
                    .frame(width: IconSize.lg)

                VStack(alignment: .leading, spacing: Spacing.xs) {
                    Text(title)
                        .font(.titleSmall)
                        .foregroundColor(.textPrimary)

                    Text(explanation)
                        .font(.bodyMedium)
                        .foregroundColor(.textSecondary)

                    if expandedSections.contains(sectionId) {
                        VStack(alignment: .leading, spacing: Spacing.xs) {
                            Divider()
                                .padding(.vertical, Spacing.xs)

                            Text("Key Metric")
                                .font(.labelMedium)
                                .foregroundColor(.textPrimary)

                            Text(metric)
                                .font(.bodySmall)
                                .foregroundColor(.textSecondary)
                        }
                        .transition(.opacity.combined(with: .scale))
                    }

                    Button(action: {
                        withAnimation(.springy) {
                            toggleSection(sectionId)
                        }
                    }) {
                        HStack {
                            Image(systemName: "info.circle")
                                .font(.system(size: IconSize.sm))
                            Text(expandedSections.contains(sectionId) ? "Show Less" : "Learn More")
                                .font(.labelMedium)
                        }
                        .foregroundColor(.primaryColor)
                    }
                    .accessibilityLabel(expandedSections.contains(sectionId) ? "Show less about \(title)" : "Learn more about \(title)")
                    .accessibilityHint("Double tap to \(expandedSections.contains(sectionId) ? "hide" : "show") scientific explanation")
                    .minimumTouchTarget()
                }

                Spacer()
            }

            if sectionId != "timeline" {
                Divider()
                    .padding(.vertical, Spacing.xs)
            }
        }
    }

    // MARK: - Helper Methods

    /// Check if an error is a metrics acknowledgment error that should trigger the acknowledgment UI
    /// instead of showing an error view
    private func shouldShowAcknowledgmentForError(_ error: PlanError) -> Bool {
        // Check for 400 errors with metrics acknowledgment messages
        if case .serverError(let code, let message) = error {
            if code == 400 {
                let lowerMessage = message.lowercased()
                // Check for common metrics acknowledgment error messages
                return lowerMessage.contains("acknowledge") &&
                       (lowerMessage.contains("metrics") || lowerMessage.contains("health"))
            }
        }
        return false
    }

    private func toggleSection(_ section: String) {
        if expandedSections.contains(section) {
            expandedSections.remove(section)
        } else {
            expandedSections.insert(section)
        }
    }

    private func goalDisplayName(_ goal: String) -> String {
        switch goal {
        case "lose_weight": return "Lose Weight"
        case "gain_muscle": return "Gain Muscle"
        case "maintain": return "Maintain Weight"
        case "improve_health": return "Improve Health"
        default: return goal.replacingOccurrences(of: "_", with: " ").capitalized
        }
    }

    private func activityLevelDisplayName(_ level: String) -> String {
        switch level {
        case "sedentary": return "Sedentary"
        case "lightly_active": return "Lightly Active"
        case "moderately_active": return "Moderately Active"
        case "very_active": return "Very Active"
        case "extremely_active": return "Extremely Active"
        default: return level.replacingOccurrences(of: "_", with: " ").capitalized
        }
    }
}

// MARK: - Preview

#Preview {
    PlanSummaryView()
}
