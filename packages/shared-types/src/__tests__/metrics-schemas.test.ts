/**
 * Unit tests for health metrics Zod schemas and validators
 */

import {
  bmiSchema,
  bmrSchema,
  tdeeSchema,
  metricsVersionSchema,
  iso8601DateSchema,
  pastIso8601DateSchema,
  healthMetricsSchema,
  metricsExplanationsSchema,
  metricsAcknowledgementSchema,
  metricsSummaryResponseSchema,
  acknowledgeMetricsRequestSchema,
  acknowledgeMetricsResponseSchema,
  validateHealthMetrics,
  validateMetricsSummary,
  validateAcknowledgementRequest,
} from '../metrics-schemas';

describe('Primitive Schemas', () => {
  describe('bmiSchema', () => {
    it('should validate valid BMI values', () => {
      expect(bmiSchema.parse(15)).toBe(15);
      expect(bmiSchema.parse(22.5)).toBe(22.5);
      expect(bmiSchema.parse(30.0)).toBe(30.0);
      expect(bmiSchema.parse(50)).toBe(50);
    });

    it('should reject invalid BMI values', () => {
      expect(() => bmiSchema.parse(5)).toThrow(); // Too low
      expect(() => bmiSchema.parse(65)).toThrow(); // Too high
      expect(() => bmiSchema.parse(NaN)).toThrow();
      expect(() => bmiSchema.parse(Infinity)).toThrow();
      expect(() => bmiSchema.parse('22.5')).toThrow(); // String
      expect(() => bmiSchema.parse(null)).toThrow();
      expect(() => bmiSchema.parse(undefined)).toThrow();
    });
  });

  describe('bmrSchema', () => {
    it('should validate valid BMR values', () => {
      expect(bmrSchema.parse(1000)).toBe(1000);
      expect(bmrSchema.parse(1800)).toBe(1800);
      expect(bmrSchema.parse(2500)).toBe(2500);
      expect(bmrSchema.parse(4000)).toBe(4000);
    });

    it('should reject invalid BMR values', () => {
      expect(() => bmrSchema.parse(400)).toThrow(); // Too low
      expect(() => bmrSchema.parse(6000)).toThrow(); // Too high
      expect(() => bmrSchema.parse(1800.5)).toThrow(); // Not integer
      expect(() => bmrSchema.parse('1800')).toThrow(); // String
      expect(() => bmrSchema.parse(null)).toThrow();
    });

    it('should provide meaningful error messages', () => {
      try {
        bmrSchema.parse(400);
        fail('Should have thrown');
      } catch (error: any) {
        expect(error.issues[0].message).toContain('500');
      }
    });
  });

  describe('tdeeSchema', () => {
    it('should validate valid TDEE values', () => {
      expect(tdeeSchema.parse(1500)).toBe(1500);
      expect(tdeeSchema.parse(2500)).toBe(2500);
      expect(tdeeSchema.parse(3500)).toBe(3500);
      expect(tdeeSchema.parse(8000)).toBe(8000);
    });

    it('should reject invalid TDEE values', () => {
      expect(() => tdeeSchema.parse(400)).toThrow(); // Too low
      expect(() => tdeeSchema.parse(12000)).toThrow(); // Too high
      expect(() => tdeeSchema.parse(2500.5)).toThrow(); // Not integer
      expect(() => tdeeSchema.parse('2500')).toThrow(); // String
    });
  });

  describe('metricsVersionSchema', () => {
    it('should validate valid version numbers', () => {
      expect(metricsVersionSchema.parse(1)).toBe(1);
      expect(metricsVersionSchema.parse(10)).toBe(10);
      expect(metricsVersionSchema.parse(100)).toBe(100);
      expect(metricsVersionSchema.parse(999)).toBe(999);
    });

    it('should reject invalid version numbers', () => {
      expect(() => metricsVersionSchema.parse(0)).toThrow(); // Zero
      expect(() => metricsVersionSchema.parse(-1)).toThrow(); // Negative
      expect(() => metricsVersionSchema.parse(1001)).toThrow(); // Too high
      expect(() => metricsVersionSchema.parse(1.5)).toThrow(); // Not integer
      expect(() => metricsVersionSchema.parse('1')).toThrow(); // String
    });
  });

  describe('iso8601DateSchema', () => {
    it('should validate valid ISO 8601 dates', () => {
      const date1 = '2025-10-28T12:00:00.000Z';
      const date2 = '2025-01-01T00:00:00.000Z';
      const date3 = '2025-12-31T23:59:59.999Z';

      expect(iso8601DateSchema.parse(date1)).toBe(date1);
      expect(iso8601DateSchema.parse(date2)).toBe(date2);
      expect(iso8601DateSchema.parse(date3)).toBe(date3);
    });

    it('should reject invalid ISO 8601 dates', () => {
      expect(() => iso8601DateSchema.parse('2025-10-28')).toThrow(); // Missing time
      expect(() => iso8601DateSchema.parse('2025-10-28T12:00:00')).toThrow(); // Missing Z
      expect(() => iso8601DateSchema.parse('invalid')).toThrow();
      expect(() => iso8601DateSchema.parse(123456789)).toThrow(); // Number
      expect(() => iso8601DateSchema.parse(null)).toThrow();
    });

    it('should provide meaningful error messages', () => {
      try {
        iso8601DateSchema.parse('invalid');
        fail('Should have thrown');
      } catch (error: any) {
        expect(error.issues[0].message).toContain('ISO 8601');
      }
    });
  });

  describe('pastIso8601DateSchema', () => {
    it('should validate past dates', () => {
      const pastDate = new Date(Date.now() - 86400000).toISOString();
      expect(pastIso8601DateSchema.parse(pastDate)).toBe(pastDate);
    });

    it('should reject future dates', () => {
      const futureDate = new Date(Date.now() + 86400000).toISOString();
      expect(() => pastIso8601DateSchema.parse(futureDate)).toThrow();
    });
  });
});

describe('Complex Type Schemas', () => {
  describe('healthMetricsSchema', () => {
    const validMetrics = {
      bmi: 22.5,
      bmr: 1800,
      tdee: 2500,
      computedAt: '2025-10-28T12:00:00.000Z',
      version: 1,
    };

    it('should validate valid HealthMetrics', () => {
      const result = healthMetricsSchema.parse(validMetrics);
      expect(result).toEqual(validMetrics);
    });

    it('should reject metrics with TDEE < BMR', () => {
      const invalidMetrics = {
        ...validMetrics,
        bmr: 3000,
        tdee: 2500,
      };
      expect(() => healthMetricsSchema.parse(invalidMetrics)).toThrow();
    });

    it('should reject metrics with missing fields', () => {
      const { bmi, ...incomplete } = validMetrics;
      expect(() => healthMetricsSchema.parse(incomplete)).toThrow();
    });

    it('should reject metrics with extra fields', () => {
      const withExtra = {
        ...validMetrics,
        extraField: 'unexpected',
      };
      expect(() => healthMetricsSchema.parse(withExtra)).toThrow();
    });

    it('should validate using safeParse', () => {
      const result = healthMetricsSchema.safeParse(validMetrics);
      expect(result.success).toBe(true);

      const invalidResult = healthMetricsSchema.safeParse({ bmi: 100 });
      expect(invalidResult.success).toBe(false);
    });
  });

  describe('metricsExplanationsSchema', () => {
    const validExplanations = {
      bmi: 'Your BMI is in the normal range.',
      bmr: 'Your body burns 1800 calories at rest.',
      tdee: 'You burn 2500 calories per day.',
    };

    it('should validate valid MetricsExplanations', () => {
      const result = metricsExplanationsSchema.parse(validExplanations);
      expect(result).toEqual(validExplanations);
    });

    it('should trim whitespace', () => {
      const withWhitespace = {
        bmi: '  Your BMI is normal.  ',
        bmr: '  Your BMR is 1800.  ',
        tdee: '  Your TDEE is 2500.  ',
      };
      const result = metricsExplanationsSchema.parse(withWhitespace);
      expect(result.bmi).toBe('Your BMI is normal.');
    });

    it('should reject empty strings', () => {
      expect(() =>
        metricsExplanationsSchema.parse({ ...validExplanations, bmi: '' })
      ).toThrow();
      expect(() =>
        metricsExplanationsSchema.parse({ ...validExplanations, bmi: '   ' })
      ).toThrow();
    });

    it('should reject strings over 1000 characters', () => {
      const longString = 'a'.repeat(1001);
      expect(() =>
        metricsExplanationsSchema.parse({ ...validExplanations, bmi: longString })
      ).toThrow();
    });
  });

  describe('metricsAcknowledgementSchema', () => {
    const validAcknowledgement = {
      acknowledgedAt: '2025-10-28T12:00:00.000Z',
      version: 1,
    };

    it('should validate valid MetricsAcknowledgement', () => {
      const result = metricsAcknowledgementSchema.parse(validAcknowledgement);
      expect(result).toEqual(validAcknowledgement);
    });

    it('should reject future dates', () => {
      const futureDate = new Date(Date.now() + 86400000).toISOString();
      const invalid = {
        ...validAcknowledgement,
        acknowledgedAt: futureDate,
      };
      expect(() => metricsAcknowledgementSchema.parse(invalid)).toThrow();
    });

    it('should reject extra fields', () => {
      const withExtra = {
        ...validAcknowledgement,
        extraField: 'unexpected',
      };
      expect(() => metricsAcknowledgementSchema.parse(withExtra)).toThrow();
    });
  });

  describe('metricsSummaryResponseSchema', () => {
    const validResponse = {
      metrics: {
        bmi: 22.5,
        bmr: 1800,
        tdee: 2500,
        computedAt: '2025-10-28T12:00:00.000Z',
        version: 1,
      },
      explanations: {
        bmi: 'Your BMI is in the normal range.',
        bmr: 'Your body burns 1800 calories at rest.',
        tdee: 'You burn 2500 calories per day.',
      },
      acknowledged: true,
      acknowledgement: {
        acknowledgedAt: '2025-10-28T12:30:00.000Z',
        version: 1,
      },
    };

    it('should validate valid response with acknowledgement', () => {
      const result = metricsSummaryResponseSchema.parse(validResponse);
      expect(result).toEqual(validResponse);
    });

    it('should validate valid response without acknowledgement', () => {
      const withoutAck = {
        ...validResponse,
        acknowledged: false,
        acknowledgement: undefined,
      };
      const result = metricsSummaryResponseSchema.parse(withoutAck);
      expect(result.acknowledged).toBe(false);
      expect(result.acknowledgement).toBeUndefined();
    });

    it('should reject acknowledged=true without acknowledgement', () => {
      const { acknowledgement, ...invalid } = validResponse;
      expect(() => metricsSummaryResponseSchema.parse(invalid)).toThrow();
    });

    it('should reject acknowledged=false with acknowledgement', () => {
      const invalid = {
        ...validResponse,
        acknowledged: false,
      };
      expect(() => metricsSummaryResponseSchema.parse(invalid)).toThrow();
    });

    it('should reject version mismatch', () => {
      const invalid = {
        ...validResponse,
        acknowledgement: {
          ...validResponse.acknowledgement!,
          version: 2,
        },
      };
      expect(() => metricsSummaryResponseSchema.parse(invalid)).toThrow();
    });

    it('should reject acknowledgedAt before computedAt', () => {
      const invalid = {
        ...validResponse,
        acknowledgement: {
          acknowledgedAt: '2025-10-28T11:00:00.000Z',
          version: 1,
        },
      };
      expect(() => metricsSummaryResponseSchema.parse(invalid)).toThrow();
    });
  });

  describe('acknowledgeMetricsRequestSchema', () => {
    const validRequest = {
      version: 1,
      metricsComputedAt: '2025-10-28T12:00:00.000Z',
    };

    it('should validate valid request', () => {
      const result = acknowledgeMetricsRequestSchema.parse(validRequest);
      expect(result).toEqual(validRequest);
    });

    it('should reject missing fields', () => {
      expect(() => acknowledgeMetricsRequestSchema.parse({ version: 1 })).toThrow();
      expect(() =>
        acknowledgeMetricsRequestSchema.parse({
          metricsComputedAt: '2025-10-28T12:00:00.000Z',
        })
      ).toThrow();
    });

    it('should reject extra fields', () => {
      const withExtra = {
        ...validRequest,
        extraField: 'unexpected',
      };
      expect(() => acknowledgeMetricsRequestSchema.parse(withExtra)).toThrow();
    });
  });

  describe('acknowledgeMetricsResponseSchema', () => {
    const validResponse = {
      success: true,
      acknowledgedAt: '2025-10-28T12:00:00.000Z',
    };

    it('should validate valid response', () => {
      const result = acknowledgeMetricsResponseSchema.parse(validResponse);
      expect(result).toEqual(validResponse);
    });

    it('should reject success=false', () => {
      const invalid = {
        ...validResponse,
        success: false,
      };
      expect(() => acknowledgeMetricsResponseSchema.parse(invalid)).toThrow();
    });

    it('should reject future dates', () => {
      const futureDate = new Date(Date.now() + 86400000).toISOString();
      const invalid = {
        ...validResponse,
        acknowledgedAt: futureDate,
      };
      expect(() => acknowledgeMetricsResponseSchema.parse(invalid)).toThrow();
    });
  });
});

describe('Validation Helper Functions', () => {
  describe('validateHealthMetrics', () => {
    const validMetrics = {
      bmi: 22.5,
      bmr: 1800,
      tdee: 2500,
      computedAt: '2025-10-28T12:00:00.000Z',
      version: 1,
    };

    it('should return success for valid metrics', () => {
      const result = validateHealthMetrics(validMetrics);
      expect(result.success).toBe(true);
      expect(result.data).toEqual(validMetrics);
      expect(result.errors).toBeUndefined();
    });

    it('should return errors for invalid metrics', () => {
      const result = validateHealthMetrics({ bmi: 100 });
      expect(result.success).toBe(false);
      expect(result.data).toBeUndefined();
      expect(result.errors).toBeDefined();
      expect(result.errors!.length).toBeGreaterThan(0);
    });

    it('should provide detailed error messages', () => {
      const result = validateHealthMetrics({ bmi: 100, bmr: 100, tdee: 50 });
      expect(result.success).toBe(false);
      expect(result.errors!.some((e) => e.includes('BMI'))).toBe(true);
      expect(result.errors!.some((e) => e.includes('BMR'))).toBe(true);
      expect(result.errors!.some((e) => e.includes('TDEE'))).toBe(true);
    });
  });

  describe('validateMetricsSummary', () => {
    const validResponse = {
      metrics: {
        bmi: 22.5,
        bmr: 1800,
        tdee: 2500,
        computedAt: '2025-10-28T12:00:00.000Z',
        version: 1,
      },
      explanations: {
        bmi: 'Test',
        bmr: 'Test',
        tdee: 'Test',
      },
      acknowledged: false,
    };

    it('should return success for valid summary', () => {
      const result = validateMetricsSummary(validResponse);
      expect(result.success).toBe(true);
      expect(result.data).toEqual(validResponse);
    });

    it('should return errors for invalid summary', () => {
      const result = validateMetricsSummary({});
      expect(result.success).toBe(false);
      expect(result.errors).toBeDefined();
      expect(result.errors!.length).toBeGreaterThan(0);
    });
  });

  describe('validateAcknowledgementRequest', () => {
    const validRequest = {
      version: 1,
      metricsComputedAt: '2025-10-28T12:00:00.000Z',
    };

    it('should return success for valid request', () => {
      const result = validateAcknowledgementRequest(validRequest);
      expect(result.success).toBe(true);
      expect(result.data).toEqual(validRequest);
    });

    it('should return errors for invalid request', () => {
      const result = validateAcknowledgementRequest({ version: 'invalid' });
      expect(result.success).toBe(false);
      expect(result.errors).toBeDefined();
      expect(result.errors!.length).toBeGreaterThan(0);
    });

    it('should provide field-specific errors', () => {
      const result = validateAcknowledgementRequest({
        version: 0,
        metricsComputedAt: 'invalid',
      });
      expect(result.success).toBe(false);
      expect(result.errors!.some((e) => e.includes('version'))).toBe(true);
      expect(result.errors!.some((e) => e.includes('metricsComputedAt'))).toBe(true);
    });
  });
});
