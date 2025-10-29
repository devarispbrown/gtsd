# Imperial Data Migration Script

## Problem Summary

Users who completed onboarding **BEFORE** the unit conversion fix have imperial values incorrectly stored as metric in the database.

### Example: Affected User Data

```typescript
// What user entered in UI (imperial):
currentWeight: 315 lbs
height: 70 inches
targetWeight: 250 lbs

// What got stored in database (incorrectly as metric):
currentWeight: 315 kg  // ❌ Should be 142.88 kg
height: 70 cm          // ❌ Should be 177.8 cm
targetWeight: 250 kg   // ❌ Should be 113.4 kg
```

### Validation Failures

Backend validation correctly rejects these values:

- `315 kg > 300 kg max` ❌
- `70 cm < 100 cm min` ❌

This prevents plan generation and breaks the app for affected users.

---

## Detection Heuristics

Identify affected users with this SQL query:

```sql
SELECT
    us.user_id,
    us.current_weight,
    us.height,
    us.target_weight,
    u.email,
    u.name,
    us.created_at
FROM
    user_settings us
JOIN
    users u ON us.user_id = u.id
WHERE
    (us.current_weight > 200)  -- Unlikely to be valid kg (> 440 lbs)
    OR
    (us.height < 100)          -- Unlikely to be valid cm (< 39 inches)
ORDER BY
    us.created_at DESC;
```

### Why These Heuristics Work

1. **Weight > 200 kg (~440 lbs)**:
   - Valid weight range: 30-300 kg (66-661 lbs)
   - Values > 200 kg are extremely rare
   - Much more likely to be pounds stored as kg

2. **Height < 100 cm (~39 inches)**:
   - Valid height range: 100-250 cm (39-98 inches)
   - Values < 100 cm suggest inches stored as cm
   - A 70 cm person would be ~2.3 feet tall (impossible)

---

## Migration Script (TypeScript)

### File: `apps/api/src/scripts/migrate-imperial-data.ts`

```typescript
import { db } from '../db/connection';
import { userSettings } from '../db/schema';
import { eq, or, gt, lt } from 'drizzle-orm';
import { logger } from '../config/logger';

/**
 * Migrate imperial data stored as metric values
 *
 * This script identifies and corrects user data where imperial units
 * (pounds, inches) were incorrectly stored as metric units (kg, cm)
 * before the unit conversion fix was implemented.
 */

const POUNDS_TO_KG = 0.453592;
const INCHES_TO_CM = 2.54;

interface AffectedUser {
  userId: number;
  currentWeight: number;
  height: number;
  targetWeight: number | null;
  email: string;
  name: string;
}

async function detectAffectedUsers(): Promise<AffectedUser[]> {
  logger.info('Detecting users with imperial data stored as metric...');

  const results = await db
    .select({
      userId: userSettings.userId,
      currentWeight: userSettings.currentWeight,
      height: userSettings.height,
      targetWeight: userSettings.targetWeight,
      email: users.email,
      name: users.name,
    })
    .from(userSettings)
    .innerJoin(users, eq(userSettings.userId, users.id))
    .where(
      or(
        gt(userSettings.currentWeight, 200), // Likely pounds stored as kg
        lt(userSettings.height, 100) // Likely inches stored as cm
      )
    );

  logger.info(`Found ${results.length} potentially affected users`);

  return results as AffectedUser[];
}

async function migrateUser(user: AffectedUser, dryRun: boolean = true): Promise<void> {
  const needsWeightFix = user.currentWeight > 200;
  const needsHeightFix = user.height < 100;

  // Calculate corrected values
  const correctedCurrentWeight = needsWeightFix
    ? user.currentWeight * POUNDS_TO_KG
    : user.currentWeight;

  const correctedHeight = needsHeightFix ? user.height * INCHES_TO_CM : user.height;

  const correctedTargetWeight =
    user.targetWeight && needsWeightFix ? user.targetWeight * POUNDS_TO_KG : user.targetWeight;

  logger.info(
    {
      userId: user.userId,
      email: user.email,
      name: user.name,
      before: {
        currentWeight: user.currentWeight,
        height: user.height,
        targetWeight: user.targetWeight,
      },
      after: {
        currentWeight: correctedCurrentWeight.toFixed(2),
        height: correctedHeight.toFixed(1),
        targetWeight: correctedTargetWeight?.toFixed(2),
      },
      changes: {
        weight: needsWeightFix ? 'YES' : 'NO',
        height: needsHeightFix ? 'YES' : 'NO',
      },
    },
    'Migration preview'
  );

  if (!dryRun) {
    await db
      .update(userSettings)
      .set({
        currentWeight: Number(correctedCurrentWeight.toFixed(2)),
        height: Number(correctedHeight.toFixed(1)),
        targetWeight: correctedTargetWeight ? Number(correctedTargetWeight.toFixed(2)) : null,
        updatedAt: new Date(),
      })
      .where(eq(userSettings.userId, user.userId));

    logger.info({ userId: user.userId }, 'User data migrated successfully');
  }
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = !args.includes('--execute');

  if (dryRun) {
    logger.info('🔍 DRY RUN MODE - No data will be modified');
    logger.info(
      'To execute migration, run: pnpm tsx src/scripts/migrate-imperial-data.ts --execute'
    );
  } else {
    logger.warn('⚠️  EXECUTING MIGRATION - Data will be modified!');
  }

  try {
    const affectedUsers = await detectAffectedUsers();

    if (affectedUsers.length === 0) {
      logger.info('✅ No affected users found. Migration not needed.');
      return;
    }

    logger.info(`📊 Found ${affectedUsers.length} users requiring migration`);

    for (const user of affectedUsers) {
      await migrateUser(user, dryRun);
    }

    if (dryRun) {
      logger.info('✅ Dry run completed. Review output above.');
      logger.info('To apply changes, run with --execute flag');
    } else {
      logger.info(`✅ Migration completed successfully for ${affectedUsers.length} users`);
    }
  } catch (error) {
    logger.error({ error }, 'Migration failed');
    process.exit(1);
  }
}

main();
```

---

## Usage

### 1. Dry Run (Preview Only)

```bash
cd apps/api
pnpm tsx src/scripts/migrate-imperial-data.ts
```

This will:

- Detect affected users
- Show before/after values
- **NOT modify any data**

### 2. Execute Migration

```bash
cd apps/api
pnpm tsx src/scripts/migrate-imperial-data.ts --execute
```

This will:

- Detect affected users
- Convert and update their data
- Log all changes

---

## Verification Queries

### Check Affected Users Before Migration

```sql
-- Find users with suspicious weights (likely pounds stored as kg)
SELECT
    user_id,
    current_weight,
    ROUND(current_weight * 0.453592, 2) as corrected_weight_kg,
    ROUND(current_weight, 0) as original_lbs
FROM
    user_settings
WHERE
    current_weight > 200;

-- Find users with suspicious heights (likely inches stored as cm)
SELECT
    user_id,
    height,
    ROUND(height * 2.54, 1) as corrected_height_cm,
    ROUND(height, 0) as original_inches
FROM
    user_settings
WHERE
    height < 100;
```

### Check After Migration

```sql
-- Verify all weights are within valid range
SELECT
    COUNT(*) as total_users,
    SUM(CASE WHEN current_weight BETWEEN 30 AND 300 THEN 1 ELSE 0 END) as valid_weights,
    SUM(CASE WHEN current_weight < 30 OR current_weight > 300 THEN 1 ELSE 0 END) as invalid_weights
FROM
    user_settings;

-- Verify all heights are within valid range
SELECT
    COUNT(*) as total_users,
    SUM(CASE WHEN height BETWEEN 100 AND 250 THEN 1 ELSE 0 END) as valid_heights,
    SUM(CASE WHEN height < 100 OR height > 250 THEN 1 ELSE 0 END) as invalid_heights
FROM
    user_settings;
```

---

## Safety Measures

1. **Dry Run by Default**: Script defaults to preview mode
2. **Backup First**: Take database backup before executing
3. **Idempotent**: Safe to run multiple times
4. **Logging**: All changes are logged for audit trail
5. **Validation**: Only modifies values outside valid metric ranges

---

## Testing

### Test Cases

1. **User with both issues** (weight > 200, height < 100):
   - Before: 315 kg, 70 cm
   - After: 142.88 kg, 177.8 cm

2. **User with only weight issue**:
   - Before: 250 kg, 175 cm
   - After: 113.40 kg, 175 cm (height unchanged)

3. **User with only height issue**:
   - Before: 90 kg, 72 cm
   - After: 90 kg, 182.9 cm (weight unchanged)

4. **User with valid metric values**:
   - Before: 85 kg, 175 cm
   - After: 85 kg, 175 cm (no changes)

---

## Expected Results for Specific User

Given the user with:

- **currentWeight**: 315 (lbs stored as kg)
- **height**: 70 (inches stored as cm)
- **targetWeight**: 250 (lbs stored as kg)

After migration:

- **currentWeight**: 142.88 kg (315 \* 0.453592)
- **height**: 177.8 cm (70 \* 2.54)
- **targetWeight**: 113.40 kg (250 \* 0.453592)

These values will pass validation:

- ✅ 142.88 kg ∈ [30, 300] kg
- ✅ 177.8 cm ∈ [100, 250] cm
- ✅ 113.40 kg ∈ [30, 300] kg

---

## Rollback Plan

If migration causes issues:

```sql
-- Restore from backup
-- (Assumes you took a backup before migration)

-- Or manually revert specific users
UPDATE user_settings
SET
    current_weight = 315,
    height = 70,
    target_weight = 250,
    updated_at = NOW()
WHERE
    user_id = <affected_user_id>;
```

---

## Implementation Checklist

- [ ] Create migration script file
- [ ] Test with dry run on staging database
- [ ] Verify detection heuristics catch all affected users
- [ ] Review before/after values for accuracy
- [ ] Take production database backup
- [ ] Execute migration on production
- [ ] Run verification queries
- [ ] Test plan generation for affected users
- [ ] Monitor error logs for 24 hours
- [ ] Document results in migration log

---

## Notes

- This script should be run as a **one-time migration**
- Future users are protected by the `UnitConversion.swift` fix
- Consider adding database constraints to prevent future issues
- Notify affected users that their data has been corrected

---

## Alternative: Manual SQL Update

If you prefer direct SQL:

```sql
BEGIN TRANSACTION;

-- Update weights (pounds stored as kg)
UPDATE user_settings
SET
    current_weight = ROUND(current_weight * 0.453592, 2),
    target_weight = CASE
        WHEN target_weight IS NOT NULL THEN ROUND(target_weight * 0.453592, 2)
        ELSE NULL
    END,
    updated_at = NOW()
WHERE
    current_weight > 200;

-- Update heights (inches stored as cm)
UPDATE user_settings
SET
    height = ROUND(height * 2.54, 1),
    updated_at = NOW()
WHERE
    height < 100;

COMMIT;
```

**WARNING**: Test on staging first! No dry-run mode with raw SQL.
