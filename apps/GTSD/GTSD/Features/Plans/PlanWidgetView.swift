//
//  PlanWidgetView.swift
//  GTSD
//
//  Created by Claude on 2025-10-28.
//

import SwiftUI

/// Compact widget displaying daily nutrition targets on home screen
/// Provides quick access to today's goals with tap to view full plan
struct PlanWidgetView: View {
    let planData: PlanGenerationData
    @State private var showFullPlan = false

    var body: some View {
        Button(action: { showFullPlan = true }) {
            VStack(alignment: .leading, spacing: Spacing.md) {
                // Header
                HStack {
                    Image(systemName: "target")
                        .font(.system(size: IconSize.md))
                        .foregroundColor(.primaryColor)

                    Text("Today's Targets")
                        .font(.titleSmall)
                        .foregroundColor(.textPrimary)

                    Spacer()

                    Image(systemName: "chevron.right")
                        .font(.system(size: IconSize.xs))
                        .foregroundColor(.textTertiary)
                }

                // Compact targets grid
                HStack(spacing: Spacing.md) {
                    targetPill(
                        icon: "flame.fill",
                        color: .orange,
                        value: "\(planData.targets.calorieTarget)",
                        unit: "cal",
                        label: "Calories"
                    )

                    targetPill(
                        icon: "leaf.fill",
                        color: .green,
                        value: "\(planData.targets.proteinTarget)",
                        unit: "g",
                        label: "Protein"
                    )

                    targetPill(
                        icon: "drop.fill",
                        color: .blue,
                        value: "\(planData.targets.waterTarget)",
                        unit: "ml",
                        label: "Water"
                    )
                }
            }
            .padding(Spacing.md)
            .background(Color.backgroundPrimary)
            .cornerRadius(CornerRadius.md)
            .cardShadow()
        }
        .buttonStyle(PlainButtonStyle())
        .accessibilityLabel("Today's nutrition targets")
        .accessibilityHint("Tap to view full plan details")
        .sheet(isPresented: $showFullPlan) {
            PlanSummaryView()
        }
    }

    // MARK: - Target Pill

    private func targetPill(
        icon: String,
        color: Color,
        value: String,
        unit: String,
        label: String
    ) -> some View {
        VStack(spacing: Spacing.xs) {
            // Icon
            Image(systemName: icon)
                .font(.system(size: IconSize.sm))
                .foregroundColor(color)

            // Value and unit
            HStack(alignment: .firstTextBaseline, spacing: 2) {
                Text(value)
                    .font(.titleMedium)
                    .fontWeight(.semibold)
                    .foregroundColor(.textPrimary)

                Text(unit)
                    .font(.labelSmall)
                    .foregroundColor(.textSecondary)
            }

            // Label
            Text(label)
                .font(.bodySmall)
                .foregroundColor(.textSecondary)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, Spacing.sm)
        .background(Color.backgroundSecondary.opacity(0.5))
        .cornerRadius(CornerRadius.sm)
        .accessibilityElement(children: .combine)
        .accessibilityLabel("\(label): \(value) \(unit)")
    }
}

// MARK: - Loading State

struct PlanWidgetLoadingView: View {
    var body: some View {
        VStack(alignment: .leading, spacing: Spacing.md) {
            // Header
            HStack {
                Image(systemName: "target")
                    .font(.system(size: IconSize.md))
                    .foregroundColor(.primaryColor)

                Text("Today's Targets")
                    .font(.titleSmall)
                    .foregroundColor(.textPrimary)

                Spacer()
            }

            // Loading skeleton
            HStack(spacing: Spacing.md) {
                ForEach(0..<3) { _ in
                    VStack(spacing: Spacing.xs) {
                        Circle()
                            .fill(Color.gray.opacity(0.2))
                            .frame(width: IconSize.sm, height: IconSize.sm)

                        RoundedRectangle(cornerRadius: CornerRadius.xs)
                            .fill(Color.gray.opacity(0.2))
                            .frame(height: 20)

                        RoundedRectangle(cornerRadius: CornerRadius.xs)
                            .fill(Color.gray.opacity(0.2))
                            .frame(height: 14)
                    }
                    .frame(maxWidth: .infinity)
                }
            }
        }
        .padding(Spacing.md)
        .background(Color.backgroundPrimary)
        .cornerRadius(CornerRadius.md)
        .cardShadow()
        .redacted(reason: .placeholder)
        .shimmering()
    }
}

// MARK: - Error State

struct PlanWidgetErrorView: View {
    let error: PlanError
    let onRetry: () -> Void

    var body: some View {
        VStack(spacing: Spacing.md) {
            HStack {
                Image(systemName: "exclamationmark.triangle.fill")
                    .font(.system(size: IconSize.md))
                    .foregroundColor(.warningColor)

                Text("Unable to Load Plan")
                    .font(.titleSmall)
                    .foregroundColor(.textPrimary)

                Spacer()
            }

            Text(error.localizedDescription)
                .font(.bodySmall)
                .foregroundColor(.textSecondary)
                .frame(maxWidth: .infinity, alignment: .leading)

            Button(action: onRetry) {
                HStack {
                    Image(systemName: "arrow.clockwise")
                        .font(.system(size: IconSize.xs))
                    Text("Try Again")
                        .font(.labelLarge)
                }
                .foregroundColor(.primaryColor)
            }
            .frame(maxWidth: .infinity, alignment: .leading)
        }
        .padding(Spacing.md)
        .background(Color.backgroundPrimary)
        .cornerRadius(CornerRadius.md)
        .cardShadow()
    }
}

// MARK: - Shimmer Effect

extension View {
    func shimmering() -> some View {
        self.modifier(ShimmerModifier())
    }
}

struct ShimmerModifier: ViewModifier {
    @State private var phase: CGFloat = 0

    func body(content: Content) -> some View {
        content
            .overlay(
                LinearGradient(
                    gradient: Gradient(colors: [
                        .clear,
                        .white.opacity(0.3),
                        .clear
                    ]),
                    startPoint: .leading,
                    endPoint: .trailing
                )
                .offset(x: phase)
                .mask(content)
            )
            .onAppear {
                withAnimation(Animation.linear(duration: 1.5).repeatForever(autoreverses: false)) {
                    phase = 300
                }
            }
    }
}

// MARK: - Preview

#Preview("Loaded") {
    PlanWidgetView(
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
            recomputed: false,
            previousTargets: nil
        )
    )
    .padding()
}

#Preview("Loading") {
    PlanWidgetLoadingView()
        .padding()
}

#Preview("Error") {
    PlanWidgetErrorView(
        error: .networkError("Connection failed"),
        onRetry: {}
    )
    .padding()
}
