import NodeCache from 'node-cache';
import { logger } from '../../config/logger';

/**
 * Cache configuration
 * - TTL: 60 seconds for task lists
 * - Check period: 120 seconds for cleanup
 */
export class TasksCache {
  private cache: NodeCache;

  constructor() {
    this.cache = new NodeCache({
      stdTTL: 60, // Default TTL: 60 seconds
      checkperiod: 120, // Check for expired keys every 2 minutes
      useClones: false, // Improve performance by not cloning objects
      deleteOnExpire: true,
    });

    // Log cache statistics periodically
    setInterval(() => {
      const stats = this.cache.getStats();
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
  getTodayTasks<T>(
    userId: number,
    date: string,
    limit: number,
    offset: number,
    type?: string
  ): T | undefined {
    const key = this.getTodayTasksKey(userId, date, limit, offset, type);
    const cached = this.cache.get<T>(key);

    if (cached) {
      logger.debug({ key }, 'Cache HIT for today tasks');
    } else {
      logger.debug({ key }, 'Cache MISS for today tasks');
    }

    return cached;
  }

  /**
   * Set today tasks in cache
   */
  setTodayTasks<T>(
    userId: number,
    date: string,
    limit: number,
    offset: number,
    data: T,
    type?: string,
    ttl = 60
  ): void {
    const key = this.getTodayTasksKey(userId, date, limit, offset, type);
    this.cache.set(key, data, ttl);
    logger.debug({ key, ttl }, 'Cached today tasks');
  }

  /**
   * Invalidate all cached tasks for a user
   * Called after evidence is created
   */
  invalidateUserTasks(userId: number): void {
    const keys = this.cache.keys();
    const userPrefix = `tasks:today:${userId}:`;

    const keysToDelete = keys.filter((key) => key.startsWith(userPrefix));

    if (keysToDelete.length > 0) {
      this.cache.del(keysToDelete);
      logger.info({ userId, deletedKeys: keysToDelete.length }, 'Invalidated user task cache');
    }
  }

  /**
   * Clear entire cache (useful for testing)
   */
  flush(): void {
    this.cache.flushAll();
    logger.info('Flushed tasks cache');
  }

  /**
   * Get cache statistics
   */
  getStats() {
    return this.cache.getStats();
  }
}

// Singleton instance
export const tasksCache = new TasksCache();
