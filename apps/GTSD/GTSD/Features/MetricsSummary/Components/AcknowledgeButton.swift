//
//  AcknowledgeButton.swift
//  GTSD
//
//  Created by Claude on 2025-10-28.
//

import SwiftUI

/// Primary CTA button for acknowledging metrics
struct AcknowledgeButton: View {
    let isLoading: Bool
    let isDisabled: Bool
    let action: () -> Void

    init(
        isLoading: Bool = false,
        isDisabled: Bool = false,
        action: @escaping () -> Void
    ) {
        self.isLoading = isLoading
        self.isDisabled = isDisabled
        self.action = action
    }

    var body: some View {
        Button(action: action) {
            HStack(spacing: Spacing.sm) {
                if isLoading {
                    ProgressView()
                        .tint(.white)
                        .scaleEffect(0.9)
                } else {
                    Image(systemName: "checkmark.circle.fill")
                        .font(.system(size: IconSize.sm))

                    Text("Acknowledge & Continue")
                        .font(.titleMedium)
                        .fontWeight(.semibold)
                }
            }
            .frame(maxWidth: .infinity)
            .frame(height: 56)
            .foregroundColor(.white)
            .background(
                isDisabled ? Color.gray : Color.primaryColor
            )
            .cornerRadius(CornerRadius.md)
            .shadow(
                color: Color.primaryColor.opacity(isDisabled ? 0 : 0.3),
                radius: 8,
                x: 0,
                y: 4
            )
        }
        .disabled(isDisabled || isLoading)
        .opacity(isDisabled ? 0.6 : 1.0)
        .animation(.smooth, value: isLoading)
        .animation(.smooth, value: isDisabled)
        .accessibilityLabel("Acknowledge metrics and continue")
        .accessibilityHint("Double tap to confirm you've reviewed your health metrics")
        .accessibilityAddTraits(.isButton)
        .accessibilityRemoveTraits(isDisabled ? [] : .isButton)
    }
}

// MARK: - Preview

#Preview {
    VStack(spacing: Spacing.lg) {
        AcknowledgeButton(
            isLoading: false,
            isDisabled: false,
            action: {}
        )

        AcknowledgeButton(
            isLoading: true,
            isDisabled: false,
            action: {}
        )

        AcknowledgeButton(
            isLoading: false,
            isDisabled: true,
            action: {}
        )
    }
    .padding()
    .background(Color.backgroundSecondary)
}
