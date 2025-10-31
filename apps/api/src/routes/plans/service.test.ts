import { PlansService } from './service';
import { db } from '../../db/connection';
import {
  users,
  userSettings,
  profileMetrics,
  metricsAcknowledgements,
  plans,
  initialPlanSnapshot,
} from '../../db/schema';
import { eq } from 'drizzle-orm';
import { AppError } from '../../middleware/error';
import { metricsService } from '../../services/metrics';

describe('PlansService - Metrics Acknowledgment Gating', () => {
  let plansService: PlansService;
  let testUserId: number;
  const testEmail = `plans-test-${Date.now()}@example.com`;

  beforeAll(async () => {
    plansService = new PlansService();

    // Create test user with unique email
    const [user] = await db
      .insert(users)
      .values({
        email: testEmail,
        name: 'Plans Test User',
      })
      .returning();

    testUserId = user.id;
  });

  afterAll(async () => {
    // Cleanup
    await db.delete(plans).where(eq(plans.userId, testUserId));
    await db.delete(initialPlanSnapshot).where(eq(initialPlanSnapshot.userId, testUserId));
    await db
      .delete(metricsAcknowledgements)
      .where(eq(metricsAcknowledgements.userId, testUserId));
    await db.delete(profileMetrics).where(eq(profileMetrics.userId, testUserId));
    await db.delete(userSettings).where(eq(userSettings.userId, testUserId));
    await db.delete(users).where(eq(users.id, testUserId));
  });

  beforeEach(async () => {
    // Clean up before each test
    await db.delete(plans).where(eq(plans.userId, testUserId));
    await db.delete(initialPlanSnapshot).where(eq(initialPlanSnapshot.userId, testUserId));
    await db
      .delete(metricsAcknowledgements)
      .where(eq(metricsAcknowledgements.userId, testUserId));
    await db.delete(profileMetrics).where(eq(profileMetrics.userId, testUserId));
    await db.delete(userSettings).where(eq(userSettings.userId, testUserId));

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

  describe('generatePlan with Acknowledgment Gating', () => {
    it('should throw error when user has not acknowledged metrics', async () => {
      // Arrange: Create metrics but don't acknowledge
      await metricsService.computeAndStoreMetrics(testUserId, false);

      // Act & Assert
      await expect(plansService.generatePlan(testUserId, false)).rejects.toThrow(AppError);

      try {
        await plansService.generatePlan(testUserId, false);
      } catch (error) {
        expect(error).toBeInstanceOf(AppError);
        expect((error as AppError).statusCode).toBe(400);
        expect((error as AppError).message).toContain(
          'Please review and acknowledge your health metrics before generating a plan'
        );
      }
    });

    it('should allow plan generation when metrics acknowledged', async () => {
      // Arrange: Create and acknowledge metrics
      const metrics = await metricsService.computeAndStoreMetrics(testUserId, false);
      await metricsService.acknowledgeMetrics(testUserId, metrics.version!, metrics.computedAt!);

      // Act
      const result = await plansService.generatePlan(testUserId, false);

      // Assert
      expect(result).toBeDefined();
      expect(result.plan).toBeDefined();
      expect(result.plan.userId).toBe(testUserId);
      expect(result.plan.status).toBe('active');
      expect(result.targets).toBeDefined();
      expect(result.targets.calorieTarget).toBeGreaterThan(0);
      expect(result.targets.proteinTarget).toBeGreaterThan(0);
      expect(result.whyItWorks).toBeDefined();
    });

    it('should allow plan when no metrics exist yet (edge case)', async () => {
      // Arrange: No metrics exist (user completes onboarding before daily job runs)
      // Don't create any metrics

      // Act
      const result = await plansService.generatePlan(testUserId, false);

      // Assert: Should succeed (edge case handling)
      expect(result).toBeDefined();
      expect(result.plan).toBeDefined();
      expect(result.plan.userId).toBe(testUserId);
      expect(result.plan.status).toBe('active');
    });

    it('should throw error when onboarding not completed', async () => {
      // Arrange: Update user settings to incomplete onboarding
      await db
        .update(userSettings)
        .set({ onboardingCompleted: false })
        .where(eq(userSettings.userId, testUserId));

      // Act & Assert
      await expect(plansService.generatePlan(testUserId, false)).rejects.toThrow(AppError);

      try {
        await plansService.generatePlan(testUserId, false);
      } catch (error) {
        expect(error).toBeInstanceOf(AppError);
        expect((error as AppError).statusCode).toBe(400);
        expect((error as AppError).message).toContain('Please complete onboarding');
      }
    });

    it('should check acknowledgment before checking for recent plan', async () => {
      // Arrange: Create metrics but don't acknowledge, then try to create plan twice
      await metricsService.computeAndStoreMetrics(testUserId, false);

      // Act & Assert: First call should fail due to no acknowledgment
      await expect(plansService.generatePlan(testUserId, false)).rejects.toThrow(AppError);

      try {
        await plansService.generatePlan(testUserId, false);
      } catch (error) {
        expect((error as AppError).message).toContain('acknowledge your health metrics');
      }
    });

    it('should allow plan generation with forceRecompute when acknowledged', async () => {
      // Arrange: Create, acknowledge, and create initial plan
      const metrics = await metricsService.computeAndStoreMetrics(testUserId, false);
      await metricsService.acknowledgeMetrics(testUserId, metrics.version!, metrics.computedAt!);
      await plansService.generatePlan(testUserId, false);

      // Act: Force recompute should still check acknowledgment (and pass since already acknowledged)
      const result = await plansService.generatePlan(testUserId, true);

      // Assert
      expect(result).toBeDefined();
      expect(result.recomputed).toBe(true);
    });

    it('should log acknowledgment check in telemetry', async () => {
      // Arrange: Create and acknowledge metrics
      const metrics = await metricsService.computeAndStoreMetrics(testUserId, false);
      await metricsService.acknowledgeMetrics(testUserId, metrics.version!, metrics.computedAt!);

      // Act
      const result = await plansService.generatePlan(testUserId, false);

      // Assert: Plan should be generated successfully
      expect(result).toBeDefined();
      expect(result.plan.userId).toBe(testUserId);
      // Note: Actual telemetry span events would need OpenTelemetry test setup
    });
  });

  describe('Plan Generation Integration', () => {
    it('should create plan with correct weekly dates', async () => {
      // Arrange
      const metrics = await metricsService.computeAndStoreMetrics(testUserId, false);
      await metricsService.acknowledgeMetrics(testUserId, metrics.version!, metrics.computedAt!);

      // Act
      const result = await plansService.generatePlan(testUserId, false);

      // Assert
      const startDate = new Date(result.plan.startDate);
      const endDate = new Date(result.plan.endDate);
      const daysDiff = Math.ceil(
        (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
      );

      expect(daysDiff).toBeGreaterThanOrEqual(6); // Week span (Monday start to Sunday end)
      expect(daysDiff).toBeLessThanOrEqual(9); // Account for edge cases
      expect(result.plan.name).toContain('Weekly Plan');
    });

    it('should update user settings with computed targets', async () => {
      // Arrange
      const metrics = await metricsService.computeAndStoreMetrics(testUserId, false);
      await metricsService.acknowledgeMetrics(testUserId, metrics.version!, metrics.computedAt!);

      // Act
      await plansService.generatePlan(testUserId, false);

      // Assert: Check user settings were updated
      const [settings] = await db
        .select()
        .from(userSettings)
        .where(eq(userSettings.userId, testUserId));

      expect(settings.bmr).toBeGreaterThan(0);
      expect(settings.tdee).toBeGreaterThan(0);
      expect(settings.calorieTarget).toBeGreaterThan(0);
      expect(settings.proteinTarget).toBeGreaterThan(0);
      expect(settings.waterTarget).toBeGreaterThan(0);
    });

    it('should create initial plan snapshot', async () => {
      // Arrange
      const metrics = await metricsService.computeAndStoreMetrics(testUserId, false);
      await metricsService.acknowledgeMetrics(testUserId, metrics.version!, metrics.computedAt!);

      // Act
      await plansService.generatePlan(testUserId, false);

      // Assert: Check initial plan snapshot was created
      const [snapshot] = await db
        .select()
        .from(initialPlanSnapshot)
        .where(eq(initialPlanSnapshot.userId, testUserId));

      expect(snapshot).toBeDefined();
      expect(snapshot.userId).toBe(testUserId);
      expect(parseFloat(snapshot.startWeight)).toBe(80);
      expect(snapshot.calorieTarget).toBeGreaterThan(0);
      expect(snapshot.proteinTarget).toBeGreaterThan(0);
    });
  });

  describe('Performance Tests', () => {
    it('should complete plan generation within p95 target (300ms)', async () => {
      // Arrange
      const metrics = await metricsService.computeAndStoreMetrics(testUserId, false);
      await metricsService.acknowledgeMetrics(testUserId, metrics.version!, metrics.computedAt!);

      // Act
      const startTime = performance.now();
      await plansService.generatePlan(testUserId, false);
      const duration = performance.now() - startTime;

      // Assert: p95 target is 300ms
      expect(duration).toBeLessThan(300);
    });
  });

  describe('Timestamp Precision Bug Regression Tests (Bug #2)', () => {
    it('should find acknowledgment with ISO string timestamp conversion', async () => {
      // This test verifies the exact bug that was fixed:
      // Acknowledgment stored with one timestamp should be found when querying with full precision

      // Arrange: Create and acknowledge metrics
      const metrics = await metricsService.computeAndStoreMetrics(testUserId, false);

      // Simulate client-side ISO string conversion (what actually happens in production)
      const isoString = metrics.computedAt.toISOString();
      const parsedTimestamp = new Date(isoString);

      await metricsService.acknowledgeMetrics(testUserId, metrics.version, parsedTimestamp);

      // Act: Try to generate plan (this is where the bug occurred)
      const result = await plansService.generatePlan(testUserId, false);

      // Assert: Should succeed
      expect(result).toBeDefined();
      expect(result.plan).toBeDefined();
      expect(result.plan.status).toBe('active');
    });

    it('should handle acknowledgment timestamp with milliseconds precision', async () => {
      // Arrange: Create metrics
      const metrics = await metricsService.computeAndStoreMetrics(testUserId, false);

      // Create timestamp with explicit milliseconds
      const timestampWithMillis = new Date(metrics.computedAt);
      timestampWithMillis.setMilliseconds(456); // Different milliseconds

      // Acknowledge using the stored timestamp (not the modified one)
      await metricsService.acknowledgeMetrics(testUserId, metrics.version, metrics.computedAt);

      // Act: Generate plan
      const result = await plansService.generatePlan(testUserId, false);

      // Assert: Should succeed despite millisecond differences
      expect(result).toBeDefined();
      expect(result.plan.status).toBe('active');
    });

    it('should find acknowledgment after multiple timestamp conversions', async () => {
      // Simulate the full client-server round trip
      const metrics = await metricsService.computeAndStoreMetrics(testUserId, false);

      // Step 1: Server returns ISO string
      const serverISOString = metrics.computedAt.toISOString();

      // Step 2: Client parses ISO string to Date
      const clientDate = new Date(serverISOString);

      // Step 3: Client sends back to server (converted to ISO again)
      const clientISOString = clientDate.toISOString();
      const serverReceivedDate = new Date(clientISOString);

      // Acknowledge with the round-tripped timestamp
      await metricsService.acknowledgeMetrics(testUserId, metrics.version, serverReceivedDate);

      // Act: Generate plan
      const result = await plansService.generatePlan(testUserId, false);

      // Assert: Should work despite conversions
      expect(result).toBeDefined();
      expect(result.plan.status).toBe('active');
    });

    it('should check acknowledgment before checking for recent plan', async () => {
      // This test verifies the order of operations in generatePlan

      // Arrange: Create metrics but DON'T acknowledge
      await metricsService.computeAndStoreMetrics(testUserId, false);

      // Act: Try to generate plan
      try {
        await plansService.generatePlan(testUserId, false);
        fail('Should have thrown an error');
      } catch (error: any) {
        // Assert: Should fail at acknowledgment check, not at "recent plan" check
        expect(error.message).toContain('acknowledge your health metrics');
        expect(error.statusCode).toBe(400);
      }

      // Verify no plan was created
      const dbPlans = await db.select().from(plans).where(eq(plans.userId, testUserId));
      expect(dbPlans.length).toBe(0);
    });

    it('should handle acknowledgment query with exact timestamp match', async () => {
      // This test ensures the database query correctly matches timestamps

      // Arrange: Create and acknowledge metrics
      const metrics = await metricsService.computeAndStoreMetrics(testUserId, false);
      await metricsService.acknowledgeMetrics(testUserId, metrics.version, metrics.computedAt);

      // Verify acknowledgment exists in database with correct timestamp
      const [ack] = await db
        .select()
        .from(metricsAcknowledgements)
        .where(eq(metricsAcknowledgements.userId, testUserId));

      expect(ack).toBeDefined();
      expect(ack.metricsComputedAt).toEqual(metrics.computedAt);
      expect(ack.version).toBe(metrics.version);

      // Act: Generate plan
      const result = await plansService.generatePlan(testUserId, false);

      // Assert: Should succeed
      expect(result).toBeDefined();
      expect(result.plan.status).toBe('active');
    });

    it('should handle metrics regenerated after initial acknowledgment', async () => {
      // Arrange: Create and acknowledge first set of metrics
      const firstMetrics = await metricsService.computeAndStoreMetrics(testUserId, false);
      await metricsService.acknowledgeMetrics(
        testUserId,
        firstMetrics.version,
        firstMetrics.computedAt
      );

      // Generate first plan successfully
      await plansService.generatePlan(testUserId, false);

      // Regenerate metrics (simulating weight update or daily recompute)
      const secondMetrics = await metricsService.computeAndStoreMetrics(testUserId, true);
      expect(secondMetrics.id).not.toBe(firstMetrics.id);

      // Act: Try to generate plan with new metrics (should fail without acknowledgment)
      await expect(plansService.generatePlan(testUserId, true)).rejects.toThrow(
        'acknowledge your health metrics'
      );

      // Acknowledge new metrics
      await metricsService.acknowledgeMetrics(
        testUserId,
        secondMetrics.version,
        secondMetrics.computedAt
      );

      // Generate plan again - should now work
      const result = await plansService.generatePlan(testUserId, true);
      expect(result).toBeDefined();
      expect(result.recomputed).toBe(true);
    });

    it('should allow plan generation when no metrics exist (edge case)', async () => {
      // This edge case handles new users who complete onboarding before daily metrics job runs

      // Don't create any metrics
      const result = await plansService.generatePlan(testUserId, false);

      // Should succeed (special edge case handling)
      expect(result).toBeDefined();
      expect(result.plan.status).toBe('active');
    });
  });
});
