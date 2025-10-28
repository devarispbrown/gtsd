//
//  BadgeCard.swift
//  GTSD
//
//  Created by Claude on 2025-10-26.
//

import SwiftUI

struct BadgeCard: View {
    let userBadge: UserBadge

    var body: some View {
        VStack(spacing: Spacing.md) {
            // Badge Icon
            ZStack {
                Circle()
                    .fill(backgroundColor.gradient)
                    .frame(width: 80, height: 80)
                    .shadow(color: backgroundColor.opacity(0.3), radius: 8, x: 0, y: 4)

                Image(systemName: userBadge.badge.icon)
                    .font(.system(size: IconSize.xl))
                    .foregroundColor(.white)
            }

            // Badge Info
            VStack(spacing: Spacing.xs) {
                Text(userBadge.badge.name)
                    .font(.titleMedium)
                    .fontWeight(.semibold)
                    .foregroundColor(.textPrimary)
                    .multilineTextAlignment(.center)

                Text(userBadge.badge.description)
                    .font(.bodySmall)
                    .foregroundColor(.textSecondary)
                    .multilineTextAlignment(.center)
                    .lineLimit(2)

                // Rarity Badge
                HStack(spacing: Spacing.xs) {
                    Image(systemName: rarityIcon)
                        .font(.system(size: IconSize.xs))
                    Text(userBadge.badge.badgeRarity.rawValue.capitalized)
                        .font(.labelSmall)
                }
                .foregroundColor(rarityColor)
                .padding(.horizontal, Spacing.sm)
                .padding(.vertical, Spacing.xs)
                .background(rarityColor.opacity(0.1))
                .cornerRadius(CornerRadius.xs)

                // Earned Date
                Text("Earned \(userBadge.earnedAt, style: .date)")
                    .font(.labelSmall)
                    .foregroundColor(.textSecondary)
            }
        }
        .frame(width: 160)
        .padding(Spacing.md)
        .background(Color.backgroundPrimary)
        .cornerRadius(CornerRadius.md)
        .cardShadow()
    }

    private var backgroundColor: Color {
        switch userBadge.badge.badgeRarity {
        case .common:
            return Color.gray
        case .rare:
            return Color.blue
        case .epic:
            return Color.purple
        case .legendary:
            return Color.orange
        }
    }

    private var rarityColor: Color {
        backgroundColor
    }

    private var rarityIcon: String {
        switch userBadge.badge.badgeRarity {
        case .common:
            return "star"
        case .rare:
            return "star.fill"
        case .epic:
            return "star.circle.fill"
        case .legendary:
            return "crown.fill"
        }
    }
}

// MARK: - Preview

#Preview {
    let sampleBadge = Badge(
        id: "1",
        name: "Week Warrior",
        description: "Complete 7 consecutive days of tasks",
        icon: "flame.fill",
        category: "streaks",
        rarity: "rare",
        requirement: 7,
        createdAt: Date(),
        updatedAt: Date()
    )

    let sampleUserBadge = UserBadge(
        id: "1",
        userId: "1",
        badgeId: "1",
        earnedAt: Date(),
        badge: sampleBadge
    )

    return BadgeCard(userBadge: sampleUserBadge)
        .padding()
}
