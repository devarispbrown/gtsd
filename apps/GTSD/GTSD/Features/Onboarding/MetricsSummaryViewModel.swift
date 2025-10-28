//
//  MetricsSummaryViewModel.swift
//  GTSD
//
//  Created by Claude on 2025-10-27.
//

import Foundation
import SwiftUI
import Combine

@MainActor
final class MetricsSummaryViewModel: ObservableObject {
    @Published var summary: HowItWorksSummary?
    @Published var isLoading = false
    @Published var errorMessage: String?
    @Published var expandedSections: Set<String> = []

    private let apiClient: any APIClientProtocol

    init(apiClient: any APIClientProtocol = ServiceContainer.shared.apiClient) {
        self.apiClient = apiClient
    }

    func fetchSummary() async {
        isLoading = true
        errorMessage = nil

        do {
            let response: HowItWorksSummaryResponse = try await apiClient.request(.getHowItWorksSummary)
            summary = response.data
            Logger.info("Metrics summary fetched successfully")
        } catch let error as APIError {
            Logger.error("Failed to fetch metrics summary: \(error)")
            switch error {
            case .httpError(_, let message):
                errorMessage = message ?? "Failed to load metrics summary"
            case .networkError:
                errorMessage = "Network error. Please check your connection."
            case .decodingError:
                errorMessage = "Unable to process response."
            default:
                errorMessage = "An error occurred."
            }
        } catch {
            Logger.error("Failed to fetch metrics summary: \(error)")
            errorMessage = "An unexpected error occurred."
        }

        isLoading = false
    }

    func toggleSection(_ section: String) {
        if expandedSections.contains(section) {
            expandedSections.remove(section)
        } else {
            expandedSections.insert(section)
        }
    }

    func isSectionExpanded(_ section: String) -> Bool {
        expandedSections.contains(section)
    }
}
