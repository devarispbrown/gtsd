//
//  ExpandableSection.swift
//  GTSD
//
//  Created by Claude on 2025-10-28.
//

import SwiftUI

/// Expandable content section with smooth animations
struct ExpandableSection: View {
    let title: String
    let content: String
    let isExpanded: Bool

    var body: some View {
        if isExpanded {
            VStack(alignment: .leading, spacing: Spacing.sm) {
                Divider()

                Text(title)
                    .font(.labelMedium)
                    .foregroundColor(.textPrimary)
                    .fontWeight(.semibold)

                Text(content)
                    .font(.bodySmall)
                    .foregroundColor(.textSecondary)
                    .fixedSize(horizontal: false, vertical: true)
            }
            .transition(.asymmetric(
                insertion: .opacity.combined(with: .move(edge: .top)),
                removal: .opacity
            ))
            .accessibilityElement(children: .combine)
        }
    }
}

// MARK: - Preview

#Preview {
    VStack(spacing: Spacing.md) {
        GTSDCard(padding: Spacing.md) {
            VStack(alignment: .leading, spacing: Spacing.md) {
                Text("Main Content")
                    .font(.titleMedium)

                ExpandableSection(
                    title: "More Information",
                    content: "This is additional information that appears when expanded. It can contain multiple lines of text with detailed explanations.",
                    isExpanded: true
                )

                Button("Toggle") {}
                    .buttonStyle(SecondaryButtonStyle())
            }
        }
    }
    .padding()
}
