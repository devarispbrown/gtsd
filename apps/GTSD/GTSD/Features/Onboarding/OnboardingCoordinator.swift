//
//  OnboardingCoordinator.swift
//  GTSD
//
//  Created by Claude on 2025-10-26.
//

import SwiftUI

struct OnboardingCoordinator: View {
    @StateObject private var viewModel = OnboardingViewModel()
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                // Progress Bar
                ProgressView(value: viewModel.progress)
                    .tint(.primaryColor)
                    .padding(.horizontal, Spacing.xl)
                    .padding(.vertical, Spacing.md)

                // Content
                TabView(selection: $viewModel.currentStep) {
                    WelcomeView(onContinue: viewModel.nextStep)
                        .tag(0)

                    AccountBasicsView(
                        onboardingData: $viewModel.onboardingData,
                        onNext: viewModel.nextStep
                    )
                    .tag(1)

                    HealthMetricsView(viewModel: viewModel)
                        .tag(2)

                    GoalsView(viewModel: viewModel)
                        .tag(3)

                    ReviewView(viewModel: viewModel)
                        .tag(4)
                }
                .tabViewStyle(.page(indexDisplayMode: .never))
                .animation(.smooth, value: viewModel.currentStep)

                // Navigation Buttons
                if viewModel.currentStep > 0 {
                    HStack(spacing: Spacing.md) {
                        if viewModel.currentStep < 4 {
                            GTSDButton("Back", style: .secondary) {
                                viewModel.previousStep()
                            }
                        }

                        if viewModel.currentStep < 4 {
                            GTSDButton(
                                "Next",
                                style: .primary,
                                isDisabled: !viewModel.canProceed
                            ) {
                                viewModel.nextStep()
                            }
                        } else {
                            GTSDButton(
                                "Complete",
                                style: .primary,
                                isLoading: viewModel.isLoading,
                                isDisabled: !viewModel.canProceed
                            ) {
                                _Concurrency.Task {
                                    await viewModel.completeOnboarding()
                                    // If there's an error, show alert (don't dismiss)
                                    // If summary loaded successfully, the sheet will show and handle dismissal
                                    // If no error and no summary, dismiss immediately
                                    if viewModel.errorMessage == nil && !viewModel.showMetricsSummary {
                                        dismiss()
                                    }
                                }
                            }
                        }
                    }
                    .padding(.horizontal, Spacing.xl)
                    .padding(.vertical, Spacing.md)
                }
            }
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("Skip") {
                        _Concurrency.Task {
                            await viewModel.skipOnboarding()
                            if viewModel.errorMessage == nil {
                                dismiss()
                            }
                        }
                    }
                    .foregroundColor(.textSecondary)
                    .disabled(viewModel.isLoading)
                }
            }
            .alert("Error", isPresented: .constant(viewModel.errorMessage != nil)) {
                Button("OK") {
                    viewModel.errorMessage = nil
                }
            } message: {
                Text(viewModel.errorMessage ?? "")
            }
            .sheet(isPresented: $viewModel.showMetricsSummary) {
                if let summary = viewModel.metricsSummary {
                    MetricsSummaryView(summary: summary) {
                        viewModel.showMetricsSummary = false
                        dismiss()
                    }
                }
            }
        }
    }
}

// MARK: - Preview

#Preview {
    OnboardingCoordinator()
}
