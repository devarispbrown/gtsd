//
//  PlanModels.swift
//  GTSD
//
//  Created by Claude on 2025-10-27.
//  Updated: 2025-10-28 - Added optional fields for timeline projection
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

struct ComputedTargets: Codable, Sendable, Equatable {
    let bmr: Int
    let tdee: Int
    let calorieTarget: Int
    let proteinTarget: Int
    let waterTarget: Int
    let weeklyRate: Double

    // Optional fields for timeline projection (if user has target weight set)
    let estimatedWeeks: Int?
    let projectedDate: Date?

    // Custom coding keys to handle optional fields
    enum CodingKeys: String, CodingKey {
        case bmr, tdee, calorieTarget, proteinTarget, waterTarget, weeklyRate
        case estimatedWeeks, projectedDate
    }

    init(
        bmr: Int,
        tdee: Int,
        calorieTarget: Int,
        proteinTarget: Int,
        waterTarget: Int,
        weeklyRate: Double,
        estimatedWeeks: Int? = nil,
        projectedDate: Date? = nil
    ) {
        self.bmr = bmr
        self.tdee = tdee
        self.calorieTarget = calorieTarget
        self.proteinTarget = proteinTarget
        self.waterTarget = waterTarget
        self.weeklyRate = weeklyRate
        self.estimatedWeeks = estimatedWeeks
        self.projectedDate = projectedDate
    }

    nonisolated init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        self.bmr = try container.decode(Int.self, forKey: .bmr)
        self.tdee = try container.decode(Int.self, forKey: .tdee)
        self.calorieTarget = try container.decode(Int.self, forKey: .calorieTarget)
        self.proteinTarget = try container.decode(Int.self, forKey: .proteinTarget)
        self.waterTarget = try container.decode(Int.self, forKey: .waterTarget)
        self.weeklyRate = try container.decode(Double.self, forKey: .weeklyRate)

        // Decode optional fields
        self.estimatedWeeks = try container.decodeIfPresent(Int.self, forKey: .estimatedWeeks)
        self.projectedDate = try container.decodeIfPresent(Date.self, forKey: .projectedDate)
    }

    /// Validate that targets are within reasonable ranges
    func isValid() -> Bool {
        guard bmr > 0,
              tdee > bmr,
              calorieTarget > 0,
              proteinTarget > 0,
              waterTarget > 0 else {
            return false
        }

        // Check ranges match backend validation
        guard bmr >= 500 && bmr <= 5000,
              tdee >= 500 && tdee <= 10000,
              calorieTarget >= 500 && calorieTarget <= 10000,
              proteinTarget >= 20 && proteinTarget <= 500,
              waterTarget >= 500 && waterTarget <= 10000 else {
            return false
        }

        return true
    }

    /// Calculate calorie deficit/surplus
    var calorieAdjustment: Int {
        return tdee - calorieTarget
    }

    /// Check if this is a deficit (weight loss) or surplus (muscle gain) plan
    var isDeficit: Bool {
        return calorieAdjustment > 0
    }
}

// MARK: - Why It Works

struct WhyItWorks: Codable, Sendable {
    let bmr: BMRExplanation
    let tdee: TDEEExplanation
    let calorieTarget: CalorieTargetExplanation
    let proteinTarget: ProteinTargetExplanation
    let waterTarget: WaterTargetExplanation
    let timeline: TimelineExplanation
}

struct BMRExplanation: Codable, Sendable {
    let title: String
    let explanation: String
    let formula: String
}

struct TDEEExplanation: Codable, Sendable {
    let title: String
    let explanation: String
    let activityMultiplier: Double
    let metric: Double
}

struct CalorieTargetExplanation: Codable, Sendable {
    let title: String
    let explanation: String
    let deficit: Int
    let metric: Int
}

struct ProteinTargetExplanation: Codable, Sendable {
    let title: String
    let explanation: String
    let gramsPerKg: Double
    let metric: Double
}

struct WaterTargetExplanation: Codable, Sendable {
    let title: String
    let explanation: String
    let mlPerKg: Int
    let metric: Int
}

struct TimelineExplanation: Codable, Sendable {
    let title: String
    let explanation: String
    let weeklyRate: Double
    let estimatedWeeks: Int
    let metric: Double
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

extension PlanGenerationData {
    /// Validate that all plan data is valid
    func isValid() -> Bool {
        guard targets.isValid() else {
            return false
        }

        guard plan.startDate < plan.endDate else {
            return false
        }

        return true
    }

    /// Check if targets changed significantly compared to previous
    func hasSignificantChanges() -> Bool {
        guard let previous = previousTargets else {
            return false
        }

        let caloriesDiff = abs(targets.calorieTarget - previous.calorieTarget)
        let proteinDiff = abs(targets.proteinTarget - previous.proteinTarget)

        return caloriesDiff > 50 || proteinDiff > 10
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

// MARK: - Plan Error

enum PlanError: LocalizedError, Equatable {
    // Business errors
    case notFound
    case onboardingIncomplete
    case invalidInput(String)
    case invalidResponse(String)

    // Network errors
    case networkError(String)
    case timeout
    case noInternetConnection

    // Server errors
    case serverError(Int, String)
    case rateLimitExceeded(retryAfter: TimeInterval?)
    case maintenanceMode

    // Validation errors
    case invalidTargets(String)
    case staleData

    // Unknown
    case unknown(String)

    var errorDescription: String? {
        switch self {
        case .notFound:
            return "No plan found. Please complete onboarding first."
        case .onboardingIncomplete:
            return "Please complete onboarding to generate your personalized plan."
        case .invalidInput(let reason):
            return "Invalid input: \(reason)"
        case .invalidResponse(let reason):
            return "Invalid response from server: \(reason)"
        case .networkError(let message):
            return "Network error: \(message)"
        case .timeout:
            return "Request timed out. Please try again."
        case .noInternetConnection:
            return "No internet connection. Please check your network and try again."
        case .serverError(let code, let message):
            return "Server error (\(code)): \(message)"
        case .rateLimitExceeded(let retryAfter):
            if let retryAfter = retryAfter {
                return "Too many requests. Please try again in \(Int(retryAfter)) seconds."
            }
            return "Too many requests. Please try again later."
        case .maintenanceMode:
            return "Service is temporarily unavailable for maintenance. Please try again later."
        case .invalidTargets(let reason):
            return "Invalid health targets received: \(reason)"
        case .staleData:
            return "Data is out of date. Please refresh."
        case .unknown(let message):
            return "An error occurred: \(message)"
        }
    }

    var recoverySuggestion: String? {
        switch self {
        case .noInternetConnection:
            return "Check your WiFi or cellular connection"
        case .timeout:
            return "Try again or check your connection"
        case .rateLimitExceeded:
            return "Wait a moment before trying again"
        case .serverError(let code, _) where (500...599).contains(code):
            return "This is a temporary issue. Please try again in a few minutes."
        case .onboardingIncomplete:
            return "Complete the onboarding process to continue"
        default:
            return nil
        }
    }

    var isRetryable: Bool {
        switch self {
        case .networkError, .timeout, .noInternetConnection, .serverError:
            return true
        case .rateLimitExceeded:
            return true
        default:
            return false
        }
    }

    // Equatable conformance
    static func == (lhs: PlanError, rhs: PlanError) -> Bool {
        switch (lhs, rhs) {
        case (.notFound, .notFound),
             (.onboardingIncomplete, .onboardingIncomplete),
             (.timeout, .timeout),
             (.noInternetConnection, .noInternetConnection),
             (.maintenanceMode, .maintenanceMode),
             (.staleData, .staleData):
            return true
        case (.invalidInput(let a), .invalidInput(let b)),
             (.invalidResponse(let a), .invalidResponse(let b)),
             (.networkError(let a), .networkError(let b)),
             (.invalidTargets(let a), .invalidTargets(let b)),
             (.unknown(let a), .unknown(let b)):
            return a == b
        case (.serverError(let code1, let msg1), .serverError(let code2, let msg2)):
            return code1 == code2 && msg1 == msg2
        case (.rateLimitExceeded(let a), .rateLimitExceeded(let b)):
            return a == b
        default:
            return false
        }
    }
}
