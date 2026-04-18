-- ============================================================
-- AutoFlow DB Index Audit Migration (PHỤC HỒI CHO MYSQL CŨ)
-- Đã xóa bỏ "IF NOT EXISTS" để tương thích với mọi phiên bản phpMyAdmin / XAMPP.
-- Bôi đen toàn bộ và chọn Run/Go. Nếu báo đỏ "Duplicate key" nghĩa là index đó đã có, cứ việc bỏ qua.
-- ============================================================

-- -----------------------------------------------------------------
-- 1. subscriber_activity (HOT TABLE)
-- -----------------------------------------------------------------
ALTER TABLE subscriber_activity
  ADD INDEX idx_sub_created (subscriber_id, created_at);

ALTER TABLE subscriber_activity
  ADD INDEX idx_campaign_sub_type (campaign_id, subscriber_id, type);

ALTER TABLE subscriber_activity
  ADD INDEX idx_sub_type_created (subscriber_id, type, created_at);

ALTER TABLE subscriber_activity
  ADD INDEX idx_type_created (type, created_at);

ALTER TABLE subscriber_activity
  ADD INDEX idx_campaign_type (campaign_id, type);

-- -----------------------------------------------------------------
-- 2. subscriber_flow_states (flow queue)
-- -----------------------------------------------------------------
ALTER TABLE subscriber_flow_states
  ADD INDEX idx_status_scheduled_created (status, scheduled_at, created_at);

ALTER TABLE subscriber_flow_states
  ADD INDEX idx_sub_flow_created (subscriber_id, flow_id, created_at);

ALTER TABLE subscriber_flow_states
  ADD INDEX idx_flow_status (flow_id, status);

ALTER TABLE subscriber_flow_states
  ADD INDEX idx_status_sched_flow (status, scheduled_at, flow_id, created_at);

-- -----------------------------------------------------------------
-- 3. activity_buffer
-- -----------------------------------------------------------------
ALTER TABLE activity_buffer
  ADD INDEX idx_processed_created (processed, created_at);

-- -----------------------------------------------------------------
-- 4. stats_update_buffer
-- -----------------------------------------------------------------
ALTER TABLE stats_update_buffer
  ADD INDEX idx_created (created_at);

-- -----------------------------------------------------------------
-- 5. mail_delivery_logs
-- -----------------------------------------------------------------
ALTER TABLE mail_delivery_logs
  ADD INDEX idx_campaign_status (campaign_id, status);

-- -----------------------------------------------------------------
-- 6. campaigns
-- -----------------------------------------------------------------
ALTER TABLE campaigns
  ADD INDEX idx_updated_at (updated_at);

ALTER TABLE campaigns
  ADD INDEX idx_workspace_deleted (workspace_id, is_deleted, created_at);

-- -----------------------------------------------------------------
-- 7. segments (Cập nhật cột mới)
-- -----------------------------------------------------------------
-- Nếu các cột này đã tồn tại, dòng này sẽ báo lỗi Duplicate Column Name. Không sao, cứ bỏ qua.
ALTER TABLE segments
  ADD COLUMN notify_on_join BOOLEAN DEFAULT FALSE,
  ADD COLUMN notify_subject VARCHAR(255) NULL,
  ADD COLUMN notify_email  VARCHAR(255) NULL,
  ADD COLUMN notify_cc     VARCHAR(255) NULL,
  ADD COLUMN workspace_id  INT(11) DEFAULT 1;

-- -----------------------------------------------------------------
-- 8. segment_exclusions
-- -----------------------------------------------------------------
ALTER TABLE segment_exclusions
  CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE segment_exclusions
  ADD INDEX idx_seg_exclusions_seg (segment_id);

-- -----------------------------------------------------------------
-- 9. subscribers (HOT PATH)
-- -----------------------------------------------------------------
ALTER TABLE subscribers
  ADD INDEX idx_workspace_status (workspace_id, status);

-- -----------------------------------------------------------------
-- 10. subscriber_lists
-- -----------------------------------------------------------------
ALTER TABLE subscriber_lists
  ADD INDEX idx_list_id (list_id);

-- -----------------------------------------------------------------
-- 11. zalo_delivery_logs
-- -----------------------------------------------------------------
ALTER TABLE zalo_delivery_logs
  ADD INDEX idx_flow_status (flow_id, status);

-- -----------------------------------------------------------------
-- 12. tags
-- -----------------------------------------------------------------
ALTER TABLE tags
  ADD INDEX idx_workspace (workspace_id);

-- -----------------------------------------------------------------
-- 13. subscriber_tags
-- -----------------------------------------------------------------
ALTER TABLE subscriber_tags
  ADD INDEX idx_tag_id (tag_id);

-- -----------------------------------------------------------------
-- 14. EXPLAIN Verification (Comment out)
-- -----------------------------------------------------------------
-- EXPLAIN SELECT * FROM subscriber_activity WHERE subscriber_id = 'X' AND created_at >= '2026-01-01' ORDER BY created_at DESC LIMIT 500;
-- EXPLAIN SELECT * FROM subscriber_flow_states WHERE status = 'waiting' AND scheduled_at <= NOW() ORDER BY created_at ASC LIMIT 200 FOR UPDATE SKIP LOCKED;
-- EXPLAIN SELECT status, COUNT(*) FROM mail_delivery_logs WHERE campaign_id = 'X' GROUP BY status;
-- EXPLAIN SELECT type, COUNT(*), COUNT(DISTINCT subscriber_id) FROM subscriber_activity WHERE campaign_id = 'X' AND type IN ('click_link','open_email') GROUP BY type;
-- EXPLAIN SELECT * FROM subscribers WHERE workspace_id = 1 AND status IN ('active','lead','customer') LIMIT 200;
-- EXPLAIN SELECT status, COUNT(*) FROM zalo_delivery_logs WHERE flow_id = 'X' GROUP BY status;

-- -----------------------------------------------------------------
-- 15. queue_jobs (Phase 8 Webhooks)
-- -----------------------------------------------------------------
ALTER TABLE queue_jobs
  ADD INDEX idx_status_available_id (status, available_at, id);

-- -----------------------------------------------------------------
-- 16. Web Tracking Analytics
-- -----------------------------------------------------------------
ALTER TABLE web_page_views
  ADD INDEX idx_property_loaded (property_id, loaded_at);

ALTER TABLE web_sessions
  ADD INDEX idx_property_started (property_id, started_at);

ALTER TABLE web_events
  ADD INDEX idx_property_event (property_id, event_type);

ALTER TABLE web_visitors
  ADD INDEX idx_property_lastvisit (property_id, last_visit_at);
