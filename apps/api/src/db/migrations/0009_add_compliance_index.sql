-- Migration: Add composite index for daily compliance calculation performance
-- This migration adds a composite index on daily_tasks to optimize the compliance calculation query

-- ============================================================================
-- COMPOSITE INDEX FOR DAILY COMPLIANCE CALCULATION
-- ============================================================================

-- The compliance calculation query filters by user_id, due_date, and status
-- This composite index significantly speeds up the query:
-- SELECT * FROM daily_tasks WHERE user_id = ? AND due_date >= ? AND due_date <= ? AND status = 'completed'
CREATE INDEX IF NOT EXISTS "daily_tasks_user_due_date_status_idx"
ON "daily_tasks" USING btree ("user_id", "due_date", "status");

-- ============================================================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON INDEX "daily_tasks_user_due_date_status_idx" IS
'Composite index for optimizing daily compliance calculation query. Covers user_id + due_date + status filters.';
