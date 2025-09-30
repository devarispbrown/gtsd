-- Migration: Today Checklist Feature
-- Created: 2025-09-29
-- Description: Add plans, daily_tasks, evidence, and streaks tables for daily checklist functionality

-- Create enums
DO $$ BEGIN
 CREATE TYPE "plan_status" AS ENUM('active', 'completed', 'archived', 'draft');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 CREATE TYPE "task_type" AS ENUM('workout', 'supplement', 'meal', 'hydration', 'cardio', 'weight_log', 'progress_photo');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 CREATE TYPE "task_status" AS ENUM('pending', 'in_progress', 'completed', 'skipped');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 CREATE TYPE "evidence_type" AS ENUM('text_log', 'metrics', 'photo_reference');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 CREATE TYPE "streak_type" AS ENUM('workout', 'supplement', 'meal', 'hydration', 'cardio', 'weight_log', 'progress_photo', 'overall');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

-- Create plans table
CREATE TABLE IF NOT EXISTS "plans" (
  "id" SERIAL PRIMARY KEY,
  "user_id" INTEGER NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "plan_type" VARCHAR(20) NOT NULL,
  "start_date" TIMESTAMP WITH TIME ZONE NOT NULL,
  "end_date" TIMESTAMP WITH TIME ZONE NOT NULL,
  "status" "plan_status" NOT NULL DEFAULT 'active',
  "total_tasks" INTEGER NOT NULL DEFAULT 0,
  "completed_tasks" INTEGER NOT NULL DEFAULT 0,
  "completion_percentage" DECIMAL(5, 2) DEFAULT '0',
  "generated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  "completed_at" TIMESTAMP WITH TIME ZONE,
  "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Create daily_tasks table
CREATE TABLE IF NOT EXISTS "daily_tasks" (
  "id" SERIAL PRIMARY KEY,
  "user_id" INTEGER NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "plan_id" INTEGER REFERENCES "plans"("id") ON DELETE CASCADE,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "task_type" "task_type" NOT NULL,
  "due_date" TIMESTAMP WITH TIME ZONE NOT NULL,
  "due_time" VARCHAR(8),
  "status" "task_status" NOT NULL DEFAULT 'pending',
  "completed_at" TIMESTAMP WITH TIME ZONE,
  "skipped_at" TIMESTAMP WITH TIME ZONE,
  "skip_reason" TEXT,
  "metadata" JSONB,
  "priority" INTEGER NOT NULL DEFAULT 0,
  "order" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Create evidence table
CREATE TABLE IF NOT EXISTS "evidence" (
  "id" SERIAL PRIMARY KEY,
  "task_id" INTEGER NOT NULL REFERENCES "daily_tasks"("id") ON DELETE CASCADE,
  "user_id" INTEGER NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "evidence_type" "evidence_type" NOT NULL,
  "notes" TEXT,
  "metrics" JSONB,
  "photo_url" TEXT,
  "photo_storage_key" TEXT,
  "recorded_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Create streaks table
CREATE TABLE IF NOT EXISTS "streaks" (
  "id" SERIAL PRIMARY KEY,
  "user_id" INTEGER NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "streak_type" "streak_type" NOT NULL,
  "current_streak" INTEGER NOT NULL DEFAULT 0,
  "longest_streak" INTEGER NOT NULL DEFAULT 0,
  "total_completions" INTEGER NOT NULL DEFAULT 0,
  "last_completed_date" TIMESTAMP WITH TIME ZONE,
  "streak_start_date" TIMESTAMP WITH TIME ZONE,
  "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  UNIQUE("user_id", "streak_type")
);

-- Create indexes for plans table
CREATE INDEX IF NOT EXISTS "plans_user_id_idx" ON "plans" USING btree ("user_id");
CREATE INDEX IF NOT EXISTS "plans_status_idx" ON "plans" USING btree ("status");
CREATE INDEX IF NOT EXISTS "plans_start_date_idx" ON "plans" USING btree ("start_date");
CREATE INDEX IF NOT EXISTS "plans_user_status_idx" ON "plans" USING btree ("user_id", "status");

-- Create indexes for daily_tasks table
CREATE INDEX IF NOT EXISTS "daily_tasks_user_id_idx" ON "daily_tasks" USING btree ("user_id");
CREATE INDEX IF NOT EXISTS "daily_tasks_plan_id_idx" ON "daily_tasks" USING btree ("plan_id");
CREATE INDEX IF NOT EXISTS "daily_tasks_task_type_idx" ON "daily_tasks" USING btree ("task_type");
CREATE INDEX IF NOT EXISTS "daily_tasks_status_idx" ON "daily_tasks" USING btree ("status");
CREATE INDEX IF NOT EXISTS "daily_tasks_due_date_idx" ON "daily_tasks" USING btree ("due_date");
CREATE INDEX IF NOT EXISTS "daily_tasks_user_due_date_idx" ON "daily_tasks" USING btree ("user_id", "due_date");
CREATE INDEX IF NOT EXISTS "daily_tasks_user_status_idx" ON "daily_tasks" USING btree ("user_id", "status");
CREATE INDEX IF NOT EXISTS "daily_tasks_user_task_type_idx" ON "daily_tasks" USING btree ("user_id", "task_type");

-- Create indexes for evidence table
CREATE INDEX IF NOT EXISTS "evidence_task_id_idx" ON "evidence" USING btree ("task_id");
CREATE INDEX IF NOT EXISTS "evidence_user_id_idx" ON "evidence" USING btree ("user_id");
CREATE INDEX IF NOT EXISTS "evidence_type_idx" ON "evidence" USING btree ("evidence_type");
CREATE INDEX IF NOT EXISTS "evidence_recorded_at_idx" ON "evidence" USING btree ("recorded_at");

-- Create indexes for streaks table
CREATE INDEX IF NOT EXISTS "streaks_user_id_idx" ON "streaks" USING btree ("user_id");
CREATE INDEX IF NOT EXISTS "streaks_type_idx" ON "streaks" USING btree ("streak_type");
CREATE INDEX IF NOT EXISTS "streaks_user_type_idx" ON "streaks" USING btree ("user_id", "streak_type");