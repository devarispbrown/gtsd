//
//  HowItWorksSummary.swift
//  GTSD
//
//  Created by Claude on 2025-10-27.
//

import Foundation

// MARK: - API Response Wrapper

struct HowItWorksSummaryResponse: Codable, Sendable {
    let success: Bool
    let data: HowItWorksSummary
}

// MARK: - How It Works Summary Models

struct HowItWorksSummary: Codable, Sendable {
    let user: SummaryUser
    let currentMetrics: CurrentMetrics
    let goals: Goals
    let calculations: Calculations
    let projection: Projection
    let howItWorks: HowItWorks
}

struct SummaryUser: Codable, Sendable {
    let name: String
    let email: String
}

struct CurrentMetrics: Codable, Sendable {
    let age: Int?
    let gender: String?
    let weight: Double
    let height: Double
    let activityLevel: String?
}

struct Goals: Codable, Sendable {
    let primaryGoal: String
    let targetWeight: Double
    let targetDate: Date?
}

struct Calculations: Codable, Sendable {
    let bmr: BMRCalculation
    let tdee: TDEECalculation
    let targets: Targets
}

struct BMRCalculation: Codable, Sendable {
    let value: Int
    let explanation: String
    let formula: String
}

struct TDEECalculation: Codable, Sendable {
    let value: Int
    let explanation: String
    let activityMultiplier: Double
}

struct Targets: Codable, Sendable {
    let calories: Target
    let protein: Target
    let water: Target
}

struct Target: Codable, Sendable {
    let value: Int
    let unit: String?
    let explanation: String
}

struct Projection: Codable, Sendable {
    let startWeight: Double
    let targetWeight: Double
    let weeklyRate: Double
    let estimatedWeeks: Int
    let projectedDate: Date?
    let explanation: String
}

struct HowItWorks: Codable, Sendable {
    let step1: HowItWorksStep
    let step2: HowItWorksStep
    let step3: HowItWorksStep
    let step4: HowItWorksStep
}

struct HowItWorksStep: Codable, Sendable {
    let title: String
    let description: String
}

// MARK: - Codable Extensions

extension HowItWorksSummaryResponse {
    enum CodingKeys: String, CodingKey {
        case success
        case data
    }

    nonisolated init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        self.success = try container.decode(Bool.self, forKey: .success)
        self.data = try container.decode(HowItWorksSummary.self, forKey: .data)
    }

    nonisolated func encode(to encoder: Encoder) throws {
        var container = encoder.container(keyedBy: CodingKeys.self)
        try container.encode(success, forKey: .success)
        try container.encode(data, forKey: .data)
    }
}

extension Goals {
    enum CodingKeys: String, CodingKey {
        case primaryGoal
        case targetWeight
        case targetDate
    }

    nonisolated init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        self.primaryGoal = try container.decode(String.self, forKey: .primaryGoal)
        self.targetWeight = try container.decode(Double.self, forKey: .targetWeight)

        // Try to decode targetDate as Date, fallback to nil if parsing fails
        if let dateString = try? container.decode(String.self, forKey: .targetDate) {
            let formatter = ISO8601DateFormatter()
            self.targetDate = formatter.date(from: dateString)
        } else {
            self.targetDate = nil
        }
    }

    nonisolated func encode(to encoder: Encoder) throws {
        var container = encoder.container(keyedBy: CodingKeys.self)
        try container.encode(primaryGoal, forKey: .primaryGoal)
        try container.encode(targetWeight, forKey: .targetWeight)

        if let date = targetDate {
            let formatter = ISO8601DateFormatter()
            try container.encode(formatter.string(from: date), forKey: .targetDate)
        }
    }
}

extension Projection {
    enum CodingKeys: String, CodingKey {
        case startWeight
        case targetWeight
        case weeklyRate
        case estimatedWeeks
        case projectedDate
        case explanation
    }

    nonisolated init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        self.startWeight = try container.decode(Double.self, forKey: .startWeight)
        self.targetWeight = try container.decode(Double.self, forKey: .targetWeight)
        self.weeklyRate = try container.decode(Double.self, forKey: .weeklyRate)
        self.estimatedWeeks = try container.decode(Int.self, forKey: .estimatedWeeks)
        self.explanation = try container.decode(String.self, forKey: .explanation)

        // Try to decode projectedDate as Date, fallback to nil if parsing fails
        if let dateString = try? container.decode(String.self, forKey: .projectedDate) {
            let formatter = ISO8601DateFormatter()
            self.projectedDate = formatter.date(from: dateString)
        } else {
            self.projectedDate = nil
        }
    }

    nonisolated func encode(to encoder: Encoder) throws {
        var container = encoder.container(keyedBy: CodingKeys.self)
        try container.encode(startWeight, forKey: .startWeight)
        try container.encode(targetWeight, forKey: .targetWeight)
        try container.encode(weeklyRate, forKey: .weeklyRate)
        try container.encode(estimatedWeeks, forKey: .estimatedWeeks)
        try container.encode(explanation, forKey: .explanation)

        if let date = projectedDate {
            let formatter = ISO8601DateFormatter()
            try container.encode(formatter.string(from: date), forKey: .projectedDate)
        }
    }
}

// MARK: - Helper Extensions

extension Goals {
    var goalDisplayName: String {
        switch primaryGoal {
        case "lose_weight": return "lose weight"
        case "gain_muscle": return "gain muscle"
        case "maintain": return "maintain weight"
        case "improve_health": return "improve health"
        default: return primaryGoal.replacingOccurrences(of: "_", with: " ")
        }
    }
}

extension CurrentMetrics {
    var activityLevelDisplayName: String? {
        guard let activityLevel = activityLevel else { return nil }
        switch activityLevel {
        case "sedentary": return "sedentary"
        case "lightly_active": return "lightly active"
        case "moderately_active": return "moderately active"
        case "very_active": return "very active"
        case "extremely_active": return "extremely active"
        default: return activityLevel.replacingOccurrences(of: "_", with: " ")
        }
    }
}
