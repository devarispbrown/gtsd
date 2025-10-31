//
//  AnimatedNumber.swift
//  GTSD
//
//  Created by Claude on 2025-10-28.
//

import SwiftUI

/// Animated number view that smoothly transitions between values
///
/// Displays numbers with smooth animation when values change.
/// Supports both integers and decimals with customizable formatting.
///
/// ## Usage Example
/// ```swift
/// AnimatedNumber(
///     value: targetCalories,
///     font: .headlineLarge,
///     color: .textPrimary,
///     suffix: " cal"
/// )
/// ```
struct AnimatedNumber: View {
    let value: Double
    let font: Font
    let color: Color
    let prefix: String
    let suffix: String
    let decimalPlaces: Int
    let duration: Double

    @State private var displayValue: Double = 0

    init(
        value: Double,
        font: Font = .headlineLarge,
        color: Color = .textPrimary,
        prefix: String = "",
        suffix: String = "",
        decimalPlaces: Int = 0,
        duration: Double = 0.8
    ) {
        self.value = value
        self.font = font
        self.color = color
        self.prefix = prefix
        self.suffix = suffix
        self.decimalPlaces = decimalPlaces
        self.duration = duration
    }

    var body: some View {
        Text(formattedValue)
            .font(font)
            .foregroundColor(color)
            .contentTransition(.numericText(value: displayValue))
            .animation(.spring(response: duration, dampingFraction: 0.8), value: displayValue)
            .onAppear {
                displayValue = value
            }
            .onChange(of: value) { newValue in
                withAnimation(.spring(response: duration, dampingFraction: 0.8)) {
                    displayValue = newValue
                }
            }
    }

    private var formattedValue: String {
        let formatter = NumberFormatter()
        formatter.minimumFractionDigits = decimalPlaces
        formatter.maximumFractionDigits = decimalPlaces
        formatter.numberStyle = .decimal

        let numberString = formatter.string(from: NSNumber(value: displayValue)) ?? String(format: "%.\(decimalPlaces)f", displayValue)
        return "\(prefix)\(numberString)\(suffix)"
    }
}

/// Animated integer number view
struct AnimatedIntNumber: View {
    let value: Int
    let font: Font
    let color: Color
    let prefix: String
    let suffix: String
    let duration: Double

    @State private var displayValue: Int = 0

    init(
        value: Int,
        font: Font = .headlineLarge,
        color: Color = .textPrimary,
        prefix: String = "",
        suffix: String = "",
        duration: Double = 0.8
    ) {
        self.value = value
        self.font = font
        self.color = color
        self.prefix = prefix
        self.suffix = suffix
        self.duration = duration
    }

    var body: some View {
        Text("\(prefix)\(displayValue)\(suffix)")
            .font(font)
            .foregroundColor(color)
            .contentTransition(.numericText(value: Double(displayValue)))
            .animation(.spring(response: duration, dampingFraction: 0.8), value: displayValue)
            .onAppear {
                displayValue = value
            }
            .onChange(of: value) { newValue in
                withAnimation(.spring(response: duration, dampingFraction: 0.8)) {
                    displayValue = newValue
                }
            }
    }
}

/// Animated target card with number animation and icon
struct AnimatedTargetCard: View {
    let icon: String
    let iconColor: Color
    let label: String
    let value: Int
    let oldValue: Int?
    let unit: String
    let showChange: Bool

    @State private var hasAppeared = false

    init(
        icon: String,
        iconColor: Color,
        label: String,
        value: Int,
        oldValue: Int? = nil,
        unit: String,
        showChange: Bool = true
    ) {
        self.icon = icon
        self.iconColor = iconColor
        self.label = label
        self.value = value
        self.oldValue = oldValue
        self.unit = unit
        self.showChange = showChange
    }

    var body: some View {
        VStack(alignment: .leading, spacing: Spacing.sm) {
            HStack(spacing: Spacing.xs) {
                Image(systemName: icon)
                    .font(.system(size: IconSize.md))
                    .foregroundColor(iconColor)
                    .accessibilityHidden(true)

                Text(label)
                    .font(.bodyMedium)
                    .foregroundColor(.textSecondary)
            }

            HStack(alignment: .firstTextBaseline, spacing: Spacing.xs) {
                AnimatedIntNumber(
                    value: value,
                    font: .headlineMedium,
                    color: .textPrimary,
                    duration: 0.8
                )

                Text(unit)
                    .font(.bodyMedium)
                    .foregroundColor(.textSecondary)
            }

            if showChange, let oldValue = oldValue, oldValue != value {
                changeIndicator(from: oldValue, to: value)
                    .transition(.opacity.combined(with: .scale))
            }
        }
        .padding(Spacing.md)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(Color.backgroundSecondary)
        .cornerRadius(CornerRadius.md)
        .scaleEffect(hasAppeared ? 1.0 : 0.95)
        .opacity(hasAppeared ? 1.0 : 0.0)
        .onAppear {
            withAnimation(.spring(response: 0.5, dampingFraction: 0.7).delay(0.1)) {
                hasAppeared = true
            }
        }
        .accessibilityElement(children: .combine)
        .accessibilityLabel(accessibilityText)
    }

    private var accessibilityText: String {
        if let oldValue = oldValue, oldValue != value {
            let difference = value - oldValue
            let changeText = difference > 0 ? "increased by \(difference)" : "decreased by \(abs(difference))"
            return "\(label): \(value) \(unit), \(changeText) from \(oldValue)"
        }
        return "\(label): \(value) \(unit)"
    }

    private func changeIndicator(from oldValue: Int, to newValue: Int) -> some View {
        let difference = newValue - oldValue
        let isIncrease = difference > 0
        let color: Color = isIncrease ? .green : .red
        let icon = isIncrease ? "arrow.up.right" : "arrow.down.right"

        return HStack(spacing: Spacing.xs) {
            Image(systemName: icon)
                .font(.system(size: IconSize.xs))
                .foregroundColor(color)

            Text("\(isIncrease ? "+" : "")\(difference) \(unit)")
                .font(.bodySmall)
                .foregroundColor(color)
        }
    }
}

// MARK: - Preview

#Preview {
    VStack(spacing: Spacing.lg) {
        AnimatedNumber(
            value: 2150,
            font: .displayMedium,
            suffix: " cal"
        )

        AnimatedIntNumber(
            value: 180,
            font: .headlineLarge,
            suffix: "g"
        )

        AnimatedTargetCard(
            icon: "flame.fill",
            iconColor: .orange,
            label: "Calories",
            value: 2150,
            oldValue: 2000,
            unit: "cal"
        )

        AnimatedTargetCard(
            icon: "leaf.fill",
            iconColor: .green,
            label: "Protein",
            value: 165,
            oldValue: 180,
            unit: "g"
        )
    }
    .padding()
}
