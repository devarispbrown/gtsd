import { createEmailWorker } from '../config/queue';
import { createSmsWorker } from './sms-worker';
import { logger } from '../config/logger';
import { env } from '../config/env';

const connection = {
  host: new URL(env.REDIS_URL).hostname,
  port: parseInt(new URL(env.REDIS_URL).port || '6379', 10),
};

const startWorkers = () => {
  logger.info('Starting background workers...');

  const emailWorker = createEmailWorker();
  const smsWorker = createSmsWorker(connection);

  logger.info('Workers started: email, sms');

  // Graceful shutdown
  const shutdown = async (signal: string) => {
    logger.info(`${signal} received, shutting down workers...`);

    try {
      await Promise.all([
        emailWorker.close(),
        smsWorker.close(),
      ]);
      logger.info('Workers shut down successfully');
      process.exit(0);
    } catch (error) {
      logger.error({ err: error }, 'Error shutting down workers');
      process.exit(1);
    }
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));

  logger.info('✅ Workers started successfully');
};

startWorkers();