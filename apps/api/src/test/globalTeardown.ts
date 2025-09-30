import { teardownTestDatabase } from './setup';

/**
 * Jest global teardown hook
 * Runs once after all test suites
 */
export default async () => {
  console.log('\n🔧 Running global test teardown...\n');

  try {
    await teardownTestDatabase();
    console.log('\n✅ Global test teardown complete\n');
  } catch (error) {
    console.error('\n❌ Global test teardown failed\n', error);
  }
};