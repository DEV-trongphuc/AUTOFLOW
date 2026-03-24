-- Migration: Thêm cột notification vào bảng forms
-- Chạy file này trên phpMyAdmin hoặc MySQL client

ALTER TABLE `forms`
    ADD COLUMN IF NOT EXISTS `notification_enabled` TINYINT(1) NOT NULL DEFAULT 0 AFTER `target_list_id`,
    ADD COLUMN IF NOT EXISTS `notification_emails` TEXT NULL AFTER `notification_enabled`,
    ADD COLUMN IF NOT EXISTS `notification_subject` VARCHAR(255) NULL AFTER `notification_emails`;
