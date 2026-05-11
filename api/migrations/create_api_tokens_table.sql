-- =============================================================================
-- Migration: Create api_tokens table for Bearer token authentication
-- Purpose: Supports R3-C02 fix in upload.php which validates Bearer tokens
--          against this table. Without this table, Bearer auth silently rejects
--          all tokens (fail-closed, secure but non-functional).
-- Run: php api/create_api_tokens_table.php
--       OR execute this SQL directly via phpMyAdmin / CLI
-- =============================================================================

CREATE TABLE IF NOT EXISTS `api_tokens` (
    `id`          INT UNSIGNED     NOT NULL AUTO_INCREMENT,
    `name`        VARCHAR(100)     NOT NULL COMMENT 'Human-readable label (e.g. "S3 Uploader Bot")',
    `token`       CHAR(64)         NOT NULL COMMENT 'SHA-256 hash of the raw token (never store plaintext)',
    `scope`       ENUM('upload', 'read', 'write', 'full_access') NOT NULL DEFAULT 'upload',
    `workspace_id` INT UNSIGNED    NULL     COMMENT 'If set, restricts token to one workspace; NULL = global',
    `created_by`  INT UNSIGNED     NULL     COMMENT 'User ID who created this token',
    `last_used_at` DATETIME        NULL,
    `expires_at`  DATETIME         NULL     COMMENT 'NULL means no expiry (permanent token)',
    `is_active`   TINYINT(1)       NOT NULL DEFAULT 1,
    `created_at`  DATETIME         NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at`  DATETIME         NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    UNIQUE KEY `uq_token_hash` (`token`),
    INDEX `idx_scope_active` (`scope`, `is_active`),
    INDEX `idx_expires` (`expires_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='API tokens for server-to-server Bearer token authentication';

-- =============================================================================
-- HOW TO CREATE A TOKEN:
-- 1. Generate a cryptographically secure random token:
--    $rawToken = bin2hex(random_bytes(32)); // 64-char hex string
-- 2. Hash it before storing:
--    $hash = hash('sha256', $rawToken);
-- 3. Give $rawToken to the API client (store securely — never log it)
-- 4. Insert into DB:
INSERT IGNORE INTO `api_tokens` (`name`, `token`, `scope`, `is_active`)
VALUES ('Server Upload Token (Example)', 'REPLACE_WITH_SHA256_HASH_OF_YOUR_TOKEN', 'upload', 0);
-- ^ Note: is_active=0 means this example row is inactive.
--   Set is_active=1 only after replacing the hash with a real one.
-- =============================================================================
