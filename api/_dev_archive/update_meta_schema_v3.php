<?php
require_once 'db_connect.php';

try {
    // Check if meta_psid column exists in subscribers table
    $stmt = $pdo->query("SHOW COLUMNS FROM subscribers LIKE 'meta_psid'");
    if (!$stmt->fetch()) {
        $pdo->exec("ALTER TABLE subscribers ADD COLUMN meta_psid VARCHAR(100) DEFAULT NULL AFTER zalo_user_id");
        $pdo->exec("ALTER TABLE subscribers ADD INDEX idx_meta_psid (meta_psid)");
        echo "Added meta_psid column to subscribers table.\n";
    } else {
        echo "meta_psid column already exists in subscribers table.\n";
    }

    // Also check if meta_subscribers has all needed columns (it should as per setup_meta_db.sql)
    // But let's check meta_customer_journey just in case
    $stmt = $pdo->query("SHOW TABLES LIKE 'meta_customer_journey'");
    if (!$stmt->fetch()) {
        $pdo->exec("CREATE TABLE IF NOT EXISTS `meta_customer_journey` (
          `id` bigint(20) UNSIGNED AUTO_INCREMENT PRIMARY KEY,
          `page_id` varchar(100) NOT NULL,
          `psid` varchar(100) NOT NULL,
          `event_type` varchar(50) NOT NULL,
          `event_name` varchar(255) NOT NULL,
          `event_data` json DEFAULT NULL,
          `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
          INDEX `idx_psid` (`psid`),
          INDEX `idx_page_psid` (`page_id`, `psid`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;");
        echo "Created meta_customer_journey table.\n";
    }

} catch (Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
}
?>