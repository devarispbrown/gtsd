//
//  GTSDButton.swift
//  GTSD
//
//  Created by Claude on 2025-10-26.
//

import SwiftUI

struct GTSDButton: View {
    enum Style {
        case primary
        case secondary
        case outline
        case destructive
    }

    let title: String
    let style: Style
    let isLoading: Bool
    let isDisabled: Bool
    let action: () -> Void

    init(
        _ title: String,
        style: Style = .primary,
        isLoading: Bool = false,
        isDisabled: Bool = false,
        action: @escaping () -> Void
    ) {
        self.title = title
        self.style = style
        self.isLoading = isLoading
        self.isDisabled = isDisabled
        self.action = action
    }

    var body: some View {
        Button(action: action) {
            HStack(spacing: Spacing.sm) {
                if isLoading {
                    ProgressView()
                        .tint(textColor)
                } else {
                    Text(title)
                        .font(.titleMedium)
                        .foregroundColor(textColor)
                }
            }
            .frame(maxWidth: .infinity)
            .padding(.vertical, Spacing.md)
            .background(backgroundColor)
            .cornerRadius(CornerRadius.md)
            .overlay(
                Group {
                    if style == .outline {
                        RoundedRectangle(cornerRadius: CornerRadius.md)
                            .stroke(borderColor, lineWidth: 2)
                    }
                }
            )
        }
        .disabled(isDisabled || isLoading)
        .opacity(isDisabled ? 0.5 : 1.0)
    }

    private var backgroundColor: Color {
        switch style {
        case .primary:
            return isDisabled ? Color.gray : Color.primaryColor
        case .secondary:
            return Color.primaryColor.opacity(0.1)
        case .outline:
            return Color.clear
        case .destructive:
            return isDisabled ? Color.gray : Color.errorColor
        }
    }

    private var textColor: Color {
        switch style {
        case .primary, .destructive:
            return .white
        case .secondary, .outline:
            return .primaryColor
        }
    }

    private var borderColor: Color {
        switch style {
        case .outline:
            return .primaryColor
        default:
            return .clear
        }
    }
}

// MARK: - Preview

#Preview {
    VStack(spacing: Spacing.md) {
        GTSDButton("Primary Button", style: .primary) {}
        GTSDButton("Secondary Button", style: .secondary) {}
        GTSDButton("Outline Button", style: .outline) {}
        GTSDButton("Destructive Button", style: .destructive) {}
        GTSDButton("Loading Button", style: .primary, isLoading: true) {}
        GTSDButton("Disabled Button", style: .primary, isDisabled: true) {}
    }
    .padding()
}
