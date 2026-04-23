-- ============================================================
-- Migration: Trigger Source Status Fields
-- Created: 2026-04-23
-- Purpose: Add status + workspace_id to trigger source tables
-- Run once on production DB
-- ============================================================

-- 1. custom_events: CRITICAL — thêm workspace_id (PHP đã query cột này nhưng DB chưa có)
ALTER TABLE `custom_events`
  ADD COLUMN `workspace_id` INT(11) NOT NULL DEFAULT 1 AFTER `id`,
  ADD COLUMN `status` ENUM('active','inactive') NOT NULL DEFAULT 'active' AFTER `name`,
  ADD INDEX `idx_ce_workspace` (`workspace_id`),
  ADD INDEX `idx_ce_status` (`status`);

-- Backfill workspace_id = 1 (mặc định) cho các row cũ (đã có DEFAULT 1)
-- Không cần UPDATE thêm vì DEFAULT đã xử lý

-- 2. purchase_events: thêm status
ALTER TABLE `purchase_events`
  ADD COLUMN `status` ENUM('active','inactive') NOT NULL DEFAULT 'active' AFTER `name`,
  ADD INDEX `idx_pe_status` (`status`);

-- 3. forms: thêm status
ALTER TABLE `forms`
  ADD COLUMN `status` ENUM('active','inactive') NOT NULL DEFAULT 'active' AFTER `name`,
  ADD INDEX `idx_forms_status` (`status`);

-- 4. tags: thêm status
ALTER TABLE `tags`
  ADD COLUMN `status` ENUM('active','inactive') NOT NULL DEFAULT 'active' AFTER `name`,
  ADD INDEX `idx_tags_status` (`status`);

-- Verify
SELECT 'custom_events' as tbl, COLUMN_NAME, COLUMN_TYPE FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='custom_events' AND COLUMN_NAME IN ('workspace_id','status')
UNION ALL
SELECT 'purchase_events', COLUMN_NAME, COLUMN_TYPE FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='purchase_events' AND COLUMN_NAME='status'
UNION ALL
SELECT 'forms', COLUMN_NAME, COLUMN_TYPE FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='forms' AND COLUMN_NAME='status'
UNION ALL
SELECT 'tags', COLUMN_NAME, COLUMN_TYPE FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='tags' AND COLUMN_NAME='status';
