-- DATABASE MIGRATION: STAGE 3 AUDIT FIXES
-- Purpose: Fix idempotency in flow enrollment and schema mismatches.

-- 1. Fix [P0]: Add UNIQUE KEY to subscriber_flow_states to prevent duplicate enrollments
-- This makes ON DUPLICATE KEY UPDATE work as intended.
-- [CAUTION] This may fail if you already have duplicates. 
-- Recommended: Clean duplicates first if necessary.
ALTER TABLE `subscriber_flow_states` 
ADD UNIQUE KEY `unique_sub_flow` (`subscriber_id`,`flow_id`);

-- 2. Fix [P1]: Ensure campaign_reminders has the 'config' column
-- Prevents SQL errors when querying for reminder settings.
ALTER TABLE `campaign_reminders` 
ADD COLUMN IF NOT EXISTS `config` LONGTEXT DEFAULT NULL;

-- 3. Optimization: Add missing indexes for worker performance
ALTER TABLE `subscriber_activity` 
ADD INDEX IF NOT EXISTS `idx_activity_workspace_type` (`workspace_id`, `type`, `created_at`);
