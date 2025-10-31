import { metricsService } from './services/metrics';
import { db } from './db/connection';
import { profileMetrics } from './db/schema';
import { eq, desc } from 'drizzle-orm';

async function verifyFix() {
  const userId = 28; // Test user

  console.log('=== VERIFYING ACKNOWLEDGMENT FIX ===\n');

  // Get latest metrics
  const [latestMetrics] = await db
    .select()
    .from(profileMetrics)
    .where(eq(profileMetrics.userId, userId))
    .orderBy(desc(profileMetrics.computedAt))
    .limit(1);

  if (!latestMetrics) {
    console.log('No metrics found');
    process.exit(1);
  }

  const metricsComputedAt = latestMetrics.computedAt;
  const version = latestMetrics.version;

  console.log('Testing acknowledgment with:');
  console.log('- userId:', userId);
  console.log('- version:', version);
  console.log('- metricsComputedAt (Date):', metricsComputedAt);
  console.log('- metricsComputedAt (ISO):', metricsComputedAt.toISOString());
  console.log();

  try {
    const result = await metricsService.acknowledgeMetrics(
      userId,
      version,
      metricsComputedAt
    );

    console.log('✅ SUCCESS! Acknowledgment worked!');
    console.log('Result:', result);
  } catch (error: any) {
    console.log('❌ FAILED:', error.message);
    if (error.message.includes('404')) {
      console.log('\nThe metrics were not found - timestamp matching still broken');
    }
  }

  process.exit(0);
}

verifyFix().catch(console.error);