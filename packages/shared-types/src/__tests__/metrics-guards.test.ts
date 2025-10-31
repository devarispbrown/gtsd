/**
 * Unit tests for health metrics type guards
 */

import {
  isValidBMI,
  isValidBMR,
  isValidTDEE,
  isValidMetricsVersion,
  isValidISO8601Date,
  isHealthMetrics,
  isMetricsExplanations,
  isMetricsAcknowledgement,
  isMetricsSummaryResponse,
  isAcknowledgeMetricsRequest,
  isAcknowledgeMetricsResponse,
  assertHealthMetrics,
  assertMetricsSummaryResponse,
  assertAcknowledgeMetricsRequest,
  assertAcknowledgeMetricsResponse,
} from '../metrics-guards';

describe('Primitive Type Guards', () => {
  describe('isValidBMI', () => {
    it('should return true for valid BMI values', () => {
      expect(isValidBMI(15)).toBe(true);
      expect(isValidBMI(22.5)).toBe(true);
      expect(isValidBMI(30)).toBe(true);
      expect(isValidBMI(50)).toBe(true);
    });

    it('should return false for invalid BMI values', () => {
      expect(isValidBMI(5)).toBe(false); // Too low
      expect(isValidBMI(65)).toBe(false); // Too high
      expect(isValidBMI(NaN)).toBe(false);
      expect(isValidBMI(Infinity)).toBe(false);
      expect(isValidBMI('22.5')).toBe(false); // String
      expect(isValidBMI(null)).toBe(false);
      expect(isValidBMI(undefined)).toBe(false);
    });
  });

  describe('isValidBMR', () => {
    it('should return true for valid BMR values', () => {
      expect(isValidBMR(1000)).toBe(true);
      expect(isValidBMR(1800)).toBe(true);
      expect(isValidBMR(2500)).toBe(true);
      expect(isValidBMR(4000)).toBe(true);
    });

    it('should return false for invalid BMR values', () => {
      expect(isValidBMR(400)).toBe(false); // Too low
      expect(isValidBMR(6000)).toBe(false); // Too high
      expect(isValidBMR(1800.5)).toBe(false); // Not integer
      expect(isValidBMR(NaN)).toBe(false);
      expect(isValidBMR('1800')).toBe(false); // String
      expect(isValidBMR(null)).toBe(false);
    });
  });

  describe('isValidTDEE', () => {
    it('should return true for valid TDEE values', () => {
      expect(isValidTDEE(1500)).toBe(true);
      expect(isValidTDEE(2500)).toBe(true);
      expect(isValidTDEE(3500)).toBe(true);
      expect(isValidTDEE(8000)).toBe(true);
    });

    it('should return false for invalid TDEE values', () => {
      expect(isValidTDEE(400)).toBe(false); // Too low
      expect(isValidTDEE(12000)).toBe(false); // Too high
      expect(isValidTDEE(2500.5)).toBe(false); // Not integer
      expect(isValidTDEE(NaN)).toBe(false);
      expect(isValidTDEE('2500')).toBe(false); // String
    });
  });

  describe('isValidMetricsVersion', () => {
    it('should return true for valid version numbers', () => {
      expect(isValidMetricsVersion(1)).toBe(true);
      expect(isValidMetricsVersion(10)).toBe(true);
      expect(isValidMetricsVersion(100)).toBe(true);
      expect(isValidMetricsVersion(999)).toBe(true);
    });

    it('should return false for invalid version numbers', () => {
      expect(isValidMetricsVersion(0)).toBe(false); // Zero
      expect(isValidMetricsVersion(-1)).toBe(false); // Negative
      expect(isValidMetricsVersion(1001)).toBe(false); // Too high
      expect(isValidMetricsVersion(1.5)).toBe(false); // Not integer
      expect(isValidMetricsVersion('1')).toBe(false); // String
    });
  });

  describe('isValidISO8601Date', () => {
    it('should return true for valid ISO 8601 dates', () => {
      expect(isValidISO8601Date('2025-10-28T12:00:00.000Z')).toBe(true);
      expect(isValidISO8601Date('2025-01-01T00:00:00.000Z')).toBe(true);
      expect(isValidISO8601Date('2025-12-31T23:59:59.999Z')).toBe(true);
    });

    it('should return false for invalid ISO 8601 dates', () => {
      expect(isValidISO8601Date('2025-10-28')).toBe(false); // Missing time
      expect(isValidISO8601Date('2025-10-28T12:00:00')).toBe(false); // Missing Z
      expect(isValidISO8601Date('invalid')).toBe(false);
      expect(isValidISO8601Date(123456789)).toBe(false); // Number
      expect(isValidISO8601Date(new Date())).toBe(false); // Date object
      expect(isValidISO8601Date(null)).toBe(false);
    });
  });
});

describe('Complex Type Guards', () => {
  describe('isHealthMetrics', () => {
    const validMetrics = {
      bmi: 22.5,
      bmr: 1800,
      tdee: 2500,
      computedAt: '2025-10-28T12:00:00.000Z',
      version: 1,
    };

    it('should return true for valid HealthMetrics', () => {
      expect(isHealthMetrics(validMetrics)).toBe(true);
    });

    it('should return false for invalid HealthMetrics', () => {
      expect(isHealthMetrics(null)).toBe(false);
      expect(isHealthMetrics(undefined)).toBe(false);
      expect(isHealthMetrics('not an object')).toBe(false);
      expect(isHealthMetrics({})).toBe(false);

      // Missing fields
      expect(isHealthMetrics({ ...validMetrics, bmi: undefined })).toBe(false);
      expect(isHealthMetrics({ ...validMetrics, bmr: undefined })).toBe(false);

      // Invalid values
      expect(isHealthMetrics({ ...validMetrics, bmi: 100 })).toBe(false); // BMI too high
      expect(isHealthMetrics({ ...validMetrics, bmr: 100 })).toBe(false); // BMR too low
      expect(isHealthMetrics({ ...validMetrics, tdee: 1000 })).toBe(false); // TDEE < BMR
      expect(isHealthMetrics({ ...validMetrics, version: 0 })).toBe(false); // Invalid version
      expect(isHealthMetrics({ ...validMetrics, computedAt: 'invalid' })).toBe(false);
    });
  });

  describe('isMetricsExplanations', () => {
    const validExplanations = {
      bmi: 'Your BMI is in the normal range.',
      bmr: 'Your body burns 1800 calories at rest.',
      tdee: 'You burn 2500 calories per day.',
    };

    it('should return true for valid MetricsExplanations', () => {
      expect(isMetricsExplanations(validExplanations)).toBe(true);
    });

    it('should return false for invalid MetricsExplanations', () => {
      expect(isMetricsExplanations(null)).toBe(false);
      expect(isMetricsExplanations({})).toBe(false);

      // Missing fields
      expect(isMetricsExplanations({ ...validExplanations, bmi: undefined })).toBe(false);

      // Empty strings
      expect(isMetricsExplanations({ ...validExplanations, bmi: '' })).toBe(false);
      expect(isMetricsExplanations({ ...validExplanations, bmi: '   ' })).toBe(false);

      // Too long
      const longString = 'a'.repeat(1001);
      expect(isMetricsExplanations({ ...validExplanations, bmi: longString })).toBe(false);

      // Wrong types
      expect(isMetricsExplanations({ ...validExplanations, bmi: 123 })).toBe(false);
    });
  });

  describe('isMetricsAcknowledgement', () => {
    const validAcknowledgement = {
      acknowledgedAt: '2025-10-28T12:00:00.000Z',
      version: 1,
    };

    it('should return true for valid MetricsAcknowledgement', () => {
      expect(isMetricsAcknowledgement(validAcknowledgement)).toBe(true);
    });

    it('should return false for invalid MetricsAcknowledgement', () => {
      expect(isMetricsAcknowledgement(null)).toBe(false);
      expect(isMetricsAcknowledgement({})).toBe(false);

      // Future date
      const futureDate = new Date(Date.now() + 86400000).toISOString();
      expect(
        isMetricsAcknowledgement({
          ...validAcknowledgement,
          acknowledgedAt: futureDate,
        })
      ).toBe(false);

      // Invalid values
      expect(isMetricsAcknowledgement({ ...validAcknowledgement, version: 0 })).toBe(
        false
      );
      expect(
        isMetricsAcknowledgement({ ...validAcknowledgement, acknowledgedAt: 'invalid' })
      ).toBe(false);
    });
  });

  describe('isMetricsSummaryResponse', () => {
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

    it('should return true for valid MetricsSummaryResponse', () => {
      expect(isMetricsSummaryResponse(validResponse)).toBe(true);

      // Without acknowledgement when acknowledged is false
      const responseWithoutAck = {
        ...validResponse,
        acknowledged: false,
        acknowledgement: undefined,
      };
      expect(isMetricsSummaryResponse(responseWithoutAck)).toBe(true);
    });

    it('should return false for invalid MetricsSummaryResponse', () => {
      expect(isMetricsSummaryResponse(null)).toBe(false);
      expect(isMetricsSummaryResponse({})).toBe(false);

      // Missing acknowledgement when acknowledged is true
      const missingAck = {
        ...validResponse,
        acknowledged: true,
        acknowledgement: undefined,
      };
      expect(isMetricsSummaryResponse(missingAck)).toBe(false);

      // Present acknowledgement when acknowledged is false
      const unexpectedAck = {
        ...validResponse,
        acknowledged: false,
      };
      expect(isMetricsSummaryResponse(unexpectedAck)).toBe(false);

      // Version mismatch
      const versionMismatch = {
        ...validResponse,
        acknowledgement: {
          ...validResponse.acknowledgement!,
          version: 2,
        },
      };
      expect(isMetricsSummaryResponse(versionMismatch)).toBe(false);

      // AcknowledgedAt before computedAt
      const timeOrderIssue = {
        ...validResponse,
        acknowledgement: {
          acknowledgedAt: '2025-10-28T11:00:00.000Z',
          version: 1,
        },
      };
      expect(isMetricsSummaryResponse(timeOrderIssue)).toBe(false);
    });
  });

  describe('isAcknowledgeMetricsRequest', () => {
    const validRequest = {
      version: 1,
      metricsComputedAt: '2025-10-28T12:00:00.000Z',
    };

    it('should return true for valid AcknowledgeMetricsRequest', () => {
      expect(isAcknowledgeMetricsRequest(validRequest)).toBe(true);
    });

    it('should return false for invalid AcknowledgeMetricsRequest', () => {
      expect(isAcknowledgeMetricsRequest(null)).toBe(false);
      expect(isAcknowledgeMetricsRequest({})).toBe(false);

      // Invalid version
      expect(isAcknowledgeMetricsRequest({ ...validRequest, version: 0 })).toBe(false);

      // Invalid date
      expect(
        isAcknowledgeMetricsRequest({ ...validRequest, metricsComputedAt: 'invalid' })
      ).toBe(false);
    });
  });

  describe('isAcknowledgeMetricsResponse', () => {
    const validResponse = {
      success: true,
      acknowledgedAt: '2025-10-28T12:00:00.000Z',
    };

    it('should return true for valid AcknowledgeMetricsResponse', () => {
      expect(isAcknowledgeMetricsResponse(validResponse)).toBe(true);
    });

    it('should return false for invalid AcknowledgeMetricsResponse', () => {
      expect(isAcknowledgeMetricsResponse(null)).toBe(false);
      expect(isAcknowledgeMetricsResponse({})).toBe(false);

      // success is false (should always be true)
      expect(isAcknowledgeMetricsResponse({ ...validResponse, success: false })).toBe(
        false
      );

      // Future date
      const futureDate = new Date(Date.now() + 86400000).toISOString();
      expect(
        isAcknowledgeMetricsResponse({ ...validResponse, acknowledgedAt: futureDate })
      ).toBe(false);

      // Invalid date
      expect(
        isAcknowledgeMetricsResponse({ ...validResponse, acknowledgedAt: 'invalid' })
      ).toBe(false);
    });
  });
});

describe('Assertion Functions', () => {
  describe('assertHealthMetrics', () => {
    const validMetrics = {
      bmi: 22.5,
      bmr: 1800,
      tdee: 2500,
      computedAt: '2025-10-28T12:00:00.000Z',
      version: 1,
    };

    it('should not throw for valid HealthMetrics', () => {
      expect(() => assertHealthMetrics(validMetrics)).not.toThrow();
    });

    it('should throw TypeError for invalid HealthMetrics', () => {
      expect(() => assertHealthMetrics(null)).toThrow(TypeError);
      expect(() => assertHealthMetrics({})).toThrow(TypeError);
      expect(() => assertHealthMetrics({ ...validMetrics, bmi: 100 })).toThrow(TypeError);
    });

    it('should include field name in error message', () => {
      expect(() => assertHealthMetrics(null, 'metrics')).toThrow(/metrics/);
    });
  });

  describe('assertMetricsSummaryResponse', () => {
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

    it('should not throw for valid MetricsSummaryResponse', () => {
      expect(() => assertMetricsSummaryResponse(validResponse)).not.toThrow();
    });

    it('should throw TypeError for invalid MetricsSummaryResponse', () => {
      expect(() => assertMetricsSummaryResponse(null)).toThrow(TypeError);
      expect(() => assertMetricsSummaryResponse({})).toThrow(TypeError);
    });
  });

  describe('assertAcknowledgeMetricsRequest', () => {
    const validRequest = {
      version: 1,
      metricsComputedAt: '2025-10-28T12:00:00.000Z',
    };

    it('should not throw for valid AcknowledgeMetricsRequest', () => {
      expect(() => assertAcknowledgeMetricsRequest(validRequest)).not.toThrow();
    });

    it('should throw TypeError for invalid AcknowledgeMetricsRequest', () => {
      expect(() => assertAcknowledgeMetricsRequest(null)).toThrow(TypeError);
      expect(() => assertAcknowledgeMetricsRequest({})).toThrow(TypeError);
    });
  });

  describe('assertAcknowledgeMetricsResponse', () => {
    const validResponse = {
      success: true,
      acknowledgedAt: '2025-10-28T12:00:00.000Z',
    };

    it('should not throw for valid AcknowledgeMetricsResponse', () => {
      expect(() => assertAcknowledgeMetricsResponse(validResponse)).not.toThrow();
    });

    it('should throw TypeError for invalid AcknowledgeMetricsResponse', () => {
      expect(() => assertAcknowledgeMetricsResponse(null)).toThrow(TypeError);
      expect(() => assertAcknowledgeMetricsResponse({})).toThrow(TypeError);
      expect(() =>
        assertAcknowledgeMetricsResponse({ ...validResponse, success: false })
      ).toThrow(TypeError);
    });
  });
});
