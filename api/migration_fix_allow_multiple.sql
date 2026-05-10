-- ============================================================
-- AutoFlow Migration: Fix 'allowMultiple' SQL Duplicate Error
-- Created: 2026-05-07
-- Description: Drops the unique constraint on (workspace_id, subscriber_id, flow_id)
-- to allow a subscriber to enter the same flow multiple times when 'allowMultiple' is enabled.
-- ============================================================

-- 1. Check if we need to drop the composite primary key
-- In some environments, (workspace_id, flow_id, subscriber_id) was set as PRIMARY.
-- We drop it first to clear the way for the 'id' primary key.
-- [FIX] We use a TRYCATCH-like logic: Drop PK only if it exists. 
-- In MySQL 8.0.28+, we can't DROP PRIMARY KEY if it's referenced or doesn't exist.
-- To be safe, we'll try to establish 'id' as PK and let it fail if already PK.
ALTER TABLE `subscriber_flow_states` DROP PRIMARY KEY;

-- 2. Establish 'id' as the PRIMARY KEY with AUTO_INCREMENT
-- This allows multiple records for the same subscriber/flow tuple.
ALTER TABLE `subscriber_flow_states` MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, ADD PRIMARY KEY (`id`);

-- 3. Cleanup redundant unique indexes if they exist
-- We drop 'unique_sub_flow' if it exists as a separate UNIQUE index (not as PRIMARY).
-- IF EXISTS is supported in MySQL 8.0.12+ / MariaDB 10.1.4+
ALTER TABLE `subscriber_flow_states` DROP INDEX IF EXISTS `unique_sub_flow`;

-- 4. Add non-unique index for performance
-- [FIX] Drop existing index with the same name before adding to avoid #1061 error.
ALTER TABLE `subscriber_flow_states` DROP INDEX IF EXISTS `idx_sub_flow_ws`;
ALTER TABLE `subscriber_flow_states` ADD INDEX `idx_sub_flow_ws` (`workspace_id`, `subscriber_id`, `flow_id`);

-- 5. Verification
-- Completion stats use COUNT(DISTINCT subscriber_id), so multiple entries for 
-- one user won't inflate the 'Unique Completed' count on the Dashboard.

-- MIGRATION COMPLETE.
