import { Worker, Job } from 'bullmq';
import { SmsJobData } from '../config/queue';
import { logger } from '../config/logger';
import { db } from '../db/connection';
import { users, smsLogs, dailyTasks } from '../db/schema';
import { eq, and, gte, lt, sql, inArray } from 'drizzle-orm';
import { twilioService, TwilioService } from '../services/twilio';
import { trace, SpanStatusCode } from '@opentelemetry/api';
import { toZonedTime, fromZonedTime } from 'date-fns-tz';
import { smsCounter, smsDuration, quietHoursSkipped } from '../metrics/sms-metrics';

const tracer = trace.getTracer('sms-worker');

/**
 * Deep link URLs for the mobile app
 */
const DEEP_LINKS = {
  morning_nudge: 'gtsd://today',
  evening_reminder: 'gtsd://today?reminder=pending',
} as const;

/**
 * SMS message templates
 */
const MESSAGE_TEMPLATES = {
  morning_nudge: (firstName: string) =>
    `Good morning ${firstName}! 🌅 Ready to crush your goals today? Check your daily plan: ${DEEP_LINKS.morning_nudge}`,
  evening_reminder: (firstName: string, taskCount: number) =>
    `Hi ${firstName}! You have ${taskCount} task${taskCount > 1 ? 's' : ''} pending. Complete them before bed: ${DEEP_LINKS.evening_reminder}`,
} as const;

/**
 * Quiet hours configuration (no SMS between 10 PM - 6 AM local time)
 */
const QUIET_HOURS = {
  start: 22, // 10 PM
  end: 6, // 6 AM
};

/**
 * Check if current time is within quiet hours for a given timezone
 */
function isQuietHours(timezone: string): boolean {
  try {
    const now = new Date();
    const zonedNow = toZonedTime(now, timezone);
    const hour = zonedNow.getHours();

    // Quiet hours: 10 PM (22) to 6 AM (6)
    return hour >= QUIET_HOURS.start || hour < QUIET_HOURS.end;
  } catch (error) {
    logger.error({ err: error, timezone }, 'Error checking quiet hours, defaulting to no send');
    return true; // Default to quiet hours if error
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
 * Process SMS job
 */
async function processSmsJob(job: Job<SmsJobData>): Promise<void> {
  const span = tracer.startSpan('sms_worker.process_job');
  const { userId, messageType } = job.data;
  const timer = smsDuration.startTimer({ type: messageType });

  try {
    logger.info(
      {
        jobId: job.id,
        userId,
        messageType,
      },
      'Processing SMS job'
    );

    // Get user details
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!user) {
      logger.warn({ userId, jobId: job.id }, 'User not found, skipping SMS');
      span.setStatus({ code: SpanStatusCode.ERROR, message: 'User not found' });
      span.end();
      return;
    }

    // Check if user has opted in
    if (!user.smsOptIn) {
      logger.info({ userId, jobId: job.id }, 'User has opted out of SMS, skipping');
      span.setAttribute('skip_reason', 'opted_out');
      span.setStatus({ code: SpanStatusCode.OK });
      span.end();
      return;
    }

    // Validate phone number
    if (!TwilioService.isValidPhoneNumber(user.phone)) {
      logger.warn(
        { userId, phone: user.phone, jobId: job.id },
        'Invalid phone number, skipping SMS'
      );
      span.setAttribute('skip_reason', 'invalid_phone');
      span.setStatus({ code: SpanStatusCode.ERROR, message: 'Invalid phone number' });
      span.end();
      return;
    }

    // Check quiet hours (unless in test mode)
    const timezone = user.timezone || 'America/Los_Angeles';
    if (process.env.SMS_BYPASS_QUIET_HOURS !== 'true' && isQuietHours(timezone)) {
      quietHoursSkipped.inc({ type: messageType });
      logger.info(
        { userId, timezone, jobId: job.id },
        'Current time is within quiet hours, skipping SMS'
      );
      span.setAttribute('skip_reason', 'quiet_hours');
      span.setStatus({ code: SpanStatusCode.OK });
      span.end();
      timer();
      return;
    }

    // For evening reminders, check if user has pending tasks
    if (messageType === 'evening_reminder') {
      const pendingCount = await getPendingTaskCount(userId, timezone);
      if (pendingCount === 0) {
        logger.info(
          { userId, jobId: job.id },
          'No pending tasks for evening reminder, skipping'
        );
        span.setAttribute('skip_reason', 'no_pending_tasks');
        span.setStatus({ code: SpanStatusCode.OK });
        span.end();
        timer();
        return;
      }

      // Add pending count to span
      span.setAttribute('pending_task_count', pendingCount);
    }

    // Generate message
    const firstName = user.name.split(' ')[0];
    const messageBody =
      messageType === 'morning_nudge'
        ? MESSAGE_TEMPLATES.morning_nudge(firstName)
        : MESSAGE_TEMPLATES.evening_reminder(
            firstName,
            await getPendingTaskCount(userId, timezone)
          );

    // Format phone number
    const formattedPhone = TwilioService.formatPhoneNumber(user.phone!)!;

    // Atomic check-and-insert within transaction using advisory locks to prevent race conditions
    const smsLog = await db.transaction(async (tx) => {
      // Hash messageType to integer for advisory lock
      // morning_nudge = 1, evening_reminder = 2
      const messageTypeId = messageType === 'morning_nudge' ? 1 : 2;

      // Acquire advisory lock - prevents concurrent access for this user+type
      // Lock is automatically released when transaction ends
      await tx.execute(
        sql`SELECT pg_advisory_xact_lock(${userId}, ${messageTypeId})`
      );

      // Now check for recent message (protected by advisory lock)
      const twentyThreeHoursAgo = new Date(Date.now() - 23 * 60 * 60 * 1000);

      const [recent] = await tx
        .select()
        .from(smsLogs)
        .where(
          and(
            eq(smsLogs.userId, userId),
            eq(smsLogs.messageType, messageType),
            gte(smsLogs.createdAt, twentyThreeHoursAgo),
            inArray(smsLogs.status, ['queued', 'sent', 'delivered'])
          )
        )
        .limit(1);

      if (recent) {
        return null; // Already has recent message
      }

      // Insert within same transaction (still protected by advisory lock)
      const [log] = await tx.insert(smsLogs).values({
        userId,
        messageType,
        messageBody,
        status: 'queued',
      }).returning();

      return log;
    });

    if (!smsLog) {
      logger.info(
        { userId, messageType, jobId: job.id },
        'Skipped due to recent message (race avoided with advisory lock)'
      );
      span.setAttribute('skip_reason', 'recent_message_exists');
      span.setStatus({ code: SpanStatusCode.OK });
      span.end();
      return;
    }

    logger.info(
      { smsLogId: smsLog.id, userId, messageType },
      'Created SMS log entry'
    );

    // Send SMS via Twilio
    const result = await twilioService.sendSMS(formattedPhone, messageBody);

    // Update log with result
    if (result.success) {
      await db
        .update(smsLogs)
        .set({
          status: 'sent',
          twilioSid: result.sid,
          sentAt: new Date(),
        })
        .where(eq(smsLogs.id, smsLog.id));

      smsCounter.inc({ type: messageType, status: 'sent' });

      logger.info(
        {
          smsLogId: smsLog.id,
          userId,
          twilioSid: result.sid,
        },
        'SMS sent successfully'
      );

      span.setAttribute('twilio.sid', result.sid || '');
      span.setStatus({ code: SpanStatusCode.OK });
    } else {
      await db
        .update(smsLogs)
        .set({
          status: 'failed',
          errorMessage: result.errorMessage,
        })
        .where(eq(smsLogs.id, smsLog.id));

      smsCounter.inc({ type: messageType, status: 'failed' });

      logger.error(
        {
          smsLogId: smsLog.id,
          userId,
          errorMessage: result.errorMessage,
          errorCode: result.errorCode,
        },
        'Failed to send SMS'
      );

      span.setStatus({
        code: SpanStatusCode.ERROR,
        message: result.errorMessage || 'Failed to send SMS'
      });

      // Throw error to trigger retry
      throw new Error(`SMS send failed: ${result.errorMessage}`);
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    logger.error(
      {
        err: error,
        jobId: job.id,
        userId,
        messageType,
      },
      'Error processing SMS job'
    );

    if (error instanceof Error) {
      span.recordException(error);
    }
    span.setStatus({
      code: SpanStatusCode.ERROR,
      message: errorMessage
    });

    throw error; // Re-throw to trigger BullMQ retry
  } finally {
    timer();
    span.end();
  }
}

/**
 * Create SMS worker
 */
export const createSmsWorker = (connection: { host: string; port: number }) => {
  const worker = new Worker<SmsJobData>(
    'sms',
    async (job) => {
      await processSmsJob(job);
    },
    {
      connection,
      settings: {
        // Retry configuration: 3 attempts with exponential backoff
        backoffStrategy: (attemptsMade: number) => {
          // Exponential backoff: 1min, 5min, 15min
          return Math.min(60000 * Math.pow(3, attemptsMade - 1), 900000);
        },
      },
      autorun: true,
      concurrency: 5, // Process up to 5 SMS jobs concurrently
    }
  );

  worker.on('completed', (job) => {
    logger.info(
      {
        jobId: job.id,
        userId: job.data.userId,
        messageType: job.data.messageType,
      },
      'SMS job completed'
    );
  });

  worker.on('failed', (job, err) => {
    logger.error(
      {
        jobId: job?.id,
        userId: job?.data?.userId,
        messageType: job?.data?.messageType,
        err,
        attemptsMade: job?.attemptsMade,
      },
      'SMS job failed'
    );
  });

  worker.on('stalled', (jobId) => {
    logger.warn({ jobId }, 'SMS job stalled');
  });

  return worker;
};
