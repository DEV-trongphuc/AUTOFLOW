<?php
/**
 * Migration: Add is_follower to zalo_subscribers
 */
require_once 'db_connect.php';

try {
    $pdo->exec("ALTER TABLE zalo_subscribers ADD COLUMN IF NOT EXISTS is_follower TINYINT(1) DEFAULT 0 AFTER status");
    $pdo->exec("ALTER TABLE zalo_subscriber_activity ADD COLUMN IF NOT EXISTS reference_name VARCHAR(255) DEFAULT NULL AFTER reference_id");
    echo "Migration completed: missing columns added successfully.";
} catch (PDOException $e) {
    echo "Migration skipped or failed: " . $e->getMessage();
}
