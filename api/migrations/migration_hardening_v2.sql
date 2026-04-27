-- =====================================================
-- THE ULTIMATE HARDENING & 1B SCALE MIGRATION (2026)
-- Target: Absolute Multi-tenant Isolation & High-Performance
-- =====================================================

SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0;

-- 1. HARDEN META TABLES (Adding workspace_id)
ALTER TABLE meta_automation_scenarios ADD COLUMN IF NOT EXISTS workspace_id INT DEFAULT 1;
ALTER TABLE meta_conversations ADD COLUMN IF NOT EXISTS workspace_id INT DEFAULT 1;

-- 2. HARDEN ZALO TABLES
ALTER TABLE zalo_subscribers ADD COLUMN IF NOT EXISTS workspace_id INT DEFAULT 1;
ALTER TABLE zalo_subscriber_activity ADD COLUMN IF NOT EXISTS workspace_id INT DEFAULT 1;
ALTER TABLE zalo_lists ADD COLUMN IF NOT EXISTS workspace_id INT DEFAULT 1;

-- 3. HARDEN TAGS & VOUCHERS
ALTER TABLE subscriber_tags ADD COLUMN IF NOT EXISTS workspace_id INT DEFAULT 1;
ALTER TABLE survey_responses ADD COLUMN IF NOT EXISTS workspace_id INT DEFAULT 1;
ALTER TABLE voucher_codes ADD COLUMN IF NOT EXISTS workspace_id INT DEFAULT 1;

-- 4. HARDEN TRACKING
ALTER TABLE tracking_unique_cache ADD COLUMN IF NOT EXISTS workspace_id INT DEFAULT 1;

-- 5. REBUILD INDEXES FOR 1B SCALE (Workspace-First Partitioning)
-- This ensures Tenant Pruning: MySQL will only scan a tiny fraction of the 1B rows.

-- Subscribers
ALTER TABLE subscribers DROP INDEX IF EXISTS idx_subscribers_workspace;
ALTER TABLE subscribers ADD INDEX idx_sub_ws_status_id (workspace_id, status, id);
ALTER TABLE subscribers ADD INDEX idx_sub_ws_email (workspace_id, email);

-- Activity (The largest table)
ALTER TABLE subscriber_activity DROP INDEX IF EXISTS idx_activity_workspace;
ALTER TABLE subscriber_activity ADD INDEX idx_act_ws_flow_type (workspace_id, flow_id, type, created_at);
ALTER TABLE subscriber_activity ADD INDEX idx_act_ws_camp_type (workspace_id, campaign_id, type, created_at);
ALTER TABLE subscriber_activity ADD INDEX idx_act_ws_sub_type (workspace_id, subscriber_id, type, created_at);

-- Tags (Relational)
ALTER TABLE subscriber_tags ADD INDEX idx_st_ws_sub_tag (workspace_id, subscriber_id, tag_id);
ALTER TABLE tags ADD INDEX idx_tags_ws_name (workspace_id, name);

-- Zalo
ALTER TABLE zalo_subscribers ADD INDEX idx_zs_ws_uid (workspace_id, zalo_user_id);
ALTER TABLE zalo_subscribers ADD INDEX idx_zs_ws_list (workspace_id, zalo_list_id);

-- Vouchers
ALTER TABLE voucher_codes ADD INDEX idx_vc_ws_camp_sub (workspace_id, campaign_id, subscriber_id, status);

SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS;
