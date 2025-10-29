import { db } from '../db/connection';
import { userSettings, users } from '../db/schema';
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
  currentWeight: string;
  height: string;
  targetWeight: string | null;
  email: string;
  name: string | null;
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
        gt(userSettings.currentWeight, '200'), // Likely pounds stored as kg
        lt(userSettings.height, '100') // Likely inches stored as cm
      )
    );

  logger.info(`Found ${results.length} potentially affected users`);

  return results as AffectedUser[];
}

async function migrateUser(user: AffectedUser, dryRun: boolean = true): Promise<void> {
  const currentWeight = parseFloat(user.currentWeight);
  const height = parseFloat(user.height);
  const targetWeight = user.targetWeight ? parseFloat(user.targetWeight) : null;

  const needsWeightFix = currentWeight > 200;
  const needsHeightFix = height < 100;

  // Calculate corrected values
  const correctedCurrentWeight = needsWeightFix ? currentWeight * POUNDS_TO_KG : currentWeight;

  const correctedHeight = needsHeightFix ? height * INCHES_TO_CM : height;

  const correctedTargetWeight =
    targetWeight && needsWeightFix ? targetWeight * POUNDS_TO_KG : targetWeight;

  logger.info(
    {
      userId: user.userId,
      email: user.email,
      name: user.name,
      before: {
        currentWeight: currentWeight,
        height: height,
        targetWeight: targetWeight,
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
        currentWeight: correctedCurrentWeight.toFixed(2),
        height: correctedHeight.toFixed(1),
        targetWeight: correctedTargetWeight ? correctedTargetWeight.toFixed(2) : null,
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
      process.exit(0);
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

    process.exit(0);
  } catch (error) {
    logger.error({ error }, 'Migration failed');
    process.exit(1);
  }
}

void main();
