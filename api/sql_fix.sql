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