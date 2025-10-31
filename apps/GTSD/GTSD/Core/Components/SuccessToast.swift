//
//  SuccessToast.swift
//  GTSD
//
//  Created by Claude on 2025-10-30.
//  Success toast notification with plan impact messaging
//

import SwiftUI

/// Success toast that appears at the top of the screen
/// Shows a checkmark, message, and optional plan update information
@MainActor
struct SuccessToast: View {
    let message: String
    let planWillUpdate: Bool
    let targetChanges: ProfileUpdateResponse.TargetChanges?
    @Binding var isShowing: Bool

    @State private var offset: CGFloat = -200
    @State private var opacity: Double = 0

    var body: some View {
        if isShowing {
            VStack(spacing: 0) {
                toastContent
                    .padding(.horizontal, Spacing.md)
                    .padding(.top, Spacing.md)
                    .offset(y: offset)
                    .opacity(opacity)
                    .onAppear {
                        withAnimation(.spring(response: 0.5, dampingFraction: 0.7)) {
                            offset = 0
                            opacity = 1
                        }

                        // Auto-dismiss after 3 seconds
                        DispatchQueue.main.asyncAfter(deadline: .now() + 3.0) {
                            dismiss()
                        }
                    }

                Spacer()
            }
            .transition(.move(edge: .top).combined(with: .opacity))
        }
    }

    private var toastContent: some View {
        GTSDCard {
            VStack(alignment: .leading, spacing: Spacing.sm) {
                HStack(spacing: Spacing.sm) {
                    Image(systemName: "checkmark.circle.fill")
                        .font(.system(size: IconSize.md))
                        .foregroundColor(.successColor)
                        .accessibilityHidden(true)

                    Text(message)
                        .font(.bodyMedium)
                        .foregroundColor(.textPrimary)
                        .fontWeight(.medium)

                    Spacer()

                    Button(action: dismiss) {
                        Image(systemName: "xmark")
                            .font(.system(size: IconSize.xs))
                            .foregroundColor(.textSecondary)
                    }
                    .accessibilityLabel("Dismiss notification")
                    .minimumTouchTarget()
                }

                if planWillUpdate {
                    Text("Your plans will adapt tomorrow morning")
                        .font(.bodySmall)
                        .foregroundColor(.textSecondary)
                }

                // Show target changes if present
                if let changes = targetChanges,
                   let prevCal = changes.previousCalories,
                   let newCal = changes.newCalories {
                    Divider()
                        .padding(.vertical, Spacing.xs)

                    VStack(alignment: .leading, spacing: Spacing.xs) {
                        Text("Your Targets Have Been Updated")
                            .font(.labelMedium)
                            .foregroundColor(.textPrimary)
                            .fontWeight(.semibold)

                        HStack {
                            Text("Daily Calories:")
                                .font(.bodySmall)
                                .foregroundColor(.textSecondary)
                            Spacer()
                            Text("\(prevCal) → \(newCal)")
                                .font(.bodySmall)
                                .foregroundColor(.textPrimary)
                                .fontWeight(.medium)
                            Text("(\(changeText(from: prevCal, to: newCal)))")
                                .font(.bodySmall)
                                .foregroundColor(changeColor(from: prevCal, to: newCal))
                        }

                        if let prevProtein = changes.previousProtein,
                           let newProtein = changes.newProtein {
                            HStack {
                                Text("Daily Protein:")
                                    .font(.bodySmall)
                                    .foregroundColor(.textSecondary)
                                Spacer()
                                Text("\(prevProtein)g → \(newProtein)g")
                                    .font(.bodySmall)
                                    .foregroundColor(.textPrimary)
                                    .fontWeight(.medium)
                                Text("(\(changeText(from: prevProtein, to: newProtein))g)")
                                    .font(.bodySmall)
                                    .foregroundColor(changeColor(from: prevProtein, to: newProtein))
                            }
                        }
                    }
                }
            }
        }
        .shadow(color: .black.opacity(0.15), radius: 10, y: 5)
    }

    private func dismiss() {
        withAnimation(.spring(response: 0.3, dampingFraction: 0.8)) {
            offset = -200
            opacity = 0
        }
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.3) {
            isShowing = false
        }
    }

    private func changeText(from old: Int, to new: Int) -> String {
        let diff = new - old
        if diff > 0 {
            return "+\(diff)"
        } else {
            return "\(diff)"
        }
    }

    private func changeColor(from old: Int, to new: Int) -> Color {
        let diff = new - old
        if diff > 0 {
            return .successColor
        } else if diff < 0 {
            return .warningColor
        } else {
            return .textSecondary
        }
    }
}

// MARK: - Preview

#Preview("Simple Success") {
    @Previewable @State var isShowing = true

    return ZStack {
        Color.backgroundPrimary.ignoresSafeArea()

        SuccessToast(
            message: "Profile updated successfully",
            planWillUpdate: false,
            targetChanges: nil,
            isShowing: $isShowing
        )
    }
}

#Preview("With Plan Update") {
    @Previewable @State var isShowing = true

    return ZStack {
        Color.backgroundPrimary.ignoresSafeArea()

        SuccessToast(
            message: "Profile updated successfully",
            planWillUpdate: true,
            targetChanges: nil,
            isShowing: $isShowing
        )
    }
}

#Preview("With Target Changes") {
    @Previewable @State var isShowing = true

    let targetChanges = ProfileUpdateResponse.TargetChanges(
        previousCalories: 1850,
        newCalories: 1700,
        previousProtein: 140,
        newProtein: 135
    )

    return ZStack {
        Color.backgroundPrimary.ignoresSafeArea()

        SuccessToast(
            message: "Profile updated successfully",
            planWillUpdate: true,
            targetChanges: targetChanges,
            isShowing: $isShowing
        )
    }
}
