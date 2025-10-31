import { metricsService } from './metrics';
import { db } from '../db/connection';
import { users, userSettings, profileMetrics, metricsAcknowledgements } from '../db/schema';
import { eq, and } from 'drizzle-orm';
import { AppError } from '../middleware/error';

describe('MetricsService', () => {
  let testUserId: number;
  let testUser2Id: number;

  // Generate unique emails with timestamps to prevent duplicate key violations
  const testEmail1 = `metrics-test-1-${Date.now()}@example.com`;
  const testEmail2 = `metrics-test-2-${Date.now()}@example.com`;

  beforeAll(async () => {
    // Create test users
    const [user1] = await db
      .insert(users)
      .values({
        email: testEmail1,
        name: 'Metrics Test User 1',
      })
      .returning();

    const [user2] = await db
      .insert(users)
      .values({
        email: testEmail2,
        name: 'Metrics Test User 2',
      })
      .returning();

    testUserId = user1.id;
    testUser2Id = user2.id;
  });

  afterAll(async () => {
    // Cleanup
    await db.delete(metricsAcknowledgements).where(eq(metricsAcknowledgements.userId, testUserId));
    await db
      .delete(metricsAcknowledgements)
      .where(eq(metricsAcknowledgements.userId, testUser2Id));
    await db.delete(profileMetrics).where(eq(profileMetrics.userId, testUserId));
    await db.delete(profileMetrics).where(eq(profileMetrics.userId, testUser2Id));
    await db.delete(userSettings).where(eq(userSettings.userId, testUserId));
    await db.delete(userSettings).where(eq(userSettings.userId, testUser2Id));
    await db.delete(users).where(eq(users.id, testUserId));
    await db.delete(users).where(eq(users.id, testUser2Id));
  });

  beforeEach(async () => {
    // Clean up metrics and acknowledgements before each test
    await db.delete(metricsAcknowledgements).where(eq(metricsAcknowledgements.userId, testUserId));
    await db
      .delete(metricsAcknowledgements)
      .where(eq(metricsAcknowledgements.userId, testUser2Id));
    await db.delete(profileMetrics).where(eq(profileMetrics.userId, testUserId));
    await db.delete(profileMetrics).where(eq(profileMetrics.userId, testUser2Id));
    await db.delete(userSettings).where(eq(userSettings.userId, testUserId));
    await db.delete(userSettings).where(eq(userSettings.userId, testUser2Id));
  });

  describe('calculateBMI', () => {
    it('should calculate BMI correctly with standard values', () => {
      // Test case: 80kg, 180cm
      // Expected: 80 / (1.8)^2 = 80 / 3.24 = 24.69
      const bmi = metricsService.calculateBMI(80, 180);
      expect(bmi).toBe(24.69);
    });

    it('should calculate BMI correctly for underweight classification', () => {
      // Test case: 50kg, 175cm
      // Expected: 50 / (1.75)^2 = 50 / 3.0625 = 16.33 (underweight)
      const bmi = metricsService.calculateBMI(50, 175);
      expect(bmi).toBe(16.33);
    });

    it('should calculate BMI correctly for overweight classification', () => {
      // Test case: 90kg, 170cm
      // Expected: 90 / (1.7)^2 = 90 / 2.89 = 31.14 (obese)
      const bmi = metricsService.calculateBMI(90, 170);
      expect(bmi).toBe(31.14);
    });

    it('should round BMI to 2 decimal places', () => {
      const bmi = metricsService.calculateBMI(72.5, 172.5);
      expect(bmi).toBe(24.36);
      expect(bmi.toString().split('.')[1]?.length || 0).toBeLessThanOrEqual(2);
    });

    it('should handle very tall users (edge case)', () => {
      // Test case: 100kg, 250cm (very tall)
      // Expected: 100 / (2.5)^2 = 100 / 6.25 = 16.00
      const bmi = metricsService.calculateBMI(100, 250);
      expect(bmi).toBe(16.0);
    });

    it('should handle very short users (edge case)', () => {
      // Test case: 30kg, 100cm (very short)
      // Expected: 30 / (1.0)^2 = 30
      const bmi = metricsService.calculateBMI(30, 100);
      expect(bmi).toBe(30.0);
    });

    it('should handle very heavy users (edge case)', () => {
      // Test case: 300kg, 200cm
      // Expected: 300 / (2.0)^2 = 300 / 4 = 75
      const bmi = metricsService.calculateBMI(300, 200);
      expect(bmi).toBe(75.0);
    });

    it('should handle very light users (edge case)', () => {
      // Test case: 30kg, 150cm
      // Expected: 30 / (1.5)^2 = 30 / 2.25 = 13.33
      const bmi = metricsService.calculateBMI(30, 150);
      expect(bmi).toBe(13.33);
    });
  });

  describe('computeAndStoreMetrics', () => {
    beforeEach(async () => {
      // Create complete user settings for test user
      await db.insert(userSettings).values({
        userId: testUserId,
        dateOfBirth: new Date('1990-01-01'), // ~35 years old
        gender: 'male',
        currentWeight: '80',
        height: '180',
        targetWeight: '75',
        activityLevel: 'moderately_active',
        primaryGoal: 'lose_weight',
        onboardingCompleted: true,
      });
    });

    it('should compute and store metrics for valid user with complete settings', async () => {
      const metrics = await metricsService.computeAndStoreMetrics(testUserId, false);

      expect(metrics).toBeDefined();
      expect(metrics.userId).toBe(testUserId);
      expect(parseFloat(metrics.bmi)).toBeCloseTo(24.69, 2);
      expect(metrics.bmr).toBeGreaterThan(1700);
      expect(metrics.bmr).toBeLessThan(1900);
      expect(metrics.tdee).toBeGreaterThan(2500);
      expect(metrics.tdee).toBeLessThan(2800);
      expect(metrics.version).toBe(1);
      expect(metrics.computedAt).toBeInstanceOf(Date);
    });

    it('should return cached metrics when called twice same day', async () => {
      const metrics1 = await metricsService.computeAndStoreMetrics(testUserId, false);
      const metrics2 = await metricsService.computeAndStoreMetrics(testUserId, false);

      expect(metrics1.id).toBe(metrics2.id);
      expect(metrics1.computedAt).toBeDefined();
      expect(metrics2.computedAt).toBeDefined();
      expect(metrics1.computedAt!.getTime()).toBe(metrics2.computedAt!.getTime());
    });

    it('should force recompute when forceRecompute=true', async () => {
      const metrics1 = await metricsService.computeAndStoreMetrics(testUserId, false);

      // Wait a tiny bit to ensure different timestamps
      await new Promise((resolve) => setTimeout(resolve, 10));

      const metrics2 = await metricsService.computeAndStoreMetrics(testUserId, true);

      expect(metrics1.id).not.toBe(metrics2.id);
      expect(metrics1.computedAt).toBeDefined();
      expect(metrics2.computedAt).toBeDefined();
      expect(metrics2.computedAt!.getTime()).toBeGreaterThanOrEqual(metrics1.computedAt!.getTime());
    });

    it('should throw error for user without settings', async () => {
      await expect(metricsService.computeAndStoreMetrics(testUser2Id, false)).rejects.toThrow(
        AppError
      );

      try {
        await metricsService.computeAndStoreMetrics(testUser2Id, false);
      } catch (error) {
        expect(error).toBeInstanceOf(AppError);
        expect((error as AppError).statusCode).toBe(404);
        expect((error as AppError).message).toContain('User settings not found');
      }
    });

    it('should throw error for missing height', async () => {
      await db.insert(userSettings).values({
        userId: testUser2Id,
        dateOfBirth: new Date('1990-01-01'),
        gender: 'male',
        currentWeight: '80',
        height: null, // Missing height
        activityLevel: 'moderately_active',
        primaryGoal: 'lose_weight',
        onboardingCompleted: true,
      });

      await expect(metricsService.computeAndStoreMetrics(testUser2Id, false)).rejects.toThrow(
        AppError
      );

      try {
        await metricsService.computeAndStoreMetrics(testUser2Id, false);
      } catch (error) {
        expect(error).toBeInstanceOf(AppError);
        expect((error as AppError).statusCode).toBe(400);
        expect((error as AppError).message).toContain('User settings incomplete');
      }
    });

    it('should throw error for missing weight', async () => {
      await db.insert(userSettings).values({
        userId: testUser2Id,
        dateOfBirth: new Date('1990-01-01'),
        gender: 'male',
        currentWeight: null, // Missing weight
        height: '180',
        activityLevel: 'moderately_active',
        primaryGoal: 'lose_weight',
        onboardingCompleted: true,
      });

      await expect(metricsService.computeAndStoreMetrics(testUser2Id, false)).rejects.toThrow(
        AppError
      );

      try {
        await metricsService.computeAndStoreMetrics(testUser2Id, false);
      } catch (error) {
        expect(error).toBeInstanceOf(AppError);
        expect((error as AppError).statusCode).toBe(400);
        expect((error as AppError).message).toContain('User settings incomplete');
      }
    });

    it('should throw error for height = 0', async () => {
      await db.insert(userSettings).values({
        userId: testUser2Id,
        dateOfBirth: new Date('1990-01-01'),
        gender: 'male',
        currentWeight: '80',
        height: '0', // Invalid height
        activityLevel: 'moderately_active',
        primaryGoal: 'lose_weight',
        onboardingCompleted: true,
      });

      await expect(metricsService.computeAndStoreMetrics(testUser2Id, false)).rejects.toThrow(
        AppError
      );

      try {
        await metricsService.computeAndStoreMetrics(testUser2Id, false);
      } catch (error) {
        expect(error).toBeInstanceOf(AppError);
        expect((error as AppError).statusCode).toBe(400);
        expect((error as AppError).message).toContain('User settings incomplete');
      }
    });

    it('should throw error for weight = 0', async () => {
      await db.insert(userSettings).values({
        userId: testUser2Id,
        dateOfBirth: new Date('1990-01-01'),
        gender: 'male',
        currentWeight: '0', // Invalid weight
        height: '180',
        activityLevel: 'moderately_active',
        primaryGoal: 'lose_weight',
        onboardingCompleted: true,
      });

      await expect(metricsService.computeAndStoreMetrics(testUser2Id, false)).rejects.toThrow(
        AppError
      );

      try {
        await metricsService.computeAndStoreMetrics(testUser2Id, false);
      } catch (error) {
        expect(error).toBeInstanceOf(AppError);
        expect((error as AppError).statusCode).toBe(400);
        expect((error as AppError).message).toContain('User settings incomplete');
      }
    });

    it('should handle user completes onboarding and immediately requests metrics', async () => {
      // Simulate fresh user completing onboarding
      await db.delete(profileMetrics).where(eq(profileMetrics.userId, testUserId));

      const metrics = await metricsService.computeAndStoreMetrics(testUserId, false);

      expect(metrics).toBeDefined();
      expect(metrics.userId).toBe(testUserId);
      expect(metrics.computedAt).toBeInstanceOf(Date);
    });

    it('should handle very tall user edge case (250cm)', async () => {
      await db
        .update(userSettings)
        .set({ height: '250', currentWeight: '100' })
        .where(eq(userSettings.userId, testUserId));

      const metrics = await metricsService.computeAndStoreMetrics(testUserId, true);

      expect(metrics).toBeDefined();
      expect(parseFloat(metrics.bmi)).toBe(16.0);
    });

    it('should handle very short user edge case (100cm)', async () => {
      await db
        .update(userSettings)
        .set({ height: '100', currentWeight: '30' })
        .where(eq(userSettings.userId, testUserId));

      const metrics = await metricsService.computeAndStoreMetrics(testUserId, true);

      expect(metrics).toBeDefined();
      expect(parseFloat(metrics.bmi)).toBe(30.0);
    });

    it('should handle very heavy user edge case (300kg)', async () => {
      await db
        .update(userSettings)
        .set({ height: '200', currentWeight: '300' })
        .where(eq(userSettings.userId, testUserId));

      const metrics = await metricsService.computeAndStoreMetrics(testUserId, true);

      expect(metrics).toBeDefined();
      expect(parseFloat(metrics.bmi)).toBe(75.0);
    });

    it('should handle very light user edge case (30kg)', async () => {
      await db
        .update(userSettings)
        .set({ height: '150', currentWeight: '30' })
        .where(eq(userSettings.userId, testUserId));

      const metrics = await metricsService.computeAndStoreMetrics(testUserId, true);

      expect(metrics).toBeDefined();
      expect(parseFloat(metrics.bmi)).toBe(13.33);
    });

    it('should compute BMI classification correctly for underweight', async () => {
      await db
        .update(userSettings)
        .set({ height: '180', currentWeight: '55' })
        .where(eq(userSettings.userId, testUserId));

      const metrics = await metricsService.computeAndStoreMetrics(testUserId, true);
      const bmi = parseFloat(metrics.bmi);

      expect(bmi).toBeLessThan(18.5); // underweight
    });

    it('should compute BMI classification correctly for normal weight', async () => {
      await db
        .update(userSettings)
        .set({ height: '180', currentWeight: '75' })
        .where(eq(userSettings.userId, testUserId));

      const metrics = await metricsService.computeAndStoreMetrics(testUserId, true);
      const bmi = parseFloat(metrics.bmi);

      expect(bmi).toBeGreaterThanOrEqual(18.5);
      expect(bmi).toBeLessThan(25);
    });

    it('should compute BMI classification correctly for overweight', async () => {
      await db
        .update(userSettings)
        .set({ height: '180', currentWeight: '85' })
        .where(eq(userSettings.userId, testUserId));

      const metrics = await metricsService.computeAndStoreMetrics(testUserId, true);
      const bmi = parseFloat(metrics.bmi);

      expect(bmi).toBeGreaterThanOrEqual(25);
      expect(bmi).toBeLessThan(30);
    });

    it('should compute BMI classification correctly for obese', async () => {
      await db
        .update(userSettings)
        .set({ height: '180', currentWeight: '100' })
        .where(eq(userSettings.userId, testUserId));

      const metrics = await metricsService.computeAndStoreMetrics(testUserId, true);
      const bmi = parseFloat(metrics.bmi);

      expect(bmi).toBeGreaterThanOrEqual(30);
    });
  });

  describe('getTodayMetrics', () => {
    beforeEach(async () => {
      await db.insert(userSettings).values({
        userId: testUserId,
        dateOfBirth: new Date('1990-01-01'),
        gender: 'male',
        currentWeight: '80',
        height: '180',
        targetWeight: '75',
        activityLevel: 'moderately_active',
        primaryGoal: 'lose_weight',
        onboardingCompleted: true,
      });
    });

    it('should return metrics with explanations', async () => {
      await metricsService.computeAndStoreMetrics(testUserId, false);

      const todayMetrics = await metricsService.getTodayMetrics(testUserId);

      expect(todayMetrics).toBeDefined();
      expect(todayMetrics.metrics.bmi).toBeCloseTo(24.69, 2);
      expect(todayMetrics.metrics.bmr).toBeGreaterThan(1700);
      expect(todayMetrics.metrics.tdee).toBeGreaterThan(2500);
      expect(todayMetrics.explanations).toBeDefined();
      expect(todayMetrics.explanations.bmi).toContain('BMI');
      expect(todayMetrics.explanations.bmi).toContain('24.69');
      expect(todayMetrics.explanations.bmr).toContain('BMR');
      expect(todayMetrics.explanations.tdee).toContain('TDEE');
      expect(todayMetrics.metrics.computedAt).toBeDefined();
      expect(todayMetrics.acknowledged).toBe(false);
    });

    it('should include acknowledgement when user has acknowledged', async () => {
      const metrics = await metricsService.computeAndStoreMetrics(testUserId, false);

      await metricsService.acknowledgeMetrics(testUserId, metrics.version!, metrics.computedAt!);

      const todayMetrics = await metricsService.getTodayMetrics(testUserId);

      expect(todayMetrics.acknowledged).toBe(true);
    });

    it('should show acknowledged=false when not yet acknowledged', async () => {
      await metricsService.computeAndStoreMetrics(testUserId, false);

      const todayMetrics = await metricsService.getTodayMetrics(testUserId);

      expect(todayMetrics.acknowledged).toBe(false);
    });

    it('should throw error when no metrics exist and user settings missing', async () => {
      // Delete user settings so auto-compute will fail
      await db.delete(userSettings).where(eq(userSettings.userId, testUserId));

      await expect(metricsService.getTodayMetrics(testUserId)).rejects.toThrow(AppError);

      try {
        await metricsService.getTodayMetrics(testUserId);
      } catch (error) {
        expect(error).toBeInstanceOf(AppError);
        expect((error as AppError).statusCode).toBe(404);
        expect((error as AppError).message).toContain('No metrics');
      }
    });

    it('should complete within p95 target (200ms)', async () => {
      await metricsService.computeAndStoreMetrics(testUserId, false);

      const startTime = performance.now();
      await metricsService.getTodayMetrics(testUserId);
      const duration = performance.now() - startTime;

      expect(duration).toBeLessThan(200);
    });

    it('should include correct BMI category explanation for underweight', async () => {
      await db
        .update(userSettings)
        .set({ height: '180', currentWeight: '55' })
        .where(eq(userSettings.userId, testUserId));

      await metricsService.computeAndStoreMetrics(testUserId, true);
      const todayMetrics = await metricsService.getTodayMetrics(testUserId);

      expect(todayMetrics.explanations.bmi).toContain('underweight');
    });

    it('should include correct BMI category explanation for normal weight', async () => {
      await db
        .update(userSettings)
        .set({ height: '180', currentWeight: '75' })
        .where(eq(userSettings.userId, testUserId));

      await metricsService.computeAndStoreMetrics(testUserId, true);
      const todayMetrics = await metricsService.getTodayMetrics(testUserId);

      expect(todayMetrics.explanations.bmi).toContain('normal weight');
    });

    it('should include correct BMI category explanation for overweight', async () => {
      await db
        .update(userSettings)
        .set({ height: '180', currentWeight: '85' })
        .where(eq(userSettings.userId, testUserId));

      await metricsService.computeAndStoreMetrics(testUserId, true);
      const todayMetrics = await metricsService.getTodayMetrics(testUserId);

      expect(todayMetrics.explanations.bmi).toContain('overweight');
    });

    it('should include correct BMI category explanation for obese', async () => {
      await db
        .update(userSettings)
        .set({ height: '180', currentWeight: '100' })
        .where(eq(userSettings.userId, testUserId));

      await metricsService.computeAndStoreMetrics(testUserId, true);
      const todayMetrics = await metricsService.getTodayMetrics(testUserId);

      expect(todayMetrics.explanations.bmi).toContain('obese');
    });
  });

  describe('acknowledgeMetrics', () => {
    let metricsComputedAt: Date;
    let metricsVersion: number;

    beforeEach(async () => {
      await db.insert(userSettings).values({
        userId: testUserId,
        dateOfBirth: new Date('1990-01-01'),
        gender: 'male',
        currentWeight: '80',
        height: '180',
        targetWeight: '75',
        activityLevel: 'moderately_active',
        primaryGoal: 'lose_weight',
        onboardingCompleted: true,
      });

      const metrics = await metricsService.computeAndStoreMetrics(testUserId, false);
      metricsComputedAt = metrics.computedAt!;
      metricsVersion = metrics.version!;
    });

    it('should create acknowledgement successfully', async () => {
      const result = await metricsService.acknowledgeMetrics(
        testUserId,
        metricsVersion,
        metricsComputedAt
      );

      expect(result.success).toBe(true);
      expect(result.acknowledgedAt).toBeDefined();
      expect(new Date(result.acknowledgedAt)).toBeInstanceOf(Date);
    });

    it('should be idempotent (can call multiple times)', async () => {
      const result1 = await metricsService.acknowledgeMetrics(
        testUserId,
        metricsVersion,
        metricsComputedAt
      );

      const result2 = await metricsService.acknowledgeMetrics(
        testUserId,
        metricsVersion,
        metricsComputedAt
      );

      expect(result1.success).toBe(true);
      expect(result2.success).toBe(true);
      expect(result1.acknowledgedAt).toBe(result2.acknowledgedAt);
    });

    it('should throw error when version mismatch', async () => {
      const wrongVersion = 99;

      await expect(
        metricsService.acknowledgeMetrics(testUserId, wrongVersion, metricsComputedAt)
      ).rejects.toThrow(AppError);

      try {
        await metricsService.acknowledgeMetrics(testUserId, wrongVersion, metricsComputedAt);
      } catch (error) {
        expect(error).toBeInstanceOf(AppError);
        expect((error as AppError).statusCode).toBe(404);
        expect((error as AppError).message).toContain('Metrics not found');
      }
    });

    it('should throw error when metricsComputedAt does not match', async () => {
      const wrongDate = new Date('2023-01-01');

      await expect(
        metricsService.acknowledgeMetrics(testUserId, metricsVersion, wrongDate)
      ).rejects.toThrow(AppError);

      try {
        await metricsService.acknowledgeMetrics(testUserId, metricsVersion, wrongDate);
      } catch (error) {
        expect(error).toBeInstanceOf(AppError);
        expect((error as AppError).statusCode).toBe(404);
        expect((error as AppError).message).toContain('Metrics not found');
      }
    });

    it('should handle concurrent acknowledgements (race condition test)', async () => {
      // Simulate concurrent requests
      const promises = [
        metricsService.acknowledgeMetrics(testUserId, metricsVersion, metricsComputedAt),
        metricsService.acknowledgeMetrics(testUserId, metricsVersion, metricsComputedAt),
        metricsService.acknowledgeMetrics(testUserId, metricsVersion, metricsComputedAt),
      ];

      const results = await Promise.all(promises);

      // All should succeed (idempotent)
      expect(results.every((r) => r.success)).toBe(true);

      // All should have same acknowledged timestamp
      expect(results[0].acknowledgedAt).toBe(results[1].acknowledgedAt);
      expect(results[1].acknowledgedAt).toBe(results[2].acknowledgedAt);

      // Verify only one acknowledgement record exists
      const acknowledgements = await db
        .select()
        .from(metricsAcknowledgements)
        .where(eq(metricsAcknowledgements.userId, testUserId));

      expect(acknowledgements.length).toBe(1);
    });

    it('should store acknowledgement with correct timestamp', async () => {
      const beforeAck = new Date();
      const result = await metricsService.acknowledgeMetrics(
        testUserId,
        metricsVersion,
        metricsComputedAt
      );
      const afterAck = new Date();

      const acknowledgedAt = new Date(result.acknowledgedAt);
      expect(acknowledgedAt.getTime()).toBeGreaterThanOrEqual(beforeAck.getTime());
      expect(acknowledgedAt.getTime()).toBeLessThanOrEqual(afterAck.getTime());
    });

    it('should link acknowledgement to correct metrics', async () => {
      await metricsService.acknowledgeMetrics(testUserId, metricsVersion, metricsComputedAt);

      const [acknowledgement] = await db
        .select()
        .from(metricsAcknowledgements)
        .where(
          and(
            eq(metricsAcknowledgements.userId, testUserId),
            eq(metricsAcknowledgements.metricsComputedAt, metricsComputedAt)
          )
        );

      expect(acknowledgement).toBeDefined();
      expect(acknowledgement.userId).toBe(testUserId);
      expect(acknowledgement.version).toBe(metricsVersion);
      expect(acknowledgement.metricsComputedAt.getTime()).toBe(metricsComputedAt.getTime());
    });
  });

  describe('Performance Tests', () => {
    beforeEach(async () => {
      await db.insert(userSettings).values({
        userId: testUserId,
        dateOfBirth: new Date('1990-01-01'),
        gender: 'male',
        currentWeight: '80',
        height: '180',
        targetWeight: '75',
        activityLevel: 'moderately_active',
        primaryGoal: 'lose_weight',
        onboardingCompleted: true,
      });
    });

    it('should compute and store metrics within reasonable time', async () => {
      const startTime = performance.now();
      await metricsService.computeAndStoreMetrics(testUserId, false);
      const duration = performance.now() - startTime;

      // Should complete in less than 500ms
      expect(duration).toBeLessThan(500);
    });

    it('should retrieve today metrics within p95 target', async () => {
      await metricsService.computeAndStoreMetrics(testUserId, false);

      const startTime = performance.now();
      await metricsService.getTodayMetrics(testUserId);
      const duration = performance.now() - startTime;

      // p95 target is 200ms
      expect(duration).toBeLessThan(200);
    });

    it('should acknowledge metrics within reasonable time', async () => {
      const metrics = await metricsService.computeAndStoreMetrics(testUserId, false);

      const startTime = performance.now();
      await metricsService.acknowledgeMetrics(testUserId, metrics.version!, metrics.computedAt!);
      const duration = performance.now() - startTime;

      // Should complete in less than 300ms
      expect(duration).toBeLessThan(300);
    });
  });

  describe('BMI Formula Validation', () => {
    it('should use correct BMI formula: weight_kg / (height_m)^2', () => {
      const weight = 80; // kg
      const height = 180; // cm
      const heightM = height / 100; // 1.8m
      const expectedBmi = weight / (heightM * heightM); // 24.691...

      const actualBmi = metricsService.calculateBMI(weight, height);

      expect(actualBmi).toBeCloseTo(expectedBmi, 2);
      expect(actualBmi).toBe(24.69);
    });

    it('should validate BMI ranges correctly', () => {
      // Underweight: BMI < 18.5
      expect(metricsService.calculateBMI(50, 175)).toBeLessThan(18.5);

      // Normal: 18.5 <= BMI < 25
      const normalBmi = metricsService.calculateBMI(70, 175);
      expect(normalBmi).toBeGreaterThanOrEqual(18.5);
      expect(normalBmi).toBeLessThan(25);

      // Overweight: 25 <= BMI < 30
      const overweightBmi = metricsService.calculateBMI(80, 175);
      expect(overweightBmi).toBeGreaterThanOrEqual(25);
      expect(overweightBmi).toBeLessThan(30);

      // Obese: BMI >= 30
      expect(metricsService.calculateBMI(95, 175)).toBeGreaterThanOrEqual(30);
    });
  });
});
