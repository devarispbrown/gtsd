import Redis from 'ioredis';
import { logger } from '../../config/logger';

/**
 * Redis-based cache with in-memory fallback
 * - Primary: Redis for distributed caching
 * - Fallback: In-memory Map when Redis is unavailable
 * - TTL: 60 seconds for task lists
 */
export class TasksCache {
  private redis: Redis;
  private fallbackCache: Map<string, { data: unknown; expiry: number }>;
  private isRedisAvailable: boolean = false;

  constructor() {
    this.redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
      maxRetriesPerRequest: 3,
      enableOfflineQueue: false,
      lazyConnect: true,
      retryStrategy: (times: number) => {
        if (times > 3) {
          logger.warn('Redis max retries exceeded, using fallback cache');
          return null; // Stop retrying
        }
        return Math.min(times * 100, 2000); // Exponential backoff
      },
    });

    // Fallback in-memory cache for when Redis is unavailable
    this.fallbackCache = new Map();

    this.redis.on('error', (err) => {
      this.isRedisAvailable = false;
      logger.error({ error: err.message }, 'Redis connection error');
    });

    this.redis.on('connect', () => {
      this.isRedisAvailable = true;
      logger.info('Redis cache connected');
    });

    this.redis.on('close', () => {
      this.isRedisAvailable = false;
      logger.warn('Redis connection closed, using fallback cache');
    });

    // Connect async
    this.redis.connect().catch((err) => {
      this.isRedisAvailable = false;
      logger.warn({ error: err.message }, 'Redis unavailable, using fallback cache');
    });

    // Cleanup fallback cache periodically
    setInterval(() => this.cleanupFallbackCache(), 60000);

    // Log cache statistics periodically
    setInterval(async () => {
      const stats = await this.getStats();
      logger.debug({ cacheStats: stats }, 'Tasks cache statistics');
    }, 300000); // Every 5 minutes
  }

  /**
   * Generate cache key for today tasks query
   */
  private getTodayTasksKey(
    userId: number,
    date: string,
    limit: number,
    offset: number,
    type?: string
  ): string {
    return `tasks:today:${userId}:${date}:${limit}:${offset}:${type || 'all'}`;
  }

  /**
   * Get cached today tasks
   */
  async getTodayTasks<T>(
    userId: number,
    date: string,
    limit: number,
    offset: number,
    type?: string
  ): Promise<T | undefined> {
    const key = this.getTodayTasksKey(userId, date, limit, offset, type);

    if (this.isRedisAvailable) {
      try {
        const cached = await this.redis.get(key);
        if (cached) {
          logger.debug({ key }, 'Redis cache HIT');
          return JSON.parse(cached) as T;
        }
        logger.debug({ key }, 'Redis cache MISS');
      } catch (error) {
        logger.warn({ error: (error as Error).message, key }, 'Redis get failed, checking fallback');
        return this.getFallback<T>(key);
      }
    } else {
      return this.getFallback<T>(key);
    }

    return undefined;
  }

  /**
   * Set today tasks in cache
   */
  async setTodayTasks<T>(
    userId: number,
    date: string,
    limit: number,
    offset: number,
    data: T,
    type?: string,
    ttl = 60
  ): Promise<void> {
    const key = this.getTodayTasksKey(userId, date, limit, offset, type);

    if (this.isRedisAvailable) {
      try {
        await this.redis.setex(key, ttl, JSON.stringify(data));
        logger.debug({ key, ttl }, 'Cached in Redis');
        return;
      } catch (error) {
        logger.warn({ error: (error as Error).message, key }, 'Redis set failed, using fallback');
      }
    }

    // Use fallback if Redis is unavailable or failed
    this.setFallback(key, data, ttl);
  }

  /**
   * Invalidate all cached tasks for a user
   * Called after evidence is created
   */
  async invalidateUserTasks(userId: number): Promise<void> {
    const pattern = `tasks:today:${userId}:*`;

    if (this.isRedisAvailable) {
      try {
        const keys = await this.redis.keys(pattern);
        if (keys.length > 0) {
          await this.redis.del(...keys);
          logger.info({ userId, deletedKeys: keys.length }, 'Invalidated Redis cache');
        }
      } catch (error) {
        logger.warn({ error: (error as Error).message, userId }, 'Redis invalidation failed, clearing fallback');
      }
    }

    // Always clear fallback cache
    this.invalidateFallback(userId);
  }

  /**
   * Clear entire cache (useful for testing)
   */
  async flush(): Promise<void> {
    if (this.isRedisAvailable) {
      try {
        await this.redis.flushdb();
        logger.info('Flushed Redis cache');
      } catch (error) {
        logger.warn({ error: (error as Error).message }, 'Redis flush failed');
      }
    }
    this.fallbackCache.clear();
    logger.info('Flushed fallback cache');
  }

  /**
   * Get cache statistics
   */
  async getStats() {
    const stats: any = {
      fallback: {
        size: this.fallbackCache.size,
      },
    };

    if (this.isRedisAvailable) {
      try {
        const info = await this.redis.info('stats');
        stats.redis = {
          connected: true,
          info: info.split('\n').slice(0, 10).join('\n'), // First 10 lines
        };
      } catch (error) {
        stats.redis = { connected: false };
      }
    } else {
      stats.redis = { connected: false };
    }

    return stats;
  }

  /**
   * Disconnect from Redis (for graceful shutdown)
   */
  async disconnect(): Promise<void> {
    if (this.isRedisAvailable) {
      await this.redis.quit();
      logger.info('Redis connection closed');
    }
  }

  // Fallback cache methods
  private getFallback<T>(key: string): T | undefined {
    const entry = this.fallbackCache.get(key);
    if (entry && entry.expiry > Date.now()) {
      logger.debug({ key }, 'Fallback cache HIT');
      return entry.data as T;
    }
    if (entry) {
      this.fallbackCache.delete(key);
    }
    logger.debug({ key }, 'Fallback cache MISS');
    return undefined;
  }

  private setFallback<T>(key: string, data: T, ttl: number): void {
    this.fallbackCache.set(key, {
      data,
      expiry: Date.now() + ttl * 1000,
    });
    logger.debug({ key, ttl }, 'Cached in fallback');
  }

  private invalidateFallback(userId: number): void {
    const prefix = `tasks:today:${userId}:`;
    let deletedCount = 0;
    for (const key of this.fallbackCache.keys()) {
      if (key.startsWith(prefix)) {
        this.fallbackCache.delete(key);
        deletedCount++;
      }
    }
    if (deletedCount > 0) {
      logger.info({ userId, deletedKeys: deletedCount }, 'Invalidated fallback cache');
    }
  }

  private cleanupFallbackCache(): void {
    const now = Date.now();
    let cleanedCount = 0;
    for (const [key, entry] of this.fallbackCache.entries()) {
      if (entry.expiry <= now) {
        this.fallbackCache.delete(key);
        cleanedCount++;
      }
    }
    if (cleanedCount > 0) {
      logger.debug({ cleanedCount }, 'Cleaned up expired fallback cache entries');
    }
  }
}

// Singleton instance
export const tasksCache = new TasksCache();

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, disconnecting cache');
  await tasksCache.disconnect();
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received, disconnecting cache');
  await tasksCache.disconnect();
});
