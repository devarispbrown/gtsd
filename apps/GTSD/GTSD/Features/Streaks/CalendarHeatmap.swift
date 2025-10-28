//
//  CalendarHeatmap.swift
//  GTSD
//
//  Created by Claude on 2025-10-26.
//

import SwiftUI

struct CalendarHeatmap: View {
    @ObservedObject var viewModel: StreaksViewModel
    let columns = 7
    let rows = 12 // Show last ~3 months

    var body: some View {
        VStack(alignment: .leading, spacing: Spacing.md) {
            Text("Activity Calendar")
                .font(.titleMedium)
                .foregroundColor(.textPrimary)

            // Day of week labels
            HStack(spacing: Spacing.xs) {
                ForEach(["S", "M", "T", "W", "T", "F", "S"], id: \.self) { day in
                    Text(day)
                        .font(.labelSmall)
                        .foregroundColor(.textSecondary)
                        .frame(maxWidth: .infinity)
                }
            }

            // Calendar grid
            LazyVGrid(
                columns: Array(repeating: GridItem(.flexible(), spacing: Spacing.xs), count: columns),
                spacing: Spacing.xs
            ) {
                ForEach(0..<(rows * columns), id: \.self) { index in
                    let date = dateForIndex(index)
                    CalendarDayCell(
                        date: date,
                        activityLevel: viewModel.activityLevel(for: date)
                    )
                }
            }

            // Legend
            HStack(spacing: Spacing.md) {
                Text("Less")
                    .font(.labelSmall)
                    .foregroundColor(.textSecondary)

                HStack(spacing: Spacing.xs) {
                    ForEach(0..<4) { level in
                        Circle()
                            .fill(colorForLevel(level))
                            .frame(width: 12, height: 12)
                    }
                }

                Text("More")
                    .font(.labelSmall)
                    .foregroundColor(.textSecondary)
            }
        }
    }

    private func dateForIndex(_ index: Int) -> Date {
        let daysAgo = (rows * columns) - index - 1
        return Calendar.current.date(byAdding: .day, value: -daysAgo, to: Date()) ?? Date()
    }

    private func colorForLevel(_ level: Int) -> Color {
        switch level {
        case 0:
            return Color.gray.opacity(0.2)
        case 1:
            return Color.green.opacity(0.4)
        case 2:
            return Color.green.opacity(0.7)
        case 3:
            return Color.green
        default:
            return Color.gray.opacity(0.2)
        }
    }
}

// MARK: - Calendar Day Cell

struct CalendarDayCell: View {
    let date: Date
    let activityLevel: Int

    var body: some View {
        RoundedRectangle(cornerRadius: 4)
            .fill(cellColor)
            .aspectRatio(1, contentMode: .fit)
            .overlay(
                Text("\(Calendar.current.component(.day, from: date))")
                    .font(.system(size: 10))
                    .foregroundColor(textColor)
            )
    }

    private var cellColor: Color {
        switch activityLevel {
        case 0:
            return Color.gray.opacity(0.2)
        case 1:
            return Color.green.opacity(0.4)
        case 2:
            return Color.green.opacity(0.7)
        case 3:
            return Color.green
        default:
            return Color.gray.opacity(0.2)
        }
    }

    private var textColor: Color {
        activityLevel > 0 ? .white : .textSecondary
    }
}
