# Database Migration Guide

This guide covers database migrations, schema management, and best practices for the GTSD project.

## Overview

GTSD uses **Drizzle ORM** for database management with PostgreSQL. Migrations are version-controlled SQL files that track schema changes over time.

## Migration Files

Migrations are stored in:
```
apps/api/src/db/migrations/
```

Each migration is a SQL file with a numeric prefix indicating execution order:
- `0000_violet_salo.sql` - Initial schema
- `0001_robust_vertigo.sql` - Schema updates
- `0002_fancy_toxin.sql` - Additional changes
- `0003_today_checklist_feature.sql` - Today checklist feature

## Creating a New Migration

### Using Drizzle Kit (Recommended)

1. **Update the schema** in `apps/api/src/db/schema.ts`:

```typescript
// Example: Adding a new table
export const newTable = pgTable('new_table', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});
```

2. **Generate the migration**:

```bash
cd apps/api
pnpm drizzle-kit generate:pg
```

This creates a new migration file with the detected schema changes.

3. **Review the generated SQL** to ensure it matches your intent.

4. **Run the migration**:

```bash
pnpm db:migrate
```

### Manual Migration Creation

If you prefer to write migrations manually or need complex operations:

1. **Create a new migration file**:

```bash
# Get the next migration number
cd apps/api/src/db/migrations
ls -1 | tail -1  # Check the last migration number

# Create new file (example for migration 0004)
touch 0004_description_of_change.sql
```

2. **Write your SQL**:

```sql
-- Migration: Feature Name
-- Created: YYYY-MM-DD
-- Description: What this migration does

-- Create tables
CREATE TABLE IF NOT EXISTS "new_table" (
  "id" SERIAL PRIMARY KEY,
  "name" TEXT NOT NULL,
  "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS "new_table_name_idx" ON "new_table" USING btree ("name");
```

3. **Run the migration**:

```bash
pnpm db:migrate
```

## Migration Best Practices

### 1. Idempotent Migrations

Always use conditional statements to make migrations safe to run multiple times:

```sql
-- Use IF NOT EXISTS for tables
CREATE TABLE IF NOT EXISTS "users" (
  ...
);

-- Use DO blocks for enums
DO $$ BEGIN
  CREATE TYPE "status_type" AS ENUM('active', 'inactive');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Use IF NOT EXISTS for indexes
CREATE INDEX IF NOT EXISTS "users_email_idx" ON "users" ("email");
```

### 2. Migration Naming

Use descriptive names that indicate what the migration does:

```
0004_add_user_profiles.sql
0005_add_notification_settings.sql
0006_add_payment_tables.sql
```

### 3. Add Comments

Include metadata at the top of each migration:

```sql
-- Migration: User Profile Feature
-- Created: 2025-01-15
-- Description: Add user_profiles table with avatar and bio fields
-- Related: Ticket #123
```

### 4. One Logical Change Per Migration

Keep migrations focused on a single feature or change. This makes them easier to:
- Review
- Rollback (if needed)
- Understand the evolution of the schema

### 5. Test Migrations

Always test migrations in multiple scenarios:

```bash
# Test on fresh database
./scripts/db-reset.sh

# Test on existing database
pnpm db:migrate

# Test on test database
./scripts/db-test-setup.sh
```

## Migration Execution Order

Migrations run in numerical order (0000, 0001, 0002, ...). Drizzle ORM tracks which migrations have been applied in a special table.

To see applied migrations:

```bash
psql $DATABASE_URL -c "SELECT * FROM drizzle.__drizzle_migrations;"
```

## Rolling Back Migrations

Drizzle ORM does not have built-in rollback support. To rollback:

### Option 1: Manual Rollback (Recommended for Production)

1. **Write a rollback migration** that reverses the changes:

```sql
-- Migration: Rollback User Profiles
-- Created: 2025-01-15
-- Description: Remove user_profiles table

DROP TABLE IF EXISTS "user_profiles" CASCADE;
```

2. **Run the rollback migration**:

```bash
pnpm db:migrate
```

### Option 2: Database Restore (Development Only)

For development environments, you can restore from a backup or reset:

```bash
./scripts/db-reset.sh
```

### Option 3: Manual SQL Rollback

Execute rollback SQL directly:

```bash
psql $DATABASE_URL -c "DROP TABLE IF EXISTS user_profiles CASCADE;"
```

## Migration Conflicts

If multiple developers create migrations simultaneously:

1. **Renumber the migration** with the next available number
2. **Update git history** if needed
3. **Communicate** with the team about the change

Example:

```bash
# Your migration: 0005_add_feature_a.sql
# Colleague's migration (merged first): 0005_add_feature_b.sql

# Rename yours to next available number
mv 0005_add_feature_a.sql 0006_add_feature_a.sql
```

## Schema Management

### Schema Definition

The schema is defined in `apps/api/src/db/schema.ts` using Drizzle ORM:

```typescript
import { pgTable, serial, text, timestamp } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  email: text('email').notNull().unique(),
  name: text('name').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});
```

### Adding Columns

When adding columns to existing tables:

```sql
-- Safe: Adding nullable column
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "bio" TEXT;

-- Safe: Adding column with default
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "active" BOOLEAN DEFAULT true;

-- Requires backfill: Adding NOT NULL column
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "status" TEXT DEFAULT 'active';
ALTER TABLE "users" ALTER COLUMN "status" SET NOT NULL;
```

### Removing Columns

When removing columns, consider a two-phase approach:

**Phase 1: Make column optional**
```sql
ALTER TABLE "users" ALTER COLUMN "old_field" DROP NOT NULL;
```

**Phase 2: Remove column after code deployment**
```sql
ALTER TABLE "users" DROP COLUMN IF EXISTS "old_field";
```

### Renaming Tables/Columns

Renaming can cause downtime. Consider:

**Option 1: Alias in ORM** (no migration needed)
```typescript
export const users = pgTable('user_accounts', { ... });
```

**Option 2: Create new, migrate data, drop old**
```sql
-- Step 1: Create new table
CREATE TABLE "users_new" (LIKE "users" INCLUDING ALL);

-- Step 2: Copy data
INSERT INTO "users_new" SELECT * FROM "users";

-- Step 3: Drop old table (after code deployment)
DROP TABLE "users";

-- Step 4: Rename new table
ALTER TABLE "users_new" RENAME TO "users";
```

## Database Connection

### Connection Pooling

Connection pool settings are in `apps/api/src/db/connection.ts`:

```typescript
const queryClient = postgres(env.DATABASE_URL, {
  max: 10,              // Maximum connections
  idle_timeout: 20,     // Seconds before closing idle connection
  connect_timeout: 10,  // Seconds to wait for connection
});
```

### Production Configuration

For production, adjust connection pool based on your deployment:

- **Single Instance**: `max: 10-20`
- **Multiple Instances**: `max: (max_db_connections) / (number_of_instances)`
- **Serverless**: Use connection pooler (PgBouncer, AWS RDS Proxy)

Example for 100 max connections with 5 instances:
```typescript
max: 20  // 100 / 5 = 20 per instance
```

## Database Environments

### Development Database

```
postgresql://gtsd:gtsd_dev_password@localhost:5432/gtsd
```

- Local development
- Can be reset anytime
- Seeded with demo data

### Test Database

```
postgresql://gtsd:gtsd_test_password@localhost:5432/gtsd_test
```

- Automated tests
- Reset before each test suite
- No persistent data

### Production Database

- Configured via `DATABASE_URL` environment variable
- Connection pooling enabled
- SSL required
- Regular backups (implementation-specific)

## Seeding Data

### Development Seed

Location: `apps/api/src/db/seed.ts`

```bash
pnpm --filter @gtsd/api db:seed
```

Creates:
- Demo users
- Sample tasks
- Test data for development

### Production Seed

Use migrations for required reference data:

```sql
-- Migration: Add Task Types
INSERT INTO "task_types" ("name", "description")
VALUES
  ('workout', 'Physical exercise'),
  ('meal', 'Meal logging')
ON CONFLICT (name) DO NOTHING;
```

## Database Health Checks

The API includes health check endpoints:

```bash
# Check database connectivity
curl http://localhost:3000/health

# Response
{
  "status": "healthy",
  "database": "connected",
  "timestamp": "2025-01-15T12:00:00Z"
}
```

## Backup and Restore

### Local Backup

```bash
# Backup development database
pg_dump $DATABASE_URL > backup_$(date +%Y%m%d_%H%M%S).sql

# Restore from backup
psql $DATABASE_URL < backup_20250115_120000.sql
```

### Production Backup

Production backup strategies depend on your hosting:

- **AWS RDS**: Automated snapshots + point-in-time recovery
- **Heroku Postgres**: Daily backups with `pg:backups`
- **Self-hosted**: Configure `pg_dump` with cron

## Monitoring

### Query Performance

Use `EXPLAIN ANALYZE` to debug slow queries:

```sql
EXPLAIN ANALYZE
SELECT * FROM daily_tasks WHERE user_id = 1 AND due_date = CURRENT_DATE;
```

### Index Usage

Check if indexes are being used:

```sql
SELECT
  schemaname,
  tablename,
  indexname,
  idx_scan,
  idx_tup_read,
  idx_tup_fetch
FROM pg_stat_user_indexes
ORDER BY idx_scan;
```

### Connection Monitoring

```sql
SELECT
  datname,
  count(*) as connections
FROM pg_stat_activity
GROUP BY datname;
```

## Common Issues

### Issue: Migration already applied

If you need to re-run a migration:

```sql
-- Remove migration record (development only!)
DELETE FROM drizzle.__drizzle_migrations WHERE name = '0004_migration_name';
```

### Issue: Connection pool exhausted

Increase connection pool size or optimize queries to use fewer connections.

### Issue: Migration timeout

For large data migrations, increase the timeout:

```typescript
const migrationClient = postgres(env.DATABASE_URL, {
  max: 1,
  timeout: 300  // 5 minutes
});
```

## CI/CD Integration

Migrations run automatically in CI:

```yaml
- name: Run database migrations
  run: pnpm --filter @gtsd/api db:migrate
  env:
    DATABASE_URL: postgresql://gtsd:gtsd_test_password@localhost:5432/gtsd_test
```

For production deployments:
1. Run migrations before deploying new code
2. Use a deployment pipeline that runs migrations automatically
3. Monitor migration success before routing traffic to new instances

## Additional Resources

- [Drizzle ORM Documentation](https://orm.drizzle.team/)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [Database Migration Best Practices](https://www.postgresql.org/docs/current/ddl-schemas.html)