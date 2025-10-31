import request from 'supertest';
import { createApp } from '../../app';
import { setupTestDatabase } from '../../test/setup';
import { db } from '../../db/connection';
import { users, userSettings, refreshTokens } from '../../db/schema';
import { eq } from 'drizzle-orm';

const app = createApp();

describe('Profile Preferences Routes', () => {
  beforeAll(async () => {
    await setupTestDatabase();
  });

  beforeEach(async () => {
    // Clean up test data before each test
    await db.delete(refreshTokens);
    await db.delete(userSettings);
    await db.delete(users);
  });

  describe('PUT /auth/profile/preferences', () => {
    let testUserId: number;
    let accessToken: string;
    const testEmail = `preferences-${Date.now()}@example.com`;

    beforeEach(async () => {
      // Create test user and get auth token
      const signupResponse = await request(app)
        .post('/auth/signup')
        .send({
          email: testEmail,
          password: 'SecurePass123!',
          name: 'Test User',
        })
        .expect(201);

      testUserId = signupResponse.body.data.user.id;
      accessToken = signupResponse.body.data.accessToken;

      // Complete onboarding to create user_settings
      await request(app)
        .post('/onboarding/submit')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          dateOfBirth: '1990-01-15',
          gender: 'male',
          currentWeight: 80,
          height: 175,
          targetWeight: 75,
          targetDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
          primaryGoal: 'lose_weight',
          activityLevel: 'moderate',
        })
        .expect(201);
    });

    it('should update dietary preferences', async () => {
      const response = await request(app)
        .put('/auth/profile/preferences')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          dietaryPreferences: ['vegetarian', 'gluten-free'],
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Preferences updated successfully');
      expect(response.body.data.dietaryPreferences).toEqual(['vegetarian', 'gluten-free']);
    });

    it('should update allergies', async () => {
      const response = await request(app)
        .put('/auth/profile/preferences')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          allergies: ['peanuts', 'shellfish', 'dairy'],
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Preferences updated successfully');
      expect(response.body.data.allergies).toEqual(['peanuts', 'shellfish', 'dairy']);
    });

    it('should update meals per day', async () => {
      const response = await request(app)
        .put('/auth/profile/preferences')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          mealsPerDay: 5,
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.mealsPerDay).toBe(5);
    });

    it('should update all preferences at once', async () => {
      const response = await request(app)
        .put('/auth/profile/preferences')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          dietaryPreferences: ['vegan', 'organic'],
          allergies: ['soy', 'nuts'],
          mealsPerDay: 4,
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Preferences updated successfully');
      expect(response.body.data.dietaryPreferences).toEqual(['vegan', 'organic']);
      expect(response.body.data.allergies).toEqual(['soy', 'nuts']);
      expect(response.body.data.mealsPerDay).toBe(4);
    });

    it('should persist preferences to database', async () => {
      await request(app)
        .put('/auth/profile/preferences')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          dietaryPreferences: ['paleo'],
          allergies: ['eggs'],
          mealsPerDay: 6,
        })
        .expect(200);

      // Verify in database
      const [settings] = await db
        .select()
        .from(userSettings)
        .where(eq(userSettings.userId, testUserId));

      expect(settings.dietaryPreferences).toEqual(['paleo']);
      expect(settings.allergies).toEqual(['eggs']);
      expect(settings.mealsPerDay).toBe(6);
    });

    it('should allow empty arrays for preferences', async () => {
      // First set some preferences
      await request(app)
        .put('/auth/profile/preferences')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          dietaryPreferences: ['vegetarian'],
          allergies: ['peanuts'],
        })
        .expect(200);

      // Now clear them
      const response = await request(app)
        .put('/auth/profile/preferences')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          dietaryPreferences: [],
          allergies: [],
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.dietaryPreferences).toEqual([]);
      expect(response.body.data.allergies).toEqual([]);
    });

    it('should handle partial updates', async () => {
      // Set initial preferences
      await request(app)
        .put('/auth/profile/preferences')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          dietaryPreferences: ['vegetarian'],
          allergies: ['peanuts'],
          mealsPerDay: 3,
        })
        .expect(200);

      // Update only dietary preferences
      const response = await request(app)
        .put('/auth/profile/preferences')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          dietaryPreferences: ['vegan'],
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.dietaryPreferences).toEqual(['vegan']);
      expect(response.body.data.allergies).toEqual(['peanuts']); // Unchanged
      expect(response.body.data.mealsPerDay).toBe(3); // Unchanged
    });

    it('should update updatedAt timestamp', async () => {
      // Get initial timestamp
      const [initialSettings] = await db
        .select()
        .from(userSettings)
        .where(eq(userSettings.userId, testUserId));

      const initialUpdatedAt = initialSettings.updatedAt;

      // Wait a bit
      await new Promise(resolve => setTimeout(resolve, 10));

      // Update preferences
      await request(app)
        .put('/auth/profile/preferences')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          dietaryPreferences: ['keto'],
        })
        .expect(200);

      // Check timestamp was updated
      const [updatedSettings] = await db
        .select()
        .from(userSettings)
        .where(eq(userSettings.userId, testUserId));

      expect(updatedSettings.updatedAt.getTime()).toBeGreaterThan(
        initialUpdatedAt.getTime()
      );
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .put('/auth/profile/preferences')
        .send({
          dietaryPreferences: ['vegetarian'],
        })
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Authentication required');
    });

    it('should reject invalid auth token', async () => {
      const response = await request(app)
        .put('/auth/profile/preferences')
        .set('Authorization', 'Bearer invalid-token')
        .send({
          dietaryPreferences: ['vegetarian'],
        })
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should reject invalid meals per day (too low)', async () => {
      const response = await request(app)
        .put('/auth/profile/preferences')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          mealsPerDay: 0,
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Validation error');
    });

    it('should reject invalid meals per day (too high)', async () => {
      const response = await request(app)
        .put('/auth/profile/preferences')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          mealsPerDay: 11,
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Validation error');
    });

    it('should reject non-integer meals per day', async () => {
      const response = await request(app)
        .put('/auth/profile/preferences')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          mealsPerDay: 3.5,
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Validation error');
    });

    it('should reject non-array dietary preferences', async () => {
      const response = await request(app)
        .put('/auth/profile/preferences')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          dietaryPreferences: 'vegetarian', // Should be array
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Validation error');
    });

    it('should reject non-array allergies', async () => {
      const response = await request(app)
        .put('/auth/profile/preferences')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          allergies: 'peanuts', // Should be array
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Validation error');
    });

    it('should accept empty request body', async () => {
      const response = await request(app)
        .put('/auth/profile/preferences')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({})
        .expect(200);

      expect(response.body.success).toBe(true);
      // Should return current values
      expect(response.body.data).toHaveProperty('dietaryPreferences');
      expect(response.body.data).toHaveProperty('allergies');
      expect(response.body.data).toHaveProperty('mealsPerDay');
    });

    it('should handle long preference arrays', async () => {
      const manyPreferences = Array.from({ length: 20 }, (_, i) => `preference-${i}`);
      const manyAllergies = Array.from({ length: 15 }, (_, i) => `allergy-${i}`);

      const response = await request(app)
        .put('/auth/profile/preferences')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          dietaryPreferences: manyPreferences,
          allergies: manyAllergies,
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.dietaryPreferences).toEqual(manyPreferences);
      expect(response.body.data.allergies).toEqual(manyAllergies);
    });

    it('should handle special characters in preferences', async () => {
      const response = await request(app)
        .put('/auth/profile/preferences')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          dietaryPreferences: ['低糖', 'gluten-free', 'lactose-intolerant'],
          allergies: ['piña', 'café', 'naïve'],
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.dietaryPreferences).toContain('低糖');
      expect(response.body.data.allergies).toContain('piña');
    });

    it('should handle duplicate values in preferences', async () => {
      const response = await request(app)
        .put('/auth/profile/preferences')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          dietaryPreferences: ['vegan', 'vegan', 'organic'],
          allergies: ['nuts', 'nuts', 'soy'],
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      // Server stores duplicates as-is (client can decide to dedupe)
      expect(response.body.data.dietaryPreferences).toEqual(['vegan', 'vegan', 'organic']);
    });

    it('should fail if user settings do not exist', async () => {
      // Create new user without completing onboarding
      const newUserEmail = `no-settings-${Date.now()}@example.com`;
      const signupResponse = await request(app)
        .post('/auth/signup')
        .send({
          email: newUserEmail,
          password: 'SecurePass123!',
          name: 'No Settings User',
        })
        .expect(201);

      const newAccessToken = signupResponse.body.data.accessToken;

      const response = await request(app)
        .put('/auth/profile/preferences')
        .set('Authorization', `Bearer ${newAccessToken}`)
        .send({
          dietaryPreferences: ['vegetarian'],
        })
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('settings not found');
      expect(response.body.error).toContain('complete onboarding');
    });

    it('should return default values for unset preferences', async () => {
      const response = await request(app)
        .put('/auth/profile/preferences')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({})
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.dietaryPreferences).toEqual([]);
      expect(response.body.data.allergies).toEqual([]);
      expect(response.body.data.mealsPerDay).toBe(3); // Default value
    });

    it('should accept boundary values for meals per day', async () => {
      // Test minimum
      let response = await request(app)
        .put('/auth/profile/preferences')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          mealsPerDay: 1,
        })
        .expect(200);

      expect(response.body.data.mealsPerDay).toBe(1);

      // Test maximum
      response = await request(app)
        .put('/auth/profile/preferences')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          mealsPerDay: 10,
        })
        .expect(200);

      expect(response.body.data.mealsPerDay).toBe(10);
    });

    it('should handle concurrent updates to same user', async () => {
      // Send multiple concurrent updates
      const updates = [
        request(app)
          .put('/auth/profile/preferences')
          .set('Authorization', `Bearer ${accessToken}`)
          .send({ dietaryPreferences: ['vegetarian'] }),
        request(app)
          .put('/auth/profile/preferences')
          .set('Authorization', `Bearer ${accessToken}`)
          .send({ allergies: ['peanuts'] }),
        request(app)
          .put('/auth/profile/preferences')
          .set('Authorization', `Bearer ${accessToken}`)
          .send({ mealsPerDay: 5 }),
      ];

      const responses = await Promise.all(updates);

      // All should succeed
      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
      });

      // Verify settings exist
      const [settings] = await db
        .select()
        .from(userSettings)
        .where(eq(userSettings.userId, testUserId));

      expect(settings).toBeTruthy();
    });
  });

  describe('Performance Tests', () => {
    let accessToken: string;

    beforeEach(async () => {
      const testEmail = `perf-${Date.now()}@example.com`;

      const signupResponse = await request(app)
        .post('/auth/signup')
        .send({
          email: testEmail,
          password: 'SecurePass123!',
          name: 'Performance User',
        })
        .expect(201);

      accessToken = signupResponse.body.data.accessToken;

      // Complete onboarding
      await request(app)
        .post('/onboarding/submit')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          dateOfBirth: '1990-01-15',
          gender: 'male',
          currentWeight: 80,
          height: 175,
          targetWeight: 75,
          targetDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
          primaryGoal: 'lose_weight',
          activityLevel: 'moderate',
        })
        .expect(201);
    });

    it('should complete update within performance target (200ms)', async () => {
      const start = Date.now();

      await request(app)
        .put('/auth/profile/preferences')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          dietaryPreferences: ['vegetarian', 'organic'],
          allergies: ['peanuts', 'shellfish'],
          mealsPerDay: 4,
        })
        .expect(200);

      const duration = Date.now() - start;

      // Should be under 200ms (p95 target mentioned in code)
      // Using 500ms for test environment tolerance
      expect(duration).toBeLessThan(500);
    });

    it('should handle rapid successive updates', async () => {
      const updates = [];

      for (let i = 0; i < 10; i++) {
        updates.push(
          request(app)
            .put('/auth/profile/preferences')
            .set('Authorization', `Bearer ${accessToken}`)
            .send({
              mealsPerDay: (i % 5) + 1,
            })
        );
      }

      const responses = await Promise.all(updates);

      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
      });
    });
  });

  describe('Integration Tests', () => {
    it('should maintain preferences across login sessions', async () => {
      const testEmail = `integration-${Date.now()}@example.com`;
      const password = 'SecurePass123!';

      // Signup
      const signupResponse = await request(app)
        .post('/auth/signup')
        .send({
          email: testEmail,
          password,
          name: 'Integration User',
        })
        .expect(201);

      const accessToken = signupResponse.body.data.accessToken;

      // Complete onboarding
      await request(app)
        .post('/onboarding/submit')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          dateOfBirth: '1990-01-15',
          gender: 'female',
          currentWeight: 65,
          height: 165,
          targetWeight: 60,
          targetDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
          primaryGoal: 'lose_weight',
          activityLevel: 'moderate',
        })
        .expect(201);

      // Set preferences
      await request(app)
        .put('/auth/profile/preferences')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          dietaryPreferences: ['pescatarian', 'organic'],
          allergies: ['dairy', 'soy'],
          mealsPerDay: 4,
        })
        .expect(200);

      // Logout
      await request(app)
        .post('/auth/logout')
        .send({ refreshToken: signupResponse.body.data.refreshToken })
        .expect(200);

      // Login again
      const loginResponse = await request(app)
        .post('/auth/login')
        .send({
          email: testEmail,
          password,
        })
        .expect(200);

      // Verify preferences are still there
      const userId = loginResponse.body.data.user.id;
      const [settings] = await db
        .select()
        .from(userSettings)
        .where(eq(userSettings.userId, userId));

      expect(settings.dietaryPreferences).toEqual(['pescatarian', 'organic']);
      expect(settings.allergies).toEqual(['dairy', 'soy']);
      expect(settings.mealsPerDay).toBe(4);
    });
  });

  describe('GET /auth/me - Dietary Preferences Persistence (Bug #1 Regression Tests)', () => {
    let testUserId: number;
    let accessToken: string;
    const testEmail = `auth-me-prefs-${Date.now()}@example.com`;

    beforeEach(async () => {
      // Create test user and get auth token
      const signupResponse = await request(app)
        .post('/auth/signup')
        .send({
          email: testEmail,
          password: 'SecurePass123!',
          name: 'Test User',
        })
        .expect(201);

      testUserId = signupResponse.body.data.user.id;
      accessToken = signupResponse.body.data.accessToken;

      // Complete onboarding to create user_settings
      await request(app)
        .post('/onboarding/submit')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          dateOfBirth: '1990-01-15',
          gender: 'male',
          currentWeight: 80,
          height: 175,
          targetWeight: 75,
          targetDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
          primaryGoal: 'lose_weight',
          activityLevel: 'moderate',
        })
        .expect(201);
    });

    it('should return dietary preferences in /auth/me response after update', async () => {
      // Step 1: Update preferences
      await request(app)
        .put('/auth/profile/preferences')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          dietaryPreferences: ['vegetarian', 'gluten-free'],
          allergies: ['peanuts', 'shellfish'],
          mealsPerDay: 5,
        })
        .expect(200);

      // Step 2: Fetch user data from /auth/me
      const meResponse = await request(app)
        .get('/auth/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      // Step 3: Verify preferences are included in response
      expect(meResponse.body.success).toBe(true);
      expect(meResponse.body.data.user).toBeDefined();
      expect(meResponse.body.data.user.dietaryPreferences).toEqual(['vegetarian', 'gluten-free']);
      expect(meResponse.body.data.user.allergies).toEqual(['peanuts', 'shellfish']);
      expect(meResponse.body.data.user.mealsPerDay).toBe(5);
    });

    it('should return empty arrays for unset dietary preferences in /auth/me', async () => {
      // Don't set any preferences - should return defaults
      const meResponse = await request(app)
        .get('/auth/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(meResponse.body.success).toBe(true);
      expect(meResponse.body.data.user.dietaryPreferences).toEqual([]);
      expect(meResponse.body.data.user.allergies).toEqual([]);
      expect(meResponse.body.data.user.mealsPerDay).toBe(3); // Default value
    });

    it('should persist preferences after multiple updates', async () => {
      // Update 1
      await request(app)
        .put('/auth/profile/preferences')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          dietaryPreferences: ['vegan'],
          allergies: ['soy'],
          mealsPerDay: 4,
        })
        .expect(200);

      // Verify update 1
      let meResponse = await request(app)
        .get('/auth/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(meResponse.body.data.user.dietaryPreferences).toEqual(['vegan']);
      expect(meResponse.body.data.user.allergies).toEqual(['soy']);
      expect(meResponse.body.data.user.mealsPerDay).toBe(4);

      // Update 2
      await request(app)
        .put('/auth/profile/preferences')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          dietaryPreferences: ['paleo', 'organic'],
          allergies: ['dairy', 'eggs'],
          mealsPerDay: 6,
        })
        .expect(200);

      // Verify update 2 - should have new values, not merged
      meResponse = await request(app)
        .get('/auth/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(meResponse.body.data.user.dietaryPreferences).toEqual(['paleo', 'organic']);
      expect(meResponse.body.data.user.allergies).toEqual(['dairy', 'eggs']);
      expect(meResponse.body.data.user.mealsPerDay).toBe(6);
    });

    it('should maintain preferences in database after /auth/me call', async () => {
      // Set preferences
      await request(app)
        .put('/auth/profile/preferences')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          dietaryPreferences: ['keto'],
          allergies: ['nuts'],
          mealsPerDay: 3,
        })
        .expect(200);

      // Call /auth/me
      await request(app)
        .get('/auth/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      // Verify database still has preferences (not cleared by /auth/me)
      const [settings] = await db
        .select()
        .from(userSettings)
        .where(eq(userSettings.userId, testUserId));

      expect(settings.dietaryPreferences).toEqual(['keto']);
      expect(settings.allergies).toEqual(['nuts']);
      expect(settings.mealsPerDay).toBe(3);
    });

    it('should return preferences after login on different device', async () => {
      // Step 1: Set preferences
      await request(app)
        .put('/auth/profile/preferences')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          dietaryPreferences: ['pescatarian', 'low-carb'],
          allergies: ['shellfish'],
          mealsPerDay: 4,
        })
        .expect(200);

      // Step 2: Simulate logout (get refresh token)
      const signupResponse = await request(app)
        .post('/auth/login')
        .send({
          email: testEmail,
          password: 'SecurePass123!',
        })
        .expect(200);

      const newAccessToken = signupResponse.body.data.accessToken;

      // Step 3: Call /auth/me with new token (simulating different device)
      const meResponse = await request(app)
        .get('/auth/me')
        .set('Authorization', `Bearer ${newAccessToken}`)
        .expect(200);

      // Step 4: Verify preferences are still there
      expect(meResponse.body.data.user.dietaryPreferences).toEqual(['pescatarian', 'low-carb']);
      expect(meResponse.body.data.user.allergies).toEqual(['shellfish']);
      expect(meResponse.body.data.user.mealsPerDay).toBe(4);
    });

    it('should handle preferences with special characters in /auth/me', async () => {
      await request(app)
        .put('/auth/profile/preferences')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          dietaryPreferences: ['低糖', 'gluten-free'],
          allergies: ['piña', 'café'],
          mealsPerDay: 3,
        })
        .expect(200);

      const meResponse = await request(app)
        .get('/auth/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(meResponse.body.data.user.dietaryPreferences).toContain('低糖');
      expect(meResponse.body.data.user.allergies).toContain('piña');
    });

    it('should include preferences in user object structure', async () => {
      await request(app)
        .put('/auth/profile/preferences')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          dietaryPreferences: ['vegetarian'],
          allergies: ['dairy'],
          mealsPerDay: 4,
        })
        .expect(200);

      const meResponse = await request(app)
        .get('/auth/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      const user = meResponse.body.data.user;

      // Verify user object has all expected fields
      expect(user).toHaveProperty('id');
      expect(user).toHaveProperty('email');
      expect(user).toHaveProperty('name');
      expect(user).toHaveProperty('emailVerified');
      expect(user).toHaveProperty('hasCompletedOnboarding');
      expect(user).toHaveProperty('dietaryPreferences');
      expect(user).toHaveProperty('allergies');
      expect(user).toHaveProperty('mealsPerDay');

      // Verify preference values
      expect(Array.isArray(user.dietaryPreferences)).toBe(true);
      expect(Array.isArray(user.allergies)).toBe(true);
      expect(typeof user.mealsPerDay).toBe('number');
    });
  });
});
