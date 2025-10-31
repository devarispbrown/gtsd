import request from 'supertest';
import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import { createApp } from '../../app';
import { db } from '../../db/connection';
import { users, userSettings, profileChangeAudit } from '../../db/schema';
import { eq } from 'drizzle-orm';
import { sign } from 'jsonwebtoken';
import { Application } from 'express';

const JWT_SECRET = process.env.JWT_SECRET || 'test-secret-key-at-least-32-characters-long-for-testing';

let app: Application;
let testUserId: number;
let authToken: string;

describe('Profile Edit API', () => {
  beforeAll(() => {
    app = createApp();
  });

  beforeEach(async () => {
    // Clean up test data
    await db.delete(profileChangeAudit);
    await db.delete(userSettings);
    await db.delete(users).where(eq(users.email, 'profile-test@example.com'));

    // Create test user
    const [user] = await db
      .insert(users)
      .values({
        email: 'profile-test@example.com',
        name: 'Profile Test User',
        passwordHash: 'hashed_password',
      })
      .returning();

    testUserId = user.id;

    // Create user settings
    await db.insert(userSettings).values({
      userId: testUserId,
      dateOfBirth: new Date('1990-01-15'),
      gender: 'male',
      height: '175',
      currentWeight: '85.0',
      targetWeight: '75.0',
      primaryGoal: 'lose_weight',
      targetDate: new Date('2026-03-01'),
      activityLevel: 'moderately_active',
      bmr: 1650,
      tdee: 2200,
      calorieTarget: 1850,
      proteinTarget: 140,
      waterTarget: 2625,
      dietaryPreferences: ['vegetarian'],
      allergies: ['peanuts'],
      mealsPerDay: 3,
      onboardingCompleted: true,
      onboardingCompletedAt: new Date(),
    });

    // Generate auth token
    authToken = sign(
      { userId: testUserId, email: user.email },
      JWT_SECRET,
      {
        expiresIn: '1h',
        issuer: 'gtsd-api',
        audience: 'gtsd-client',
      }
    );
  });

  afterAll(async () => {
    // Clean up
    await db.delete(profileChangeAudit);
    await db.delete(userSettings);
    await db.delete(users).where(eq(users.email, 'profile-test@example.com'));
  });

  describe('GET /v1/profile', () => {
    it('should return complete profile with all fields', async () => {
      const response = await request(app)
        .get('/v1/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.profile).toBeDefined();

      const { profile } = response.body;

      // User info
      expect(profile.user.id).toBe(testUserId);
      expect(profile.user.email).toBe('profile-test@example.com');
      expect(profile.user.name).toBe('Profile Test User');

      // Demographics
      expect(profile.demographics.gender).toBe('male');
      expect(profile.demographics.height).toBe(175);
      expect(profile.demographics.dateOfBirth).toContain('1990-01-15');

      // Health
      expect(profile.health.currentWeight).toBe(85);
      expect(profile.health.targetWeight).toBe(75);

      // Goals
      expect(profile.goals.primaryGoal).toBe('lose_weight');
      expect(profile.goals.activityLevel).toBe('moderately_active');
      expect(profile.goals.targetDate).toContain('2026-03-01');

      // Preferences
      expect(profile.preferences.dietaryPreferences).toEqual(['vegetarian']);
      expect(profile.preferences.allergies).toEqual(['peanuts']);
      expect(profile.preferences.mealsPerDay).toBe(3);

      // Targets
      expect(profile.targets.bmr).toBe(1650);
      expect(profile.targets.tdee).toBe(2200);
      expect(profile.targets.calorieTarget).toBe(1850);
      expect(profile.targets.proteinTarget).toBe(140);
      expect(profile.targets.waterTarget).toBe(2625);
    });

    it('should return 401 without auth token', async () => {
      await request(app).get('/v1/profile').expect(401);
    });

    it('should return 404 if user settings not found', async () => {
      // Delete settings
      await db.delete(userSettings).where(eq(userSettings.userId, testUserId));

      await request(app).get('/v1/profile').set('Authorization', `Bearer ${authToken}`).expect(404);
    });
  });

  describe('PUT /v1/profile', () => {
    it('should update health metrics and trigger plan regeneration', async () => {
      const response = await request(app)
        .put('/v1/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          currentWeight: 82.5,
          targetWeight: 72.0,
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.planUpdated).toBe(true);
      expect(response.body.profile.health).toBeDefined();
      expect(response.body.profile.health.currentWeight).toBe(82.5);
      expect(response.body.profile.health.targetWeight).toBe(72);

      // Should include new targets
      expect(response.body.targets).toBeDefined();
      expect(response.body.targets.calorieTarget).toBeDefined();
      expect(response.body.targets.proteinTarget).toBeDefined();

      // Should include changes comparison
      expect(response.body.changes).toBeDefined();
      expect(response.body.changes.previousCalories).toBe(1850);
      expect(response.body.changes.previousProtein).toBe(140);

      // Verify database update
      const [settings] = await db
        .select()
        .from(userSettings)
        .where(eq(userSettings.userId, testUserId));

      expect(parseFloat(settings.currentWeight!.toString())).toBe(82.5);
      expect(parseFloat(settings.targetWeight!.toString())).toBe(72);
    });

    it('should update preferences without triggering plan regeneration', async () => {
      const response = await request(app)
        .put('/v1/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          dietaryPreferences: ['vegetarian', 'gluten_free'],
          allergies: ['peanuts', 'shellfish'],
          mealsPerDay: 4,
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.planUpdated).toBe(false);
      expect(response.body.profile.preferences).toBeDefined();
      expect(response.body.profile.preferences.dietaryPreferences).toEqual([
        'vegetarian',
        'gluten_free',
      ]);
      expect(response.body.profile.preferences.allergies).toEqual(['peanuts', 'shellfish']);
      expect(response.body.profile.preferences.mealsPerDay).toBe(4);

      // Should not include targets or changes
      expect(response.body.targets).toBeUndefined();
      expect(response.body.changes).toBeUndefined();
    });

    it('should log changes to audit trail', async () => {
      await request(app)
        .put('/v1/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          currentWeight: 83.0,
          primaryGoal: 'gain_muscle',
        })
        .expect(200);

      // Check audit records
      const auditRecords = await db
        .select()
        .from(profileChangeAudit)
        .where(eq(profileChangeAudit.userId, testUserId));

      expect(auditRecords.length).toBeGreaterThanOrEqual(2);

      const weightChange = auditRecords.find((r) => r.fieldName === 'currentWeight');
      expect(weightChange).toBeDefined();
      expect(weightChange!.oldValue).toBe('85');
      expect(weightChange!.newValue).toBe('83');
      expect(weightChange!.triggeredPlanRegeneration).toBe(true);

      const goalChange = auditRecords.find((r) => r.fieldName === 'primaryGoal');
      expect(goalChange).toBeDefined();
      expect(goalChange!.oldValue).toBe('lose_weight');
      expect(goalChange!.newValue).toBe('gain_muscle');
    });

    it('should validate weight range', async () => {
      const response = await request(app)
        .put('/v1/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          currentWeight: 600, // Exceeds max (500kg)
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Validation error');
    });

    it('should validate height range', async () => {
      const response = await request(app)
        .put('/v1/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          height: 400, // Exceeds max (300cm)
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Validation error');
    });

    it('should validate target date is in future', async () => {
      const response = await request(app)
        .put('/v1/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          targetDate: '2020-01-01T00:00:00.000Z', // Past date
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Validation error');
    });

    it('should validate enum values for primaryGoal', async () => {
      const response = await request(app)
        .put('/v1/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          primaryGoal: 'invalid_goal',
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Validation error');
    });

    it('should validate enum values for activityLevel', async () => {
      const response = await request(app)
        .put('/v1/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          activityLevel: 'super_active', // Invalid
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Validation error');
    });

    it('should validate mealsPerDay range', async () => {
      const response = await request(app)
        .put('/v1/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          mealsPerDay: 15, // Exceeds max (10)
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Validation error');
    });

    it('should require at least one field for update', async () => {
      const response = await request(app)
        .put('/v1/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .send({})
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Validation error');
    });

    it('should handle partial updates correctly', async () => {
      const response = await request(app)
        .put('/v1/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          mealsPerDay: 5,
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.profile.preferences.mealsPerDay).toBe(5);

      // Other fields should remain unchanged
      const [settings] = await db
        .select()
        .from(userSettings)
        .where(eq(userSettings.userId, testUserId));

      expect(parseFloat(settings.currentWeight!.toString())).toBe(85);
      expect(settings.gender).toBe('male');
    });

    it('should return early if no actual changes detected', async () => {
      const response = await request(app)
        .put('/v1/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          currentWeight: 85.0, // Same as current value
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.planUpdated).toBe(false);
      expect(Object.keys(response.body.profile).length).toBe(0);
    });

    it('should return 401 without auth token', async () => {
      await request(app)
        .put('/v1/profile')
        .send({
          currentWeight: 80,
        })
        .expect(401);
    });
  });

  describe('Plan Regeneration Logic', () => {
    it('should regenerate plan for impactful fields', async () => {
      const impactfulFields = [
        { field: 'currentWeight', value: 80 },
        { field: 'targetWeight', value: 70 },
        { field: 'height', value: 180 },
        { field: 'primaryGoal', value: 'gain_muscle' },
        { field: 'activityLevel', value: 'very_active' },
      ];

      for (const { field, value } of impactfulFields) {
        const response = await request(app)
          .put('/v1/profile')
          .set('Authorization', `Bearer ${authToken}`)
          .send({ [field]: value })
          .expect(200);

        expect(response.body.planUpdated).toBe(true);
        expect(response.body.targets).toBeDefined();
      }
    });

    it('should not regenerate plan for non-impactful fields', async () => {
      const response = await request(app)
        .put('/v1/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          dietaryPreferences: ['vegan'],
          allergies: ['soy'],
          mealsPerDay: 5,
        })
        .expect(200);

      expect(response.body.planUpdated).toBe(false);
      expect(response.body.targets).toBeUndefined();
    });
  });

  describe('Audit Trail', () => {
    it('should log IP address and user agent', async () => {
      await request(app)
        .put('/v1/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .set('User-Agent', 'Test-Client/1.0')
        .send({
          currentWeight: 84,
        })
        .expect(200);

      const [auditRecord] = await db
        .select()
        .from(profileChangeAudit)
        .where(eq(profileChangeAudit.userId, testUserId));

      expect(auditRecord.ipAddress).toBeDefined();
      expect(auditRecord.userAgent).toBe('Test-Client/1.0');
    });

    it('should log plan regeneration impact', async () => {
      await request(app)
        .put('/v1/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          currentWeight: 82,
        })
        .expect(200);

      const [auditRecord] = await db
        .select()
        .from(profileChangeAudit)
        .where(eq(profileChangeAudit.userId, testUserId));

      expect(auditRecord.triggeredPlanRegeneration).toBe(true);
      expect(auditRecord.caloriesBefore).toBeDefined();
      expect(auditRecord.caloriesAfter).toBeDefined();
      expect(auditRecord.proteinBefore).toBeDefined();
      expect(auditRecord.proteinAfter).toBeDefined();
    });
  });
});
