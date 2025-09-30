import request from 'supertest';
import { createApp } from '../../app';

describe('Onboarding Routes', () => {
  const app = createApp();

  describe('POST /v1/onboarding', () => {
    it('should return 401 if userId is not provided', async () => {
      const response = await request(app).post('/v1/onboarding').send({
        dateOfBirth: '1995-03-15T00:00:00.000Z',
        gender: 'female',
        primaryGoal: 'lose_weight',
        targetWeight: 65,
        targetDate: '2025-12-31T00:00:00.000Z',
        activityLevel: 'moderately_active',
        currentWeight: 75,
        height: 165,
        dietaryPreferences: [],
        allergies: [],
        mealsPerDay: 3,
        partners: [],
      });

      expect(response.status).toBe(401);
      expect(response.body.error).toBeDefined();
    });

    it('should return 400 for invalid input', async () => {
      const response = await request(app)
        .post('/v1/onboarding')
        .set('X-User-Id', '1')
        .send({
          dateOfBirth: 'invalid-date',
          gender: 'invalid',
          currentWeight: -10,
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBeDefined();
    });

    it('should validate date of birth age range', async () => {
      const tooYoung = new Date();
      tooYoung.setFullYear(tooYoung.getFullYear() - 10);

      const response = await request(app)
        .post('/v1/onboarding')
        .set('X-User-Id', '1')
        .send({
          dateOfBirth: tooYoung.toISOString(),
          gender: 'male',
          primaryGoal: 'gain_muscle',
          targetWeight: 85,
          targetDate: '2025-12-31T00:00:00.000Z',
          activityLevel: 'very_active',
          currentWeight: 80,
          height: 180,
        });

      expect(response.status).toBe(400);
      expect(response.body.error.message).toContain('13 and 120 years old');
    });

    it('should validate target date is in future', async () => {
      const pastDate = new Date();
      pastDate.setFullYear(pastDate.getFullYear() - 1);

      const response = await request(app)
        .post('/v1/onboarding')
        .set('X-User-Id', '1')
        .send({
          dateOfBirth: '1990-01-01T00:00:00.000Z',
          gender: 'male',
          primaryGoal: 'maintain',
          targetWeight: 75,
          targetDate: pastDate.toISOString(),
          activityLevel: 'moderately_active',
          currentWeight: 75,
          height: 175,
        });

      expect(response.status).toBe(400);
      expect(response.body.error.message).toContain('future');
    });

    it('should validate partner contact information', async () => {
      const futureDate = new Date();
      futureDate.setFullYear(futureDate.getFullYear() + 1);

      const response = await request(app)
        .post('/v1/onboarding')
        .set('X-User-Id', '1')
        .send({
          dateOfBirth: '1990-01-01T00:00:00.000Z',
          gender: 'female',
          primaryGoal: 'lose_weight',
          targetWeight: 60,
          targetDate: futureDate.toISOString(),
          activityLevel: 'lightly_active',
          currentWeight: 70,
          height: 160,
          partners: [
            {
              name: 'Test Partner',
              // No email or phone
            },
          ],
        });

      expect(response.status).toBe(400);
      expect(response.body.error.message).toContain('email or phone');
    });
  });

  describe('GET /v1/summary/how-it-works', () => {
    it('should return 401 if userId is not provided', async () => {
      const response = await request(app).get('/v1/summary/how-it-works');

      expect(response.status).toBe(401);
      expect(response.body.error).toBeDefined();
    });

    it.skip('should return 404 if user settings not found', async () => {
      const response = await request(app)
        .get('/v1/summary/how-it-works')
        .set('X-User-Id', '99999');

      // Debug output
      if (response.status !== 404) {
        console.log('Response status:', response.status);
        console.log('Response body:', JSON.stringify(response.body, null, 2));
      }

      expect(response.status).toBe(404);
      expect(response.body.error.message).toContain('settings not found');
    });
  });

  describe('Validation Schemas', () => {
    it('should accept valid onboarding data', async () => {
      const futureDate = new Date();
      futureDate.setFullYear(futureDate.getFullYear() + 1);

      const validData = {
        dateOfBirth: '1990-05-15T00:00:00.000Z',
        gender: 'male',
        primaryGoal: 'gain_muscle',
        targetWeight: 85,
        targetDate: futureDate.toISOString(),
        activityLevel: 'very_active',
        currentWeight: 80,
        height: 180,
        dietaryPreferences: ['vegetarian'],
        allergies: ['peanuts'],
        mealsPerDay: 4,
        partners: [
          {
            name: 'Coach John',
            email: 'john@example.com',
            relationship: 'coach',
          },
        ],
      };

      // We expect this to fail with 500 since DB won't have user
      // but it should pass validation (not 400)
      const response = await request(app)
        .post('/v1/onboarding')
        .set('X-User-Id', '1')
        .send(validData);

      expect(response.status).not.toBe(400);
    });

    it('should validate weight range', async () => {
      const futureDate = new Date();
      futureDate.setFullYear(futureDate.getFullYear() + 1);

      const response = await request(app)
        .post('/v1/onboarding')
        .set('X-User-Id', '1')
        .send({
          dateOfBirth: '1990-01-01T00:00:00.000Z',
          gender: 'male',
          primaryGoal: 'maintain',
          targetWeight: 600, // Too high
          targetDate: futureDate.toISOString(),
          activityLevel: 'moderately_active',
          currentWeight: 75,
          height: 175,
        });

      expect(response.status).toBe(400);
    });

    it('should validate height range', async () => {
      const futureDate = new Date();
      futureDate.setFullYear(futureDate.getFullYear() + 1);

      const response = await request(app)
        .post('/v1/onboarding')
        .set('X-User-Id', '1')
        .send({
          dateOfBirth: '1990-01-01T00:00:00.000Z',
          gender: 'female',
          primaryGoal: 'lose_weight',
          targetWeight: 65,
          targetDate: futureDate.toISOString(),
          activityLevel: 'moderately_active',
          currentWeight: 75,
          height: 400, // Too tall
        });

      expect(response.status).toBe(400);
    });

    it('should validate enum values', async () => {
      const futureDate = new Date();
      futureDate.setFullYear(futureDate.getFullYear() + 1);

      const response = await request(app)
        .post('/v1/onboarding')
        .set('X-User-Id', '1')
        .send({
          dateOfBirth: '1990-01-01T00:00:00.000Z',
          gender: 'invalid-gender',
          primaryGoal: 'lose_weight',
          targetWeight: 65,
          targetDate: futureDate.toISOString(),
          activityLevel: 'moderately_active',
          currentWeight: 75,
          height: 165,
        });

      expect(response.status).toBe(400);
    });
  });
});