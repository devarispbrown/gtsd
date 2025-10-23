import request from 'supertest';
import { createApp } from '../../app';
import { setupTestDatabase, teardownTestDatabase } from '../../test/setup';
import { db } from '../../db/connection';
import { users, userSettings, plans } from '../../db/schema';
import { generateAccessToken } from '../../utils/auth';
import { eq } from 'drizzle-orm';

const app = createApp();

describe('POST /v1/plans/generate', () => {
  let testUserId: number;
  let authToken: string;

  beforeAll(async () => {
    await setupTestDatabase();

    // Create test user
    const [user] = await db
      .insert(users)
      .values({
        email: 'plan-test@example.com',
        name: 'Plan Test',
      })
      .returning();

    testUserId = user.id;
    authToken = generateAccessToken({ userId: testUserId, email: user.email });
  });

  afterAll(async () => {
    // Cleanup
    await db.delete(plans).where(eq(plans.userId, testUserId));
    await db.delete(userSettings).where(eq(userSettings.userId, testUserId));
    await db.delete(users).where(eq(users.id, testUserId));

    await teardownTestDatabase();
  });

  beforeEach(async () => {
    // Clean up plans and settings before each test
    await db.delete(plans).where(eq(plans.userId, testUserId));
    await db.delete(userSettings).where(eq(userSettings.userId, testUserId));
  });

  describe('Successful Plan Generation', () => {
    beforeEach(async () => {
      // Create user settings with complete onboarding
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
    });

    it('should generate a new plan successfully', async () => {
      const response = await request(app)
        .post('/v1/plans/generate')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ forceRecompute: false });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();

      // Verify plan structure
      expect(response.body.data.plan).toBeDefined();
      expect(response.body.data.plan.id).toBeDefined();
      expect(response.body.data.plan.userId).toBe(testUserId);
      expect(response.body.data.plan.name).toContain('Weekly Plan');
      expect(response.body.data.plan.status).toBe('active');

      // Verify targets
      expect(response.body.data.targets).toBeDefined();
      expect(response.body.data.targets.bmr).toBeGreaterThan(0);
      expect(response.body.data.targets.tdee).toBeGreaterThan(0);
      expect(response.body.data.targets.calorieTarget).toBeGreaterThan(0);
      expect(response.body.data.targets.proteinTarget).toBeGreaterThan(0);
      expect(response.body.data.targets.waterTarget).toBeGreaterThan(0);
      expect(response.body.data.targets.weeklyRate).toBe(-0.5);

      // Verify whyItWorks
      expect(response.body.data.whyItWorks).toBeDefined();
      expect(response.body.data.whyItWorks.bmr).toBeDefined();
      expect(response.body.data.whyItWorks.tdee).toBeDefined();
      expect(response.body.data.whyItWorks.calorieTarget).toBeDefined();
      expect(response.body.data.whyItWorks.proteinTarget).toBeDefined();
      expect(response.body.data.whyItWorks.waterTarget).toBeDefined();
      expect(response.body.data.whyItWorks.timeline).toBeDefined();

      // Verify recomputed flag
      expect(response.body.data.recomputed).toBe(false);
    });

    it('should return existing plan if recent and not forced', async () => {
      // Generate first plan
      const firstResponse = await request(app)
        .post('/v1/plans/generate')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ forceRecompute: false });

      expect(firstResponse.status).toBe(201);
      const firstPlanId = firstResponse.body.data.plan.id;

      // Generate second plan without force (should return existing)
      const secondResponse = await request(app)
        .post('/v1/plans/generate')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ forceRecompute: false });

      expect(secondResponse.status).toBe(200);
      expect(secondResponse.body.data.plan.id).toBe(firstPlanId);
      expect(secondResponse.body.data.recomputed).toBe(false);
    });

    it('should recompute if forceRecompute is true', async () => {
      // Generate first plan
      const firstResponse = await request(app)
        .post('/v1/plans/generate')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ forceRecompute: false });

      expect(firstResponse.status).toBe(201);
      const firstPlanId = firstResponse.body.data.plan.id;
      const firstCalories = firstResponse.body.data.targets.calorieTarget;

      // Generate second plan with force
      const secondResponse = await request(app)
        .post('/v1/plans/generate')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ forceRecompute: true });

      expect(secondResponse.status).toBe(201);
      expect(secondResponse.body.data.plan.id).not.toBe(firstPlanId);
      expect(secondResponse.body.data.recomputed).toBe(true);
      expect(secondResponse.body.data.previousTargets).toBeDefined();
      expect(secondResponse.body.data.previousTargets.calorieTarget).toBe(firstCalories);
    });

    it('should update user_settings with computed targets', async () => {
      await request(app)
        .post('/v1/plans/generate')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ forceRecompute: false });

      // Fetch updated settings
      const [settings] = await db
        .select()
        .from(userSettings)
        .where(eq(userSettings.userId, testUserId));

      expect(settings.bmr).toBeGreaterThan(0);
      expect(settings.tdee).toBeGreaterThan(0);
      expect(settings.calorieTarget).toBeGreaterThan(0);
      expect(settings.proteinTarget).toBeGreaterThan(0);
      expect(settings.waterTarget).toBeGreaterThan(0);
    });

    it('should complete within p95 target (300ms)', async () => {
      const startTime = Date.now();

      await request(app)
        .post('/v1/plans/generate')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ forceRecompute: false });

      const duration = Date.now() - startTime;

      expect(duration).toBeLessThan(300);
    });
  });

  describe('Authentication and Authorization', () => {
    it('should require authentication', async () => {
      const response = await request(app)
        .post('/v1/plans/generate')
        .send({ forceRecompute: false });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });

    it('should reject invalid token', async () => {
      const response = await request(app)
        .post('/v1/plans/generate')
        .set('Authorization', 'Bearer invalid-token')
        .send({ forceRecompute: false });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });
  });

  describe('Validation and Error Cases', () => {
    it('should return 400 if user has not completed onboarding', async () => {
      // Create settings with onboarding incomplete
      await db.insert(userSettings).values({
        userId: testUserId,
        dateOfBirth: new Date('1990-01-01'),
        gender: 'male',
        currentWeight: '80',
        height: '180',
        activityLevel: 'sedentary',
        primaryGoal: 'maintain',
        onboardingCompleted: false, // Not completed
      });

      const response = await request(app)
        .post('/v1/plans/generate')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ forceRecompute: false });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('onboarding');
    });

    it('should return 404 if user has no settings', async () => {
      const response = await request(app)
        .post('/v1/plans/generate')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ forceRecompute: false });

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('not found');
    });

    it('should validate request body schema', async () => {
      // Create settings first
      await db.insert(userSettings).values({
        userId: testUserId,
        dateOfBirth: new Date('1990-01-01'),
        gender: 'male',
        currentWeight: '80',
        height: '180',
        activityLevel: 'sedentary',
        primaryGoal: 'maintain',
        onboardingCompleted: true,
      });

      // Send invalid body
      const response = await request(app)
        .post('/v1/plans/generate')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ forceRecompute: 'not-a-boolean' });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should handle missing required user data', async () => {
      // Create settings with missing height
      await db.insert(userSettings).values({
        userId: testUserId,
        dateOfBirth: new Date('1990-01-01'),
        gender: 'male',
        currentWeight: '80',
        height: null, // Missing
        activityLevel: 'sedentary',
        primaryGoal: 'maintain',
        onboardingCompleted: true,
      });

      const response = await request(app)
        .post('/v1/plans/generate')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ forceRecompute: false });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('Different User Profiles', () => {
    it('should generate plan for female user', async () => {
      await db.insert(userSettings).values({
        userId: testUserId,
        dateOfBirth: new Date('1992-05-15'),
        gender: 'female',
        currentWeight: '65',
        height: '165',
        targetWeight: '60',
        activityLevel: 'lightly_active',
        primaryGoal: 'lose_weight',
        onboardingCompleted: true,
      });

      const response = await request(app)
        .post('/v1/plans/generate')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ forceRecompute: false });

      expect(response.status).toBe(201);
      expect(response.body.data.targets.bmr).toBeGreaterThan(0);
      expect(response.body.data.targets.weeklyRate).toBe(-0.5);
    });

    it('should generate plan for muscle gain goal', async () => {
      await db.insert(userSettings).values({
        userId: testUserId,
        dateOfBirth: new Date('1988-08-20'),
        gender: 'male',
        currentWeight: '70',
        height: '175',
        targetWeight: '75',
        activityLevel: 'very_active',
        primaryGoal: 'gain_muscle',
        onboardingCompleted: true,
      });

      const response = await request(app)
        .post('/v1/plans/generate')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ forceRecompute: false });

      expect(response.status).toBe(201);
      expect(response.body.data.targets.weeklyRate).toBe(0.4);
      expect(response.body.data.targets.calorieTarget).toBeGreaterThan(
        response.body.data.targets.tdee
      ); // Surplus for muscle gain
    });

    it('should generate plan for maintenance goal', async () => {
      await db.insert(userSettings).values({
        userId: testUserId,
        dateOfBirth: new Date('1995-03-10'),
        gender: 'other',
        currentWeight: '75',
        height: '170',
        targetWeight: null, // No target weight for maintenance
        activityLevel: 'moderately_active',
        primaryGoal: 'maintain',
        onboardingCompleted: true,
      });

      const response = await request(app)
        .post('/v1/plans/generate')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ forceRecompute: false });

      expect(response.status).toBe(201);
      expect(response.body.data.targets.weeklyRate).toBe(0);
      expect(response.body.data.targets.calorieTarget).toBe(response.body.data.targets.tdee); // No deficit/surplus
      expect(response.body.data.targets.estimatedWeeks).toBeUndefined();
      expect(response.body.data.targets.projectedDate).toBeUndefined();
    });

    it('should generate plan for improve_health goal', async () => {
      await db.insert(userSettings).values({
        userId: testUserId,
        dateOfBirth: new Date('1980-11-25'),
        gender: 'female',
        currentWeight: '68',
        height: '160',
        targetWeight: null,
        activityLevel: 'sedentary',
        primaryGoal: 'improve_health',
        onboardingCompleted: true,
      });

      const response = await request(app)
        .post('/v1/plans/generate')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ forceRecompute: false });

      expect(response.status).toBe(201);
      expect(response.body.data.targets.weeklyRate).toBe(0);
    });
  });

  describe('Response Structure', () => {
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
    });

    it('should return complete plan object', async () => {
      const response = await request(app)
        .post('/v1/plans/generate')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ forceRecompute: false });

      expect(response.body.data.plan).toMatchObject({
        id: expect.any(Number),
        userId: testUserId,
        name: expect.any(String),
        description: expect.any(String),
        startDate: expect.any(String),
        endDate: expect.any(String),
        status: 'active',
      });
    });

    it('should return complete targets object', async () => {
      const response = await request(app)
        .post('/v1/plans/generate')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ forceRecompute: false });

      expect(response.body.data.targets).toMatchObject({
        bmr: expect.any(Number),
        tdee: expect.any(Number),
        calorieTarget: expect.any(Number),
        proteinTarget: expect.any(Number),
        waterTarget: expect.any(Number),
        weeklyRate: expect.any(Number),
        estimatedWeeks: expect.any(Number),
        projectedDate: expect.any(String),
      });
    });

    it('should return complete whyItWorks object', async () => {
      const response = await request(app)
        .post('/v1/plans/generate')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ forceRecompute: false });

      const whyItWorks = response.body.data.whyItWorks;

      // BMR section
      expect(whyItWorks.bmr).toMatchObject({
        title: expect.any(String),
        explanation: expect.any(String),
        formula: expect.any(String),
      });

      // TDEE section
      expect(whyItWorks.tdee).toMatchObject({
        title: expect.any(String),
        explanation: expect.any(String),
        activityMultiplier: expect.any(Number),
      });

      // Calorie target section
      expect(whyItWorks.calorieTarget).toMatchObject({
        title: expect.any(String),
        explanation: expect.any(String),
        deficit: expect.any(Number),
      });

      // Protein target section
      expect(whyItWorks.proteinTarget).toMatchObject({
        title: expect.any(String),
        explanation: expect.any(String),
        gramsPerKg: expect.any(Number),
      });

      // Water target section
      expect(whyItWorks.waterTarget).toMatchObject({
        title: expect.any(String),
        explanation: expect.any(String),
        mlPerKg: expect.any(Number),
      });

      // Timeline section
      expect(whyItWorks.timeline).toMatchObject({
        title: expect.any(String),
        explanation: expect.any(String),
        weeklyRate: expect.any(Number),
        estimatedWeeks: expect.any(Number),
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle user with exact boundary values', async () => {
      await db.insert(userSettings).values({
        userId: testUserId,
        dateOfBirth: new Date('2011-01-01'), // 13 years old (minimum age)
        gender: 'male',
        currentWeight: '30', // Minimum weight
        height: '100', // Minimum height
        activityLevel: 'sedentary',
        primaryGoal: 'maintain',
        onboardingCompleted: true,
      });

      const response = await request(app)
        .post('/v1/plans/generate')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ forceRecompute: false });

      expect(response.status).toBe(201);
      expect(response.body.data.targets.bmr).toBeGreaterThan(0);
    });

    it('should handle default forceRecompute when not provided', async () => {
      await db.insert(userSettings).values({
        userId: testUserId,
        dateOfBirth: new Date('1990-01-01'),
        gender: 'male',
        currentWeight: '80',
        height: '180',
        activityLevel: 'sedentary',
        primaryGoal: 'maintain',
        onboardingCompleted: true,
      });

      // Don't send forceRecompute (should default to false)
      const response = await request(app)
        .post('/v1/plans/generate')
        .set('Authorization', `Bearer ${authToken}`)
        .send({});

      expect(response.status).toBe(201);
      expect(response.body.data.recomputed).toBe(false);
    });
  });
});
