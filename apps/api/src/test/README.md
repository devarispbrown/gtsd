# Integration Testing Guide

This directory contains utilities and configuration for integration testing with a real PostgreSQL database.

## Overview

The test setup uses:
- **Jest** as the test framework
- **ts-jest** for TypeScript support
- **Real PostgreSQL database** (not mocks)
- **Drizzle ORM** for database operations
- **Test database utilities** for seeding and cleanup

## Test Database Setup

### Prerequisites

1. PostgreSQL server running on port 5434
2. Test database created: `gtsd_test`
3. Test user with credentials: `gtsd:gtsd_test_password`

### Environment Variables

Set the test database URL:

```bash
export TEST_DATABASE_URL="postgresql://gtsd:gtsd_test_password@localhost:5434/gtsd_test"
```

Or use the default connection string in `setup.ts`.

## Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Run specific test file
npm test -- example.test.ts

# Run tests matching pattern
npm test -- --testNamePattern="should create a user"
```

## Test Database Utilities

Located in `/Users/devarisbrown/Code/projects/gtsd/apps/api/src/test/db-utils.ts`

### Available Functions

#### `createTestDb()`
Creates a test database connection with Drizzle.

```typescript
import { createTestDb } from '../test/db-utils';

const { db, close } = createTestDb();
// Use db for queries
await close(); // Clean up connection
```

#### `clearAllTables()`
Truncates all tables and resets sequences. Use in `beforeEach()` for test isolation.

```typescript
import { clearAllTables } from '../test/db-utils';

beforeEach(async () => {
  await clearAllTables();
});
```

#### `runMigrations()`
Runs database migrations. Use in global setup if needed.

```typescript
import { runMigrations } from '../test/db-utils';

await runMigrations();
```

#### `seedTestUsers()`
Creates 3 test users (Alice, Bob, Charlie).

```typescript
import { seedTestUsers } from '../test/db-utils';

const users = await seedTestUsers();
// Returns array of created users
```

#### `createTestUser(data?)`
Creates a single test user with optional custom data.

```typescript
import { createTestUser } from '../test/db-utils';

const user = await createTestUser({
  email: 'test@example.com',
  name: 'Test User',
  timezone: 'America/Chicago',
});
```

#### `seedDailyTasks(userId)`
Creates 3 daily tasks for a user (workout, meal, hydration).

```typescript
import { seedDailyTasks } from '../test/db-utils';

const tasks = await seedDailyTasks(userId);
```

#### `resetTestDatabase()`
Clears all tables and seeds fresh test data.

```typescript
import { resetTestDatabase } from '../test/db-utils';

const { users } = await resetTestDatabase();
```

## Writing Tests

### Basic Structure

```typescript
import { describe, test, expect, beforeEach, afterAll } from '@jest/globals';
import { createTestDb, clearAllTables } from '../test/db-utils';
import { users } from '../db/schema';

describe('My Feature', () => {
  const { db, close } = createTestDb();

  afterAll(async () => {
    await close();
  });

  beforeEach(async () => {
    await clearAllTables();
  });

  test('should do something', async () => {
    // Arrange
    const [user] = await db.insert(users).values({
      email: 'test@example.com',
      name: 'Test User',
    }).returning();

    // Act
    const result = await someFunction(user.id);

    // Assert
    expect(result).toBeDefined();
  });
});
```

### Test Isolation Best Practices

1. **Clean database between tests**: Use `clearAllTables()` in `beforeEach()`
2. **Close connections**: Use `afterAll()` to close database connections
3. **Independent tests**: Each test should be able to run in isolation
4. **Descriptive names**: Use clear test names that describe the behavior

### Example: Testing with Seeded Data

```typescript
import { seedTestUsers, seedDailyTasks } from '../test/db-utils';

test('should calculate user statistics', async () => {
  // Arrange
  const users = await seedTestUsers();
  const alice = users[0];
  await seedDailyTasks(alice.id);

  // Act
  const stats = await getUserStats(alice.id);

  // Assert
  expect(stats.totalTasks).toBe(3);
  expect(stats.completedTasks).toBe(0);
});
```

## Configuration Files

### Jest Config (`/Users/devarisbrown/Code/projects/gtsd/apps/api/jest.config.js`)
- Test timeout: 30 seconds
- Preset: ts-jest
- Environment: node
- Coverage thresholds: 70%

### Test Setup (`/Users/devarisbrown/Code/projects/gtsd/apps/api/src/test/setup.ts`)
- Sets NODE_ENV to 'test'
- Configures DATABASE_URL to use TEST_DATABASE_URL
- Sets default test environment variables

## Debugging Tests

### View detailed output
```bash
npm test -- --verbose
```

### Run single test file
```bash
npm test -- example.test.ts
```

### Enable logs in tests
Set `LOG_LEVEL` environment variable:
```bash
LOG_LEVEL=debug npm test
```

## Common Issues

### Database connection errors
- Ensure PostgreSQL is running on port 5434
- Verify test database exists: `psql -U gtsd -d gtsd_test -h localhost -p 5434`
- Check credentials match `TEST_DATABASE_URL`

### Migration errors
- Run migrations manually: `npm run db:migrate`
- Ensure migrations directory exists: `/Users/devarisbrown/Code/projects/gtsd/apps/api/src/db/migrations`

### Tests hanging
- Check for open database connections
- Ensure `afterAll()` closes all connections
- Use `forceExit: true` in Jest config

### Foreign key constraint errors
- Use `clearAllTables()` which handles CASCADE properly
- Ensure tables are truncated in correct order (child tables first)

## Example Tests

See `/Users/devarisbrown/Code/projects/gtsd/apps/api/src/__tests__/example.test.ts` for complete examples of:
- Basic CRUD operations
- Using test utilities
- Testing database constraints
- Test isolation patterns
