import { scienceService } from './science';
import { db } from '../db/connection';
import { users, userSettings } from '../db/schema';
import { eq } from 'drizzle-orm';

describe('ScienceService', () => {
  let testUserId: number;

  beforeAll(async () => {
    // Create test user
    const [user] = await db
      .insert(users)
      .values({
        email: 'science-test@example.com',
        name: 'Science Test',
      })
      .returning();

    testUserId = user.id;
  });

  afterAll(async () => {
    // Cleanup
    await db.delete(userSettings).where(eq(userSettings.userId, testUserId));
    await db.delete(users).where(eq(users.id, testUserId));
  });

  afterEach(async () => {
    // Clean up settings after each test
    await db.delete(userSettings).where(eq(userSettings.userId, testUserId));
  });

  describe('calculateBMR', () => {
    it('should calculate BMR correctly for males using Mifflin-St Jeor', () => {
      // Test case: 30yo male, 80kg, 180cm
      // Expected: (10 * 80) + (6.25 * 180) - (5 * 30) + 5 = 800 + 1125 - 150 + 5 = 1780
      const bmr1 = scienceService.calculateBMR(80, 180, 30, 'male');
      expect(bmr1).toBe(1780);

      // Test case: 45yo male, 95kg, 175cm
      // Expected: (10 * 95) + (6.25 * 175) - (5 * 45) + 5 = 950 + 1093.75 - 225 + 5 = 1824
      const bmr2 = scienceService.calculateBMR(95, 175, 45, 'male');
      expect(bmr2).toBe(1824);
    });

    it('should calculate BMR correctly for females', () => {
      // Test case: 28yo female, 65kg, 165cm
      // Expected: (10 * 65) + (6.25 * 165) - (5 * 28) - 161 = 650 + 1031.25 - 140 - 161 = 1380
      const bmr1 = scienceService.calculateBMR(65, 165, 28, 'female');
      expect(bmr1).toBe(1380);

      // Test case: 50yo female, 70kg, 160cm
      // Expected: (10 * 70) + (6.25 * 160) - (5 * 50) - 161 = 700 + 1000 - 250 - 161 = 1289
      const bmr2 = scienceService.calculateBMR(70, 160, 50, 'female');
      expect(bmr2).toBe(1289);
    });

    it('should calculate BMR for non-binary as average', () => {
      // Test case: 35yo other, 75kg, 170cm
      // Base: (10 * 75) + (6.25 * 170) - (5 * 35) = 750 + 1062.5 - 175 = 1637.5
      // Male offset: 5, Female offset: -161, Average: (5 + -161) / 2 = -78
      // Expected: 1637.5 + (-78) = 1560 (rounded)
      const bmr = scienceService.calculateBMR(75, 170, 35, 'other');
      expect(bmr).toBe(1560);
    });

    it('should round BMR to nearest integer', () => {
      // All BMR calculations should return integers with no decimal places
      const bmr1 = scienceService.calculateBMR(72.5, 172.5, 33, 'male');
      expect(bmr1).toBe(Math.round(bmr1));
      expect(Number.isInteger(bmr1)).toBe(true);

      const bmr2 = scienceService.calculateBMR(58.3, 158.7, 27, 'female');
      expect(bmr2).toBe(Math.round(bmr2));
      expect(Number.isInteger(bmr2)).toBe(true);
    });
  });

  describe('calculateTDEE', () => {
    it('should apply correct activity multipliers', () => {
      const bmr = 1500;

      // sedentary: 1.2x
      expect(scienceService.calculateTDEE(bmr, 'sedentary')).toBe(1800);

      // lightly_active: 1.375x
      expect(scienceService.calculateTDEE(bmr, 'lightly_active')).toBe(2063);

      // moderately_active: 1.55x
      expect(scienceService.calculateTDEE(bmr, 'moderately_active')).toBe(2325);

      // very_active: 1.725x
      expect(scienceService.calculateTDEE(bmr, 'very_active')).toBe(2588);

      // extremely_active: 1.9x
      expect(scienceService.calculateTDEE(bmr, 'extremely_active')).toBe(2850);
    });

    it('should round TDEE to nearest integer', () => {
      const bmr = 1637; // Arbitrary BMR
      const tdee = scienceService.calculateTDEE(bmr, 'lightly_active');

      expect(Number.isInteger(tdee)).toBe(true);
      expect(tdee).toBe(Math.round(tdee));
    });
  });

  describe('calculateCalorieTarget', () => {
    it('should apply correct calorie adjustments for goals', () => {
      const tdee = 2000;

      // lose_weight: -500
      expect(scienceService.calculateCalorieTarget(tdee, 'lose_weight')).toBe(1500);

      // gain_muscle: +400
      expect(scienceService.calculateCalorieTarget(tdee, 'gain_muscle')).toBe(2400);

      // maintain: 0
      expect(scienceService.calculateCalorieTarget(tdee, 'maintain')).toBe(2000);

      // improve_health: 0
      expect(scienceService.calculateCalorieTarget(tdee, 'improve_health')).toBe(2000);
    });

    it('should round calorie target to nearest integer', () => {
      const tdee = 2137; // Arbitrary TDEE
      const calorieTarget = scienceService.calculateCalorieTarget(tdee, 'lose_weight');

      expect(Number.isInteger(calorieTarget)).toBe(true);
    });
  });

  describe('calculateProteinTarget', () => {
    it('should calculate correct protein for goals', () => {
      const weight = 80; // kg

      // lose_weight: 2.2g/kg = 176g
      expect(scienceService.calculateProteinTarget(weight, 'lose_weight')).toBe(176);

      // gain_muscle: 2.4g/kg = 192g
      expect(scienceService.calculateProteinTarget(weight, 'gain_muscle')).toBe(192);

      // maintain: 1.8g/kg = 144g
      expect(scienceService.calculateProteinTarget(weight, 'maintain')).toBe(144);

      // improve_health: 1.8g/kg = 144g
      expect(scienceService.calculateProteinTarget(weight, 'improve_health')).toBe(144);
    });

    it('should round protein target to nearest integer', () => {
      const weight = 73.5; // Weight that will produce decimal
      const proteinTarget = scienceService.calculateProteinTarget(weight, 'lose_weight');

      expect(Number.isInteger(proteinTarget)).toBe(true);
    });
  });

  describe('calculateWaterTarget', () => {
    it('should calculate 35ml per kg', () => {
      // 70kg: 70 * 35 = 2450 -> rounded to 2500
      expect(scienceService.calculateWaterTarget(70)).toBe(2500);

      // 80kg: 80 * 35 = 2800 -> rounded to 2800
      expect(scienceService.calculateWaterTarget(80)).toBe(2800);

      // 65kg: 65 * 35 = 2275 -> rounded to 2300
      expect(scienceService.calculateWaterTarget(65)).toBe(2300);
    });

    it('should round to nearest 100ml', () => {
      // 73kg: 73 * 35 = 2555 -> rounded to 2600
      expect(scienceService.calculateWaterTarget(73)).toBe(2600);

      // 77kg: 77 * 35 = 2695 -> rounded to 2700
      expect(scienceService.calculateWaterTarget(77)).toBe(2700);

      // 62kg: 62 * 35 = 2170 -> rounded to 2200
      expect(scienceService.calculateWaterTarget(62)).toBe(2200);
    });
  });

  describe('calculateWeeklyRate', () => {
    it('should return correct weekly rates', () => {
      expect(scienceService.calculateWeeklyRate('lose_weight')).toBe(-0.5);
      expect(scienceService.calculateWeeklyRate('gain_muscle')).toBe(0.4);
      expect(scienceService.calculateWeeklyRate('maintain')).toBe(0);
      expect(scienceService.calculateWeeklyRate('improve_health')).toBe(0);
    });
  });

  describe('calculateProjection', () => {
    it('should calculate correct timeline for weight loss', () => {
      const result = scienceService.calculateProjection(80, 70, -0.5);

      expect(result.estimatedWeeks).toBe(20); // 10kg / 0.5kg/week
      expect(result.projectedDate).toBeInstanceOf(Date);

      // Verify projected date is approximately 20 weeks from now
      const expectedDate = new Date();
      expectedDate.setDate(expectedDate.getDate() + 20 * 7);

      // Allow 1 day tolerance for test execution time
      const daysDiff = Math.abs(
        (result.projectedDate!.getTime() - expectedDate.getTime()) / (1000 * 60 * 60 * 24)
      );
      expect(daysDiff).toBeLessThan(1);
    });

    it('should calculate correct timeline for muscle gain', () => {
      const result = scienceService.calculateProjection(70, 75, 0.4);

      expect(result.estimatedWeeks).toBe(13); // 5kg / 0.4kg/week (rounded up)
      expect(result.projectedDate).toBeInstanceOf(Date);
    });

    it('should return undefined for maintenance goals', () => {
      const result = scienceService.calculateProjection(75, 75, 0);

      expect(result.estimatedWeeks).toBeUndefined();
      expect(result.projectedDate).toBeUndefined();
    });

    it('should round up weeks to account for partial weeks', () => {
      // 6kg / 0.5kg/week = 12 weeks (exact)
      const result1 = scienceService.calculateProjection(80, 74, -0.5);
      expect(result1.estimatedWeeks).toBe(12);

      // 6.3kg / 0.5kg/week = 12.6 weeks -> 13 weeks (rounded up)
      const result2 = scienceService.calculateProjection(80, 73.7, -0.5);
      expect(result2.estimatedWeeks).toBe(13);
    });
  });

  describe('computeAllTargets', () => {
    beforeEach(async () => {
      // Create user settings for each test
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

    it('should compute all targets correctly', async () => {
      const result = await scienceService.computeAllTargets(testUserId);

      // BMR should be in reasonable range for 35yo, 80kg, 180cm male
      expect(result.bmr).toBeGreaterThan(1700);
      expect(result.bmr).toBeLessThan(1900);

      // TDEE should be BMR * 1.55 (moderately_active)
      expect(result.tdee).toBeGreaterThan(2500);
      expect(result.tdee).toBeLessThan(2800);

      // Calorie target should be TDEE - 500 (lose_weight)
      expect(result.calorieTarget).toBe(result.tdee - 500);

      // Protein target should be 80kg * 2.2g/kg = 176g
      expect(result.proteinTarget).toBe(176);

      // Water target should be 80kg * 35ml/kg = 2800ml
      expect(result.waterTarget).toBe(2800);

      // Weekly rate should be -0.5 for lose_weight
      expect(result.weeklyRate).toBe(-0.5);

      // Estimated weeks should be 5kg / 0.5kg/week = 10 weeks
      expect(result.estimatedWeeks).toBe(10);

      // Projected date should exist
      expect(result.projectedDate).toBeInstanceOf(Date);
    });

    it('should throw error for missing user settings', async () => {
      await expect(scienceService.computeAllTargets(99999)).rejects.toThrow(
        'User settings not found'
      );
    });

    it('should validate inputs and throw for invalid data', async () => {
      // Create user with invalid weight (too high)
      const [invalidUser] = await db
        .insert(users)
        .values({
          email: 'invalid-weight@example.com',
          name: 'Invalid Weight',
        })
        .returning();

      await db.insert(userSettings).values({
        userId: invalidUser.id,
        currentWeight: '500', // Too high (max is 300)
        height: '180',
        dateOfBirth: new Date('1990-01-01'),
        gender: 'male',
        activityLevel: 'sedentary',
        primaryGoal: 'maintain',
        onboardingCompleted: true,
      });

      await expect(scienceService.computeAllTargets(invalidUser.id)).rejects.toThrow(
        'Invalid input parameters'
      );

      // Cleanup
      await db.delete(userSettings).where(eq(userSettings.userId, invalidUser.id));
      await db.delete(users).where(eq(users.id, invalidUser.id));
    });

    it('should validate height range', async () => {
      const [invalidUser] = await db
        .insert(users)
        .values({
          email: 'invalid-height@example.com',
          name: 'Invalid Height',
        })
        .returning();

      await db.insert(userSettings).values({
        userId: invalidUser.id,
        currentWeight: '80',
        height: '300', // Too high (max is 250)
        dateOfBirth: new Date('1990-01-01'),
        gender: 'male',
        activityLevel: 'sedentary',
        primaryGoal: 'maintain',
        onboardingCompleted: true,
      });

      await expect(scienceService.computeAllTargets(invalidUser.id)).rejects.toThrow(
        'Invalid input parameters'
      );

      // Cleanup
      await db.delete(userSettings).where(eq(userSettings.userId, invalidUser.id));
      await db.delete(users).where(eq(users.id, invalidUser.id));
    });

    it('should validate age range', async () => {
      const [invalidUser] = await db
        .insert(users)
        .values({
          email: 'invalid-age@example.com',
          name: 'Invalid Age',
        })
        .returning();

      await db.insert(userSettings).values({
        userId: invalidUser.id,
        currentWeight: '80',
        height: '180',
        dateOfBirth: new Date('2020-01-01'), // Too young (< 13)
        gender: 'male',
        activityLevel: 'sedentary',
        primaryGoal: 'maintain',
        onboardingCompleted: true,
      });

      await expect(scienceService.computeAllTargets(invalidUser.id)).rejects.toThrow(
        'Invalid input parameters'
      );

      // Cleanup
      await db.delete(userSettings).where(eq(userSettings.userId, invalidUser.id));
      await db.delete(users).where(eq(users.id, invalidUser.id));
    });

    it('should handle missing optional targetWeight', async () => {
      // Delete existing settings
      await db.delete(userSettings).where(eq(userSettings.userId, testUserId));

      // Create settings without targetWeight (maintenance goal)
      await db.insert(userSettings).values({
        userId: testUserId,
        dateOfBirth: new Date('1990-01-01'),
        gender: 'female',
        currentWeight: '65',
        height: '165',
        targetWeight: null,
        activityLevel: 'sedentary',
        primaryGoal: 'maintain',
        onboardingCompleted: true,
      });

      const result = await scienceService.computeAllTargets(testUserId);

      expect(result.bmr).toBeGreaterThan(0);
      expect(result.tdee).toBeGreaterThan(0);
      expect(result.weeklyRate).toBe(0); // maintain goal
      expect(result.estimatedWeeks).toBeUndefined();
      expect(result.projectedDate).toBeUndefined();
    });

    it('should complete within p95 target (300ms)', async () => {
      const startTime = performance.now();

      await scienceService.computeAllTargets(testUserId);

      const duration = performance.now() - startTime;

      expect(duration).toBeLessThan(300);
    });
  });

  describe('getWhyItWorksExplanation', () => {
    it('should generate educational explanations for weight loss', () => {
      const targets = {
        bmr: 1800,
        tdee: 2700,
        calorieTarget: 2200,
        proteinTarget: 176,
        waterTarget: 2800,
        weeklyRate: -0.5,
        estimatedWeeks: 10,
        projectedDate: new Date(),
      };

      const inputs = {
        weight: 80,
        height: 180,
        age: 30,
        gender: 'male' as const,
        activityLevel: 'very_active' as const,
        primaryGoal: 'lose_weight' as const,
      };

      const result = scienceService.getWhyItWorksExplanation(targets, inputs);

      // BMR explanation
      expect(result.bmr).toBeDefined();
      expect(result.bmr.title).toBe('Your Basal Metabolic Rate (BMR)');
      expect(result.bmr.explanation).toContain('Basal Metabolic Rate');
      expect(result.bmr.explanation).toContain('1800 calories');
      expect(result.bmr.formula).toContain('Mifflin-St Jeor');

      // TDEE explanation
      expect(result.tdee).toBeDefined();
      expect(result.tdee.title).toBe('Your Total Daily Energy Expenditure (TDEE)');
      expect(result.tdee.explanation).toContain('2700 calories');
      expect(result.tdee.activityMultiplier).toBe(1.725);

      // Calorie target explanation
      expect(result.calorieTarget).toBeDefined();
      expect(result.calorieTarget.title).toBe('Your Daily Calorie Target');
      expect(result.calorieTarget.explanation).toContain('deficit');
      expect(result.calorieTarget.deficit).toBe(500);

      // Protein target explanation
      expect(result.proteinTarget).toBeDefined();
      expect(result.proteinTarget.title).toBe('Your Daily Protein Target');
      expect(result.proteinTarget.explanation).toContain('176g');
      expect(result.proteinTarget.gramsPerKg).toBe(2.2);

      // Water target explanation
      expect(result.waterTarget).toBeDefined();
      expect(result.waterTarget.title).toBe('Your Daily Hydration Target');
      expect(result.waterTarget.explanation).toContain('2800ml');
      expect(result.waterTarget.mlPerKg).toBe(35);

      // Timeline explanation
      expect(result.timeline).toBeDefined();
      expect(result.timeline.title).toBe('Your Projected Timeline');
      expect(result.timeline.explanation).toContain('10 weeks');
      expect(result.timeline.weeklyRate).toBe(-0.5);
      expect(result.timeline.estimatedWeeks).toBe(10);
    });

    it('should generate educational explanations for muscle gain', () => {
      const targets = {
        bmr: 1600,
        tdee: 2400,
        calorieTarget: 2800,
        proteinTarget: 168,
        waterTarget: 2500,
        weeklyRate: 0.4,
        estimatedWeeks: 13,
        projectedDate: new Date(),
      };

      const inputs = {
        weight: 70,
        height: 175,
        age: 25,
        gender: 'male' as const,
        activityLevel: 'moderately_active' as const,
        primaryGoal: 'gain_muscle' as const,
      };

      const result = scienceService.getWhyItWorksExplanation(targets, inputs);

      // Calorie explanation should mention surplus
      expect(result.calorieTarget.explanation).toContain('surplus');
      expect(result.calorieTarget.deficit).toBe(-400); // Negative deficit = surplus

      // Protein explanation should mention muscle building
      expect(result.proteinTarget.explanation).toContain('muscle building');
      expect(result.proteinTarget.gramsPerKg).toBe(2.4);
    });

    it('should generate educational explanations for maintenance', () => {
      const targets = {
        bmr: 1400,
        tdee: 1680,
        calorieTarget: 1680,
        proteinTarget: 117,
        waterTarget: 2300,
        weeklyRate: 0,
        estimatedWeeks: undefined,
        projectedDate: undefined,
      };

      const inputs = {
        weight: 65,
        height: 165,
        age: 28,
        gender: 'female' as const,
        activityLevel: 'sedentary' as const,
        primaryGoal: 'maintain' as const,
      };

      const result = scienceService.getWhyItWorksExplanation(targets, inputs);

      // Calorie explanation should mention maintenance
      expect(result.calorieTarget.explanation).toContain('maintenance');
      expect(result.calorieTarget.deficit).toBe(0);

      // Timeline should indicate no specific weight goal
      expect(result.timeline.explanation).toContain('no specific weight timeline');
      expect(result.timeline.estimatedWeeks).toBe(0);
    });

    it('should include all required fields', () => {
      const targets = {
        bmr: 1700,
        tdee: 2380,
        calorieTarget: 2380,
        proteinTarget: 126,
        waterTarget: 2500,
        weeklyRate: 0,
        estimatedWeeks: undefined,
        projectedDate: undefined,
      };

      const inputs = {
        weight: 70,
        height: 170,
        age: 35,
        gender: 'other' as const,
        activityLevel: 'lightly_active' as const,
        primaryGoal: 'improve_health' as const,
      };

      const result = scienceService.getWhyItWorksExplanation(targets, inputs);

      // Verify all sections exist
      expect(result).toHaveProperty('bmr');
      expect(result).toHaveProperty('tdee');
      expect(result).toHaveProperty('calorieTarget');
      expect(result).toHaveProperty('proteinTarget');
      expect(result).toHaveProperty('waterTarget');
      expect(result).toHaveProperty('timeline');

      // Verify all sections have required fields
      expect(result.bmr).toHaveProperty('title');
      expect(result.bmr).toHaveProperty('explanation');
      expect(result.bmr).toHaveProperty('formula');

      expect(result.tdee).toHaveProperty('title');
      expect(result.tdee).toHaveProperty('explanation');
      expect(result.tdee).toHaveProperty('activityMultiplier');

      expect(result.calorieTarget).toHaveProperty('title');
      expect(result.calorieTarget).toHaveProperty('explanation');
      expect(result.calorieTarget).toHaveProperty('deficit');

      expect(result.proteinTarget).toHaveProperty('title');
      expect(result.proteinTarget).toHaveProperty('explanation');
      expect(result.proteinTarget).toHaveProperty('gramsPerKg');

      expect(result.waterTarget).toHaveProperty('title');
      expect(result.waterTarget).toHaveProperty('explanation');
      expect(result.waterTarget).toHaveProperty('mlPerKg');

      expect(result.timeline).toHaveProperty('title');
      expect(result.timeline).toHaveProperty('explanation');
      expect(result.timeline).toHaveProperty('weeklyRate');
      expect(result.timeline).toHaveProperty('estimatedWeeks');
    });
  });
});
