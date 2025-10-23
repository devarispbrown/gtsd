-- Migration: Add daily compliance streaks and badges system
-- This migration creates tables for tracking daily compliance streaks and user badges/achievements

-- ============================================================================
-- BADGE TYPE ENUM - All achievement badge types
-- ============================================================================

-- Create badge_type enum with all current and future badge types
DO $$ BEGIN
 CREATE TYPE "public"."badge_type" AS ENUM(
   'day_one_done',
   'week_warrior',
   'consistency_king',
   'hundred_club',
   'perfect_month',
   'hydration_nation',
   'protein_pro',
   'workout_warrior',
   'supplement_champion',
   'cardio_king',
   'early_bird',
   'night_owl',
   'weekend_warrior',
   'comeback_kid',
   'milestone_master',
   'photo_finisher'
 );
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

-- ============================================================================
-- DAILY COMPLIANCE STREAKS TABLE
-- ============================================================================

-- Tracks user's daily compliance streaks based on task completion percentage
-- A day is "compliant" when a user completes a threshold percentage of their daily tasks
CREATE TABLE IF NOT EXISTS "daily_compliance_streaks" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,

	-- Streak tracking
	"current_streak" integer DEFAULT 0 NOT NULL,
	"longest_streak" integer DEFAULT 0 NOT NULL,
	"total_compliant_days" integer DEFAULT 0 NOT NULL,

	-- Date tracking
	"last_compliance_date" timestamp with time zone,
	"streak_start_date" timestamp with time zone,

	-- Timestamps
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

-- Add foreign key constraint
DO $$ BEGIN
 ALTER TABLE "daily_compliance_streaks" ADD CONSTRAINT "daily_compliance_streaks_user_id_users_id_fk"
 FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

-- ============================================================================
-- USER BADGES TABLE
-- ============================================================================

-- Stores achievement badges awarded to users
-- The unique constraint on (user_id, badge_type) ensures idempotent badge awards
CREATE TABLE IF NOT EXISTS "user_badges" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"badge_type" badge_type NOT NULL,

	-- Award metadata
	"awarded_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);

-- Add foreign key constraint
DO $$ BEGIN
 ALTER TABLE "user_badges" ADD CONSTRAINT "user_badges_user_id_users_id_fk"
 FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

-- ============================================================================
-- INDEXES FOR DAILY COMPLIANCE STREAKS
-- ============================================================================

-- Index for finding user's streak (most common query)
CREATE UNIQUE INDEX IF NOT EXISTS "daily_compliance_streaks_user_id_idx"
ON "daily_compliance_streaks" USING btree ("user_id");

-- Index for finding streaks by last compliance date (for cleanup/analytics)
CREATE INDEX IF NOT EXISTS "daily_compliance_streaks_last_compliance_date_idx"
ON "daily_compliance_streaks" USING btree ("last_compliance_date");

-- Index for leaderboard queries (longest streaks)
CREATE INDEX IF NOT EXISTS "daily_compliance_streaks_longest_streak_idx"
ON "daily_compliance_streaks" USING btree ("longest_streak" DESC);

-- Index for active streaks (current_streak > 0)
CREATE INDEX IF NOT EXISTS "daily_compliance_streaks_current_streak_idx"
ON "daily_compliance_streaks" USING btree ("current_streak" DESC);

-- ============================================================================
-- INDEXES FOR USER BADGES
-- ============================================================================

-- Index for finding user's badges
CREATE INDEX IF NOT EXISTS "user_badges_user_id_idx"
ON "user_badges" USING btree ("user_id");

-- Index for finding badges by type (analytics)
CREATE INDEX IF NOT EXISTS "user_badges_badge_type_idx"
ON "user_badges" USING btree ("badge_type");

-- Composite index for checking if user has specific badge
CREATE INDEX IF NOT EXISTS "user_badges_user_badge_idx"
ON "user_badges" USING btree ("user_id", "badge_type");

-- CRITICAL: Unique constraint to prevent duplicate badge awards (idempotency)
-- This ensures a user can only earn each badge once
CREATE UNIQUE INDEX IF NOT EXISTS "user_badges_user_badge_type_unique"
ON "user_badges" USING btree ("user_id", "badge_type");

-- ============================================================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON TABLE "daily_compliance_streaks" IS
'Tracks daily compliance streaks based on task completion percentage. A day is compliant when user completes threshold percentage (default 80%) of daily tasks.';

COMMENT ON COLUMN "daily_compliance_streaks"."current_streak" IS
'Current consecutive compliant days. Resets to 0 if user misses a day.';

COMMENT ON COLUMN "daily_compliance_streaks"."longest_streak" IS
'All-time best streak for this user. Never decreases.';

COMMENT ON COLUMN "daily_compliance_streaks"."total_compliant_days" IS
'Lifetime count of compliant days. Always increases, never resets.';

COMMENT ON COLUMN "daily_compliance_streaks"."last_compliance_date" IS
'Date of last compliant day in users timezone. Used to detect missed days.';

COMMENT ON COLUMN "daily_compliance_streaks"."streak_start_date" IS
'Date when current streak began. Reset when streak breaks.';

COMMENT ON TABLE "user_badges" IS
'Achievement badges awarded to users. Unique constraint ensures idempotent awards.';

COMMENT ON COLUMN "user_badges"."badge_type" IS
'Type of badge earned. See badge_type enum for all available badges.';

COMMENT ON COLUMN "user_badges"."awarded_at" IS
'Timestamp when badge was awarded to user.';

-- ============================================================================
-- HELPER FUNCTION: Update updated_at timestamp automatically
-- ============================================================================

-- Create trigger function to auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_daily_compliance_streaks_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add trigger to daily_compliance_streaks table
DROP TRIGGER IF EXISTS update_daily_compliance_streaks_updated_at_trigger
ON "daily_compliance_streaks";

CREATE TRIGGER update_daily_compliance_streaks_updated_at_trigger
BEFORE UPDATE ON "daily_compliance_streaks"
FOR EACH ROW
EXECUTE FUNCTION update_daily_compliance_streaks_updated_at();
