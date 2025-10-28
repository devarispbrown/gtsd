//
//  PlanSummaryView.swift
//  GTSD
//
//  Created by Claude on 2025-10-27.
//

import SwiftUI

struct PlanSummaryView: View {
    @StateObject private var viewModel = PlanSummaryViewModel()
    @State private var expandedSections: Set<String> = []

    var body: some View {
        NavigationStack {
            ZStack {
                if viewModel.isLoading && viewModel.planData == nil {
                    ProgressView("Loading your plan...")
                        .progressViewStyle(.circular)
                } else if let errorMessage = viewModel.errorMessage, viewModel.planData == nil {
                    ErrorView(message: errorMessage, retryAction: {
                        _Concurrency.Task {
                            await viewModel.fetchPlanSummary()
                        }
                    })
                } else {
                    ScrollView {
                        VStack(spacing: Spacing.lg) {
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
                }
            }
            .alert("Error", isPresented: .constant(viewModel.errorMessage != nil && viewModel.planData != nil)) {
                Button("OK") {
                    viewModel.errorMessage = nil
                }
            } message: {
                Text(viewModel.errorMessage ?? "")
            }
            .task {
                if viewModel.planData == nil {
                    await viewModel.fetchPlanSummary()
                }
            }
        }
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

                whyItWorksItem(
                    icon: "flame.fill",
                    color: .orange,
                    title: whyItWorks.calorieTarget.title,
                    explanation: whyItWorks.calorieTarget.explanation,
                    science: whyItWorks.calorieTarget.science,
                    sectionId: "calories"
                )

                whyItWorksItem(
                    icon: "leaf.fill",
                    color: .green,
                    title: whyItWorks.proteinTarget.title,
                    explanation: whyItWorks.proteinTarget.explanation,
                    science: whyItWorks.proteinTarget.science,
                    sectionId: "protein"
                )

                whyItWorksItem(
                    icon: "drop.fill",
                    color: .blue,
                    title: whyItWorks.waterTarget.title,
                    explanation: whyItWorks.waterTarget.explanation,
                    science: whyItWorks.waterTarget.science,
                    sectionId: "water"
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
    }

    // MARK: - Helper Views

    private func metricRow(icon: String, color: Color, label: String, value: String, subtitle: String?) -> some View {
        VStack(spacing: Spacing.xs) {
            HStack(spacing: Spacing.sm) {
                Image(systemName: icon)
                    .font(.system(size: IconSize.md))
                    .foregroundColor(color)
                    .frame(width: IconSize.lg)

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
    }

    private func targetRow(icon: String, color: Color, label: String, value: String, progress: Double?) -> some View {
        VStack(spacing: Spacing.xs) {
            HStack(spacing: Spacing.sm) {
                Image(systemName: icon)
                    .font(.system(size: IconSize.md))
                    .foregroundColor(color)
                    .frame(width: IconSize.lg)

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
            }
        }
    }

    private func whyItWorksItem(icon: String, color: Color, title: String, explanation: String, science: String, sectionId: String) -> some View {
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

                            Text("The Science")
                                .font(.labelMedium)
                                .foregroundColor(.textPrimary)

                            Text(science)
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
                }

                Spacer()
            }

            if sectionId != "water" {
                Divider()
                    .padding(.vertical, Spacing.xs)
            }
        }
    }

    // MARK: - Helper Methods

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
