import { Request, Response, NextFunction } from 'express';
import { AppError } from './error';

/**
 * Authentication middleware that extracts and validates user ID from headers
 * Validates the header format but doesn't require authentication
 * In production, this would validate JWT tokens or session cookies
 */
export function authMiddleware(req: Request, _res: Response, next: NextFunction): void {
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
  }

  next();
}

/**
 * Require authentication middleware - ensures userId is present
 * Use this on routes that require authentication
 */
export function requireAuth(req: Request, _res: Response, next: NextFunction): void {
  if (!req.userId) {
    return next(new AppError(401, 'Authentication required'));
  }
  next();
}