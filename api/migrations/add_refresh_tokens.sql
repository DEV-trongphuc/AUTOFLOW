-- Migration: Token authentication for AI Space
-- Token format: bin2hex(random_bytes(32)) = exactly 64 hex chars
-- → dùng CHAR(64) để full-index lookup, không cần prefix index

-- 1. Access tokens (short-lived: 15 minutes)
CREATE TABLE IF NOT EXISTS `ai_org_access_tokens` (
    `id`            INT AUTO_INCREMENT PRIMARY KEY,
    `user_id`       VARCHAR(36)  NOT NULL,
    `token`         CHAR(64)     NOT NULL UNIQUE,   -- SHA-256 hex / bin2hex(32 bytes)
    `expires_at`    TIMESTAMP    NOT NULL,
    `is_active`     TINYINT(1)   NOT NULL DEFAULT 1,
    `last_used_at`  TIMESTAMP    NULL DEFAULT NULL,
    `created_at`    TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX `idx_user_id`    (`user_id`),
    INDEX `idx_expires_at` (`expires_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 2. Refresh tokens (long-lived: 7 days / 30 days nếu remember-me)
CREATE TABLE IF NOT EXISTS `ai_org_refresh_tokens` (
    `id`            INT AUTO_INCREMENT PRIMARY KEY,
    `user_id`       VARCHAR(36)  NOT NULL,
    `token`         CHAR(64)     NOT NULL UNIQUE,   -- full index, lookup O(1)
    `expires_at`    TIMESTAMP    NOT NULL,
    `is_active`     TINYINT(1)   NOT NULL DEFAULT 1,
    `device_info`   VARCHAR(255) NULL DEFAULT NULL,
    `ip_address`    VARCHAR(45)  NULL DEFAULT NULL,
    `last_used_at`  TIMESTAMP    NULL DEFAULT NULL,
    `created_at`    TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX `idx_user_id`    (`user_id`),
    INDEX `idx_expires_at` (`expires_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Nếu đã chạy migration cũ (VARCHAR(512)) thì ALTER lại:
-- ALTER TABLE `ai_org_access_tokens`  MODIFY `token` CHAR(64) NOT NULL UNIQUE;
-- ALTER TABLE `ai_org_refresh_tokens` MODIFY `token` CHAR(64) NOT NULL UNIQUE;
