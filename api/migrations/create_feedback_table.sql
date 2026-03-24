-- =====================================================
-- ai_feedback table: stores user feedback with optional screenshot
-- Run once to initialize the feedback system
-- =====================================================

CREATE TABLE IF NOT EXISTS `ai_feedback` (
    `id`              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `org_user_id`     INT UNSIGNED NULL COMMENT 'Who submitted (NULL = anonymous/guest)',
    `category_id`     VARCHAR(64) NULL COMMENT 'Which AI Space category',
    `property_id`     VARCHAR(64) NULL COMMENT 'Which bot/chatbot',
    `conversation_id` VARCHAR(128) NULL COMMENT 'Conversation context',
    `type`            ENUM('bug', 'suggestion', 'praise', 'other') NOT NULL DEFAULT 'other',
    `title`           VARCHAR(255) NOT NULL,
    `description`     TEXT NOT NULL,
    `screenshot_url`  VARCHAR(512) NULL COMMENT 'Uploaded screenshot path',
    `page_url`        VARCHAR(512) NULL COMMENT 'URL where feedback was submitted',
    `user_agent`      VARCHAR(512) NULL,
    `status`          ENUM('new', 'in_review', 'resolved', 'closed') NOT NULL DEFAULT 'new',
    `admin_note`      TEXT NULL COMMENT 'Internal admin notes',
    `created_at`      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at`      TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX `idx_status` (`status`),
    INDEX `idx_type` (`type`),
    INDEX `idx_category` (`category_id`),
    INDEX `idx_org_user` (`org_user_id`),
    INDEX `idx_created` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
