import { Router, Request, Response, NextFunction } from 'express';
import { trace, SpanStatusCode } from '@opentelemetry/api';
import { logger } from '../../config/logger';
import { AppError } from '../../middleware/error';
import { requireAuth } from '../../middleware/auth';
import { signupSchema, loginSchema, refreshSchema, logoutSchema } from './schemas';
import { AuthService } from './service';
import { ZodError } from 'zod';

const router = Router();
const authService = new AuthService();
const tracer = trace.getTracer('auth-routes');

/**
 * POST /auth/signup
 * Register a new user
 */
router.post(
  '/signup',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const span = tracer.startSpan('POST /auth/signup');

    try {
      span.setAttributes({
        'http.method': 'POST',
        'http.route': '/auth/signup',
      });

      logger.info({ email: req.body.email }, 'User signup request');

      // Validate request body
      const validatedInput = signupSchema.parse(req.body);

      span.addEvent('validation_completed');

      // Create user
      const result = await authService.signup(validatedInput);

      span.setAttributes({
        'user.id': result.user.id,
        'user.email': result.user.email,
      });

      span.addEvent('user_created');
      span.setStatus({ code: SpanStatusCode.OK });

      logger.info(
        { userId: result.user.id, email: result.user.email },
        'User signup successful'
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
        logger.warn({ validationErrors: error.errors }, 'Signup validation failed');
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
        logger.error({ error, errorMessage }, 'Unexpected error during signup');
        span.recordException(error as Error);
        next(new AppError(500, `Failed to create user: ${errorMessage}`));
      }
    } finally {
      span.end();
    }
  }
);

/**
 * POST /auth/login
 * Login an existing user
 */
router.post(
  '/login',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const span = tracer.startSpan('POST /auth/login');

    try {
      span.setAttributes({
        'http.method': 'POST',
        'http.route': '/auth/login',
      });

      logger.info({ email: req.body.email }, 'User login request');

      // Validate request body
      const validatedInput = loginSchema.parse(req.body);

      span.addEvent('validation_completed');

      // Authenticate user
      const result = await authService.login(validatedInput);

      span.setAttributes({
        'user.id': result.user.id,
        'user.email': result.user.email,
      });

      span.addEvent('login_successful');
      span.setStatus({ code: SpanStatusCode.OK });

      logger.info({ userId: result.user.id, email: result.user.email }, 'User login successful');

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      span.setStatus({
        code: SpanStatusCode.ERROR,
        message: error instanceof Error ? error.message : 'Unknown error',
      });

      if (error instanceof ZodError) {
        logger.warn({ validationErrors: error.errors }, 'Login validation failed');
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
        logger.error({ error, errorMessage }, 'Unexpected error during login');
        span.recordException(error as Error);
        next(new AppError(500, `Failed to login: ${errorMessage}`));
      }
    } finally {
      span.end();
    }
  }
);

/**
 * POST /auth/refresh
 * Refresh access token using refresh token
 */
router.post(
  '/refresh',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const span = tracer.startSpan('POST /auth/refresh');

    try {
      span.setAttributes({
        'http.method': 'POST',
        'http.route': '/auth/refresh',
      });

      logger.debug('Token refresh request');

      // Validate request body
      const validatedInput = refreshSchema.parse(req.body);

      span.addEvent('validation_completed');

      // Refresh tokens
      const result = await authService.refresh(validatedInput.refreshToken);

      span.addEvent('tokens_refreshed');
      span.setStatus({ code: SpanStatusCode.OK });

      logger.debug('Token refresh successful');

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      span.setStatus({
        code: SpanStatusCode.ERROR,
        message: error instanceof Error ? error.message : 'Unknown error',
      });

      if (error instanceof ZodError) {
        logger.warn({ validationErrors: error.errors }, 'Refresh validation failed');
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
        logger.error({ error, errorMessage }, 'Unexpected error during token refresh');
        span.recordException(error as Error);
        next(new AppError(500, `Failed to refresh token: ${errorMessage}`));
      }
    } finally {
      span.end();
    }
  }
);

/**
 * POST /auth/logout
 * Logout user by revoking refresh token
 */
router.post(
  '/logout',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const span = tracer.startSpan('POST /auth/logout');

    try {
      span.setAttributes({
        'http.method': 'POST',
        'http.route': '/auth/logout',
      });

      logger.debug('User logout request');

      // Validate request body
      const validatedInput = logoutSchema.parse(req.body);

      span.addEvent('validation_completed');

      // Logout user
      await authService.logout(validatedInput.refreshToken);

      span.addEvent('logout_successful');
      span.setStatus({ code: SpanStatusCode.OK });

      logger.debug('User logout successful');

      res.status(200).json({
        success: true,
        message: 'Logged out successfully',
      });
    } catch (error) {
      span.setStatus({
        code: SpanStatusCode.ERROR,
        message: error instanceof Error ? error.message : 'Unknown error',
      });

      if (error instanceof ZodError) {
        logger.warn({ validationErrors: error.errors }, 'Logout validation failed');
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
        logger.error({ error, errorMessage }, 'Unexpected error during logout');
        span.recordException(error as Error);
        next(new AppError(500, `Failed to logout: ${errorMessage}`));
      }
    } finally {
      span.end();
    }
  }
);

/**
 * GET /auth/me
 * Get current user profile (requires authentication)
 */
router.get(
  '/me',
  requireAuth,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const span = tracer.startSpan('GET /auth/me');

    try {
      span.setAttributes({
        'user.id': req.userId,
        'http.method': 'GET',
        'http.route': '/auth/me',
      });

      logger.debug({ userId: req.userId }, 'Get user profile request');

      // Get user profile
      const user = await authService.getUserById(req.userId!);

      span.addEvent('user_fetched');
      span.setStatus({ code: SpanStatusCode.OK });

      // Remove sensitive fields
      const { passwordHash, ...userProfile } = user;

      res.status(200).json({
        success: true,
        data: userProfile,
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
        logger.error({ userId: req.userId, error, errorMessage }, 'Unexpected error fetching profile');
        span.recordException(error as Error);
        next(new AppError(500, `Failed to fetch user profile: ${errorMessage}`));
      }
    } finally {
      span.end();
    }
  }
);

export default router;
