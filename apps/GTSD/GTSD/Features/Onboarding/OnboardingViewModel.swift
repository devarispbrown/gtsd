//
//  OnboardingViewModel.swift
//  GTSD
//
//  Created by Claude on 2025-10-26.
//

import Foundation
import Combine
import SwiftUI

@MainActor
class OnboardingViewModel: ObservableObject {
    @Published var onboardingData = OnboardingData()
    @Published var currentStep: Int = 0
    @Published var isLoading: Bool = false
    @Published var errorMessage: String?
    @Published var showMetricsSummary: Bool = false
    @Published var metricsSummary: HowItWorksSummary?

    private let apiClient: any APIClientProtocol
    private let authService: any AuthenticationServiceProtocol
    private let totalSteps = 5

    init(
        apiClient: any APIClientProtocol = ServiceContainer.shared.apiClient,
        authService: any AuthenticationServiceProtocol = ServiceContainer.shared.authService
    ) {
        self.apiClient = apiClient
        self.authService = authService
    }

    var progress: Double {
        Double(currentStep) / Double(totalSteps)
    }

    var canProceed: Bool {
        switch currentStep {
        case 0: // Welcome
            return true
        case 1: // Account Basics
            return onboardingData.dateOfBirth != nil
        case 2: // Health Metrics
            return onboardingData.currentWeight != nil &&
                   onboardingData.height != nil &&
                   onboardingData.gender != nil
        case 3: // Goals
            return onboardingData.targetWeight != nil &&
                   onboardingData.targetDate != nil &&
                   onboardingData.primaryGoal != nil &&
                   onboardingData.activityLevel != nil
        case 4: // Review
            return true
        default:
            return false
        }
    }

    func nextStep() {
        if currentStep < totalSteps - 1 {
            withAnimation {
                currentStep += 1
            }
        }
    }

    func previousStep() {
        if currentStep > 0 {
            withAnimation {
                currentStep -= 1
            }
        }
    }

    func completeOnboarding() async {
        guard let currentWeight = onboardingData.currentWeight,
              let height = onboardingData.height,
              let dateOfBirth = onboardingData.dateOfBirth,
              let gender = onboardingData.gender,
              let targetWeight = onboardingData.targetWeight,
              let targetDate = onboardingData.targetDate,
              let primaryGoal = onboardingData.primaryGoal,
              let activityLevel = onboardingData.activityLevel else {
            errorMessage = "Please complete all required fields"
            return
        }

        isLoading = true
        errorMessage = nil

        do {
            let isoFormatter = ISO8601DateFormatter()
            isoFormatter.formatOptions = [.withInternetDateTime]

            // Use customGender if gender is "other" and customGender is provided
            let genderValue: String
            if gender == .other, let customGender = onboardingData.customGender, !customGender.isEmpty {
                genderValue = customGender
            } else {
                genderValue = gender.rawValue
            }

            // Convert imperial units to metric for API
            // The app collects weight in pounds and height in inches
            // The API expects weight in kg and height in cm
            let currentWeightKg = UnitConversion.poundsToKilograms(currentWeight)
            let targetWeightKg = UnitConversion.poundsToKilograms(targetWeight)
            let heightCm = UnitConversion.inchesToCentimeters(height)

            Logger.info("Converting units - Current weight: \(currentWeight) lbs -> \(currentWeightKg) kg")
            Logger.info("Converting units - Target weight: \(targetWeight) lbs -> \(targetWeightKg) kg")
            Logger.info("Converting units - Height: \(height) in -> \(heightCm) cm")

            let request = CompleteOnboardingRequest(
                dateOfBirth: isoFormatter.string(from: dateOfBirth),
                gender: genderValue,
                primaryGoal: primaryGoal.rawValue,
                targetWeight: targetWeightKg,
                targetDate: isoFormatter.string(from: targetDate),
                activityLevel: activityLevel.rawValue,
                currentWeight: currentWeightKg,
                height: heightCm,
                dietaryPreferences: onboardingData.dietaryPreferences ?? [],
                allergies: onboardingData.allergies ?? [],
                mealsPerDay: onboardingData.mealsPerDay
            )

            let updatedUser: User = try await apiClient.request(.completeOnboarding(request))
            Logger.info("Onboarding completed successfully")

            // Update the current user in AuthenticationService
            await authService.updateCurrentUser(updatedUser)

            // Fetch metrics summary after successful onboarding
            await fetchMetricsSummary()
        } catch let error as APIError {
            Logger.error("Failed to complete onboarding: \(error)")
            // Extract user-friendly message from API error
            switch error {
            case .httpError(_, let message):
                errorMessage = message ?? "Failed to complete onboarding. Please try again."
            case .networkError:
                errorMessage = "Network error. Please check your connection and try again."
            case .decodingError:
                errorMessage = "Unable to process response. Please try again."
            default:
                errorMessage = "An error occurred. Please try again."
            }
        } catch {
            Logger.error("Failed to complete onboarding: \(error)")
            errorMessage = "An unexpected error occurred. Please try again."
        }

        isLoading = false
    }

    func skipOnboarding() async {
        isLoading = true
        errorMessage = nil

        do {
            // Call backend to mark onboarding as completed/skipped
            // This uses the same endpoint but with minimal/default data
            let defaultRequest = CompleteOnboardingRequest(
                dateOfBirth: ISO8601DateFormatter().string(from: Calendar.current.date(byAdding: .year, value: -25, to: Date()) ?? Date()),
                gender: "prefer_not_to_say",
                primaryGoal: "improve_health",
                targetWeight: 0,
                targetDate: ISO8601DateFormatter().string(from: Calendar.current.date(byAdding: .month, value: 3, to: Date()) ?? Date()),
                activityLevel: "moderately_active",
                currentWeight: 0,
                height: 0,
                dietaryPreferences: [],
                allergies: [],
                mealsPerDay: 3
            )

            let updatedUser: User = try await apiClient.request(.completeOnboarding(defaultRequest))
            Logger.info("Onboarding skipped successfully")

            // Update the current user in AuthenticationService
            await authService.updateCurrentUser(updatedUser)
        } catch let error as APIError {
            Logger.error("Failed to skip onboarding: \(error)")
            switch error {
            case .httpError(_, let message):
                errorMessage = message ?? "Failed to skip onboarding. Please try again."
            case .networkError:
                errorMessage = "Network error. Please check your connection and try again."
            case .decodingError:
                errorMessage = "Unable to process response. Please try again."
            default:
                errorMessage = "An error occurred. Please try again."
            }
        } catch {
            Logger.error("Failed to skip onboarding: \(error)")
            errorMessage = "An unexpected error occurred. Please try again."
        }

        isLoading = false
    }

    private func fetchMetricsSummary() async {
        do {
            Logger.info("Fetching metrics summary after onboarding completion")
            let response: HowItWorksSummaryResponse = try await apiClient.request(.getHowItWorksSummary)
            metricsSummary = response.data
            showMetricsSummary = true
            Logger.info("Metrics summary fetched successfully - showing modal")
        } catch {
            Logger.error("Failed to fetch metrics summary: \(error)")
            // Non-fatal error - user can still proceed without summary
            // Don't block onboarding completion
            // Set showMetricsSummary to false to allow dismissal
            showMetricsSummary = false
        }
    }
}
