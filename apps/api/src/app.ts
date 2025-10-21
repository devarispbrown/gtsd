import express, { Application } from 'express';
import cookieParser from 'cookie-parser';
import { requestContextMiddleware } from './utils/request-context';
import { loggingMiddleware } from './middleware/logging';
import { metricsMiddleware } from './middleware/metrics';
import { authMiddleware } from './middleware/auth';
import { errorHandler, notFoundHandler } from './middleware/error';
import { apiLimiter } from './middleware/rateLimiter';
import {
  helmetMiddleware,
  corsMiddleware,
  additionalSecurityHeaders,
} from './middleware/security';
import healthRouter from './routes/health';
import metricsRouter from './routes/metrics';
import authRouter from './routes/auth';
import onboardingRouter from './routes/onboarding';
import tasksRouter from './routes/tasks';
import smsRouter from './routes/sms';
import progressRouter from './routes/progress/photos';

export const createApp = (): Application => {
  const app = express();

  // Security middleware (must be early in the chain)
  app.use(helmetMiddleware);
  app.use(corsMiddleware);
  app.use(additionalSecurityHeaders);

  // Body parsing middleware
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.use(cookieParser());

  // Request context (must be first to ensure requestId is available)
  app.use(requestContextMiddleware);

  // Logging middleware
  app.use(loggingMiddleware);

  // Metrics middleware
  app.use(metricsMiddleware);

  // Rate limiting (after logging, before auth)
  app.use(apiLimiter);

  // Auth middleware (extracts userId from JWT or legacy header)
  app.use(authMiddleware);

  // Health and metrics routes (no auth needed)
  app.use(healthRouter);
  app.use(metricsRouter);

  // Auth routes (public - signup/login)
  app.use('/auth', authRouter);

  // API v1 routes (protected)
  app.use('/v1', onboardingRouter);
  app.use('/v1', tasksRouter);
  app.use('/v1', smsRouter);
  app.use('/v1/progress', progressRouter);

  // Error handlers (must be last)
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
};
