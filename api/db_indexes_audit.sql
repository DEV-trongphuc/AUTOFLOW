-- ============================================================
-- AutoFlow DB Index Audit Migration
-- Generated: 2026-04-17 (updated with Phase 3 fixes)
-- Run on staging first, then production during low-traffic window.
-- Each statement uses IF NOT EXISTS (MySQL 8.0+) to be idempotent.
-- ============================================================

-- -----------------------------------------------------------------
-- 1. subscriber_activity (HOT TABLE — most reads/writes in system)
-- -----------------------------------------------------------------

-- Primary lookup: fetch activities by subscriber + time range (flow worker, condition checks)
ALTER TABLE subscriber_activity
  ADD INDEX IF NOT EXISTS idx_sub_created (subscriber_id, created_at);

-- Campaign-scoped lookup: check if subscriber already received campaign
ALTER TABLE subscriber_activity
  ADD INDEX IF NOT EXISTS idx_campaign_sub_type (campaign_id, subscriber_id, type);

-- Type+created scan: exit condition pre-fetch in flow/priority workers
ALTER TABLE subscriber_activity
  ADD INDEX IF NOT EXISTS idx_sub_type_created (subscriber_id, type, created_at);

-- Processing lock cleanup: DELETE stale processing_campaign locks
ALTER TABLE subscriber_activity
  ADD INDEX IF NOT EXISTS idx_type_created (type, created_at);

-- [Phase 2] Self-healing sync: merged click+open GROUP BY per campaign
ALTER TABLE subscriber_activity
  ADD INDEX IF NOT EXISTS idx_campaign_type (campaign_id, type);

-- -----------------------------------------------------------------
-- 2. subscriber_flow_states (flow queue — highly contended)
-- -----------------------------------------------------------------

-- Main batch fetch for worker_flow.php: SKIP LOCKED covering index
ALTER TABLE subscriber_flow_states
  ADD INDEX IF NOT EXISTS idx_status_scheduled_created (status, scheduled_at, created_at);

-- Per-subscriber flow lookup: enrollment checks, cooldown
ALTER TABLE subscriber_flow_states
  ADD INDEX IF NOT EXISTS idx_sub_flow_created (subscriber_id, flow_id, created_at);

-- Flow-level stats
ALTER TABLE subscriber_flow_states
  ADD INDEX IF NOT EXISTS idx_flow_status (flow_id, status);

-- [Phase 3] Priority batch mode SKIP LOCKED covering index
-- Covers: WHERE status='waiting' AND scheduled_at<=NOW() ... ORDER BY created_at LIMIT 50
ALTER TABLE subscriber_flow_states
  ADD INDEX IF NOT EXISTS idx_status_sched_flow (status, scheduled_at, flow_id, created_at);

-- -----------------------------------------------------------------
-- 3. activity_buffer
-- -----------------------------------------------------------------
ALTER TABLE activity_buffer
  ADD INDEX IF NOT EXISTS idx_processed_created (processed, created_at);

-- -----------------------------------------------------------------
-- 4. stats_update_buffer
-- -----------------------------------------------------------------
ALTER TABLE stats_update_buffer
  ADD INDEX IF NOT EXISTS idx_created (created_at);

-- -----------------------------------------------------------------
-- 5. mail_delivery_logs
-- -----------------------------------------------------------------
-- Covers: SELECT status, COUNT(*) ... WHERE campaign_id = ? GROUP BY status
ALTER TABLE mail_delivery_logs
  ADD INDEX IF NOT EXISTS idx_campaign_status (campaign_id, status);

-- -----------------------------------------------------------------
-- 6. campaigns
-- -----------------------------------------------------------------
ALTER TABLE campaigns
  ADD INDEX IF NOT EXISTS idx_updated_at (updated_at);

-- [Phase 3] workspace + status covering for list route (is_deleted=0 AND workspace_id=?)
ALTER TABLE campaigns
  ADD INDEX IF NOT EXISTS idx_workspace_deleted (workspace_id, is_deleted, created_at);

-- -----------------------------------------------------------------
-- 7. segments — columns previously bootstrapped per-request
-- -----------------------------------------------------------------
ALTER TABLE segments
  ADD COLUMN IF NOT EXISTS notify_on_join BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS notify_subject VARCHAR(255) NULL,
  ADD COLUMN IF NOT EXISTS notify_email  VARCHAR(255) NULL,
  ADD COLUMN IF NOT EXISTS notify_cc     VARCHAR(255) NULL,
  ADD COLUMN IF NOT EXISTS workspace_id  INT(11) DEFAULT 1;

-- -----------------------------------------------------------------
-- 8. segment_exclusions — collation fix + index
-- -----------------------------------------------------------------
ALTER TABLE segment_exclusions
  CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE segment_exclusions
  ADD INDEX IF NOT EXISTS idx_seg_exclusions_seg (segment_id);

-- -----------------------------------------------------------------
-- 9. subscribers — workspace+status composite (HOT PATH)
-- -----------------------------------------------------------------
-- [Phase 3] Used in virtually every subscriber fetch across all workers and APIs.
-- Covers: WHERE workspace_id = ? AND status IN ('active','lead','customer')
ALTER TABLE subscribers
  ADD INDEX IF NOT EXISTS idx_workspace_status (workspace_id, status);

-- -----------------------------------------------------------------
-- 10. subscriber_lists — bulk enrollment IN() queries
-- -----------------------------------------------------------------
-- Covers: WHERE list_id IN (?) / WHERE subscriber_id = ? AND list_id = ?
ALTER TABLE subscriber_lists
  ADD INDEX IF NOT EXISTS idx_list_id (list_id);

-- -----------------------------------------------------------------
-- 11. zalo_delivery_logs — merged ZNS stats GROUP BY
-- -----------------------------------------------------------------
-- [Phase 3] Covers: WHERE flow_id = ? GROUP BY status (replacing 4 separate queries)
ALTER TABLE zalo_delivery_logs
  ADD INDEX IF NOT EXISTS idx_flow_status (flow_id, status);

-- -----------------------------------------------------------------
-- 12. tags — workspace lookup
-- -----------------------------------------------------------------
ALTER TABLE tags
  ADD INDEX IF NOT EXISTS idx_workspace (workspace_id);

-- -----------------------------------------------------------------
-- 13. subscriber_tags — tag lookup for bulk ops
-- -----------------------------------------------------------------
ALTER TABLE subscriber_tags
  ADD INDEX IF NOT EXISTS idx_tag_id (tag_id);

-- -----------------------------------------------------------------
-- 14. Verify: EXPLAIN hot queries after applying indexes
-- -----------------------------------------------------------------
-- EXPLAIN SELECT * FROM subscriber_activity WHERE subscriber_id = 'X' AND created_at >= '2026-01-01' ORDER BY created_at DESC LIMIT 500;
-- EXPLAIN SELECT * FROM subscriber_flow_states WHERE status = 'waiting' AND scheduled_at <= NOW() ORDER BY created_at ASC LIMIT 200 FOR UPDATE SKIP LOCKED;
-- EXPLAIN SELECT status, COUNT(*) FROM mail_delivery_logs WHERE campaign_id = 'X' GROUP BY status;
-- EXPLAIN SELECT type, COUNT(*), COUNT(DISTINCT subscriber_id) FROM subscriber_activity WHERE campaign_id = 'X' AND type IN ('click_link','open_email') GROUP BY type;
-- EXPLAIN SELECT * FROM subscribers WHERE workspace_id = 1 AND status IN ('active','lead','customer') LIMIT 200;
-- EXPLAIN SELECT status, COUNT(*) FROM zalo_delivery_logs WHERE flow_id = 'X' GROUP BY status;

-- -----------------------------------------------------------------
-- 15. [Phase 8] queue_jobs — Extreme Scale Async Processing
-- -----------------------------------------------------------------
-- Covers: worker_queue.php fetching WHERE status = 'pending' AND available_at <= NOW() ORDER BY available_at ASC, id ASC LIMIT X
ALTER TABLE queue_jobs
  ADD INDEX IF NOT EXISTS idx_status_available_id (status, available_at, id);

-- -----------------------------------------------------------------
-- 16. [Phase 8] Core Web Tracking Analytics — 100M+ Rows Engine
-- -----------------------------------------------------------------
-- Covers: web_tracking_processor.php and website_tracking.php aggregate queries
ALTER TABLE web_page_views
  ADD INDEX IF NOT EXISTS idx_property_loaded (property_id, loaded_at);

ALTER TABLE web_sessions
  ADD INDEX IF NOT EXISTS idx_property_started (property_id, started_at);

ALTER TABLE web_events
  ADD INDEX IF NOT EXISTS idx_property_event (property_id, event_type);

-- Covers: resolving visitor geo/session lookup rapidly
ALTER TABLE web_visitors
  ADD INDEX IF NOT EXISTS idx_property_lastvisit (property_id, last_visit_at);
