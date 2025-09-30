import { closeDatabase } from '../db/connection';

/**
 * Setup that runs after test environment is initialized
 * This runs once per test file
 */

// Close database connections after all tests in a file complete
afterAll(async () => {
  await closeDatabase();
});