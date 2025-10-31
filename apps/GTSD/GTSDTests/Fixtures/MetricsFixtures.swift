//
//  MetricsFixtures.swift
//  GTSDTests
//
//  Created by Claude on 2025-10-28.
//  Test fixtures for MetricsSummary feature
//

import Foundation
@testable import GTSD

/// Test fixtures for metrics testing
enum MetricsFixtures {

    // MARK: - Dates

    static let fixedDate = Date(timeIntervalSince1970: 1698768000) // 2023-10-31 16:00:00 UTC
    static let acknowledgedDate = Date(timeIntervalSince1970: 1698768600) // 10 minutes later

    // MARK: - Health Metrics

    /// Valid health metrics with normal BMI
    static let validHealthMetrics = HealthMetrics(
        bmi: 24.5,
        bmr: 1650,
        tdee: 2475,
        computedAt: fixedDate,
        version: 1
    )

    /// Health metrics for underweight user
    static let underweightMetrics = HealthMetrics(
        bmi: 17.5,
        bmr: 1400,
        tdee: 2100,
        computedAt: fixedDate,
        version: 1
    )

    /// Health metrics for overweight user
    static let overweightMetrics = HealthMetrics(
        bmi: 27.8,
        bmr: 1850,
        tdee: 2775,
        computedAt: fixedDate,
        version: 1
    )

    /// Health metrics for obese user
    static let obeseMetrics = HealthMetrics(
        bmi: 32.1,
        bmr: 2000,
        tdee: 3000,
        computedAt: fixedDate,
        version: 1
    )

    // MARK: - Explanations

    /// Valid explanations for normal BMI
    static let validExplanations = MetricsExplanations(
        bmi: "Your BMI of 24.5 is in the normal range (18.5-24.9). This indicates a healthy weight for your height.",
        bmr: "Your Basal Metabolic Rate is 1,650 calories per day. This is the energy your body needs at rest to maintain vital functions like breathing, circulation, and cell production.",
        tdee: "Your Total Daily Energy Expenditure is 2,475 calories per day. This includes your BMR plus calories burned through daily activities and exercise."
    )

    /// Explanations for underweight user
    static let underweightExplanations = MetricsExplanations(
        bmi: "Your BMI of 17.5 is below the normal range (18.5-24.9). You may want to consider gaining weight in a healthy way.",
        bmr: "Your Basal Metabolic Rate is 1,400 calories per day.",
        tdee: "Your Total Daily Energy Expenditure is 2,100 calories per day."
    )

    /// Explanations for overweight user
    static let overweightExplanations = MetricsExplanations(
        bmi: "Your BMI of 27.8 is in the overweight range (25.0-29.9). Consider a healthy weight loss plan.",
        bmr: "Your Basal Metabolic Rate is 1,850 calories per day.",
        tdee: "Your Total Daily Energy Expenditure is 2,775 calories per day."
    )

    // MARK: - Acknowledgements

    /// Valid acknowledgement
    static let validAcknowledgement = Acknowledgement(
        acknowledgedAt: acknowledgedDate,
        version: 1
    )

    // MARK: - Summary Data

    /// Unacknowledged summary data
    static let unacknowledgedSummaryData = MetricsSummaryData(
        metrics: validHealthMetrics,
        explanations: validExplanations,
        acknowledged: false,
        acknowledgement: nil
    )

    /// Acknowledged summary data
    static let acknowledgedSummaryData = MetricsSummaryData(
        metrics: validHealthMetrics,
        explanations: validExplanations,
        acknowledged: true,
        acknowledgement: validAcknowledgement
    )

    /// Summary data for underweight user
    static let underweightSummaryData = MetricsSummaryData(
        metrics: underweightMetrics,
        explanations: underweightExplanations,
        acknowledged: false,
        acknowledgement: nil
    )

    /// Summary data for overweight user
    static let overweightSummaryData = MetricsSummaryData(
        metrics: overweightMetrics,
        explanations: overweightExplanations,
        acknowledged: false,
        acknowledgement: nil
    )

    // MARK: - API Responses

    /// Successful metrics summary response
    static let successfulSummaryResponse = MetricsSummaryResponse(
        success: true,
        data: unacknowledgedSummaryData
    )

    /// Successful acknowledgement response
    static let successfulAcknowledgeResponse = AcknowledgeResponse(
        success: true,
        data: AcknowledgeResponseData(
            acknowledged: true,
            acknowledgement: validAcknowledgement
        )
    )

    /// Failed acknowledgement response
    static let failedAcknowledgeResponse = AcknowledgeResponse(
        success: false,
        data: AcknowledgeResponseData(
            acknowledged: false,
            acknowledgement: validAcknowledgement
        )
    )

    // MARK: - JSON Data

    /// Valid JSON for health metrics
    static let healthMetricsJSON = """
    {
        "bmi": 24.5,
        "bmr": 1650,
        "tdee": 2475,
        "computedAt": "2023-10-31T16:00:00.000Z",
        "version": 1
    }
    """.data(using: .utf8)!

    /// Valid JSON for metrics summary
    static let summaryDataJSON = """
    {
        "metrics": {
            "bmi": 24.5,
            "bmr": 1650,
            "tdee": 2475,
            "computedAt": "2023-10-31T16:00:00.000Z",
            "version": 1
        },
        "explanations": {
            "bmi": "Your BMI of 24.5 is in the normal range.",
            "bmr": "Your BMR is 1,650 calories per day.",
            "tdee": "Your TDEE is 2,475 calories per day."
        },
        "acknowledged": false,
        "acknowledgement": null
    }
    """.data(using: .utf8)!

    /// Valid JSON for acknowledged metrics
    static let acknowledgedDataJSON = """
    {
        "metrics": {
            "bmi": 24.5,
            "bmr": 1650,
            "tdee": 2475,
            "computedAt": "2023-10-31T16:00:00.000Z",
            "version": 1
        },
        "explanations": {
            "bmi": "Your BMI of 24.5 is in the normal range.",
            "bmr": "Your BMR is 1,650 calories per day.",
            "tdee": "Your TDEE is 2,475 calories per day."
        },
        "acknowledged": true,
        "acknowledgement": {
            "acknowledgedAt": "2023-10-31T16:10:00.000Z",
            "version": 1
        }
    }
    """.data(using: .utf8)!

    /// Valid JSON for acknowledgement response
    static let acknowledgeResponseJSON = """
    {
        "success": true,
        "data": {
            "acknowledged": true,
            "acknowledgement": {
                "acknowledgedAt": "2023-10-31T16:10:00.000Z",
                "version": 1
            }
        }
    }
    """.data(using: .utf8)!

    // MARK: - Helper Methods

    /// Create custom metrics with specific values
    static func createMetrics(
        bmi: Double = 24.5,
        bmr: Int = 1650,
        tdee: Int = 2475,
        version: Int = 1
    ) -> HealthMetrics {
        return HealthMetrics(
            bmi: bmi,
            bmr: bmr,
            tdee: tdee,
            computedAt: fixedDate,
            version: version
        )
    }

    /// Create custom summary data
    static func createSummaryData(
        metrics: HealthMetrics = validHealthMetrics,
        explanations: MetricsExplanations = validExplanations,
        acknowledged: Bool = false,
        acknowledgement: Acknowledgement? = nil
    ) -> MetricsSummaryData {
        return MetricsSummaryData(
            metrics: metrics,
            explanations: explanations,
            acknowledged: acknowledged,
            acknowledgement: acknowledgement
        )
    }

    /// Create custom acknowledgement response
    static func createAcknowledgeResponse(
        success: Bool = true,
        acknowledged: Bool = true
    ) -> AcknowledgeResponse {
        return AcknowledgeResponse(
            success: success,
            data: AcknowledgeResponseData(
                acknowledged: acknowledged,
                acknowledgement: validAcknowledgement
            )
        )
    }
}
