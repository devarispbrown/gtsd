//
//  PlanModels.swift
//  GTSD
//
//  Created by Claude on 2025-10-27.
//

import Foundation

// MARK: - Plan Generation Response

struct PlanGenerationResponse: Codable, Sendable {
    let success: Bool
    let data: PlanGenerationData
}

struct PlanGenerationData: Codable, Sendable {
    let plan: Plan
    let targets: ComputedTargets
    let whyItWorks: WhyItWorks
    let recomputed: Bool
    let previousTargets: ComputedTargets?
}

// MARK: - Plan

struct Plan: Codable, Identifiable, Sendable {
    let id: Int
    let userId: Int
    let name: String
    let description: String
    let startDate: Date
    let endDate: Date
    let status: String
}

// MARK: - Computed Targets

struct ComputedTargets: Codable, Sendable {
    let bmr: Int
    let tdee: Int
    let calorieTarget: Int
    let proteinTarget: Int
    let waterTarget: Int
    let weeklyRate: Double
}

// MARK: - Why It Works

struct WhyItWorks: Codable, Sendable {
    let calorieTarget: CalorieTargetExplanation
    let proteinTarget: ProteinTargetExplanation
    let waterTarget: WaterTargetExplanation
    let weeklyRate: WeeklyRateExplanation
}

struct CalorieTargetExplanation: Codable, Sendable {
    let title: String
    let explanation: String
    let science: String
}

struct ProteinTargetExplanation: Codable, Sendable {
    let title: String
    let explanation: String
    let science: String
}

struct WaterTargetExplanation: Codable, Sendable {
    let title: String
    let explanation: String
    let science: String
}

struct WeeklyRateExplanation: Codable, Sendable {
    let title: String
    let explanation: String
    let science: String
}

// MARK: - Codable Extensions

extension PlanGenerationResponse {
    enum CodingKeys: String, CodingKey {
        case success
        case data
    }

    nonisolated init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        self.success = try container.decode(Bool.self, forKey: .success)
        self.data = try container.decode(PlanGenerationData.self, forKey: .data)
    }

    nonisolated func encode(to encoder: Encoder) throws {
        var container = encoder.container(keyedBy: CodingKeys.self)
        try container.encode(success, forKey: .success)
        try container.encode(data, forKey: .data)
    }
}

extension Plan {
    enum CodingKeys: String, CodingKey {
        case id, userId, name, description, startDate, endDate, status
    }

    nonisolated init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        self.id = try container.decode(Int.self, forKey: .id)
        self.userId = try container.decode(Int.self, forKey: .userId)
        self.name = try container.decode(String.self, forKey: .name)
        self.description = try container.decode(String.self, forKey: .description)
        self.status = try container.decode(String.self, forKey: .status)

        // Decode dates from ISO8601 strings
        let dateFormatter = ISO8601DateFormatter()

        if let startDateString = try? container.decode(String.self, forKey: .startDate),
           let startDate = dateFormatter.date(from: startDateString) {
            self.startDate = startDate
        } else {
            self.startDate = Date()
        }

        if let endDateString = try? container.decode(String.self, forKey: .endDate),
           let endDate = dateFormatter.date(from: endDateString) {
            self.endDate = endDate
        } else {
            self.endDate = Date()
        }
    }

    nonisolated func encode(to encoder: Encoder) throws {
        var container = encoder.container(keyedBy: CodingKeys.self)
        try container.encode(id, forKey: .id)
        try container.encode(userId, forKey: .userId)
        try container.encode(name, forKey: .name)
        try container.encode(description, forKey: .description)
        try container.encode(status, forKey: .status)

        let dateFormatter = ISO8601DateFormatter()
        try container.encode(dateFormatter.string(from: startDate), forKey: .startDate)
        try container.encode(dateFormatter.string(from: endDate), forKey: .endDate)
    }
}

// MARK: - Helper Extensions

extension ComputedTargets {
    var bmiValue: Double? {
        // BMI calculation would require height, which we don't have here
        // This will be calculated separately in the view model
        return nil
    }
}
