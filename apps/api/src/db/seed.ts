import { db } from './connection';
import { users, tasks } from './schema';
import { logger } from '../config/logger';
import { eq } from 'drizzle-orm';

const seedUsers = [
  { email: 'alice@example.com', name: 'Alice Johnson' },
  { email: 'bob@example.com', name: 'Bob Smith' },
];

const seedTasks = [
  { userEmail: 'alice@example.com', title: 'Complete project proposal', description: 'Write and submit the Q1 project proposal' },
  { userEmail: 'alice@example.com', title: 'Review code changes', description: 'Review PRs from the team' },
  { userEmail: 'bob@example.com', title: 'Fix bug #123', description: 'Investigate and fix the authentication bug' },
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

    logger.info('✅ Database seed completed successfully');
    process.exit(0);
  } catch (error) {
    logger.error({ err: error }, '❌ Seed failed');
    process.exit(1);
  }
};

runSeed();