import { db } from './src/db/connection';
import { users, userSettings, profileMetrics, metricsAcknowledgements } from './src/db/schema';
import { eq } from 'drizzle-orm';

async function investigateUser() {
  try {
    console.log('=== Investigating User: devaris15@devaris.com ===\n');

    // Find the user
    const [user] = await db.select().from(users).where(eq(users.email, 'devaris15@devaris.com'));

    if (!user) {
      console.log('❌ User not found with email: devaris15@devaris.com');
      process.exit(1);
    }

    console.log('✅ User found:');
    console.log('   - ID:', user.id);
    console.log('   - Email:', user.email);
    console.log('   - Name:', user.name);
    console.log('   - Created:', user.createdAt);
    console.log('   - Updated:', user.updatedAt);
    console.log('');

    // Check user settings (profile)
    const [settings] = await db.select().from(userSettings).where(eq(userSettings.userId, user.id));

    console.log('User Settings (Profile) Status:');
    if (settings) {
      console.log('✅ Settings exist:');
      console.log('   - ID:', settings.id);
      console.log('   - Onboarding Completed:', settings.onboardingCompleted);
      console.log('   - Onboarding Completed At:', settings.onboardingCompletedAt);
      console.log('   - Date of Birth:', settings.dateOfBirth);
      console.log('   - Gender:', settings.gender);
      console.log('   - Primary Goal:', settings.primaryGoal);
      console.log('   - Current Weight:', settings.currentWeight, 'kg');
      console.log('   - Height:', settings.height, 'cm');
      console.log('   - Activity Level:', settings.activityLevel);
      console.log('   - BMR:', settings.bmr);
      console.log('   - TDEE:', settings.tdee);
      console.log('   - Calorie Target:', settings.calorieTarget);
      console.log('   - Protein Target:', settings.proteinTarget);
      console.log('   - Water Target:', settings.waterTarget);
      console.log('   - Created:', settings.createdAt);
      console.log('   - Updated:', settings.updatedAt);
    } else {
      console.log('❌ No settings found');
    }
    console.log('');

    // Check profile metrics
    const metricsResults = await db
      .select()
      .from(profileMetrics)
      .where(eq(profileMetrics.userId, user.id))
      .orderBy(profileMetrics.computedAt);

    console.log('Profile Metrics Status:');
    if (metricsResults.length > 0) {
      console.log(`✅ ${metricsResults.length} metric record(s) found:`);
      metricsResults.forEach((metrics, index) => {
        console.log(`\n   Metrics #${index + 1}:`);
        console.log('   - ID:', metrics.id);
        console.log('   - BMI:', metrics.bmi);
        console.log('   - BMR:', metrics.bmr);
        console.log('   - TDEE:', metrics.tdee);
        console.log('   - Version:', metrics.version);
        console.log('   - Computed At:', metrics.computedAt);
        console.log('   - Created:', metrics.createdAt);
      });
    } else {
      console.log('❌ No metrics found');
    }
    console.log('');

    // Check metrics acknowledgements
    const ackResults = await db
      .select()
      .from(metricsAcknowledgements)
      .where(eq(metricsAcknowledgements.userId, user.id))
      .orderBy(metricsAcknowledgements.acknowledgedAt);

    console.log('Metrics Acknowledgement Status:');
    if (ackResults.length > 0) {
      console.log(`✅ ${ackResults.length} acknowledgement(s) found:`);
      ackResults.forEach((ack, index) => {
        console.log(`\n   Acknowledgement #${index + 1}:`);
        console.log('   - ID:', ack.id);
        console.log('   - Acknowledged At:', ack.acknowledgedAt);
        console.log('   - Version:', ack.version);
        console.log('   - Metrics Computed At:', ack.metricsComputedAt);
        console.log('   - Created:', ack.createdAt);
      });
    } else {
      console.log('❌ No acknowledgement found - THIS IS THE ISSUE!');
      console.log('   The user needs to acknowledge their metrics before generating a plan.');
      console.log('   The MetricsSummaryView should have appeared after onboarding.');
    }
    console.log('');

    console.log('\n=== Summary ===');
    if (ackResults.length === 0 && metricsResults.length > 0) {
      console.log('🔴 PROBLEM IDENTIFIED: Metrics were computed but never acknowledged.');
      console.log('   The MetricsSummaryView sheet should have appeared after onboarding.');
      console.log('   The user must acknowledge metrics before generating a plan.');
      console.log('\n   Possible causes:');
      console.log('   1. The MetricsSummaryView was not shown in the mobile app');
      console.log('   2. The user dismissed the sheet without acknowledging');
      console.log('   3. A navigation issue prevented the sheet from appearing');
      console.log('   4. The acknowledgement API call failed');
    } else if (metricsResults.length === 0) {
      console.log('🔴 PROBLEM IDENTIFIED: No metrics were computed at all.');
      console.log('   Metrics should be computed during onboarding completion.');
    } else if (settings && !settings.onboardingCompleted) {
      console.log('🔴 PROBLEM IDENTIFIED: Onboarding was not completed.');
      console.log('   The onboarding flow should be completed before generating plans.');
    }

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

investigateUser();