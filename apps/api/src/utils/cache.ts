import Redis from 'ioredis';
import { logger } from '../config/logger';

// In test mode, don't create Redis client to avoid connection attempts
const isTestMode = process.env.NODE_ENV === 'test';

/**
 * Redis cache client for application caching
 * Separate from rate limiter Redis client
 */
const redisClient = !isTestMode
  ? new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
      maxRetriesPerRequest: 3,
      enableOfflineQueue: true,
      lazyConnect: true,
      retryStrategy: (times: number) => {
        if (times > 3) {
          logger.warn('Redis cache max retries exceeded');
          return null;
        }
        return Math.min(times * 100, 2000);
      },
    })
  : null;

if (redisClient) {
  redisClient.on('error', (err) => {
    logger.error({ error: err.message }, 'Redis cache connection error');
  });

  redisClient.on('connect', () => {
    logger.info('Redis cache connected');
  });

  // Connect async
  redisClient.connect().catch((err) => {
    logger.warn({ error: err.message }, 'Redis cache unavailable, cache will be disabled');
  });
}

/**
 * Redis cache utility with type-safe methods
 */
export class RedisCache {
  private client: Redis | null;
  private isConnected: boolean = false;

  constructor(client: Redis | null) {
    this.client = client;

    if (client) {
      client.on('ready', () => {
        this.isConnected = true;
        logger.info('Redis cache ready');
      });

      client.on('close', () => {
        this.isConnected = false;
        logger.warn('Redis cache connection closed');
      });
    }
  }

  /**
   * Get a cached value by key
   * Returns null if key doesn't exist or cache is unavailable
   *
   * @param key - Cache key
   * @returns Cached value or null
   */
  async get<T>(key: string): Promise<T | null> {
    if (!this.client || !this.isConnected) {
      logger.debug({ key }, 'Cache unavailable - skipping get');
      return null;
    }

    try {
      const value = await this.client.get(key);
      if (!value) {
        return null;
      }

      return JSON.parse(value) as T;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.warn({ key, error: errorMessage }, 'Cache get failed');
      return null;
    }
  }

  /**
   * Set a cache value with TTL
   *
   * @param key - Cache key
   * @param value - Value to cache (will be JSON stringified)
   * @param ttlSeconds - Time to live in seconds
   */
  async set(key: string, value: unknown, ttlSeconds: number): Promise<void> {
    if (!this.client || !this.isConnected) {
      logger.debug({ key }, 'Cache unavailable - skipping set');
      return;
    }

    try {
      const serialized = JSON.stringify(value);
      await this.client.setex(key, ttlSeconds, serialized);
      logger.debug({ key, ttl: ttlSeconds }, 'Cache set successful');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.warn({ key, error: errorMessage }, 'Cache set failed');
    }
  }

  /**
   * Invalidate a single cache key
   *
   * @param key - Cache key to invalidate
   */
  async invalidate(key: string): Promise<void> {
    if (!this.client || !this.isConnected) {
      logger.debug({ key }, 'Cache unavailable - skipping invalidate');
      return;
    }

    try {
      await this.client.del(key);
      logger.debug({ key }, 'Cache key invalidated');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.warn({ key, error: errorMessage }, 'Cache invalidate failed');
    }
  }

  /**
   * Invalidate all keys matching a pattern
   * Uses SCAN for safe pattern matching (better than KEYS)
   *
   * @param pattern - Pattern to match (e.g., "streak:*")
   */
  async invalidatePattern(pattern: string): Promise<void> {
    if (!this.client || !this.isConnected) {
      logger.debug({ pattern }, 'Cache unavailable - skipping invalidatePattern');
      return;
    }

    try {
      const stream = this.client.scanStream({
        match: pattern,
        count: 100,
      });

      let keysToDelete: string[] = [];

      stream.on('data', (keys: string[]) => {
        if (keys.length > 0) {
          keysToDelete = keysToDelete.concat(keys);
        }
      });

      await new Promise<void>((resolve, reject) => {
        stream.on('end', async () => {
          try {
            if (keysToDelete.length > 0) {
              await this.client!.del(...keysToDelete);
              logger.debug({ pattern, count: keysToDelete.length }, 'Cache pattern invalidated');
            }
            resolve();
          } catch (error) {
            reject(error);
          }
        });

        stream.on('error', (error) => {
          reject(error);
        });
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.warn({ pattern, error: errorMessage }, 'Cache invalidatePattern failed');
    }
  }

  /**
   * Check if cache is connected and ready
   */
  isReady(): boolean {
    return this.isConnected;
  }
}

/**
 * Singleton cache instance
 */
export const redisCache = new RedisCache(redisClient);

/**
 * Graceful shutdown
 */
if (redisClient) {
  process.on('SIGTERM', async () => {
    logger.info('SIGTERM received, disconnecting cache Redis');
    await redisClient.quit();
  });

  process.on('SIGINT', async () => {
    logger.info('SIGINT received, disconnecting cache Redis');
    await redisClient.quit();
  });
}
