# SMS Nudges Feature - Implementation Summary

## Overview
Complete backend implementation for SMS notifications that sends morning nudges (6:15 AM) and evening reminders (9:00 PM) to users with deep links to the Today screen.

## Files Created/Modified

### Database Layer

#### `/src/db/migrations/0004_sms_nudges.sql` (NEW)
- Adds SMS-related columns to users table: `phone`, `sms_opt_in`, `timezone`
- Creates `sms_logs` table for tracking all SMS messages
- Creates enums: `sms_message_type`, `sms_status`
- Adds indexes for efficient querying

#### `/src/db/schema.ts` (MODIFIED)
- Added SMS fields to users table: `phone`, `smsOptIn`, `timezone`
- Added `smsLogs` table schema with full TypeScript types
- Added enums: `smsMessageTypeEnum`, `smsStatusEnum`
- Added relations: `smsLogsRelations`
- Exported types: `SelectSmsLog`, `InsertSmsLog`

#### `/src/db/seed.ts` (MODIFIED)
- Added phone numbers to seed users (+15551234567, +15559876543)
- Added timezone and SMS opt-in settings
- Created seed data for daily tasks (pending) for evening reminder testing

### Services Layer

#### `/src/services/twilio.ts` (NEW)
- `TwilioService` class with SMS sending capabilities
- `sendSMS()` - Sends SMS with A2P compliance footer
- `validateSignature()` - Validates Twilio webhook signatures
- `formatPhoneNumber()` - Formats phone numbers to E.164
- `isValidPhoneNumber()` - Validates phone number format
- Phone number masking for PII protection in logs
- OpenTelemetry tracing integration

#### `/src/services/sms-scheduler.ts` (NEW)
- Cron-based scheduler for SMS jobs
- `scheduleMorningNudges()` - Queues morning SMS at 6:15 AM per timezone
- `scheduleEveningReminders()` - Queues evening SMS at 9:00 PM per timezone
- `startScheduler()` - Starts cron jobs (runs every 5 minutes)
- `triggerManualSms()` - Manual trigger for testing
- Timezone-aware scheduling across US timezones
- Task filtering for evening reminders (only sends if pending tasks exist)

### Queue & Workers

#### `/src/config/queue.ts` (MODIFIED)
- Added `smsQueue` for SMS job processing
- Added `SmsJobData` interface with type safety
- Updated `closeQueues()` to include SMS queue

#### `/src/workers/sms-worker.ts` (NEW)
- BullMQ worker for processing SMS jobs
- Opt-out check (skips if `sms_opt_in = false`)
- Quiet hours enforcement (no SMS 10 PM - 6 AM user local time)
- Idempotency check (no duplicate sends within 23 hours)
- Phone number validation
- Deep link generation (`gtsd://today`, `gtsd://today?reminder=pending`)
- Message templates with user's first name
- Evening reminder only sends if pending tasks exist
- Retry logic: 3 attempts with exponential backoff (1min, 5min, 15min)
- Logs all sends to `sms_logs` table
- OpenTelemetry tracing

#### `/src/workers/index.ts` (MODIFIED)
- Added SMS worker initialization
- Updated graceful shutdown to close SMS worker

### API Routes

#### `/src/routes/sms/webhooks.ts` (NEW)
- `POST /v1/sms/webhook` - Twilio webhook for incoming SMS
- Handles STOP/START/HELP commands
- Updates user `sms_opt_in` status in database
- Returns TwiML responses
- Twilio signature validation (production only)
- `POST /v1/sms/status` - Status callback endpoint
- `GET /v1/sms/webhook` - Health check

#### `/src/routes/sms/index.ts` (NEW)
- Router aggregation for SMS routes

#### `/src/app.ts` (MODIFIED)
- Imported and registered SMS routes

### Testing

#### `/src/workers/sms-worker.test.ts` (NEW)
- Tests for opt-out logic
- Tests for quiet hours enforcement across timezones
- Tests for idempotency (no duplicates within 23h)
- Tests for retry logic with exponential backoff
- Tests for deep link generation
- Tests for evening reminder task filtering

#### `/src/services/sms-scheduler.test.ts` (NEW)
- Tests for user filtering (opt-in, phone, active)
- Tests for cron scheduling configuration
- Tests for timezone handling (Pacific, Mountain, Central, Eastern)
- Tests for evening reminder task filtering
- Tests for job queuing with retry configuration
- Tests for manual trigger functionality
- Tests for error handling

### Scripts

#### `/src/scripts/trigger-sms.ts` (NEW)
- CLI tool for manually triggering SMS jobs
- Usage: `npm run trigger-sms -- <userId> <messageType>`
- Bypasses quiet hours for testing
- Validates user and phone number
- Provides detailed output and next steps

### Configuration

#### `/src/config/env.ts` (MODIFIED)
- Added Twilio environment variables:
  - `TWILIO_ACCOUNT_SID`
  - `TWILIO_AUTH_TOKEN`
  - `TWILIO_PHONE_NUMBER`
- Test defaults provided

#### `/.env.example` (NEW)
- Example environment file with all Twilio variables
- Documentation for optional `SMS_BYPASS_QUIET_HOURS` flag

#### `/package.json` (MODIFIED)
- Added dependencies: `twilio@^5.3.5`, `node-cron@^3.0.3`
- Added dev dependency: `@types/node-cron@^3.0.11`
- Added script: `trigger-sms` for manual testing

## Architecture Decisions

### Queue-Based Processing
- Uses BullMQ for reliable job processing
- Decouples scheduling from sending
- Enables retries and failure tracking
- Scales horizontally

### Timezone-Aware Scheduling
- Cron runs every 5 minutes in UTC
- Each iteration checks if it's the right time for each user's timezone
- Supports multiple US timezones (Pacific, Mountain, Central, Eastern, etc.)
- Users receive SMS at their local 6:15 AM / 9:00 PM

### Idempotency
- Checks `sms_logs` table before sending
- Prevents duplicate sends within 23-hour window
- Safe for scheduler to run multiple times

### Quiet Hours
- No SMS between 10 PM - 6 AM in user's local timezone
- Respects user sleep schedules
- Can be bypassed with `SMS_BYPASS_QUIET_HOURS=true` for testing

### A2P Compliance
- All SMS include "Reply STOP to opt out" footer
- STOP/START commands update database immediately
- Opt-out status checked before every send

### Error Handling
- 3 retry attempts with exponential backoff
- Failed messages logged with error details
- Workers continue processing other jobs on failure
- OpenTelemetry tracing for observability

## Database Schema

### Users Table (Modified)
```sql
ALTER TABLE users ADD COLUMN phone VARCHAR(20);
ALTER TABLE users ADD COLUMN sms_opt_in BOOLEAN DEFAULT true;
ALTER TABLE users ADD COLUMN timezone VARCHAR(50) DEFAULT 'America/Los_Angeles';
```

### SMS Logs Table (New)
```sql
CREATE TABLE sms_logs (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  message_type sms_message_type NOT NULL,
  message_body TEXT NOT NULL,
  twilio_sid VARCHAR(100),
  status sms_status DEFAULT 'queued',
  sent_at TIMESTAMP WITH TIME ZONE,
  delivered_at TIMESTAMP WITH TIME ZONE,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## Setup Instructions

### 1. Install Dependencies
```bash
cd apps/api
npm install
```

### 2. Configure Environment Variables
```bash
cp .env.example .env
# Edit .env and add your Twilio credentials:
# TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxx
# TWILIO_AUTH_TOKEN=your_auth_token
# TWILIO_PHONE_NUMBER=+1234567890
```

### 3. Run Database Migration
```bash
npm run db:migrate
```

### 4. Seed Database (Optional)
```bash
npm run db:seed
# This creates test users with phone numbers
```

### 5. Start Workers
```bash
npm run worker
# This starts the SMS worker to process jobs
```

### 6. Start API Server (Optional - for webhooks)
```bash
npm run dev
```

## Manual Testing

### Test Morning Nudge
```bash
npm run trigger-sms -- 1 morning_nudge
```

### Test Evening Reminder
```bash
npm run trigger-sms -- 1 evening_reminder
```

### Test Opt-Out
1. Send SMS to your Twilio number with body "STOP"
2. Check `users` table - `sms_opt_in` should be `false`
3. Try sending SMS - should be skipped

### Test Opt-In
1. Send SMS with body "START"
2. Check `users` table - `sms_opt_in` should be `true`

## Monitoring

### Check SMS Logs
```sql
SELECT * FROM sms_logs ORDER BY created_at DESC LIMIT 10;
```

### Check User Opt-In Status
```sql
SELECT id, name, phone, sms_opt_in, timezone FROM users;
```

### Check Pending Tasks for User
```sql
SELECT * FROM daily_tasks
WHERE user_id = 1
AND status = 'pending'
AND due_date >= CURRENT_DATE
AND due_date < CURRENT_DATE + INTERVAL '1 day';
```

## Twilio Configuration

### Webhook URLs (Configure in Twilio Console)
- **SMS Webhook URL**: `https://your-domain.com/v1/sms/webhook`
  - Method: POST
  - When: A message comes in
- **Status Callback URL**: `https://your-domain.com/v1/sms/status`
  - Method: POST
  - Events: Delivered, Failed

### Testing with Twilio Console
1. Go to Twilio Console > Phone Numbers
2. Select your SMS-enabled number
3. Configure webhook URLs
4. Send test SMS to verify webhooks

## Running Tests

```bash
# Run all tests
npm test

# Run SMS tests only
npm test -- sms

# Run with coverage
npm run test:coverage
```

## Troubleshooting

### SMS not sending
1. Check worker is running: `npm run worker`
2. Check user has `sms_opt_in = true`
3. Check user has valid phone number
4. Check not in quiet hours (or set `SMS_BYPASS_QUIET_HOURS=true`)
5. Check Twilio credentials in `.env`
6. Check `sms_logs` table for error messages

### Webhooks not working
1. Verify webhook URL is publicly accessible
2. Check Twilio signature validation (disabled in development)
3. Check API server is running
4. Check Twilio webhook logs in console

### Jobs not being processed
1. Verify Redis is running
2. Check worker logs for errors
3. Check BullMQ queue: `await smsQueue.getJobs(['waiting', 'active', 'failed'])`

## Performance Considerations

- Worker concurrency: 5 jobs at a time
- Scheduler runs every 5 minutes
- Jobs retained: 24 hours (completed), 7 days (failed)
- Exponential backoff prevents API rate limits
- Database indexes on `user_id`, `created_at`, `status`
- **Optimized composite index** (Migration 0005): `sms_logs_user_type_status_created_idx` covering `(user_id, message_type, status, created_at)` for efficient idempotency queries
- Transaction-based idempotency check prevents race conditions using row-level locking (`FOR UPDATE`)

## Security Considerations

- **Twilio signatures validated in ALL environments** (production, staging, development) - no bypass for security
- Phone numbers masked in logs (PII protection)
- Environment variables for sensitive credentials
- SQL injection protection via Drizzle ORM
- **Rate limiting on webhook endpoints** (100 requests per minute per signature/IP)
- **International phone number support** with proper E.164 validation
- **Transaction-based race condition prevention** using database row-level locking

## Recent Security & Performance Improvements (Migration 0005)

### Critical P0 Fixes Implemented:
1. **Webhook Signature Validation** - Now enforced in ALL environments (dev, staging, prod) - no security bypass
2. **International Phone Support** - Proper E.164 validation for global users, preventing opt-out failures
3. **Database Index Optimization** - New composite index on `(user_id, message_type, status, created_at)` eliminates full table scans
4. **Race Condition Prevention** - Transaction-based idempotency with row-level locking prevents duplicate SMS sends
5. **Rate Limiting** - 100 requests/minute per signature/IP on webhook endpoints prevents DoS attacks

### Testing Coverage:
- Webhook signature validation tests (all environments)
- International phone number normalization tests
- Transaction-based idempotency with row-level locking tests
- Rate limiting integration tests

## Future Enhancements

1. ~~**Status Callbacks**: Update `sms_logs` with delivery status from Twilio~~ ✅ **IMPLEMENTED**
2. **Analytics Dashboard**: Track send rates, opt-out rates, delivery rates
3. **Custom Schedules**: Allow users to set their preferred SMS times
4. **Message Personalization**: Use user data for more personalized messages
5. **A/B Testing**: Test different message templates
6. ~~**International Support**: Add support for international phone numbers~~ ✅ **IMPLEMENTED**

## Acceptance Criteria Status

- ✅ SMS jobs are queued and processed
- ✅ Twilio API is called correctly
- ✅ STOP handling works and sets opt-out flag
- ✅ Quiet hours are enforced (no sends 10 PM - 6 AM)
- ✅ Deep links are included in message body
- ✅ sms_logs table tracks all sends
- ✅ Jobs retry 3x with backoff on failure
- ✅ Idempotent sends (no duplicates within 23h)
- ✅ All tests pass (run `npm test`)
- ✅ TypeScript compiles with no errors (run `npm run typecheck`)

## Contact

For questions or issues with the SMS feature, contact the development team.
