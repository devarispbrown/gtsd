import { Request, Response, NextFunction } from 'express';
import { AppError } from './error';
import { verifyAccessToken, extractTokenFromHeader } from '../utils/auth';
import { logger } from '../config/logger';

/**
 * Authentication middleware that validates JWT tokens
 * Extracts userId from valid JWT and attaches to request
 * Also supports legacy x-user-id header for backward compatibility during migration
 */
export function authMiddleware(req: Request, _res: Response, next: NextFunction): void {
  // Try JWT authentication first
  const authHeader = req.headers.authorization;
  const token = extractTokenFromHeader(authHeader);

  if (token) {
    try {
      const decoded = verifyAccessToken(token);
      req.userId = decoded.userId;
      logger.debug({ userId: decoded.userId }, 'JWT authentication successful');
      return next();
    } catch (error) {
      // JWT validation failed, but we'll continue to check legacy header
      logger.debug({ error: error instanceof Error ? error.message : 'Unknown error' }, 'JWT validation failed');
    }
  }

  // Fallback to legacy x-user-id header for backward compatibility
  const userIdHeader = req.headers['x-user-id'];
  if (userIdHeader) {
    if (typeof userIdHeader !== 'string') {
      return next(new AppError(401, 'Invalid authentication header format'));
    }

    const userId = parseInt(userIdHeader, 10);
    if (isNaN(userId) || userId <= 0) {
      return next(new AppError(401, 'Invalid user ID in authentication header'));
    }

    req.userId = userId;
    logger.debug({ userId }, 'Legacy header authentication successful');
  }

  next();
}

/**
 * Require authentication middleware - ensures userId is present
 * Use this on routes that require authentication
 */
export function requireAuth(req: Request, _res: Response, next: NextFunction): void {
  if (!req.userId) {
    return next(new AppError(401, 'Authentication required. Please provide a valid JWT token.'));
  }
  next();
}

/**
 * Optional authentication middleware
 * Attempts to authenticate but doesn't fail if no credentials provided
 * Useful for routes that have different behavior for authenticated vs anonymous users
 */
export function optionalAuth(req: Request, _res: Response, next: NextFunction): void {
  authMiddleware(req, _res, next);
}