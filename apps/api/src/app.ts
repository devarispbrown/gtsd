import express, { Application } from 'express';
import { requestContextMiddleware } from './utils/request-context';
import { loggingMiddleware } from './middleware/logging';
import { metricsMiddleware } from './middleware/metrics';
import { authMiddleware } from './middleware/auth';
import { errorHandler, notFoundHandler } from './middleware/error';
import healthRouter from './routes/health';
import metricsRouter from './routes/metrics';
import onboardingRouter from './routes/onboarding';

export const createApp = (): Application => {
  const app = express();

  // Body parsing middleware
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Request context (must be first to ensure requestId is available)
  app.use(requestContextMiddleware);

  // Logging middleware
  app.use(loggingMiddleware);

  // Metrics middleware
  app.use(metricsMiddleware);

  // Auth middleware (extracts userId from headers)
  app.use(authMiddleware);

  // Health and metrics routes (no auth needed)
  app.use(healthRouter);
  app.use(metricsRouter);

  // API v1 routes
  app.use('/v1', onboardingRouter);

  // Error handlers (must be last)
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
};