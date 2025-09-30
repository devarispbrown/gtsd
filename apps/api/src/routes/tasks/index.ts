import { Router, Request, Response, NextFunction } from 'express';
import { trace, SpanStatusCode } from '@opentelemetry/api';
import { logger } from '../../config/logger';
import { AppError } from '../../middleware/error';
import { requireAuth } from '../../middleware/auth';
import {
  getTodayTasksQuerySchema,
  createEvidenceSchema,
  type CreateEvidenceInput,
} from './schemas';
import { TasksService } from './service';
import { tasksCache } from './cache';
import { ZodError } from 'zod';
import { format } from 'date-fns';

const router = Router();
const tasksService = new TasksService();
const tracer = trace.getTracer('tasks-routes');

/**
 * GET /v1/tasks/today
 * Get all tasks due today for authenticated user
 *
 * Query params:
 * - date: YYYY-MM-DD (optional, defaults to today)
 * - limit: number (default 50, max 100)
 * - offset: number (default 0)
 * - type: task type filter (optional)
 *
 * Response: Grouped tasks by type with completion status
 * Cache: 60 seconds
 * Performance target: p95 < 300ms
 */
router.get(
  '/tasks/today',
  requireAuth,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const span = tracer.startSpan('GET /v1/tasks/today');
    const startTime = Date.now();

    try {
      // userId is guaranteed to be present due to requireAuth middleware

      span.setAttributes({
        'user.id': req.userId,
        'http.method': 'GET',
        'http.route': '/v1/tasks/today',
      });

      // Validate query parameters
      const queryParams = getTodayTasksQuerySchema.parse(req.query);

      // Default date to today in UTC (in production, would use user's timezone from settings)
      const targetDate = queryParams.date || format(new Date(), 'yyyy-MM-dd');

      span.setAttributes({
        'query.date': targetDate,
        'query.limit': queryParams.limit,
        'query.offset': queryParams.offset,
        'query.type': queryParams.type || 'all',
      });

      logger.info(
        {
          userId: req.userId,
          date: targetDate,
          limit: queryParams.limit,
          offset: queryParams.offset,
          type: queryParams.type,
        },
        'Fetching today tasks'
      );

      // Check cache first
      // userId is guaranteed to be present due to requireAuth middleware
      const cachedResult = await tasksCache.getTodayTasks(
        req.userId!,
        targetDate,
        queryParams.limit,
        queryParams.offset,
        queryParams.type
      );

      if (cachedResult) {
        span.addEvent('cache_hit');
        span.setStatus({ code: SpanStatusCode.OK });

        const duration = Date.now() - startTime;
        span.setAttributes({ 'response.time_ms': duration });

        logger.info({ userId: req.userId, duration, cached: true }, 'Returned cached tasks');

        res.status(200).json({
          success: true,
          data: cachedResult,
          cached: true,
        });
        return;
      }

      span.addEvent('cache_miss');

      // Fetch from database
      // userId is guaranteed to be present due to requireAuth middleware
      const result = await tasksService.getTodayTasks(
        req.userId!,
        targetDate,
        queryParams.limit,
        queryParams.offset,
        queryParams.type,
        'UTC' // In production, fetch from user settings
      );

      // Cache the result
      // userId is guaranteed to be present due to requireAuth middleware
      await tasksCache.setTodayTasks(
        req.userId!,
        targetDate,
        queryParams.limit,
        queryParams.offset,
        result,
        queryParams.type
      );

      span.addEvent('tasks_fetched');
      span.setStatus({ code: SpanStatusCode.OK });

      const duration = Date.now() - startTime;
      span.setAttributes({
        'response.time_ms': duration,
        'response.task_count': result.totalTasks,
        'response.completed_count': result.completedTasks,
      });

      logger.info(
        {
          userId: req.userId,
          duration,
          taskCount: result.totalTasks,
          completedCount: result.completedTasks,
          cached: false,
        },
        'Fetched tasks successfully'
      );

      // Log warning if response time exceeds p95 target
      if (duration > 300) {
        logger.warn(
          { userId: req.userId, duration, target: 300 },
          'Response time exceeded p95 target'
        );
      }

      res.status(200).json({
        success: true,
        data: result,
        cached: false,
      });
    } catch (error) {
      span.setStatus({
        code: SpanStatusCode.ERROR,
        message: error instanceof Error ? error.message : 'Unknown error',
      });

      if (error instanceof ZodError) {
        logger.warn(
          { userId: req.userId, validationErrors: error.errors },
          'Query parameter validation failed'
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
          'Unexpected error fetching tasks'
        );
        span.recordException(error as Error);
        next(
          new AppError(500, `Failed to fetch tasks for user ${req.userId}: ${errorMessage}`)
        );
      }
    } finally {
      span.end();
    }
  }
);

/**
 * POST /v1/evidence
 * Attach evidence to a task and mark it complete
 *
 * Body:
 * - taskId: number
 * - type: 'text_log' | 'metrics' | 'photo_reference'
 * - data: { text?, metrics?, photoUrl? }
 * - notes: string (optional)
 *
 * Side effects:
 * - Marks task as completed
 * - Updates user streak
 * - Invalidates task cache
 */
router.post('/evidence', requireAuth, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const span = tracer.startSpan('POST /v1/evidence');

  try {
    // userId is guaranteed to be present due to requireAuth middleware

    span.setAttributes({
      'user.id': req.userId,
      'http.method': 'POST',
      'http.route': '/v1/evidence',
    });

    logger.info(
      { userId: req.userId, body: req.body as Record<string, unknown> },
      'Creating task evidence'
    );

    // Validate request body
    const validatedInput: CreateEvidenceInput = createEvidenceSchema.parse(req.body);

    span.setAttributes({
      'evidence.task_id': validatedInput.taskId,
      'evidence.type': validatedInput.type,
    });

    span.addEvent('validation_completed');

    // Create evidence
    // userId is guaranteed to be present due to requireAuth middleware
    const result = await tasksService.createEvidence(req.userId!, validatedInput);

    // Invalidate cache for this user
    await tasksCache.invalidateUserTasks(req.userId!);

    span.addEvent('evidence_created');
    span.addEvent('cache_invalidated');
    span.setStatus({ code: SpanStatusCode.OK });

    span.setAttributes({
      'evidence.id': result.evidence.id,
      'streak.updated': result.streakUpdated,
      'streak.current': result.newStreak,
    });

    logger.info(
      {
        userId: req.userId,
        taskId: validatedInput.taskId,
        evidenceId: result.evidence.id,
        streakUpdated: result.streakUpdated,
        currentStreak: result.newStreak,
      },
      'Evidence created successfully'
    );

    res.status(201).json({
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
        'Evidence validation failed'
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
        'Unexpected error creating evidence'
      );
      span.recordException(error as Error);
      next(
        new AppError(500, `Failed to create evidence for user ${req.userId}: ${errorMessage}`)
      );
    }
  } finally {
    span.end();
  }
});

export default router;
