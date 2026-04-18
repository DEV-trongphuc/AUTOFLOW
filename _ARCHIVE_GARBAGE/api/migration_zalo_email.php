<?php
/**
 * Migration: Add Manual Email field to Zalo Subscribers
 */
require_once 'db_connect.php';

// SQL Command:
// ALTER TABLE zalo_subscribers ADD COLUMN manual_email VARCHAR(255) DEFAULT NULL;

try {
    $pdo->exec("ALTER TABLE zalo_subscribers ADD COLUMN IF NOT EXISTS manual_email VARCHAR(255) DEFAULT NULL;");
    echo "Migration Success: Field 'manual_email' added.";
} catch (PDOException $e) {
    echo "Migration Info: " . $e->getMessage();
}
