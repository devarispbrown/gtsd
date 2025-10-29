//
//  UnitConversion.swift
//  GTSD
//
//  Created by Claude on 2025-10-28.
//

import Foundation

/// Utility functions for converting between imperial and metric units
enum UnitConversion {

    // MARK: - Weight Conversions

    /// Convert pounds to kilograms
    /// - Parameter pounds: Weight in pounds
    /// - Returns: Weight in kilograms
    static func poundsToKilograms(_ pounds: Double) -> Double {
        return pounds * 0.453592
    }

    /// Convert kilograms to pounds
    /// - Parameter kg: Weight in kilograms
    /// - Returns: Weight in pounds
    static func kilogramsToPounds(_ kg: Double) -> Double {
        return kg / 0.453592
    }

    // MARK: - Height Conversions

    /// Convert inches to centimeters
    /// - Parameter inches: Height in inches
    /// - Returns: Height in centimeters
    static func inchesToCentimeters(_ inches: Double) -> Double {
        return inches * 2.54
    }

    /// Convert centimeters to inches
    /// - Parameter cm: Height in centimeters
    /// - Returns: Height in inches
    static func centimetersToInches(_ cm: Double) -> Double {
        return cm / 2.54
    }

    // MARK: - Validation Ranges (Metric)

    /// Valid weight range in kilograms
    static let validWeightRangeKg: ClosedRange<Double> = 30.0...300.0

    /// Valid height range in centimeters
    static let validHeightRangeCm: ClosedRange<Double> = 100.0...250.0

    // MARK: - Validation Ranges (Imperial)

    /// Valid weight range in pounds
    static let validWeightRangeLbs: ClosedRange<Double> = 66.0...661.0

    /// Valid height range in inches
    static let validHeightRangeInches: ClosedRange<Double> = 39.0...98.0

    // MARK: - Validation Helpers

    /// Validate weight in pounds
    /// - Parameter pounds: Weight in pounds
    /// - Returns: True if valid, false otherwise
    static func isValidWeightInPounds(_ pounds: Double) -> Bool {
        return validWeightRangeLbs.contains(pounds)
    }

    /// Validate weight in kilograms
    /// - Parameter kg: Weight in kilograms
    /// - Returns: True if valid, false otherwise
    static func isValidWeightInKilograms(_ kg: Double) -> Bool {
        return validWeightRangeKg.contains(kg)
    }

    /// Validate height in inches
    /// - Parameter inches: Height in inches
    /// - Returns: True if valid, false otherwise
    static func isValidHeightInInches(_ inches: Double) -> Bool {
        return validHeightRangeInches.contains(inches)
    }

    /// Validate height in centimeters
    /// - Parameter cm: Height in centimeters
    /// - Returns: True if valid, false otherwise
    static func isValidHeightInCentimeters(_ cm: Double) -> Bool {
        return validHeightRangeCm.contains(cm)
    }
}
