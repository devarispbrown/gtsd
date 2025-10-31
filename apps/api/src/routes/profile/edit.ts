import { Router, Request, Response, NextFunction } from 'express';
import { trace, SpanStatusCode } from '@opentelemetry/api';
import { ZodError } from 'zod';
import { logger } from '../../config/logger';
import { AppError } from '../../middleware/error';
import { requireAuth } from '../../middleware/auth';
import { db } from '../../db/connection';
import { users, userSettings } from '../../db/schema';
import { eq } from 'drizzle-orm';
import { PlansService } from '../plans/service';
import { profileAuditService } from '../../services/profile-audit';
import {
  updateProfileSchema,
  ProfileData,
  GetProfileResponse,
  UpdateProfileResponse,
  shouldRegeneratePlan,
} from '@gtsd/shared-types';
import rateLimit from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';
import Redis from 'ioredis';

const router = Router();
const plansService = new PlansService();
const tracer = trace.getTracer('profile-edit');

// Create Redis client for rate limiting
const isTestMode = process.env.NODE_ENV === 'test';

const redis = !isTestMode
  ? new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
      maxRetriesPerRequest: 3,
      enableOfflineQueue: true,
      retryStrategy: (times: number) => {
        if (times > 3) return null;
        return Math.min(times * 100, 2000);
      },
    })
  : null;

// Rate limiter for health/goals updates: 10 requests per hour per user
const healthGoalsLimiter = isTestMode
  ? (_req: Request, _res: Response, next: NextFunction) => next()
  : rateLimit({
      windowMs: 60 * 60 * 1000, // 1 hour
      max: 10,
      message: "You've updated your profile recently. Please wait before making more changes.",
      standardHeaders: true,
      legacyHeaders: false,
      store: new RedisStore({
        // @ts-expect-error - RedisStore types are not compatible with ioredis v5
        sendCommand: (...args: string[]) => redis!.call(...args),
        prefix: 'rl:profile:health:',
      }),
      keyGenerator: (req) => {
        return req.userId ? `user_${req.userId}` : req.ip || 'unknown';
      },
      handler: (_req, _res, _next, options) => {
        logger.warn(
          { limit: options.max, window: options.windowMs },
          'Profile rate limit exceeded'
        );
        const error = new AppError(
          429,
          "You've updated your profile recently. Please wait before making more changes."
        );
        // Set retry-after header
        _res.setHeader('Retry-After', Math.ceil(options.windowMs / 1000));
        throw error;
      },
    });

// Rate limiter for preferences updates: 20 requests per hour per user
const preferencesLimiter = isTestMode
  ? (_req: Request, _res: Response, next: NextFunction) => next()
  : rateLimit({
      windowMs: 60 * 60 * 1000, // 1 hour
      max: 20,
      message: "You've updated your preferences recently. Please wait before making more changes.",
      standardHeaders: true,
      legacyHeaders: false,
      store: new RedisStore({
        // @ts-expect-error - RedisStore types are not compatible with ioredis v5
        sendCommand: (...args: string[]) => redis!.call(...args),
        prefix: 'rl:profile:prefs:',
      }),
      keyGenerator: (req) => {
        return req.userId ? `user_${req.userId}` : req.ip || 'unknown';
      },
      handler: (_req, _res, _next, options) => {
        logger.warn(
          { limit: options.max, window: options.windowMs },
          'Preferences rate limit exceeded'
        );
        const error = new AppError(
          429,
          "You've updated your preferences recently. Please wait before making more changes."
        );
        // Set retry-after header
        _res.setHeader('Retry-After', Math.ceil(options.windowMs / 1000));
        throw error;
      },
    });

/**
 * GET /profile
 * Fetch complete user profile (demographics, health, goals, diet, preferences, targets)
 *
 * @requires Authentication - User must be logged in
 *
 * @returns Complete profile data aggregated from users and user_settings
 *
 * @example
 * GET /v1/profile
 * Authorization: Bearer <JWT>
 *
 * Response:
 * {
 *   "success": true,
 *   "profile": {
 *     "user": { "id": 1, "email": "user@example.com", "name": "John Doe" },
 *     "demographics": { "dateOfBirth": "1990-01-15T00:00:00.000Z", "gender": "male", "height": 175 },
 *     "health": { "currentWeight": 82.5, "targetWeight": 75 },
 *     "goals": { "primaryGoal": "lose_weight", "targetDate": "2026-03-01T00:00:00.000Z", "activityLevel": "moderately_active" },
 *     "preferences": { "dietaryPreferences": ["vegetarian"], "allergies": [], "mealsPerDay": 3 },
 *     "targets": { "bmr": 1650, "tdee": 2200, "calorieTarget": 1700, "proteinTarget": 135, "waterTarget": 2625 }
 *   }
 * }
 */
router.get(
  '/profile',
  requireAuth,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const span = tracer.startSpan('GET /profile');
    const startTime = performance.now();

    try {
      const userId = req.userId!;

      span.setAttributes({
        'user.id': userId,
        'http.method': 'GET',
        'http.route': '/profile',
      });

      logger.info({ userId }, 'Profile retrieval request');

      // Fetch user and settings in parallel
      const [userResult, settingsResult] = await Promise.all([
        db.select().from(users).where(eq(users.id, userId)).limit(1),
        db.select().from(userSettings).where(eq(userSettings.userId, userId)).limit(1),
      ]);

      const [user] = userResult;
      const [settings] = settingsResult;

      if (!user) {
        throw new AppError(404, 'User not found');
      }

      if (!settings) {
        throw new AppError(404, 'User settings not found. Please complete onboarding first.');
      }

      span.addEvent('data_fetched');

      // Build profile response
      const profile: ProfileData = {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
        },
        demographics: {
          dateOfBirth: settings.dateOfBirth?.toISOString() || null,
          gender: settings.gender || null,
          height: settings.height ? parseFloat(settings.height.toString()) : null,
        },
        health: {
          currentWeight: settings.currentWeight
            ? parseFloat(settings.currentWeight.toString())
            : null,
          targetWeight: settings.targetWeight ? parseFloat(settings.targetWeight.toString()) : null,
        },
        goals: {
          primaryGoal: settings.primaryGoal || null,
          targetDate: settings.targetDate?.toISOString() || null,
          activityLevel: settings.activityLevel || null,
        },
        preferences: {
          dietaryPreferences: (settings.dietaryPreferences as string[]) || [],
          allergies: (settings.allergies as string[]) || [],
          mealsPerDay: settings.mealsPerDay || 3,
        },
        targets: {
          bmr: settings.bmr || null,
          tdee: settings.tdee || null,
          calorieTarget: settings.calorieTarget || null,
          proteinTarget: settings.proteinTarget || null,
          waterTarget: settings.waterTarget || null,
        },
      };

      const response: GetProfileResponse = {
        success: true,
        profile,
      };

      const duration = performance.now() - startTime;

      span.setAttributes({
        'response.time_ms': duration,
        'profile.retrieved': true,
      });

      span.setStatus({ code: SpanStatusCode.OK });

      // Warn if exceeds performance target (200ms p95)
      if (duration > 200) {
        logger.warn(
          { userId, durationMs: Math.round(duration), target: 200 },
          'Profile retrieval exceeded p95 target'
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

      span.recordException(error as Error);

      if (error instanceof AppError) {
        logger.warn({ userId: req.userId, error: errorMessage }, 'Profile retrieval failed');
        next(error);
      } else {
        logger.error(
          {
            err: error,
            userId: req.userId,
            errorMessage,
            durationMs: Math.round(duration),
          },
          'Unexpected error retrieving profile'
        );
        next(new AppError(500, 'Failed to retrieve profile. Please try again.'));
      }
    } finally {
      span.end();
    }
  }
);

/**
 * PUT /profile
 * Update user profile with partial updates supported
 *
 * @requires Authentication - User must be logged in
 * @param body - Partial profile update (any subset of fields)
 *
 * @returns Updated profile data and plan regeneration status
 *
 * @example
 * PUT /v1/profile
 * Authorization: Bearer <JWT>
 * {
 *   "currentWeight": 82.5,
 *   "targetWeight": 75,
 *   "dietaryPreferences": ["vegetarian"]
 * }
 *
 * Response:
 * {
 *   "success": true,
 *   "profile": { ... },
 *   "planUpdated": true,
 *   "targets": { "calorieTarget": 1700, "proteinTarget": 135, "waterTarget": 2625 },
 *   "changes": { "previousCalories": 1850, "newCalories": 1700, "previousProtein": 140, "newProtein": 135 }
 * }
 */
router.put(
  '/profile',
  requireAuth,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const span = tracer.startSpan('PUT /profile');
    const startTime = performance.now();

    try {
      const userId = req.userId!;

      span.setAttributes({
        'user.id': userId,
        'http.method': 'PUT',
        'http.route': '/profile',
      });

      logger.info({ userId }, 'Profile update request');

      // Validate request body
      const validatedInput = updateProfileSchema.parse(req.body);

      span.addEvent('validation_completed');

      // Check if changes require plan regeneration
      const requiresPlanRegen = shouldRegeneratePlan(validatedInput);

      // Apply appropriate rate limiting
      if (requiresPlanRegen) {
        await new Promise<void>((resolve, reject) => {
          healthGoalsLimiter(req, res, (err?: any) => {
            if (err) reject(err);
            else resolve();
          });
        });
      } else {
        await new Promise<void>((resolve, reject) => {
          preferencesLimiter(req, res, (err?: any) => {
            if (err) reject(err);
            else resolve();
          });
        });
      }

      span.addEvent('rate_limit_checked');

      // Fetch current settings
      const [existingSettings] = await db
        .select()
        .from(userSettings)
        .where(eq(userSettings.userId, userId))
        .limit(1);

      if (!existingSettings) {
        throw new AppError(404, 'User settings not found. Please complete onboarding first.');
      }

      span.addEvent('settings_fetched');

      // Prepare update values and track changes for audit
      const updateValues: Record<string, any> = {
        updatedAt: new Date(),
      };

      const auditChanges: Array<{ fieldName: string; oldValue: any; newValue: any }> = [];

      // Demographics
      if (validatedInput.dateOfBirth !== undefined) {
        const oldValue = existingSettings.dateOfBirth?.toISOString() || null;
        const newValue = validatedInput.dateOfBirth;
        if (oldValue !== newValue) {
          updateValues.dateOfBirth = new Date(validatedInput.dateOfBirth);
          auditChanges.push({ fieldName: 'dateOfBirth', oldValue, newValue });
        }
      }

      if (validatedInput.gender !== undefined) {
        const oldValue = existingSettings.gender || null;
        const newValue = validatedInput.gender;
        if (oldValue !== newValue) {
          updateValues.gender = validatedInput.gender;
          auditChanges.push({ fieldName: 'gender', oldValue, newValue });
        }
      }

      if (validatedInput.height !== undefined) {
        const oldValue = existingSettings.height
          ? parseFloat(existingSettings.height.toString())
          : null;
        const newValue = validatedInput.height;
        if (oldValue !== newValue) {
          updateValues.height = validatedInput.height.toString();
          auditChanges.push({ fieldName: 'height', oldValue, newValue });
        }
      }

      // Health metrics
      if (validatedInput.currentWeight !== undefined) {
        const oldValue = existingSettings.currentWeight
          ? parseFloat(existingSettings.currentWeight.toString())
          : null;
        const newValue = validatedInput.currentWeight;
        if (oldValue !== newValue) {
          updateValues.currentWeight = validatedInput.currentWeight.toString();
          auditChanges.push({ fieldName: 'currentWeight', oldValue, newValue });
        }
      }

      if (validatedInput.targetWeight !== undefined) {
        const oldValue = existingSettings.targetWeight
          ? parseFloat(existingSettings.targetWeight.toString())
          : null;
        const newValue = validatedInput.targetWeight;
        if (oldValue !== newValue) {
          updateValues.targetWeight = validatedInput.targetWeight.toString();
          auditChanges.push({ fieldName: 'targetWeight', oldValue, newValue });
        }
      }

      // Goals
      if (validatedInput.primaryGoal !== undefined) {
        const oldValue = existingSettings.primaryGoal || null;
        const newValue = validatedInput.primaryGoal;
        if (oldValue !== newValue) {
          updateValues.primaryGoal = validatedInput.primaryGoal;
          auditChanges.push({ fieldName: 'primaryGoal', oldValue, newValue });
        }
      }

      if (validatedInput.targetDate !== undefined) {
        const oldValue = existingSettings.targetDate?.toISOString() || null;
        const newValue = validatedInput.targetDate;
        if (oldValue !== newValue) {
          updateValues.targetDate = new Date(validatedInput.targetDate);
          auditChanges.push({ fieldName: 'targetDate', oldValue, newValue });
        }
      }

      if (validatedInput.activityLevel !== undefined) {
        const oldValue = existingSettings.activityLevel || null;
        const newValue = validatedInput.activityLevel;
        if (oldValue !== newValue) {
          updateValues.activityLevel = validatedInput.activityLevel;
          auditChanges.push({ fieldName: 'activityLevel', oldValue, newValue });
        }
      }

      // Preferences
      if (validatedInput.dietaryPreferences !== undefined) {
        updateValues.dietaryPreferences = validatedInput.dietaryPreferences;
        auditChanges.push({
          fieldName: 'dietaryPreferences',
          oldValue: JSON.stringify((existingSettings.dietaryPreferences as string[]) || []),
          newValue: JSON.stringify(validatedInput.dietaryPreferences),
        });
      }

      if (validatedInput.allergies !== undefined) {
        updateValues.allergies = validatedInput.allergies;
        auditChanges.push({
          fieldName: 'allergies',
          oldValue: JSON.stringify((existingSettings.allergies as string[]) || []),
          newValue: JSON.stringify(validatedInput.allergies),
        });
      }

      if (validatedInput.mealsPerDay !== undefined) {
        const oldValue = existingSettings.mealsPerDay || null;
        const newValue = validatedInput.mealsPerDay;
        if (oldValue !== newValue) {
          updateValues.mealsPerDay = validatedInput.mealsPerDay;
          auditChanges.push({ fieldName: 'mealsPerDay', oldValue, newValue });
        }
      }

      // If no actual changes, return early
      if (Object.keys(updateValues).length === 1) {
        // Only updatedAt
        logger.info({ userId }, 'No actual changes to profile');

        const response: UpdateProfileResponse = {
          success: true,
          profile: {},
          planUpdated: false,
        };

        res.status(200).json(response);
        return;
      }

      // Store previous targets for comparison
      const previousCalories = existingSettings.calorieTarget || 0;
      const previousProtein = existingSettings.proteinTarget || 0;

      // Update user settings in database
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
          requiresPlanRegen,
        },
        'Profile updated'
      );

      // Trigger plan recomputation if needed
      let recomputeResult = null;
      if (requiresPlanRegen) {
        recomputeResult = await plansService.recomputeForUser(userId);
        span.addEvent('plan_recomputed', {
          'recompute.updated': recomputeResult.updated,
        });
      }

      // Get client IP and user agent for audit
      const ip = req.ip || req.socket.remoteAddress || undefined;
      const userAgent = req.get('user-agent') || undefined;

      // Log changes to audit trail
      await profileAuditService.logChanges(userId, auditChanges, {
        ip,
        userAgent,
        triggeredPlanRegeneration: requiresPlanRegen && recomputeResult?.updated,
        caloriesBefore:
          requiresPlanRegen && recomputeResult?.updated ? previousCalories : undefined,
        caloriesAfter:
          requiresPlanRegen && recomputeResult?.updated ? recomputeResult.newCalories : undefined,
        proteinBefore: requiresPlanRegen && recomputeResult?.updated ? previousProtein : undefined,
        proteinAfter:
          requiresPlanRegen && recomputeResult?.updated ? recomputeResult.newProtein : undefined,
      });

      span.addEvent('audit_logged');

      // Build response
      const response: UpdateProfileResponse = {
        success: true,
        profile: {
          demographics:
            validatedInput.dateOfBirth || validatedInput.gender || validatedInput.height
              ? {
                  dateOfBirth: updatedSettings.dateOfBirth?.toISOString() || null,
                  gender: updatedSettings.gender || null,
                  height: updatedSettings.height
                    ? parseFloat(updatedSettings.height.toString())
                    : null,
                }
              : undefined,
          health:
            validatedInput.currentWeight || validatedInput.targetWeight
              ? {
                  currentWeight: updatedSettings.currentWeight
                    ? parseFloat(updatedSettings.currentWeight.toString())
                    : null,
                  targetWeight: updatedSettings.targetWeight
                    ? parseFloat(updatedSettings.targetWeight.toString())
                    : null,
                }
              : undefined,
          goals:
            validatedInput.primaryGoal || validatedInput.targetDate || validatedInput.activityLevel
              ? {
                  primaryGoal: updatedSettings.primaryGoal || null,
                  targetDate: updatedSettings.targetDate?.toISOString() || null,
                  activityLevel: updatedSettings.activityLevel || null,
                }
              : undefined,
          preferences:
            validatedInput.dietaryPreferences ||
            validatedInput.allergies ||
            validatedInput.mealsPerDay
              ? {
                  dietaryPreferences: (updatedSettings.dietaryPreferences as string[]) || [],
                  allergies: (updatedSettings.allergies as string[]) || [],
                  mealsPerDay: updatedSettings.mealsPerDay || 3,
                }
              : undefined,
        },
        planUpdated: recomputeResult?.updated || false,
      };

      // Include new targets if plan was updated
      if (recomputeResult?.updated) {
        response.targets = {
          calorieTarget: recomputeResult.newCalories!,
          proteinTarget: recomputeResult.newProtein!,
          waterTarget: updatedSettings.waterTarget || 0,
        };

        response.changes = {
          previousCalories: recomputeResult.previousCalories,
          newCalories: recomputeResult.newCalories,
          previousProtein: recomputeResult.previousProtein,
          newProtein: recomputeResult.newProtein,
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
          'Plan targets updated after profile change'
        );
      }

      const duration = performance.now() - startTime;

      span.setAttributes({
        'response.time_ms': duration,
        'profile.updated': true,
        'plan.recomputed': recomputeResult?.updated || false,
        'changes.count': auditChanges.length,
      });

      span.setStatus({ code: SpanStatusCode.OK });

      // Warn if exceeds performance target (250ms p95)
      if (duration > 250) {
        logger.warn(
          { userId, durationMs: Math.round(duration), target: 250 },
          'Profile update exceeded p95 target'
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
          'Profile update validation failed'
        );
        span.recordException(error);

        // Format validation errors
        const fieldErrors: Record<string, string> = {};
        error.errors.forEach((err) => {
          const field = err.path.join('.');
          fieldErrors[field] = err.message;
        });

        // Send detailed validation errors
        res.status(400).json({
          success: false,
          error: 'Validation error',
          fieldErrors,
        });
        return;
      } else if (error instanceof AppError) {
        span.recordException(error);
        logger.warn({ userId: req.userId, error: errorMessage }, 'Profile update failed');
        next(error);
      } else {
        logger.error(
          {
            err: error,
            userId: req.userId,
            errorMessage,
            durationMs: Math.round(duration),
          },
          'Unexpected error updating profile'
        );
        span.recordException(error as Error);
        next(new AppError(500, 'Failed to update profile. Please try again.'));
      }
    } finally {
      span.end();
    }
  }
);

export default router;
