//
//  PlanService.swift
//  GTSD
//
//  Created by Claude on 2025-10-28.
//

import Foundation

/// Service layer for plan generation and management
/// Handles API communication, error mapping, and response validation
actor PlanService {

    private let apiClient: any APIClientProtocol

    init(apiClient: any APIClientProtocol) {
        self.apiClient = apiClient
    }

    /// Generate or fetch existing plan
    /// - Parameter forceRecompute: If true, recalculate even if recent plan exists
    /// - Returns: Complete plan data with targets and educational content
    /// - Throws: PlanError for any failures
    func generatePlan(forceRecompute: Bool = false) async throws -> PlanGenerationData {
        Logger.log("Generating plan (forceRecompute: \(forceRecompute))", level: .info)

        return try await PerformanceMonitor.track(
            "Plan Generation",
            sla: PerformanceMonitor.SLA.apiRequest
        ) {
            do {
                let response: PlanGenerationResponse = try await apiClient.request(
                    .generatePlan(forceRecompute: forceRecompute)
                )

                guard response.success else {
                    Logger.error("Plan generation returned unsuccessful response")
                    throw PlanError.serverError(500, "Server returned unsuccessful response")
                }

                // Validate response data before returning
                guard response.data.isValid() else {
                    Logger.error("Invalid plan data received from server")
                    throw PlanError.invalidResponse("Data validation failed")
                }

                Logger.log("Plan generated successfully", level: .info)
                return response.data

            } catch let error as APIError {
                throw mapAPIError(error)
            } catch let error as PlanError {
                throw error
            } catch {
                Logger.error("Unexpected error generating plan: \(error)")
                throw PlanError.unknown(error.localizedDescription)
            }
        }
    }

    // MARK: - Private Helpers

    /// Map APIError to domain-specific PlanError
    private func mapAPIError(_ error: APIError) -> PlanError {
        switch error {
        case .httpError(let statusCode, let message):
            let errorMessage = message ?? "Unknown error"
            switch statusCode {
            case 400:
                if errorMessage.lowercased().contains("onboarding") {
                    return .onboardingIncomplete
                }
                return .invalidInput(errorMessage)
            case 404:
                return .notFound
            case 429:
                // Extract Retry-After header if available (would need to be passed from APIClient)
                return .rateLimitExceeded(retryAfter: nil)
            case 503:
                return .maintenanceMode
            case 500...599:
                return .serverError(statusCode, errorMessage)
            default:
                return .serverError(statusCode, errorMessage)
            }

        case .networkError(let underlyingError):
            let nsError = underlyingError as NSError

            if nsError.domain == NSURLErrorDomain {
                switch nsError.code {
                case NSURLErrorNotConnectedToInternet,
                     NSURLErrorNetworkConnectionLost:
                    return .noInternetConnection
                case NSURLErrorTimedOut:
                    return .timeout
                default:
                    return .networkError(underlyingError.localizedDescription)
                }
            }

            return .networkError(underlyingError.localizedDescription)

        case .decodingError(let underlyingError):
            return .invalidResponse(underlyingError.localizedDescription)

        case .unauthorized:
            return .serverError(401, "Unauthorized. Please log in again.")

        default:
            return .unknown(error.localizedDescription)
        }
    }
}

/// Protocol for testability
protocol PlanServiceProtocol: Actor {
    func generatePlan(forceRecompute: Bool) async throws -> PlanGenerationData
}

extension PlanService: PlanServiceProtocol {}
