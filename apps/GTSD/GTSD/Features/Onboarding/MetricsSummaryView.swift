//
//  MetricsSummaryView.swift
//  GTSD
//
//  Created by Claude on 2025-10-27.
//

import SwiftUI

struct MetricsSummaryView: View {
    let summary: HowItWorksSummary
    let onGetStarted: () -> Void

    @State private var expandedSections: Set<String> = []

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: Spacing.lg) {
                    // Greeting Section
                    greetingSection
                        .padding(.top, Spacing.lg)

                    // BMR Card
                    bmrCard

                    // TDEE Card
                    tdeeCard

                    // Daily Targets Card
                    dailyTargetsCard

                    // Projection Card
                    projectionCard

                    // How It Works Card
                    howItWorksCard

                    // CTA Button
                    GTSDButton("Get Started", style: .primary) {
                        onGetStarted()
                    }
                    .padding(.horizontal, Spacing.xl)
                    .padding(.bottom, Spacing.xl)
                    .accessibilityLabel("Get started with your personalized plan")
                    .accessibilityHint("Dismisses this summary and returns to the app")
                }
            }
            .navigationTitle("How GTSD Works for You")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button(action: onGetStarted) {
                        Image(systemName: "xmark")
                            .foregroundColor(.textSecondary)
                    }
                    .accessibilityLabel("Close summary")
                    .accessibilityHint("Dismisses this metrics summary and returns to the app")
                }
            }
        }
        .interactiveDismissDisabled()
    }

    // MARK: - Greeting Section

    private var greetingSection: some View {
        VStack(alignment: .leading, spacing: Spacing.sm) {
            Text("Hi \(summary.user.name)!")
                .font(.headlineLarge)
                .foregroundColor(.textPrimary)

            Text("We've created a personalized plan to help you \(summary.goals.goalDisplayName). Here's how it works:")
                .font(.bodyMedium)
                .foregroundColor(.textSecondary)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(.horizontal, Spacing.xl)
    }

    // MARK: - BMR Card

    private var bmrCard: some View {
        ExpandableMetricCard(
            icon: "flame.fill",
            iconColor: .orange,
            title: "BMR (Basal Metabolic Rate)",
            value: "\(summary.calculations.bmr.value) calories/day",
            explanation: summary.calculations.bmr.explanation,
            detailedExplanation: "Formula: \(summary.calculations.bmr.formula)\n\nAs a \(summary.currentMetrics.age ?? 0)-year-old \(summary.currentMetrics.gender ?? "person"), your body burns this many calories even without any activity.",
            isExpanded: expandedSections.contains("bmr"),
            onToggle: {
                toggleSection("bmr")
            }
        )
        .padding(.horizontal, Spacing.xl)
    }

    // MARK: - TDEE Card

    private var tdeeCard: some View {
        ExpandableMetricCard(
            icon: "bolt.fill",
            iconColor: .yellow,
            title: "TDEE (Total Daily Energy Expenditure)",
            value: "\(summary.calculations.tdee.value) calories/day",
            explanation: summary.calculations.tdee.explanation,
            detailedExplanation: "Activity multiplier: \(String(format: "%.2f", summary.calculations.tdee.activityMultiplier))\n\nYou selected: \(summary.currentMetrics.activityLevelDisplayName ?? "Moderately Active")",
            isExpanded: expandedSections.contains("tdee"),
            onToggle: {
                toggleSection("tdee")
            }
        )
        .padding(.horizontal, Spacing.xl)
    }

    // MARK: - Daily Targets Card

    private var dailyTargetsCard: some View {
        GTSDCard(padding: Spacing.md) {
            VStack(alignment: .leading, spacing: Spacing.md) {
                HStack {
                    Image(systemName: "target")
                        .font(.system(size: IconSize.lg))
                        .foregroundColor(.primaryColor)

                    Text("Your Daily Targets")
                        .font(.titleMedium)
                        .foregroundColor(.textPrimary)

                    Spacer()
                }

                Divider()

                // Calories
                targetRow(
                    icon: "flame.fill",
                    color: .orange,
                    label: "Calories",
                    value: "\(summary.calculations.targets.calories.value) cal/day"
                )

                // Protein
                targetRow(
                    icon: "leaf.fill",
                    color: .green,
                    label: "Protein",
                    value: "\(summary.calculations.targets.protein.value)g/day"
                )

                // Water
                targetRow(
                    icon: "drop.fill",
                    color: .blue,
                    label: "Water",
                    value: "\(summary.calculations.targets.water.value)ml/day"
                )

                if expandedSections.contains("targets") {
                    VStack(alignment: .leading, spacing: Spacing.sm) {
                        Divider()

                        Text("Why These Targets?")
                            .font(.labelMedium)
                            .foregroundColor(.textPrimary)

                        Text(summary.calculations.targets.calories.explanation)
                            .font(.bodySmall)
                            .foregroundColor(.textSecondary)

                        Text(summary.calculations.targets.protein.explanation)
                            .font(.bodySmall)
                            .foregroundColor(.textSecondary)

                        Text(summary.calculations.targets.water.explanation)
                            .font(.bodySmall)
                            .foregroundColor(.textSecondary)
                    }
                    .transition(.opacity.combined(with: .scale))
                }

                Button(action: {
                    withAnimation(.springy) {
                        toggleSection("targets")
                    }
                }) {
                    HStack {
                        Image(systemName: "info.circle")
                            .font(.system(size: IconSize.sm))
                        Text(expandedSections.contains("targets") ? "Show Less" : "Why These Targets?")
                            .font(.labelMedium)
                    }
                    .foregroundColor(.primaryColor)
                }
                .accessibilityLabel(expandedSections.contains("targets") ? "Hide target explanations" : "Show target explanations")
                .accessibilityHint("Double tap to \(expandedSections.contains("targets") ? "hide" : "view") why we set these calorie, protein, and water targets")
                .accessibilityAddTraits(.isButton)
            }
        }
        .padding(.horizontal, Spacing.xl)
    }

    // MARK: - Projection Card

    private var projectionCard: some View {
        GTSDCard(padding: Spacing.md) {
            VStack(alignment: .leading, spacing: Spacing.md) {
                HStack {
                    Image(systemName: "chart.line.uptrend.xyaxis")
                        .font(.system(size: IconSize.lg))
                        .foregroundColor(.primaryColor)

                    Text("Your Projection")
                        .font(.titleMedium)
                        .foregroundColor(.textPrimary)

                    Spacer()
                }

                Divider()

                HStack(alignment: .center, spacing: Spacing.md) {
                    VStack(spacing: Spacing.xs) {
                        Text("Start")
                            .font(.labelMedium)
                            .foregroundColor(.textSecondary)
                        Text("\(Int(summary.projection.startWeight)) lbs")
                            .font(.headlineSmall)
                            .foregroundColor(.textPrimary)
                    }

                    Image(systemName: "arrow.right")
                        .font(.system(size: IconSize.md))
                        .foregroundColor(.textSecondary)

                    VStack(spacing: Spacing.xs) {
                        Text("Goal")
                            .font(.labelMedium)
                            .foregroundColor(.textSecondary)
                        Text("\(Int(summary.projection.targetWeight)) lbs")
                            .font(.headlineSmall)
                            .foregroundColor(.primaryColor)
                    }

                    Spacer()
                }

                VStack(alignment: .leading, spacing: Spacing.xs) {
                    HStack {
                        Image(systemName: "clock.fill")
                            .font(.system(size: IconSize.sm))
                            .foregroundColor(.textSecondary)
                        Text("Estimated: \(summary.projection.estimatedWeeks) weeks")
                            .font(.bodyMedium)
                            .foregroundColor(.textPrimary)
                    }

                    if let projectedDate = summary.projection.projectedDate {
                        HStack {
                            Image(systemName: "calendar")
                                .font(.system(size: IconSize.sm))
                                .foregroundColor(.textSecondary)
                            Text("Target Date: \(projectedDate, format: .dateTime.month().day().year())")
                                .font(.bodyMedium)
                                .foregroundColor(.textPrimary)
                        }
                    }
                }

                Text(summary.projection.explanation)
                    .font(.bodySmall)
                    .foregroundColor(.textSecondary)
            }
        }
        .padding(.horizontal, Spacing.xl)
    }

    // MARK: - How It Works Card

    private var howItWorksCard: some View {
        GTSDCard(padding: Spacing.md) {
            VStack(alignment: .leading, spacing: Spacing.md) {
                HStack {
                    Image(systemName: "lightbulb.fill")
                        .font(.system(size: IconSize.lg))
                        .foregroundColor(.yellow)

                    Text("How It Works")
                        .font(.titleMedium)
                        .foregroundColor(.textPrimary)

                    Spacer()
                }

                Divider()

                howItWorksStep(number: 1, step: summary.howItWorks.step1)
                howItWorksStep(number: 2, step: summary.howItWorks.step2)
                howItWorksStep(number: 3, step: summary.howItWorks.step3)
                howItWorksStep(number: 4, step: summary.howItWorks.step4)
            }
        }
        .padding(.horizontal, Spacing.xl)
    }

    // MARK: - Helper Views

    private func targetRow(icon: String, color: Color, label: String, value: String) -> some View {
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
    }

    private func howItWorksStep(number: Int, step: HowItWorksStep) -> some View {
        HStack(alignment: .top, spacing: Spacing.sm) {
            ZStack {
                Circle()
                    .fill(Color.primaryColor.opacity(0.2))
                    .frame(width: 28, height: 28)

                Text("\(number)")
                    .font(.labelMedium)
                    .foregroundColor(.primaryColor)
            }

            VStack(alignment: .leading, spacing: Spacing.xs) {
                Text(step.title)
                    .font(.titleSmall)
                    .foregroundColor(.textPrimary)

                Text(step.description)
                    .font(.bodySmall)
                    .foregroundColor(.textSecondary)
            }

            Spacer()
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
}

// MARK: - Expandable Metric Card

struct ExpandableMetricCard: View {
    let icon: String
    let iconColor: Color
    let title: String
    let value: String
    let explanation: String
    let detailedExplanation: String
    let isExpanded: Bool
    let onToggle: () -> Void

    var body: some View {
        GTSDCard(padding: Spacing.md) {
            VStack(alignment: .leading, spacing: Spacing.md) {
                HStack {
                    Image(systemName: icon)
                        .font(.system(size: IconSize.lg))
                        .foregroundColor(iconColor)

                    Text(title)
                        .font(.titleMedium)
                        .foregroundColor(.textPrimary)

                    Spacer()
                }

                Text(value)
                    .font(.headlineLarge)
                    .fontWeight(.bold)
                    .foregroundColor(.primaryColor)

                Text(explanation)
                    .font(.bodyMedium)
                    .foregroundColor(.textSecondary)

                if isExpanded {
                    Divider()

                    Text(detailedExplanation)
                        .font(.bodySmall)
                        .foregroundColor(.textSecondary)
                        .transition(.opacity.combined(with: .scale))
                }

                Button(action: {
                    withAnimation(.springy) {
                        onToggle()
                    }
                }) {
                    HStack {
                        Image(systemName: "info.circle")
                            .font(.system(size: IconSize.sm))
                        Text(isExpanded ? "Show Less" : "Learn More")
                            .font(.labelMedium)
                    }
                    .foregroundColor(.primaryColor)
                }
                .accessibilityLabel(isExpanded ? "Hide detailed explanation" : "Show detailed explanation")
                .accessibilityHint("Double tap to \(isExpanded ? "collapse" : "expand") this section")
                .accessibilityAddTraits(.isButton)
            }
        }
    }
}

// MARK: - Preview

#Preview {
    let sampleSummary = HowItWorksSummary(
        user: SummaryUser(name: "John Doe", email: "john@example.com"),
        currentMetrics: CurrentMetrics(age: 30, gender: "male", weight: 180, height: 70, activityLevel: "moderately_active"),
        goals: Goals(primaryGoal: "lose_weight", targetWeight: 165, targetDate: nil),
        calculations: Calculations(
            bmr: BMRCalculation(value: 1650, explanation: "The energy your body needs at rest.", formula: "Mifflin-St Jeor Equation"),
            tdee: TDEECalculation(value: 2475, explanation: "Your total calorie burn with moderately active lifestyle.", activityMultiplier: 1.55),
            targets: Targets(
                calories: Target(value: 1975, unit: "cal/day", explanation: "To lose weight safely, we've created a 500-calorie daily deficit."),
                protein: Target(value: 130, unit: "grams/day", explanation: "Protein helps preserve muscle mass."),
                water: Target(value: 2450, unit: "ml/day", explanation: "Staying hydrated supports metabolism.")
            )
        ),
        projection: Projection(
            startWeight: 180,
            targetWeight: 165,
            weeklyRate: 0.45,
            estimatedWeeks: 15,
            projectedDate: nil,
            explanation: "To lose 15 lbs safely, we estimate 15 weeks at your current activity level."
        ),
        howItWorks: HowItWorks(
            step1: HowItWorksStep(title: "Track Your Progress", description: "Monitor meals, water intake, and activity to stay on target."),
            step2: HowItWorksStep(title: "Stay Consistent", description: "Hit your daily calorie and protein targets for best results."),
            step3: HowItWorksStep(title: "Adjust as Needed", description: "As you progress, we'll help you adjust your targets."),
            step4: HowItWorksStep(title: "Reach Your Goal", description: "Sustainable, science-backed approach for lasting results.")
        )
    )

    MetricsSummaryView(summary: sampleSummary, onGetStarted: {})
}
