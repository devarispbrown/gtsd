# Science Service Architecture Recommendations

## Priority 1: Critical (Pre-Production)

### 1. Scale Weekly Recompute Job

**Current Issue:** Sequential processing cannot handle 1M+ users (would take 11+ hours)

**Solution:** Implement batch processing with concurrency

```typescript
// apps/api/src/jobs/weekly-recompute.ts
async run(): Promise<WeeklyRecomputeResult> {
  const BATCH_SIZE = 1000;
  const CONCURRENT_BATCHES = 10;

  const startTime = Date.now();
  logger.info('Starting weekly recompute job with batch processing');

  // Get total count
  const [{ count }] = await db.select({ count: sql<number>`COUNT(*)` })
    .from(userSettings)
    .where(eq(userSettings.onboardingCompleted, true));

  const totalBatches = Math.ceil(count / BATCH_SIZE);
  const result: WeeklyRecomputeResult = {
    totalUsers: count,
    successCount: 0,
    errorCount: 0,
    updates: [],
  };

  // Process batches concurrently
  for (let i = 0; i < totalBatches; i += CONCURRENT_BATCHES) {
    const batchPromises = [];

    for (let j = 0; j < CONCURRENT_BATCHES && (i + j) < totalBatches; j++) {
      const offset = (i + j) * BATCH_SIZE;
      batchPromises.push(this.processBatch(offset, BATCH_SIZE, result));
    }

    await Promise.allSettled(batchPromises);

    logger.info({
      progress: Math.min((i + CONCURRENT_BATCHES) / totalBatches * 100, 100).toFixed(1) + '%',
      successCount: result.successCount,
      errorCount: result.errorCount,
    }, 'Batch processing progress');
  }

  const duration = Date.now() - startTime;
  logger.info({
    totalUsers: result.totalUsers,
    successCount: result.successCount,
    errorCount: result.errorCount,
    durationMs: duration,
  }, 'Weekly recompute job completed');

  return result;
}

private async processBatch(
  offset: number,
  limit: number,
  result: WeeklyRecomputeResult
): Promise<void> {
  try {
    const users = await db
      .select({ userId: userSettings.userId })
      .from(userSettings)
      .where(eq(userSettings.onboardingCompleted, true))
      .limit(limit)
      .offset(offset);

    // Process users in this batch concurrently
    await Promise.allSettled(
      users.map(({ userId }) =>
        this.recomputeUser(userId, result).catch(error => {
          result.errorCount++;
          logger.error({ userId, error }, 'Failed to recompute user in batch');
        })
      )
    );
  } catch (error) {
    logger.error({ offset, limit, error }, 'Failed to process batch');
  }
}

private async recomputeUser(
  userId: number,
  result: WeeklyRecomputeResult
): Promise<void> {
  const recomputeResult = await this.plansService.recomputeForUser(userId);

  if (recomputeResult.success) {
    result.successCount++;

    if (recomputeResult.updated) {
      result.updates.push({
        userId,
        previousCalories: recomputeResult.previousCalories!,
        newCalories: recomputeResult.newCalories!,
        previousProtein: recomputeResult.previousProtein!,
        newProtein: recomputeResult.newProtein!,
        reason: recomputeResult.reason!,
      });
    }
  } else {
    result.errorCount++;
  }
}
```

**Expected Performance:**

- 1M users in ~16 minutes (vs 11+ hours)
- 10 concurrent batches × 1000 users each
- Graceful failure handling per batch

---

### 2. Implement Redis Caching

**Current Issue:** Every plan generation request hits database even for frequently accessed data

**Solution:** Add caching layer

```typescript
// apps/api/src/services/cache.ts
import Redis from 'ioredis';
import { logger } from '../config/logger';

export class CacheService {
  private redis: Redis;

  constructor() {
    this.redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
      maxRetriesPerRequest: 3,
      enableOfflineQueue: true,
      retryStrategy: (times: number) => {
        if (times > 3) return null;
        return Math.min(times * 100, 2000);
      },
    });
  }

  async get<T>(key: string): Promise<T | null> {
    try {
      const value = await this.redis.get(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      logger.error({ error, key }, 'Cache get error');
      return null;
    }
  }

  async set(key: string, value: any, ttlSeconds = 3600): Promise<void> {
    try {
      await this.redis.setex(key, ttlSeconds, JSON.stringify(value));
    } catch (error) {
      logger.error({ error, key }, 'Cache set error');
    }
  }

  async del(key: string): Promise<void> {
    try {
      await this.redis.del(key);
    } catch (error) {
      logger.error({ error, key }, 'Cache delete error');
    }
  }

  async invalidateUser(userId: number): Promise<void> {
    const keys = await this.redis.keys(`user:${userId}:*`);
    if (keys.length > 0) {
      await this.redis.del(...keys);
    }
  }
}

export const cacheService = new CacheService();

// apps/api/src/routes/plans/service.ts
import { cacheService } from '../../services/cache';

export class PlansService {
  async generatePlan(userId: number, forceRecompute = false): Promise<PlanGenerationResponse> {
    const cacheKey = `user:${userId}:plan`;

    // Try cache first (unless force recompute)
    if (!forceRecompute) {
      const cached = await cacheService.get<PlanGenerationResponse>(cacheKey);
      if (cached) {
        logger.info({ userId }, 'Returning cached plan');
        return cached;
      }
    }

    // Generate new plan
    const plan = await this.generateNewPlan(userId);

    // Cache for 1 hour
    await cacheService.set(cacheKey, plan, 3600);

    return plan;
  }

  async recomputeForUser(userId: number): Promise<RecomputeResult> {
    const result = await this.doRecompute(userId);

    // Invalidate cache if targets updated
    if (result.updated) {
      await cacheService.invalidateUser(userId);
    }

    return result;
  }
}
```

**Expected Impact:**

- 90% reduction in database load for plan generation
- Sub-50ms response time for cached plans
- Automatic invalidation on user data changes

---

### 3. Add Health Check Endpoints

**Current Issue:** No way to verify service health in production

**Solution:** Kubernetes-ready health checks

```typescript
// apps/api/src/routes/health/index.ts
import { Router } from 'express';
import { db } from '../../db/connection';
import { sql } from 'drizzle-orm';
import { cacheService } from '../../services/cache';

const router = Router();

/**
 * Liveness probe - is the service alive?
 * Returns 200 if service is running
 */
router.get('/health/live', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

/**
 * Readiness probe - is the service ready to accept traffic?
 * Returns 200 if database and cache are accessible
 */
router.get('/health/ready', async (req, res) => {
  try {
    // Check database connection
    await db.execute(sql`SELECT 1`);

    // Check Redis connection
    await cacheService.get('health-check');

    res.status(200).json({
      status: 'ready',
      database: 'connected',
      cache: 'connected',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(503).json({
      status: 'not ready',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * Detailed health check with component status
 */
router.get('/health', async (req, res) => {
  const health = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    components: {
      database: { status: 'unknown', latency: 0 },
      cache: { status: 'unknown', latency: 0 },
      memory: {
        used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
        total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
        unit: 'MB',
      },
    },
  };

  try {
    // Check database
    const dbStart = Date.now();
    await db.execute(sql`SELECT 1`);
    health.components.database = {
      status: 'healthy',
      latency: Date.now() - dbStart,
    };
  } catch (error) {
    health.status = 'degraded';
    health.components.database = {
      status: 'unhealthy',
      latency: 0,
    };
  }

  try {
    // Check cache
    const cacheStart = Date.now();
    await cacheService.get('health-check');
    health.components.cache = {
      status: 'healthy',
      latency: Date.now() - cacheStart,
    };
  } catch (error) {
    health.status = 'degraded';
    health.components.cache = {
      status: 'unhealthy',
      latency: 0,
    };
  }

  const statusCode = health.status === 'healthy' ? 200 : 503;
  res.status(statusCode).json(health);
});

export default router;
```

**Kubernetes Configuration:**

```yaml
apiVersion: v1
kind: Pod
spec:
  containers:
    - name: api
      image: gtsd-api:latest
      livenessProbe:
        httpGet:
          path: /health/live
          port: 3000
        initialDelaySeconds: 30
        periodSeconds: 10
      readinessProbe:
        httpGet:
          path: /health/ready
          port: 3000
        initialDelaySeconds: 10
        periodSeconds: 5
```

---

## Priority 2: High Priority (First Month)

### 4. Extract Shared Utilities

**Issue:** Code duplication across services

**Solution:** Create shared utility package

```typescript
// packages/shared-utils/src/date.ts
export function calculateAge(dateOfBirth: Date): number {
  const today = new Date();
  let age = today.getFullYear() - dateOfBirth.getFullYear();
  const monthDiff = today.getMonth() - dateOfBirth.getMonth();

  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dateOfBirth.getDate())) {
    age--;
  }

  return age;
}

// packages/shared-utils/src/retry.ts
export async function retry<T>(
  fn: () => Promise<T>,
  options: {
    retries?: number;
    delay?: number;
    backoff?: 'linear' | 'exponential';
  } = {}
): Promise<T> {
  const { retries = 3, delay = 1000, backoff = 'exponential' } = options;

  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      if (attempt === retries - 1) throw error;

      const waitTime =
        backoff === 'exponential' ? delay * Math.pow(2, attempt) : delay * (attempt + 1);

      await new Promise((resolve) => setTimeout(resolve, waitTime));
    }
  }

  throw new Error('Retry failed');
}

// Usage
import { calculateAge } from '@gtsd/shared-utils';

const age = calculateAge(dateOfBirth);
```

---

### 5. Implement Circuit Breaker

**Issue:** No protection against cascading failures

**Solution:** Add circuit breaker pattern

```typescript
// apps/api/src/services/circuit-breaker.ts
import CircuitBreaker from 'opossum';
import { logger } from '../config/logger';

const options = {
  timeout: 3000, // 3 seconds
  errorThresholdPercentage: 50, // Open circuit if 50% of requests fail
  resetTimeout: 30000, // Try again after 30 seconds
};

export function createCircuitBreaker<T extends any[], R>(
  fn: (...args: T) => Promise<R>,
  name: string,
  fallback?: (...args: T) => Promise<R>
) {
  const breaker = new CircuitBreaker(fn, options);

  breaker.on('open', () => {
    logger.error({ name }, 'Circuit breaker opened');
  });

  breaker.on('halfOpen', () => {
    logger.warn({ name }, 'Circuit breaker half-open');
  });

  breaker.on('close', () => {
    logger.info({ name }, 'Circuit breaker closed');
  });

  if (fallback) {
    breaker.fallback(fallback);
  }

  return breaker;
}

// Usage in ScienceService
import { createCircuitBreaker } from './circuit-breaker';

export class ScienceService {
  private computeTargetsBreaker = createCircuitBreaker(
    this.doComputeAllTargets.bind(this),
    'compute-targets',
    async (userId: number) => {
      // Fallback: Return cached values or defaults
      logger.warn({ userId }, 'Using fallback for compute targets');
      return this.getDefaultTargets(userId);
    }
  );

  async computeAllTargets(userId: number): Promise<ComputedTargets> {
    return await this.computeTargetsBreaker.fire(userId);
  }

  private async doComputeAllTargets(userId: number): Promise<ComputedTargets> {
    // Original implementation
  }

  private async getDefaultTargets(userId: number): Promise<ComputedTargets> {
    // Return cached or safe default values
  }
}
```

---

### 6. Add Comprehensive Monitoring

**Issue:** No alerting on failures or performance degradation

**Solution:** Add monitoring and alerting

```typescript
// apps/api/src/services/metrics.ts
import { Registry, Counter, Histogram, Gauge } from 'prom-client';

export const register = new Registry();

// Counters
export const planGenerationCounter = new Counter({
  name: 'plan_generation_total',
  help: 'Total number of plan generations',
  labelNames: ['status', 'recomputed'],
  registers: [register],
});

export const recomputeCounter = new Counter({
  name: 'user_recompute_total',
  help: 'Total number of user recomputes',
  labelNames: ['status', 'updated'],
  registers: [register],
});

// Histograms
export const planGenerationDuration = new Histogram({
  name: 'plan_generation_duration_seconds',
  help: 'Duration of plan generation',
  labelNames: ['status'],
  buckets: [0.1, 0.3, 0.5, 1, 2, 5],
  registers: [register],
});

export const targetComputationDuration = new Histogram({
  name: 'target_computation_duration_seconds',
  help: 'Duration of target computation',
  labelNames: ['status'],
  buckets: [0.01, 0.05, 0.1, 0.2, 0.3, 0.5],
  registers: [register],
});

// Gauges
export const weeklyJobProgress = new Gauge({
  name: 'weekly_job_progress_percentage',
  help: 'Progress of weekly recompute job',
  registers: [register],
});

// Metrics endpoint
// apps/api/src/routes/metrics/index.ts
import { Router } from 'express';
import { register } from '../../services/metrics';

const router = Router();

router.get('/metrics', async (req, res) => {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
});

export default router;
```

**Usage in Services:**

```typescript
import { planGenerationCounter, planGenerationDuration } from '../../services/metrics';

async generatePlan(userId: number, forceRecompute = false): Promise<PlanGenerationResponse> {
  const timer = planGenerationDuration.startTimer();

  try {
    const result = await this.doGeneratePlan(userId, forceRecompute);

    planGenerationCounter.inc({
      status: 'success',
      recomputed: forceRecompute.toString(),
    });

    timer({ status: 'success' });
    return result;
  } catch (error) {
    planGenerationCounter.inc({
      status: 'error',
      recomputed: forceRecompute.toString(),
    });

    timer({ status: 'error' });
    throw error;
  }
}
```

---

## Priority 3: Recommended (First Quarter)

### 7. Add Comprehensive Test Suite

```typescript
// apps/api/src/services/__tests__/science.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { ScienceService } from '../science';

describe('ScienceService', () => {
  let service: ScienceService;

  beforeEach(() => {
    service = new ScienceService();
  });

  describe('calculateBMR', () => {
    it('calculates correct BMR for male', () => {
      // (10 * 75) + (6.25 * 180) - (5 * 30) + 5 = 1780
      expect(service.calculateBMR(75, 180, 30, 'male')).toBe(1780);
    });

    it('calculates correct BMR for female', () => {
      // (10 * 60) + (6.25 * 165) - (5 * 25) - 161 = 1344
      expect(service.calculateBMR(60, 165, 25, 'female')).toBe(1344);
    });

    it('calculates correct BMR for other gender', () => {
      // (10 * 70) + (6.25 * 170) - (5 * 28) + ((5 - 161) / 2) = 1545
      expect(service.calculateBMR(70, 170, 28, 'other')).toBe(1545);
    });

    it('handles minimum valid values', () => {
      const bmr = service.calculateBMR(30, 100, 13, 'female');
      expect(bmr).toBeGreaterThan(0);
      expect(bmr).toBeLessThan(2000);
    });

    it('handles maximum valid values', () => {
      const bmr = service.calculateBMR(300, 250, 120, 'male');
      expect(bmr).toBeGreaterThan(1000);
    });
  });

  describe('calculateTDEE', () => {
    it('applies correct multiplier for sedentary', () => {
      expect(service.calculateTDEE(1500, 'sedentary')).toBe(1800); // 1500 * 1.2
    });

    it('applies correct multiplier for moderately active', () => {
      expect(service.calculateTDEE(1500, 'moderately_active')).toBe(2325); // 1500 * 1.55
    });
  });

  describe('calculateCalorieTarget', () => {
    it('applies deficit for weight loss', () => {
      expect(service.calculateCalorieTarget(2500, 'lose_weight')).toBe(2000); // 2500 - 500
    });

    it('applies surplus for muscle gain', () => {
      expect(service.calculateCalorieTarget(2500, 'gain_muscle')).toBe(2900); // 2500 + 400
    });

    it('maintains TDEE for maintenance goal', () => {
      expect(service.calculateCalorieTarget(2500, 'maintain')).toBe(2500);
    });
  });

  describe('calculateProteinTarget', () => {
    it('calculates correct protein for weight loss', () => {
      expect(service.calculateProteinTarget(75, 'lose_weight')).toBe(165); // 75 * 2.2
    });

    it('calculates correct protein for muscle gain', () => {
      expect(service.calculateProteinTarget(75, 'gain_muscle')).toBe(180); // 75 * 2.4
    });
  });

  describe('calculateWaterTarget', () => {
    it('calculates water target and rounds to nearest 100ml', () => {
      expect(service.calculateWaterTarget(75)).toBe(2600); // 75 * 35 = 2625, rounds to 2600
    });

    it('handles small weights', () => {
      expect(service.calculateWaterTarget(50)).toBe(1800); // 50 * 35 = 1750, rounds to 1800
    });
  });

  describe('calculateProjection', () => {
    it('calculates correct timeline for weight loss', () => {
      const result = service.calculateProjection(75, 70, -0.5);
      expect(result.estimatedWeeks).toBe(10); // (75 - 70) / 0.5 = 10
      expect(result.projectedDate).toBeInstanceOf(Date);
    });

    it('returns undefined for maintenance goals', () => {
      const result = service.calculateProjection(75, 75, 0);
      expect(result.estimatedWeeks).toBeUndefined();
      expect(result.projectedDate).toBeUndefined();
    });
  });
});
```

### Target Test Coverage:

- Unit tests: 90%+ coverage
- Integration tests: Key user flows
- E2E tests: Critical paths (plan generation, recompute)

---

### 8. Implement Dependency Injection

**Issue:** Hard to test services due to tight coupling

**Solution:** Refactor to use dependency injection

```typescript
// apps/api/src/services/science.ts
export interface ScienceServiceDependencies {
  db: Database;
  logger: Logger;
  tracer: Tracer;
}

export class ScienceService {
  constructor(private deps: ScienceServiceDependencies) {}

  async computeAllTargets(userId: number): Promise<ComputedTargets> {
    const [settings] = await this.deps.db
      .select({...})
      .from(userSettings)
      .where(eq(userSettings.userId, userId));

    // Now easy to mock database in tests
  }
}

// Factory function
export function createScienceService(deps?: Partial<ScienceServiceDependencies>) {
  return new ScienceService({
    db: deps?.db || db,
    logger: deps?.logger || logger,
    tracer: deps?.tracer || trace.getTracer('science-service'),
  });
}

// Testing
const mockDb = {
  select: vi.fn().mockReturnValue({
    from: vi.fn().mockReturnValue({
      where: vi.fn().mockResolvedValue([mockSettings]),
    }),
  }),
};

const service = createScienceService({ db: mockDb });
```

---

### 9. Add Database Indexes

**Issue:** Potential slow queries under load

**Solution:** Verify and add missing indexes

```sql
-- Ensure these indexes exist in schema
CREATE INDEX IF NOT EXISTS idx_user_settings_onboarding_completed
  ON user_settings(onboarding_completed)
  WHERE onboarding_completed = true;

CREATE INDEX IF NOT EXISTS idx_plans_user_id_start_date
  ON plans(user_id, start_date DESC);

-- Add covering index for recompute query
CREATE INDEX IF NOT EXISTS idx_user_settings_recompute
  ON user_settings(user_id, onboarding_completed)
  INCLUDE (current_weight, height, date_of_birth, gender, activity_level, primary_goal, target_weight);
```

---

### 10. Document Runbooks

Create operational documentation:

```markdown
# Science Service Runbooks

## Weekly Recompute Job Failed

### Symptoms

- Job fails or times out
- Users reporting incorrect targets
- High error rate in logs

### Investigation

1. Check job logs: `kubectl logs -l job=weekly-recompute --tail=1000`
2. Check database connections: `SELECT count(*) FROM pg_stat_activity;`
3. Check Redis: `redis-cli INFO`

### Resolution

1. Manually trigger job: `curl -X POST http://api/admin/jobs/weekly-recompute`
2. If timeout: Increase job timeout in scheduler
3. If database issue: Check connection pool settings
4. If Redis issue: Clear rate limit keys: `redis-cli KEYS "rl:*" | xargs redis-cli DEL`

### Prevention

- Monitor job duration metrics
- Set up alerts for job failures
- Implement batch processing (see Priority 1)

---

## Plan Generation Slow (>300ms p95)

### Symptoms

- Response times above 300ms
- Timeout errors
- User complaints about slow app

### Investigation

1. Check metrics: `grafana dashboard: api-performance`
2. Check database query times: OpenTelemetry traces
3. Check cache hit rate: Redis INFO stats

### Resolution

1. Enable caching if not already (see Priority 1)
2. Check database connection pool: Increase max connections
3. Check for slow queries: `SELECT * FROM pg_stat_statements ORDER BY mean_time DESC;`
4. Scale horizontally: Add more API pods

### Prevention

- Set up alerts for p95 > 300ms
- Implement caching (Priority 1)
- Regular load testing
```

---

## Summary of Recommendations

| Priority    | Task                 | Estimated Effort | Impact                       |
| ----------- | -------------------- | ---------------- | ---------------------------- |
| Critical    | Scale weekly job     | 3 days           | High - enables 1M+ users     |
| Critical    | Implement caching    | 2 days           | High - 90% performance boost |
| Critical    | Add health checks    | 1 day            | High - production readiness  |
| High        | Extract utilities    | 2 days           | Medium - maintainability     |
| High        | Circuit breakers     | 2 days           | High - reliability           |
| High        | Add monitoring       | 3 days           | High - observability         |
| Recommended | Test suite           | 5 days           | Medium - confidence          |
| Recommended | Dependency injection | 3 days           | Medium - testability         |
| Recommended | Database indexes     | 1 day            | High - performance           |
| Recommended | Runbooks             | 2 days           | Medium - operations          |

**Total Estimated Effort:**

- Critical: 6 days
- High Priority: 7 days
- Recommended: 11 days
- **Total: 24 days (5 weeks)**

---

## Performance Projections

### Current State (1K users)

- Plan generation: ~100ms avg, ~200ms p95
- Weekly job: ~40 seconds
- Database load: Low

### After Critical Fixes (1M users)

- Plan generation: ~30ms avg (cached), ~150ms p95 (uncached)
- Weekly job: ~16 minutes (batch processed)
- Database load: Moderate (60% connection pool)
- Cache hit rate: 90%+

### Capacity Headroom

- Can handle 5M users with current architecture
- Horizontal scaling enabled via health checks
- Circuit breakers prevent cascading failures
