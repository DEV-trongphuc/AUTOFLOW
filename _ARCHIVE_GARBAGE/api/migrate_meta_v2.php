<?php
require_once 'db_connect.php';

header("Content-Type: text/plain");

echo "Starting Meta V2 Migration...\n";

$queries = [
    // 1. Update meta_subscribers
    "ALTER TABLE meta_subscribers ADD COLUMN IF NOT EXISTS first_name VARCHAR(255) DEFAULT NULL AFTER psid",
    "ALTER TABLE meta_subscribers ADD COLUMN IF NOT EXISTS last_name VARCHAR(255) DEFAULT NULL AFTER first_name",
    "ALTER TABLE meta_subscribers ADD COLUMN IF NOT EXISTS profile_pic TEXT DEFAULT NULL AFTER last_name",
    "ALTER TABLE meta_subscribers ADD COLUMN IF NOT EXISTS lead_score INT DEFAULT 0 AFTER phone",
    "ALTER TABLE meta_subscribers ADD COLUMN IF NOT EXISTS notes TEXT DEFAULT NULL AFTER lead_score",

    // 2. Create meta_customer_journey
    "CREATE TABLE IF NOT EXISTS `meta_customer_journey` (
      `id` bigint UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      `page_id` varchar(100) NOT NULL,
      `psid` varchar(100) NOT NULL,
      `event_type` varchar(50) NOT NULL,
      `event_name` varchar(255) DEFAULT NULL,
      `event_data` json DEFAULT NULL,
      `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
      INDEX `idx_psid` (`psid`),
      INDEX `idx_page_psid` (`page_id`, `psid`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",

    // 3. Ensure meta_message_logs has attachments
    "ALTER TABLE meta_message_logs ADD COLUMN IF NOT EXISTS attachments json DEFAULT NULL AFTER content"
];

foreach ($queries as $sql) {
    echo "Executing: $sql ... ";
    try {
        $pdo->exec($sql);
        echo "✅\n";
    } catch (Exception $e) {
        echo "❌ " . $e->getMessage() . "\n";
    }
}

echo "\nMigration Finished!\n";
?>