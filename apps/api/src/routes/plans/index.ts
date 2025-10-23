import { Router, Request, Response, NextFunction } from 'express';
import { trace, SpanStatusCode } from '@opentelemetry/api';
import { logger } from '../../config/logger';
import { AppError } from '../../middleware/error';
import { requireAuth } from '../../middleware/auth';
import { strictLimiter } from '../../middleware/rateLimiter';
import { planGenerationSchema, type PlanGenerationInput } from './schemas';
import { PlansService } from './service';
import { ZodError } from 'zod';

const router = Router();
const plansService = new PlansService();
const tracer = trace.getTracer('plans-routes');

/**
 * POST /v1/plans/generate
 * Generate a weekly plan for authenticated user
 *
 * Body:
 * - forceRecompute: boolean (optional, default false)
 *
 * Response: Plan with targets and educational "Why it works" copy
 * Performance target: p95 < 300ms
 * Rate Limit: 20 requests per minute (strict)
 *
 * @remarks
 * - Requires authentication
 * - Rate limited to prevent abuse (20 req/min)
 * - Checks for existing plan within last 7 days
 * - If plan exists and !forceRecompute, returns existing plan (200)
 * - If no plan or forceRecompute, creates new plan (201)
 * - Computes health targets using science service
 * - Updates user_settings and initial_plan_snapshot in transaction
 * - Returns plan with targets and educational content
 */
router.post(
  '/plans/generate',
  requireAuth,
  strictLimiter,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const span = tracer.startSpan('POST /v1/plans/generate');
    const startTime = Date.now();

    try {
      // userId is guaranteed to be present due to requireAuth middleware
      span.setAttributes({
        'user.id': req.userId,
        'http.method': 'POST',
        'http.route': '/v1/plans/generate',
      });

      logger.info(
        { userId: req.userId, body: req.body as Record<string, unknown> },
        'Generating plan'
      );

      // Validate request body
      const validatedInput: PlanGenerationInput = planGenerationSchema.parse(req.body);

      span.setAttributes({
        'plan.force_recompute': validatedInput.forceRecompute,
      });

      span.addEvent('validation_completed');

      // Generate plan
      const result = await plansService.generatePlan(
        req.userId!,
        validatedInput.forceRecompute
      );

      span.addEvent('plan_generated');
      span.setStatus({ code: SpanStatusCode.OK });

      const duration = Date.now() - startTime;
      span.setAttributes({
        'response.time_ms': duration,
        'plan.id': result.plan.id,
        'plan.recomputed': result.recomputed,
      });

      logger.info(
        {
          userId: req.userId,
          planId: result.plan.id,
          recomputed: result.recomputed,
          duration,
        },
        'Plan generated successfully'
      );

      // Log warning if response time exceeds p95 target
      if (duration > 300) {
        logger.warn(
          { userId: req.userId, duration, target: 300 },
          'Response time exceeded p95 target'
        );
      }

      // Return 200 for existing plan, 201 for new plan
      const statusCode = result.recomputed || !result.plan.id ? 201 : 200;

      res.status(statusCode).json({
        success: true,
        data: result,
      });
    } catch (error) {
      span.setStatus({
        code: SpanStatusCode.ERROR,
        message: error instanceof Error ? error.message : 'Unknown error',
      });

      if (error instanceof ZodError) {
        logger.warn(
          { userId: req.userId, validationErrors: error.errors },
          'Plan generation validation failed'
        );

        span.recordException(error);
        next(
          new AppError(
            400,
            `Validation failed: ${error.errors
              .map((e) => `${e.path.join('.')}: ${e.message}`)
              .join(', ')}`
          )
        );
      } else if (error instanceof AppError) {
        span.recordException(error);
        next(error);
      } else {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        logger.error(
          { userId: req.userId, error, errorMessage },
          'Unexpected error generating plan'
        );
        span.recordException(error as Error);
        next(
          new AppError(
            500,
            `Failed to generate plan for user ${req.userId}: ${errorMessage}`
          )
        );
      }
    } finally {
      span.end();
    }
  }
);

export default router;
