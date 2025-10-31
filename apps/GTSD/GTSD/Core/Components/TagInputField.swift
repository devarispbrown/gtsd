//
//  TagInputField.swift
//  GTSD
//
//  Created by Claude on 2025-10-29.
//  A reusable tag/bubble input component for multi-value text fields
//

import SwiftUI

/// A text field component that creates removable tag bubbles for each entry
/// User presses Enter to create a new tag, and can tap X to remove tags
@MainActor
struct TagInputField: View {
    let placeholder: String
    @Binding var tags: [String]
    @State private var currentInput: String = ""
    @FocusState private var isFocused: Bool

    var body: some View {
        VStack(alignment: .leading, spacing: Spacing.sm) {
            // Tags display area
            if !tags.isEmpty {
                FlowLayout(spacing: Spacing.xs) {
                    ForEach(tags, id: \.self) { tag in
                        TagBubble(text: tag) {
                            withAnimation(.springy) {
                                tags.removeAll { $0 == tag }
                            }
                        }
                    }
                }
                .padding(.bottom, Spacing.xs)
            }

            // Input field
            TextField(placeholder, text: $currentInput)
                .focused($isFocused)
                .textInputAutocapitalization(.never)
                .autocorrectionDisabled()
                .onSubmit {
                    addTag()
                }
                .accessibilityLabel(placeholder)
                .accessibilityHint("Type and press return to add a new tag. Existing tags are shown above and can be removed.")
        }
        .padding(Spacing.md)
        .background(Color.backgroundSecondary)
        .cornerRadius(CornerRadius.md)
    }

    private func addTag() {
        let trimmed = currentInput.trimmingCharacters(in: .whitespacesAndNewlines)

        guard !trimmed.isEmpty else { return }
        guard !tags.contains(trimmed) else {
            // Tag already exists, clear input
            currentInput = ""
            return
        }

        withAnimation(.springy) {
            tags.append(trimmed)
        }
        currentInput = ""
        isFocused = true // Keep focus for adding more tags
    }
}

/// A single tag bubble with remove button
@MainActor
struct TagBubble: View {
    let text: String
    let onRemove: () -> Void

    var body: some View {
        HStack(spacing: Spacing.xs) {
            Text(text)
                .font(.bodySmall)
                .foregroundColor(.textPrimary)

            Button(action: onRemove) {
                Image(systemName: "xmark.circle.fill")
                    .font(.system(size: IconSize.sm))
                    .foregroundColor(.textSecondary)
            }
            .accessibilityLabel("Remove \(text)")
            .minimumTouchTarget()
        }
        .padding(.horizontal, Spacing.sm)
        .padding(.vertical, Spacing.xs)
        .background(Color.primaryColor.opacity(0.1))
        .cornerRadius(CornerRadius.sm)
    }
}

// MARK: - Preview

#Preview("Empty") {
    @Previewable @State var tags: [String] = []

    return VStack {
        TagInputField(
            placeholder: "Enter dietary preferences and press Enter",
            tags: $tags
        )
        .padding()
    }
}

#Preview("With Tags") {
    @Previewable @State var tags = ["Vegetarian", "Gluten-Free", "Low Sodium", "Dairy-Free"]

    return VStack {
        TagInputField(
            placeholder: "Enter dietary preferences and press Enter",
            tags: $tags
        )
        .padding()
    }
}
