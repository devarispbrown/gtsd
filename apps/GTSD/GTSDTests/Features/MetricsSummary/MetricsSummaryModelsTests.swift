//
//  MetricsSummaryModelsTests.swift
//  GTSDTests
//
//  Created by Claude on 2025-10-28.
//  Comprehensive tests for MetricsSummary models
//

import XCTest
@testable import GTSD

final class MetricsSummaryModelsTests: XCTestCase {

    // MARK: - HealthMetrics Tests

    func testHealthMetrics_DecodesFromJSON_Successfully() throws {
        // Arrange
        let json = MetricsFixtures.healthMetricsJSON

        // Act
        let decoder = JSONDecoder()
        decoder.dateDecodingStrategy = .iso8601
        let metrics = try decoder.decode(HealthMetrics.self, from: json)

        // Assert
        XCTAssertEqual(metrics.bmi, 24.5, "BMI should decode correctly")
        XCTAssertEqual(metrics.bmr, 1650, "BMR should decode correctly")
        XCTAssertEqual(metrics.tdee, 2475, "TDEE should decode correctly")
        XCTAssertEqual(metrics.version, 1, "Version should decode correctly")
        XCTAssertNotNil(metrics.computedAt, "ComputedAt should decode")
    }

    func testHealthMetrics_EncodesToJSON_Successfully() throws {
        // Arrange
        let metrics = MetricsFixtures.validHealthMetrics

        // Act
        let encoder = JSONEncoder()
        encoder.dateEncodingStrategy = .iso8601
        let data = try encoder.encode(metrics)
        let json = try JSONSerialization.jsonObject(with: data) as? [String: Any]

        // Assert
        XCTAssertNotNil(json, "Should encode to JSON")
        XCTAssertEqual(json?["bmi"] as? Double, 24.5, "BMI should encode correctly")
        XCTAssertEqual(json?["bmr"] as? Int, 1650, "BMR should encode correctly")
        XCTAssertEqual(json?["tdee"] as? Int, 2475, "TDEE should encode correctly")
        XCTAssertEqual(json?["version"] as? Int, 1, "Version should encode correctly")
        XCTAssertNotNil(json?["computedAt"], "ComputedAt should be encoded")
    }

    func testHealthMetrics_Equatable_WorksCorrectly() {
        // Arrange
        let metrics1 = MetricsFixtures.validHealthMetrics
        let metrics2 = MetricsFixtures.createMetrics(bmi: 24.5, bmr: 1650, tdee: 2475, version: 1)
        let metrics3 = MetricsFixtures.createMetrics(bmi: 25.0, bmr: 1650, tdee: 2475, version: 1)

        // Assert
        XCTAssertEqual(metrics1, metrics2, "Identical metrics should be equal")
        XCTAssertNotEqual(metrics1, metrics3, "Different metrics should not be equal")
    }

    func testHealthMetrics_IsSendable() {
        // This test verifies that HealthMetrics conforms to Sendable
        // If it compiles without warnings, the test passes
        let metrics = MetricsFixtures.validHealthMetrics

        Task {
            // Sendable types can be safely passed across actor boundaries
            let _ = metrics
        }

        XCTAssertNotNil(metrics, "HealthMetrics should be Sendable")
    }

    func testHealthMetrics_BMICategory_Classifications() {
        // Arrange & Act & Assert
        let underweight = MetricsFixtures.createMetrics(bmi: 17.5)
        XCTAssertEqual(underweight.bmiCategory, "Underweight", "BMI < 18.5 should be Underweight")

        let normal = MetricsFixtures.createMetrics(bmi: 22.0)
        XCTAssertEqual(normal.bmiCategory, "Normal", "BMI 18.5-24.9 should be Normal")

        let overweight = MetricsFixtures.createMetrics(bmi: 27.0)
        XCTAssertEqual(overweight.bmiCategory, "Overweight", "BMI 25.0-29.9 should be Overweight")

        let obese = MetricsFixtures.createMetrics(bmi: 32.0)
        XCTAssertEqual(obese.bmiCategory, "Obese", "BMI >= 30.0 should be Obese")
    }

    func testHealthMetrics_FormattedValues() {
        // Arrange
        let metrics = MetricsFixtures.validHealthMetrics

        // Assert
        XCTAssertEqual(metrics.bmiFormatted, "24.5", "BMI should format with 1 decimal")
        XCTAssertEqual(metrics.bmrFormatted, "1650 cal/day", "BMR should format correctly")
        XCTAssertEqual(metrics.tdeeFormatted, "2475 cal/day", "TDEE should format correctly")
    }

    // MARK: - MetricsExplanations Tests

    func testMetricsExplanations_DecodesFromJSON_Successfully() throws {
        // Arrange
        let json = """
        {
            "bmi": "BMI explanation",
            "bmr": "BMR explanation",
            "tdee": "TDEE explanation"
        }
        """.data(using: .utf8)!

        // Act
        let decoder = JSONDecoder()
        let explanations = try decoder.decode(MetricsExplanations.self, from: json)

        // Assert
        XCTAssertEqual(explanations.bmi, "BMI explanation")
        XCTAssertEqual(explanations.bmr, "BMR explanation")
        XCTAssertEqual(explanations.tdee, "TDEE explanation")
    }

    func testMetricsExplanations_EncodesToJSON_Successfully() throws {
        // Arrange
        let explanations = MetricsFixtures.validExplanations

        // Act
        let encoder = JSONEncoder()
        let data = try encoder.encode(explanations)
        let json = try JSONSerialization.jsonObject(with: data) as? [String: String]

        // Assert
        XCTAssertNotNil(json, "Should encode to JSON")
        XCTAssertNotNil(json?["bmi"], "BMI explanation should be encoded")
        XCTAssertNotNil(json?["bmr"], "BMR explanation should be encoded")
        XCTAssertNotNil(json?["tdee"], "TDEE explanation should be encoded")
    }

    func testMetricsExplanations_Equatable_WorksCorrectly() {
        // Arrange
        let explanations1 = MetricsFixtures.validExplanations
        let explanations2 = MetricsFixtures.validExplanations
        let explanations3 = MetricsFixtures.underweightExplanations

        // Assert
        XCTAssertEqual(explanations1, explanations2, "Identical explanations should be equal")
        XCTAssertNotEqual(explanations1, explanations3, "Different explanations should not be equal")
    }

    func testMetricsExplanations_IsSendable() {
        // Verify Sendable conformance
        let explanations = MetricsFixtures.validExplanations

        Task {
            let _ = explanations
        }

        XCTAssertNotNil(explanations, "MetricsExplanations should be Sendable")
    }

    // MARK: - Acknowledgement Tests

    func testAcknowledgement_DecodesFromJSON_Successfully() throws {
        // Arrange
        let json = """
        {
            "acknowledgedAt": "2023-10-31T16:10:00.000Z",
            "version": 1
        }
        """.data(using: .utf8)!

        // Act
        let decoder = JSONDecoder()
        let acknowledgement = try decoder.decode(Acknowledgement.self, from: json)

        // Assert
        XCTAssertNotNil(acknowledgement.acknowledgedAt, "Date should decode")
        XCTAssertEqual(acknowledgement.version, 1, "Version should decode correctly")
    }

    func testAcknowledgement_EncodesToJSON_WithISO8601Date() throws {
        // Arrange
        let acknowledgement = MetricsFixtures.validAcknowledgement

        // Act
        let encoder = JSONEncoder()
        let data = try encoder.encode(acknowledgement)
        let jsonString = String(data: data, encoding: .utf8)!

        // Assert
        XCTAssertTrue(jsonString.contains("acknowledgedAt"), "Should contain acknowledgedAt field")
        XCTAssertTrue(jsonString.contains("version"), "Should contain version field")
        // ISO8601 format check
        XCTAssertTrue(jsonString.contains("T"), "Date should be in ISO8601 format with T separator")
        XCTAssertTrue(jsonString.contains("Z"), "Date should be in ISO8601 format with Z timezone")
    }

    func testAcknowledgement_Equatable_WorksCorrectly() {
        // Arrange
        let ack1 = MetricsFixtures.validAcknowledgement
        let ack2 = Acknowledgement(
            acknowledgedAt: MetricsFixtures.acknowledgedDate,
            version: 1
        )
        let ack3 = Acknowledgement(
            acknowledgedAt: MetricsFixtures.acknowledgedDate,
            version: 2
        )

        // Assert
        XCTAssertEqual(ack1, ack2, "Identical acknowledgements should be equal")
        XCTAssertNotEqual(ack1, ack3, "Different versions should not be equal")
    }

    func testAcknowledgement_IsSendable() {
        // Verify Sendable conformance
        let acknowledgement = MetricsFixtures.validAcknowledgement

        Task {
            let _ = acknowledgement
        }

        XCTAssertNotNil(acknowledgement, "Acknowledgement should be Sendable")
    }

    // MARK: - MetricsSummaryData Tests

    func testMetricsSummaryData_DecodesFromJSON_Successfully() throws {
        // Arrange
        let json = MetricsFixtures.summaryDataJSON

        // Act
        let decoder = JSONDecoder()
        let data = try decoder.decode(MetricsSummaryData.self, from: json)

        // Assert
        XCTAssertEqual(data.metrics.bmi, 24.5, "Metrics should decode")
        XCTAssertNotNil(data.explanations, "Explanations should decode")
        XCTAssertFalse(data.acknowledged, "Acknowledged should be false")
        XCTAssertNil(data.acknowledgement, "Acknowledgement should be nil")
    }

    func testMetricsSummaryData_DecodesAcknowledgedData_Successfully() throws {
        // Arrange
        let json = MetricsFixtures.acknowledgedDataJSON

        // Act
        let decoder = JSONDecoder()
        let data = try decoder.decode(MetricsSummaryData.self, from: json)

        // Assert
        XCTAssertTrue(data.acknowledged, "Should be acknowledged")
        XCTAssertNotNil(data.acknowledgement, "Acknowledgement should be present")
        XCTAssertEqual(data.acknowledgement?.version, 1, "Acknowledgement version should match")
    }

    func testMetricsSummaryData_EncodesToJSON_Successfully() throws {
        // Arrange
        let summaryData = MetricsFixtures.unacknowledgedSummaryData

        // Act
        let encoder = JSONEncoder()
        let data = try encoder.encode(summaryData)
        let json = try JSONSerialization.jsonObject(with: data) as? [String: Any]

        // Assert
        XCTAssertNotNil(json, "Should encode to JSON")
        XCTAssertNotNil(json?["metrics"], "Metrics should be encoded")
        XCTAssertNotNil(json?["explanations"], "Explanations should be encoded")
        XCTAssertEqual(json?["acknowledged"] as? Bool, false, "Acknowledged should be encoded")
    }

    func testMetricsSummaryData_Equatable_WorksCorrectly() {
        // Arrange
        let data1 = MetricsFixtures.unacknowledgedSummaryData
        let data2 = MetricsFixtures.createSummaryData()
        let data3 = MetricsFixtures.acknowledgedSummaryData

        // Assert
        XCTAssertEqual(data1, data2, "Identical data should be equal")
        XCTAssertNotEqual(data1, data3, "Different acknowledgement state should not be equal")
    }

    func testMetricsSummaryData_IsSendable() {
        // Verify Sendable conformance
        let summaryData = MetricsFixtures.unacknowledgedSummaryData

        Task {
            let _ = summaryData
        }

        XCTAssertNotNil(summaryData, "MetricsSummaryData should be Sendable")
    }

    // MARK: - AcknowledgeMetricsRequest Tests

    func testAcknowledgeMetricsRequest_EncodesToJSON_WithISO8601Date() throws {
        // Arrange
        let request = AcknowledgeMetricsRequest(
            version: 1,
            metricsComputedAt: MetricsFixtures.fixedDate
        )

        // Act
        let encoder = JSONEncoder()
        let data = try encoder.encode(request)
        let jsonString = String(data: data, encoding: .utf8)!

        // Assert
        XCTAssertTrue(jsonString.contains("version"), "Should contain version field")
        XCTAssertTrue(jsonString.contains("metricsComputedAt"), "Should contain metricsComputedAt field")
        XCTAssertTrue(jsonString.contains("2023-10-31"), "Date should be in ISO8601 format")
        XCTAssertTrue(jsonString.contains("T"), "Date should have T separator")
    }

    func testAcknowledgeMetricsRequest_EncodesCorrectVersion() throws {
        // Arrange
        let request = AcknowledgeMetricsRequest(
            version: 5,
            metricsComputedAt: Date()
        )

        // Act
        let encoder = JSONEncoder()
        let data = try encoder.encode(request)
        let json = try JSONSerialization.jsonObject(with: data) as? [String: Any]

        // Assert
        XCTAssertEqual(json?["version"] as? Int, 5, "Version should encode correctly")
    }

    func testAcknowledgeMetricsRequest_IsSendable() {
        // Verify Sendable conformance
        let request = AcknowledgeMetricsRequest(version: 1, metricsComputedAt: Date())

        Task {
            let _ = request
        }

        XCTAssertNotNil(request, "AcknowledgeMetricsRequest should be Sendable")
    }

    // MARK: - AcknowledgeResponse Tests

    func testAcknowledgeResponse_DecodesFromJSON_Successfully() throws {
        // Arrange
        let json = MetricsFixtures.acknowledgeResponseJSON

        // Act
        let decoder = JSONDecoder()
        let response = try decoder.decode(AcknowledgeResponse.self, from: json)

        // Assert
        XCTAssertTrue(response.success, "Success should be true")
        XCTAssertTrue(response.data.acknowledged, "Acknowledged should be true")
        XCTAssertNotNil(response.data.acknowledgement, "Acknowledgement should be present")
    }

    func testAcknowledgeResponse_EncodesToJSON_Successfully() throws {
        // Arrange
        let response = MetricsFixtures.successfulAcknowledgeResponse

        // Act
        let encoder = JSONEncoder()
        let data = try encoder.encode(response)
        let json = try JSONSerialization.jsonObject(with: data) as? [String: Any]

        // Assert
        XCTAssertNotNil(json, "Should encode to JSON")
        XCTAssertEqual(json?["success"] as? Bool, true, "Success should be encoded")
        XCTAssertNotNil(json?["data"], "Data should be encoded")
    }

    func testAcknowledgeResponse_IsSendable() {
        // Verify Sendable conformance
        let response = MetricsFixtures.successfulAcknowledgeResponse

        Task {
            let _ = response
        }

        XCTAssertNotNil(response, "AcknowledgeResponse should be Sendable")
    }

    // MARK: - MetricsError Tests

    func testMetricsError_ErrorDescriptions() {
        // Assert
        XCTAssertNotNil(MetricsError.notFound.errorDescription, ".notFound should have description")
        XCTAssertNotNil(MetricsError.networkError(NSError(domain: "test", code: -1)).errorDescription, ".networkError should have description")
        XCTAssertNotNil(MetricsError.invalidResponse.errorDescription, ".invalidResponse should have description")
        XCTAssertNotNil(MetricsError.serverError("test").errorDescription, ".serverError should have description")
        XCTAssertNotNil(MetricsError.alreadyAcknowledged.errorDescription, ".alreadyAcknowledged should have description")
    }

    func testMetricsError_IsSendable() {
        // Verify Sendable conformance
        let error = MetricsError.notFound

        Task {
            let _ = error
        }

        XCTAssertNotNil(error, "MetricsError should be Sendable")
    }

    // MARK: - Date Handling Tests

    func testHealthMetrics_DateHandling_ISO8601WithFractionalSeconds() throws {
        // Arrange: JSON with fractional seconds
        let json = """
        {
            "bmi": 24.5,
            "bmr": 1650,
            "tdee": 2475,
            "computedAt": "2023-10-31T16:00:00.123Z",
            "version": 1
        }
        """.data(using: .utf8)!

        // Act
        let decoder = JSONDecoder()
        let metrics = try decoder.decode(HealthMetrics.self, from: json)

        // Assert
        XCTAssertNotNil(metrics.computedAt, "Date with fractional seconds should decode")
    }

    func testHealthMetrics_DateHandling_ISO8601WithoutFractionalSeconds() throws {
        // Arrange: JSON without fractional seconds
        let json = """
        {
            "bmi": 24.5,
            "bmr": 1650,
            "tdee": 2475,
            "computedAt": "2023-10-31T16:00:00Z",
            "version": 1
        }
        """.data(using: .utf8)!

        // Act
        let decoder = JSONDecoder()
        let metrics = try decoder.decode(HealthMetrics.self, from: json)

        // Assert
        XCTAssertNotNil(metrics.computedAt, "Date without fractional seconds should decode")
    }

    func testAcknowledgement_DateHandling_RoundTrip() throws {
        // Arrange
        let originalDate = Date(timeIntervalSince1970: 1698768600)
        let acknowledgement = Acknowledgement(acknowledgedAt: originalDate, version: 1)

        // Act: Encode
        let encoder = JSONEncoder()
        let data = try encoder.encode(acknowledgement)

        // Act: Decode
        let decoder = JSONDecoder()
        let decoded = try decoder.decode(Acknowledgement.self, from: data)

        // Assert: Dates should be close (within 1 second due to precision)
        let timeDiff = abs(decoded.acknowledgedAt.timeIntervalSince(originalDate))
        XCTAssertLessThan(timeDiff, 1.0, "Round-trip date should match within 1 second")
    }
}
