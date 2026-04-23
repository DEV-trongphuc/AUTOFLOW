-- ============================================================
-- sql_fix.sql — MIGRATION PATCH
-- Created : 2026-04-22
-- Run via : /api/run_migration.php?secret=autoflow_migrate_2026
--           hoặc CLI: php api/run_migration.php
-- ============================================================
-- Idempotent: Tất cả ALTER dùng ADD COLUMN IF NOT EXISTS,
-- chạy nhiều lần không gây lỗi.
-- ============================================================

-- [BUG-SQL-1] Thêm 3 cột còn thiếu vào short_links
-- Các cột này đang được auto-migrate trong links_qr.php
-- nhưng chưa có trong schema chính thức.

ALTER TABLE `short_links`
  ADD COLUMN IF NOT EXISTS `status` ENUM('active','paused') NOT NULL DEFAULT 'active' AFTER `survey_id`,
  ADD COLUMN IF NOT EXISTS `access_pin` VARCHAR(10) DEFAULT NULL AFTER `status`,
  ADD COLUMN IF NOT EXISTS `submit_count` INT NOT NULL DEFAULT 0 AFTER `access_pin`;

-- [queue_throttle] Tạo bảng throttle cho aggregate_daily
-- (nếu chưa tồn tại — idempotent vì có IF NOT EXISTS)

CREATE TABLE IF NOT EXISTS `queue_throttle` (
  `throttle_key` VARCHAR(120) NOT NULL,
  `created_at`   DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`throttle_key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- [BUG-FORMS-1] Data repair: tags được tạo bởi forms.php trước fix
-- không có workspace_id (NULL hoặc DEFAULT 1).
-- Lệnh này gán workspace_id = 1 cho tất cả tags chưa có workspace.
-- Safe: tags có workspace_id rồi sẽ không bị ảnh hưởng (WHERE workspace_id IS NULL).
-- Nếu hệ thống chỉ có 1 workspace → không cần lo. 
-- Nếu multi-workspace: chạy lệnh này trước khi deploy code mới.

UPDATE `tags`
SET `workspace_id` = 1
WHERE `workspace_id` IS NULL;

-- [BUG-FORMS-1] Đảm bảo tags.workspace_id không bao giờ NULL sau fix
-- (column đã có DEFAULT 1 trong schema nên lệnh này chỉ là safety net)
ALTER TABLE `tags`
  MODIFY COLUMN `workspace_id` int(11) NOT NULL DEFAULT 1;

-- ============================================================
-- Cách chạy:
--   Mở trình duyệt → https://[domain]/mail_api/run_migration.php?secret=autoflow_migrate_2026
--   Hoặc SSH/CLI → php api/run_migration.php
-- ============================================================

ALTER TABLE `voucher_codes`
  ADD COLUMN IF NOT EXISTS `claimed_source` VARCHAR(50) DEFAULT NULL AFTER `expires_at`,
  ADD COLUMN IF NOT EXISTS `claimed_source_id` VARCHAR(36) DEFAULT NULL AFTER `claimed_source`,
  ADD INDEX IF NOT EXISTS `idx_claimed_source` (`claimed_source`, `claimed_source_id`),
  ADD INDEX IF NOT EXISTS `idx_subscriber` (`subscriber_id`);

ALTER TABLE `voucher_claims`
  ADD COLUMN IF NOT EXISTS `source_channel` VARCHAR(50) DEFAULT NULL AFTER `status`,
  ADD COLUMN IF NOT EXISTS `source_id` VARCHAR(36) DEFAULT NULL AFTER `source_channel`,
  ADD INDEX IF NOT EXISTS `idx_source` (`source_channel`, `source_id`);

ALTER TABLE `survey_responses`
  ADD COLUMN IF NOT EXISTS `claimed_voucher_code` VARCHAR(50) DEFAULT NULL AFTER `time_spent_sec`;

ALTER TABLE `voucher_campaigns`
  ADD COLUMN IF NOT EXISTS `claim_target_form_id` VARCHAR(36) DEFAULT NULL AFTER `claim_email_template_id`;-- ============================================================
-- DOMATION Platform: Migration Post-Audit Bug Fixes
-- Version  : 002_post_audit_workspace_isolation
-- Created  : 2026-04-22
-- Applies  : BUG-PE-1 | BUG-WC-1 | BUG-SE-1 | Phase 5A gaps
-- Safe     : All use IF NOT EXISTS / no data loss risk
-- ============================================================

-- ============================================================
-- [1] BUG-PE-1 FIX: Them workspace_id vao bang purchase_events
-- purchase_events khong co workspace_id nen subscriber moi tu
-- public track API se co NULL workspace_id, khong hien trong
-- CRM va khong trigger automation dung workspace.
-- ============================================================

ALTER TABLE `purchase_events`
  ADD COLUMN IF NOT EXISTS `workspace_id` INT(11) NOT NULL DEFAULT 1
    COMMENT 'Workspace owning this purchase event config'
  AFTER `id`;

-- Backfill: set tat ca existing records ve workspace_id = 1
-- (single-tenant default). Multi-tenant: update thu cong.
UPDATE `purchase_events`
SET `workspace_id` = 1
WHERE `workspace_id` = 0 OR `workspace_id` IS NULL;

-- Index de filter nhanh theo workspace
ALTER TABLE `purchase_events`
  ADD INDEX IF NOT EXISTS `idx_pe_workspace` (`workspace_id`);


-- ============================================================
-- [2] DATA INTEGRITY: Subscribers co workspace_id = NULL
-- Record tao truoc fix BUG-PE-1 co the co NULL workspace_id
-- -> backfill ve DEFAULT 1 tranh bi "vo hinh" trong CRM.
-- ============================================================

UPDATE `subscribers`
SET `workspace_id` = 1
WHERE `workspace_id` IS NULL OR `workspace_id` = 0;


-- ============================================================
-- [3] PERFORMANCE INDEXES cho cac bug fix moi
-- Them index de tranh full table scan sau khi co WHERE
-- workspace_id = ? trong tat ca recipient/subscriber queries.
-- ============================================================

DROP PROCEDURE IF EXISTS `domation_add_index`;

DELIMITER $$
CREATE PROCEDURE `domation_add_index`(
    IN tbl VARCHAR(64),
    IN idx VARCHAR(64),
    IN col_def TEXT
)
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.STATISTICS
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME   = tbl
          AND INDEX_NAME   = idx
    ) THEN
        SET @ddl = CONCAT('ALTER TABLE `', tbl, '` ADD INDEX `', idx, '` ', col_def);
        PREPARE s FROM @ddl;
        EXECUTE s;
        DEALLOCATE PREPARE s;
        SELECT CONCAT('Created index ', idx, ' on ', tbl) AS migration_log;
    ELSE
        SELECT CONCAT('Index ', idx, ' already exists on ', tbl, ' - skipped') AS migration_log;
    END IF;
END$$
DELIMITER ;

-- [BUG-WC-1] worker_campaign.php recipient query: workspace_id + status
CALL domation_add_index('subscribers', 'idx_sub_workspace_status', '(`workspace_id`, `status`)');

-- [BUG-PE-1] purchase_events subscriber lookup: workspace_id + email
CALL domation_add_index('subscribers', 'idx_sub_workspace_email', '(`workspace_id`, `email`(32))');

-- [BUG-SE-1] sync_engine.php loadMaps: workspace_id + phone_number
CALL domation_add_index('subscribers', 'idx_sub_workspace_phone', '(`workspace_id`, `phone_number`)');

-- [Phase 5A] web_events visitor journey query
CALL domation_add_index('web_events', 'idx_we_visitor_created', '(`visitor_id`, `created_at`)');

-- Cleanup helper procedure
DROP PROCEDURE IF EXISTS `domation_add_index`;


-- ============================================================
-- [4] VERIFY sau khi chay migration
-- Bo comment truoc moi lenh de kiem tra.
-- ============================================================

-- SHOW COLUMNS FROM `purchase_events` LIKE 'workspace_id';
-- SHOW INDEX FROM `subscribers` WHERE Key_name LIKE 'idx_sub_workspace%';
-- SELECT COUNT(*) FROM `subscribers` WHERE workspace_id IS NULL OR workspace_id = 0;
-- SELECT COUNT(*) FROM `purchase_events` WHERE workspace_id IS NULL OR workspace_id = 0;
-- SHOW INDEX FROM `web_events` WHERE Key_name = 'idx_we_visitor_created';

-- ============================================================
-- END OF MIGRATION 002
-- ============================================================


-- ============================================================
-- [5] BUG-VC-SCHEMA-1 FIX: voucher_codes.status ENUM mismatch
--
-- voucher_claim.php (ln 172) was setting status = 'available'
-- which is NOT in ENUM('unused','used'). In MySQL strict mode
-- this throws error 1265 (Data truncated for column 'status').
-- In non-strict mode it silently stores '' (empty string).
--
-- Fix: Add claimed_at timestamp column (tracks when code was
-- claimed vs. physically redeemed = used_at). Code is correct
-- in PHP (now uses 'used'). Migration adds claimed_at if missing.
-- ============================================================

-- Add claimed_at column if not exists
ALTER TABLE `voucher_codes`
  ADD COLUMN IF NOT EXISTS `claimed_at` DATETIME DEFAULT NULL
    COMMENT 'Timestamp when subscriber claimed/was assigned this code'
  AFTER `used_at`;

-- Fix any corrupted rows where status was set to '' or 'available'
-- (from old code running in non-strict mode)
UPDATE `voucher_codes`
SET `status` = 'used',
    `claimed_at` = COALESCE(`claimed_at`, `sent_at`, NOW())
WHERE `status` NOT IN ('unused', 'used')
  AND `subscriber_id` IS NOT NULL;

-- Verify
-- SELECT status, COUNT(*) FROM voucher_codes GROUP BY status;
-- SHOW COLUMNS FROM voucher_codes LIKE 'claimed_at';

-- ============================================================
-- END OF ALL MIGRATIONS
-- ============================================================
