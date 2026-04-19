<?php
/**
 * Meta DB Schema v2 - Optimization & New Features
 * Adds Lead Score, Journey Tracking, and Notes
 */

require_once 'db_connect.php';

header("Content-Type: text/plain");

echo "==================================================\n";
echo "   META MESSENGER SCHEMA UPDATE V2\n";
echo "==================================================\n\n";

$queries = [
    // 1. Add fields to meta_subscribers if not exist
    "ALTER TABLE `meta_subscribers` 
     ADD COLUMN IF NOT EXISTS `lead_score` INT DEFAULT 0,
     ADD COLUMN IF NOT EXISTS `notes` TEXT DEFAULT NULL,
     ADD COLUMN IF NOT EXISTS `first_name` VARCHAR(100) DEFAULT NULL,
     ADD COLUMN IF NOT EXISTS `last_name` VARCHAR(100) DEFAULT NULL,
     ADD COLUMN IF NOT EXISTS `profile_pic` TEXT DEFAULT NULL,
     ADD COLUMN IF NOT EXISTS `token_expires_at` BIGINT DEFAULT NULL", // Ensure these are present from previous manual migration

    // 2. Create Customer Journey Table (Optimized for large scale events)
    "CREATE TABLE IF NOT EXISTS `meta_customer_journey` (
      `id` bigint UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      `page_id` varchar(100) NOT NULL,
      `psid` varchar(100) NOT NULL,
      `event_type` enum('message_sent','message_received','postback','read','delivery','regex_matched','tag_added','form_submit') NOT NULL,
      `event_name` varchar(255) DEFAULT NULL,
      `event_data` json DEFAULT NULL,
      `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
      INDEX `idx_page_psid` (`page_id`, `psid`),
      INDEX `idx_event_type` (`event_type`),
      INDEX `idx_created_at` (`created_at`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci"
];

foreach ($queries as $index => $query) {
    echo "Executing Query " . ($index + 1) . "... \n";
    try {
        $pdo->exec($query);
        echo "✅ OK\n";
    } catch (PDOException $e) {
        // Ignore "Duplicate column" errors gracefully if simply rerunning
        if (strpos($e->getMessage(), 'Duplicate column') !== false) {
            echo "ℹ️ Column already exists (Skipped)\n";
        } else {
            echo "❌ FAILED: " . $e->getMessage() . "\n";
        }
    }
}

echo "\n--------------------------------------------------\n";
echo "Done.\n";
?>