-- ============================================================
-- Migration 001: Production Hardening
-- AutoFlow System — Apply before going live
-- Date: 2026-04-18
-- Author: TechLead Audit
-- MUST RUN: via phpMyAdmin or MySQL CLI
-- ============================================================

-- ─── C-5 CRITICAL: Remove ENUM constraint on stats_update_buffer.target_table
-- Without this, zalo_subscribers inserts SILENTLY FAIL (MySQL ENUM rejects unknown values)
-- causing all Zalo ZNS stats to be permanently lost.
ALTER TABLE stats_update_buffer 
  MODIFY COLUMN target_table VARCHAR(50) NOT NULL;

-- ─── PERF: Add index for FlowExecutor idempotency check (queue_created_at scope)
-- Speeds up the UNION ALL dedup query from O(n) to O(log n) per step execution.
-- subscriber_id + type + reference_id + created_at is the exact 4-column filter.
ALTER TABLE subscriber_activity 
  ADD INDEX IF NOT EXISTS idx_activity_dedup (subscriber_id, type(20), reference_id(36), created_at);

ALTER TABLE activity_buffer 
  ADD INDEX IF NOT EXISTS idx_buffer_dedup (subscriber_id, type(20), reference_id(36), created_at);

-- ─── RELIABILITY: Add last_error column to subscriber_flow_states if not exists
-- Required by worker_flow.php exception handler to trace failed step reasons.
ALTER TABLE subscriber_flow_states
  ADD COLUMN IF NOT EXISTS last_error TEXT DEFAULT NULL;

-- ─── PERF: Add index on processing_campaign type+campaign_id for the 10-min lock query
-- worker_campaign.php uses this in the NOT EXISTS subquery on every batch.
ALTER TABLE subscriber_activity
  ADD INDEX IF NOT EXISTS idx_processing_campaign (campaign_id, type(30), created_at);

-- Verify migration applied correctly
SELECT 
  COLUMN_NAME, DATA_TYPE, CHARACTER_MAXIMUM_LENGTH, IS_NULLABLE
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_SCHEMA = DATABASE() 
  AND TABLE_NAME = 'stats_update_buffer' 
  AND COLUMN_NAME = 'target_table';
-- Expected: DATA_TYPE=varchar, CHARACTER_MAXIMUM_LENGTH=50
