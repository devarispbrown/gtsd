-- Migration: Add configurable compliance threshold to user_settings
-- This migration adds a compliance_threshold column to allow users to customize
-- their daily compliance target (defaults to 80%)

-- ============================================================================
-- ADD COMPLIANCE THRESHOLD COLUMN
-- ============================================================================

-- Add compliance_threshold column to user_settings table
ALTER TABLE "user_settings"
ADD COLUMN IF NOT EXISTS "compliance_threshold" numeric(3, 2) DEFAULT 0.80;

-- ============================================================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON COLUMN "user_settings"."compliance_threshold" IS
'Daily compliance threshold percentage (0.00 to 1.00). User must complete this percentage of daily tasks to maintain streak. Default is 0.80 (80%).';
