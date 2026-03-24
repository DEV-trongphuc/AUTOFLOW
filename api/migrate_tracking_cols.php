<?php
require_once 'db_connect.php';

try {
    // 1. Ensure columns exist
    $cols = [
        'last_os' => "VARCHAR(50) DEFAULT NULL",
        'last_browser' => "VARCHAR(50) DEFAULT NULL",
        'last_device' => "VARCHAR(50) DEFAULT NULL",
        'last_city' => "VARCHAR(100) DEFAULT NULL",
        'last_country' => "VARCHAR(100) DEFAULT NULL",
        'last_ip' => "VARCHAR(45) DEFAULT NULL",
        'zalo_user_id' => "VARCHAR(100) DEFAULT NULL"
    ];

    foreach ($cols as $col => $def) {
        try {
            $pdo->exec("ALTER TABLE subscribers ADD COLUMN $col $def");
        } catch (Exception $e) {
        }
    }

    // 2. Backfill from city/country if null
    $pdo->exec("UPDATE subscribers SET last_city = city WHERE last_city IS NULL AND city IS NOT NULL AND city != ''");
    $pdo->exec("UPDATE subscribers SET last_country = country WHERE last_country IS NULL AND country IS NOT NULL AND country != ''");

    echo "Migration and Backfill successful.";
} catch (Exception $e) {
    echo "Error: " . $e->getMessage();
}
