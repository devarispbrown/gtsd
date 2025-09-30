import {
  calculateBMR,
  calculateTDEE,
  calculateCalorieTarget,
  calculateProteinTarget,
  calculateWaterTarget,
  calculateHealthTargets,
  calculateWeightProjection,
  calculateAge,
  getActivityMultiplier,
} from './health-calculations';

describe('Health Calculations', () => {
  describe('calculateBMR', () => {
    it('should calculate BMR correctly for male', () => {
      const bmr = calculateBMR(80, 180, 30, 'male');
      expect(bmr).toBeGreaterThan(1700);
      expect(bmr).toBeLessThan(1900);
    });

    it('should calculate BMR correctly for female', () => {
      const bmr = calculateBMR(65, 165, 30, 'female');
      expect(bmr).toBeGreaterThan(1300);
      expect(bmr).toBeLessThan(1500);
    });

    it('should calculate BMR for other gender as average', () => {
      const bmrMale = calculateBMR(75, 175, 35, 'male');
      const bmrFemale = calculateBMR(75, 175, 35, 'female');
      const bmrOther = calculateBMR(75, 175, 35, 'other');

      expect(bmrOther).toBeGreaterThan(bmrFemale);
      expect(bmrOther).toBeLessThan(bmrMale);
    });

    it('should increase BMR with weight', () => {
      const bmr1 = calculateBMR(60, 170, 30, 'female');
      const bmr2 = calculateBMR(80, 170, 30, 'female');

      expect(bmr2).toBeGreaterThan(bmr1);
    });

    it('should decrease BMR with age', () => {
      const bmr1 = calculateBMR(70, 175, 25, 'male');
      const bmr2 = calculateBMR(70, 175, 55, 'male');

      expect(bmr1).toBeGreaterThan(bmr2);
    });
  });

  describe('getActivityMultiplier', () => {
    it('should return correct multipliers', () => {
      expect(getActivityMultiplier('sedentary')).toBe(1.2);
      expect(getActivityMultiplier('lightly_active')).toBe(1.375);
      expect(getActivityMultiplier('moderately_active')).toBe(1.55);
      expect(getActivityMultiplier('very_active')).toBe(1.725);
      expect(getActivityMultiplier('extremely_active')).toBe(1.9);
    });
  });

  describe('calculateTDEE', () => {
    it('should calculate TDEE correctly', () => {
      const bmr = 1500;
      const tdee = calculateTDEE(bmr, 'moderately_active');

      expect(tdee).toBe(Math.round(1500 * 1.55));
    });

    it('should increase TDEE with activity level', () => {
      const bmr = 1600;
      const tdee1 = calculateTDEE(bmr, 'sedentary');
      const tdee2 = calculateTDEE(bmr, 'extremely_active');

      expect(tdee2).toBeGreaterThan(tdee1);
    });
  });

  describe('calculateCalorieTarget', () => {
    const tdee = 2000;

    it('should create deficit for weight loss', () => {
      const target = calculateCalorieTarget(tdee, 'lose_weight');
      expect(target).toBe(1500); // 500 cal deficit
    });

    it('should create surplus for muscle gain', () => {
      const target = calculateCalorieTarget(tdee, 'gain_muscle');
      expect(target).toBe(2400); // 400 cal surplus
    });

    it('should maintain for maintenance goal', () => {
      const target = calculateCalorieTarget(tdee, 'maintain');
      expect(target).toBe(tdee);
    });

    it('should maintain for health improvement goal', () => {
      const target = calculateCalorieTarget(tdee, 'improve_health');
      expect(target).toBe(tdee);
    });
  });

  describe('calculateProteinTarget', () => {
    it('should calculate higher protein for muscle gain', () => {
      const protein = calculateProteinTarget(80, 'gain_muscle');
      expect(protein).toBe(160); // 2.0g per kg
    });

    it('should calculate higher protein for weight loss', () => {
      const protein = calculateProteinTarget(70, 'lose_weight');
      expect(protein).toBe(126); // 1.8g per kg
    });

    it('should calculate moderate protein for maintenance', () => {
      const protein = calculateProteinTarget(75, 'maintain');
      expect(protein).toBe(90); // 1.2g per kg
    });
  });

  describe('calculateWaterTarget', () => {
    it('should calculate water target as 35ml per kg', () => {
      const water = calculateWaterTarget(70);
      expect(water).toBe(2450); // 70 * 35
    });

    it('should scale with weight', () => {
      const water1 = calculateWaterTarget(60);
      const water2 = calculateWaterTarget(90);

      expect(water2).toBeGreaterThan(water1);
    });
  });

  describe('calculateHealthTargets', () => {
    it('should calculate all targets for weight loss', () => {
      const targets = calculateHealthTargets(
        {
          weight: 75,
          height: 165,
          age: 29,
          gender: 'female',
          activityLevel: 'moderately_active',
        },
        'lose_weight'
      );

      expect(targets.bmr).toBeGreaterThan(1400);
      expect(targets.tdee).toBeGreaterThan(targets.bmr);
      expect(targets.calorieTarget).toBe(targets.tdee - 500);
      expect(targets.proteinTarget).toBeGreaterThan(100);
      expect(targets.waterTarget).toBe(75 * 35);
    });

    it('should calculate all targets for muscle gain', () => {
      const targets = calculateHealthTargets(
        {
          weight: 80,
          height: 180,
          age: 39,
          gender: 'male',
          activityLevel: 'very_active',
        },
        'gain_muscle'
      );

      expect(targets.bmr).toBeGreaterThan(1700);
      expect(targets.tdee).toBeGreaterThan(targets.bmr);
      expect(targets.calorieTarget).toBe(targets.tdee + 400);
      expect(targets.proteinTarget).toBe(160); // 2.0g per kg
    });
  });

  describe('calculateWeightProjection', () => {
    it('should project weight loss correctly', () => {
      const projection = calculateWeightProjection(75, 65, 'lose_weight');

      expect(projection.weeklyRate).toBe(-0.5);
      expect(projection.estimatedWeeks).toBe(20); // 10kg / 0.5kg per week
      expect(projection.projectedDate).toBeInstanceOf(Date);
    });

    it('should project muscle gain correctly', () => {
      const projection = calculateWeightProjection(80, 88, 'gain_muscle');

      expect(projection.weeklyRate).toBe(0.4);
      expect(projection.estimatedWeeks).toBe(20); // 8kg / 0.4kg per week
    });

    it('should return zero for maintenance', () => {
      const projection = calculateWeightProjection(68, 68, 'maintain');

      expect(projection.weeklyRate).toBe(0);
      expect(projection.estimatedWeeks).toBe(0);
    });

    it('should project date correctly', () => {
      const projection = calculateWeightProjection(70, 65, 'lose_weight');
      const today = new Date();
      const expectedDate = new Date(today);
      expectedDate.setDate(expectedDate.getDate() + projection.estimatedWeeks * 7);

      expect(projection.projectedDate.toDateString()).toBe(expectedDate.toDateString());
    });
  });

  describe('calculateAge', () => {
    it('should calculate age correctly', () => {
      const birthDate = new Date();
      birthDate.setFullYear(birthDate.getFullYear() - 30);

      const age = calculateAge(birthDate);
      expect(age).toBe(30);
    });

    it('should handle birthday not yet occurred this year', () => {
      const birthDate = new Date();
      birthDate.setFullYear(birthDate.getFullYear() - 25);
      birthDate.setMonth(birthDate.getMonth() + 1); // Next month

      const age = calculateAge(birthDate);
      expect(age).toBe(24); // Not yet had birthday this year
    });

    it('should handle birthday already occurred', () => {
      const birthDate = new Date();
      birthDate.setFullYear(birthDate.getFullYear() - 35);
      birthDate.setMonth(birthDate.getMonth() - 1); // Last month

      const age = calculateAge(birthDate);
      expect(age).toBe(35);
    });
  });

  describe('Integration: Demo User Profiles', () => {
    it('should calculate correctly for Sarah (29F, weight loss)', () => {
      const targets = calculateHealthTargets(
        {
          weight: 75,
          height: 165,
          age: 29,
          gender: 'female',
          activityLevel: 'moderately_active',
        },
        'lose_weight'
      );

      expect(targets.bmr).toBeCloseTo(1500, -2); // Within 100 cal
      expect(targets.tdee).toBeCloseTo(2325, -2);
      expect(targets.calorieTarget).toBeCloseTo(1825, -2);
    });

    it('should calculate correctly for Marcus (39M, muscle gain)', () => {
      const targets = calculateHealthTargets(
        {
          weight: 80,
          height: 180,
          age: 39,
          gender: 'male',
          activityLevel: 'very_active',
        },
        'gain_muscle'
      );

      expect(targets.bmr).toBeGreaterThan(1700);
      expect(targets.tdee).toBeGreaterThan(2900);
      expect(targets.calorieTarget).toBeGreaterThan(3000);
    });

    it('should calculate correctly for Patricia (56F, maintain)', () => {
      const targets = calculateHealthTargets(
        {
          weight: 68,
          height: 158,
          age: 56,
          gender: 'female',
          activityLevel: 'lightly_active',
        },
        'improve_health'
      );

      expect(targets.bmr).toBeGreaterThan(1200);
      expect(targets.tdee).toBeGreaterThan(1600);
      expect(targets.calorieTarget).toBeGreaterThan(1600);
    });
  });
});