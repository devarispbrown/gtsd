import cron from 'node-cron';
import { db } from '../db/connection';
import { userSettings, users } from '../db/schema';
import { eq } from 'drizzle-orm';
import { logger } from '../config/logger';
import { metricsService } from '../services/metrics';

/**
 * Daily metrics recompute result
 */
export interface DailyMetricsRecomputeResult {
  totalUsers: number;
  successCount: number;
  errorCount: number;
  skippedCount: number;
}

/**
 * Daily Metrics Recompute Job
 * Runs daily at 00:05 in each user's timezone to compute BMI, BMR, and TDEE
 *
 * @remarks
 * - Fetches all users with onboardingCompleted = true
 * - For each user, computes and stores daily metrics
 * - Individual user failures don't stop the job
 * - Logs summary without PII (userId only)
 * - Can be triggered manually or by cron scheduler
 *
 * Timezone handling:
 * - Ideally runs at 00:05 in each user's timezone
 * - Current implementation runs at 00:05 UTC for all users
 * - Future enhancement: timezone-aware scheduling
 *
 * Usage:
 * - Manual: `await dailyMetricsRecomputeJob.run()`
 * - Scheduled: Configured in jobs/scheduler.ts
 */
export class DailyMetricsRecomputeJob {
  private cronTask: cron.ScheduledTask | null = null;
  private isScheduled = false;

  /**
   * Schedule the job to run daily at 00:05 UTC
   * In production, this would be enhanced to handle per-user timezones
   */
  schedule(): void {
    if (this.isScheduled) {
      logger.warn('Daily metrics recompute job is already scheduled');
      return;
    }

    // Run at 00:05 UTC every day
    // Cron: minute hour day month day-of-week
    this.cronTask = cron.schedule('5 0 * * *', () => {
      logger.info('Running scheduled daily metrics recompute job');
      void this.run().catch((error: unknown) => {
        logger.error({ err: error }, 'Daily metrics recompute job failed');
      });
    });

    this.isScheduled = true;
    logger.info('Daily metrics recompute job scheduled (00:05 UTC daily)');
  }

  /**
   * Stop the scheduled job
   */
  stop(): void {
    if (this.cronTask) {
      this.cronTask.stop();
      this.cronTask = null;
      this.isScheduled = false;
      logger.info('Daily metrics recompute job stopped');
    }
  }

  /**
   * Get job status
   */
  getStatus(): { isScheduled: boolean; cronExpression: string } {
    return {
      isScheduled: this.isScheduled,
      cronExpression: '5 0 * * *',
    };
  }

  /**
   * Run the daily metrics recompute job
   *
   * @returns Result summary with counts
   *
   * @remarks
   * - Processes users sequentially to avoid DB overload
   * - Individual user failures don't stop job
   * - Logs summary at completion
   * - Performance: ~50-100ms per user
   */
  async run(): Promise<DailyMetricsRecomputeResult> {
    const startTime = Date.now();

    logger.info('Starting daily metrics recompute job');

    // Fetch all users with completed onboarding
    const usersWithSettings = await db
      .select({
        userId: userSettings.userId,
        timezone: users.timezone,
        weight: userSettings.currentWeight,
        height: userSettings.height,
        dateOfBirth: userSettings.dateOfBirth,
        gender: userSettings.gender,
        activityLevel: userSettings.activityLevel,
      })
      .from(userSettings)
      .innerJoin(users, eq(users.id, userSettings.userId))
      .where(eq(userSettings.onboardingCompleted, true));

    const result: DailyMetricsRecomputeResult = {
      totalUsers: usersWithSettings.length,
      successCount: 0,
      errorCount: 0,
      skippedCount: 0,
    };

    logger.info({ totalUsers: result.totalUsers }, 'Processing users for metrics recompute');

    // Process each user
    for (const user of usersWithSettings) {
      try {
        // Skip users with incomplete data
        if (
          !user.weight ||
          !user.height ||
          !user.dateOfBirth ||
          !user.gender ||
          !user.activityLevel
        ) {
          result.skippedCount++;
          logger.debug(
            { userId: user.userId },
            'Skipping user with incomplete health data'
          );
          continue;
        }

        // Compute and store metrics
        await metricsService.computeAndStoreMetrics(user.userId, false);

        result.successCount++;

        logger.debug(
          { userId: user.userId },
          'Metrics computed and stored successfully'
        );
      } catch (error) {
        result.errorCount++;
        logger.error(
          {
            userId: user.userId,
            error,
            errorMessage: error instanceof Error ? error.message : 'Unknown error',
          },
          'Failed to compute metrics for user'
        );
      }
    }

    const duration = Date.now() - startTime;

    logger.info(
      {
        totalUsers: result.totalUsers,
        successCount: result.successCount,
        errorCount: result.errorCount,
        skippedCount: result.skippedCount,
        durationMs: duration,
        avgDurationPerUser: result.totalUsers > 0 ? Math.round(duration / result.totalUsers) : 0,
      },
      'Daily metrics recompute job completed'
    );

    return result;
  }
}

/**
 * Singleton instance for job scheduler
 */
export const dailyMetricsRecomputeJob = new DailyMetricsRecomputeJob();
