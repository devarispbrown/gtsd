# Database Migration Guide

## Overview

This project uses Drizzle ORM for database migrations. Following this guide ensures migrations are properly tracked and prevents schema drift.

## The Problem We Had

**What Happened:**

- Someone manually created migration files (0008, 0009, 0010) without using `drizzle-kit generate`
- These migrations lacked snapshot files and journal entries
- The migration system was out of sync with the database
- Seed scripts failed with "column does not exist" errors

**How We Fixed It:**

1. Ran `pnpm drizzle-kit generate` to create a proper migration from the current schema
2. Removed the manually created migration files
3. Manually marked the migration as applied in the database
4. Verified the migration system was consistent

## Best Practices: ALWAYS Use These Commands

### 1. Making Schema Changes

```bash
# Step 1: Edit schema file
# Edit apps/api/src/db/schema.ts

# Step 2: Generate migration from schema changes
cd apps/api
pnpm drizzle-kit generate

# Step 3: Review the generated migration file
# Check apps/api/src/db/migrations/XXXX_*.sql

# Step 4: Run the migration
pnpm db:migrate

# Step 5: Verify it worked
pnpm db:migrate  # Should say "no migrations to apply"
```

### 2. Checking Migration Status

```bash
# See what migrations are registered
cat apps/api/src/db/migrations/meta/_journal.json

# Count migration files
ls apps/api/src/db/migrations/*.sql | wc -l

# Count journal entries
jq '.entries | length' apps/api/src/db/migrations/meta/_journal.json

# These numbers should ALWAYS match!
```

### 3. Verifying Database State

```bash
# Check what's actually in the database
PGPASSWORD=gtsd_dev_password psql -h localhost -p 5434 -U gtsd -d gtsd \
  -c "SELECT * FROM drizzle.__drizzle_migrations ORDER BY created_at DESC LIMIT 5;"

# Verify a specific column exists
PGPASSWORD=gtsd_dev_password psql -h localhost -p 5434 -U gtsd -d gtsd \
  -c "\d+ user_settings"
```

## What NOT To Do

❌ **NEVER** manually create migration SQL files
❌ **NEVER** manually edit the `_journal.json` file
❌ **NEVER** apply SQL changes directly without a migration
❌ **NEVER** commit schema changes without corresponding migrations

## CI/CD Checks (Recommended)

Add these checks to your CI pipeline:

```bash
# Verify migration files match journal entries
MIGRATION_FILES=$(ls apps/api/src/db/migrations/*.sql | wc -l)
JOURNAL_ENTRIES=$(jq '.entries | length' apps/api/src/db/migrations/meta/_journal.json)

if [ "$MIGRATION_FILES" != "$JOURNAL_ENTRIES" ]; then
  echo "ERROR: Migration files ($MIGRATION_FILES) don't match journal entries ($JOURNAL_ENTRIES)"
  exit 1
fi

# Verify no uncommitted migrations
if [ -n "$(git status --porcelain apps/api/src/db/migrations/)" ]; then
  echo "ERROR: Uncommitted migration files detected"
  exit 1
fi
```

## Troubleshooting

### "Column does not exist" errors in seed scripts

**Cause:** Migration not applied to database
**Fix:**

```bash
pnpm --filter @gtsd/api db:migrate
```

### Migration count mismatch

**Cause:** Manually created migrations or edited journal
**Fix:**

```bash
# 1. Check what's in the database
PGPASSWORD=gtsd_dev_password psql -h localhost -p 5434 -U gtsd -d gtsd \
  -c "SELECT tablename FROM pg_tables WHERE schemaname = 'public';"

# 2. Regenerate migrations from current schema
cd apps/api
pnpm drizzle-kit generate

# 3. Check if migration needs to run or be marked as applied
pnpm db:migrate
```

### Type already exists

**Cause:** Migration already partially applied
**Fix:** Mark migration as applied manually (see MIGRATION_RECOVERY.md)

## Migration File Structure

```
apps/api/src/db/migrations/
├── 0000_violet_salo.sql          # Migration SQL
├── 0001_robust_vertigo.sql
├── ...
├── meta/
│   ├── 0000_snapshot.json        # Schema snapshot
│   ├── 0001_snapshot.json
│   └── _journal.json             # Migration registry
```

**Key Files:**

- `*.sql` - The actual migration commands
- `*_snapshot.json` - Schema state after migration
- `_journal.json` - Registry of all migrations (must match SQL files)

## References

- [Drizzle Kit Documentation](https://orm.drizzle.team/kit-docs/overview)
- [Drizzle Migrations Guide](https://orm.drizzle.team/docs/migrations)
- Project migration config: `apps/api/drizzle.config.ts`
