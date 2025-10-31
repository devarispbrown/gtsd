import { Router, Request, Response, NextFunction } from 'express';
import { trace, SpanStatusCode } from '@opentelemetry/api';
import { z, ZodError } from 'zod';
import { logger } from '../../config/logger';
import { AppError } from '../../middleware/error';
import { requireAuth } from '../../middleware/auth';
import { db } from '../../db/connection';
import { userSettings } from '../../db/schema';
import { eq } from 'drizzle-orm';
import { PlansService } from '../plans/service';
import { VALIDATION_RANGES } from '@gtsd/shared-types';

const router = Router();
const plansService = new PlansService();
const tracer = trace.getTracer('auth-profile-health');

/**
 * Validation schema for health metrics update
 *
 * Validates weight, height, targetWeight, and dateOfBirth
 * Uses ranges from shared-types for consistency
 */
export const updateHealthMetricsSchema = z.object({
  currentWeight: z
    .number()
    .min(VALIDATION_RANGES.weight.min, `Weight must be at least ${VALIDATION_RANGES.weight.min} kg`)
    .max(VALIDATION_RANGES.weight.max, `Weight must not exceed ${VALIDATION_RANGES.weight.max} kg`),
  targetWeight: z
    .number()
    .min(VALIDATION_RANGES.targetWeight.min, `Target weight must be at least ${VALIDATION_RANGES.targetWeight.min} kg`)
    .max(VALIDATION_RANGES.targetWeight.max, `Target weight must not exceed ${VALIDATION_RANGES.targetWeight.max} kg`)
    .optional(),
  height: z
    .number()
    .min(VALIDATION_RANGES.height.min, `Height must be at least ${VALIDATION_RANGES.height.min} cm`)
    .max(VALIDATION_RANGES.height.max, `Height must not exceed ${VALIDATION_RANGES.height.max} cm`)
    .optional(),
  dateOfBirth: z
    .string()
    .datetime({ message: 'Date of birth must be a valid ISO 8601 datetime' })
    .optional(),
});

export type UpdateHealthMetricsInput = z.infer<typeof updateHealthMetricsSchema>;

/**
 * PUT /auth/profile/health
 * Update user's health metrics (weight, height, target weight, date of birth)
 *
 * This endpoint:
 * 1. Validates health metrics against safe ranges
 * 2. Updates user_settings in database
 * 3. Triggers plan recomputation if changes are significant
 * 4. Returns updated profile and new targets
 *
 * @requires Authentication - User must be logged in
 * @param currentWeight - Current weight in kg (required)
 * @param targetWeight - Target weight in kg (optional)
 * @param height - Height in cm (optional)
 * @param dateOfBirth - ISO 8601 datetime string (optional)
 *
 * @returns Updated profile and targets if plan was recomputed
 *
 * @example
 * PUT /v1/auth/profile/health
 * Authorization: Bearer <JWT>
 * {
 *   "currentWeight": 75.5,
 *   "targetWeight": 70.0
 * }
 *
 * Response:
 * {
 *   "success": true,
 *   "profile": {
 *     "currentWeight": "75.50",
 *     "targetWeight": "70.00",
 *     "height": "175.00",
 *     "dateOfBirth": "1990-01-01T00:00:00.000Z"
 *   },
 *   "planUpdated": true,
 *   "targets": {
 *     "calorieTarget": 1700,
 *     "proteinTarget": 135,
 *     "waterTarget": 2625
 *   }
 * }
 */
router.put(
  '/profile/health',
  requireAuth,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const span = tracer.startSpan('PUT /auth/profile/health');
    const startTime = performance.now();

    try {
      const userId = req.userId!;

      span.setAttributes({
        'user.id': userId,
        'http.method': 'PUT',
        'http.route': '/auth/profile/health',
      });

      logger.info({ userId }, 'Health metrics update request');

      // Validate request body
      const validatedInput = updateHealthMetricsSchema.parse(req.body);

      span.addEvent('validation_completed');

      // Check if user settings exist
      const [existingSettings] = await db
        .select()
        .from(userSettings)
        .where(eq(userSettings.userId, userId))
        .limit(1);

      if (!existingSettings) {
        throw new AppError(404, 'User settings not found. Please complete onboarding first.');
      }

      span.addEvent('settings_fetched');

      // Prepare update values
      const updateValues: Record<string, any> = {
        updatedAt: new Date(),
      };

      if (validatedInput.currentWeight !== undefined) {
        updateValues.currentWeight = validatedInput.currentWeight.toString();
      }

      if (validatedInput.targetWeight !== undefined) {
        updateValues.targetWeight = validatedInput.targetWeight.toString();
      }

      if (validatedInput.height !== undefined) {
        updateValues.height = validatedInput.height.toString();
      }

      if (validatedInput.dateOfBirth !== undefined) {
        updateValues.dateOfBirth = new Date(validatedInput.dateOfBirth);
      }

      // Update user settings
      const [updatedSettings] = await db
        .update(userSettings)
        .set(updateValues)
        .where(eq(userSettings.userId, userId))
        .returning();

      span.addEvent('settings_updated');

      logger.info(
        {
          userId,
          updatedFields: Object.keys(updateValues).filter((k) => k !== 'updatedAt'),
        },
        'Health metrics updated'
      );

      // Trigger plan recomputation
      const recomputeResult = await plansService.recomputeForUser(userId);

      span.addEvent('plan_recomputed', {
        'recompute.updated': recomputeResult.updated,
        'recompute.success': recomputeResult.success,
      });

      // Build response
      const response: any = {
        success: true,
        profile: {
          currentWeight: updatedSettings.currentWeight?.toString() || null,
          targetWeight: updatedSettings.targetWeight?.toString() || null,
          height: updatedSettings.height?.toString() || null,
          dateOfBirth: updatedSettings.dateOfBirth?.toISOString() || null,
        },
        planUpdated: recomputeResult.updated,
      };

      // Include new targets if plan was updated
      if (recomputeResult.updated && recomputeResult.success) {
        response.targets = {
          calorieTarget: recomputeResult.newCalories,
          proteinTarget: recomputeResult.newProtein,
          waterTarget: updatedSettings.waterTarget,
        };

        logger.info(
          {
            userId,
            previousCalories: recomputeResult.previousCalories,
            newCalories: recomputeResult.newCalories,
            previousProtein: recomputeResult.previousProtein,
            newProtein: recomputeResult.newProtein,
            reason: recomputeResult.reason,
          },
          'Plan targets updated after health metrics change'
        );
      }

      const duration = performance.now() - startTime;

      span.setAttributes({
        'response.time_ms': duration,
        'profile.updated': true,
        'plan.recomputed': recomputeResult.updated,
      });

      span.setStatus({ code: SpanStatusCode.OK });

      // Warn if exceeds performance target
      if (duration > 300) {
        logger.warn(
          { userId, durationMs: Math.round(duration), target: 300 },
          'Health metrics update exceeded p95 target'
        );
      }

      res.status(200).json(response);
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
          'Health metrics validation failed'
        );
        span.recordException(error);
        next(
          new AppError(
            400,
            `Validation error: ${error.errors.map((e) => e.message).join(', ')}`
          )
        );
      } else if (error instanceof AppError) {
        span.recordException(error);
        logger.warn({ userId: req.userId, error: errorMessage }, 'Health metrics update failed');
        next(error);
      } else {
        logger.error(
          {
            err: error,
            userId: req.userId,
            errorMessage,
            durationMs: Math.round(duration),
          },
          'Unexpected error updating health metrics'
        );
        span.recordException(error as Error);
        next(new AppError(500, 'Failed to update health metrics. Please try again.'));
      }
    } finally {
      span.end();
    }
  }
);

export default router;
