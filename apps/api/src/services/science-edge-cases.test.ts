import { scienceService } from './science';
import { db } from '../db/connection';
import { users, userSettings } from '../db/schema';
import { eq } from 'drizzle-orm';

describe('ScienceService - Edge Cases and Comprehensive Coverage', () => {
  let testUserId: number;

  beforeAll(async () => {
    const [user] = await db
      .insert(users)
      .values({
        email: 'science-edge-test@example.com',
        name: 'Science Edge Test',
      })
      .returning();

    testUserId = user.id;
  });

  afterAll(async () => {
    await db.delete(userSettings).where(eq(userSettings.userId, testUserId));
    await db.delete(users).where(eq(users.id, testUserId));
  });

  afterEach(async () => {
    await db.delete(userSettings).where(eq(userSettings.userId, testUserId));
  });

  describe('BMR Calculations - Edge Cases', () => {
    describe('Age Variations', () => {
      it('should calculate BMR for young adults (20 years)', () => {
        const bmrMale = scienceService.calculateBMR(70, 175, 20, 'male');
        const bmrFemale = scienceService.calculateBMR(60, 165, 20, 'female');

        expect(bmrMale).toBeGreaterThan(1600);
        expect(bmrMale).toBeLessThan(1900);
        expect(bmrFemale).toBeGreaterThan(1300);
        expect(bmrFemale).toBeLessThan(1600);
      });

      it('should calculate BMR for middle-aged adults (40 years)', () => {
        const bmrMale = scienceService.calculateBMR(80, 180, 40, 'male');
        const bmrFemale = scienceService.calculateBMR(70, 170, 40, 'female');

        expect(bmrMale).toBeGreaterThan(1600);
        expect(bmrMale).toBeLessThan(1900);
        expect(bmrFemale).toBeGreaterThan(1300);
        expect(bmrFemale).toBeLessThan(1600);
      });

      it('should calculate BMR for older adults (60 years)', () => {
        const bmrMale = scienceService.calculateBMR(75, 175, 60, 'male');
        const bmrFemale = scienceService.calculateBMR(65, 165, 60, 'female');

        expect(bmrMale).toBeGreaterThan(1300);
        expect(bmrMale).toBeLessThan(1700);
        expect(bmrFemale).toBeGreaterThan(1100);
        expect(bmrFemale).toBeLessThan(1400);
      });

      it('should calculate BMR for elderly adults (70+ years)', () => {
        const bmrMale = scienceService.calculateBMR(70, 170, 75, 'male');
        const bmrFemale = scienceService.calculateBMR(60, 160, 75, 'female');

        expect(bmrMale).toBeGreaterThan(1200);
        expect(bmrMale).toBeLessThan(1600);
        expect(bmrFemale).toBeGreaterThan(1000);
        expect(bmrFemale).toBeLessThan(1300);
      });
    });

    describe('Weight Variations', () => {
      it('should calculate BMR for very light individuals (50kg)', () => {
        const bmrMale = scienceService.calculateBMR(50, 165, 30, 'male');
        const bmrFemale = scienceService.calculateBMR(50, 160, 30, 'female');

        expect(bmrMale).toBeGreaterThan(1200);
        expect(bmrMale).toBeLessThan(1600);
        expect(bmrFemale).toBeGreaterThan(1000);
        expect(bmrFemale).toBeLessThan(1400);
      });

      it('should calculate BMR for average weight individuals (70kg)', () => {
        const bmrMale = scienceService.calculateBMR(70, 175, 30, 'male');
        const bmrFemale = scienceService.calculateBMR(70, 170, 30, 'female');

        expect(bmrMale).toBeGreaterThan(1500);
        expect(bmrMale).toBeLessThan(1900);
        expect(bmrFemale).toBeGreaterThan(1300);
        expect(bmrFemale).toBeLessThan(1700);
      });

      it('should calculate BMR for heavy individuals (90kg)', () => {
        const bmrMale = scienceService.calculateBMR(90, 180, 30, 'male');
        const bmrFemale = scienceService.calculateBMR(90, 175, 30, 'female');

        expect(bmrMale).toBeGreaterThan(1800);
        expect(bmrMale).toBeLessThan(2200);
        expect(bmrFemale).toBeGreaterThan(1600);
        expect(bmrFemale).toBeLessThan(2000);
      });

      it('should calculate BMR for very heavy individuals (120kg)', () => {
        const bmrMale = scienceService.calculateBMR(120, 185, 35, 'male');
        const bmrFemale = scienceService.calculateBMR(120, 180, 35, 'female');

        expect(bmrMale).toBeGreaterThan(2150);
        expect(bmrMale).toBeLessThan(2700);
        expect(bmrFemale).toBeGreaterThan(1950);
        expect(bmrFemale).toBeLessThan(2500);
      });
    });

    describe('Height Variations', () => {
      it('should calculate BMR for short individuals (150cm)', () => {
        const bmrMale = scienceService.calculateBMR(60, 150, 30, 'male');
        const bmrFemale = scienceService.calculateBMR(50, 150, 30, 'female');

        expect(bmrMale).toBeGreaterThan(1300);
        expect(bmrMale).toBeLessThan(1700);
        expect(bmrFemale).toBeGreaterThan(1100);
        expect(bmrFemale).toBeLessThan(1400);
      });

      it('should calculate BMR for average height individuals (170cm)', () => {
        const bmrMale = scienceService.calculateBMR(70, 170, 30, 'male');
        const bmrFemale = scienceService.calculateBMR(60, 170, 30, 'female');

        expect(bmrMale).toBeGreaterThan(1500);
        expect(bmrMale).toBeLessThan(1900);
        expect(bmrFemale).toBeGreaterThan(1300);
        expect(bmrFemale).toBeLessThan(1600);
      });

      it('should calculate BMR for tall individuals (190cm)', () => {
        const bmrMale = scienceService.calculateBMR(80, 190, 30, 'male');
        const bmrFemale = scienceService.calculateBMR(70, 190, 30, 'female');

        expect(bmrMale).toBeGreaterThan(1800);
        expect(bmrMale).toBeLessThan(2200);
        expect(bmrFemale).toBeGreaterThan(1550);
        expect(bmrFemale).toBeLessThan(2000);
      });
    });

    describe('Gender Calculations', () => {
      it('should calculate consistently different BMR for male vs female with same stats', () => {
        const weight = 70;
        const height = 170;
        const age = 30;

        const bmrMale = scienceService.calculateBMR(weight, height, age, 'male');
        const bmrFemale = scienceService.calculateBMR(weight, height, age, 'female');
        const bmrOther = scienceService.calculateBMR(weight, height, age, 'other');

        // Male should be higher than female
        expect(bmrMale).toBeGreaterThan(bmrFemale);

        // Difference should be 166 (5 - (-161))
        expect(bmrMale - bmrFemale).toBe(166);

        // Other should be between male and female
        expect(bmrOther).toBeGreaterThan(bmrFemale);
        expect(bmrOther).toBeLessThan(bmrMale);

        // Other should be the average
        expect(bmrOther).toBe(Math.round((bmrMale + bmrFemale) / 2));
      });
    });
  });

  describe('TDEE Calculations - All Activity Levels', () => {
    it('should calculate TDEE correctly across all activity levels', () => {
      const bmr = 1600;

      const results = {
        sedentary: scienceService.calculateTDEE(bmr, 'sedentary'),
        lightly_active: scienceService.calculateTDEE(bmr, 'lightly_active'),
        moderately_active: scienceService.calculateTDEE(bmr, 'moderately_active'),
        very_active: scienceService.calculateTDEE(bmr, 'very_active'),
        extremely_active: scienceService.calculateTDEE(bmr, 'extremely_active'),
      };

      // Verify order: each level should be higher than previous
      expect(results.sedentary).toBe(1920);
      expect(results.lightly_active).toBe(2200);
      expect(results.moderately_active).toBe(2480);
      expect(results.very_active).toBe(2760);
      expect(results.extremely_active).toBe(3040);

      // Verify they're in ascending order
      expect(results.lightly_active).toBeGreaterThan(results.sedentary);
      expect(results.moderately_active).toBeGreaterThan(results.lightly_active);
      expect(results.very_active).toBeGreaterThan(results.moderately_active);
      expect(results.extremely_active).toBeGreaterThan(results.very_active);
    });

    it('should handle decimal BMR values correctly', () => {
      const bmr = 1537.3;
      const tdee = scienceService.calculateTDEE(bmr, 'moderately_active');

      expect(Number.isInteger(tdee)).toBe(true);
      expect(tdee).toBe(Math.round(bmr * 1.55));
    });
  });

  describe('Calorie Target - All Goals', () => {
    it('should apply correct calorie adjustments for all goals', () => {
      const tdee = 2500;

      const targets = {
        lose_weight: scienceService.calculateCalorieTarget(tdee, 'lose_weight'),
        gain_muscle: scienceService.calculateCalorieTarget(tdee, 'gain_muscle'),
        maintain: scienceService.calculateCalorieTarget(tdee, 'maintain'),
        improve_health: scienceService.calculateCalorieTarget(tdee, 'improve_health'),
      };

      expect(targets.lose_weight).toBe(2000);
      expect(targets.gain_muscle).toBe(2900);
      expect(targets.maintain).toBe(2500);
      expect(targets.improve_health).toBe(2500);

      // Verify deficit/surplus
      expect(tdee - targets.lose_weight).toBe(500);
      expect(targets.gain_muscle - tdee).toBe(400);
      expect(targets.maintain - tdee).toBe(0);
      expect(targets.improve_health - tdee).toBe(0);
    });

    it('should handle edge case TDEE values', () => {
      // Very low TDEE
      const lowTarget = scienceService.calculateCalorieTarget(1200, 'lose_weight');
      expect(lowTarget).toBe(700);

      // Very high TDEE
      const highTarget = scienceService.calculateCalorieTarget(4000, 'gain_muscle');
      expect(highTarget).toBe(4400);
    });
  });

  describe('Protein Target - All Goals and Weights', () => {
    it('should calculate protein for all goals', () => {
      const weight = 75;

      const protein = {
        lose_weight: scienceService.calculateProteinTarget(weight, 'lose_weight'),
        gain_muscle: scienceService.calculateProteinTarget(weight, 'gain_muscle'),
        maintain: scienceService.calculateProteinTarget(weight, 'maintain'),
        improve_health: scienceService.calculateProteinTarget(weight, 'improve_health'),
      };

      expect(protein.lose_weight).toBe(165);
      expect(protein.gain_muscle).toBe(180);
      expect(protein.maintain).toBe(135);
      expect(protein.improve_health).toBe(135);

      // Verify gain_muscle has highest protein
      expect(protein.gain_muscle).toBeGreaterThan(protein.lose_weight);
      expect(protein.lose_weight).toBeGreaterThan(protein.maintain);
    });

    it('should handle decimal weight values', () => {
      const weight = 72.8;
      const protein = scienceService.calculateProteinTarget(weight, 'lose_weight');

      expect(Number.isInteger(protein)).toBe(true);
      expect(protein).toBe(Math.round(weight * 2.2));
    });
  });

  describe('Water Target Calculations', () => {
    it('should calculate water for various weights', () => {
      const weights = [50, 60, 70, 80, 90, 100, 110, 120];
      const waterTargets = weights.map((w) => scienceService.calculateWaterTarget(w));

      // Verify all are integers rounded to nearest 100ml
      waterTargets.forEach((target) => {
        expect(Number.isInteger(target)).toBe(true);
        expect(target % 100).toBe(0);
      });

      // Verify they increase with weight
      for (let i = 1; i < waterTargets.length; i++) {
        expect(waterTargets[i]).toBeGreaterThanOrEqual(waterTargets[i - 1]);
      }
    });

    it('should round edge cases correctly', () => {
      // Test rounding logic
      expect(scienceService.calculateWaterTarget(71)).toBe(2500);
      expect(scienceService.calculateWaterTarget(72)).toBe(2500);
      expect(scienceService.calculateWaterTarget(73)).toBe(2600);
      expect(scienceService.calculateWaterTarget(74)).toBe(2600);
    });
  });

  describe('Projection Calculations', () => {
    it('should calculate projections for aggressive weight loss', () => {
      const result = scienceService.calculateProjection(100, 80, -0.5);

      expect(result.estimatedWeeks).toBe(40);
      expect(result.projectedDate).toBeInstanceOf(Date);
    });

    it('should calculate projections for moderate weight loss', () => {
      const result = scienceService.calculateProjection(80, 75, -0.5);

      expect(result.estimatedWeeks).toBe(10);
      expect(result.projectedDate).toBeInstanceOf(Date);
    });

    it('should calculate projections for muscle gain', () => {
      const result = scienceService.calculateProjection(70, 80, 0.4);

      expect(result.estimatedWeeks).toBe(25);
      expect(result.projectedDate).toBeInstanceOf(Date);
    });

    it('should handle fractional weight differences', () => {
      const result = scienceService.calculateProjection(75.5, 73.2, -0.5);

      expect(result.estimatedWeeks).toBe(5);
    });

    it('should return undefined for zero weekly rate', () => {
      const result = scienceService.calculateProjection(75, 75, 0);

      expect(result.estimatedWeeks).toBeUndefined();
      expect(result.projectedDate).toBeUndefined();
    });
  });

  describe('Complete Integration Tests', () => {
    it('should compute targets for extreme weight loss scenario', async () => {
      await db.insert(userSettings).values({
        userId: testUserId,
        dateOfBirth: new Date('1985-06-15'),
        gender: 'male',
        currentWeight: '150',
        height: '180',
        targetWeight: '90',
        activityLevel: 'sedentary',
        primaryGoal: 'lose_weight',
        onboardingCompleted: true,
      });

      const result = await scienceService.computeAllTargets(testUserId);

      expect(result.bmr).toBeGreaterThan(2000);
      expect(result.tdee).toBeGreaterThan(2400);
      expect(result.calorieTarget).toBe(result.tdee - 500);
      expect(result.proteinTarget).toBe(330);
      expect(result.waterTarget).toBe(5300);
      expect(result.weeklyRate).toBe(-0.5);
      expect(result.estimatedWeeks).toBe(120);
    });

    it('should compute targets for aggressive muscle gain scenario', async () => {
      await db.insert(userSettings).values({
        userId: testUserId,
        dateOfBirth: new Date('2000-01-01'),
        gender: 'male',
        currentWeight: '60',
        height: '175',
        targetWeight: '80',
        activityLevel: 'very_active',
        primaryGoal: 'gain_muscle',
        onboardingCompleted: true,
      });

      const result = await scienceService.computeAllTargets(testUserId);

      expect(result.bmr).toBeGreaterThan(1400);
      expect(result.tdee).toBeGreaterThan(2400);
      expect(result.calorieTarget).toBe(result.tdee + 400);
      expect(result.proteinTarget).toBe(144);
      expect(result.waterTarget).toBe(2100);
      expect(result.weeklyRate).toBe(0.4);
      expect(result.estimatedWeeks).toBe(50);
    });

    it('should compute targets for petite female', async () => {
      await db.insert(userSettings).values({
        userId: testUserId,
        dateOfBirth: new Date('1995-03-10'),
        gender: 'female',
        currentWeight: '50',
        height: '155',
        targetWeight: '48',
        activityLevel: 'lightly_active',
        primaryGoal: 'lose_weight',
        onboardingCompleted: true,
      });

      const result = await scienceService.computeAllTargets(testUserId);

      expect(result.bmr).toBeGreaterThan(1100);
      expect(result.bmr).toBeLessThan(1400);
      expect(result.tdee).toBeGreaterThan(1500);
      expect(result.calorieTarget).toBe(result.tdee - 500);
      expect(result.proteinTarget).toBe(110);
      expect(result.waterTarget).toBe(1800);
      expect(result.weeklyRate).toBe(-0.5);
      expect(result.estimatedWeeks).toBe(4);
    });

    it('should compute targets for tall active male', async () => {
      await db.insert(userSettings).values({
        userId: testUserId,
        dateOfBirth: new Date('1992-07-20'),
        gender: 'male',
        currentWeight: '90',
        height: '195',
        targetWeight: '85',
        activityLevel: 'extremely_active',
        primaryGoal: 'lose_weight',
        onboardingCompleted: true,
      });

      const result = await scienceService.computeAllTargets(testUserId);

      expect(result.bmr).toBeGreaterThan(1900);
      expect(result.tdee).toBeGreaterThan(3600);
      expect(result.calorieTarget).toBe(result.tdee - 500);
      expect(result.proteinTarget).toBe(198);
      expect(result.waterTarget).toBe(3200);
      expect(result.weeklyRate).toBe(-0.5);
      expect(result.estimatedWeeks).toBe(10);
    });
  });

  describe('Performance Tests', () => {
    it('should compute targets within 100ms for typical scenario', async () => {
      await db.insert(userSettings).values({
        userId: testUserId,
        dateOfBirth: new Date('1990-01-01'),
        gender: 'male',
        currentWeight: '75',
        height: '175',
        targetWeight: '70',
        activityLevel: 'moderately_active',
        primaryGoal: 'lose_weight',
        onboardingCompleted: true,
      });

      const startTime = performance.now();
      await scienceService.computeAllTargets(testUserId);
      const duration = performance.now() - startTime;

      expect(duration).toBeLessThan(100);
    });

    it('should compute BMR within 1ms', () => {
      const startTime = performance.now();

      for (let i = 0; i < 1000; i++) {
        scienceService.calculateBMR(75, 175, 30, 'male');
      }

      const duration = performance.now() - startTime;

      expect(duration).toBeLessThan(10);
    });
  });
});
