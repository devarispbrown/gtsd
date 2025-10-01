import cron from 'node-cron';
import { smsQueue, SmsJobData } from '../config/queue';
import { logger } from '../config/logger';
import { db } from '../db/connection';
import { users, dailyTasks, smsLogs } from '../db/schema';
import { eq, and, isNotNull, gte, lt, sql, inArray, desc } from 'drizzle-orm';
import { toZonedTime, fromZonedTime } from 'date-fns-tz';
import { TwilioService } from './twilio';
import { trace, SpanStatusCode } from '@opentelemetry/api';

const tracer = trace.getTracer('sms-scheduler');

/**
 * List of all supported timezones for scheduling
 * Using IANA timezone database names
 * Currently not enforced - users can use any valid IANA timezone
 */
// const SUPPORTED_TIMEZONES = [
//   'America/Los_Angeles', // Pacific Time (PT)
//   'America/Denver', // Mountain Time (MT)
//   'America/Chicago', // Central Time (CT)
//   'America/New_York', // Eastern Time (ET)
//   'America/Phoenix', // Arizona (no DST)
//   'America/Anchorage', // Alaska Time
//   'Pacific/Honolulu', // Hawaii Time
//   // Add more as needed
// ];

/**
 * Configuration for SMS scheduling
 */
const SCHEDULE_CONFIG = {
  morningNudge: {
    hour: 6,
    minute: 15,
    cronExpression: '* * * * *', // Check every 1 minute for reliability
  },
  eveningReminder: {
    hour: 21, // 9 PM
    minute: 0,
    cronExpression: '* * * * *', // Check every 1 minute for reliability
  },
};

/**
 * Determines if SMS should be sent today for a user
 * Checks:
 * 1. Current time is after target time (6:15 AM or 9:00 PM)
 * 2. SMS hasn't been sent yet today
 */
function shouldSendToday(
  timezone: string,
  targetHour: number,
  targetMinute: number,
  lastSentAt: Date | null
): boolean {
  try {
    const now = new Date();
    const zonedNow = toZonedTime(now, timezone);
    const currentHour = zonedNow.getHours();
    const currentMinute = zonedNow.getMinutes();

    // Check if current time is past target time
    const isAfterTargetTime =
      currentHour > targetHour ||
      (currentHour === targetHour && currentMinute >= targetMinute);

    if (!isAfterTargetTime) {
      return false; // Too early in the day
    }

    // If no previous send, send now
    if (!lastSentAt) {
      return true;
    }

    // Check if last send was today
    const lastSentZoned = toZonedTime(lastSentAt, timezone);
    const todayStart = new Date(zonedNow);
    todayStart.setHours(0, 0, 0, 0);
    const lastSentDayStart = new Date(lastSentZoned);
    lastSentDayStart.setHours(0, 0, 0, 0);

    // If last send was before today, send now
    return lastSentDayStart < todayStart;
  } catch (error) {
    logger.error({ err: error, timezone }, 'Error checking send time');
    return false;
  }
}

/**
 * Get count of pending tasks for today for a user
 * Uses the user's timezone to determine what "today" means
 */
async function getPendingTaskCount(userId: number, timezone: string): Promise<number> {
  // Get current time in user's timezone
  const now = new Date();
  const zonedNow = toZonedTime(now, timezone);

  // Get start and end of today in user's timezone
  const todayStart = new Date(zonedNow);
  todayStart.setHours(0, 0, 0, 0);

  const todayEnd = new Date(zonedNow);
  todayEnd.setHours(23, 59, 59, 999);

  // Convert back to UTC for database query
  const todayStartUtc = fromZonedTime(todayStart, timezone);
  const todayEndUtc = fromZonedTime(todayEnd, timezone);

  const result = await db
    .select({ count: sql<number>`count(*)` })
    .from(dailyTasks)
    .where(
      and(
        eq(dailyTasks.userId, userId),
        eq(dailyTasks.status, 'pending'),
        gte(dailyTasks.dueDate, todayStartUtc),
        lt(dailyTasks.dueDate, todayEndUtc)
      )
    );

  return Number(result[0]?.count || 0);
}

/**
 * Schedule morning nudges (6:15 AM in each user's timezone)
 * Queries users with SMS opt-in and valid phone numbers
 */
async function scheduleMorningNudges(): Promise<void> {
  const span = tracer.startSpan('schedule-morning-nudges');

  try {
    logger.debug('Checking for morning nudges to send...');

    // Get all users with SMS enabled and valid phone numbers
    const eligibleUsers = await db
      .select({
        id: users.id,
        name: users.name,
        phone: users.phone,
        timezone: users.timezone,
      })
      .from(users)
      .where(
        and(
          eq(users.smsOptIn, true),
          isNotNull(users.phone),
          eq(users.isActive, true)
        )
      );

    logger.debug(
      { eligibleUserCount: eligibleUsers.length },
      'Found eligible users for morning nudges'
    );

    let queuedCount = 0;

    for (const user of eligibleUsers) {
      // Validate phone number format
      if (!TwilioService.isValidPhoneNumber(user.phone)) {
        logger.warn(
          { userId: user.id, phone: user.phone },
          'Invalid phone number format, skipping'
        );
        continue;
      }

      const timezone = user.timezone || 'America/Los_Angeles';

      // Get last sent date for this user and message type
      const [lastSent] = await db
        .select({ createdAt: smsLogs.createdAt })
        .from(smsLogs)
        .where(
          and(
            eq(smsLogs.userId, user.id),
            eq(smsLogs.messageType, 'morning_nudge'),
            inArray(smsLogs.status, ['queued', 'sent', 'delivered'])
          )
        )
        .orderBy(desc(smsLogs.createdAt))
        .limit(1);

      // Check if should send today
      if (
        shouldSendToday(
          timezone,
          SCHEDULE_CONFIG.morningNudge.hour,
          SCHEDULE_CONFIG.morningNudge.minute,
          lastSent?.createdAt || null
        )
      ) {
        const jobData: SmsJobData = {
          userId: user.id,
          messageType: 'morning_nudge',
        };

        await smsQueue.add('morning_nudge', jobData, {
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 60000, // Start with 1 minute
          },
          removeOnComplete: {
            age: 86400, // Keep completed jobs for 24 hours
            count: 1000,
          },
          removeOnFail: {
            age: 604800, // Keep failed jobs for 7 days
          },
        });

        queuedCount++;

        logger.info(
          { userId: user.id, timezone, messageType: 'morning_nudge' },
          'Queued morning nudge SMS'
        );
      }
    }

    if (queuedCount > 0) {
      logger.info({ queuedCount }, 'Queued morning nudge SMS jobs');
    }

    span.setStatus({ code: SpanStatusCode.OK });
  } catch (error) {
    logger.error({ err: error }, 'Error scheduling morning nudges');
    span.recordException(error as Error);
    span.setStatus({ code: SpanStatusCode.ERROR, message: (error as Error).message });
  } finally {
    span.end();
  }
}

/**
 * Schedule evening reminders (9:00 PM in each user's timezone)
 * Only sends to users with pending tasks
 */
async function scheduleEveningReminders(): Promise<void> {
  const span = tracer.startSpan('schedule-evening-reminders');

  try {
    logger.debug('Checking for evening reminders to send...');

    // Get all users with SMS enabled and valid phone numbers
    const eligibleUsers = await db
      .select({
        id: users.id,
        name: users.name,
        phone: users.phone,
        timezone: users.timezone,
      })
      .from(users)
      .where(
        and(
          eq(users.smsOptIn, true),
          isNotNull(users.phone),
          eq(users.isActive, true)
        )
      );

    logger.debug(
      { eligibleUserCount: eligibleUsers.length },
      'Found eligible users for evening reminders'
    );

    let queuedCount = 0;

    for (const user of eligibleUsers) {
      // Validate phone number format
      if (!TwilioService.isValidPhoneNumber(user.phone)) {
        logger.warn(
          { userId: user.id, phone: user.phone },
          'Invalid phone number format, skipping'
        );
        continue;
      }

      const timezone = user.timezone || 'America/Los_Angeles';

      // Get last sent date for this user and message type
      const [lastSent] = await db
        .select({ createdAt: smsLogs.createdAt })
        .from(smsLogs)
        .where(
          and(
            eq(smsLogs.userId, user.id),
            eq(smsLogs.messageType, 'evening_reminder'),
            inArray(smsLogs.status, ['queued', 'sent', 'delivered'])
          )
        )
        .orderBy(desc(smsLogs.createdAt))
        .limit(1);

      // Check if should send today
      if (
        shouldSendToday(
          timezone,
          SCHEDULE_CONFIG.eveningReminder.hour,
          SCHEDULE_CONFIG.eveningReminder.minute,
          lastSent?.createdAt || null
        )
      ) {
        // Check if user has pending tasks
        const pendingCount = await getPendingTaskCount(user.id, timezone);

        if (pendingCount === 0) {
          logger.debug(
            { userId: user.id },
            'No pending tasks, skipping evening reminder'
          );
          continue;
        }

        const jobData: SmsJobData = {
          userId: user.id,
          messageType: 'evening_reminder',
        };

        await smsQueue.add('evening_reminder', jobData, {
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 60000, // Start with 1 minute
          },
          removeOnComplete: {
            age: 86400, // Keep completed jobs for 24 hours
            count: 1000,
          },
          removeOnFail: {
            age: 604800, // Keep failed jobs for 7 days
          },
        });

        queuedCount++;

        logger.info(
          {
            userId: user.id,
            timezone,
            pendingCount,
            messageType: 'evening_reminder',
          },
          'Queued evening reminder SMS'
        );
      }
    }

    if (queuedCount > 0) {
      logger.info({ queuedCount }, 'Queued evening reminder SMS jobs');
    }

    span.setStatus({ code: SpanStatusCode.OK });
  } catch (error) {
    logger.error({ err: error }, 'Error scheduling evening reminders');
    span.recordException(error as Error);
    span.setStatus({ code: SpanStatusCode.ERROR, message: (error as Error).message });
  } finally {
    span.end();
  }
}

/**
 * Start the SMS scheduler
 * Sets up cron jobs for morning nudges and evening reminders
 */
export function startScheduler(): void {
  logger.info('Starting SMS scheduler...');

  // Schedule morning nudges - check every 5 minutes
  const morningTask = cron.schedule(
    SCHEDULE_CONFIG.morningNudge.cronExpression,
    () => {
      scheduleMorningNudges().catch((error) => {
        logger.error({ err: error }, 'Unhandled error in morning nudge scheduler');
      });
    },
    {
      timezone: 'UTC', // Run cron in UTC, we handle timezone conversion in the function
    }
  );

  // Schedule evening reminders - check every 5 minutes
  const eveningTask = cron.schedule(
    SCHEDULE_CONFIG.eveningReminder.cronExpression,
    () => {
      scheduleEveningReminders().catch((error) => {
        logger.error({ err: error }, 'Unhandled error in evening reminder scheduler');
      });
    },
    {
      timezone: 'UTC', // Run cron in UTC, we handle timezone conversion in the function
    }
  );

  logger.info(
    {
      morningSchedule: SCHEDULE_CONFIG.morningNudge.cronExpression,
      eveningSchedule: SCHEDULE_CONFIG.eveningReminder.cronExpression,
    },
    'SMS scheduler started successfully'
  );

  // Graceful shutdown handler
  const shutdown = () => {
    logger.info('Stopping SMS scheduler...');
    morningTask.stop();
    eveningTask.stop();
    logger.info('SMS scheduler stopped');
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

/**
 * Manually trigger SMS jobs (for testing)
 */
export async function triggerManualSms(
  userId: number,
  messageType: 'morning_nudge' | 'evening_reminder'
): Promise<void> {
  logger.info({ userId, messageType }, 'Manually triggering SMS job');

  const jobData: SmsJobData = {
    userId,
    messageType,
  };

  await smsQueue.add(`manual_${messageType}`, jobData, {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 60000,
    },
  });

  logger.info({ userId, messageType }, 'Manual SMS job queued');
}
