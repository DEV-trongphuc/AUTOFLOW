<?php
require_once 'db_connect.php';

$commands = [
    // 1. Add device_type column to stats table
    "ALTER TABLE `web_daily_stats` ADD COLUMN `device_type` enum('mobile','desktop','tablet','bot') DEFAULT 'desktop' AFTER `url_hash`",

    // 2. Update Primary Key to include device_type
    "ALTER TABLE `web_daily_stats` DROP PRIMARY KEY, ADD PRIMARY KEY (`date`, `property_id`, `url_hash`, `device_type`)"
];

foreach ($commands as $sql) {
    try {
        $pdo->exec($sql);
        echo "Success: $sql\n";
    } catch (Exception $e) {
        echo "Error: " . $e->getMessage() . "\n";
    }
}
