import { createEmailWorker } from '../config/queue';
import { logger } from '../config/logger';

const startWorkers = () => {
  logger.info('Starting background workers...');

  const emailWorker = createEmailWorker();

  // Graceful shutdown
  const shutdown = async (signal: string) => {
    logger.info(`${signal} received, shutting down workers...`);

    try {
      await emailWorker.close();
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