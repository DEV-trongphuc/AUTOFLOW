-- =====================================================
-- CORE MARKETING TABLES HARDENING & INDEXING (1B SCALE)
-- Target: High-throughput Multi-tenant Isolation
-- =====================================================

SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0;

-- =====================================================
-- 1. SUBSCRIBER_ACTIVITY INDEXES (The highest volume table)
-- =====================================================

-- [REPLACE] Feed Index: Critical for "Activity Feed" view in UI
-- Previous: (subscriber_id, created_at DESC)
DROP INDEX IF EXISTS idx_subact_feed ON subscriber_activity;
CREATE INDEX idx_subact_feed_v2 
ON subscriber_activity(workspace_id, subscriber_id, created_at DESC);

-- [REPLACE] Type/Ref Index: Critical for Flow Condition checks and Stats aggregation
-- Previous: (type, reference_id)
DROP INDEX IF EXISTS idx_subact_type_ref ON subscriber_activity;
CREATE INDEX idx_subact_type_ref_v2 
ON subscriber_activity(workspace_id, type, reference_id);

-- [NEW] Flow Tracking Index: Critical for Flow Analytics and Journey View
CREATE INDEX IF NOT EXISTS idx_subact_flow_step 
ON subscriber_activity(workspace_id, flow_id, type, created_at);

-- [NEW] Campaign Tracking Index: Critical for Campaign Reports
CREATE INDEX IF NOT EXISTS idx_subact_campaign 
ON subscriber_activity(workspace_id, campaign_id, type);

-- =====================================================
-- 2. SUBSCRIBER_FLOW_STATES INDEXES
-- =====================================================

-- [NEW] State Lookup: Critical for Flow Workers selecting waiting participants
CREATE INDEX IF NOT EXISTS idx_sfs_workspace_flow_status 
ON subscriber_flow_states(workspace_id, flow_id, status, scheduled_at);

-- [NEW] Subscriber State: Critical for "Active Flows" view for a contact
CREATE INDEX IF NOT EXISTS idx_sfs_subscriber 
ON subscriber_flow_states(workspace_id, subscriber_id, status);

-- =====================================================
-- 3. SUBSCRIBERS INDEXES
-- =====================================================

-- Ensure workspace_id is always lead for common filters
CREATE INDEX IF NOT EXISTS idx_subs_workspace_status 
ON subscribers(workspace_id, status, created_at DESC);

-- [NEW] Zalo Message Hardening
ALTER TABLE zalo_user_messages ADD COLUMN IF NOT EXISTS workspace_id INT DEFAULT 1 AFTER id;
CREATE INDEX IF NOT EXISTS idx_zum_workspace_user ON zalo_user_messages(workspace_id, zalo_user_id);

-- =====================================================
-- 4. ANALYZE TABLES
-- =====================================================
ANALYZE TABLE subscriber_activity;
ANALYZE TABLE subscriber_flow_states;
ANALYZE TABLE subscribers;
ANALYZE TABLE zalo_user_messages;

SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS;
