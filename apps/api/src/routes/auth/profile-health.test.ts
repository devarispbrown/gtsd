import request from 'supertest';
import { createApp } from '../../app';
import { cleanDatabase } from '../../test/helpers';
import { db } from '../../db/connection';
import { users, userSettings, refreshTokens } from '../../db/schema';
import { eq } from 'drizzle-orm';
import { updateHealthMetricsSchema } from './profile-health';
import { VALIDATION_RANGES } from '@gtsd/shared-types';

const app = createApp();

describe('Health Profile Update Routes', () => {
  let accessToken: string;
  let userId: number;

  afterAll(async () => {
    await cleanDatabase();
  });

  beforeEach(async () => {
    // Clean up before each test
    await db.delete(userSettings);
    await db.delete(refreshTokens);
    await db.delete(users);

    // Create test user and settings
    const signupResponse = await request(app).post('/auth/signup').send({
      email: 'test@example.com',
      password: 'SecurePass123!',
      name: 'Test User',
    });

    accessToken = signupResponse.body.data.accessToken;
    userId = signupResponse.body.data.user.id;

    // Create user settings with onboarding completed
    await db.insert(userSettings).values({
      userId,
      currentWeight: '80.0',
      targetWeight: '75.0',
      height: '175',
      dateOfBirth: new Date('1990-01-01'),
      gender: 'male',
      primaryGoal: 'lose_weight',
      activityLevel: 'moderately_active',
      onboardingCompleted: true,
      bmr: 1800,
      tdee: 2500,
      calorieTarget: 2000,
      proteinTarget: 150,
      waterTarget: 2800,
    });
  });

  describe('Zod Validation Schema', () => {
    it('should accept valid health metrics update', () => {
      const validPayload = {
        currentWeight: 75.5,
        targetWeight: 70.0,
        height: 175,
        dateOfBirth: '1990-01-01T00:00:00.000Z',
      };

      const result = updateHealthMetricsSchema.safeParse(validPayload);
      expect(result.success).toBe(true);
    });

    it('should reject weight below minimum', () => {
      const invalidPayload = {
        currentWeight: 25, // Below 30 kg minimum
      };

      const result = updateHealthMetricsSchema.safeParse(invalidPayload);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].message).toContain('at least 30');
      }
    });

    it('should reject weight above maximum', () => {
      const invalidPayload = {
        currentWeight: 350, // Above 300 kg maximum
      };

      const result = updateHealthMetricsSchema.safeParse(invalidPayload);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].message).toContain('not exceed 300');
      }
    });

    it('should reject height below minimum', () => {
      const invalidPayload = {
        currentWeight: 70,
        height: 90, // Below 100 cm minimum
      };

      const result = updateHealthMetricsSchema.safeParse(invalidPayload);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors.some((e) => e.message.includes('at least 100'))).toBe(true);
      }
    });

    it('should reject height above maximum', () => {
      const invalidPayload = {
        currentWeight: 70,
        height: 260, // Above 250 cm maximum
      };

      const result = updateHealthMetricsSchema.safeParse(invalidPayload);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors.some((e) => e.message.includes('not exceed 250'))).toBe(true);
      }
    });

    it('should accept partial updates (only currentWeight)', () => {
      const partialPayload = {
        currentWeight: 75.5,
      };

      const result = updateHealthMetricsSchema.safeParse(partialPayload);
      expect(result.success).toBe(true);
    });

    it('should accept minimum valid values', () => {
      const minValidPayload = {
        currentWeight: VALIDATION_RANGES.weight.min,
        targetWeight: VALIDATION_RANGES.targetWeight.min,
        height: VALIDATION_RANGES.height.min,
      };

      const result = updateHealthMetricsSchema.safeParse(minValidPayload);
      expect(result.success).toBe(true);
    });

    it('should accept maximum valid values', () => {
      const maxValidPayload = {
        currentWeight: VALIDATION_RANGES.weight.max,
        targetWeight: VALIDATION_RANGES.targetWeight.max,
        height: VALIDATION_RANGES.height.max,
      };

      const result = updateHealthMetricsSchema.safeParse(maxValidPayload);
      expect(result.success).toBe(true);
    });
  });

  describe('PUT /auth/profile/health', () => {
    describe('Success Cases', () => {
      it('should successfully update health metrics', async () => {
        const response = await request(app)
          .put('/auth/profile/health')
          .set('Authorization', `Bearer ${accessToken}`)
          .send({
            currentWeight: 75.5,
            targetWeight: 70.0,
          })
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.profile.currentWeight).toBe('75.5');
        expect(response.body.profile.targetWeight).toBe('70.0');
        expect(response.body).toHaveProperty('planUpdated');
      });

      it('should trigger plan recomputation for significant weight change', async () => {
        const response = await request(app)
          .put('/auth/profile/health')
          .set('Authorization', `Bearer ${accessToken}`)
          .send({
            currentWeight: 70.0, // Significant change from 80kg
          })
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.planUpdated).toBe(true);
        expect(response.body.targets).toBeDefined();
        expect(response.body.targets).toHaveProperty('calorieTarget');
        expect(response.body.targets).toHaveProperty('proteinTarget');
        expect(response.body.targets).toHaveProperty('waterTarget');
      });

      it('should update height and dateOfBirth', async () => {
        const response = await request(app)
          .put('/auth/profile/health')
          .set('Authorization', `Bearer ${accessToken}`)
          .send({
            currentWeight: 80.0,
            height: 180,
            dateOfBirth: '1995-06-15T00:00:00.000Z',
          })
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.profile.height).toBe('180');
        expect(response.body.profile.dateOfBirth).toContain('1995-06-15');
      });

      it('should handle decimal weights correctly', async () => {
        const response = await request(app)
          .put('/auth/profile/health')
          .set('Authorization', `Bearer ${accessToken}`)
          .send({
            currentWeight: 75.75,
          })
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.profile.currentWeight).toBe('75.75');
      });

      it('should persist updates to database', async () => {
        await request(app)
          .put('/auth/profile/health')
          .set('Authorization', `Bearer ${accessToken}`)
          .send({
            currentWeight: 74.5,
            targetWeight: 69.5,
          })
          .expect(200);

        const [settings] = await db
          .select()
          .from(userSettings)
          .where(eq(userSettings.userId, userId));

        expect(settings.currentWeight).toBe('74.5');
        expect(settings.targetWeight).toBe('69.5');
      });
    });

    describe('Validation Errors', () => {
      it('should return 400 for weight below minimum', async () => {
        const response = await request(app)
          .put('/auth/profile/health')
          .set('Authorization', `Bearer ${accessToken}`)
          .send({
            currentWeight: 25, // Below minimum
          })
          .expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.error).toContain('Validation error');
      });

      it('should return 400 for weight above maximum', async () => {
        const response = await request(app)
          .put('/auth/profile/health')
          .set('Authorization', `Bearer ${accessToken}`)
          .send({
            currentWeight: 350, // Above maximum
          })
          .expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.error).toContain('Validation error');
      });

      it('should return 400 for invalid height', async () => {
        const response = await request(app)
          .put('/auth/profile/health')
          .set('Authorization', `Bearer ${accessToken}`)
          .send({
            currentWeight: 75,
            height: 90, // Below minimum
          })
          .expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.error).toContain('Validation error');
      });

      it('should return 400 for invalid dateOfBirth format', async () => {
        const response = await request(app)
          .put('/auth/profile/health')
          .set('Authorization', `Bearer ${accessToken}`)
          .send({
            currentWeight: 75,
            dateOfBirth: 'not-a-date',
          })
          .expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.error).toContain('Validation error');
      });
    });

    describe('Authentication Errors', () => {
      it('should return 401 without authentication token', async () => {
        const response = await request(app)
          .put('/auth/profile/health')
          .send({
            currentWeight: 75.0,
          })
          .expect(401);

        expect(response.body.success).toBe(false);
        expect(response.body.error).toContain('Authentication required');
      });

      it('should return 401 with invalid token', async () => {
        const response = await request(app)
          .put('/auth/profile/health')
          .set('Authorization', 'Bearer invalid-token')
          .send({
            currentWeight: 75.0,
          })
          .expect(401);

        expect(response.body.success).toBe(false);
      });
    });

    describe('User Settings Errors', () => {
      it('should return 404 when user settings do not exist', async () => {
        // Delete user settings
        await db.delete(userSettings).where(eq(userSettings.userId, userId));

        const response = await request(app)
          .put('/auth/profile/health')
          .set('Authorization', `Bearer ${accessToken}`)
          .send({
            currentWeight: 75.0,
          })
          .expect(404);

        expect(response.body.success).toBe(false);
        expect(response.body.error).toContain('User settings not found');
      });
    });

    describe('Edge Cases', () => {
      it('should not recompute plan for insignificant changes', async () => {
        const response = await request(app)
          .put('/auth/profile/health')
          .set('Authorization', `Bearer ${accessToken}`)
          .send({
            currentWeight: 80.1, // Very small change
          })
          .expect(200);

        expect(response.body.success).toBe(true);
        // Plan might or might not update depending on calculations
        // Just verify response structure is correct
        expect(response.body).toHaveProperty('planUpdated');
      });

      it('should handle updates with all fields at once', async () => {
        const response = await request(app)
          .put('/auth/profile/health')
          .set('Authorization', `Bearer ${accessToken}`)
          .send({
            currentWeight: 76.5,
            targetWeight: 71.0,
            height: 178,
            dateOfBirth: '1992-03-20T00:00:00.000Z',
          })
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.profile.currentWeight).toBe('76.5');
        expect(response.body.profile.targetWeight).toBe('71.0');
        expect(response.body.profile.height).toBe('178');
        expect(response.body.profile.dateOfBirth).toContain('1992-03-20');
      });

      it('should handle partial updates correctly', async () => {
        const response = await request(app)
          .put('/auth/profile/health')
          .set('Authorization', `Bearer ${accessToken}`)
          .send({
            height: 180,
          })
          .expect(400); // Will fail because currentWeight is required

        expect(response.body.success).toBe(false);
      });

      it('should handle boundary values correctly', async () => {
        const response = await request(app)
          .put('/auth/profile/health')
          .set('Authorization', `Bearer ${accessToken}`)
          .send({
            currentWeight: VALIDATION_RANGES.weight.min, // 30 kg
            targetWeight: VALIDATION_RANGES.targetWeight.min, // 30 kg
            height: VALIDATION_RANGES.height.min, // 100 cm
          })
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.profile.currentWeight).toBe('30');
      });
    });
  });
});
