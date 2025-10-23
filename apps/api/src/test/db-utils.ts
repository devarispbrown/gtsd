/**
 * Test Database Utilities
 *
 * Provides utilities for integration testing with a real PostgreSQL database:
 * - Running migrations
 * - Seeding test data
 * - Cleaning/truncating tables between tests
 * - Creating test database connections
 */

import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';
import { sql } from 'drizzle-orm';
import * as schema from '../db/schema';
import { logger } from '../config/logger';

/**
 * Get test database URL from environment
 */
export const getTestDatabaseUrl = (): string => {
  return (
    process.env.TEST_DATABASE_URL ||
    process.env.DATABASE_URL ||
    'postgresql://gtsd:gtsd_dev_password@localhost:5434/gtsd_test'
  );
};

/**
 * Create a test database connection
 * Use this in your tests to get a database instance
 */
export const createTestDb = () => {
  const queryClient = postgres(getTestDatabaseUrl(), {
    max: 10,
    idle_timeout: 20,
    connect_timeout: 10,
  });

  return {
    db: drizzle(queryClient, { schema }),
    close: async () => {
      await queryClient.end();
    },
  };
};

/**
 * Run migrations on the test database
 * This should be run once before all tests (in global setup)
 */
export const runMigrations = async (): Promise<void> => {
  const migrationClient = postgres(getTestDatabaseUrl(), { max: 1 });

  try {
    logger.info('Running test database migrations...');
    const db = drizzle(migrationClient);
    await migrate(db, { migrationsFolder: './src/db/migrations' });
    logger.info('Test database migrations completed');
  } catch (error) {
    logger.error({ error }, 'Test database migration failed');
    throw error;
  } finally {
    await migrationClient.end();
  }
};

/**
 * Clear all data from test database
 * Truncates all tables to reset state between tests
 *
 * IMPORTANT: Only use this in test environment!
 */
export const clearDatabase = async (): Promise<void> => {
  if (process.env.NODE_ENV !== 'test') {
    throw new Error('clearDatabase() can only be used in test environment!');
  }

  const { db, close } = createTestDb();

  try {
    // Get all table names from schema
    const tables = Object.keys(schema)
      .filter((key) => {
        const table = schema[key as keyof typeof schema];
        // Check if it's a table object (has a specific structure)
        return table && typeof table === 'object' && 'Symbol(drizzle:Name)' in table;
      })
      .map((key) => {
        const table = schema[key as keyof typeof schema];
        // Extract table name from Drizzle schema
        return (table as any)[Symbol.for('drizzle:Name')] || key;
      })
      .filter(Boolean);

    // Truncate all tables in reverse order (to handle foreign keys)
    // Using CASCADE to handle foreign key constraints
    for (const tableName of tables.reverse()) {
      try {
        await db.execute(sql.raw(`TRUNCATE TABLE "${tableName}" RESTART IDENTITY CASCADE`));
      } catch (error) {
        // Log but don't fail if table doesn't exist or can't be truncated
        logger.warn({ tableName, error }, 'Failed to truncate table');
      }
    }

    logger.info('Test database cleared');
  } catch (error) {
    logger.error({ error }, 'Failed to clear test database');
    throw error;
  } finally {
    await close();
  }
};

/**
 * Alternative clearDatabase implementation using direct table references
 * More reliable than extracting table names from schema
 */
export const clearAllTables = async (): Promise<void> => {
  if (process.env.NODE_ENV !== 'test') {
    throw new Error('clearAllTables() can only be used in test environment!');
  }

  const { db, close } = createTestDb();

  try {
    // Truncate tables in order that respects foreign key constraints
    // Child tables first, then parent tables
    await db.execute(sql`TRUNCATE TABLE task_evidence RESTART IDENTITY CASCADE`);
    await db.execute(sql`TRUNCATE TABLE evidence RESTART IDENTITY CASCADE`);
    await db.execute(sql`TRUNCATE TABLE daily_tasks RESTART IDENTITY CASCADE`);
    await db.execute(sql`TRUNCATE TABLE plans RESTART IDENTITY CASCADE`);
    await db.execute(sql`TRUNCATE TABLE photos RESTART IDENTITY CASCADE`);
    await db.execute(sql`TRUNCATE TABLE sms_logs RESTART IDENTITY CASCADE`);
    await db.execute(sql`TRUNCATE TABLE user_badges RESTART IDENTITY CASCADE`);
    await db.execute(sql`TRUNCATE TABLE daily_compliance_streaks RESTART IDENTITY CASCADE`);
    await db.execute(sql`TRUNCATE TABLE streaks RESTART IDENTITY CASCADE`);
    await db.execute(sql`TRUNCATE TABLE refresh_tokens RESTART IDENTITY CASCADE`);
    await db.execute(sql`TRUNCATE TABLE initial_plan_snapshots RESTART IDENTITY CASCADE`);
    await db.execute(sql`TRUNCATE TABLE partners RESTART IDENTITY CASCADE`);
    await db.execute(sql`TRUNCATE TABLE user_settings RESTART IDENTITY CASCADE`);
    await db.execute(sql`TRUNCATE TABLE tasks RESTART IDENTITY CASCADE`);
    await db.execute(sql`TRUNCATE TABLE users RESTART IDENTITY CASCADE`);

    logger.info('All test tables cleared');
  } catch (error) {
    logger.error({ error }, 'Failed to clear all tables');
    throw error;
  } finally {
    await close();
  }
};

/**
 * Seed basic test users
 * Returns the created users for use in tests
 */
export const seedTestUsers = async () => {
  const { db, close } = createTestDb();

  try {
    const testUsers = [
      {
        email: 'alice@example.com',
        name: 'Alice Johnson',
        phone: '+15551234567',
        smsOptIn: true,
        timezone: 'America/Los_Angeles',
      },
      {
        email: 'bob@example.com',
        name: 'Bob Smith',
        phone: '+15559876543',
        smsOptIn: true,
        timezone: 'America/New_York',
      },
      {
        email: 'charlie@example.com',
        name: 'Charlie Davis',
        phone: '+15551112222',
        smsOptIn: false,
        timezone: 'America/Chicago',
      },
    ];

    const createdUsers = await db
      .insert(schema.users)
      .values(testUsers)
      .onConflictDoNothing()
      .returning();

    logger.info({ count: createdUsers.length }, 'Seeded test users');
    return createdUsers;
  } catch (error) {
    logger.error({ error }, 'Failed to seed test users');
    throw error;
  } finally {
    await close();
  }
};

/**
 * Seed test tasks for a user
 */
export const seedTestTasks = async (userId: number) => {
  const { db, close } = createTestDb();

  try {
    const testTasks = [
      {
        userId,
        title: 'Complete project proposal',
        description: 'Write and submit the Q1 project proposal',
      },
      {
        userId,
        title: 'Review code changes',
        description: 'Review PRs from the team',
      },
      {
        userId,
        title: 'Fix bug #123',
        description: 'Investigate and fix the authentication bug',
      },
    ];

    const createdTasks = await db
      .insert(schema.tasks)
      .values(testTasks)
      .returning();

    logger.info({ count: createdTasks.length }, 'Seeded test tasks');
    return createdTasks;
  } catch (error) {
    logger.error({ error }, 'Failed to seed test tasks');
    throw error;
  } finally {
    await close();
  }
};

/**
 * Seed daily tasks for today's checklist testing
 */
export const seedDailyTasks = async (userId: number) => {
  const { db, close } = createTestDb();

  try {
    const today = new Date();
    today.setHours(12, 0, 0, 0); // Set to noon today

    const testDailyTasks = [
      {
        userId,
        title: 'Morning workout',
        description: '30 min cardio session',
        taskType: 'workout' as const,
        status: 'pending' as const,
        dueDate: today,
      },
      {
        userId,
        title: 'Log breakfast',
        description: 'Track morning meal calories',
        taskType: 'meal' as const,
        status: 'pending' as const,
        dueDate: today,
      },
      {
        userId,
        title: 'Drink 2L water',
        description: 'Daily hydration goal',
        taskType: 'hydration' as const,
        status: 'pending' as const,
        dueDate: today,
      },
    ];

    const createdDailyTasks = await db
      .insert(schema.dailyTasks)
      .values(testDailyTasks)
      .returning();

    logger.info({ count: createdDailyTasks.length }, 'Seeded daily tasks');
    return createdDailyTasks;
  } catch (error) {
    logger.error({ error }, 'Failed to seed daily tasks');
    throw error;
  } finally {
    await close();
  }
};

/**
 * Full test database reset: clear all data and seed with fresh test data
 */
export const resetTestDatabase = async () => {
  await clearAllTables();
  const users = await seedTestUsers();
  return { users };
};

/**
 * Helper to create a test user with all related data
 */
export const createTestUser = async (data?: {
  email?: string;
  name?: string;
  phone?: string;
  timezone?: string;
}) => {
  const { db, close } = createTestDb();

  try {
    const [user] = await db
      .insert(schema.users)
      .values({
        email: data?.email || `test-${Date.now()}@example.com`,
        name: data?.name || 'Test User',
        phone: data?.phone || '+15551234567',
        timezone: data?.timezone || 'America/Los_Angeles',
      })
      .returning();

    return user;
  } catch (error) {
    logger.error({ error }, 'Failed to create test user');
    throw error;
  } finally {
    await close();
  }
};
