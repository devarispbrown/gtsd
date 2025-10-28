//
//  GTSDTextField.swift
//  GTSD
//
//  Created by Claude on 2025-10-26.
//

import SwiftUI

struct GTSDTextField: View {
    let title: String
    let placeholder: String
    @Binding var text: String
    var isSecure: Bool = false
    var keyboardType: UIKeyboardType = .default
    var errorMessage: String? = nil
    var icon: String? = nil

    var body: some View {
        VStack(alignment: .leading, spacing: Spacing.xs) {
            if !title.isEmpty {
                Text(title)
                    .font(.labelMedium)
                    .foregroundColor(.textSecondary)
            }

            HStack(spacing: Spacing.sm) {
                if let icon = icon {
                    Image(systemName: icon)
                        .font(.system(size: IconSize.sm))
                        .foregroundColor(.textSecondary)
                }

                if isSecure {
                    SecureField(placeholder, text: $text)
                        .textContentType(.password)
                        .textInputAutocapitalization(.never)
                } else {
                    TextField(placeholder, text: $text)
                        .keyboardType(keyboardType)
                        .textContentType(textContentType)
                        .textInputAutocapitalization(autocapitalization)
                }
            }
            .padding(Spacing.md)
            .background(Color.backgroundSecondary)
            .cornerRadius(CornerRadius.md)
            .overlay(
                RoundedRectangle(cornerRadius: CornerRadius.md)
                    .stroke(errorMessage != nil ? Color.errorColor : Color.clear, lineWidth: 1)
            )

            if let errorMessage = errorMessage {
                HStack(spacing: Spacing.xs) {
                    Image(systemName: "exclamationmark.circle.fill")
                        .font(.system(size: IconSize.xs))
                    Text(errorMessage)
                        .font(.bodySmall)
                }
                .foregroundColor(.errorColor)
            }
        }
    }

    private var textContentType: UITextContentType? {
        if title.lowercased().contains("email") {
            return .emailAddress
        } else if title.lowercased().contains("name") {
            return .name
        }
        return nil
    }

    private var autocapitalization: TextInputAutocapitalization {
        if keyboardType == .emailAddress {
            return .never
        }
        return .sentences
    }
}

// MARK: - Preview

#Preview {
    VStack(spacing: Spacing.md) {
        GTSDTextField(
            title: "Email",
            placeholder: "Enter your email",
            text: .constant(""),
            icon: "envelope"
        )

        GTSDTextField(
            title: "Password",
            placeholder: "Enter your password",
            text: .constant(""),
            isSecure: true,
            icon: "lock"
        )

        GTSDTextField(
            title: "Email",
            placeholder: "Enter your email",
            text: .constant("invalid@"),
            errorMessage: "Please enter a valid email address",
            icon: "envelope"
        )
    }
    .padding()
}
