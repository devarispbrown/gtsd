-- Migration: SMS Nudges Feature
-- Created: 2025-09-30
-- Description: Add SMS notification support with phone numbers, opt-in preferences, and SMS logging

-- Add SMS-related columns to users table
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "phone" VARCHAR(20);
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "sms_opt_in" BOOLEAN DEFAULT true;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "timezone" VARCHAR(50) DEFAULT 'America/Los_Angeles';

-- Create enum for SMS message types
DO $$ BEGIN
 CREATE TYPE "sms_message_type" AS ENUM('morning_nudge', 'evening_reminder');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

-- Create enum for SMS status
DO $$ BEGIN
 CREATE TYPE "sms_status" AS ENUM('queued', 'sent', 'delivered', 'failed');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

-- Create sms_logs table
CREATE TABLE IF NOT EXISTS "sms_logs" (
  "id" SERIAL PRIMARY KEY,
  "user_id" INTEGER NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "message_type" "sms_message_type" NOT NULL,
  "message_body" TEXT NOT NULL,
  "twilio_sid" VARCHAR(100),
  "status" "sms_status" NOT NULL DEFAULT 'queued',
  "sent_at" TIMESTAMP WITH TIME ZONE,
  "delivered_at" TIMESTAMP WITH TIME ZONE,
  "error_message" TEXT,
  "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Create indexes for sms_logs table
CREATE INDEX IF NOT EXISTS "sms_logs_user_id_idx" ON "sms_logs" USING btree ("user_id");
CREATE INDEX IF NOT EXISTS "sms_logs_status_idx" ON "sms_logs" USING btree ("status");
CREATE INDEX IF NOT EXISTS "sms_logs_message_type_idx" ON "sms_logs" USING btree ("message_type");
CREATE INDEX IF NOT EXISTS "sms_logs_created_at_idx" ON "sms_logs" USING btree ("created_at");
CREATE INDEX IF NOT EXISTS "sms_logs_user_created_idx" ON "sms_logs" USING btree ("user_id", "created_at");
CREATE INDEX IF NOT EXISTS "sms_logs_user_type_created_idx" ON "sms_logs" USING btree ("user_id", "message_type", "created_at");

-- Create index on users phone column for quick lookups
CREATE INDEX IF NOT EXISTS "users_phone_idx" ON "users" USING btree ("phone");
CREATE INDEX IF NOT EXISTS "users_sms_opt_in_idx" ON "users" USING btree ("sms_opt_in");
