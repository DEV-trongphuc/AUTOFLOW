-- migration_audit_optimizations.sql
-- Performance & Integrity Audit Migration
-- Purpose: Standardize workspace_id across all buffers/logs and optimize indexing for high-load workers.

-- 1. Standardize workspace_id in stats_update_buffer
ALTER TABLE `stats_update_buffer` 
    ADD COLUMN `workspace_id` INT(11) DEFAULT 1 AFTER `id`,
    ADD INDEX `idx_workspace_id` (`workspace_id`),
    ADD INDEX `idx_target_lookup` (`target_table`, `target_id`, `column_name`);

-- 2. Standardize workspace_id in subscriber_flow_states
ALTER TABLE `subscriber_flow_states` 
    ADD COLUMN `workspace_id` INT(11) DEFAULT 1 AFTER `id`,
    ADD INDEX `idx_workspace_id` (`workspace_id`),
    ADD INDEX `idx_flow_worker_v2` (`workspace_id`, `status`, `scheduled_at`);

-- 3. Standardize workspace_id in system_audit_logs
ALTER TABLE `system_audit_logs` 
    ADD COLUMN `workspace_id` INT(11) DEFAULT 1 AFTER `id`,
    ADD INDEX `idx_workspace_id` (`workspace_id`);

-- 4. Standardize workspace_id defaults for existing tables to ensure consistency
ALTER TABLE `mail_delivery_logs` MODIFY COLUMN `workspace_id` INT(11) DEFAULT 1;
ALTER TABLE `system_settings` MODIFY COLUMN `workspace_id` INT(11) DEFAULT 1;

-- 5. Add performance indexes for aggregator
-- [FIX] Ensure workspace_id exists in activity_buffer before indexing
ALTER TABLE `activity_buffer` ADD COLUMN IF NOT EXISTS `workspace_id` INT(11) DEFAULT 1 AFTER `id`;
ALTER TABLE `activity_buffer` ADD INDEX IF NOT EXISTS `idx_workspace_batch` (`workspace_id`, `processed`, `created_at`);

-- [PERF] Optimized index for Zalo buffer
ALTER TABLE `zalo_activity_buffer` ADD COLUMN IF NOT EXISTS `workspace_id` INT(11) DEFAULT 1 AFTER `id`;
ALTER TABLE `zalo_activity_buffer` ADD INDEX IF NOT EXISTS `idx_workspace_batch` (`workspace_id`, `processed`, `created_at`);

-- 6. Extreme Performance Indexes for Workers
ALTER TABLE `subscriber_flow_states` ADD INDEX IF NOT EXISTS `idx_perf_wakeup` (`status`, `scheduled_at`, `workspace_id`);
ALTER TABLE `subscribers` ADD INDEX IF NOT EXISTS `idx_perf_search` (`workspace_id`, `status`, `id`);

-- 7. High-Throughput Partitioning for raw_event_buffer
-- [PERF] Moving raw_event_buffer to weekly partitions for 2026
ALTER TABLE `raw_event_buffer` REORGANIZE PARTITION p_future INTO (
    PARTITION p2026_05 VALUES LESS THAN (unix_timestamp('2026-06-01 00:00:00')),
    PARTITION p2026_06 VALUES LESS THAN (unix_timestamp('2026-07-01 00:00:00')),
    PARTITION p2026_07 VALUES LESS THAN (unix_timestamp('2026-08-01 00:00:00')),
    PARTITION p2026_08 VALUES LESS THAN (unix_timestamp('2026-09-01 00:00:00')),
    PARTITION p2026_09 VALUES LESS THAN (unix_timestamp('2026-10-01 00:00:00')),
    PARTITION p2026_10 VALUES LESS THAN (unix_timestamp('2026-11-01 00:00:00')),
    PARTITION p2026_11 VALUES LESS THAN (unix_timestamp('2026-12-01 00:00:00')),
    PARTITION p2026_12 VALUES LESS THAN (unix_timestamp('2027-01-01 00:00:00')),
    PARTITION p_future VALUES LESS THAN MAXVALUE
);

-- 8. Activity Buffer Cleanup optimization
ALTER TABLE `activity_buffer` ADD INDEX IF NOT EXISTS `idx_processed_created` (`processed`, `created_at`);
