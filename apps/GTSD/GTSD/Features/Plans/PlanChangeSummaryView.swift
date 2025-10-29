//
//  PlanChangeSummaryView.swift
//  GTSD
//
//  Created by Claude on 2025-10-28.
//

import SwiftUI

/// View displaying plan changes after recomputation
/// Shows before/after comparison of key nutrition targets with animations
struct PlanChangeSummaryView: View {
    let planData: PlanGenerationData?
    @Environment(\.dismiss) private var dismiss
    @State private var showFullPlan = false
    @State private var showCheckmark = false
    @State private var showContent = false
    @State private var showButton = false

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: Spacing.xl) {
                    // Success Icon with Animation
                    ZStack {
                        // Background circle
                        Circle()
                            .fill(Color.green.opacity(0.1))
                            .frame(width: 120, height: 120)
                            .scaleEffect(showCheckmark ? 1.0 : 0.0)

                        // Checkmark
                        Image(systemName: "checkmark.circle.fill")
                            .font(.system(size: 80))
                            .foregroundColor(.successColor)
                            .scaleEffect(showCheckmark ? 1.0 : 0.0)
                            .rotationEffect(.degrees(showCheckmark ? 0 : -180))
                    }
                    .padding(.top, Spacing.lg)
                    .accessibilityLabel("Success")
                    .accessibilityHidden(true)

                    // Title with Animation
                    VStack(spacing: Spacing.sm) {
                        Text("Plan Updated!")
                            .font(.headlineLarge)
                            .foregroundColor(.textPrimary)

                        Text("Your nutrition plan has been recalculated based on your updated information")
                            .font(.bodyMedium)
                            .foregroundColor(.textSecondary)
                            .multilineTextAlignment(.center)
                    }
                    .padding(.horizontal, Spacing.xl)
                    .opacity(showContent ? 1 : 0)
                    .offset(y: showContent ? 0 : 20)

                    // Changes Section
                    if let planData = planData,
                       let previous = planData.previousTargets {
                        VStack(spacing: Spacing.md) {
                            Text("What Changed")
                                .font(.titleLarge)
                                .foregroundColor(.textPrimary)
                                .padding(.top, Spacing.lg)

                            VStack(spacing: Spacing.md) {
                                AnimatedTargetCard(
                                    icon: "flame.fill",
                                    iconColor: .orange,
                                    label: "Daily Calories",
                                    value: planData.targets.calorieTarget,
                                    oldValue: previous.calorieTarget,
                                    unit: "cal"
                                )

                                AnimatedTargetCard(
                                    icon: "leaf.fill",
                                    iconColor: .green,
                                    label: "Daily Protein",
                                    value: planData.targets.proteinTarget,
                                    oldValue: previous.proteinTarget,
                                    unit: "g"
                                )

                                AnimatedTargetCard(
                                    icon: "drop.fill",
                                    iconColor: .blue,
                                    label: "Daily Water",
                                    value: planData.targets.waterTarget,
                                    oldValue: previous.waterTarget,
                                    unit: "ml"
                                )

                                if let oldWeeks = previous.estimatedWeeks,
                                   let newWeeks = planData.targets.estimatedWeeks {
                                    AnimatedTargetCard(
                                        icon: "calendar",
                                        iconColor: .purple,
                                        label: "Estimated Timeline",
                                        value: newWeeks,
                                        oldValue: oldWeeks,
                                        unit: "weeks"
                                    )
                                }
                            }
                        }
                        .padding(.horizontal, Spacing.xl)
                        .opacity(showContent ? 1 : 0)
                        .offset(y: showContent ? 0 : 30)
                    } else {
                        // No previous data to compare
                        VStack(spacing: Spacing.sm) {
                            Image(systemName: "chart.bar.fill")
                                .font(.system(size: 40))
                                .foregroundColor(.primaryColor)

                            Text("Your new plan is ready!")
                                .font(.titleMedium)
                                .foregroundColor(.textPrimary)

                            Text("View your personalized nutrition targets")
                                .font(.bodyMedium)
                                .foregroundColor(.textSecondary)
                        }
                        .padding(Spacing.xl)
                        .background(Color.backgroundSecondary)
                        .cornerRadius(CornerRadius.lg)
                        .padding(.horizontal, Spacing.xl)
                    }

                    // Action Buttons
                    VStack(spacing: Spacing.md) {
                        GTSDButton("View Full Plan", style: .primary) {
                            HapticManager.selection()
                            showFullPlan = true
                        }
                        .accessibilityLabel("View full nutrition plan")
                        .accessibilityHint("Double tap to see detailed breakdown of your personalized targets")

                        Button("Done") {
                            HapticManager.selection()
                            dismiss()
                        }
                        .font(.titleMedium)
                        .foregroundColor(.textSecondary)
                        .accessibilityLabel("Done")
                        .accessibilityHint("Double tap to dismiss this screen")
                        .minimumTouchTarget()
                    }
                    .padding(.horizontal, Spacing.xl)
                    .padding(.bottom, Spacing.xl)
                    .opacity(showButton ? 1 : 0)
                    .scaleEffect(showButton ? 1.0 : 0.9)
                }
            }
            .navigationTitle("Plan Changes")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("Done") {
                        HapticManager.selection()
                        dismiss()
                    }
                }
            }
            .sheet(isPresented: $showFullPlan) {
                PlanSummaryView()
            }
            .onAppear {
                animateAppearance()
            }
        }
    }

    // MARK: - Animations

    private func animateAppearance() {
        // Trigger success haptic
        HapticManager.success()

        // Checkmark animation
        withAnimation(.spring(response: 0.6, dampingFraction: 0.7)) {
            showCheckmark = true
        }

        // Content animation
        withAnimation(.spring(response: 0.6, dampingFraction: 0.8).delay(0.3)) {
            showContent = true
        }

        // Button animation
        withAnimation(.spring(response: 0.5, dampingFraction: 0.7).delay(0.6)) {
            showButton = true
        }
    }

    // MARK: - Change Row

    private func changeRow(
        title: String,
        icon: String,
        iconColor: Color,
        old: Int,
        new: Int,
        unit: String
    ) -> some View {
        HStack(spacing: Spacing.md) {
            // Icon
            Image(systemName: icon)
                .font(.system(size: IconSize.md))
                .foregroundColor(iconColor)
                .frame(width: IconSize.lg, height: IconSize.lg)

            // Title
            VStack(alignment: .leading, spacing: Spacing.xs) {
                Text(title)
                    .font(.bodyMedium)
                    .foregroundColor(.textPrimary)

                // Change indicator
                HStack(spacing: Spacing.xs) {
                    Text("\(old) \(unit)")
                        .font(.labelMedium)
                        .foregroundColor(.textTertiary)
                        .strikethrough()

                    Image(systemName: "arrow.right")
                        .font(.system(size: IconSize.xs))
                        .foregroundColor(.textTertiary)

                    Text("\(new) \(unit)")
                        .font(.labelLarge)
                        .fontWeight(.semibold)
                        .foregroundColor(.primaryColor)
                }
            }

            Spacer()

            // Change badge
            changeBadge(old: old, new: new)
        }
        .padding(Spacing.md)
        .background(Color.backgroundPrimary)
        .cornerRadius(CornerRadius.md)
    }

    private func changeBadge(old: Int, new: Int) -> some View {
        let difference = new - old
        let isIncrease = difference > 0
        let color: Color = isIncrease ? .successColor : .warningColor
        let icon = isIncrease ? "arrow.up" : "arrow.down"

        return HStack(spacing: Spacing.xs) {
            Image(systemName: icon)
                .font(.system(size: IconSize.xs))

            Text("\(abs(difference))")
                .font(.labelMedium)
                .fontWeight(.semibold)
        }
        .foregroundColor(color)
        .padding(.horizontal, Spacing.sm)
        .padding(.vertical, Spacing.xs)
        .background(color.opacity(0.15))
        .cornerRadius(CornerRadius.sm)
    }
}

// MARK: - Preview

#Preview {
    PlanChangeSummaryView(
        planData: PlanGenerationData(
            plan: Plan(
                id: 1,
                userId: 1,
                name: "Weight Loss Plan",
                description: "Science-backed plan",
                startDate: Date(),
                endDate: Date().addingTimeInterval(86400 * 90),
                status: "active"
            ),
            targets: ComputedTargets(
                bmr: 1650,
                tdee: 2200,
                calorieTarget: 1700,
                proteinTarget: 140,
                waterTarget: 2500,
                weeklyRate: 0.5,
                estimatedWeeks: 16,
                projectedDate: Date().addingTimeInterval(86400 * 112)
            ),
            whyItWorks: WhyItWorks(
                bmr: BMRExplanation(
                    title: "Basal Metabolic Rate",
                    explanation: "Calories burned at rest",
                    formula: "BMR = (10 × weight) + (6.25 × height) - (5 × age) + offset"
                ),
                tdee: TDEEExplanation(
                    title: "Total Daily Energy",
                    explanation: "Total calories burned including activity",
                    activityMultiplier: 1.55,
                    metric: 1.55
                ),
                calorieTarget: CalorieTargetExplanation(
                    title: "Calorie Target",
                    explanation: "Your daily calorie target",
                    deficit: 500,
                    metric: 500
                ),
                proteinTarget: ProteinTargetExplanation(
                    title: "Protein Target",
                    explanation: "Your daily protein target",
                    gramsPerKg: 2.2,
                    metric: 2.2
                ),
                waterTarget: WaterTargetExplanation(
                    title: "Water Target",
                    explanation: "Your daily water target",
                    mlPerKg: 35,
                    metric: 35
                ),
                timeline: TimelineExplanation(
                    title: "Timeline",
                    explanation: "Your projected timeline",
                    weeklyRate: 0.5,
                    estimatedWeeks: 16,
                    metric: 0.5
                )
            ),
            recomputed: true,
            previousTargets: ComputedTargets(
                bmr: 1650,
                tdee: 2200,
                calorieTarget: 1800,
                proteinTarget: 130,
                waterTarget: 2300,
                weeklyRate: 0.5,
                estimatedWeeks: 18,
                projectedDate: Date().addingTimeInterval(86400 * 126)
            )
        )
    )
}
