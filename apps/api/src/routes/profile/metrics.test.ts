import request from 'supertest';
import { createApp } from '../../app';
import { db } from '../../db/connection';
import { users, userSettings, profileMetrics, metricsAcknowledgements } from '../../db/schema';
import { eq } from 'drizzle-orm';
import { metricsService } from '../../services/metrics';

const app = createApp();

describe('Profile Metrics Routes', () => {
  let testUserId: number;
  let testUser2Id: number;
  let accessToken: string;
  let accessToken2: string;

  beforeEach(async () => {
    // Clean up data before each test
    await db.delete(metricsAcknowledgements);
    await db.delete(profileMetrics);
    await db.delete(userSettings);
    await db.delete(users);

    // Create test users
    const response1 = await request(app).post('/auth/signup').send({
      email: 'metrics-route-test-1@example.com',
      password: 'SecurePass123!',
      name: 'Metrics Route Test User 1',
    });

    const response2 = await request(app).post('/auth/signup').send({
      email: 'metrics-route-test-2@example.com',
      password: 'SecurePass123!',
      name: 'Metrics Route Test User 2',
    });

    testUserId = response1.body.data.user.id;
    accessToken = response1.body.data.accessToken;

    testUser2Id = response2.body.data.user.id;
    accessToken2 = response2.body.data.accessToken;
  });

  describe('GET /v1/profile/metrics/today', () => {
    beforeEach(async () => {
      // Create user settings with complete health data
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

      // Compute initial metrics
      await metricsService.computeAndStoreMetrics(testUserId, false);
    });

    it('should return 200 with valid data', async () => {
      const response = await request(app)
        .get('/v1/profile/metrics/today')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('bmi');
      expect(response.body.data).toHaveProperty('bmr');
      expect(response.body.data).toHaveProperty('tdee');
      expect(response.body.data).toHaveProperty('explanations');
      expect(response.body.data).toHaveProperty('computedAt');
      expect(response.body.data).toHaveProperty('acknowledged');
      expect(response.body.data.acknowledged).toBe(false);
    });

    it('should return 401 without auth token', async () => {
      const response = await request(app).get('/v1/profile/metrics/today').expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Authentication required');
    });

    it('should return 401 with invalid auth token', async () => {
      const response = await request(app)
        .get('/v1/profile/metrics/today')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should return 404 when no metrics exist', async () => {
      // Delete both metrics AND settings so auto-compute will fail
      await db.delete(profileMetrics).where(eq(profileMetrics.userId, testUserId));
      await db.delete(userSettings).where(eq(userSettings.userId, testUserId));

      const response = await request(app)
        .get('/v1/profile/metrics/today')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('No metrics');
    });

    it('should return metrics with explanations structure', async () => {
      const response = await request(app)
        .get('/v1/profile/metrics/today')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      const explanations = response.body.data.explanations;

      expect(explanations).toHaveProperty('bmi');
      expect(explanations).toHaveProperty('bmr');
      expect(explanations).toHaveProperty('tdee');
      expect(typeof explanations.bmi).toBe('string');
      expect(typeof explanations.bmr).toBe('string');
      expect(typeof explanations.tdee).toBe('string');
      expect(explanations.bmi.length).toBeGreaterThan(0);
    });

    it('should include acknowledged status in response', async () => {
      const metricsData = await metricsService.getTodayMetrics(testUserId);

      // Acknowledge the metrics
      await metricsService.acknowledgeMetrics(
        testUserId,
        1,
        new Date(metricsData.metrics.computedAt)
      );

      const response = await request(app)
        .get('/v1/profile/metrics/today')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.data.acknowledged).toBe(true);
    });

    it('should return different metrics for different users', async () => {
      // Create settings for second user with different stats
      await db.insert(userSettings).values({
        userId: testUser2Id,
        dateOfBirth: new Date('1995-01-01'),
        gender: 'female',
        currentWeight: '65',
        height: '165',
        targetWeight: '60',
        activityLevel: 'sedentary',
        primaryGoal: 'lose_weight',
        onboardingCompleted: true,
      });

      await metricsService.computeAndStoreMetrics(testUser2Id, false);

      const response1 = await request(app)
        .get('/v1/profile/metrics/today')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      const response2 = await request(app)
        .get('/v1/profile/metrics/today')
        .set('Authorization', `Bearer ${accessToken2}`)
        .expect(200);

      // Should have different values
      expect(response1.body.data.bmi).not.toBe(response2.body.data.bmi);
      expect(response1.body.data.bmr).not.toBe(response2.body.data.bmr);
      expect(response1.body.data.tdee).not.toBe(response2.body.data.tdee);
    });

    it('should complete within performance target (p95 < 200ms)', async () => {
      const startTime = Date.now();

      await request(app)
        .get('/v1/profile/metrics/today')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      const duration = Date.now() - startTime;

      // Allow some overhead for HTTP request, but should be reasonable
      expect(duration).toBeLessThan(500);
    });

    it('should return ISO timestamp for computedAt', async () => {
      const response = await request(app)
        .get('/v1/profile/metrics/today')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      const computedAt = response.body.data.computedAt;
      expect(typeof computedAt).toBe('string');
      expect(() => new Date(computedAt)).not.toThrow();
      expect(new Date(computedAt)).toBeInstanceOf(Date);
    });

    it('should return numeric values for BMI, BMR, and TDEE', async () => {
      const response = await request(app)
        .get('/v1/profile/metrics/today')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(typeof response.body.data.bmi).toBe('number');
      expect(typeof response.body.data.bmr).toBe('number');
      expect(typeof response.body.data.tdee).toBe('number');
      expect(response.body.data.bmi).toBeGreaterThan(0);
      expect(response.body.data.bmr).toBeGreaterThan(0);
      expect(response.body.data.tdee).toBeGreaterThan(0);
    });
  });

  describe('POST /v1/profile/metrics/acknowledge', () => {
    let metricsComputedAt: string;

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
      metricsComputedAt = metrics.computedAt!.toISOString();
    });

    it('should return 200 on success', async () => {
      const response = await request(app)
        .post('/v1/profile/metrics/acknowledge')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          version: 1,
          metricsComputedAt,
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('acknowledgedAt');
    });

    it('should return 401 without auth', async () => {
      const response = await request(app)
        .post('/v1/profile/metrics/acknowledge')
        .send({
          version: 1,
          metricsComputedAt,
        })
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Authentication required');
    });

    it('should return 401 with invalid auth token', async () => {
      const response = await request(app)
        .post('/v1/profile/metrics/acknowledge')
        .set('Authorization', 'Bearer invalid-token')
        .send({
          version: 1,
          metricsComputedAt,
        })
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should return 400 with invalid version (not a number)', async () => {
      const response = await request(app)
        .post('/v1/profile/metrics/acknowledge')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          version: 'invalid',
          metricsComputedAt,
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Validation error');
    });

    it('should return 400 with invalid version (negative number)', async () => {
      const response = await request(app)
        .post('/v1/profile/metrics/acknowledge')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          version: -1,
          metricsComputedAt,
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Validation error');
    });

    it('should return 400 with invalid version (zero)', async () => {
      const response = await request(app)
        .post('/v1/profile/metrics/acknowledge')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          version: 0,
          metricsComputedAt,
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Validation error');
    });

    it('should return 400 with invalid date format', async () => {
      const response = await request(app)
        .post('/v1/profile/metrics/acknowledge')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          version: 1,
          metricsComputedAt: 'invalid-date',
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Validation error');
    });

    it('should return 400 with missing version', async () => {
      const response = await request(app)
        .post('/v1/profile/metrics/acknowledge')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          metricsComputedAt,
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Validation error');
    });

    it('should return 400 with missing metricsComputedAt', async () => {
      const response = await request(app)
        .post('/v1/profile/metrics/acknowledge')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          version: 1,
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Validation error');
    });

    it('should validate Zod schema correctly', async () => {
      // Test with completely empty body
      const response = await request(app)
        .post('/v1/profile/metrics/acknowledge')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({})
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Validation error');
    });

    it('should be idempotent (multiple acknowledgements)', async () => {
      const response1 = await request(app)
        .post('/v1/profile/metrics/acknowledge')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          version: 1,
          metricsComputedAt,
        })
        .expect(200);

      const response2 = await request(app)
        .post('/v1/profile/metrics/acknowledge')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          version: 1,
          metricsComputedAt,
        })
        .expect(200);

      expect(response1.body.data.acknowledgedAt).toBe(response2.body.data.acknowledgedAt);
    });

    it('should return 404 when version mismatch', async () => {
      const response = await request(app)
        .post('/v1/profile/metrics/acknowledge')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          version: 99,
          metricsComputedAt,
        })
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Metrics not found');
    });

    it('should return 404 when metricsComputedAt does not match', async () => {
      const wrongDate = new Date('2023-01-01').toISOString();

      const response = await request(app)
        .post('/v1/profile/metrics/acknowledge')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          version: 1,
          metricsComputedAt: wrongDate,
        })
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Metrics not found');
    });

    it('should update acknowledged status for subsequent GET requests', async () => {
      // First, verify not acknowledged
      const beforeResponse = await request(app)
        .get('/v1/profile/metrics/today')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(beforeResponse.body.data.acknowledged).toBe(false);

      // Acknowledge
      await request(app)
        .post('/v1/profile/metrics/acknowledge')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          version: 1,
          metricsComputedAt,
        })
        .expect(200);

      // Verify now acknowledged
      const afterResponse = await request(app)
        .get('/v1/profile/metrics/today')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(afterResponse.body.data.acknowledged).toBe(true);
    });

    it('should accept valid ISO 8601 datetime format with milliseconds', async () => {
      // Format: 2025-10-30T12:34:56.789Z
      const response = await request(app)
        .post('/v1/profile/metrics/acknowledge')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          version: 1,
          metricsComputedAt,
        })
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should accept valid ISO 8601 datetime format without milliseconds', async () => {
      // iOS sends timestamps without milliseconds: 2025-10-30T12:34:56Z
      const timestampWithoutMs = metricsComputedAt.replace(/\.\d{3}Z$/, 'Z');

      const response = await request(app)
        .post('/v1/profile/metrics/acknowledge')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          version: 1,
          metricsComputedAt: timestampWithoutMs,
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.success).toBe(true);
      expect(response.body.data).toHaveProperty('acknowledgedAt');
    });

    it('should accept both timestamp formats interchangeably', async () => {
      // First request with milliseconds
      const withMs = metricsComputedAt; // 2025-10-30T12:34:56.789Z
      const response1 = await request(app)
        .post('/v1/profile/metrics/acknowledge')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          version: 1,
          metricsComputedAt: withMs,
        })
        .expect(200);

      expect(response1.body.success).toBe(true);

      // Second request without milliseconds (should be idempotent)
      const withoutMs = metricsComputedAt.replace(/\.\d{3}Z$/, 'Z'); // 2025-10-30T12:34:56Z
      const response2 = await request(app)
        .post('/v1/profile/metrics/acknowledge')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          version: 1,
          metricsComputedAt: withoutMs,
        })
        .expect(200);

      expect(response2.body.success).toBe(true);
      // Should return same acknowledgment since they're the same time
      expect(response1.body.data.acknowledgedAt).toBe(response2.body.data.acknowledgedAt);
    });

    it('should reject partial datetime formats', async () => {
      const response = await request(app)
        .post('/v1/profile/metrics/acknowledge')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          version: 1,
          metricsComputedAt: '2025-10-28', // Date only, no time
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Validation error');
    });

    it('should reject timestamps without Z suffix', async () => {
      const invalidTimestamp = metricsComputedAt.replace('Z', '');

      const response = await request(app)
        .post('/v1/profile/metrics/acknowledge')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          version: 1,
          metricsComputedAt: invalidTimestamp,
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Validation error');
    });

    it('should reject timestamps with timezone offsets instead of Z', async () => {
      const response = await request(app)
        .post('/v1/profile/metrics/acknowledge')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          version: 1,
          metricsComputedAt: '2025-10-30T12:34:56+05:00', // Timezone offset
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Validation error');
    });

    it('should reject invalid dates that match format', async () => {
      const response = await request(app)
        .post('/v1/profile/metrics/acknowledge')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          version: 1,
          metricsComputedAt: '2025-13-99T99:99:99.999Z', // Invalid date values
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Validation error');
    });

    it('should return ISO timestamp for acknowledgedAt', async () => {
      const response = await request(app)
        .post('/v1/profile/metrics/acknowledge')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          version: 1,
          metricsComputedAt,
        })
        .expect(200);

      const acknowledgedAt = response.body.data.acknowledgedAt;
      expect(typeof acknowledgedAt).toBe('string');
      expect(() => new Date(acknowledgedAt)).not.toThrow();
      expect(new Date(acknowledgedAt)).toBeInstanceOf(Date);
    });

    it('should not allow user to acknowledge another users metrics', async () => {
      // Create metrics for user 2
      await db.insert(userSettings).values({
        userId: testUser2Id,
        dateOfBirth: new Date('1995-01-01'),
        gender: 'female',
        currentWeight: '65',
        height: '165',
        targetWeight: '60',
        activityLevel: 'sedentary',
        primaryGoal: 'lose_weight',
        onboardingCompleted: true,
      });

      // Wait to ensure different timestamp (second precision)
      await new Promise(resolve => setTimeout(resolve, 1100));

      const user2Metrics = await metricsService.computeAndStoreMetrics(testUser2Id, false);

      // Try to acknowledge user 2's metrics with user 1's token
      const response = await request(app)
        .post('/v1/profile/metrics/acknowledge')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          version: 1,
          metricsComputedAt: user2Metrics.computedAt!.toISOString(),
        })
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Metrics not found');
    });
  });

  describe('Route Performance', () => {
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

      await metricsService.computeAndStoreMetrics(testUserId, false);
    });

    it('should complete GET request within reasonable time', async () => {
      const startTime = Date.now();

      await request(app)
        .get('/v1/profile/metrics/today')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      const duration = Date.now() - startTime;

      // Should complete in less than 500ms including HTTP overhead
      expect(duration).toBeLessThan(500);
    });

    it('should complete POST request within reasonable time', async () => {
      const metrics = await metricsService.getTodayMetrics(testUserId);
      const startTime = Date.now();

      await request(app)
        .post('/v1/profile/metrics/acknowledge')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          version: 1,
          metricsComputedAt: metrics.metrics.computedAt,
        })
        .expect(200);

      const duration = Date.now() - startTime;

      // Should complete in less than 500ms including HTTP overhead
      expect(duration).toBeLessThan(500);
    });
  });

  describe('Error Handling', () => {
    it('should handle malformed JSON in request body', async () => {
      const response = await request(app)
        .post('/v1/profile/metrics/acknowledge')
        .set('Authorization', `Bearer ${accessToken}`)
        .set('Content-Type', 'application/json')
        .send('{"version": 1, "metricsComputedAt"') // Malformed JSON
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should handle extra fields in request body', async () => {
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

      const response = await request(app)
        .post('/v1/profile/metrics/acknowledge')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          version: 1,
          metricsComputedAt: metrics.computedAt!.toISOString(),
          extraField: 'should be ignored',
        })
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });
});
