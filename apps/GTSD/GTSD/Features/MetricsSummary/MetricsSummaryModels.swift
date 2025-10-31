//
//  MetricsSummaryModels.swift
//  GTSD
//
//  Created by Claude on 2025-10-28.
//

import Foundation

// MARK: - Health Metrics

/// Health metrics computed by the backend (BMI, BMR, TDEE)
struct HealthMetrics: Codable, Sendable, Equatable {
    let bmi: Double
    let bmr: Int
    let tdee: Int
    let computedAtString: String  // Store original ISO8601 string
    let version: Int

    enum CodingKeys: String, CodingKey {
        case bmi, bmr, tdee, computedAt, version
    }

    // Computed property to get Date from string when needed
    var computedAt: Date {
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        return formatter.date(from: computedAtString) ?? Date()
    }

    // Memberwise initializer
    init(bmi: Double, bmr: Int, tdee: Int, computedAt: Date, version: Int) {
        self.bmi = bmi
        self.bmr = bmr
        self.tdee = tdee
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        self.computedAtString = formatter.string(from: computedAt)
        self.version = version
    }

    nonisolated init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        self.bmi = try container.decode(Double.self, forKey: .bmi)
        self.bmr = try container.decode(Int.self, forKey: .bmr)
        self.tdee = try container.decode(Int.self, forKey: .tdee)
        self.version = try container.decode(Int.self, forKey: .version)

        // Store the ISO8601 string directly - no Date conversion
        self.computedAtString = try container.decode(String.self, forKey: .computedAt)
    }

    nonisolated func encode(to encoder: Encoder) throws {
        var container = encoder.container(keyedBy: CodingKeys.self)
        try container.encode(bmi, forKey: .bmi)
        try container.encode(bmr, forKey: .bmr)
        try container.encode(tdee, forKey: .tdee)
        try container.encode(version, forKey: .version)

        // Encode the original string - no Date conversion
        try container.encode(computedAtString, forKey: .computedAt)
    }
}

// MARK: - Metrics Explanations

/// Human-readable explanations for each metric
struct MetricsExplanations: Codable, Sendable, Equatable {
    let bmi: String
    let bmr: String
    let tdee: String
}

// MARK: - Acknowledgement

/// Record of user acknowledgement of metrics
struct Acknowledgement: Codable, Sendable, Equatable {
    let acknowledgedAt: Date
    let version: Int

    enum CodingKeys: String, CodingKey {
        case acknowledgedAt, version
    }

    // Memberwise initializer
    init(acknowledgedAt: Date, version: Int) {
        self.acknowledgedAt = acknowledgedAt
        self.version = version
    }

    nonisolated init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        self.version = try container.decode(Int.self, forKey: .version)

        // Decode date from ISO8601 string
        if let dateString = try? container.decode(String.self, forKey: .acknowledgedAt) {
            let formatter = ISO8601DateFormatter()
            formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
            self.acknowledgedAt = formatter.date(from: dateString) ?? Date()
        } else {
            self.acknowledgedAt = try container.decode(Date.self, forKey: .acknowledgedAt)
        }
    }

    nonisolated func encode(to encoder: Encoder) throws {
        var container = encoder.container(keyedBy: CodingKeys.self)
        try container.encode(version, forKey: .version)

        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        try container.encode(formatter.string(from: acknowledgedAt), forKey: .acknowledgedAt)
    }
}

// MARK: - Metrics Summary Data

/// Complete metrics summary data from API
struct MetricsSummaryData: Codable, Sendable, Equatable {
    let metrics: HealthMetrics
    let explanations: MetricsExplanations
    var acknowledged: Bool
    let acknowledgement: Acknowledgement?
}

// MARK: - API Response

/// API response wrapper for metrics summary
nonisolated struct MetricsSummaryResponse: Codable, Sendable {
    let success: Bool
    let data: MetricsSummaryData
}

// MARK: - Acknowledge Request

/// Request body for acknowledging metrics
struct AcknowledgeMetricsRequest: Codable, Sendable {
    let version: Int
    let metricsComputedAt: String  // Store as ISO8601 string to preserve exact value

    enum CodingKeys: String, CodingKey {
        case version, metricsComputedAt
    }
}

// MARK: - Acknowledge Response

/// API response for acknowledgement
nonisolated struct AcknowledgeResponse: Codable, Sendable {
    let success: Bool
    let data: AcknowledgeResponseData
}

nonisolated struct AcknowledgeResponseData: Codable, Sendable {
    let acknowledged: Bool
    let acknowledgement: Acknowledgement
}

// MARK: - Metrics Error

/// Errors specific to metrics operations
enum MetricsError: LocalizedError, Sendable {
    case notFound
    case networkError(Error)
    case invalidResponse
    case serverError(String)
    case alreadyAcknowledged

    var errorDescription: String? {
        switch self {
        case .notFound:
            return "No metrics available yet. Please complete your profile first."
        case .networkError:
            return "Network connection error. Please check your internet connection."
        case .invalidResponse:
            return "Unable to process server response. Please try again."
        case .serverError(let message):
            return message
        case .alreadyAcknowledged:
            return "Metrics have already been acknowledged."
        }
    }
}

// MARK: - Helper Extensions

extension HealthMetrics {
    /// BMI category classification
    var bmiCategory: String {
        switch bmi {
        case ..<18.5:
            return "Underweight"
        case 18.5..<25.0:
            return "Normal"
        case 25.0..<30.0:
            return "Overweight"
        default:
            return "Obese"
        }
    }

    /// Formatted BMI string
    var bmiFormatted: String {
        String(format: "%.1f", bmi)
    }

    /// Formatted BMR string
    var bmrFormatted: String {
        "\(bmr) cal/day"
    }

    /// Formatted TDEE string
    var tdeeFormatted: String {
        "\(tdee) cal/day"
    }
}
