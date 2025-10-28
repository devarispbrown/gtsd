//
//  PlanSummaryViewModel.swift
//  GTSD
//
//  Created by Claude on 2025-10-27.
//

import Foundation
import SwiftUI
import Combine

@MainActor
class PlanSummaryViewModel: ObservableObject {
    @Published var isLoading: Bool = false
    @Published var errorMessage: String?
    @Published var planData: PlanGenerationData?
    @Published var summaryData: HowItWorksSummary?
    @Published var bmiValue: Double?

    private let apiClient: any APIClientProtocol

    init(apiClient: any APIClientProtocol = ServiceContainer.shared.apiClient) {
        self.apiClient = apiClient
    }

    func fetchPlanSummary() async {
        isLoading = true
        errorMessage = nil

        do {
            Logger.info("Fetching plan summary data")

            // Fetch both plan data and summary data in parallel
            async let planResponse: PlanGenerationResponse = apiClient.request(.generatePlan(forceRecompute: false))
            async let summaryResponse: HowItWorksSummaryResponse = apiClient.request(.getHowItWorksSummary)

            let (plan, summary) = try await (planResponse, summaryResponse)

            planData = plan.data
            summaryData = summary.data

            // Calculate BMI if we have height and weight
            if let height = summaryData?.currentMetrics.height,
               let weight = summaryData?.currentMetrics.weight,
               height > 0 {
                bmiValue = calculateBMI(weight: weight, heightInInches: height)
            }

            Logger.info("Plan summary data fetched successfully")
        } catch let error as APIError {
            Logger.error("Failed to fetch plan summary: \(error)")
            switch error {
            case .httpError(_, let message):
                errorMessage = message ?? "Failed to load plan data. Please try again."
            case .networkError:
                errorMessage = "Network error. Please check your connection and try again."
            case .decodingError:
                errorMessage = "Unable to process plan data. Please try again."
            default:
                errorMessage = "An error occurred. Please try again."
            }
        } catch {
            Logger.error("Unexpected error fetching plan summary: \(error)")
            errorMessage = "An unexpected error occurred. Please try again."
        }

        isLoading = false
    }

    func refreshPlan() async {
        isLoading = true
        errorMessage = nil

        do {
            Logger.info("Forcing plan recomputation")

            let response: PlanGenerationResponse = try await apiClient.request(.generatePlan(forceRecompute: true))
            planData = response.data

            // Also refresh summary data
            let summaryResponse: HowItWorksSummaryResponse = try await apiClient.request(.getHowItWorksSummary)
            summaryData = summaryResponse.data

            // Recalculate BMI
            if let height = summaryData?.currentMetrics.height,
               let weight = summaryData?.currentMetrics.weight,
               height > 0 {
                bmiValue = calculateBMI(weight: weight, heightInInches: height)
            }

            Logger.info("Plan recomputed successfully")
        } catch let error as APIError {
            Logger.error("Failed to recompute plan: \(error)")
            switch error {
            case .httpError(_, let message):
                errorMessage = message ?? "Failed to refresh plan. Please try again."
            case .networkError:
                errorMessage = "Network error. Please check your connection and try again."
            case .decodingError:
                errorMessage = "Unable to process plan data. Please try again."
            default:
                errorMessage = "An error occurred. Please try again."
            }
        } catch {
            Logger.error("Unexpected error recomputing plan: \(error)")
            errorMessage = "An unexpected error occurred. Please try again."
        }

        isLoading = false
    }

    private func calculateBMI(weight: Double, heightInInches: Double) -> Double {
        // BMI = (weight in lbs / (height in inches)^2) * 703
        let bmi = (weight / (heightInInches * heightInInches)) * 703
        return bmi
    }

    var bmiCategory: String {
        guard let bmi = bmiValue else { return "Unknown" }

        switch bmi {
        case ..<18.5:
            return "Underweight"
        case 18.5..<25:
            return "Normal"
        case 25..<30:
            return "Overweight"
        default:
            return "Obese"
        }
    }

    var bmiCategoryColor: Color {
        guard let bmi = bmiValue else { return .gray }

        switch bmi {
        case ..<18.5:
            return .blue
        case 18.5..<25:
            return .green
        case 25..<30:
            return .orange
        default:
            return .red
        }
    }
}
