import { dailyMetricsRecomputeJob } from './daily-metrics-recompute';
import { db } from '../db/connection';
import { users, userSettings, profileMetrics } from '../db/schema';
import { eq, and, sql } from 'drizzle-orm';

describe('DailyMetricsRecomputeJob', () => {
  let user1Id: number;
  let user2Id: number;
  let user3Id: number;
  let user4Id: number;

  beforeAll(async () => {

    // Create test users
    const [u1] = await db
      .insert(users)
      .values({
        email: 'daily-job-user-1@example.com',
        name: 'Daily Job User 1',
        timezone: 'America/Los_Angeles',
      })
      .returning();

    const [u2] = await db
      .insert(users)
      .values({
        email: 'daily-job-user-2@example.com',
        name: 'Daily Job User 2',
        timezone: 'America/New_York',
      })
      .returning();

    const [u3] = await db
      .insert(users)
      .values({
        email: 'daily-job-user-3@example.com',
        name: 'Daily Job User 3',
        timezone: 'Europe/London',
      })
      .returning();

    const [u4] = await db
      .insert(users)
      .values({
        email: 'daily-job-user-4@example.com',
        name: 'Daily Job User 4',
        timezone: 'Asia/Tokyo',
      })
      .returning();

    user1Id = u1.id;
    user2Id = u2.id;
    user3Id = u3.id;
    user4Id = u4.id;
  });

  afterAll(async () => {
    // Cleanup
    await db.delete(profileMetrics);
    await db.delete(userSettings);
    await db.delete(users).where(eq(users.id, user1Id));
    await db.delete(users).where(eq(users.id, user2Id));
    await db.delete(users).where(eq(users.id, user3Id));
    await db.delete(users).where(eq(users.id, user4Id));
  });

  beforeEach(async () => {
    // Clean up before each test
    await db.delete(profileMetrics);
    await db.delete(userSettings);
  });

  describe('run()', () => {
    it('should recompute metrics for all users with onboarding completed', async () => {
      // Create complete settings for users 1 and 2
      await db.insert(userSettings).values([
        {
          userId: user1Id,
          dateOfBirth: new Date('1990-01-01'),
          gender: 'male',
          currentWeight: '80',
          height: '180',
          targetWeight: '75',
          activityLevel: 'moderately_active',
          primaryGoal: 'lose_weight',
          onboardingCompleted: true,
        },
        {
          userId: user2Id,
          dateOfBirth: new Date('1995-01-01'),
          gender: 'female',
          currentWeight: '65',
          height: '165',
          targetWeight: '60',
          activityLevel: 'sedentary',
          primaryGoal: 'lose_weight',
          onboardingCompleted: true,
        },
      ]);

      const result = await dailyMetricsRecomputeJob.run();

      expect(result.totalUsers).toBe(2);
      expect(result.successCount).toBe(2);
      expect(result.errorCount).toBe(0);
      expect(result.skippedCount).toBe(0);

      // Verify metrics were created
      const user1Metrics = await db
        .select()
        .from(profileMetrics)
        .where(eq(profileMetrics.userId, user1Id));

      const user2Metrics = await db
        .select()
        .from(profileMetrics)
        .where(eq(profileMetrics.userId, user2Id));

      expect(user1Metrics.length).toBe(1);
      expect(user2Metrics.length).toBe(1);
    });

    it('should skip users without onboarding completed', async () => {
      // User 1: onboarding completed
      await db.insert(userSettings).values({
        userId: user1Id,
        dateOfBirth: new Date('1990-01-01'),
        gender: 'male',
        currentWeight: '80',
        height: '180',
        targetWeight: '75',
        activityLevel: 'moderately_active',
        primaryGoal: 'lose_weight',
        onboardingCompleted: true,
      });

      // User 2: onboarding NOT completed
      await db.insert(userSettings).values({
        userId: user2Id,
        dateOfBirth: new Date('1995-01-01'),
        gender: 'female',
        currentWeight: '65',
        height: '165',
        targetWeight: '60',
        activityLevel: 'sedentary',
        primaryGoal: 'lose_weight',
        onboardingCompleted: false, // Not completed
      });

      const result = await dailyMetricsRecomputeJob.run();

      expect(result.totalUsers).toBe(1); // Only user 1 processed
      expect(result.successCount).toBe(1);
      expect(result.errorCount).toBe(0);

      // Verify only user 1 has metrics
      const user1Metrics = await db
        .select()
        .from(profileMetrics)
        .where(eq(profileMetrics.userId, user1Id));

      const user2Metrics = await db
        .select()
        .from(profileMetrics)
        .where(eq(profileMetrics.userId, user2Id));

      expect(user1Metrics.length).toBe(1);
      expect(user2Metrics.length).toBe(0);
    });

    it('should skip users with incomplete health data', async () => {
      // User 1: complete data
      await db.insert(userSettings).values({
        userId: user1Id,
        dateOfBirth: new Date('1990-01-01'),
        gender: 'male',
        currentWeight: '80',
        height: '180',
        targetWeight: '75',
        activityLevel: 'moderately_active',
        primaryGoal: 'lose_weight',
        onboardingCompleted: true,
      });

      // User 2: missing weight
      await db.insert(userSettings).values({
        userId: user2Id,
        dateOfBirth: new Date('1995-01-01'),
        gender: 'female',
        currentWeight: null, // Missing
        height: '165',
        activityLevel: 'sedentary',
        primaryGoal: 'lose_weight',
        onboardingCompleted: true,
      });

      // User 3: missing height
      await db.insert(userSettings).values({
        userId: user3Id,
        dateOfBirth: new Date('1992-01-01'),
        gender: 'male',
        currentWeight: '75',
        height: null, // Missing
        activityLevel: 'lightly_active',
        primaryGoal: 'maintain',
        onboardingCompleted: true,
      });

      const result = await dailyMetricsRecomputeJob.run();

      expect(result.totalUsers).toBe(3);
      expect(result.successCount).toBe(1);
      expect(result.errorCount).toBe(0);
      expect(result.skippedCount).toBe(2);

      // Verify only user 1 has metrics
      const user1Metrics = await db
        .select()
        .from(profileMetrics)
        .where(eq(profileMetrics.userId, user1Id));

      expect(user1Metrics.length).toBe(1);
    });

    it('should continue processing other users if one fails', async () => {
      // User 1: complete data
      await db.insert(userSettings).values({
        userId: user1Id,
        dateOfBirth: new Date('1990-01-01'),
        gender: 'male',
        currentWeight: '80',
        height: '180',
        targetWeight: '75',
        activityLevel: 'moderately_active',
        primaryGoal: 'lose_weight',
        onboardingCompleted: true,
      });

      // User 2: complete data
      await db.insert(userSettings).values({
        userId: user2Id,
        dateOfBirth: new Date('1995-01-01'),
        gender: 'female',
        currentWeight: '65',
        height: '165',
        targetWeight: '60',
        activityLevel: 'sedentary',
        primaryGoal: 'lose_weight',
        onboardingCompleted: true,
      });

      // User 3: will fail (missing activity level)
      await db.insert(userSettings).values({
        userId: user3Id,
        dateOfBirth: new Date('1992-01-01'),
        gender: 'male',
        currentWeight: '75',
        height: '175',
        activityLevel: null, // Missing
        primaryGoal: 'maintain',
        onboardingCompleted: true,
      });

      const result = await dailyMetricsRecomputeJob.run();

      expect(result.totalUsers).toBe(3);
      expect(result.successCount).toBe(2); // Users 1 and 2 succeeded
      expect(result.errorCount).toBe(0);
      expect(result.skippedCount).toBe(1); // User 3 skipped

      // Verify users 1 and 2 have metrics
      const user1Metrics = await db
        .select()
        .from(profileMetrics)
        .where(eq(profileMetrics.userId, user1Id));

      const user2Metrics = await db
        .select()
        .from(profileMetrics)
        .where(eq(profileMetrics.userId, user2Id));

      expect(user1Metrics.length).toBe(1);
      expect(user2Metrics.length).toBe(1);
    });

    it('should log summary with total/success/error counts', async () => {
      // Create users with various states
      await db.insert(userSettings).values([
        {
          userId: user1Id,
          dateOfBirth: new Date('1990-01-01'),
          gender: 'male',
          currentWeight: '80',
          height: '180',
          activityLevel: 'moderately_active',
          primaryGoal: 'lose_weight',
          onboardingCompleted: true,
        },
        {
          userId: user2Id,
          dateOfBirth: new Date('1995-01-01'),
          gender: 'female',
          currentWeight: '65',
          height: '165',
          activityLevel: 'sedentary',
          primaryGoal: 'lose_weight',
          onboardingCompleted: true,
        },
        {
          userId: user3Id,
          dateOfBirth: new Date('1992-01-01'),
          gender: 'male',
          currentWeight: null, // Will be skipped
          height: '175',
          activityLevel: 'lightly_active',
          primaryGoal: 'maintain',
          onboardingCompleted: true,
        },
      ]);

      const result = await dailyMetricsRecomputeJob.run();

      expect(result).toHaveProperty('totalUsers');
      expect(result).toHaveProperty('successCount');
      expect(result).toHaveProperty('errorCount');
      expect(result).toHaveProperty('skippedCount');
      expect(result.totalUsers).toBe(3);
      expect(result.successCount).toBe(2);
      expect(result.errorCount).toBe(0);
      expect(result.skippedCount).toBe(1);
    });

    it('should update existing metrics (new row with todays date)', async () => {
      await db.insert(userSettings).values({
        userId: user1Id,
        dateOfBirth: new Date('1990-01-01'),
        gender: 'male',
        currentWeight: '80',
        height: '180',
        activityLevel: 'moderately_active',
        primaryGoal: 'lose_weight',
        onboardingCompleted: true,
      });

      // Run job first time
      await dailyMetricsRecomputeJob.run();

      const metricsAfterFirst = await db
        .select()
        .from(profileMetrics)
        .where(eq(profileMetrics.userId, user1Id));

      expect(metricsAfterFirst.length).toBe(1);

      // Update user weight
      await db
        .update(userSettings)
        .set({ currentWeight: '78' })
        .where(eq(userSettings.userId, user1Id));

      // Run job second time (force new computation)
      // First, delete today's metrics to simulate next day
      await db
        .delete(profileMetrics)
        .where(
          and(
            eq(profileMetrics.userId, user1Id),
            sql`${profileMetrics.computedAt}::date = CURRENT_DATE`
          )
        );

      await dailyMetricsRecomputeJob.run();

      const metricsAfterSecond = await db
        .select()
        .from(profileMetrics)
        .where(eq(profileMetrics.userId, user1Id));

      // Should have new metrics with updated weight
      expect(metricsAfterSecond.length).toBeGreaterThan(0);
    });

    it('should handle empty user set gracefully', async () => {
      // No users with completed onboarding
      const result = await dailyMetricsRecomputeJob.run();

      expect(result.totalUsers).toBe(0);
      expect(result.successCount).toBe(0);
      expect(result.errorCount).toBe(0);
      expect(result.skippedCount).toBe(0);
    });

    it('should process multiple users with different timezones', async () => {
      // Create users in different timezones
      await db.insert(userSettings).values([
        {
          userId: user1Id, // America/Los_Angeles
          dateOfBirth: new Date('1990-01-01'),
          gender: 'male',
          currentWeight: '80',
          height: '180',
          activityLevel: 'moderately_active',
          primaryGoal: 'lose_weight',
          onboardingCompleted: true,
        },
        {
          userId: user2Id, // America/New_York
          dateOfBirth: new Date('1995-01-01'),
          gender: 'female',
          currentWeight: '65',
          height: '165',
          activityLevel: 'sedentary',
          primaryGoal: 'lose_weight',
          onboardingCompleted: true,
        },
        {
          userId: user3Id, // Europe/London
          dateOfBirth: new Date('1992-01-01'),
          gender: 'male',
          currentWeight: '75',
          height: '175',
          activityLevel: 'lightly_active',
          primaryGoal: 'maintain',
          onboardingCompleted: true,
        },
        {
          userId: user4Id, // Asia/Tokyo
          dateOfBirth: new Date('1988-01-01'),
          gender: 'female',
          currentWeight: '58',
          height: '160',
          activityLevel: 'very_active',
          primaryGoal: 'gain_muscle',
          onboardingCompleted: true,
        },
      ]);

      const result = await dailyMetricsRecomputeJob.run();

      expect(result.totalUsers).toBe(4);
      expect(result.successCount).toBe(4);
      expect(result.errorCount).toBe(0);

      // Verify all users have metrics
      const allMetrics = await db.select().from(profileMetrics);
      expect(allMetrics.length).toBe(4);
    });

    it('should complete job within reasonable time', async () => {
      // Create 5 users
      await db.insert(userSettings).values([
        {
          userId: user1Id,
          dateOfBirth: new Date('1990-01-01'),
          gender: 'male',
          currentWeight: '80',
          height: '180',
          activityLevel: 'moderately_active',
          primaryGoal: 'lose_weight',
          onboardingCompleted: true,
        },
        {
          userId: user2Id,
          dateOfBirth: new Date('1995-01-01'),
          gender: 'female',
          currentWeight: '65',
          height: '165',
          activityLevel: 'sedentary',
          primaryGoal: 'lose_weight',
          onboardingCompleted: true,
        },
        {
          userId: user3Id,
          dateOfBirth: new Date('1992-01-01'),
          gender: 'male',
          currentWeight: '75',
          height: '175',
          activityLevel: 'lightly_active',
          primaryGoal: 'maintain',
          onboardingCompleted: true,
        },
        {
          userId: user4Id,
          dateOfBirth: new Date('1988-01-01'),
          gender: 'female',
          currentWeight: '58',
          height: '160',
          activityLevel: 'very_active',
          primaryGoal: 'gain_muscle',
          onboardingCompleted: true,
        },
      ]);

      const startTime = Date.now();
      await dailyMetricsRecomputeJob.run();
      const duration = Date.now() - startTime;

      // Should process 4 users in less than 2 seconds (target: ~50-100ms per user)
      expect(duration).toBeLessThan(2000);
    });

    it('should not recompute metrics if already computed today', async () => {
      await db.insert(userSettings).values({
        userId: user1Id,
        dateOfBirth: new Date('1990-01-01'),
        gender: 'male',
        currentWeight: '80',
        height: '180',
        activityLevel: 'moderately_active',
        primaryGoal: 'lose_weight',
        onboardingCompleted: true,
      });

      // Run job first time
      await dailyMetricsRecomputeJob.run();

      const metricsAfterFirst = await db
        .select()
        .from(profileMetrics)
        .where(eq(profileMetrics.userId, user1Id));

      expect(metricsAfterFirst.length).toBe(1);
      const firstId = metricsAfterFirst[0].id;

      // Run job second time (same day)
      await dailyMetricsRecomputeJob.run();

      const metricsAfterSecond = await db
        .select()
        .from(profileMetrics)
        .where(eq(profileMetrics.userId, user1Id));

      // Should still have same metrics (cached)
      expect(metricsAfterSecond.length).toBe(1);
      expect(metricsAfterSecond[0].id).toBe(firstId);
    });
  });

  describe('schedule() and stop()', () => {
    afterEach(() => {
      // Always stop after each test to avoid interference
      dailyMetricsRecomputeJob.stop();
    });

    it('should schedule the job successfully', () => {
      dailyMetricsRecomputeJob.schedule();
      const status = dailyMetricsRecomputeJob.getStatus();

      expect(status.isScheduled).toBe(true);
      expect(status.cronExpression).toBe('5 0 * * *');
    });

    it('should not schedule twice', () => {
      dailyMetricsRecomputeJob.schedule();
      dailyMetricsRecomputeJob.schedule(); // Second call

      const status = dailyMetricsRecomputeJob.getStatus();
      expect(status.isScheduled).toBe(true);
    });

    it('should stop the job successfully', () => {
      dailyMetricsRecomputeJob.schedule();
      dailyMetricsRecomputeJob.stop();

      const status = dailyMetricsRecomputeJob.getStatus();
      expect(status.isScheduled).toBe(false);
    });

    it('should handle stop when not scheduled', () => {
      dailyMetricsRecomputeJob.stop(); // Should not throw

      const status = dailyMetricsRecomputeJob.getStatus();
      expect(status.isScheduled).toBe(false);
    });
  });

  describe('getStatus()', () => {
    afterEach(() => {
      dailyMetricsRecomputeJob.stop();
    });

    it('should return correct status when not scheduled', () => {
      const status = dailyMetricsRecomputeJob.getStatus();

      expect(status.isScheduled).toBe(false);
      expect(status.cronExpression).toBe('5 0 * * *');
    });

    it('should return correct status when scheduled', () => {
      dailyMetricsRecomputeJob.schedule();
      const status = dailyMetricsRecomputeJob.getStatus();

      expect(status.isScheduled).toBe(true);
      expect(status.cronExpression).toBe('5 0 * * *');
    });
  });

  describe('Edge Cases', () => {
    it('should handle user with missing dateOfBirth', async () => {
      await db.insert(userSettings).values({
        userId: user1Id,
        dateOfBirth: null, // Missing
        gender: 'male',
        currentWeight: '80',
        height: '180',
        activityLevel: 'moderately_active',
        primaryGoal: 'lose_weight',
        onboardingCompleted: true,
      });

      const result = await dailyMetricsRecomputeJob.run();

      expect(result.totalUsers).toBe(1);
      expect(result.successCount).toBe(0);
      expect(result.skippedCount).toBe(1);
    });

    it('should handle user with missing gender', async () => {
      await db.insert(userSettings).values({
        userId: user1Id,
        dateOfBirth: new Date('1990-01-01'),
        gender: null, // Missing
        currentWeight: '80',
        height: '180',
        activityLevel: 'moderately_active',
        primaryGoal: 'lose_weight',
        onboardingCompleted: true,
      });

      const result = await dailyMetricsRecomputeJob.run();

      expect(result.totalUsers).toBe(1);
      expect(result.successCount).toBe(0);
      expect(result.skippedCount).toBe(1);
    });

    it('should handle user with zero weight', async () => {
      await db.insert(userSettings).values({
        userId: user1Id,
        dateOfBirth: new Date('1990-01-01'),
        gender: 'male',
        currentWeight: '0', // Invalid
        height: '180',
        activityLevel: 'moderately_active',
        primaryGoal: 'lose_weight',
        onboardingCompleted: true,
      });

      const result = await dailyMetricsRecomputeJob.run();

      expect(result.totalUsers).toBe(1);
      expect(result.successCount).toBe(0);
      expect(result.skippedCount).toBe(1);
    });

    it('should handle user with zero height', async () => {
      await db.insert(userSettings).values({
        userId: user1Id,
        dateOfBirth: new Date('1990-01-01'),
        gender: 'male',
        currentWeight: '80',
        height: '0', // Invalid
        activityLevel: 'moderately_active',
        primaryGoal: 'lose_weight',
        onboardingCompleted: true,
      });

      const result = await dailyMetricsRecomputeJob.run();

      expect(result.totalUsers).toBe(1);
      expect(result.successCount).toBe(0);
      expect(result.skippedCount).toBe(1);
    });

    it('should handle very large user dataset efficiently', async () => {
      // Create settings for multiple users
      const settingsData = [];
      for (let i = 0; i < 10; i++) {
        settingsData.push({
          userId: i === 0 ? user1Id : i === 1 ? user2Id : i === 2 ? user3Id : user4Id,
          dateOfBirth: new Date('1990-01-01'),
          gender: 'male' as const,
          currentWeight: '80',
          height: '180',
          activityLevel: 'moderately_active' as const,
          primaryGoal: 'lose_weight' as const,
          onboardingCompleted: true,
        });
      }

      await db.insert(userSettings).values(settingsData.slice(0, 4)); // Only insert for our 4 test users

      const startTime = Date.now();
      const result = await dailyMetricsRecomputeJob.run();
      const duration = Date.now() - startTime;

      expect(result.totalUsers).toBeGreaterThan(0);
      expect(duration).toBeLessThan(2000); // Should complete reasonably fast
    });
  });
});
