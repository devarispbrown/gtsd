import { Router, Request, Response, NextFunction } from 'express';
import { trace, SpanStatusCode } from '@opentelemetry/api';
import { z, ZodError } from 'zod';
import { logger } from '../../config/logger';
import { AppError } from '../../middleware/error';
import { requireAuth } from '../../middleware/auth';
import { db } from '../../db/connection';
import { userSettings } from '../../db/schema';
import { eq } from 'drizzle-orm';

const router = Router();
const tracer = trace.getTracer('auth-profile-preferences');

/**
 * Validation schema for preferences update
 */
export const updatePreferencesSchema = z.object({
  dietaryPreferences: z.array(z.string()).optional(),
  allergies: z.array(z.string()).optional(),
  mealsPerDay: z.number().int().min(1).max(10).optional(),
});

/**
 * Response schema for preferences retrieval
 */
export const getPreferencesResponseSchema = z.object({
  success: z.boolean(),
  data: z.object({
    dietaryPreferences: z.array(z.string()),
    allergies: z.array(z.string()),
    mealsPerDay: z.number().int(),
  }),
});

export type GetPreferencesResponse = z.infer<typeof getPreferencesResponseSchema>;

export type UpdatePreferencesInput = z.infer<typeof updatePreferencesSchema>;

/**
 * Response schema for preferences update
 */
export const updatePreferencesResponseSchema = z.object({
  success: z.boolean(),
  message: z.string(),
  data: z.object({
    dietaryPreferences: z.array(z.string()),
    allergies: z.array(z.string()),
    mealsPerDay: z.number().int(),
  }),
});

export type UpdatePreferencesResponse = z.infer<typeof updatePreferencesResponseSchema>;

/**
 * GET /auth/profile/preferences
 * Get user's dietary preferences, allergies, and meal preferences
 *
 * This endpoint:
 * 1. Fetches user_settings from database
 * 2. Returns current preferences
 *
 * @requires Authentication - User must be logged in
 *
 * @returns Current preferences
 *
 * @example
 * GET /auth/profile/preferences
 * Authorization: Bearer <JWT>
 *
 * Response:
 * {
 *   "success": true,
 *   "data": {
 *     "dietaryPreferences": ["vegetarian", "gluten-free"],
 *     "allergies": ["peanuts", "shellfish"],
 *     "mealsPerDay": 3
 *   }
 * }
 */
router.get(
  '/profile/preferences',
  requireAuth,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const span = tracer.startSpan('GET /auth/profile/preferences');
    const startTime = performance.now();

    try {
      const userId = req.userId!;

      span.setAttributes({
        'user.id': userId,
        'http.method': 'GET',
        'http.route': '/auth/profile/preferences',
      });

      logger.info({ userId }, 'Preferences retrieval request');

      // Fetch user settings
      const [existingSettings] = await db
        .select()
        .from(userSettings)
        .where(eq(userSettings.userId, userId))
        .limit(1);

      if (!existingSettings) {
        throw new AppError(404, 'User settings not found. Please complete onboarding first.');
      }

      span.addEvent('settings_fetched');

      // Build response with defaults for missing values
      const response = {
        success: true,
        data: {
          dietaryPreferences: existingSettings.dietaryPreferences || [],
          allergies: existingSettings.allergies || [],
          mealsPerDay: existingSettings.mealsPerDay || 3,
        },
      };

      const duration = performance.now() - startTime;

      span.setAttributes({
        'response.time_ms': duration,
        'preferences.retrieved': true,
      });

      span.setStatus({ code: SpanStatusCode.OK });

      // Warn if exceeds performance target
      if (duration > 100) {
        logger.warn(
          { userId, durationMs: Math.round(duration), target: 100 },
          'Preferences retrieval exceeded p95 target'
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

      if (error instanceof AppError) {
        span.recordException(error);
        logger.warn({ userId: req.userId, error: errorMessage }, 'Preferences retrieval failed');
        next(error);
      } else {
        logger.error(
          {
            err: error,
            userId: req.userId,
            errorMessage,
            durationMs: Math.round(duration),
          },
          'Unexpected error retrieving preferences'
        );
        span.recordException(error as Error);
        next(new AppError(500, 'Failed to retrieve preferences. Please try again.'));
      }
    } finally {
      span.end();
    }
  }
);

/**
 * PUT /auth/profile/preferences
 * Update user's dietary preferences, allergies, and meal preferences
 *
 * This endpoint:
 * 1. Validates preferences data
 * 2. Updates user_settings in database
 * 3. Returns updated preferences
 *
 * @requires Authentication - User must be logged in
 * @param dietaryPreferences - Array of dietary preferences (optional)
 * @param allergies - Array of allergies (optional)
 * @param mealsPerDay - Number of meals per day (optional)
 *
 * @returns Updated preferences
 *
 * @example
 * PUT /auth/profile/preferences
 * Authorization: Bearer <JWT>
 * {
 *   "dietaryPreferences": ["vegetarian", "gluten-free"],
 *   "allergies": ["peanuts", "shellfish"],
 *   "mealsPerDay": 3
 * }
 *
 * Response:
 * {
 *   "success": true,
 *   "message": "Preferences updated successfully",
 *   "data": {
 *     "dietaryPreferences": ["vegetarian", "gluten-free"],
 *     "allergies": ["peanuts", "shellfish"],
 *     "mealsPerDay": 3
 *   }
 * }
 */
router.put(
  '/profile/preferences',
  requireAuth,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const span = tracer.startSpan('PUT /auth/profile/preferences');
    const startTime = performance.now();

    try {
      const userId = req.userId!;

      span.setAttributes({
        'user.id': userId,
        'http.method': 'PUT',
        'http.route': '/auth/profile/preferences',
      });

      logger.info({ userId }, 'Preferences update request');

      // Validate request body
      const validatedInput = updatePreferencesSchema.parse(req.body);

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

      if (validatedInput.dietaryPreferences !== undefined) {
        updateValues.dietaryPreferences = validatedInput.dietaryPreferences;
      }

      if (validatedInput.allergies !== undefined) {
        updateValues.allergies = validatedInput.allergies;
      }

      if (validatedInput.mealsPerDay !== undefined) {
        updateValues.mealsPerDay = validatedInput.mealsPerDay;
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
        'Preferences updated'
      );

      // Build response
      const response = {
        success: true,
        message: 'Preferences updated successfully',
        data: {
          dietaryPreferences: updatedSettings.dietaryPreferences || [],
          allergies: updatedSettings.allergies || [],
          mealsPerDay: updatedSettings.mealsPerDay || 3,
        },
      };

      const duration = performance.now() - startTime;

      span.setAttributes({
        'response.time_ms': duration,
        'preferences.updated': true,
      });

      span.setStatus({ code: SpanStatusCode.OK });

      // Warn if exceeds performance target
      if (duration > 200) {
        logger.warn(
          { userId, durationMs: Math.round(duration), target: 200 },
          'Preferences update exceeded p95 target'
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
          'Preferences validation failed'
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
        logger.warn({ userId: req.userId, error: errorMessage }, 'Preferences update failed');
        next(error);
      } else {
        logger.error(
          {
            err: error,
            userId: req.userId,
            errorMessage,
            durationMs: Math.round(duration),
          },
          'Unexpected error updating preferences'
        );
        span.recordException(error as Error);
        next(new AppError(500, 'Failed to update preferences. Please try again.'));
      }
    } finally {
      span.end();
    }
  }
);

export default router;
