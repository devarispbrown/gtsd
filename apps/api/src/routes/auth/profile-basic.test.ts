import request from 'supertest';
import { createApp } from '../../app';
import { cleanDatabase } from '../../test/helpers';
import { db } from '../../db/connection';
import { users, userSettings, refreshTokens } from '../../db/schema';
import { eq } from 'drizzle-orm';
import { updateProfileBasicSchema } from './schemas';

const app = createApp();

describe('Profile Basic Update Routes', () => {
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

    // Create test user
    const signupResponse = await request(app).post('/auth/signup').send({
      email: 'test@example.com',
      password: 'SecurePass123!',
      name: 'Test User',
    });

    accessToken = signupResponse.body.data.accessToken;
    userId = signupResponse.body.data.user.id;

    // Create user settings to simulate completed onboarding
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
    it('should accept valid name', () => {
      const validPayload = {
        name: 'John Doe',
      };

      const result = updateProfileBasicSchema.safeParse(validPayload);
      expect(result.success).toBe(true);
    });

    it('should accept valid email', () => {
      const validPayload = {
        email: 'john.doe@example.com',
      };

      const result = updateProfileBasicSchema.safeParse(validPayload);
      expect(result.success).toBe(true);
    });

    it('should accept both name and email', () => {
      const validPayload = {
        name: 'John Doe',
        email: 'john.doe@example.com',
      };

      const result = updateProfileBasicSchema.safeParse(validPayload);
      expect(result.success).toBe(true);
    });

    it('should reject invalid email format', () => {
      const invalidPayload = {
        email: 'not-an-email',
      };

      const result = updateProfileBasicSchema.safeParse(invalidPayload);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].message).toContain('Invalid email');
      }
    });

    it('should reject empty name', () => {
      const invalidPayload = {
        name: '',
      };

      const result = updateProfileBasicSchema.safeParse(invalidPayload);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].message).toContain('Name is required');
      }
    });

    it('should reject name longer than 255 characters', () => {
      const invalidPayload = {
        name: 'a'.repeat(256),
      };

      const result = updateProfileBasicSchema.safeParse(invalidPayload);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].message).toContain('Name is too long');
      }
    });

    it('should accept empty payload (both optional)', () => {
      const emptyPayload = {};

      const result = updateProfileBasicSchema.safeParse(emptyPayload);
      expect(result.success).toBe(true);
    });
  });

  describe('PUT /auth/profile', () => {
    describe('Success Cases', () => {
      it('should successfully update name only', async () => {
        const response = await request(app)
          .put('/auth/profile')
          .set('Authorization', `Bearer ${accessToken}`)
          .send({
            name: 'New Name',
          })
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.name).toBe('New Name');
        expect(response.body.data.email).toBe('test@example.com'); // Unchanged
        expect(response.body.data.hasCompletedOnboarding).toBe(true);
      });

      it('should successfully update email only', async () => {
        const response = await request(app)
          .put('/auth/profile')
          .set('Authorization', `Bearer ${accessToken}`)
          .send({
            email: 'newemail@example.com',
          })
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.email).toBe('newemail@example.com');
        expect(response.body.data.name).toBe('Test User'); // Unchanged
        expect(response.body.data.emailVerified).toBe(false); // Reset on email change
        expect(response.body.data.hasCompletedOnboarding).toBe(true);
      });

      it('should successfully update both name and email', async () => {
        const response = await request(app)
          .put('/auth/profile')
          .set('Authorization', `Bearer ${accessToken}`)
          .send({
            name: 'Updated Name',
            email: 'updated@example.com',
          })
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.name).toBe('Updated Name');
        expect(response.body.data.email).toBe('updated@example.com');
        expect(response.body.data.emailVerified).toBe(false);
        expect(response.body.data.hasCompletedOnboarding).toBe(true);
      });

      it('should return complete user object with all fields', async () => {
        const response = await request(app)
          .put('/auth/profile')
          .set('Authorization', `Bearer ${accessToken}`)
          .send({
            name: 'Complete User',
          })
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveProperty('id');
        expect(response.body.data).toHaveProperty('email');
        expect(response.body.data).toHaveProperty('name');
        expect(response.body.data).toHaveProperty('emailVerified');
        expect(response.body.data).toHaveProperty('phone');
        expect(response.body.data).toHaveProperty('timezone');
        expect(response.body.data).toHaveProperty('smsOptIn');
        expect(response.body.data).toHaveProperty('isActive');
        expect(response.body.data).toHaveProperty('createdAt');
        expect(response.body.data).toHaveProperty('updatedAt');
        expect(response.body.data).toHaveProperty('hasCompletedOnboarding');
        expect(response.body.data).not.toHaveProperty('passwordHash'); // Sensitive field excluded
      });

      it('should persist updates to database', async () => {
        await request(app)
          .put('/auth/profile')
          .set('Authorization', `Bearer ${accessToken}`)
          .send({
            name: 'Database Test',
            email: 'dbtest@example.com',
          })
          .expect(200);

        const [user] = await db.select().from(users).where(eq(users.id, userId));

        expect(user.name).toBe('Database Test');
        expect(user.email).toBe('dbtest@example.com');
        expect(user.emailVerified).toBe(false);
      });

      it('should update timestamp on profile update', async () => {
        const [userBefore] = await db.select().from(users).where(eq(users.id, userId));

        // Wait a bit to ensure different timestamp
        await new Promise((resolve) => setTimeout(resolve, 10));

        await request(app)
          .put('/auth/profile')
          .set('Authorization', `Bearer ${accessToken}`)
          .send({
            name: 'Timestamp Test',
          })
          .expect(200);

        const [userAfter] = await db.select().from(users).where(eq(users.id, userId));

        expect(userAfter.updatedAt.getTime()).toBeGreaterThan(userBefore.updatedAt.getTime());
      });

      it('should not reset emailVerified when updating same email', async () => {
        // First, set email as verified
        await db.update(users).set({ emailVerified: true }).where(eq(users.id, userId));

        const response = await request(app)
          .put('/auth/profile')
          .set('Authorization', `Bearer ${accessToken}`)
          .send({
            email: 'test@example.com', // Same email
          })
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.emailVerified).toBe(true); // Should remain verified
      });

      it('should return hasCompletedOnboarding false for users without settings', async () => {
        // Delete user settings
        await db.delete(userSettings).where(eq(userSettings.userId, userId));

        const response = await request(app)
          .put('/auth/profile')
          .set('Authorization', `Bearer ${accessToken}`)
          .send({
            name: 'No Settings User',
          })
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.hasCompletedOnboarding).toBe(false);
      });

      it('should handle users with settings but onboardingCompleted=false', async () => {
        // Update settings to mark onboarding incomplete
        await db
          .update(userSettings)
          .set({ onboardingCompleted: false })
          .where(eq(userSettings.userId, userId));

        const response = await request(app)
          .put('/auth/profile')
          .set('Authorization', `Bearer ${accessToken}`)
          .send({
            name: 'Incomplete Onboarding',
          })
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.hasCompletedOnboarding).toBe(false);
      });
    });

    describe('Validation Errors', () => {
      it('should return 400 when no fields provided', async () => {
        const response = await request(app)
          .put('/auth/profile')
          .set('Authorization', `Bearer ${accessToken}`)
          .send({})
          .expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.error).toContain('At least one field');
      });

      it('should return 400 for invalid email format', async () => {
        const response = await request(app)
          .put('/auth/profile')
          .set('Authorization', `Bearer ${accessToken}`)
          .send({
            email: 'not-an-email',
          })
          .expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.error).toContain('Validation error');
      });

      it('should return 400 for empty name', async () => {
        const response = await request(app)
          .put('/auth/profile')
          .set('Authorization', `Bearer ${accessToken}`)
          .send({
            name: '',
          })
          .expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.error).toContain('Validation error');
      });

      it('should return 400 for name exceeding max length', async () => {
        const response = await request(app)
          .put('/auth/profile')
          .set('Authorization', `Bearer ${accessToken}`)
          .send({
            name: 'a'.repeat(256),
          })
          .expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.error).toContain('Validation error');
      });
    });

    describe('Email Uniqueness', () => {
      beforeEach(async () => {
        // Create another user
        await request(app).post('/auth/signup').send({
          email: 'other@example.com',
          password: 'SecurePass123!',
          name: 'Other User',
        });
      });

      it('should return 409 when email is already taken', async () => {
        const response = await request(app)
          .put('/auth/profile')
          .set('Authorization', `Bearer ${accessToken}`)
          .send({
            email: 'other@example.com',
          })
          .expect(409);

        expect(response.body.success).toBe(false);
        expect(response.body.error).toContain('already in use');
      });

      it('should allow updating to same email (no-op)', async () => {
        const response = await request(app)
          .put('/auth/profile')
          .set('Authorization', `Bearer ${accessToken}`)
          .send({
            email: 'test@example.com', // Same as current
          })
          .expect(200);

        expect(response.body.success).toBe(true);
      });

      it('should allow updating email to unique value', async () => {
        const response = await request(app)
          .put('/auth/profile')
          .set('Authorization', `Bearer ${accessToken}`)
          .send({
            email: 'unique@example.com',
          })
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.email).toBe('unique@example.com');
      });
    });

    describe('Authentication Errors', () => {
      it('should return 401 without authentication token', async () => {
        const response = await request(app)
          .put('/auth/profile')
          .send({
            name: 'No Auth',
          })
          .expect(401);

        expect(response.body.success).toBe(false);
        expect(response.body.error).toContain('Authentication required');
      });

      it('should return 401 with invalid token', async () => {
        const response = await request(app)
          .put('/auth/profile')
          .set('Authorization', 'Bearer invalid-token')
          .send({
            name: 'Invalid Token',
          })
          .expect(401);

        expect(response.body.success).toBe(false);
      });

      it('should return 401 with malformed authorization header', async () => {
        const response = await request(app)
          .put('/auth/profile')
          .set('Authorization', 'InvalidFormat')
          .send({
            name: 'Malformed',
          })
          .expect(401);

        expect(response.body.success).toBe(false);
      });
    });

    describe('Edge Cases', () => {
      it('should handle name with special characters', async () => {
        const response = await request(app)
          .put('/auth/profile')
          .set('Authorization', `Bearer ${accessToken}`)
          .send({
            name: "O'Connor-Smith Jr.",
          })
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.name).toBe("O'Connor-Smith Jr.");
      });

      it('should handle unicode characters in name', async () => {
        const response = await request(app)
          .put('/auth/profile')
          .set('Authorization', `Bearer ${accessToken}`)
          .send({
            name: 'José García',
          })
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.name).toBe('José García');
      });

      it('should trim whitespace from email (via Zod)', async () => {
        const response = await request(app)
          .put('/auth/profile')
          .set('Authorization', `Bearer ${accessToken}`)
          .send({
            email: '  whitespace@example.com  ',
          })
          .expect(400); // Zod email validation should fail on whitespace

        expect(response.body.success).toBe(false);
      });

      it('should handle maximum length name (255 chars)', async () => {
        const maxName = 'a'.repeat(255);
        const response = await request(app)
          .put('/auth/profile')
          .set('Authorization', `Bearer ${accessToken}`)
          .send({
            name: maxName,
          })
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.name).toBe(maxName);
      });

      it('should handle email case sensitivity correctly', async () => {
        const response = await request(app)
          .put('/auth/profile')
          .set('Authorization', `Bearer ${accessToken}`)
          .send({
            email: 'Test@Example.COM',
          })
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.email).toBe('Test@Example.COM');
      });
    });

    describe('Performance', () => {
      it('should respond within acceptable time (<100ms target)', async () => {
        const startTime = Date.now();

        await request(app)
          .put('/auth/profile')
          .set('Authorization', `Bearer ${accessToken}`)
          .send({
            name: 'Performance Test',
          })
          .expect(200);

        const duration = Date.now() - startTime;

        // Lenient assertion for test environment (200ms)
        expect(duration).toBeLessThan(200);
      });
    });
  });
});
