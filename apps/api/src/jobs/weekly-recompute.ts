import { db } from '../db/connection';
import { userSettings } from '../db/schema';
import { eq } from 'drizzle-orm';
import { logger } from '../config/logger';
import { PlansService } from '../routes/plans/service';
import type { WeeklyRecomputeResult } from '@gtsd/shared-types';

/**
 * Weekly recompute job
 * Runs weekly to recompute health targets for all users
 *
 * @remarks
 * - Fetches all users with onboardingCompleted = true
 * - For each user, calls PlansService.recomputeForUser()
 * - Collects results into WeeklyRecomputeResult
 * - Logs summary without PII (userId only)
 * - Can be triggered manually or by cron scheduler
 *
 * Usage:
 * - Manual: `await weeklyRecomputeJob.run()`
 * - Scheduled: Configured in jobs/index.ts
 */
export class WeeklyRecomputeJob {
  private plansService = new PlansService();

  /**
   * Run the weekly recompute job
   *
   * @returns Result summary with counts and updates
   *
   * @remarks
   * - Performance: Processes users sequentially to avoid DB overload
   * - Error handling: Individual user failures don't stop job
   * - Logging: Summary logged at completion
   */
  async run(): Promise<WeeklyRecomputeResult> {
    const startTime = Date.now();

    logger.info('Starting weekly recompute job');

    // Fetch all users with completed onboarding
    const users = await db
      .select({ userId: userSettings.userId })
      .from(userSettings)
      .where(eq(userSettings.onboardingCompleted, true));

    const result: WeeklyRecomputeResult = {
      totalUsers: users.length,
      successCount: 0,
      errorCount: 0,
      updates: [],
    };

    logger.info({ totalUsers: result.totalUsers }, 'Processing users for recompute');

    // Process each user
    for (const { userId } of users) {
      try {
        const recomputeResult = await this.plansService.recomputeForUser(userId);

        if (recomputeResult.success) {
          result.successCount++;

          if (recomputeResult.updated) {
            result.updates.push({
              userId,
              previousCalories: recomputeResult.previousCalories!,
              newCalories: recomputeResult.newCalories!,
              previousProtein: recomputeResult.previousProtein!,
              newProtein: recomputeResult.newProtein!,
              reason: recomputeResult.reason!,
            });

            logger.info(
              {
                userId,
                previousCalories: recomputeResult.previousCalories,
                newCalories: recomputeResult.newCalories,
                previousProtein: recomputeResult.previousProtein,
                newProtein: recomputeResult.newProtein,
                reason: recomputeResult.reason,
              },
              'User targets updated'
            );
          }
        }
      } catch (error) {
        result.errorCount++;
        logger.error({ userId, error }, 'Failed to recompute for user');
      }
    }

    const duration = Date.now() - startTime;

    logger.info(
      {
        totalUsers: result.totalUsers,
        successCount: result.successCount,
        errorCount: result.errorCount,
        updatedCount: result.updates.length,
        durationMs: duration,
      },
      'Weekly recompute job completed'
    );

    return result;
  }
}

/**
 * Singleton instance for job scheduler
 */
export const weeklyRecomputeJob = new WeeklyRecomputeJob();
