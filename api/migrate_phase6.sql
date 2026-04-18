-- =============================================================================
-- Phase 6 Migration Script — Production DB
-- Run once on production MySQL. Safe to run on fresh installs (IF NOT EXISTS guards).
-- =============================================================================

-- [P6-C2] Add 'paused' to campaigns.status ENUM
-- BEFORE: worker_campaign.php Circuit Breaker wrote 'paused' → MySQL strict set '' silently
ALTER TABLE `campaigns`
  MODIFY COLUMN `status`
  ENUM('draft','scheduled','sending','sent','archived','waiting_flow','paused')
  DEFAULT 'draft';

-- [P6-C3] Add 'cancelled' to subscriber_flow_states.status ENUM
-- BEFORE: tracking_processor.php unsubscribe wrote 'cancelled' → MySQL strict set '' silently
--         → worker kept processing subscribers who had already unsubscribed
ALTER TABLE `subscriber_flow_states`
  MODIFY COLUMN `status`
  ENUM('waiting','processing','completed','failed','unsubscribed','cancelled')
  DEFAULT 'waiting';

-- [P6-C1] Add stat_meta_sent column to flows table
-- BEFORE: Meta Facebook sends only incremented stat_total_sent — could not be analyzed per-channel
ALTER TABLE `flows`
  ADD COLUMN IF NOT EXISTS `stat_meta_sent` INT(11) NOT NULL DEFAULT 0
  COMMENT 'Total Meta Facebook messages sent';

-- Verification queries (run after migration):
-- SHOW COLUMNS FROM campaigns LIKE 'status';
-- SHOW COLUMNS FROM subscriber_flow_states LIKE 'status';
-- SHOW COLUMNS FROM flows LIKE 'stat_meta_sent';
