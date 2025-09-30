import { setupTestDatabase } from './setup';

/**
 * Jest global setup hook
 * Runs once before all test suites
 */
export default async () => {
  console.log('\n🔧 Running global test setup...\n');

  try {
    await setupTestDatabase();
    console.log('\n✅ Global test setup complete\n');
  } catch (error) {
    console.error('\n❌ Global test setup failed\n', error);
    throw error;
  }
};