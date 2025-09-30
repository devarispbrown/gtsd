import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';
import { env } from '../config/env';
import { logger } from '../config/logger';

const runMigrations = async () => {
  const migrationClient = postgres(env.DATABASE_URL, { max: 1 });

  try {
    logger.info('Running migrations...');
    const db = drizzle(migrationClient);
    await migrate(db, { migrationsFolder: './src/db/migrations' });
    logger.info('✅ Migrations completed successfully');
  } catch (error) {
    logger.error({ err: error }, '❌ Migration failed');
    process.exit(1);
  } finally {
    await migrationClient.end();
  }
};

runMigrations();