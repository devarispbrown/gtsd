import { Router, Request, Response, NextFunction } from 'express';
import { trace, SpanStatusCode } from '@opentelemetry/api';
import { logger } from '../../config/logger';
import { AppError } from '../../middleware/error';
import { requireAuth } from '../../middleware/auth';
import { strictLimiter } from '../../middleware/rateLimiter';
import { StreaksService } from '../../services/streaks';
import { z } from 'zod';

const router = Router();
const streaksService = new StreaksService();
const tracer = trace.getTracer('streaks-routes');

/**
 * Schema for check-compliance request
 * Validates date format and ensures it's a valid date
 */
const checkComplianceSchema = z.object({
  date: z.string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format')
    .refine((dateStr) => {
      const date = new Date(dateStr);
      return !isNaN(date.getTime()) && dateStr === date.toISOString().split('T')[0];
    }, {
      message: 'Invalid date provided',
    })
    .optional(),
});

/**
 * GET /v1/streaks/me
 * Get current user's streak data
 *
 * Response:
 * {
 *   success: true,
 *   data: {
 *     streak: DailyComplianceStreak,
 *     todayCompliance: DailyComplianceResult | null,
 *     canIncrementToday: boolean
 *   }
 * }
 *
 * Performance target: p95 < 200ms
 * Cache: Consider caching for 60 seconds in future iteration
 */
router.get(
  '/streaks/me',
  requireAuth,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const span = tracer.startSpan('GET /v1/streaks');
    const startTime = Date.now();

    try {
      span.setAttributes({
        'user.id': req.userId,
        'http.method': 'GET',
        'http.route': '/v1/streaks',
      });

      logger.info({ userId: req.userId }, 'Fetching user streak data');

      // Get user's streak data
      const streakData = await streaksService.getUserStreaks(req.userId!);

      span.setAttributes({
        'streak.current': streakData.currentStreak,
        'streak.longest': streakData.longestStreak,
        'streak.total': streakData.totalCompliantDays,
      });

      const duration = Date.now() - startTime;
      span.setAttributes({ 'response.time_ms': duration });

      logger.info(
        {
          userId: req.userId,
          duration,
          currentStreak: streakData.currentStreak,
        },
        'Streak data fetched successfully'
      );

      // Log warning if response time exceeds p95 target
      if (duration > 200) {
        logger.warn(
          { userId: req.userId, duration, target: 200 },
          'Response time exceeded p95 target'
        );
      }

      span.setStatus({ code: SpanStatusCode.OK });
      res.status(200).json({
        success: true,
        data: {
          streak: streakData,
          todayCompliance: null, // TODO: Calculate today's compliance
          canIncrementToday: true, // TODO: Check if already incremented today
        },
      });
    } catch (error) {
      span.setStatus({
        code: SpanStatusCode.ERROR,
        message: error instanceof Error ? error.message : 'Unknown error',
      });

      if (error instanceof AppError) {
        span.recordException(error);
        next(error);
      } else {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        logger.error(
          { userId: req.userId, error, errorMessage },
          'Unexpected error fetching streak data'
        );
        span.recordException(error as Error);
        next(new AppError(500, `Failed to fetch streak data: ${errorMessage}`));
      }
    } finally {
      span.end();
    }
  }
);

/**
 * GET /v1/badges/me
 * Get current user's badges
 *
 * Response:
 * {
 *   success: true,
 *   data: {
 *     badges: UserBadgeWithMetadata[],
 *     totalBadges: number,
 *     totalAvailable: number,
 *     completionPercentage: number
 *   }
 * }
 *
 * Performance target: p95 < 200ms
 */
router.get(
  '/badges/me',
  requireAuth,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const span = tracer.startSpan('GET /v1/badges');
    const startTime = Date.now();

    try {
      span.setAttributes({
        'user.id': req.userId,
        'http.method': 'GET',
        'http.route': '/v1/badges',
      });

      logger.info({ userId: req.userId }, 'Fetching user badges');

      // Get user's badges
      const userBadges = await streaksService.getUserBadges(req.userId!);

      span.setAttributes({
        'badges.count': userBadges.length,
      });

      const duration = Date.now() - startTime;
      span.setAttributes({ 'response.time_ms': duration });

      logger.info(
        {
          userId: req.userId,
          duration,
          badgeCount: userBadges.length,
        },
        'Badges fetched successfully'
      );

      // Log warning if response time exceeds p95 target
      if (duration > 200) {
        logger.warn(
          { userId: req.userId, duration, target: 200 },
          'Response time exceeded p95 target'
        );
      }

      // TODO: Enrich badges with metadata
      const totalAvailable = 16; // Total badge types defined

      span.setStatus({ code: SpanStatusCode.OK });
      res.status(200).json({
        success: true,
        data: {
          badges: userBadges, // TODO: Add metadata to each badge
          totalBadges: userBadges.length,
          totalAvailable,
          completionPercentage: Math.round((userBadges.length / totalAvailable) * 100),
        },
      });
    } catch (error) {
      span.setStatus({
        code: SpanStatusCode.ERROR,
        message: error instanceof Error ? error.message : 'Unknown error',
      });

      if (error instanceof AppError) {
        span.recordException(error);
        next(error);
      } else {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        logger.error(
          { userId: req.userId, error, errorMessage },
          'Unexpected error fetching badges'
        );
        span.recordException(error as Error);
        next(new AppError(500, `Failed to fetch badges: ${errorMessage}`));
      }
    } finally {
      span.end();
    }
  }
);

/**
 * POST /v1/streaks/check-compliance
 * Manually trigger compliance check for a specific date
 * Useful for testing and for retroactive compliance calculation
 *
 * Body:
 * {
 *   date?: string (YYYY-MM-DD format, defaults to today)
 * }
 *
 * Response:
 * {
 *   success: true,
 *   data: {
 *     isCompliant: boolean,
 *     streakData: StreakData,
 *     newlyAwardedBadges: Badge[]
 *   }
 * }
 *
 * Side effects:
 * - Updates streak if compliant
 * - Awards badges if criteria met
 */
router.post(
  '/streaks/check-compliance',
  requireAuth,
  strictLimiter, // 20 requests per minute
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const span = tracer.startSpan('POST /v1/streaks/check-compliance');

    try {
      span.setAttributes({
        'user.id': req.userId,
        'http.method': 'POST',
        'http.route': '/v1/streaks/check-compliance',
      });

      // Validate request body
      const validatedInput = checkComplianceSchema.parse(req.body);
      const targetDate = validatedInput.date ? new Date(validatedInput.date) : new Date();

      logger.info(
        {
          userId: req.userId,
          date: validatedInput.date || 'today',
        },
        'Checking compliance for user'
      );

      // Calculate compliance
      const isCompliant = await streaksService.calculateDailyCompliance(
        req.userId!,
        targetDate
      );

      span.setAttributes({
        'compliance.is_compliant': isCompliant,
      });

      let streakData;
      let newlyAwardedBadges: Awaited<ReturnType<typeof streaksService.checkAndAwardBadges>> = [];

      if (isCompliant) {
        // Increment streak
        streakData = await streaksService.incrementStreak(req.userId!);

        // Check for badge awards
        newlyAwardedBadges = await streaksService.checkAndAwardBadges(req.userId!);

        span.setAttributes({
          'streak.current': streakData.currentStreak,
          'badges.newly_awarded': newlyAwardedBadges.length,
        });

        logger.info(
          {
            userId: req.userId,
            isCompliant,
            currentStreak: streakData.currentStreak,
            newBadges: newlyAwardedBadges.length,
          },
          'Compliance check completed - user is compliant'
        );
      } else {
        // Just get current streak data without incrementing
        streakData = await streaksService.getUserStreaks(req.userId!);

        logger.info(
          { userId: req.userId, isCompliant },
          'Compliance check completed - user is not compliant'
        );
      }

      span.setStatus({ code: SpanStatusCode.OK });
      res.status(200).json({
        success: true,
        data: {
          isCompliant,
          streakData,
          newlyAwardedBadges,
        },
      });
    } catch (error) {
      span.setStatus({
        code: SpanStatusCode.ERROR,
        message: error instanceof Error ? error.message : 'Unknown error',
      });

      if (error instanceof z.ZodError) {
        logger.warn(
          { userId: req.userId, validationErrors: error.errors },
          'Request validation failed'
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
          'Unexpected error checking compliance'
        );
        span.recordException(error as Error);
        next(new AppError(500, `Failed to check compliance: ${errorMessage}`));
      }
    } finally {
      span.end();
    }
  }
);

export default router;
