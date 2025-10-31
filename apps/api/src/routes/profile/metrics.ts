import { Router, Request, Response, NextFunction } from 'express';
import { trace, SpanStatusCode } from '@opentelemetry/api';
import { z, ZodError } from 'zod';
import { logger } from '../../config/logger';
import { AppError } from '../../middleware/error';
import { requireAuth } from '../../middleware/auth';
import { metricsService } from '../../services/metrics';

const router = Router();
const tracer = trace.getTracer('profile-metrics-routes');

/**
 * Validation schema for metrics acknowledgment
 *
 * @remarks
 * Accepts ISO 8601 timestamps with or without milliseconds:
 * - "2025-10-30T12:34:56.789Z" (with milliseconds)
 * - "2025-10-30T12:34:56Z" (without milliseconds)
 */
const acknowledgeMetricsSchema = z.object({
  version: z.number().int().positive(),
  metricsComputedAt: z.string()
    .refine((val) => {
      // Security: Prevent ReDoS by checking length before regex
      // Max length: 24 chars for ISO 8601 with milliseconds (2025-10-30T12:34:56.789Z)
      if (val.length > 30) {
        return false;
      }

      // Accept ISO 8601 timestamps with or without milliseconds
      // Valid formats:
      // - 2025-10-30T12:34:56.789Z (with milliseconds)
      // - 2025-10-30T12:34:56Z (without milliseconds)
      // Note: Using non-capturing group (?:...) for better performance
      const isoDateRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/;
      return isoDateRegex.test(val);
    }, {
      message: 'Must be a valid ISO 8601 datetime (e.g., "2025-10-30T12:34:56Z" or "2025-10-30T12:34:56.789Z")',
    })
    .refine((val) => {
      // Ensure the date is actually valid (not 2025-13-99T99:99:99Z)
      const date = new Date(val);
      return !isNaN(date.getTime());
    }, {
      message: 'Must be a valid date',
    }),
});

/**
 * GET /v1/profile/metrics/today
 * Get today's computed health metrics with explanations
 *
 * @requires Authentication - User must be logged in
 * @returns Today's metrics (BMI, BMR, TDEE) with educational explanations
 *
 * @remarks
 * - Returns 404 if no metrics computed yet (daily job runs at 00:05)
 * - Includes acknowledgment status
 * - Performance target: p95 < 200ms
 *
 * Response:
 * {
 *   "success": true,
 *   "data": {
 *     "bmi": 23.45,
 *     "bmr": 1650,
 *     "tdee": 2310,
 *     "explanations": {
 *       "bmi": "Your BMI is 23.45...",
 *       "bmr": "Your BMR is 1650 calories...",
 *       "tdee": "Your TDEE is 2310 calories..."
 *     },
 *     "computedAt": "2025-10-28T00:05:00.000Z",
 *     "acknowledged": false
 *   }
 * }
 */
router.get(
  '/metrics/today',
  requireAuth,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const span = tracer.startSpan('GET /v1/profile/metrics/today');
    const startTime = performance.now();

    try {
      const userId = req.userId!;

      span.setAttributes({
        'user.id': userId,
        'http.method': 'GET',
        'http.route': '/v1/profile/metrics/today',
      });

      logger.info({ userId }, 'Fetching today\'s metrics');

      // Get today's metrics
      const metrics = await metricsService.getTodayMetrics(userId);

      span.addEvent('metrics_fetched');

      const duration = performance.now() - startTime;

      span.setAttributes({
        'response.time_ms': duration,
        'metrics.bmi': metrics.metrics.bmi,
        'metrics.bmr': metrics.metrics.bmr,
        'metrics.tdee': metrics.metrics.tdee,
        'metrics.acknowledged': metrics.acknowledged,
      });

      logger.info(
        {
          userId,
          bmi: metrics.metrics.bmi,
          bmr: metrics.metrics.bmr,
          tdee: metrics.metrics.tdee,
          acknowledged: metrics.acknowledged,
          durationMs: Math.round(duration),
        },
        'Today\'s metrics retrieved successfully'
      );

      // Log warning if response time exceeds p95 target
      if (duration > 200) {
        logger.warn(
          { userId, durationMs: Math.round(duration), target: 200 },
          'Response time exceeded p95 target'
        );
      }

      span.setStatus({ code: SpanStatusCode.OK });

      // Flatten the response structure to match test expectations
      res.status(200).json({
        success: true,
        data: {
          bmi: metrics.metrics.bmi,
          bmr: metrics.metrics.bmr,
          tdee: metrics.metrics.tdee,
          computedAt: metrics.metrics.computedAt,
          version: metrics.metrics.version,
          explanations: metrics.explanations,
          acknowledged: metrics.acknowledged,
          acknowledgement: metrics.acknowledgement
        },
      });
    } catch (error) {
      const duration = performance.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      span.setStatus({
        code: SpanStatusCode.ERROR,
        message: errorMessage,
      });

      logger.error(
        {
          err: error,
          userId: req.userId,
          errorMessage,
          durationMs: Math.round(duration),
        },
        'Error fetching today\'s metrics'
      );

      if (error instanceof AppError) {
        span.recordException(error);
        next(error);
      } else {
        span.recordException(error as Error);
        next(new AppError(500, 'Failed to fetch metrics. Please try again.'));
      }
    } finally {
      span.end();
    }
  }
);

/**
 * POST /v1/profile/metrics/acknowledge
 * Acknowledge today's health metrics
 *
 * @requires Authentication - User must be logged in
 * @body version - Metrics version number
 * @body metricsComputedAt - ISO timestamp of metrics being acknowledged
 * @returns Acknowledgment confirmation
 *
 * @remarks
 * - Idempotent: multiple acknowledgments for same metrics are OK
 * - Validates that metrics exist before acknowledging
 * - Performance target: p95 < 200ms
 *
 * Request:
 * {
 *   "version": 1,
 *   "metricsComputedAt": "2025-10-28T00:05:00.000Z"
 * }
 *
 * Response:
 * {
 *   "success": true,
 *   "data": {
 *     "success": true,
 *     "acknowledgedAt": "2025-10-28T08:30:00.000Z"
 *   }
 * }
 */
router.post(
  '/metrics/acknowledge',
  requireAuth,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const span = tracer.startSpan('POST /v1/profile/metrics/acknowledge');
    const startTime = performance.now();

    try {
      const userId = req.userId!;

      span.setAttributes({
        'user.id': userId,
        'http.method': 'POST',
        'http.route': '/v1/profile/metrics/acknowledge',
      });

      logger.info({ userId, body: req.body as Record<string, unknown> }, 'Acknowledging metrics');

      // Validate request body
      const validatedInput = acknowledgeMetricsSchema.parse(req.body);

      span.setAttributes({
        'metrics.version': validatedInput.version,
        'metrics.computed_at': validatedInput.metricsComputedAt,
      });

      span.addEvent('validation_completed');

      // Acknowledge metrics
      const result = await metricsService.acknowledgeMetrics(
        userId,
        validatedInput.version,
        new Date(validatedInput.metricsComputedAt)
      );

      span.addEvent('metrics_acknowledged');

      const duration = performance.now() - startTime;

      span.setAttributes({
        'response.time_ms': duration,
        'acknowledgment.success': result.success,
      });

      logger.info(
        {
          userId,
          version: validatedInput.version,
          metricsComputedAt: validatedInput.metricsComputedAt,
          acknowledgedAt: result.acknowledgedAt,
          durationMs: Math.round(duration),
        },
        'Metrics acknowledged successfully'
      );

      // Log warning if response time exceeds p95 target
      if (duration > 200) {
        logger.warn(
          { userId, durationMs: Math.round(duration), target: 200 },
          'Response time exceeded p95 target'
        );
      }

      span.setStatus({ code: SpanStatusCode.OK });

      res.status(200).json({
        success: true,
        data: {
          success: true,
          acknowledgedAt: result.acknowledgedAt
        }
      });
    } catch (error) {
      const duration = performance.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      span.setStatus({
        code: SpanStatusCode.ERROR,
        message: errorMessage,
      });

      if (error instanceof ZodError) {
        logger.warn(
          { userId: req.userId, validationErrors: error.errors },
          'Metrics acknowledgment validation failed'
        );
        span.recordException(error);
        next(
          new AppError(
            400,
            `Validation error: ${error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ')}`
          )
        );
      } else if (error instanceof AppError) {
        logger.warn({ userId: req.userId, error: errorMessage }, 'Metrics acknowledgment failed');
        span.recordException(error);
        next(error);
      } else {
        logger.error(
          {
            err: error,
            userId: req.userId,
            errorMessage,
            durationMs: Math.round(duration),
          },
          'Unexpected error acknowledging metrics'
        );
        span.recordException(error as Error);
        next(new AppError(500, 'Failed to acknowledge metrics. Please try again.'));
      }
    } finally {
      span.end();
    }
  }
);

export default router;
