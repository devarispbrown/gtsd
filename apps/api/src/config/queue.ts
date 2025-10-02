import { Queue, Worker, Job } from 'bullmq';
import { env } from './env';
import { logger } from './logger';

const connection = {
  host: new URL(env.REDIS_URL).hostname,
  port: parseInt(new URL(env.REDIS_URL).port || '6379', 10),
};

export const emailQueue = new Queue('email', { connection });

/**
 * SMS queue for processing SMS notification jobs
 */
export const smsQueue = new Queue('sms', { connection });

/**
 * Job data structure for SMS jobs
 */
export interface SmsJobData {
  userId: number;
  messageType: 'morning_nudge' | 'evening_reminder';
}

export const createEmailWorker = () => {
  const worker = new Worker(
    'email',
    async (job: Job) => {
      logger.info({ jobId: job.id, data: job.data }, 'Processing email job');

      // Simulate email sending
      await new Promise((resolve) => setTimeout(resolve, 1000));

      logger.info({ jobId: job.id }, 'Email job completed');
      return { success: true };
    },
    { connection }
  );

  worker.on('completed', (job: Job) => {
    logger.info({ jobId: job.id }, 'Job completed');
  });

  worker.on('failed', (job: Job | undefined, err: Error) => {
    logger.error({ jobId: job?.id, err }, 'Job failed');
  });

  return worker;
};

export const closeQueues = async () => {
  await emailQueue.close();
  await smsQueue.close();
  logger.info('Queues closed');
};