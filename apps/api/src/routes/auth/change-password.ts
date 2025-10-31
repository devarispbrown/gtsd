import { Router, Request, Response, NextFunction } from 'express';
import { trace, SpanStatusCode } from '@opentelemetry/api';
import { logger } from '../../config/logger';
import { AppError } from '../../middleware/error';
import { requireAuth } from '../../middleware/auth';
import { changePasswordSchema } from './schemas';
import { AuthService } from './service';
import { ZodError } from 'zod';

const router = Router();
const authService = new AuthService();
const tracer = trace.getTracer('auth-routes');

/**
 * PATCH /auth/change-password
 * Change password for authenticated user
 *
 * Security: Requires current password verification
 * Authentication: Required (JWT)
 * Rate limit: Should use strictLimiter
 */
router.patch(
  '/change-password',
  requireAuth,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const span = tracer.startSpan('PATCH /auth/change-password');

    try {
      span.setAttributes({
        'http.method': 'PATCH',
        'http.route': '/auth/change-password',
        'user.id': req.userId,
      });

      logger.info({ userId: req.userId }, 'Password change attempt');

      // Validate request body
      const validatedInput = changePasswordSchema.parse(req.body);

      span.addEvent('validation_completed');

      // Change password
      await authService.changePassword(
        req.userId!,
        validatedInput.currentPassword,
        validatedInput.newPassword
      );

      span.addEvent('password_changed_successful');
      span.setStatus({ code: SpanStatusCode.OK });

      logger.info({ userId: req.userId }, 'Password changed successfully');

      res.status(200).json({
        success: true,
        message:
          'Password changed successfully. All sessions have been logged out. Please log in again.',
      });
    } catch (error) {
      span.setStatus({
        code: SpanStatusCode.ERROR,
        message: error instanceof Error ? error.message : 'Unknown error',
      });

      if (error instanceof ZodError) {
        logger.warn(
          { userId: req.userId, validationErrors: error.errors },
          'Change password validation failed'
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
          'Unexpected error during password change'
        );
        span.recordException(error as Error);
        next(new AppError(500, `Failed to change password: ${errorMessage}`));
      }
    } finally {
      span.end();
    }
  }
);

export default router;
