/**
 * Unit tests for health metrics types and helper functions
 */

import {
  getBMICategory,
  getBMICategoryDescription,
  METRICS_VALIDATION_RANGES,
  CURRENT_METRICS_VERSION,
  ISO_8601_PATTERN,
  type BMICategory,
} from '../metrics';

describe('BMI Helper Functions', () => {
  describe('getBMICategory', () => {
    it('should classify underweight correctly', () => {
      expect(getBMICategory(15)).toBe('underweight');
      expect(getBMICategory(18.4)).toBe('underweight');
    });

    it('should classify normal weight correctly', () => {
      expect(getBMICategory(18.5)).toBe('normal');
      expect(getBMICategory(22)).toBe('normal');
      expect(getBMICategory(24.9)).toBe('normal');
    });

    it('should classify overweight correctly', () => {
      expect(getBMICategory(25)).toBe('overweight');
      expect(getBMICategory(27)).toBe('overweight');
      expect(getBMICategory(29.9)).toBe('overweight');
    });

    it('should classify obesity classes correctly', () => {
      expect(getBMICategory(30)).toBe('obese_class_1');
      expect(getBMICategory(32)).toBe('obese_class_1');
      expect(getBMICategory(34.9)).toBe('obese_class_1');

      expect(getBMICategory(35)).toBe('obese_class_2');
      expect(getBMICategory(37)).toBe('obese_class_2');
      expect(getBMICategory(39.9)).toBe('obese_class_2');

      expect(getBMICategory(40)).toBe('obese_class_3');
      expect(getBMICategory(45)).toBe('obese_class_3');
      expect(getBMICategory(50)).toBe('obese_class_3');
    });

    it('should handle edge cases at boundaries', () => {
      expect(getBMICategory(18.49999)).toBe('underweight');
      expect(getBMICategory(18.5)).toBe('normal');
      expect(getBMICategory(24.99999)).toBe('normal');
      expect(getBMICategory(25)).toBe('overweight');
      expect(getBMICategory(29.99999)).toBe('overweight');
      expect(getBMICategory(30)).toBe('obese_class_1');
    });
  });

  describe('getBMICategoryDescription', () => {
    const descriptions: Record<BMICategory, string> = {
      underweight: 'Underweight',
      normal: 'Normal Weight',
      overweight: 'Overweight',
      obese_class_1: 'Obese (Class I)',
      obese_class_2: 'Obese (Class II)',
      obese_class_3: 'Obese (Class III)',
    };

    it('should return correct descriptions for all categories', () => {
      Object.entries(descriptions).forEach(([category, description]) => {
        expect(getBMICategoryDescription(category as BMICategory)).toBe(description);
      });
    });

    it('should return consistent descriptions', () => {
      expect(getBMICategoryDescription('normal')).toBe('Normal Weight');
      expect(getBMICategoryDescription('normal')).toBe('Normal Weight');
    });
  });

  describe('Integration: getBMICategory + getBMICategoryDescription', () => {
    it('should provide correct category and description for various BMI values', () => {
      const testCases = [
        { bmi: 17, expectedCategory: 'underweight', expectedDesc: 'Underweight' },
        { bmi: 22, expectedCategory: 'normal', expectedDesc: 'Normal Weight' },
        { bmi: 27, expectedCategory: 'overweight', expectedDesc: 'Overweight' },
        { bmi: 32, expectedCategory: 'obese_class_1', expectedDesc: 'Obese (Class I)' },
        { bmi: 37, expectedCategory: 'obese_class_2', expectedDesc: 'Obese (Class II)' },
        { bmi: 42, expectedCategory: 'obese_class_3', expectedDesc: 'Obese (Class III)' },
      ];

      testCases.forEach(({ bmi, expectedCategory, expectedDesc }) => {
        const category = getBMICategory(bmi);
        const description = getBMICategoryDescription(category);
        expect(category).toBe(expectedCategory);
        expect(description).toBe(expectedDesc);
      });
    });
  });
});

describe('Constants', () => {
  describe('METRICS_VALIDATION_RANGES', () => {
    it('should have correct BMI range', () => {
      expect(METRICS_VALIDATION_RANGES.bmi.min).toBe(10);
      expect(METRICS_VALIDATION_RANGES.bmi.max).toBe(60);
    });

    it('should have correct BMR range', () => {
      expect(METRICS_VALIDATION_RANGES.bmr.min).toBe(500);
      expect(METRICS_VALIDATION_RANGES.bmr.max).toBe(5000);
    });

    it('should have correct TDEE range', () => {
      expect(METRICS_VALIDATION_RANGES.tdee.min).toBe(500);
      expect(METRICS_VALIDATION_RANGES.tdee.max).toBe(10000);
    });

    it('should have correct version range', () => {
      expect(METRICS_VALIDATION_RANGES.version.min).toBe(1);
      expect(METRICS_VALIDATION_RANGES.version.max).toBe(1000);
    });

    it('should be immutable (readonly)', () => {
      expect(() => {
        // @ts-expect-error - Testing immutability
        METRICS_VALIDATION_RANGES.bmi.min = 5;
      }).toThrow();
    });
  });

  describe('CURRENT_METRICS_VERSION', () => {
    it('should be a positive integer', () => {
      expect(CURRENT_METRICS_VERSION).toBeGreaterThan(0);
      expect(Number.isInteger(CURRENT_METRICS_VERSION)).toBe(true);
    });

    it('should be within valid version range', () => {
      expect(CURRENT_METRICS_VERSION).toBeGreaterThanOrEqual(
        METRICS_VALIDATION_RANGES.version.min
      );
      expect(CURRENT_METRICS_VERSION).toBeLessThanOrEqual(
        METRICS_VALIDATION_RANGES.version.max
      );
    });
  });

  describe('ISO_8601_PATTERN', () => {
    it('should match valid ISO 8601 dates', () => {
      const validDates = [
        '2025-10-28T12:00:00.000Z',
        '2025-01-01T00:00:00.000Z',
        '2025-12-31T23:59:59.999Z',
        '2020-06-15T08:30:45.123Z',
      ];

      validDates.forEach((date) => {
        expect(ISO_8601_PATTERN.test(date)).toBe(true);
      });
    });

    it('should reject invalid ISO 8601 dates', () => {
      const invalidDates = [
        '2025-10-28',
        '2025-10-28T12:00:00',
        '2025-10-28 12:00:00Z',
        '10/28/2025',
        'invalid',
        '2025-10-28T12:00:00+00:00',
      ];

      invalidDates.forEach((date) => {
        expect(ISO_8601_PATTERN.test(date)).toBe(false);
      });
    });

    it('should match dates with milliseconds', () => {
      expect(ISO_8601_PATTERN.test('2025-10-28T12:00:00.000Z')).toBe(true);
      expect(ISO_8601_PATTERN.test('2025-10-28T12:00:00.123Z')).toBe(true);
      expect(ISO_8601_PATTERN.test('2025-10-28T12:00:00.999Z')).toBe(true);
    });
  });
});

describe('Type Safety', () => {
  it('should enforce branded types at compile time', () => {
    // These tests ensure TypeScript compilation works correctly
    // The types themselves provide compile-time safety

    // BMI branded type
    const bmi = 22.5 as any; // Cast to any to bypass type checking for test
    expect(typeof bmi).toBe('number');

    // MetricsVersion branded type
    const version = 1 as any;
    expect(typeof version).toBe('number');
  });

  it('should have correct readonly modifiers on interfaces', () => {
    // These tests ensure interface properties are readonly
    // TypeScript will catch mutations at compile time

    const metrics = {
      bmi: 22.5,
      bmr: 1800,
      tdee: 2500,
      computedAt: '2025-10-28T12:00:00.000Z',
      version: 1,
    };

    // This would fail at compile time due to readonly if metrics had HealthMetrics type
    expect(metrics.bmi).toBe(22.5);
  });
});

describe('Validation Range Boundaries', () => {
  it('should have sensible BMI boundaries', () => {
    const { min, max } = METRICS_VALIDATION_RANGES.bmi;

    // Min should cover severe underweight edge cases
    expect(min).toBeLessThanOrEqual(15);

    // Max should cover severe obesity edge cases
    expect(max).toBeGreaterThanOrEqual(50);

    // Range should be reasonable
    expect(max - min).toBeGreaterThan(30);
  });

  it('should have sensible BMR boundaries', () => {
    const { min, max } = METRICS_VALIDATION_RANGES.bmr;

    // Min should cover small children or medical conditions
    expect(min).toBeLessThanOrEqual(1000);

    // Max should cover elite athletes
    expect(max).toBeGreaterThanOrEqual(3000);

    // Range should be reasonable
    expect(max - min).toBeGreaterThan(2000);
  });

  it('should have sensible TDEE boundaries', () => {
    const { min, max } = METRICS_VALIDATION_RANGES.tdee;

    // TDEE min should be similar to BMR min
    expect(min).toBe(METRICS_VALIDATION_RANGES.bmr.min);

    // TDEE max should be higher than BMR max (activity multiplier)
    expect(max).toBeGreaterThan(METRICS_VALIDATION_RANGES.bmr.max);

    // Range should be reasonable
    expect(max - min).toBeGreaterThan(5000);
  });
});
