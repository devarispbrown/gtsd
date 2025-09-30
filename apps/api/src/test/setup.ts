import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';

const TEST_DATABASE_URL = process.env.TEST_DATABASE_URL || process.env.DATABASE_URL || 'postgresql://gtsd:gtsd_test_password@localhost:5432/gtsd_test';

/**
 * Global test setup - runs once before all tests
 * Sets up test database and runs migrations
 */
export const setupTestDatabase = async () => {
  console.log('Setting up test database...');

  // First connect with superuser privileges to create role if needed
  const adminUrl = TEST_DATABASE_URL.replace(/\/[^/]*$/, '/postgres');
  const adminClient = postgres(adminUrl, { max: 1 });

  try {
    // Create role if doesn't exist
    await adminClient`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'gtsd') THEN
          CREATE ROLE gtsd WITH LOGIN PASSWORD 'gtsd_test_password';
        END IF;
      END
      $$;
    `;
    console.log('✅ Database role ensured');
  } catch (error) {
    // If we can't create the role (e.g., no superuser access), that's okay
    console.log('⚠️  Could not ensure role exists (may already exist):', (error as Error).message);
  } finally {
    await adminClient.end();
  }

  // Now connect with the test database URL and run migrations
  const migrationClient = postgres(TEST_DATABASE_URL, { max: 1 });

  try {
    // Grant permissions if needed
    try {
      await migrationClient`GRANT ALL PRIVILEGES ON DATABASE gtsd_test TO gtsd`;
    } catch (error) {
      // Ignore permission errors - they may not be needed
      console.log('⚠️  Could not grant privileges:', (error as Error).message);
    }

    const db = drizzle(migrationClient);
    await migrate(db, { migrationsFolder: './src/db/migrations' });
    console.log('✅ Test database migrations completed');
  } catch (error) {
    console.error('❌ Test database setup failed:', error);
    throw error;
  } finally {
    await migrationClient.end();
  }
};

/**
 * Global test teardown - runs once after all tests
 */
export const teardownTestDatabase = async () => {
  console.log('Test database teardown complete');
};