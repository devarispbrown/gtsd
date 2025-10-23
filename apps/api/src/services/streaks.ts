import { db } from '../db/connection';
import {
  dailyComplianceStreaks,
  userBadges,
  dailyTasks,
  users,
  userSettings,
  SelectUserBadge,
} from '../db/schema';
import { eq, and, gte, lte, desc } from 'drizzle-orm';
import { logger } from '../config/logger';
import { trace, SpanStatusCode, metrics } from '@opentelemetry/api';
import { AppError } from '../middleware/error';
import { startOfDay, endOfDay, differenceInDays, format } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';
import { redisCache } from '../utils/cache';

const tracer = trace.getTracer('streaks-service');

// OpenTelemetry metrics
const meter = metrics.getMeter('streaks-service');
const badgeAwardCounter = meter.createCounter('badges_awarded_total', {
  description: 'Total number of badges awarded',
});
const streakIncrementCounter = meter.createCounter('streaks_incremented_total', {
  description: 'Total number of streak increments',
});
const complianceCheckCounter = meter.createCounter('compliance_checks_total', {
  description: 'Total number of compliance checks',
});

/**
 * Badge definitions with criteria
 */
export const BADGE_DEFINITIONS = {
  day_one_done: {
    type: 'day_one_done' as const,
    name: 'Day One, Done',
    description: 'Completed your first day with 80%+ compliance',
  },
  week_warrior: {
    type: 'week_warrior' as const,
    name: 'Week Warrior',
    description: 'Maintained 80%+ compliance for 7 consecutive days',
  },
  consistency_king: {
    type: 'consistency_king' as const,
    name: 'Consistency King',
    description: 'Never missed a single day - 100 day streak',
  },
  perfect_month: {
    type: 'perfect_month' as const,
    name: 'Perfect Month',
    description: 'Maintained 80%+ compliance for 30 consecutive days',
  },
  hundred_club: {
    type: 'hundred_club' as const,
    name: 'Hundred Club',
    description: 'Reached a 100-day compliance streak',
  },
} as const;

/**
 * Compliance threshold for streak calculation
 */
export const COMPLIANCE_THRESHOLD = 0.8; // 80%

/**
 * Streak data response
 */
export interface StreakData {
  userId: number;
  currentStreak: number;
  longestStreak: number;
  totalCompliantDays: number;
  lastComplianceDate: Date | null;
  streakStartDate: Date | null;
}

/**
 * Service for managing user streaks and badges
 * Handles daily compliance calculation, streak tracking, and badge awards
 */
export class StreaksService {
  /**
   * Calculate daily compliance for a user on a specific date
   * A day is compliant when >= threshold% of daily tasks are completed
   * Threshold is configurable per user (defaults to 80%)
   *
   * @param userId - User ID
   * @param date - Date to check (defaults to today)
   * @returns True if user met compliance threshold
   */
  async calculateDailyCompliance(userId: number, date: Date = new Date()): Promise<boolean> {
    const span = tracer.startSpan('streaks.calculate_daily_compliance');

    try {
      span.setAttributes({
        'user.id': userId,
        'date': format(date, 'yyyy-MM-dd'),
      });

      const dayStart = startOfDay(date);
      const dayEnd = endOfDay(date);

      logger.info(
        { userId, date: format(date, 'yyyy-MM-dd') },
        'Calculating daily compliance'
      );

      // Get user's compliance threshold (configurable per user)
      const [userSettingsRecord] = await db
        .select({ complianceThreshold: userSettings.complianceThreshold })
        .from(userSettings)
        .where(eq(userSettings.userId, userId));

      const threshold = userSettingsRecord?.complianceThreshold
        ? parseFloat(userSettingsRecord.complianceThreshold)
        : COMPLIANCE_THRESHOLD; // 0.8 default

      // Get all tasks for the day
      const tasksForDay = await db
        .select({
          id: dailyTasks.id,
          title: dailyTasks.title,
          taskType: dailyTasks.taskType,
          status: dailyTasks.status,
          completedAt: dailyTasks.completedAt,
        })
        .from(dailyTasks)
        .where(
          and(
            eq(dailyTasks.userId, userId),
            gte(dailyTasks.dueDate, dayStart),
            lte(dailyTasks.dueDate, dayEnd)
          )
        );

      if (tasksForDay.length === 0) {
        logger.info(
          { userId, date: format(date, 'yyyy-MM-dd') },
          'No tasks found for day - treating as non-compliant'
        );
        complianceCheckCounter.add(1, { is_compliant: 'false' });
        span.setStatus({ code: SpanStatusCode.OK });
        return false;
      }

      // Count completed tasks
      const completedTasks = tasksForDay.filter(
        (task) => task.status === 'completed' && task.completedAt !== null
      );

      const compliancePercentage = completedTasks.length / tasksForDay.length;
      const isCompliant = compliancePercentage >= threshold;

      span.setAttributes({
        'compliance.total_tasks': tasksForDay.length,
        'compliance.completed_tasks': completedTasks.length,
        'compliance.percentage': compliancePercentage,
        'compliance.threshold': threshold,
        'compliance.is_compliant': isCompliant,
      });

      // Record metric
      complianceCheckCounter.add(1, { is_compliant: isCompliant.toString() });

      logger.info(
        {
          userId,
          date: format(date, 'yyyy-MM-dd'),
          totalTasks: tasksForDay.length,
          completedTasks: completedTasks.length,
          compliancePercentage: (compliancePercentage * 100).toFixed(2),
          threshold: (threshold * 100).toFixed(0),
          isCompliant,
        },
        'Daily compliance calculated'
      );

      span.setStatus({ code: SpanStatusCode.OK });
      return isCompliant;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      span.setStatus({
        code: SpanStatusCode.ERROR,
        message: errorMessage,
      });
      span.recordException(error as Error);

      logger.error(
        { err: error, userId, date: format(date, 'yyyy-MM-dd'), errorMessage },
        'Error calculating daily compliance'
      );

      throw new AppError(500, 'Failed to calculate compliance. Please try again.');
    } finally {
      span.end();
    }
  }

  /**
   * Increment user's compliance streak atomically
   * Checks if a day was missed and resets if necessary
   * Uses user's timezone to prevent streak breaks due to timezone differences
   *
   * @param userId - User ID
   * @returns Updated streak data
   */
  async incrementStreak(userId: number): Promise<StreakData> {
    const span = tracer.startSpan('streaks.increment_streak');

    try {
      span.setAttributes({ 'user.id': userId });

      logger.info({ userId }, 'Incrementing user streak');

      // Use database transaction for atomicity
      const result = await db.transaction(async (tx) => {
        // Get user timezone
        const [user] = await tx
          .select({ timezone: users.timezone })
          .from(users)
          .where(eq(users.id, userId));

        if (!user?.timezone) {
          logger.warn({ userId }, 'User timezone not set, using UTC fallback');
        }
        const userTimezone = user?.timezone || 'UTC';

        // Get or create streak record (one row per user)
        let [streakRecord] = await tx
          .select()
          .from(dailyComplianceStreaks)
          .where(eq(dailyComplianceStreaks.userId, userId))
          .for('update'); // Lock row for update

        const now = new Date();
        // Convert current server time to user's local time
        const userNow = toZonedTime(now, userTimezone);

        if (!streakRecord) {
          // Create new streak record
          const [newStreak] = await tx
            .insert(dailyComplianceStreaks)
            .values({
              userId,
              currentStreak: 1,
              longestStreak: 1,
              totalCompliantDays: 1,
              lastComplianceDate: now,
              streakStartDate: now,
            })
            .returning();

          logger.info(
            { userId, streak: 1, timezone: userTimezone },
            'Created new streak record'
          );

          return {
            userId,
            currentStreak: newStreak.currentStreak,
            longestStreak: newStreak.longestStreak,
            totalCompliantDays: newStreak.totalCompliantDays,
            lastComplianceDate: newStreak.lastComplianceDate,
            streakStartDate: newStreak.streakStartDate,
          };
        }

        // Check if already completed today (in user's timezone)
        if (streakRecord.lastComplianceDate) {
          const userLastDate = toZonedTime(streakRecord.lastComplianceDate, userTimezone);
          const userTodayStr = format(userNow, 'yyyy-MM-dd');
          const userLastDateStr = format(userLastDate, 'yyyy-MM-dd');

          if (userTodayStr === userLastDateStr) {
            logger.info(
              { userId, currentStreak: streakRecord.currentStreak, timezone: userTimezone },
              'Streak already incremented today in user timezone'
            );
            return {
              userId,
              currentStreak: streakRecord.currentStreak,
              longestStreak: streakRecord.longestStreak,
              totalCompliantDays: streakRecord.totalCompliantDays,
              lastComplianceDate: streakRecord.lastComplianceDate,
              streakStartDate: streakRecord.streakStartDate,
            };
          }
        }

        // Check if a day was missed (gap > 1 day in user's timezone)
        const daysSinceLastCompletion = streakRecord.lastComplianceDate
          ? differenceInDays(
              toZonedTime(now, userTimezone),
              toZonedTime(streakRecord.lastComplianceDate, userTimezone)
            )
          : 999; // Large number if never completed

        let newCurrentStreak: number;
        let newStreakStartDate: Date;

        if (daysSinceLastCompletion > 1) {
          // Streak was broken - reset to 1
          newCurrentStreak = 1;
          newStreakStartDate = now;
          logger.warn(
            {
              userId,
              daysSinceLastCompletion,
              previousStreak: streakRecord.currentStreak,
              timezone: userTimezone,
            },
            'Streak broken - resetting to 1'
          );
        } else {
          // Continue streak
          newCurrentStreak = streakRecord.currentStreak + 1;
          newStreakStartDate = streakRecord.streakStartDate || now;
          logger.info(
            { userId, newStreak: newCurrentStreak, timezone: userTimezone },
            'Streak incremented'
          );
        }

        // Update streak record
        const [updatedStreak] = await tx
          .update(dailyComplianceStreaks)
          .set({
            currentStreak: newCurrentStreak,
            longestStreak: Math.max(newCurrentStreak, streakRecord.longestStreak),
            totalCompliantDays: streakRecord.totalCompliantDays + 1,
            lastComplianceDate: now,
            streakStartDate: newStreakStartDate,
            updatedAt: new Date(),
          })
          .where(eq(dailyComplianceStreaks.userId, userId))
          .returning();

        return {
          userId,
          currentStreak: updatedStreak.currentStreak,
          longestStreak: updatedStreak.longestStreak,
          totalCompliantDays: updatedStreak.totalCompliantDays,
          lastComplianceDate: updatedStreak.lastComplianceDate,
          streakStartDate: updatedStreak.streakStartDate,
        };
      });

      span.setAttributes({
        'streak.current': result.currentStreak,
        'streak.longest': result.longestStreak,
        'streak.total': result.totalCompliantDays,
      });

      // Record metric
      streakIncrementCounter.add(1, {
        user_id: userId.toString(),
        streak: result.currentStreak.toString(),
      });

      // Always invalidate both caches together for consistency
      await Promise.all([
        redisCache.invalidate(`streak:${userId}`),
        redisCache.invalidate(`badges:${userId}`)
      ]);

      span.setStatus({ code: SpanStatusCode.OK });
      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      span.setStatus({
        code: SpanStatusCode.ERROR,
        message: errorMessage,
      });
      span.recordException(error as Error);

      logger.error({ err: error, userId, errorMessage }, 'Error incrementing streak');
      throw new AppError(500, 'Failed to increment streak. Please try again.');
    } finally {
      span.end();
    }
  }

  /**
   * Check and award badges based on user's current achievements
   * Uses unique constraint to prevent duplicate awards (idempotent)
   * Wrapped in transaction to ensure all-or-nothing badge awards
   *
   * @param userId - User ID
   * @returns Array of newly awarded badges
   */
  async checkAndAwardBadges(userId: number): Promise<SelectUserBadge[]> {
    const span = tracer.startSpan('streaks.check_and_award_badges');

    try {
      span.setAttributes({ 'user.id': userId });

      logger.info({ userId }, 'Checking for badge awards');

      // Use transaction to ensure all badges are awarded atomically
      const awardedBadges = await db.transaction(async (tx) => {
        const badges: SelectUserBadge[] = [];

        // Get user's current streak
        const [streakRecord] = await tx
          .select()
          .from(dailyComplianceStreaks)
          .where(eq(dailyComplianceStreaks.userId, userId));

        if (!streakRecord) {
          logger.info({ userId }, 'No streak record found - no badges to award');
          return [];
        }

        // Check for "Day One, Done" badge (first compliant day)
        if (streakRecord.currentStreak >= 1) {
          const dayOneBadge = await this.awardBadgeIfNotExistsInTx(tx, userId, 'day_one_done');
          if (dayOneBadge) {
            badges.push(dayOneBadge);
          }
        }

        // Check for "Week Warrior" badge (7-day streak)
        if (streakRecord.currentStreak >= 7) {
          const weekWarriorBadge = await this.awardBadgeIfNotExistsInTx(tx, userId, 'week_warrior');
          if (weekWarriorBadge) {
            badges.push(weekWarriorBadge);
          }
        }

        // Check for "Perfect Month" badge (30-day streak)
        if (streakRecord.currentStreak >= 30) {
          const perfectMonthBadge = await this.awardBadgeIfNotExistsInTx(tx, userId, 'perfect_month');
          if (perfectMonthBadge) {
            badges.push(perfectMonthBadge);
          }
        }

        // Check for "Hundred Club" badge (100-day streak)
        if (streakRecord.currentStreak >= 100) {
          const hundredClubBadge = await this.awardBadgeIfNotExistsInTx(tx, userId, 'hundred_club');
          if (hundredClubBadge) {
            badges.push(hundredClubBadge);
          }
        }

        // Check for "Consistency King" badge (100-day streak with no breaks)
        if (streakRecord.currentStreak >= 100) {
          const consistencyKingBadge = await this.awardBadgeIfNotExistsInTx(tx, userId, 'consistency_king');
          if (consistencyKingBadge) {
            badges.push(consistencyKingBadge);
          }
        }

        return badges;
      });

      span.setAttributes({
        'badges.awarded_count': awardedBadges.length,
      });

      // Always invalidate both caches together for consistency
      await Promise.all([
        redisCache.invalidate(`streak:${userId}`),
        redisCache.invalidate(`badges:${userId}`)
      ]);

      logger.info(
        {
          userId,
          awardedCount: awardedBadges.length,
          badges: awardedBadges.map((b) => b.badgeType),
        },
        'Badge check completed'
      );

      span.setStatus({ code: SpanStatusCode.OK });
      return awardedBadges;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      span.setStatus({
        code: SpanStatusCode.ERROR,
        message: errorMessage,
      });
      span.recordException(error as Error);

      logger.error({ err: error, userId, errorMessage }, 'Error checking and awarding badges');
      throw new AppError(500, 'Failed to check badges. Please try again.');
    } finally {
      span.end();
    }
  }

  /**
   * Award a badge to a user if they don't already have it (within transaction)
   * Idempotent - uses unique constraint to prevent duplicates
   *
   * @param tx - Database transaction
   * @param userId - User ID
   * @param badgeType - Badge type to award
   * @returns Awarded badge or null if already exists
   */
  private async awardBadgeIfNotExistsInTx(
    tx: any,
    userId: number,
    badgeType: keyof typeof BADGE_DEFINITIONS
  ): Promise<SelectUserBadge | null> {
    try {
      const definition = BADGE_DEFINITIONS[badgeType];

      // Try to insert badge (onConflictDoNothing ensures idempotency)
      const [badge] = await tx
        .insert(userBadges)
        .values({
          userId,
          badgeType: definition.type,
        })
        .onConflictDoNothing({
          target: [userBadges.userId, userBadges.badgeType],
        })
        .returning();

      if (badge) {
        logger.info(
          { userId, badgeType, badgeId: badge.id },
          'Badge awarded (in transaction)'
        );

        // Record metric
        badgeAwardCounter.add(1, {
          badge_type: badgeType,
          user_id: userId.toString(),
        });

        return badge;
      }

      // Badge already exists
      logger.debug({ userId, badgeType }, 'Badge already exists - skipping');
      return null;
    } catch (error) {
      logger.error(
        { err: error, userId, badgeType },
        'Error awarding badge in transaction'
      );
      // Don't throw - just log and continue with other badges
      return null;
    }
  }

  /**
   * Get user's streak data
   * Cached for 5 minutes to reduce database load
   *
   * @param userId - User ID
   * @returns Streak data
   */
  async getUserStreaks(userId: number): Promise<StreakData> {
    const span = tracer.startSpan('streaks.get_user_streaks');

    try {
      span.setAttributes({ 'user.id': userId });

      // Try cache first
      const cacheKey = `streak:${userId}`;
      const cached = await redisCache.get<StreakData>(cacheKey);
      if (cached) {
        logger.debug({ userId }, 'Streak data from cache');
        span.setAttributes({ 'cache.hit': true });
        span.setStatus({ code: SpanStatusCode.OK });
        return cached;
      }

      span.setAttributes({ 'cache.hit': false });
      logger.info({ userId }, 'Fetching user streaks from database');

      const [streakRecord] = await db
        .select()
        .from(dailyComplianceStreaks)
        .where(eq(dailyComplianceStreaks.userId, userId));

      let streakData: StreakData;

      if (!streakRecord) {
        logger.info({ userId }, 'No streak record found - returning zeros');
        streakData = {
          userId,
          currentStreak: 0,
          longestStreak: 0,
          totalCompliantDays: 0,
          lastComplianceDate: null,
          streakStartDate: null,
        };
      } else {
        streakData = {
          userId,
          currentStreak: streakRecord.currentStreak,
          longestStreak: streakRecord.longestStreak,
          totalCompliantDays: streakRecord.totalCompliantDays,
          lastComplianceDate: streakRecord.lastComplianceDate,
          streakStartDate: streakRecord.streakStartDate,
        };
      }

      // Cache for 5 minutes
      await redisCache.set(cacheKey, streakData, 300);

      span.setStatus({ code: SpanStatusCode.OK });
      return streakData;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      span.setStatus({
        code: SpanStatusCode.ERROR,
        message: errorMessage,
      });
      span.recordException(error as Error);

      logger.error({ err: error, userId, errorMessage }, 'Error fetching user streaks');
      throw new AppError(500, 'Failed to fetch user streaks. Please try again.');
    } finally {
      span.end();
    }
  }

  /**
   * Get user's badges
   * Cached for 5 minutes to reduce database load
   *
   * @param userId - User ID
   * @returns Array of user's badges
   */
  async getUserBadges(userId: number): Promise<SelectUserBadge[]> {
    const span = tracer.startSpan('streaks.get_user_badges');

    try {
      span.setAttributes({ 'user.id': userId });

      // Try cache first
      const cacheKey = `badges:${userId}`;
      const cached = await redisCache.get<SelectUserBadge[]>(cacheKey);
      if (cached) {
        logger.debug({ userId }, 'Badge data from cache');
        span.setAttributes({ 'cache.hit': true });
        span.setStatus({ code: SpanStatusCode.OK });
        return cached;
      }

      span.setAttributes({ 'cache.hit': false });
      logger.info({ userId }, 'Fetching user badges from database');

      const badges = await db
        .select()
        .from(userBadges)
        .where(eq(userBadges.userId, userId))
        .orderBy(desc(userBadges.awardedAt));

      span.setAttributes({
        'badges.count': badges.length,
      });

      logger.info(
        { userId, badgeCount: badges.length },
        'User badges fetched'
      );

      // Cache for 5 minutes
      await redisCache.set(cacheKey, badges, 300);

      span.setStatus({ code: SpanStatusCode.OK });
      return badges;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      span.setStatus({
        code: SpanStatusCode.ERROR,
        message: errorMessage,
      });
      span.recordException(error as Error);

      logger.error({ err: error, userId, errorMessage }, 'Error fetching user badges');
      throw new AppError(500, 'Failed to fetch user badges. Please try again.');
    } finally {
      span.end();
    }
  }
}
