-- Migration: Thêm cột notification_cc_emails vào bảng forms
-- Chạy file này trên phpMyAdmin hoặc MySQL client

ALTER TABLE `forms`
    ADD COLUMN IF NOT EXISTS `notification_cc_emails` TEXT NULL AFTER `notification_emails`;
