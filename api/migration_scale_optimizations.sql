-- ==============================================================================
-- AUTOMATION FLOW - SCALE OPTIMIZATIONS MIGRATION
-- ==============================================================================
-- WARNING: Run these queries during low-traffic periods. 
-- Adding virtual columns and partitions on massive tables can lock the tables.

-- 1. Optimize JSON Extraction (ai_training_docs)
-- Eliminates full table scans when checking for batch_id during AI training loops.
ALTER TABLE `ai_training_docs`
ADD COLUMN `batch_id_virtual` VARCHAR(100) GENERATED ALWAYS AS (JSON_UNQUOTE(JSON_EXTRACT(metadata, '$.batch_id'))) VIRTUAL AFTER `metadata`,
ADD INDEX `idx_batch_id_virtual` (`batch_id_virtual`);

-- Note on Subscribers:
-- The custom_attributes JSON column in `subscribers` has completely dynamic keys,
-- making it impossible to create static virtual columns. 
-- For future massive scale (>10M subscribers), consider migrating custom attributes
-- to a dedicated EAV (Entity-Attribute-Value) table or upgrading to MySQL 8.0+ 
-- and utilizing Multi-Valued Indexes.

-- ==============================================================================
-- 2. Table Partitioning for Massive Logs
-- Converts log tables to use daily partitioning. This allows cleanup crons to 
-- use `ALTER TABLE DROP PARTITION` (instant, O(1) time) instead of `DELETE` 
-- which is O(N), causes table locks, and bloats the InnoDB log.
--
-- IMPORTANT: To partition by `created_at`, the primary key MUST include `created_at`.
-- Below are the queries to restructure the tables if partitioning is approved.
-- ==============================================================================

/*
-- Example for web_events:
ALTER TABLE `web_events` DROP PRIMARY KEY, ADD PRIMARY KEY (`id`, `created_at`);

ALTER TABLE `web_events` 
PARTITION BY RANGE (TO_DAYS(created_at)) (
    PARTITION p2026_04_25 VALUES LESS THAN (TO_DAYS('2026-04-26')),
    PARTITION p2026_04_26 VALUES LESS THAN (TO_DAYS('2026-04-27')),
    PARTITION p2026_04_27 VALUES LESS THAN (TO_DAYS('2026-04-28')),
    PARTITION p_future VALUES LESS THAN MAXVALUE
);

-- Example for system_audit_logs:
ALTER TABLE `system_audit_logs` DROP PRIMARY KEY, ADD PRIMARY KEY (`id`, `created_at`);

ALTER TABLE `system_audit_logs` 
PARTITION BY RANGE (TO_DAYS(created_at)) (
    PARTITION p_old VALUES LESS THAN (TO_DAYS('2026-04-01')),
    PARTITION p2026_04_01 VALUES LESS THAN (TO_DAYS('2026-04-02')),
    -- Add more partitions as needed via cron...
    PARTITION p_future VALUES LESS THAN MAXVALUE
);
*/

-- ==============================================================================
-- 3. Update query syntax in codebase for ai_training_docs
-- Note: Replace JSON_UNQUOTE(JSON_EXTRACT(metadata, '$.batch_id')) 
-- with `batch_id_virtual` in `api/ai_training.php` after running this script.
-- ==============================================================================
