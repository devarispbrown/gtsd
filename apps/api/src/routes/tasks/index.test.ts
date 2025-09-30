import request from 'supertest';
import { createApp } from '../../app';
import { db } from '../../db/connection';
import { dailyTasks, evidence, plans, streaks, users } from '../../db/schema';
import { eq, and } from 'drizzle-orm';
import { tasksCache } from './cache';

describe('Tasks Routes', () => {
  const app = createApp();
  let testUserId: number;
  let testTaskId: number;
  let testPlanId: number;

  beforeAll(async () => {
    // Create a test user
    const [user] = await db
      .insert(users)
      .values({
        email: 'test-tasks@example.com',
        name: 'Test Tasks User',
      })
      .returning();
    testUserId = user.id;

    // Create a test plan
    const today = new Date();
    const startOfDay = new Date(today.setHours(0, 0, 0, 0));
    const endOfDay = new Date(today.setHours(23, 59, 59, 999));

    const [plan] = await db
      .insert(plans)
      .values({
        userId: testUserId,
        name: 'Test Daily Plan',
        planType: 'daily',
        startDate: startOfDay,
        endDate: endOfDay,
        status: 'active',
      })
      .returning();
    testPlanId = plan.id;

    // Create test tasks
    const [task] = await db
      .insert(dailyTasks)
      .values({
        userId: testUserId,
        planId: testPlanId,
        title: 'Test Workout',
        taskType: 'workout',
        dueDate: new Date(),
        status: 'pending',
        priority: 1,
      })
      .returning();
    testTaskId = task.id;

    // Initialize streak for user
    await db.insert(streaks).values({
      userId: testUserId,
      streakType: 'overall',
      currentStreak: 0,
      longestStreak: 0,
      totalCompletions: 0,
    });
  });

  afterAll(async () => {
    // Cleanup test data
    if (testUserId) {
      await db.delete(evidence).where(eq(evidence.userId, testUserId));
      await db.delete(dailyTasks).where(eq(dailyTasks.userId, testUserId));
      await db.delete(streaks).where(eq(streaks.userId, testUserId));
      await db.delete(plans).where(eq(plans.userId, testUserId));
      await db.delete(users).where(eq(users.id, testUserId));
    }
    await tasksCache.flush();
  });

  afterEach(async () => {
    // Clear cache after each test
    await tasksCache.flush();
  });

  describe('GET /v1/tasks/today', () => {
    it('should return 401 if userId is not provided', async () => {
      const response = await request(app).get('/v1/tasks/today');

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error.message).toBe('Authentication required');
    });

    it('should return tasks for authenticated user', async () => {
      const response = await request(app)
        .get('/v1/tasks/today')
        .set('X-User-Id', testUserId.toString());

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('totalTasks');
      expect(response.body.data).toHaveProperty('completedTasks');
      expect(response.body.data).toHaveProperty('tasksByType');
      expect(response.body.data).toHaveProperty('streak');
      expect(response.body.data).toHaveProperty('pagination');
      expect(response.body).toHaveProperty('cached', false);
    });

    it('should return cached response on second request', async () => {
      // First request
      await request(app).get('/v1/tasks/today').set('X-User-Id', testUserId.toString());

      // Second request (should be cached)
      const response = await request(app)
        .get('/v1/tasks/today')
        .set('X-User-Id', testUserId.toString());

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('cached', true);
    });

    it('should accept date query parameter in YYYY-MM-DD format', async () => {
      const response = await request(app)
        .get('/v1/tasks/today')
        .query({ date: '2025-01-15' })
        .set('X-User-Id', testUserId.toString());

      expect(response.status).toBe(200);
      expect(response.body.data.date).toBe('2025-01-15');
    });

    it('should reject invalid date format', async () => {
      const response = await request(app)
        .get('/v1/tasks/today')
        .query({ date: 'invalid-date' })
        .set('X-User-Id', testUserId.toString());

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });

    it('should accept limit query parameter', async () => {
      const response = await request(app)
        .get('/v1/tasks/today')
        .query({ limit: '10' })
        .set('X-User-Id', testUserId.toString());

      expect(response.status).toBe(200);
      expect(response.body.data.pagination.limit).toBe(10);
    });

    it('should reject limit greater than 100', async () => {
      const response = await request(app)
        .get('/v1/tasks/today')
        .query({ limit: '150' })
        .set('X-User-Id', testUserId.toString());

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });

    it('should accept offset query parameter', async () => {
      const response = await request(app)
        .get('/v1/tasks/today')
        .query({ offset: '10' })
        .set('X-User-Id', testUserId.toString());

      expect(response.status).toBe(200);
      expect(response.body.data.pagination.offset).toBe(10);
    });

    it('should filter by task type', async () => {
      const response = await request(app)
        .get('/v1/tasks/today')
        .query({ type: 'workout' })
        .set('X-User-Id', testUserId.toString());

      expect(response.status).toBe(200);
      // Check that only workout tasks are returned
      const tasksByType = response.body.data.tasksByType;
      const taskTypes = Object.keys(tasksByType);
      taskTypes.forEach((type) => {
        expect(type).toBe('workout');
      });
    });

    it('should reject invalid task type', async () => {
      const response = await request(app)
        .get('/v1/tasks/today')
        .query({ type: 'invalid_type' })
        .set('X-User-Id', testUserId.toString());

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });

    it('should include streak information', async () => {
      const response = await request(app)
        .get('/v1/tasks/today')
        .set('X-User-Id', testUserId.toString());

      expect(response.status).toBe(200);
      expect(response.body.data.streak).toHaveProperty('current');
      expect(response.body.data.streak).toHaveProperty('longest');
      expect(response.body.data.streak).toHaveProperty('totalDays');
    });

    it('should include pagination metadata', async () => {
      const response = await request(app)
        .get('/v1/tasks/today')
        .set('X-User-Id', testUserId.toString());

      expect(response.status).toBe(200);
      expect(response.body.data.pagination).toHaveProperty('limit');
      expect(response.body.data.pagination).toHaveProperty('offset');
      expect(response.body.data.pagination).toHaveProperty('total');
      expect(response.body.data.pagination).toHaveProperty('hasMore');
    });
  });

  describe('POST /v1/evidence', () => {
    it('should return 401 if userId is not provided', async () => {
      const response = await request(app).post('/v1/evidence').send({
        taskId: testTaskId,
        type: 'text_log',
        data: { text: 'Test log' },
      });

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error.message).toBe('Authentication required');
    });

    it('should create text_log evidence and mark task complete', async () => {
      const response = await request(app)
        .post('/v1/evidence')
        .set('X-User-Id', testUserId.toString())
        .send({
          taskId: testTaskId,
          type: 'text_log',
          data: { text: 'Completed 3 sets of 10 reps' },
          notes: 'Felt strong today',
        });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('task');
      expect(response.body.data).toHaveProperty('evidence');
      expect(response.body.data).toHaveProperty('streakUpdated');
      expect(response.body.data).toHaveProperty('newStreak');

      expect(response.body.data.task.status).toBe('completed');
      expect(response.body.data.evidence.type).toBe('text_log');
      expect(response.body.data.streakUpdated).toBe(true);
      expect(response.body.data.newStreak).toBeGreaterThan(0);
    });

    it('should create metrics evidence', async () => {
      // Create a new task for this test
      const [newTask] = await db
        .insert(dailyTasks)
        .values({
          userId: testUserId,
          planId: testPlanId,
          title: 'Test Workout 2',
          taskType: 'workout',
          dueDate: new Date(),
          status: 'pending',
        })
        .returning();

      const response = await request(app)
        .post('/v1/evidence')
        .set('X-User-Id', testUserId.toString())
        .send({
          taskId: newTask.id,
          type: 'metrics',
          data: {
            metrics: {
              actualSets: 3,
              actualReps: 12,
              actualWeight: 50,
              actualDuration: 45,
            },
          },
        });

      expect(response.status).toBe(201);
      expect(response.body.data.evidence.type).toBe('metrics');
      expect(response.body.data.evidence.metrics).toHaveProperty('actualSets', 3);
      expect(response.body.data.evidence.metrics).toHaveProperty('actualReps', 12);
    });

    it('should create photo_reference evidence', async () => {
      // Create a new task for this test
      const [newTask] = await db
        .insert(dailyTasks)
        .values({
          userId: testUserId,
          planId: testPlanId,
          title: 'Test Progress Photo',
          taskType: 'progress_photo',
          dueDate: new Date(),
          status: 'pending',
        })
        .returning();

      const response = await request(app)
        .post('/v1/evidence')
        .set('X-User-Id', testUserId.toString())
        .send({
          taskId: newTask.id,
          type: 'photo_reference',
          data: {
            photoUrl: 'https://example.com/photo.jpg',
            photoStorageKey: 's3://bucket/user123/photo.jpg',
          },
        });

      expect(response.status).toBe(201);
      expect(response.body.data.evidence.type).toBe('photo_reference');
      expect(response.body.data.evidence.photoUrl).toBe('https://example.com/photo.jpg');
      expect(response.body.data.evidence.photoStorageKey).toBe('s3://bucket/user123/photo.jpg');
    });

    it('should return 404 for non-existent task', async () => {
      const response = await request(app)
        .post('/v1/evidence')
        .set('X-User-Id', testUserId.toString())
        .send({
          taskId: 999999,
          type: 'text_log',
          data: { text: 'Test log' },
        });

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('error');
    });

    it('should return 404 for task belonging to another user', async () => {
      // Create another user and task
      const [anotherUser] = await db
        .insert(users)
        .values({
          email: 'another@example.com',
          name: 'Another User',
        })
        .returning();

      const [anotherPlan] = await db
        .insert(plans)
        .values({
          userId: anotherUser.id,
          name: 'Another Plan',
          planType: 'daily',
          startDate: new Date(),
          endDate: new Date(),
          status: 'active',
        })
        .returning();

      const [anotherTask] = await db
        .insert(dailyTasks)
        .values({
          userId: anotherUser.id,
          planId: anotherPlan.id,
          title: 'Another Task',
          taskType: 'workout',
          dueDate: new Date(),
          status: 'pending',
        })
        .returning();

      const response = await request(app)
        .post('/v1/evidence')
        .set('X-User-Id', testUserId.toString())
        .send({
          taskId: anotherTask.id,
          type: 'text_log',
          data: { text: 'Test log' },
        });

      expect(response.status).toBe(404);

      // Cleanup
      await db.delete(dailyTasks).where(eq(dailyTasks.userId, anotherUser.id));
      await db.delete(plans).where(eq(plans.userId, anotherUser.id));
      await db.delete(users).where(eq(users.id, anotherUser.id));
    });

    it('should reject invalid evidence type', async () => {
      const response = await request(app)
        .post('/v1/evidence')
        .set('X-User-Id', testUserId.toString())
        .send({
          taskId: testTaskId,
          type: 'invalid_type',
          data: { text: 'Test log' },
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });

    it('should reject data that does not match evidence type', async () => {
      // Create a new task for this test
      const [newTask] = await db
        .insert(dailyTasks)
        .values({
          userId: testUserId,
          planId: testPlanId,
          title: 'Test Task for Validation',
          taskType: 'workout',
          dueDate: new Date(),
          status: 'pending',
        })
        .returning();

      const response = await request(app)
        .post('/v1/evidence')
        .set('X-User-Id', testUserId.toString())
        .send({
          taskId: newTask.id,
          type: 'text_log',
          data: { photoUrl: 'https://example.com/photo.jpg' }, // Wrong data for text_log
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });

    it('should accept notes as optional parameter', async () => {
      // Create a new task for this test
      const [newTask] = await db
        .insert(dailyTasks)
        .values({
          userId: testUserId,
          planId: testPlanId,
          title: 'Test Task with Notes',
          taskType: 'workout',
          dueDate: new Date(),
          status: 'pending',
        })
        .returning();

      const response = await request(app)
        .post('/v1/evidence')
        .set('X-User-Id', testUserId.toString())
        .send({
          taskId: newTask.id,
          type: 'text_log',
          data: { text: 'Completed workout' },
        });

      expect(response.status).toBe(201);
    });

    it('should invalidate cache after creating evidence', async () => {
      // Create a new task for this test
      const [newTask] = await db
        .insert(dailyTasks)
        .values({
          userId: testUserId,
          planId: testPlanId,
          title: 'Test Cache Invalidation',
          taskType: 'workout',
          dueDate: new Date(),
          status: 'pending',
        })
        .returning();

      // First GET request to populate cache
      await request(app).get('/v1/tasks/today').set('X-User-Id', testUserId.toString());

      // Create evidence (should invalidate cache)
      await request(app)
        .post('/v1/evidence')
        .set('X-User-Id', testUserId.toString())
        .send({
          taskId: newTask.id,
          type: 'text_log',
          data: { text: 'Test' },
        });

      // Second GET request should not be cached
      const response = await request(app)
        .get('/v1/tasks/today')
        .set('X-User-Id', testUserId.toString());

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('cached', false);
    });

    it('should not update streak for already completed task', async () => {
      // Create a completed task
      const [completedTask] = await db
        .insert(dailyTasks)
        .values({
          userId: testUserId,
          planId: testPlanId,
          title: 'Already Completed Task',
          taskType: 'workout',
          dueDate: new Date(),
          status: 'completed',
          completedAt: new Date(),
        })
        .returning();

      // Get current streak
      const [currentStreak] = await db
        .select()
        .from(streaks)
        .where(and(eq(streaks.userId, testUserId), eq(streaks.streakType, 'overall')))
        .limit(1);

      const streakBeforeEvidence = currentStreak.currentStreak;

      // Add evidence to already completed task
      const response = await request(app)
        .post('/v1/evidence')
        .set('X-User-Id', testUserId.toString())
        .send({
          taskId: completedTask.id,
          type: 'text_log',
          data: { text: 'Additional evidence' },
        });

      expect(response.status).toBe(201);
      expect(response.body.data.streakUpdated).toBe(false);

      // Verify streak didn't change
      const [updatedStreak] = await db
        .select()
        .from(streaks)
        .where(and(eq(streaks.userId, testUserId), eq(streaks.streakType, 'overall')))
        .limit(1);

      expect(updatedStreak.currentStreak).toBe(streakBeforeEvidence);
    });
  });
});