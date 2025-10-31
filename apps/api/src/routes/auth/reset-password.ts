import { Router, Request, Response, NextFunction } from 'express';
import { trace, SpanStatusCode } from '@opentelemetry/api';
import { logger } from '../../config/logger';
import { AppError } from '../../middleware/error';
import { resetPasswordSchema } from './schemas';
import { AuthService } from './service';
import { ZodError } from 'zod';

const router = Router();
const authService = new AuthService();
const tracer = trace.getTracer('auth-routes');

/**
 * POST /auth/reset-password
 * Reset password using token from email
 *
 * Security: Token is single-use and expires after 1 hour
 * Rate limit: Should use strictLimiter
 */
router.post(
  '/reset-password',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const span = tracer.startSpan('POST /auth/reset-password');

    try {
      span.setAttributes({
        'http.method': 'POST',
        'http.route': '/auth/reset-password',
      });

      logger.info('Password reset with token attempted');

      // Validate request body
      const validatedInput = resetPasswordSchema.parse(req.body);

      span.addEvent('validation_completed');

      // Reset password
      await authService.resetPassword(validatedInput.token, validatedInput.newPassword);

      span.addEvent('password_reset_successful');
      span.setStatus({ code: SpanStatusCode.OK });

      logger.info('Password reset successful');

      res.status(200).json({
        success: true,
        message: 'Password has been reset successfully. You can now log in with your new password.',
      });
    } catch (error) {
      span.setStatus({
        code: SpanStatusCode.ERROR,
        message: error instanceof Error ? error.message : 'Unknown error',
      });

      if (error instanceof ZodError) {
        logger.warn({ validationErrors: error.errors }, 'Reset password validation failed');
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
        logger.error({ error, errorMessage }, 'Unexpected error during password reset');
        span.recordException(error as Error);
        next(new AppError(500, `Failed to reset password: ${errorMessage}`));
      }
    } finally {
      span.end();
    }
  }
);

export default router;
