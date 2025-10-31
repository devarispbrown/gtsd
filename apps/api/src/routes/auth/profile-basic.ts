import { Router, Request, Response, NextFunction } from 'express';
import { trace, SpanStatusCode } from '@opentelemetry/api';
import { ZodError } from 'zod';
import { logger } from '../../config/logger';
import { AppError } from '../../middleware/error';
import { requireAuth } from '../../middleware/auth';
import { db } from '../../db/connection';
import { users, userSettings } from '../../db/schema';
import { eq } from 'drizzle-orm';
import { updateProfileBasicSchema } from './schemas';

const router = Router();
const tracer = trace.getTracer('auth-profile-basic');

/**
 * PUT /auth/profile
 * Update user's basic profile information (name, email)
 *
 * This endpoint:
 * 1. Validates name and email fields
 * 2. Checks email uniqueness if email is being changed
 * 3. Updates users table
 * 4. Returns complete user object with hasCompletedOnboarding status
 *
 * @requires Authentication - User must be logged in
 * @param name - User's name (optional)
 * @param email - User's email (optional, must be unique)
 *
 * @returns Complete user object including hasCompletedOnboarding
 *
 * @example
 * PUT /v1/auth/profile
 * Authorization: Bearer <JWT>
 * {
 *   "name": "John Doe",
 *   "email": "john.doe@example.com"
 * }
 *
 * Response:
 * {
 *   "success": true,
 *   "data": {
 *     "id": 1,
 *     "email": "john.doe@example.com",
 *     "name": "John Doe",
 *     "emailVerified": false,
 *     "phone": null,
 *     "timezone": "America/Los_Angeles",
 *     "smsOptIn": true,
 *     "isActive": true,
 *     "lastLoginAt": "2025-10-30T12:00:00.000Z",
 *     "createdAt": "2025-10-01T12:00:00.000Z",
 *     "updatedAt": "2025-10-30T12:00:00.000Z",
 *     "hasCompletedOnboarding": true
 *   }
 * }
 */
router.put(
  '/profile',
  requireAuth,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const span = tracer.startSpan('PUT /auth/profile');
    const startTime = performance.now();

    try {
      const userId = req.userId!;

      span.setAttributes({
        'user.id': userId,
        'http.method': 'PUT',
        'http.route': '/auth/profile',
      });

      logger.info({ userId }, 'Profile basic info update request');

      // Validate request body
      const validatedInput = updateProfileBasicSchema.parse(req.body);

      span.addEvent('validation_completed');

      // Check if at least one field is provided
      if (!validatedInput.name && !validatedInput.email) {
        throw new AppError(400, 'At least one field (name or email) must be provided');
      }

      // Fetch current user
      const [currentUser] = await db.select().from(users).where(eq(users.id, userId)).limit(1);

      if (!currentUser) {
        throw new AppError(404, 'User not found');
      }

      span.addEvent('user_fetched');

      // Prepare update values
      const updateValues: Record<string, any> = {
        updatedAt: new Date(),
      };

      // Check email uniqueness if email is being changed
      if (validatedInput.email && validatedInput.email !== currentUser.email) {
        logger.debug({ userId, newEmail: validatedInput.email }, 'Checking email uniqueness');

        const [existingUser] = await db
          .select()
          .from(users)
          .where(eq(users.email, validatedInput.email))
          .limit(1);

        if (existingUser) {
          logger.warn(
            { userId, attemptedEmail: validatedInput.email },
            'Email update failed: email already in use'
          );
          throw new AppError(409, 'Email address is already in use');
        }

        updateValues.email = validatedInput.email;
        // Reset email verification when email changes
        updateValues.emailVerified = false;
        updateValues.emailVerifiedAt = null;

        span.addEvent('email_uniqueness_verified');
      }

      if (validatedInput.name !== undefined) {
        updateValues.name = validatedInput.name;
      }

      // Update user
      const [updatedUser] = await db
        .update(users)
        .set(updateValues)
        .where(eq(users.id, userId))
        .returning();

      span.addEvent('user_updated');

      logger.info(
        {
          userId,
          updatedFields: Object.keys(updateValues).filter((k) => k !== 'updatedAt'),
        },
        'Profile basic info updated'
      );

      // Fetch user settings to determine onboarding status
      const [settings] = await db
        .select()
        .from(userSettings)
        .where(eq(userSettings.userId, userId))
        .limit(1);

      // For existing users with settings, treat as completed if field is missing (backward compatibility)
      const hasCompletedOnboarding = settings?.onboardingCompleted ?? (settings ? true : false);

      span.addEvent('settings_fetched');

      // Remove sensitive fields and build response
      const { passwordHash, ...userResponse } = updatedUser;

      const response = {
        success: true,
        data: {
          ...userResponse,
          hasCompletedOnboarding,
        },
      };

      const duration = performance.now() - startTime;

      span.setAttributes({
        'response.time_ms': duration,
        'profile.updated': true,
      });

      span.setStatus({ code: SpanStatusCode.OK });

      // Warn if exceeds performance target (100ms p95)
      if (duration > 100) {
        logger.warn(
          { userId, durationMs: Math.round(duration), target: 100 },
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
        next(
          new AppError(
            400,
            `Validation error: ${error.errors.map((e) => e.message).join(', ')}`
          )
        );
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
