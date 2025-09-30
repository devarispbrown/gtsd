import { db } from '../db/connection';
import { users, plans, dailyTasks, evidence, streaks } from '../db/schema';
import { sql } from 'drizzle-orm';

/**
 * Clean all test data from database tables
 * Use this in afterEach or afterAll hooks to ensure clean state
 */
export const cleanDatabase = async () => {
  // Delete in reverse order of foreign key dependencies
  await db.delete(evidence);
  await db.delete(dailyTasks);
  await db.delete(streaks);
  await db.delete(plans);
  await db.delete(users);
};

/**
 * Reset database sequences to start IDs from 1
 * Useful when you need predictable IDs in tests
 */
export const resetSequences = async () => {
  await db.execute(sql`ALTER SEQUENCE users_id_seq RESTART WITH 1`);
  await db.execute(sql`ALTER SEQUENCE plans_id_seq RESTART WITH 1`);
  await db.execute(sql`ALTER SEQUENCE daily_tasks_id_seq RESTART WITH 1`);
  await db.execute(sql`ALTER SEQUENCE evidence_id_seq RESTART WITH 1`);
  await db.execute(sql`ALTER SEQUENCE streaks_id_seq RESTART WITH 1`);
};

/**
 * Create a test user with default values
 */
export const createTestUser = async (overrides?: Partial<typeof users.$inferInsert>) => {
  const [user] = await db
    .insert(users)
    .values({
      email: overrides?.email || `test-${Date.now()}@example.com`,
      name: overrides?.name || 'Test User',
      ...overrides,
    })
    .returning();

  return user;
};

/**
 * Create a test plan with default values
 */
export const createTestPlan = async (
  userId: number,
  overrides?: Partial<typeof plans.$inferInsert>
) => {
  const today = new Date();
  const startOfDay = new Date(today.setHours(0, 0, 0, 0));
  const endOfDay = new Date(today.setHours(23, 59, 59, 999));

  const [plan] = await db
    .insert(plans)
    .values({
      userId,
      name: overrides?.name || 'Test Plan',
      planType: overrides?.planType || 'daily',
      startDate: overrides?.startDate || startOfDay,
      endDate: overrides?.endDate || endOfDay,
      status: overrides?.status || 'active',
      ...overrides,
    })
    .returning();

  return plan;
};

/**
 * Create a test task with default values
 */
export const createTestTask = async (
  userId: number,
  planId: number,
  overrides?: Partial<typeof dailyTasks.$inferInsert>
) => {
  const [task] = await db
    .insert(dailyTasks)
    .values({
      userId,
      planId,
      title: overrides?.title || 'Test Task',
      taskType: overrides?.taskType || 'workout',
      dueDate: overrides?.dueDate || new Date(),
      status: overrides?.status || 'pending',
      ...overrides,
    })
    .returning();

  return task;
};

/**
 * Create a test streak with default values
 */
export const createTestStreak = async (
  userId: number,
  overrides?: Partial<typeof streaks.$inferInsert>
) => {
  const [streak] = await db
    .insert(streaks)
    .values({
      userId,
      streakType: overrides?.streakType || 'overall',
      currentStreak: overrides?.currentStreak || 0,
      longestStreak: overrides?.longestStreak || 0,
      totalCompletions: overrides?.totalCompletions || 0,
      ...overrides,
    })
    .returning();

  return streak;
};