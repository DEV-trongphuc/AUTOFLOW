-- =====================================================
-- THE ULTIMATE HARDENING & 1B SCALE MIGRATION (2026)
-- Target: Absolute Multi-tenant Isolation & High-Performance
-- =====================================================

SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0;

-- 1. HARDEN META TABLES (Adding workspace_id)
ALTER TABLE meta_automation_scenarios ADD COLUMN IF NOT EXISTS workspace_id INT DEFAULT 1;
ALTER TABLE meta_conversations ADD COLUMN IF NOT EXISTS workspace_id INT DEFAULT 1;
ALTER TABLE meta_customer_journey ADD COLUMN IF NOT EXISTS workspace_id INT DEFAULT 1;
ALTER TABLE meta_message_logs ADD COLUMN IF NOT EXISTS workspace_id INT DEFAULT 1;

-- 2. HARDEN SUBSCRIBER_ACTIVITY INDEXES (Drop global, Add composite)
DROP INDEX IF EXISTS idx_subact_type_ref ON subscriber_activity;
DROP INDEX IF EXISTS idx_subid_type_ref ON subscriber_activity;
DROP INDEX IF EXISTS idx_sub_created ON subscriber_activity;
DROP INDEX IF EXISTS idx_sa_flow_sub_type ON subscriber_activity;

CREATE INDEX idx_sa_workspace_type_ref ON subscriber_activity(workspace_id, type, reference_id);
CREATE INDEX idx_sa_workspace_sub_created ON subscriber_activity(workspace_id, subscriber_id, created_at DESC);
CREATE INDEX idx_sa_workspace_flow_step ON subscriber_activity(workspace_id, flow_id, created_at);

-- 3. HARDEN SUBSCRIBER_FLOW_STATES INDEXES
DROP INDEX IF EXISTS unique_sub_flow ON subscriber_flow_states;
CREATE UNIQUE INDEX unique_sub_flow ON subscriber_flow_states(workspace_id, subscriber_id, flow_id);

DROP INDEX IF EXISTS idx_scheduled ON subscriber_flow_states;
DROP INDEX IF EXISTS idx_flow_status ON subscriber_flow_states;
DROP INDEX IF EXISTS idx_sub_waiting ON subscriber_flow_states;

CREATE INDEX idx_sfs_workspace_status_sched ON subscriber_flow_states(workspace_id, status, scheduled_at);
CREATE INDEX idx_sfs_workspace_flow_status ON subscriber_flow_states(workspace_id, flow_id, status, scheduled_at);
CREATE INDEX idx_sfs_workspace_sub_status ON subscriber_flow_states(workspace_id, subscriber_id, status);

-- 4. HARDEN MAIL_DELIVERY_LOGS INDEXES
DROP INDEX IF EXISTS idx_sent_at ON mail_delivery_logs;
DROP INDEX IF EXISTS idx_mdl_status_sent ON mail_delivery_logs;
DROP INDEX IF EXISTS idx_mdl_sub_camp ON mail_delivery_logs;

CREATE INDEX idx_mdl_workspace_sent ON mail_delivery_logs(workspace_id, sent_at DESC);
CREATE INDEX idx_mdl_workspace_campaign ON mail_delivery_logs(workspace_id, campaign_id, status);
CREATE INDEX idx_mdl_workspace_subscriber ON mail_delivery_logs(workspace_id, subscriber_id);

-- 5. HARDEN META_MESSAGE_LOGS INDEXES
DROP INDEX IF EXISTS idx_conversation ON meta_message_logs;
DROP INDEX IF EXISTS idx_created_at ON meta_message_logs;

CREATE INDEX idx_zum_workspace_user ON meta_message_logs(workspace_id, psid);
CREATE INDEX idx_meta_msg_created ON meta_message_logs(workspace_id, created_at DESC);

-- 6. ANALYZE ALL CORE TABLES
ANALYZE TABLE subscribers;
ANALYZE TABLE subscriber_activity;
ANALYZE TABLE subscriber_flow_states;
ANALYZE TABLE mail_delivery_logs;
ANALYZE TABLE meta_message_logs;
ANALYZE TABLE zalo_user_messages;

SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS;
