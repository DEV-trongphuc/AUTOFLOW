-- =====================================================
-- SUPPLEMENTAL HARDENING MIGRATION (Phase 2)
-- Target: Missing Intermediate Tables & Scoped Counters
-- =====================================================

SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0;

-- 1. HARDEN REMAINING INTERMEDIATE TABLES
ALTER TABLE subscriber_lists ADD COLUMN IF NOT EXISTS workspace_id INT DEFAULT 1;
ALTER TABLE subscriber_tags ADD COLUMN IF NOT EXISTS workspace_id INT DEFAULT 1;
ALTER TABLE segment_exclusions ADD COLUMN IF NOT EXISTS workspace_id INT DEFAULT 1;
ALTER TABLE segment_count_update_queue ADD COLUMN IF NOT EXISTS workspace_id INT DEFAULT 1;
ALTER TABLE subscriber_flow_states ADD COLUMN IF NOT EXISTS workspace_id INT DEFAULT 1;

-- 2. REBUILD PRIMARY & COMPOSITE INDEXES (Workspace-First)
-- subscriber_lists
ALTER TABLE subscriber_lists DROP PRIMARY KEY;
ALTER TABLE subscriber_lists ADD PRIMARY KEY (workspace_id, list_id, subscriber_id);
CREATE INDEX idx_sub_lists_ws_sub ON subscriber_lists (workspace_id, subscriber_id);

-- subscriber_tags
ALTER TABLE subscriber_tags DROP PRIMARY KEY;
ALTER TABLE subscriber_tags ADD PRIMARY KEY (workspace_id, tag_id, subscriber_id);
CREATE INDEX idx_sub_tags_ws_sub ON subscriber_tags (workspace_id, subscriber_id);

-- subscriber_flow_states (The Automation Heartbeat)
-- Workers query: WHERE workspace_id = ? AND status = 'waiting' AND scheduled_at <= NOW()
ALTER TABLE subscriber_flow_states DROP PRIMARY KEY;
ALTER TABLE subscriber_flow_states ADD PRIMARY KEY (workspace_id, flow_id, subscriber_id);
CREATE INDEX idx_sfs_ws_status_sched ON subscriber_flow_states (workspace_id, status, scheduled_at);
CREATE INDEX idx_sfs_ws_sub ON subscriber_flow_states (workspace_id, subscriber_id);

-- segment_exclusions
ALTER TABLE segment_exclusions DROP INDEX IF EXISTS idx_seg_exclusions_seg;
ALTER TABLE segment_exclusions ADD INDEX idx_se_ws_seg_sub (workspace_id, segment_id, subscriber_id);

-- segment_count_update_queue
ALTER TABLE segment_count_update_queue ADD INDEX idx_scuq_ws_seg (workspace_id, segment_id);

-- 3. ENSURE ZALO SYNC HELPERS (if not added in v2)
ALTER TABLE zalo_subscriber_activity ADD COLUMN IF NOT EXISTS workspace_id INT DEFAULT 1;
ALTER TABLE zalo_subscriber_activity ADD INDEX IF NOT EXISTS idx_zsa_ws_sub (workspace_id, subscriber_id);

SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS;
