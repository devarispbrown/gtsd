//
//  DesignSystem.swift
//  GTSD
//
//  Created by Claude on 2025-10-26.
//

import SwiftUI

// MARK: - Colors

extension Color {
    // Primary Colors
    static let primaryColor = Color("PrimaryColor", bundle: nil)
    static let secondaryColor = Color("SecondaryColor", bundle: nil)
    static let accentColor = Color("AccentColor", bundle: nil)

    // Semantic Colors
    static let successColor = Color.green
    static let errorColor = Color.red
    static let warningColor = Color.orange
    static let infoColor = Color.blue

    // Background Colors
    static let backgroundPrimary = Color(.systemBackground)
    static let backgroundSecondary = Color(.secondarySystemBackground)
    static let backgroundTertiary = Color(.tertiarySystemBackground)

    // Text Colors
    static let textPrimary = Color.primary
    static let textSecondary = Color.secondary
    static let textTertiary = Color(.tertiaryLabel)

    // Custom fallback colors
    init(_ name: String, bundle: Bundle?) {
        if let color = UIColor(named: name) {
            self = Color(uiColor: color)
        } else {
            // Fallback colors
            switch name {
            case "PrimaryColor":
                self = Color(red: 0.0, green: 0.48, blue: 1.0) // iOS Blue
            case "SecondaryColor":
                self = Color(red: 0.35, green: 0.34, blue: 0.84) // Purple
            default:
                self = Color.accentColor
            }
        }
    }
}

// MARK: - Typography

extension Font {
    // Display Fonts
    static let displayLarge = Font.system(size: 57, weight: .bold)
    static let displayMedium = Font.system(size: 45, weight: .bold)
    static let displaySmall = Font.system(size: 36, weight: .bold)

    // Headline Fonts
    static let headlineLarge = Font.system(size: 32, weight: .semibold)
    static let headlineMedium = Font.system(size: 28, weight: .semibold)
    static let headlineSmall = Font.system(size: 24, weight: .semibold)

    // Title Fonts
    static let titleLarge = Font.system(size: 22, weight: .regular)
    static let titleMedium = Font.system(size: 16, weight: .medium)
    static let titleSmall = Font.system(size: 14, weight: .medium)

    // Body Fonts
    static let bodyLarge = Font.system(size: 16, weight: .regular)
    static let bodyMedium = Font.system(size: 14, weight: .regular)
    static let bodySmall = Font.system(size: 12, weight: .regular)

    // Label Fonts
    static let labelLarge = Font.system(size: 14, weight: .medium)
    static let labelMedium = Font.system(size: 12, weight: .medium)
    static let labelSmall = Font.system(size: 11, weight: .medium)
}

// MARK: - Spacing

enum Spacing {
    static let xs: CGFloat = 4
    static let sm: CGFloat = 8
    static let md: CGFloat = 16
    static let lg: CGFloat = 24
    static let xl: CGFloat = 32
    static let xxl: CGFloat = 48
}

// MARK: - Corner Radius

enum CornerRadius {
    static let xs: CGFloat = 4
    static let sm: CGFloat = 8
    static let md: CGFloat = 12
    static let lg: CGFloat = 16
    static let xl: CGFloat = 24
    static let full: CGFloat = 9999
}

// MARK: - Shadows

extension View {
    func cardShadow() -> some View {
        self.shadow(color: Color.black.opacity(0.08), radius: 8, x: 0, y: 2)
    }

    func elevatedShadow() -> some View {
        self.shadow(color: Color.black.opacity(0.12), radius: 12, x: 0, y: 4)
    }

    func floatingShadow() -> some View {
        self.shadow(color: Color.black.opacity(0.16), radius: 16, x: 0, y: 8)
    }
}

// MARK: - Animation

extension Animation {
    static let springy = Animation.spring(response: 0.3, dampingFraction: 0.7)
    static let smooth = Animation.easeInOut(duration: 0.3)
    static let quick = Animation.easeInOut(duration: 0.2)
}

// MARK: - Icon Sizes

enum IconSize {
    static let xs: CGFloat = 16
    static let sm: CGFloat = 20
    static let md: CGFloat = 24
    static let lg: CGFloat = 32
    static let xl: CGFloat = 48
    static let xxl: CGFloat = 64
}

// MARK: - Button Styles

struct PrimaryButtonStyle: ButtonStyle {
    var isLoading: Bool = false
    var isDisabled: Bool = false

    func makeBody(configuration: ButtonStyleConfiguration) -> some View {
        configuration.label
            .font(.titleMedium)
            .foregroundColor(.white)
            .frame(maxWidth: .infinity)
            .padding(.vertical, Spacing.md)
            .background(
                isDisabled ? Color.gray : Color.primaryColor
            )
            .cornerRadius(CornerRadius.md)
            .opacity(configuration.isPressed ? 0.8 : 1.0)
            .scaleEffect(configuration.isPressed ? 0.98 : 1.0)
            .animation(.springy, value: configuration.isPressed)
            .overlay(
                Group {
                    if isLoading {
                        ProgressView()
                            .tint(.white)
                    }
                }
            )
    }
}

struct SecondaryButtonStyle: ButtonStyle {
    var isLoading: Bool = false

    func makeBody(configuration: ButtonStyleConfiguration) -> some View {
        configuration.label
            .font(.titleMedium)
            .foregroundColor(.primaryColor)
            .frame(maxWidth: .infinity)
            .padding(.vertical, Spacing.md)
            .background(Color.primaryColor.opacity(0.1))
            .cornerRadius(CornerRadius.md)
            .opacity(configuration.isPressed ? 0.8 : 1.0)
            .scaleEffect(configuration.isPressed ? 0.98 : 1.0)
            .animation(.springy, value: configuration.isPressed)
            .overlay(
                Group {
                    if isLoading {
                        ProgressView()
                            .tint(.primaryColor)
                    }
                }
            )
    }
}

struct OutlineButtonStyle: ButtonStyle {
    func makeBody(configuration: ButtonStyleConfiguration) -> some View {
        configuration.label
            .font(.titleMedium)
            .foregroundColor(.primaryColor)
            .frame(maxWidth: .infinity)
            .padding(.vertical, Spacing.md)
            .background(Color.clear)
            .overlay(
                RoundedRectangle(cornerRadius: CornerRadius.md)
                    .stroke(Color.primaryColor, lineWidth: 2)
            )
            .opacity(configuration.isPressed ? 0.8 : 1.0)
            .scaleEffect(configuration.isPressed ? 0.98 : 1.0)
            .animation(.springy, value: configuration.isPressed)
    }
}

// MARK: - Card Modifier

struct CardModifier: ViewModifier {
    var padding: CGFloat = Spacing.md
    var cornerRadius: CGFloat = CornerRadius.md

    func body(content: Content) -> some View {
        content
            .padding(padding)
            .background(Color.backgroundPrimary)
            .cornerRadius(cornerRadius)
            .cardShadow()
    }
}

extension View {
    func card(padding: CGFloat = Spacing.md, cornerRadius: CGFloat = CornerRadius.md) -> some View {
        modifier(CardModifier(padding: padding, cornerRadius: cornerRadius))
    }
}

// MARK: - Stat Card Component

struct StatCard: View {
    let title: String
    let value: String
    let icon: String
    let color: Color

    var body: some View {
        VStack(alignment: .leading, spacing: Spacing.sm) {
            HStack {
                Image(systemName: icon)
                    .font(.system(size: IconSize.md))
                    .foregroundColor(color)

                Spacer()
            }

            Text(value)
                .font(.headlineMedium)
                .foregroundColor(.textPrimary)

            Text(title)
                .font(.bodySmall)
                .foregroundColor(.textSecondary)
        }
        .card()
    }
}
