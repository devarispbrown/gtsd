/**
 * Jest Setup File
 *
 * This file runs after the test framework is installed in the environment.
 * It configures the test environment for integration testing with PostgreSQL.
 *
 * Key responsibilities:
 * - Set NODE_ENV to 'test'
 * - Configure DATABASE_URL to use TEST_DATABASE_URL
 * - Ensure test environment variables are properly set
 */

// Set NODE_ENV to test before any other imports
process.env.NODE_ENV = 'test';

// Use TEST_DATABASE_URL if provided, otherwise use default test database
const TEST_DATABASE_URL =
  process.env.TEST_DATABASE_URL ||
  'postgresql://gtsd:gtsd_dev_password@localhost:5434/gtsd_test';

// Override DATABASE_URL to use test database
process.env.DATABASE_URL = TEST_DATABASE_URL;

// Set default test environment variables
process.env.REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
process.env.LOG_LEVEL = process.env.LOG_LEVEL || 'silent';

// S3/MinIO test configuration
process.env.S3_ENDPOINT = process.env.S3_ENDPOINT || 'http://localhost:9000';
process.env.S3_ACCESS_KEY_ID = process.env.S3_ACCESS_KEY_ID || 'test';
process.env.S3_SECRET_ACCESS_KEY = process.env.S3_SECRET_ACCESS_KEY || 'test';
process.env.S3_BUCKET = process.env.S3_BUCKET || 'test-bucket';
process.env.S3_REGION = process.env.S3_REGION || 'us-east-1';
process.env.S3_FORCE_PATH_STYLE = process.env.S3_FORCE_PATH_STYLE || 'true';

// Twilio test configuration
process.env.TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID || 'test_account_sid';
process.env.TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN || 'test_auth_token';
process.env.TWILIO_PHONE_NUMBER = process.env.TWILIO_PHONE_NUMBER || '+15551234567';

// JWT test configuration
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret-key-at-least-32-characters-long-for-testing';
process.env.JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'test-refresh-secret-key-at-least-32-chars-long';

// OpenTelemetry test configuration
process.env.OTEL_EXPORTER_OTLP_ENDPOINT = process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'http://localhost:4318';
process.env.OTEL_SERVICE_NAME = process.env.OTEL_SERVICE_NAME || 'gtsd-api-test';

console.log(`
========================================
Test Environment Configuration
========================================
NODE_ENV: ${process.env.NODE_ENV}
DATABASE_URL: ${TEST_DATABASE_URL}
LOG_LEVEL: ${process.env.LOG_LEVEL}
========================================
`);

// Export for module compatibility
export { TEST_DATABASE_URL };

/**
 * Setup test database
 * Runs migrations and initial setup
 */
export async function setupTestDatabase() {
  console.log('Setting up test database...');
  // TODO: Run migrations on test database
  console.log('Test database setup complete');
}

/**
 * Teardown test database
 * Cleanup after all tests
 */
export async function teardownTestDatabase() {
  console.log('Tearing down test database...');
  // TODO: Close database connections
  console.log('Test database teardown complete');
}