import { db } from '../connection';
import { users, dailyComplianceStreaks, userBadges } from '../schema';
import { logger } from '../../config/logger';
import { subDays } from 'date-fns';

/**
 * Seed script for streaks and badges
 * Creates users with different streak lengths:
 * - 0-day streak (new user)
 * - 3-day streak
 * - 7-day streak (with badges)
 *
 * Run with: pnpm seed:streaks
 */

interface SeedStreak {
  userEmail: string;
  currentStreak: number;
  longestStreak: number;
  totalCompliantDays: number;
  lastComplianceDate: Date | null;
  streakStartDate: Date | null;
  badges?: Array<
    | 'day_one_done'
    | 'week_warrior'
    | 'consistency_king'
    | 'hundred_club'
    | 'perfect_month'
  >;
}

// Sample streak data
const seedStreaksData: SeedStreak[] = [
  // New user - 0-day streak
  {
    userEmail: 'alice@example.com',
    currentStreak: 0,
    longestStreak: 0,
    totalCompliantDays: 0,
    lastComplianceDate: null,
    streakStartDate: null,
    badges: [], // No badges yet
  },
  // Returning user - 3-day streak
  {
    userEmail: 'bob@example.com',
    currentStreak: 3,
    longestStreak: 5,
    totalCompliantDays: 8,
    lastComplianceDate: new Date(), // Today
    streakStartDate: subDays(new Date(), 2), // Started 3 days ago
    badges: ['day_one_done'],
  },
  // Consistent user - 7-day streak
  {
    userEmail: 'charlie@example.com',
    currentStreak: 7,
    longestStreak: 7,
    totalCompliantDays: 7,
    lastComplianceDate: new Date(), // Today
    streakStartDate: subDays(new Date(), 6), // Started 7 days ago
    badges: ['day_one_done', 'week_warrior'],
  },
];

async function seedStreaks() {
  try {
    logger.info('Starting streak seed...');

    // Get all users
    const allUsers = await db.select().from(users);
    const userMap = new Map(allUsers.map((u) => [u.email, u]));

    let streakCount = 0;
    let badgeCount = 0;

    for (const streakData of seedStreaksData) {
      const user = userMap.get(streakData.userEmail);
      if (!user) {
        logger.warn({ email: streakData.userEmail }, 'User not found, skipping streak');
        continue;
      }

      // Only create streak record if user has > 0 streak
      // New users with 0 streak don't need a record
      if (streakData.currentStreak > 0 || streakData.totalCompliantDays > 0) {
        const [streak] = await db
          .insert(dailyComplianceStreaks)
          .values({
            userId: user.id,
            currentStreak: streakData.currentStreak,
            longestStreak: streakData.longestStreak,
            totalCompliantDays: streakData.totalCompliantDays,
            lastComplianceDate: streakData.lastComplianceDate,
            streakStartDate: streakData.streakStartDate,
          })
          .returning();

        streakCount++;
        logger.info(
          {
            userId: user.id,
            email: user.email,
            currentStreak: streak.currentStreak,
            longestStreak: streak.longestStreak,
          },
          'Streak created'
        );
      } else {
        logger.info(
          { userId: user.id, email: user.email },
          'Skipped streak creation for new user (0 days)'
        );
      }

      // Award badges
      if (streakData.badges && streakData.badges.length > 0) {
        for (const badgeType of streakData.badges) {
          const [badge] = await db
            .insert(userBadges)
            .values({
              userId: user.id,
              badgeType: badgeType,
            })
            .onConflictDoNothing({
              target: [userBadges.userId, userBadges.badgeType],
            })
            .returning();

          if (badge) {
            badgeCount++;
            logger.info(
              {
                userId: user.id,
                email: user.email,
                badgeType: badge.badgeType,
                badgeId: badge.id,
              },
              'Badge awarded'
            );
          }
        }
      }
    }

    logger.info(
      {
        streakCount,
        badgeCount,
      },
      'Streak seed completed successfully'
    );

    logger.info(
      {
        summary: {
          'alice@example.com': '0-day streak (new user)',
          'bob@example.com': '3-day streak (1 badge)',
          'charlie@example.com': '7-day streak (2 badges)',
        },
      },
      'Streak seed summary'
    );
  } catch (error) {
    logger.error({ error }, 'Failed to seed streaks');
    throw error;
  } finally {
    process.exit(0);
  }
}

// Run seed
seedStreaks();
