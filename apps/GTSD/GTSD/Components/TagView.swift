//
//  TagView.swift
//  GTSD
//
//  Created by Claude on 2025-10-30.
//

import SwiftUI

/// A simple tag view component for displaying labels and categories
struct TagView: View {
    let text: String
    let style: TagStyle

    enum TagStyle {
        case primary
        case secondary
        case success
        case warning
        case error
        case info

        var backgroundColor: Color {
            switch self {
            case .primary:
                return .primaryColor.opacity(0.15)
            case .secondary:
                return .secondaryColor.opacity(0.15)
            case .success:
                return .successColor.opacity(0.15)
            case .warning:
                return .warningColor.opacity(0.15)
            case .error:
                return .errorColor.opacity(0.15)
            case .info:
                return .infoColor.opacity(0.15)
            }
        }

        var foregroundColor: Color {
            switch self {
            case .primary:
                return .primaryColor
            case .secondary:
                return .secondaryColor
            case .success:
                return .successColor
            case .warning:
                return .warningColor
            case .error:
                return .errorColor
            case .info:
                return .infoColor
            }
        }
    }

    var body: some View {
        Text(text)
            .font(.labelMedium)
            .foregroundColor(style.foregroundColor)
            .padding(.horizontal, Spacing.sm)
            .padding(.vertical, 4)
            .background(style.backgroundColor)
            .cornerRadius(CornerRadius.sm)
    }
}

#Preview {
    VStack(spacing: Spacing.md) {
        HStack(spacing: Spacing.sm) {
            TagView(text: "Vegetarian", style: .primary)
            TagView(text: "Gluten-Free", style: .secondary)
            TagView(text: "Halal", style: .success)
        }

        HStack(spacing: Spacing.sm) {
            TagView(text: "Peanuts", style: .warning)
            TagView(text: "Shellfish", style: .error)
            TagView(text: "Dairy", style: .info)
        }
    }
    .padding()
}