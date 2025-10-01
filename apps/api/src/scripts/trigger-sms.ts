#!/usr/bin/env tsx

/**
 * Manual SMS Trigger Script
 *
 * Usage:
 *   npm run trigger-sms -- <userId> <messageType>
 *   npm run trigger-sms -- 1 morning_nudge
 *   npm run trigger-sms -- 2 evening_reminder
 *
 * Environment Variables:
 *   SMS_BYPASS_QUIET_HOURS=true - Bypass quiet hours check (for testing)
 */

import { triggerManualSms } from '../services/sms-scheduler';
import { logger } from '../config/logger';
import { db } from '../db/connection';
import { users } from '../db/schema';
import { eq } from 'drizzle-orm';
import { closeQueues } from '../config/queue';

async function main() {
  try {
    // Parse command line arguments
    const args = process.argv.slice(2);

    if (args.length < 2) {
      console.error('Usage: npm run trigger-sms -- <userId> <messageType>');
      console.error('Message types: morning_nudge, evening_reminder');
      console.error('');
      console.error('Example:');
      console.error('  npm run trigger-sms -- 1 morning_nudge');
      console.error('  npm run trigger-sms -- 2 evening_reminder');
      console.error('');
      console.error('Environment variables:');
      console.error('  SMS_BYPASS_QUIET_HOURS=true - Skip quiet hours check');
      process.exit(1);
    }

    const userId = parseInt(args[0], 10);
    const messageType = args[1] as 'morning_nudge' | 'evening_reminder';

    // Validate userId
    if (isNaN(userId) || userId <= 0) {
      console.error('Error: userId must be a positive number');
      process.exit(1);
    }

    // Validate messageType
    if (!['morning_nudge', 'evening_reminder'].includes(messageType)) {
      console.error('Error: messageType must be "morning_nudge" or "evening_reminder"');
      process.exit(1);
    }

    // Check if user exists
    const [user] = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        phone: users.phone,
        smsOptIn: users.smsOptIn,
        timezone: users.timezone,
      })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!user) {
      console.error(`Error: User with ID ${userId} not found`);
      process.exit(1);
    }

    console.log('');
    console.log('=====================================');
    console.log('Manual SMS Trigger');
    console.log('=====================================');
    console.log('User Information:');
    console.log(`  ID: ${user.id}`);
    console.log(`  Name: ${user.name}`);
    console.log(`  Email: ${user.email}`);
    console.log(`  Phone: ${user.phone || 'NOT SET'}`);
    console.log(`  SMS Opt-In: ${user.smsOptIn ? 'YES' : 'NO'}`);
    console.log(`  Timezone: ${user.timezone || 'NOT SET'}`);
    console.log('');
    console.log('SMS Details:');
    console.log(`  Message Type: ${messageType}`);
    console.log(`  Bypass Quiet Hours: ${process.env.SMS_BYPASS_QUIET_HOURS === 'true' ? 'YES' : 'NO'}`);
    console.log('=====================================');
    console.log('');

    // Warnings
    if (!user.phone) {
      console.warn('⚠️  Warning: User has no phone number set. SMS will fail.');
    }

    if (!user.smsOptIn) {
      console.warn('⚠️  Warning: User has opted out of SMS. SMS will be skipped.');
    }

    if (process.env.SMS_BYPASS_QUIET_HOURS !== 'true') {
      console.warn('💡 Tip: Set SMS_BYPASS_QUIET_HOURS=true to bypass quiet hours check');
    }

    console.log('');
    console.log('Triggering SMS job...');

    // Bypass quiet hours for manual testing
    if (process.env.SMS_BYPASS_QUIET_HOURS !== 'true') {
      console.log('Setting SMS_BYPASS_QUIET_HOURS=true for this run...');
      process.env.SMS_BYPASS_QUIET_HOURS = 'true';
    }

    // Trigger SMS
    await triggerManualSms(userId, messageType);

    console.log('');
    console.log('✅ SMS job queued successfully!');
    console.log('');
    console.log('Next steps:');
    console.log('1. Check worker logs for processing: npm run worker');
    console.log('2. Check sms_logs table for results');
    console.log('3. Check your phone for the SMS');
    console.log('');

    // Wait a moment for the job to be queued
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Cleanup
    await closeQueues();
    process.exit(0);
  } catch (error) {
    logger.error({ err: error }, 'Error triggering SMS');
    console.error('');
    console.error('❌ Error:', error instanceof Error ? error.message : 'Unknown error');
    console.error('');
    process.exit(1);
  }
}

main();
