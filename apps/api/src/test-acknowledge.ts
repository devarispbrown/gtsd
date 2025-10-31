import { db } from './db/connection';
import { profileMetrics, metricsAcknowledgements } from './db/schema';
import { eq, and, desc, sql } from 'drizzle-orm';

async function debugAcknowledgment() {
  // Test user ID (adjust as needed)
  const userId = 28; // Latest user from our query above
  const version = 1;

  console.log('=== DEBUG: Metrics Acknowledgment Issue ===\n');

  // 1. Get the latest metrics for this user
  const [latestMetrics] = await db
    .select()
    .from(profileMetrics)
    .where(eq(profileMetrics.userId, userId))
    .orderBy(desc(profileMetrics.computedAt))
    .limit(1);

  if (!latestMetrics) {
    console.log('No metrics found for user', userId);
    return;
  }

  console.log('1. Latest metrics in DB:');
  console.log('   - computedAt (Date object):', latestMetrics.computedAt);
  console.log('   - computedAt (ISO string):', latestMetrics.computedAt.toISOString());
  console.log('   - version:', latestMetrics.version);
  console.log();

  // 2. Test different timestamp formats
  const testTimestamps = [
    latestMetrics.computedAt.toISOString(), // Full ISO with milliseconds
    latestMetrics.computedAt.toISOString().replace(/\.\d{3}Z$/, 'Z'), // Without milliseconds
    latestMetrics.computedAt.toISOString().replace(/\.\d{3}Z$/, '.000Z'), // With .000 milliseconds
  ];

  console.log('2. Testing different timestamp formats:');
  for (const timestamp of testTimestamps) {
    console.log(`\n   Testing: "${timestamp}"`);

    // Try the exact query used in the service (UPDATED with fix)
    const [found] = await db
      .select()
      .from(profileMetrics)
      .where(
        and(
          eq(profileMetrics.userId, userId),
          sql`to_char(${profileMetrics.computedAt}, 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') = ${timestamp}`,
          eq(profileMetrics.version, version)
        )
      )
      .limit(1);

    if (found) {
      console.log('   ✅ MATCH FOUND!');
    } else {
      console.log('   ❌ No match');
    }
  }

  // 3. Show what the DB actually returns as text
  console.log('\n3. What the DB returns as ::text:');
  const [dbTextResult] = await db.execute(sql`
    SELECT
      computed_at,
      computed_at::text as computed_at_text,
      to_char(computed_at, 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') as formatted
    FROM profile_metrics
    WHERE user_id = ${userId}
    ORDER BY computed_at DESC
    LIMIT 1
  `);

  if (dbTextResult) {
    console.log('   - computed_at:', dbTextResult.computed_at);
    console.log('   - computed_at::text:', dbTextResult.computed_at_text);
    console.log('   - formatted:', dbTextResult.formatted);
  }

  // 4. Check for any existing acknowledgments
  console.log('\n4. Existing acknowledgments:');
  const acknowledgments = await db
    .select()
    .from(metricsAcknowledgements)
    .where(eq(metricsAcknowledgements.userId, userId))
    .orderBy(desc(metricsAcknowledgements.acknowledgedAt))
    .limit(3);

  if (acknowledgments.length === 0) {
    console.log('   No acknowledgments found');
  } else {
    acknowledgments.forEach(ack => {
      console.log(`   - metricsComputedAt: ${ack.metricsComputedAt.toISOString()}, version: ${ack.version}`);
    });
  }

  process.exit(0);
}

debugAcknowledgment().catch(console.error);