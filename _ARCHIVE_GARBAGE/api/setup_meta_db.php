<?php
/**
 * META MESSENGER DATABASE SETUP
 * Single file installer
 */

require_once 'db_connect.php';

header("Content-Type: text/plain");

echo "==================================================\n";
echo "   META MESSENGER SYSTEM - DATABASE SETUP\n";
echo "==================================================\n\n";

// DEFINE SQL QUERIES DIRECTLY
$queries = [
  // 1. Meta App Configs
  "CREATE TABLE IF NOT EXISTS `meta_app_configs` (
      `id` varchar(64) NOT NULL,
      `page_name` varchar(255) NOT NULL,
      `page_id` varchar(100) NOT NULL,
      `page_access_token` text NOT NULL,
      `app_secret` varchar(255) DEFAULT NULL,
      `verify_token` varchar(255) DEFAULT NULL,
      `avatar_url` text,
      `status` enum('active','inactive','disconnected') DEFAULT 'active',
      `mode` enum('live','dev') DEFAULT 'live',
      `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
      `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (`id`),
      UNIQUE KEY `idx_page_id` (`page_id`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",

  // 2. Meta Subscribers
  "CREATE TABLE IF NOT EXISTS `meta_subscribers` (
      `id` varchar(64) NOT NULL,
      `page_id` varchar(100) NOT NULL,
      `psid` varchar(100) NOT NULL,
      `name` varchar(255) DEFAULT NULL,
      `avatar_url` text,
      `profile_link` text,
      `gender` varchar(20) DEFAULT NULL,
      `locale` varchar(20) DEFAULT NULL,
      `timezone` varchar(10) DEFAULT NULL,
      `email` varchar(255) DEFAULT NULL,
      `phone` varchar(50) DEFAULT NULL,
      `tags` json DEFAULT NULL,
      `custom_fields` json DEFAULT NULL,
      `is_subscribed` tinyint(1) DEFAULT 1,
      `last_active_at` datetime DEFAULT NULL,
      `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
      `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (`id`),
      UNIQUE KEY `idx_page_psid` (`page_id`,`psid`),
      INDEX `idx_psid` (`psid`),
      INDEX `idx_last_active` (`last_active_at`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",

  // 3. Meta Conversations (Optimized for List View)
  "CREATE TABLE IF NOT EXISTS `meta_conversations` (
      `id` varchar(64) NOT NULL,
      `page_id` varchar(100) NOT NULL,
      `psid` varchar(100) NOT NULL,
      `last_message_id` varchar(100) DEFAULT NULL,
      `last_message_snippet` text,
      `last_message_time` datetime DEFAULT NULL,
      `unread_count` int DEFAULT 0,
      `status` enum('open','done','spam') DEFAULT 'open',
      `assigned_to` varchar(64) DEFAULT NULL,
      `ai_enabled` tinyint(1) DEFAULT 1,
      `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
      `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (`id`),
      UNIQUE KEY `idx_page_psid` (`page_id`, `psid`),
      INDEX `idx_last_message_time` (`last_message_time`),
      INDEX `idx_status` (`status`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",

  // 4. Meta Message Logs (Detailed History)
  "CREATE TABLE IF NOT EXISTS `meta_message_logs` (
      `id` bigint UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      `mid` varchar(100) DEFAULT NULL,
      `page_id` varchar(100) NOT NULL,
      `psid` varchar(100) NOT NULL,
      `direction` enum('inbound','outbound') NOT NULL,
      `message_type` enum('text','image','video','audio','file','template','fallback') DEFAULT 'text',
      `content` mediumtext,
      `attachments` json DEFAULT NULL,
      `metadata` json DEFAULT NULL,
      `status` enum('sent','delivered','read','failed') DEFAULT 'sent',
      `error_message` text DEFAULT NULL,
      `timestamp` bigint DEFAULT NULL,
      `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY `idx_mid` (`mid`),
      INDEX `idx_conversation` (`page_id`, `psid`),
      INDEX `idx_created_at` (`created_at`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",

  // 5. Meta Automation Scenarios
  "CREATE TABLE IF NOT EXISTS `meta_automation_scenarios` (
      `id` varchar(64) NOT NULL,
      `meta_config_id` varchar(64) NOT NULL,
      `type` enum('welcome','keyword','ai_reply','holiday','default') NOT NULL DEFAULT 'keyword',
      `trigger_text` text,
      `match_type` enum('exact','contains') DEFAULT 'contains',
      `title` varchar(255) DEFAULT NULL,
      `content` text,
      `message_type` enum('text','image') DEFAULT 'text',
      `image_url` text,
      `buttons` json DEFAULT NULL,
      `status` enum('active','inactive') DEFAULT 'active',
      `ai_chatbot_id` varchar(64) DEFAULT NULL,
      `schedule_type` enum('full','custom') DEFAULT 'full',
      `start_time` time DEFAULT '00:00:00',
      `end_time` time DEFAULT '23:59:59',
      `active_days` varchar(50) DEFAULT '0,1,2,3,4,5,6',
      `priority_override` int DEFAULT 0,
      `holiday_start_at` datetime DEFAULT NULL,
      `holiday_end_at` datetime DEFAULT NULL,
      `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
      `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (`id`),
      INDEX `idx_meta_config` (`meta_config_id`),
      INDEX `idx_type_status` (`type`, `status`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci"
];

$success = 0;
$errors = 0;

foreach ($queries as $index => $query) {
  echo "Processing Table " . ($index + 1) . "... ";
  try {
    $pdo->exec($query);
    echo "✅ OK\n";
    $success++;
  } catch (PDOException $e) {
    echo "❌ FAILED\n";
    echo "   Error: " . $e->getMessage() . "\n";
    $errors++;
  }
}

echo "\n--------------------------------------------------\n";
if ($errors == 0) {
  echo "✅ ALL TABLES CREATED SUCCESSFULLY.\n";
} else {
  echo "⚠️ Setup completed with $errors errors.\n";
}
?>