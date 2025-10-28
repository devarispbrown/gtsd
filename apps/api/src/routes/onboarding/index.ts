import { Router, Request, Response, NextFunction } from 'express';
import { trace, SpanStatusCode } from '@opentelemetry/api';
import { logger } from '../../config/logger';
import { AppError } from '../../middleware/error';
import { requireAuth } from '../../middleware/auth';
import { onboardingSchema } from './schemas';
import { OnboardingService, type OnboardingResult } from './service';
import { ZodError } from 'zod';
import { db } from '../../db/connection';
import { users } from '../../db/schema';
import { eq } from 'drizzle-orm';

const router = Router();
const onboardingService = new OnboardingService();
const tracer = trace.getTracer('onboarding-routes');

/**
 * POST /v1/onboarding
 * Complete user onboarding with health metrics and goals
 */
router.post(
  '/onboarding',
  requireAuth,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const span = tracer.startSpan('POST /v1/onboarding');

    try {
      // userId is guaranteed to be present due to requireAuth middleware

      span.setAttributes({
        'user.id': req.userId,
        'http.method': 'POST',
        'http.route': '/v1/onboarding',
      });

      logger.info(
        { userId: req.userId, body: req.body as Record<string, unknown> },
        'Starting onboarding process'
      );

      // Validate request body with Zod
      const validatedInput = onboardingSchema.parse(req.body);

      span.addEvent('validation_completed');

      // Call service to complete onboarding
      // userId is guaranteed to be present due to requireAuth middleware
      const result: OnboardingResult = await onboardingService.completeOnboarding(
        req.userId!,
        validatedInput
      );

      span.addEvent('onboarding_completed');

      // Fetch updated user to return with hasCompletedOnboarding flag
      const [user] = await db
        .select({
          id: users.id,
          email: users.email,
          name: users.name,
          emailVerified: users.emailVerified,
          createdAt: users.createdAt,
          updatedAt: users.updatedAt,
        })
        .from(users)
        .where(eq(users.id, req.userId!))
        .limit(1);

      if (!user) {
        throw new AppError(404, 'User not found');
      }

      span.setStatus({ code: SpanStatusCode.OK });

      logger.info(
        {
          userId: req.userId,
          calorieTarget: result.settings.calorieTarget,
          estimatedWeeks: result.projection.estimatedWeeks,
        },
        'Onboarding completed successfully'
      );

      // Return user object with hasCompletedOnboarding flag
      res.status(201).json({
        id: user.id,
        email: user.email,
        name: user.name,
        emailVerified: user.emailVerified,
        hasCompletedOnboarding: true, // Always true after completing onboarding
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      });
    } catch (error) {
      span.setStatus({
        code: SpanStatusCode.ERROR,
        message: error instanceof Error ? error.message : 'Unknown error',
      });

      if (error instanceof ZodError) {
        logger.warn(
          { userId: req.userId, validationErrors: error.errors },
          'Onboarding validation failed'
        );

        span.recordException(error);
        next(
          new AppError(
            400,
            `Validation failed: ${error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ')}`
          )
        );
      } else if (error instanceof AppError) {
        span.recordException(error);
        next(error);
      } else {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        logger.error(
          { userId: req.userId, error, errorMessage },
          'Unexpected error during onboarding'
        );
        span.recordException(error as Error);
        next(
          new AppError(500, `Failed to complete onboarding for user ${req.userId}: ${errorMessage}`)
        );
      }
    } finally {
      span.end();
    }
  }
);

/**
 * GET /v1/summary/how-it-works
 * Get personalized "How GTSD Works" summary with calculations explained
 */
router.get(
  '/summary/how-it-works',
  requireAuth,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const span = tracer.startSpan('GET /v1/summary/how-it-works');

    try {
      // userId is guaranteed to be present due to requireAuth middleware

      span.setAttributes({
        'user.id': req.userId,
        'http.method': 'GET',
        'http.route': '/v1/summary/how-it-works',
      });

      logger.info({ userId: req.userId }, 'Fetching how-it-works summary');

      // Call service to get summary
      // userId is guaranteed to be present due to requireAuth middleware
      const summary = await onboardingService.getHowItWorksSummary(req.userId!);

      span.addEvent('summary_retrieved');
      span.setStatus({ code: SpanStatusCode.OK });

      logger.info(
        { userId: req.userId, hasData: !!summary },
        'How-it-works summary retrieved successfully'
      );

      res.status(200).json({
        success: true,
        data: summary,
      });
    } catch (error) {
      span.setStatus({
        code: SpanStatusCode.ERROR,
        message: error instanceof Error ? error.message : 'Unknown error',
      });

      if (error instanceof Error && error.message.includes('not found')) {
        logger.warn(
          { userId: req.userId, error: error.message },
          'User data not found for summary'
        );
        span.recordException(error);
        next(new AppError(404, error.message));
      } else if (error instanceof AppError) {
        span.recordException(error);
        next(error);
      } else {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        logger.error(
          { userId: req.userId, error, errorMessage },
          'Unexpected error fetching summary'
        );
        span.recordException(error as Error);
        next(
          new AppError(500, `Failed to retrieve summary for user ${req.userId}: ${errorMessage}`)
        );
      }
    } finally {
      span.end();
    }
  }
);

export default router;
