import { Request, Response, NextFunction } from 'express';

/**
 * Simple auth middleware that extracts userId from X-User-Id header
 * In production, this would validate JWT tokens or session cookies
 */
export function authMiddleware(req: Request, _res: Response, next: NextFunction): void {
  const userIdHeader = req.headers['x-user-id'];

  if (userIdHeader && typeof userIdHeader === 'string') {
    const userId = parseInt(userIdHeader, 10);
    if (!isNaN(userId)) {
      req.userId = userId;
    }
  }

  next();
}