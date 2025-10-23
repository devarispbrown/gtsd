import cron from 'node-cron';
import { db } from '../db/connection';
import { users } from '../db/schema';
import { eq } from 'drizzle-orm';
import { StreaksService } from '../services/streaks';
import { logger } from '../config/logger';

/**
 * Daily compliance check job
 * Runs at 11:59 PM to calculate compliance for the day and update streaks
 */
export class DailyComplianceJob {
  private streaksService: StreaksService;
  private task: cron.ScheduledTask | null = null;

  constructor() {
    this.streaksService = new StreaksService();
  }

  /**
   * Run daily compliance check for all active users
   * Processes each user's compliance for the previous day
   *
   * This job runs at 11:59 PM, so it checks yesterday's compliance
   * to ensure all tasks for the day have been completed
   */
  async run(): Promise<void> {
    const jobStartTime = new Date();
    logger.info({ jobStartTime }, 'Starting daily compliance check job');

    try {
      // Get all active users
      const activeUsers = await db
        .select({
          id: users.id,
          email: users.email,
          timezone: users.timezone,
        })
        .from(users)
        .where(eq(users.isActive, true));

      logger.info(
        { userCount: activeUsers.length },
        'Processing users for daily compliance check'
      );

      let processed = 0;
      let compliant = 0;
      let nonCompliant = 0;
      let errors = 0;

      // Process each user sequentially to avoid database contention
      for (const user of activeUsers) {
        try {
          logger.debug(
            { userId: user.id, email: user.email },
            'Processing user compliance'
          );

          // Calculate compliance for today (job runs at end of day)
          const today = new Date();
          const isCompliant = await this.streaksService.calculateDailyCompliance(
            user.id,
            today
          );

          if (isCompliant) {
            // Increment streak and check for badges
            await this.streaksService.incrementStreak(user.id);
            await this.streaksService.checkAndAwardBadges(user.id);

            compliant++;
            logger.debug(
              { userId: user.id, email: user.email },
              'User is compliant - streak incremented'
            );
          } else {
            nonCompliant++;
            logger.debug(
              { userId: user.id, email: user.email },
              'User is not compliant - streak will be reset on next completion'
            );
          }

          processed++;
        } catch (error) {
          errors++;
          logger.error(
            { userId: user.id, email: user.email, err: error },
            'Error processing user compliance'
          );
          // Continue processing other users even if one fails
        }
      }

      const jobEndTime = new Date();
      const durationMs = jobEndTime.getTime() - jobStartTime.getTime();

      logger.info(
        {
          processed,
          compliant,
          nonCompliant,
          errors,
          durationMs,
          startTime: jobStartTime,
          endTime: jobEndTime,
        },
        'Daily compliance check job completed'
      );
    } catch (error) {
      logger.error({ err: error }, 'Daily compliance check job failed');
      throw error;
    }
  }

  /**
   * Schedule the job to run daily at 11:59 PM
   * Uses cron expression: '59 23 * * *'
   * - Runs at minute 59 of hour 23 (11:59 PM)
   * - Every day of the month
   * - Every month
   * - Every day of the week
   *
   * @param timezone - Timezone for the cron job (default: America/Los_Angeles)
   */
  schedule(timezone: string = 'America/Los_Angeles'): void {
    // Validate the cron expression first
    if (!cron.validate('59 23 * * *')) {
      throw new Error('Invalid cron expression for daily compliance check');
    }

    this.task = cron.schedule(
      '59 23 * * *',
      async () => {
        logger.info('Triggering scheduled daily compliance check');
        try {
          await this.run();
        } catch (error) {
          logger.error(
            { err: error },
            'Scheduled daily compliance check failed'
          );
        }
      },
      {
        scheduled: true,
        timezone,
      }
    );

    logger.info(
      { cronExpression: '59 23 * * *', timezone },
      'Daily compliance check job scheduled (runs at 11:59 PM daily)'
    );
  }

  /**
   * Stop the scheduled job
   */
  stop(): void {
    if (this.task) {
      this.task.stop();
      logger.info('Daily compliance check job stopped');
    }
  }

  /**
   * Start the scheduled job (if it was stopped)
   */
  start(): void {
    if (this.task) {
      this.task.start();
      logger.info('Daily compliance check job started');
    }
  }

  /**
   * Get the current status of the job
   */
  getStatus(): {
    isScheduled: boolean;
    cronExpression: string;
  } {
    return {
      isScheduled: this.task !== null,
      cronExpression: '59 23 * * *',
    };
  }
}
