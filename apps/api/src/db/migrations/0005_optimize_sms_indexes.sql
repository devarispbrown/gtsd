-- Migration: Optimize SMS Indexes for Idempotency Queries
-- Created: 2025-09-30
-- Description: Add composite index including status field for efficient idempotency checks

-- Add composite index including status for idempotency queries
-- This index covers the query pattern used in sms-worker.ts:
-- WHERE user_id = ? AND message_type = ? AND status IN (...) AND created_at >= ?
CREATE INDEX IF NOT EXISTS "sms_logs_user_type_status_created_idx"
  ON "sms_logs" USING btree ("user_id", "message_type", "status", "created_at");

-- Note: This index significantly improves the performance of the idempotency check
-- that prevents duplicate SMS sends within a 23-hour window. Without this index,
-- PostgreSQL would need to perform a full table scan or use a less efficient index
-- that doesn't include the status filter, leading to slower queries at scale.
