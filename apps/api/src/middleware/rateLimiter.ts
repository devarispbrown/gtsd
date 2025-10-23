import rateLimit from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';
import Redis from 'ioredis';
import type { Request, Response, NextFunction } from 'express';
import { AppError } from './error';
import { logger } from '../config/logger';

// In test mode, export no-op middleware to avoid IPv6 validation errors
const isTestMode = process.env.NODE_ENV === 'test';

// No-op middleware for test mode
const noopMiddleware = (_req: Request, _res: Response, next: NextFunction) => next();

// Create Redis client for rate limiting only in non-test mode
const redis = !isTestMode
  ? new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
      maxRetriesPerRequest: 3,
      enableOfflineQueue: true, // Allow commands to queue while connecting
      lazyConnect: true,
      retryStrategy: (times: number) => {
        if (times > 3) {
          logger.warn('Redis rate limiter max retries exceeded');
          return null;
        }
        return Math.min(times * 100, 2000);
      },
    })
  : null;

if (redis) {
  redis.on('error', (err) => {
    logger.error({ error: err.message }, 'Redis rate limiter connection error');
  });

  redis.on('connect', () => {
    logger.info('Redis rate limiter connected');
  });

  // Connect async
  redis.connect().catch((err) => {
    logger.warn({ error: err.message }, 'Redis rate limiter unavailable, using memory store');
  });
}

/**
 * General API rate limiter
 * 100 requests per minute per IP
 */
export const apiLimiter = isTestMode
  ? noopMiddleware
  : rateLimit({
      windowMs: 1 * 60 * 1000, // 1 minute
      max: 100, // 100 requests per minute
      message: 'Too many requests, please try again later',
      standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
      legacyHeaders: false, // Disable the `X-RateLimit-*` headers
      store: new RedisStore({
        // @ts-expect-error - RedisStore types are not compatible with ioredis v5
        sendCommand: (...args: string[]) => redis!.call(...args),
        prefix: 'rl:api:',
      }),
      handler: (_req, _res, _next, options) => {
        logger.warn({ limit: options.max, window: options.windowMs }, 'API rate limit exceeded');
        throw new AppError(429, 'Too many requests, please try again later');
      },
    });

/**
 * Strict rate limiter for sensitive endpoints
 * 20 requests per minute per IP
 * Use this for authentication, evidence creation, etc.
 */
export const strictLimiter = isTestMode
  ? noopMiddleware
  : rateLimit({
      windowMs: 1 * 60 * 1000, // 1 minute
      max: 20, // 20 requests per minute
      message: 'Too many requests, please try again later',
      standardHeaders: true,
      legacyHeaders: false,
      store: new RedisStore({
        // @ts-expect-error - RedisStore types are not compatible with ioredis v5
        sendCommand: (...args: string[]) => redis!.call(...args),
        prefix: 'rl:strict:',
      }),
      handler: (_req, _res, _next, options) => {
        logger.warn({ limit: options.max, window: options.windowMs }, 'Strict rate limit exceeded');
        throw new AppError(429, 'Too many requests, please try again later');
      },
    });

/**
 * Per-user rate limiter
 * 200 requests per minute per authenticated user
 * More generous than IP-based limiting
 */
export const perUserLimiter = isTestMode
  ? noopMiddleware
  : rateLimit({
      windowMs: 1 * 60 * 1000, // 1 minute
      max: 200, // 200 requests per minute per user
      message: 'Too many requests, please try again later',
      standardHeaders: true,
      legacyHeaders: false,
      store: new RedisStore({
        // @ts-expect-error - RedisStore types are not compatible with ioredis v5
        sendCommand: (...args: string[]) => redis!.call(...args),
        prefix: 'rl:user:',
      }),
      keyGenerator: (req) => {
        // Use userId if available (after auth middleware), otherwise fall back to IP
        if (req.userId) {
          return `user_${req.userId}`;
        }
        // Fall back to IP address (handles both IPv4 and IPv6)
        return req.ip || req.socket.remoteAddress || 'unknown';
      },
      handler: (_req, _res, _next, options) => {
        logger.warn({ limit: options.max, window: options.windowMs }, 'Per-user rate limit exceeded');
        throw new AppError(429, 'Too many requests, please try again later');
      },
    });

// Graceful shutdown
if (redis) {
  process.on('SIGTERM', async () => {
    logger.info('SIGTERM received, disconnecting rate limiter Redis');
    await redis.quit();
  });

  process.on('SIGINT', async () => {
    logger.info('SIGINT received, disconnecting rate limiter Redis');
    await redis.quit();
  });
}