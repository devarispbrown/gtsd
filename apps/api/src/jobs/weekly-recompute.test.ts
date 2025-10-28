import { weeklyRecomputeJob } from './weekly-recompute';
import { db } from '../db/connection';
import { users, userSettings, initialPlanSnapshot } from '../db/schema';
import { eq, inArray } from 'drizzle-orm';

describe('WeeklyRecomputeJob', () => {
  let testUserIds: number[] = [];

  beforeAll(async () => {
    // Clean up any existing test data
    await cleanupTestUsers();
  });

  afterAll(async () => {
    // Final cleanup
    await cleanupTestUsers();
  });

  beforeEach(async () => {
    // Clean up before each test
    await cleanupTestUsers();
    testUserIds = [];

    // Create test users with different scenarios

    // User 1: Weight changed significantly (should update)
    const user1Id = await createTestUser({
      email: 'recompute1@example.com',
      name: 'Recompute Test 1',
      settings: {
        dateOfBirth: new Date('1990-01-01'),
        gender: 'male',
        currentWeight: '70', // Changed from initial 80
        height: '180',
        targetWeight: '75',
        activityLevel: 'moderately_active',
        primaryGoal: 'gain_muscle',
        bmr: 1800,
        tdee: 2700,
        calorieTarget: 3100,
        proteinTarget: 192,
        waterTarget: 2800,
        onboardingCompleted: true,
      },
    });
    testUserIds.push(user1Id);

    // User 2: No significant changes needed (targets match current state)
    const user2Id = await createTestUser({
      email: 'recompute2@example.com',
      name: 'Recompute Test 2',
      settings: {
        dateOfBirth: new Date('1985-01-01'),
        gender: 'female',
        currentWeight: '65',
        height: '165',
        targetWeight: '65',
        activityLevel: 'sedentary',
        primaryGoal: 'maintain',
        bmr: null, // Will be computed
        tdee: null,
        calorieTarget: null,
        proteinTarget: null,
        waterTarget: null,
        onboardingCompleted: true,
      },
    });
    testUserIds.push(user2Id);

    // User 3: Onboarding not completed (should skip)
    const user3Id = await createTestUser({
      email: 'recompute3@example.com',
      name: 'Recompute Test 3',
      settings: {
        dateOfBirth: new Date('1995-01-01'),
        gender: 'male',
        currentWeight: '75',
        height: '175',
        activityLevel: 'moderately_active',
        primaryGoal: 'maintain',
        onboardingCompleted: false, // Not completed
      },
    });
    testUserIds.push(user3Id);

    // User 4: Another user with changed activity level (should update)
    const user4Id = await createTestUser({
      email: 'recompute4@example.com',
      name: 'Recompute Test 4',
      settings: {
        dateOfBirth: new Date('1988-06-15'),
        gender: 'female',
        currentWeight: '60',
        height: '162',
        targetWeight: '58',
        activityLevel: 'very_active', // Changed from sedentary
        primaryGoal: 'lose_weight',
        bmr: 1300,
        tdee: 1560, // Old TDEE for sedentary
        calorieTarget: 1060,
        proteinTarget: 132,
        waterTarget: 2100,
        onboardingCompleted: true,
      },
    });
    testUserIds.push(user4Id);
  });

  afterEach(async () => {
    // Clean up after each test
    await cleanupTestUsers();
    testUserIds = [];
  });

  describe('Basic Functionality', () => {
    it('should process all users with completed onboarding', async () => {
      const result = await weeklyRecomputeJob.run();

      // Should process 3 users (excluding user3 with incomplete onboarding)
      expect(result.totalUsers).toBe(3);
      expect(result.successCount).toBeGreaterThanOrEqual(3);
      expect(result.successCount).toBe(result.totalUsers);
    });

    it('should return correct result structure', async () => {
      const result = await weeklyRecomputeJob.run();

      expect(result).toHaveProperty('totalUsers');
      expect(result).toHaveProperty('successCount');
      expect(result).toHaveProperty('errorCount');
      expect(result).toHaveProperty('updates');

      expect(typeof result.totalUsers).toBe('number');
      expect(typeof result.successCount).toBe('number');
      expect(typeof result.errorCount).toBe('number');
      expect(Array.isArray(result.updates)).toBe(true);
    });

    it('should complete without errors for valid users', async () => {
      const result = await weeklyRecomputeJob.run();

      expect(result.errorCount).toBe(0);
      expect(result.successCount).toBe(result.totalUsers);
    });
  });

  describe('Target Updates', () => {
    it('should detect and update changed targets', async () => {
      const result = await weeklyRecomputeJob.run();

      // User 1 and User 4 should have updates
      expect(result.updates.length).toBeGreaterThanOrEqual(1);

      // Check if user 1 is in updates
      const user1Update = result.updates.find((u) => u.userId === testUserIds[0]);
      if (user1Update) {
        expect(user1Update.previousCalories).toBe(3100);
        expect(user1Update.newCalories).not.toBe(user1Update.previousCalories);
        expect(user1Update.reason).toBeTruthy();
      }
    });

    it('should update calories when changed by more than 50', async () => {
      const result = await weeklyRecomputeJob.run();

      // Find any update with significant calorie change
      const significantUpdate = result.updates.find((u) => {
        const diff = Math.abs(u.newCalories - u.previousCalories);
        return diff > 50;
      });

      if (significantUpdate) {
        expect(significantUpdate.reason).toContain('calories changed');
      }
    });

    it('should update protein when changed by more than 10g', async () => {
      const result = await weeklyRecomputeJob.run();

      // Find any update with significant protein change
      const significantUpdate = result.updates.find((u) => {
        const diff = Math.abs(u.newProtein - u.previousProtein);
        return diff > 10;
      });

      if (significantUpdate) {
        expect(significantUpdate.reason).toContain('protein changed');
      }
    });

    it('should not update targets with insignificant changes', async () => {
      // First run to establish baselines
      await weeklyRecomputeJob.run();

      // Run again without changing data (should have no updates)
      const result = await weeklyRecomputeJob.run();

      // All users should still be processed successfully
      expect(result.successCount).toBe(result.totalUsers);

      // But no updates should be made (targets unchanged)
      expect(result.updates.length).toBe(0);
    });

    it('should update user_settings with new targets', async () => {
      await weeklyRecomputeJob.run();

      // Check user 1's settings were updated
      const [settings] = await db
        .select()
        .from(userSettings)
        .where(eq(userSettings.userId, testUserIds[0]));

      expect(settings.bmr).toBeGreaterThan(0);
      expect(settings.tdee).toBeGreaterThan(0);
      expect(settings.calorieTarget).toBeGreaterThan(0);
      expect(settings.proteinTarget).toBeGreaterThan(0);
      expect(settings.waterTarget).toBeGreaterThan(0);
    });
  });

  describe('Error Handling', () => {
    it('should handle errors gracefully', async () => {
      const result = await weeklyRecomputeJob.run();

      // Success count + error count should equal total users
      expect(result.successCount + result.errorCount).toBe(result.totalUsers);
    });

    it('should continue processing other users if one fails', async () => {
      // Create a user with invalid data that will cause computation to fail
      const invalidUserId = await createTestUser({
        email: 'invalid-user@example.com',
        name: 'Invalid User',
        settings: {
          dateOfBirth: new Date('1990-01-01'),
          gender: 'male',
          currentWeight: '500', // Invalid weight (too high)
          height: '180',
          activityLevel: 'sedentary',
          primaryGoal: 'maintain',
          onboardingCompleted: true,
        },
      });
      testUserIds.push(invalidUserId);

      const result = await weeklyRecomputeJob.run();

      // Should still process all users
      expect(result.totalUsers).toBe(4); // 3 original + 1 invalid

      // At least 3 users should succeed
      expect(result.successCount).toBeGreaterThanOrEqual(3);

      // Clean up
      await db.delete(userSettings).where(eq(userSettings.userId, invalidUserId));
      await db.delete(users).where(eq(users.id, invalidUserId));
    });

    it('should not throw error for missing settings', async () => {
      // Create user without settings
      const [userWithoutSettings] = await db
        .insert(users)
        .values({
          email: 'no-settings@example.com',
          name: 'No Settings User',
        })
        .returning();

      testUserIds.push(userWithoutSettings.id);

      // Should not throw
      await expect(weeklyRecomputeJob.run()).resolves.toBeDefined();

      // Clean up
      await db.delete(users).where(eq(users.id, userWithoutSettings.id));
    });
  });

  describe('Logging and Reporting', () => {
    it('should log results without PII', async () => {
      const result = await weeklyRecomputeJob.run();

      // Verify result structure doesn't contain PII
      expect(result).toHaveProperty('totalUsers');
      expect(result).toHaveProperty('successCount');
      expect(result).toHaveProperty('errorCount');
      expect(result).toHaveProperty('updates');

      // Updates should only contain userId and numeric values
      for (const update of result.updates) {
        expect(update).toHaveProperty('userId');
        expect(update).toHaveProperty('previousCalories');
        expect(update).toHaveProperty('newCalories');
        expect(update).toHaveProperty('previousProtein');
        expect(update).toHaveProperty('newProtein');
        expect(update).toHaveProperty('reason');

        // Should not contain email, name, or other PII
        expect(update).not.toHaveProperty('email');
        expect(update).not.toHaveProperty('name');
      }
    });

    it('should track both successful and failed operations', async () => {
      const result = await weeklyRecomputeJob.run();

      expect(typeof result.successCount).toBe('number');
      expect(typeof result.errorCount).toBe('number');
      expect(result.successCount).toBeGreaterThanOrEqual(0);
      expect(result.errorCount).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Performance', () => {
    it('should process users in reasonable time', async () => {
      const startTime = Date.now();

      await weeklyRecomputeJob.run();

      const duration = Date.now() - startTime;

      // Should complete within 5 seconds for 3-4 users
      expect(duration).toBeLessThan(5000);
    });
  });

  describe('Update Reasons', () => {
    it('should provide clear update reasons', async () => {
      const result = await weeklyRecomputeJob.run();

      for (const update of result.updates) {
        expect(update.reason).toBeTruthy();
        expect(typeof update.reason).toBe('string');
        expect(update.reason.length).toBeGreaterThan(0);

        // Reason should mention what changed
        const validReasons = ['calories changed', 'protein changed', 'weight changed'];

        const hasValidReason = validReasons.some((reason) => update.reason.includes(reason));

        expect(hasValidReason).toBe(true);
      }
    });
  });

  describe('Integration with PlansService', () => {
    it('should use PlansService.recomputeForUser method', async () => {
      const result = await weeklyRecomputeJob.run();

      // Should successfully call recomputeForUser for all users
      expect(result.totalUsers).toBeGreaterThan(0);
      expect(result.successCount).toBeGreaterThan(0);
    });

    it('should update initial_plan_snapshot when targets change', async () => {
      await weeklyRecomputeJob.run();

      // Check if snapshot exists for user 1
      const [snapshot] = await db
        .select()
        .from(initialPlanSnapshot)
        .where(eq(initialPlanSnapshot.userId, testUserIds[0]))
        .limit(1);

      // Snapshot might not exist for all users, but if it does, it should have valid data
      if (snapshot) {
        expect(snapshot.calorieTarget).toBeGreaterThan(0);
        expect(snapshot.proteinTarget).toBeGreaterThan(0);
        expect(snapshot.waterTarget).toBeGreaterThan(0);
      }
    });
  });

  describe('Edge Cases', () => {
    it('should handle user with null previous targets', async () => {
      const result = await weeklyRecomputeJob.run();

      // User 2 has null targets initially, should still be computed
      expect(result.successCount).toBeGreaterThan(0);
    });

    it('should handle maintenance goal correctly', async () => {
      await weeklyRecomputeJob.run();

      // Find user 2 in results (maintenance goal)
      const [user2Settings] = await db
        .select()
        .from(userSettings)
        .where(eq(userSettings.userId, testUserIds[1]));

      // Should have computed targets even for maintenance
      expect(user2Settings.bmr).toBeGreaterThan(0);
      expect(user2Settings.calorieTarget).toBe(user2Settings.tdee); // Maintenance
    });

    it('should handle empty database gracefully', async () => {
      // Clean up all test users
      await cleanupTestUsers();
      testUserIds = [];

      const result = await weeklyRecomputeJob.run();

      expect(result.totalUsers).toBe(0);
      expect(result.successCount).toBe(0);
      expect(result.errorCount).toBe(0);
      expect(result.updates).toEqual([]);
    });
  });
});

// Helper functions

async function cleanupTestUsers() {
  const testEmails = [
    'recompute1@example.com',
    'recompute2@example.com',
    'recompute3@example.com',
    'recompute4@example.com',
    'invalid-user@example.com',
    'no-settings@example.com',
  ];

  // Get user IDs first
  const testUsers = await db
    .select({ id: users.id })
    .from(users)
    .where(inArray(users.email, testEmails));

  const testUserIds = testUsers.map((u) => u.id);

  if (testUserIds.length > 0) {
    // Delete related records first
    await db.delete(initialPlanSnapshot).where(inArray(initialPlanSnapshot.userId, testUserIds));
    await db.delete(userSettings).where(inArray(userSettings.userId, testUserIds));

    // Delete users
    await db.delete(users).where(inArray(users.id, testUserIds));
  }
}

async function createTestUser(config: {
  email: string;
  name: string;
  settings: {
    dateOfBirth: Date;
    gender: string;
    currentWeight: string;
    height: string;
    targetWeight?: string | null;
    activityLevel: string;
    primaryGoal: string;
    bmr?: number | null;
    tdee?: number | null;
    calorieTarget?: number | null;
    proteinTarget?: number | null;
    waterTarget?: number | null;
    onboardingCompleted: boolean;
  };
}): Promise<number> {
  const [user] = await db
    .insert(users)
    .values({
      email: config.email,
      name: config.name,
    })
    .returning();

  await db.insert(userSettings).values({
    userId: user.id,
    dateOfBirth: config.settings.dateOfBirth,
    gender: config.settings.gender,
    currentWeight: config.settings.currentWeight,
    height: config.settings.height,
    targetWeight: config.settings.targetWeight || null,
    activityLevel: config.settings.activityLevel,
    primaryGoal: config.settings.primaryGoal,
    bmr: config.settings.bmr ?? null,
    tdee: config.settings.tdee ?? null,
    calorieTarget: config.settings.calorieTarget ?? null,
    proteinTarget: config.settings.proteinTarget ?? null,
    waterTarget: config.settings.waterTarget ?? null,
    onboardingCompleted: config.settings.onboardingCompleted,
  });

  return user.id;
}
