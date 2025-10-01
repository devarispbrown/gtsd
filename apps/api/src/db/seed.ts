import { db } from './connection';
import { users, tasks, dailyTasks } from './schema';
import { logger } from '../config/logger';
import { eq } from 'drizzle-orm';

const seedUsers = [
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
];

const seedTasks = [
  { userEmail: 'alice@example.com', title: 'Complete project proposal', description: 'Write and submit the Q1 project proposal' },
  { userEmail: 'alice@example.com', title: 'Review code changes', description: 'Review PRs from the team' },
  { userEmail: 'bob@example.com', title: 'Fix bug #123', description: 'Investigate and fix the authentication bug' },
];

// Seed daily tasks for SMS evening reminder testing
const seedDailyTasks = [
  {
    userEmail: 'alice@example.com',
    title: 'Morning workout',
    description: '30 min cardio session',
    taskType: 'workout' as const,
    status: 'pending' as const,
  },
  {
    userEmail: 'alice@example.com',
    title: 'Log breakfast',
    description: 'Track morning meal calories',
    taskType: 'meal' as const,
    status: 'pending' as const,
  },
  {
    userEmail: 'bob@example.com',
    title: 'Evening protein shake',
    description: 'Take post-workout supplement',
    taskType: 'supplement' as const,
    status: 'pending' as const,
  },
];

const runSeed = async () => {
  try {
    logger.info('Starting database seed...');

    // Idempotent user creation
    for (const seedUser of seedUsers) {
      const existingUser = await db
        .select()
        .from(users)
        .where(eq(users.email, seedUser.email))
        .limit(1);

      if (existingUser.length === 0) {
        await db.insert(users).values(seedUser);
        logger.info(`Created user: ${seedUser.email}`);
      } else {
        logger.info(`User already exists: ${seedUser.email}`);
      }
    }

    // Idempotent task creation
    for (const seedTask of seedTasks) {
      // Find user by email
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.email, seedTask.userEmail))
        .limit(1);

      if (!user) {
        logger.warn(`User not found for task: ${seedTask.userEmail}`);
        continue;
      }

      // Check if task already exists (by title and userId)
      const existingTask = await db
        .select()
        .from(tasks)
        .where(eq(tasks.title, seedTask.title))
        .limit(1);

      if (existingTask.length === 0) {
        await db.insert(tasks).values({
          userId: user.id,
          title: seedTask.title,
          description: seedTask.description,
        });
        logger.info(`Created task: ${seedTask.title}`);
      } else {
        logger.info(`Task already exists: ${seedTask.title}`);
      }
    }

    // Idempotent daily task creation (for SMS evening reminder testing)
    for (const seedDailyTask of seedDailyTasks) {
      // Find user by email
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.email, seedDailyTask.userEmail))
        .limit(1);

      if (!user) {
        logger.warn(`User not found for daily task: ${seedDailyTask.userEmail}`);
        continue;
      }

      // Check if daily task already exists (by title and userId)
      const existingDailyTask = await db
        .select()
        .from(dailyTasks)
        .where(eq(dailyTasks.title, seedDailyTask.title))
        .limit(1);

      if (existingDailyTask.length === 0) {
        const today = new Date();
        today.setHours(12, 0, 0, 0); // Set to noon today

        await db.insert(dailyTasks).values({
          userId: user.id,
          title: seedDailyTask.title,
          description: seedDailyTask.description,
          taskType: seedDailyTask.taskType,
          status: seedDailyTask.status,
          dueDate: today,
        });
        logger.info(`Created daily task: ${seedDailyTask.title}`);
      } else {
        logger.info(`Daily task already exists: ${seedDailyTask.title}`);
      }
    }

    logger.info('✅ Database seed completed successfully');
    process.exit(0);
  } catch (error) {
    logger.error({ err: error }, '❌ Seed failed');
    process.exit(1);
  }
};

void runSeed();