import { createApp } from './app';
import { env } from './config/env';
import { logger } from './config/logger';
import { initTracing, shutdownTracing } from './config/tracing';

const startServer = async () => {
  try {
    // Initialize tracing first
    await initTracing();

    const app = createApp();
    const port = parseInt(env.PORT, 10);

    const server = app.listen(port, '0.0.0.0', () => {
      logger.info(`🚀 Server running on port ${port} in ${env.NODE_ENV} mode`);
      logger.info(`📊 Health check: http://localhost:${port}/healthz`);
      logger.info(`📈 Metrics: http://localhost:${port}/metrics`);
    });

    // Graceful shutdown
    const shutdown = async (signal: string) => {
      logger.info(`${signal} received, shutting down gracefully...`);

      server.close(async () => {
        logger.info('HTTP server closed');

        try {
          await shutdownTracing();
          process.exit(0);
        } catch (error) {
          logger.error({ err: error }, 'Error during shutdown');
          process.exit(1);
        }
      });

      // Force shutdown after 10 seconds
      setTimeout(() => {
        logger.error('Forced shutdown after timeout');
        process.exit(1);
      }, 10000);
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
  } catch (error) {
    logger.error({ err: error }, 'Failed to start server');
    process.exit(1);
  }
};

startServer();