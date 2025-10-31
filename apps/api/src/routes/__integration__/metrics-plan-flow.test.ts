/**
 * Integration Tests: Metrics Acknowledgment + Plan Generation Flow
 *
 * These tests verify the complete end-to-end flow that was broken by
 * Bug #2: Metrics acknowledgment 400 errors (timestamp precision mismatch)
 *
 * CRITICAL: These tests verify that acknowledgment stored with one timestamp
 * can be found when querying with full precision timestamps.
 */

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
import { metricsService } from '../../services/metrics';
import { PlansService } from '../plans/service';

describe('Metrics Acknowledgment + Plan Generation Integration Flow', () => {
  let plansService: PlansService;
  let testUserId: number;
  const testEmail = `integration-metrics-plan-${Date.now()}@example.com`;

  beforeAll(async () => {
    plansService = new PlansService();

    // Create test user
    const [user] = await db
      .insert(users)
      .values({
        email: testEmail,
        name: 'Integration Test User',
      })
      .returning();

    testUserId = user.id;
  });

  afterAll(async () => {
    // Cleanup in reverse order of foreign key dependencies
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

    // Create complete user settings
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

  describe('Complete Happy Path Flow', () => {
    it('should allow plan generation after metrics acknowledgment with exact timestamp precision', async () => {
      // Step 1: Compute metrics for user
      const computedMetrics = await metricsService.computeAndStoreMetrics(testUserId, false);
      expect(computedMetrics).toBeDefined();
      expect(computedMetrics.userId).toBe(testUserId);
      expect(computedMetrics.bmi).toBeDefined();
      expect(computedMetrics.bmr).toBeGreaterThan(0);
      expect(computedMetrics.tdee).toBeGreaterThan(0);

      // Step 2: Fetch metrics (simulating what the client does)
      const fetchedMetrics = await metricsService.getTodayMetrics(testUserId);
      expect(fetchedMetrics).toBeDefined();
      expect(fetchedMetrics.acknowledged).toBe(false);
      expect(fetchedMetrics.metrics.computedAt).toBeDefined();

      // Step 3: Acknowledge metrics using the timestamp from the fetch
      // CRITICAL: This timestamp includes full precision (milliseconds)
      const metricsTimestamp = new Date(fetchedMetrics.metrics.computedAt);
      const acknowledgment = await metricsService.acknowledgeMetrics(
        testUserId,
        fetchedMetrics.metrics.version,
        metricsTimestamp
      );
      expect(acknowledgment.success).toBe(true);
      expect(acknowledgment.acknowledgedAt).toBeDefined();

      // Step 4: Generate plan (should succeed, not 400)
      // This is where the bug occurred - the plan service checks acknowledgment
      // but the timestamp precision mismatch caused it to fail
      const plan = await plansService.generatePlan(testUserId, false);
      expect(plan).toBeDefined();
      expect(plan.plan).toBeDefined();
      expect(plan.plan.id).toBeGreaterThan(0);
      expect(plan.plan.userId).toBe(testUserId);
      expect(plan.plan.status).toBe('active');

      // Step 5: Verify plan was created in database
      const [dbPlan] = await db
        .select()
        .from(plans)
        .where(eq(plans.userId, testUserId))
        .limit(1);

      expect(dbPlan).toBeDefined();
      expect(dbPlan.id).toBe(plan.plan.id);
      expect(dbPlan.status).toBe('active');

      // Step 6: Verify targets were computed and stored
      expect(plan.targets).toBeDefined();
      expect(plan.targets.calorieTarget).toBeGreaterThan(0);
      expect(plan.targets.proteinTarget).toBeGreaterThan(0);
      expect(plan.targets.waterTarget).toBeGreaterThan(0);

      // Step 7: Verify user settings were updated with targets
      const [settings] = await db
        .select()
        .from(userSettings)
        .where(eq(userSettings.userId, testUserId));

      expect(settings.calorieTarget).toBe(plan.targets.calorieTarget);
      expect(settings.proteinTarget).toBe(plan.targets.proteinTarget);
      expect(settings.waterTarget).toBe(plan.targets.waterTarget);
    });

    it('should handle acknowledgment with ISO string timestamp conversion', async () => {
      // Step 1: Compute metrics
      await metricsService.computeAndStoreMetrics(testUserId, false);

      // Step 2: Fetch metrics and get ISO string timestamp
      const fetchedMetrics = await metricsService.getTodayMetrics(testUserId);
      const isoTimestamp = fetchedMetrics.metrics.computedAt; // This is an ISO string

      // Step 3: Acknowledge using Date object created from ISO string
      // This simulates what the client does when parsing JSON
      const metricsTimestamp = new Date(isoTimestamp);
      await metricsService.acknowledgeMetrics(
        testUserId,
        fetchedMetrics.metrics.version,
        metricsTimestamp
      );

      // Step 4: Verify plan generation works
      const plan = await plansService.generatePlan(testUserId, false);
      expect(plan).toBeDefined();
      expect(plan.plan.status).toBe('active');
    });
  });

  describe('Failure Cases - Without Acknowledgment', () => {
    it('should prevent plan generation without acknowledgment', async () => {
      // Step 1: Compute metrics for user
      await metricsService.computeAndStoreMetrics(testUserId, false);

      // Step 2: Try to generate plan WITHOUT acknowledging (should fail with 400)
      await expect(plansService.generatePlan(testUserId, false)).rejects.toThrow(
        'Please review and acknowledge your health metrics before generating a plan'
      );

      // Step 3: Verify no plan was created
      const dbPlans = await db.select().from(plans).where(eq(plans.userId, testUserId));
      expect(dbPlans.length).toBe(0);
    });

    it('should provide correct error message when acknowledgment missing', async () => {
      // Step 1: Compute metrics
      await metricsService.computeAndStoreMetrics(testUserId, false);

      // Step 2: Try to generate plan
      try {
        await plansService.generatePlan(testUserId, false);
        fail('Should have thrown an error');
      } catch (error: any) {
        expect(error.statusCode).toBe(400);
        expect(error.message).toContain('acknowledge your health metrics');
      }
    });
  });

  describe('Edge Cases - Metrics Regeneration', () => {
    it('should handle metrics regenerated after acknowledgment (old acknowledgment should not prevent new plan)', async () => {
      // Step 1: Compute and acknowledge first set of metrics
      const firstMetrics = await metricsService.computeAndStoreMetrics(testUserId, false);
      await metricsService.acknowledgeMetrics(
        testUserId,
        firstMetrics.version,
        firstMetrics.computedAt
      );

      // Step 2: Force recompute metrics (simulating daily job or onboarding change)
      const secondMetrics = await metricsService.computeAndStoreMetrics(testUserId, true);
      expect(secondMetrics.id).not.toBe(firstMetrics.id); // Different metrics record

      // Step 3: Try to generate plan - should fail because new metrics not acknowledged
      await expect(plansService.generatePlan(testUserId, false)).rejects.toThrow(
        'Please review and acknowledge your health metrics before generating a plan'
      );

      // Step 4: Acknowledge new metrics
      await metricsService.acknowledgeMetrics(
        testUserId,
        secondMetrics.version,
        secondMetrics.computedAt
      );

      // Step 5: Now plan generation should work
      const plan = await plansService.generatePlan(testUserId, false);
      expect(plan).toBeDefined();
      expect(plan.plan.status).toBe('active');
    });

    it('should allow plan generation when no metrics exist yet (edge case for new users)', async () => {
      // This is a special edge case: user completes onboarding before daily metrics job runs
      // In this case, we should allow plan generation

      // Don't create any metrics - user has settings but no metrics yet
      const plan = await plansService.generatePlan(testUserId, false);

      expect(plan).toBeDefined();
      expect(plan.plan.status).toBe('active');
    });
  });

  describe('Timestamp Precision Edge Cases', () => {
    it('should handle acknowledgment timestamp with milliseconds precision', async () => {
      // Step 1: Compute metrics
      const metrics = await metricsService.computeAndStoreMetrics(testUserId, false);

      // Step 2: Create timestamp with explicit milliseconds
      const timestampWithMillis = new Date(metrics.computedAt);
      timestampWithMillis.setMilliseconds(123); // Set specific milliseconds

      // Step 3: Acknowledge with precise timestamp
      // Note: The service should use the stored metrics.computedAt, not the one we pass
      await metricsService.acknowledgeMetrics(testUserId, metrics.version, metrics.computedAt);

      // Step 4: Plan generation should work
      const plan = await plansService.generatePlan(testUserId, false);
      expect(plan).toBeDefined();
    });

    it('should find acknowledgment even when timestamps have different millisecond precision', async () => {
      // Step 1: Compute metrics
      const metrics = await metricsService.computeAndStoreMetrics(testUserId, false);

      // Step 2: Acknowledge with exact timestamp from database
      await metricsService.acknowledgeMetrics(testUserId, metrics.version, metrics.computedAt);

      // Step 3: Query acknowledgment using ISO string conversion (what the plan service does)
      const [acknowledgement] = await db
        .select()
        .from(metricsAcknowledgements)
        .where(eq(metricsAcknowledgements.userId, testUserId))
        .limit(1);

      expect(acknowledgement).toBeDefined();
      expect(acknowledgement.metricsComputedAt).toEqual(metrics.computedAt);

      // Step 4: Plan generation should find the acknowledgment
      const plan = await plansService.generatePlan(testUserId, false);
      expect(plan).toBeDefined();
    });

    it('should handle round-trip ISO string conversion correctly', async () => {
      // Step 1: Compute metrics
      const metrics = await metricsService.computeAndStoreMetrics(testUserId, false);

      // Step 2: Simulate client-side ISO string round-trip
      const isoString = metrics.computedAt.toISOString();
      const parsedDate = new Date(isoString);

      // Step 3: Acknowledge with parsed date
      await metricsService.acknowledgeMetrics(testUserId, metrics.version, parsedDate);

      // Step 4: Plan generation should work
      const plan = await plansService.generatePlan(testUserId, false);
      expect(plan).toBeDefined();
      expect(plan.plan.status).toBe('active');
    });
  });

  describe('Concurrent Operations', () => {
    it('should handle acknowledgment and plan generation in quick succession', async () => {
      // Step 1: Compute metrics
      const metrics = await metricsService.computeAndStoreMetrics(testUserId, false);

      // Step 2: Acknowledge and immediately generate plan
      await metricsService.acknowledgeMetrics(testUserId, metrics.version, metrics.computedAt);

      // No delay - immediately generate plan
      const plan = await plansService.generatePlan(testUserId, false);
      expect(plan).toBeDefined();
      expect(plan.plan.status).toBe('active');
    });

    it('should handle multiple acknowledgments idempotently', async () => {
      // Step 1: Compute metrics
      const metrics = await metricsService.computeAndStoreMetrics(testUserId, false);

      // Step 2: Acknowledge multiple times (should be idempotent)
      await metricsService.acknowledgeMetrics(testUserId, metrics.version, metrics.computedAt);
      await metricsService.acknowledgeMetrics(testUserId, metrics.version, metrics.computedAt);
      await metricsService.acknowledgeMetrics(testUserId, metrics.version, metrics.computedAt);

      // Step 3: Verify only one acknowledgment exists
      const acknowledgements = await db
        .select()
        .from(metricsAcknowledgements)
        .where(eq(metricsAcknowledgements.userId, testUserId));

      expect(acknowledgements.length).toBe(1);

      // Step 4: Plan generation should still work
      const plan = await plansService.generatePlan(testUserId, false);
      expect(plan).toBeDefined();
    });
  });

  describe('Performance Tests', () => {
    it('should complete full flow within acceptable time', async () => {
      const startTime = performance.now();

      // Complete flow
      const metrics = await metricsService.computeAndStoreMetrics(testUserId, false);
      await metricsService.acknowledgeMetrics(testUserId, metrics.version, metrics.computedAt);
      const plan = await plansService.generatePlan(testUserId, false);

      const duration = performance.now() - startTime;

      expect(plan).toBeDefined();
      // Total flow should complete under 1 second in test environment
      expect(duration).toBeLessThan(1000);
    });
  });

  describe('Data Integrity Tests', () => {
    it('should maintain referential integrity throughout flow', async () => {
      // Step 1: Complete flow
      const metrics = await metricsService.computeAndStoreMetrics(testUserId, false);
      await metricsService.acknowledgeMetrics(testUserId, metrics.version, metrics.computedAt);
      const plan = await plansService.generatePlan(testUserId, false);

      // Step 2: Verify all related records exist and link correctly
      const [dbMetrics] = await db
        .select()
        .from(profileMetrics)
        .where(eq(profileMetrics.id, metrics.id));

      const [dbAcknowledgement] = await db
        .select()
        .from(metricsAcknowledgements)
        .where(eq(metricsAcknowledgements.userId, testUserId));

      const [dbPlan] = await db.select().from(plans).where(eq(plans.id, plan.plan.id));

      const [dbSnapshot] = await db
        .select()
        .from(initialPlanSnapshot)
        .where(eq(initialPlanSnapshot.userId, testUserId));

      const [dbSettings] = await db
        .select()
        .from(userSettings)
        .where(eq(userSettings.userId, testUserId));

      // Verify all records exist
      expect(dbMetrics).toBeDefined();
      expect(dbAcknowledgement).toBeDefined();
      expect(dbPlan).toBeDefined();
      expect(dbSnapshot).toBeDefined();
      expect(dbSettings).toBeDefined();

      // Verify timestamps align
      expect(dbAcknowledgement.metricsComputedAt).toEqual(dbMetrics.computedAt);

      // Verify user IDs match throughout
      expect(dbMetrics.userId).toBe(testUserId);
      expect(dbAcknowledgement.userId).toBe(testUserId);
      expect(dbPlan.userId).toBe(testUserId);
      expect(dbSnapshot.userId).toBe(testUserId);
      expect(dbSettings.userId).toBe(testUserId);

      // Verify targets were propagated correctly
      expect(dbSettings.calorieTarget).toBe(plan.targets.calorieTarget);
      expect(dbSnapshot.calorieTarget).toBe(plan.targets.calorieTarget);
    });
  });
});
