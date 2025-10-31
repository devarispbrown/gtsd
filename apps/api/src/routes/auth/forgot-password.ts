import { Router, Request, Response, NextFunction } from 'express';
import { trace, SpanStatusCode } from '@opentelemetry/api';
import { logger } from '../../config/logger';
import { AppError } from '../../middleware/error';
import { forgotPasswordSchema } from './schemas';
import { AuthService } from './service';
import { ZodError } from 'zod';

const router = Router();
const authService = new AuthService();
const tracer = trace.getTracer('auth-routes');

/**
 * POST /auth/forgot-password
 * Initiate password reset flow
 *
 * Security: Always returns success message to prevent email enumeration
 * Rate limit: Should use strictLimiter (5 requests/15min)
 */
router.post(
  '/forgot-password',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const span = tracer.startSpan('POST /auth/forgot-password');

    try {
      span.setAttributes({
        'http.method': 'POST',
        'http.route': '/auth/forgot-password',
      });

      // Note: We don't log the email at info level to avoid PII in logs
      logger.debug('Password reset request received');

      // Validate request body
      const validatedInput = forgotPasswordSchema.parse(req.body);

      span.addEvent('validation_completed');

      // Process password reset request
      await authService.forgotPassword(validatedInput.email);

      span.addEvent('password_reset_processed');
      span.setStatus({ code: SpanStatusCode.OK });

      logger.info('Password reset request processed');

      // Security: Always return success message, even if email doesn't exist
      // This prevents attackers from enumerating valid email addresses
      res.status(200).json({
        success: true,
        message:
          'If an account exists with that email, you will receive a password reset link shortly.',
      });
    } catch (error) {
      span.setStatus({
        code: SpanStatusCode.ERROR,
        message: error instanceof Error ? error.message : 'Unknown error',
      });

      if (error instanceof ZodError) {
        logger.warn({ validationErrors: error.errors }, 'Forgot password validation failed');
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
        logger.error({ error, errorMessage }, 'Unexpected error during password reset request');
        span.recordException(error as Error);
        next(new AppError(500, `Failed to process password reset request: ${errorMessage}`));
      }
    } finally {
      span.end();
    }
  }
);

export default router;
