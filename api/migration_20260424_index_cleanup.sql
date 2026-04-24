-- ============================================================
-- AutoFlow — Index Cleanup Migration
-- Generated: 2026-04-24
-- Purpose: Remove duplicate/conflicting indexes found in deep audit
-- Safe to run on live DB — only DROP KEY (no data changes)
-- ============================================================

-- *** RUN IN ORDER — each ALTER is a separate statement ***

-- -------------------------------------------------------
-- DB-BUG-01: survey_answer_details — 6 indexes, 3 are exact duplicates
-- Keeping: idx_answer_details_* (more descriptive names)
-- Dropping: original shorter names added earlier
-- -------------------------------------------------------
ALTER TABLE `survey_answer_details`
  DROP KEY IF EXISTS `idx_answer_response`,
  DROP KEY IF EXISTS `idx_answer_question`,
  DROP KEY IF EXISTS `idx_answer_survey`;

-- -------------------------------------------------------
-- DB-BUG-02: survey_responses — idx_survey_time is a subset of
-- idx_survey_responses_survey_submitted (same columns, same order)
-- -------------------------------------------------------
ALTER TABLE `survey_responses`
  DROP KEY IF EXISTS `idx_survey_time`;

-- -------------------------------------------------------
-- DB-BUG-03: activity_buffer — two identical composite indexes
-- Keeping: idx_ab_processed_created (more specific prefix)
-- -------------------------------------------------------
ALTER TABLE `activity_buffer`
  DROP KEY IF EXISTS `idx_processed_created`;

-- -------------------------------------------------------
-- DB-BUG-04: link_clicks — two identical composite indexes
-- Keeping: idx_short_link_time
-- -------------------------------------------------------
ALTER TABLE `link_clicks`
  DROP KEY IF EXISTS `idx_link_time`;

-- -------------------------------------------------------
-- DB-BUG-05: meta_app_configs — plain KEY on page_id is
-- fully covered by UNIQUE KEY idx_page_id (same column)
-- -------------------------------------------------------
ALTER TABLE `meta_app_configs`
  DROP KEY IF EXISTS `idx_mac_page_id`;

-- -------------------------------------------------------
-- DB-BUG-06: meta_message_logs — two UNIQUE keys on same column
-- Keeping: uq_mid
-- -------------------------------------------------------
ALTER TABLE `meta_message_logs`
  DROP KEY IF EXISTS `idx_mid`;

-- -------------------------------------------------------
-- DB-BUG-07: zalo_user_messages — missing index for background
-- job queries by (zalo_user_id, created_at)
-- -------------------------------------------------------
ALTER TABLE `zalo_user_messages`
  ADD KEY IF NOT EXISTS `idx_zum_user_created` (`zalo_user_id`, `created_at`);

-- -------------------------------------------------------
-- DB-BUG-08 (CRITICAL): tags — global UNIQUE on `name` breaks
-- multi-tenant workspace isolation. Two workspaces CANNOT share
-- the same tag name (e.g. "VIP") with this constraint.
-- The composite ws_name_unique (workspace_id, name) is the correct
-- constraint for multi-tenant uniqueness.
-- -------------------------------------------------------
ALTER TABLE `tags`
  DROP KEY IF EXISTS `idx_tag_name`;

-- -------------------------------------------------------
-- PERF-04: web_daily_stats — UNIQUE KEY on (property_id, date)
-- is LESS specific than the PRIMARY KEY (date, property_id, url_hash, device_type).
-- This UNIQUE key prevents inserting multiple rows for the same
-- property+date but different URL/device combinations → data integrity bug.
-- -------------------------------------------------------
ALTER TABLE `web_daily_stats`
  DROP KEY IF EXISTS `idx_prop_date`;

-- ============================================================
-- Verification queries (run after migration):
-- ============================================================
-- SHOW INDEX FROM survey_answer_details WHERE Key_name LIKE 'idx_answer%';
--   → should return 3 rows (idx_answer_details_*)
-- SHOW INDEX FROM tags WHERE Key_name = 'idx_tag_name';
--   → should return 0 rows
-- SHOW INDEX FROM web_daily_stats;
--   → should only show PRIMARY key
-- SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS
--   WHERE TABLE_SCHEMA = DATABASE()
--   AND TABLE_NAME = 'tags' AND INDEX_NAME = 'idx_tag_name';
--   → should return 0
-- ============================================================
