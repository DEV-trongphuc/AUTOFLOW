<?php
require_once 'db_connect.php';

try {
    // 1. Add token_expires_at to meta_app_configs
    $pdo->exec("ALTER TABLE meta_app_configs ADD COLUMN IF NOT EXISTS token_expires_at DATETIME DEFAULT NULL");
    echo "Added token_expires_at to meta_app_configs\n";

    // 2. Add extra fields to meta_subscribers if missing (just in case setup_meta_db.sql wasn't fully run or old version)
    $pdo->exec("ALTER TABLE meta_subscribers ADD COLUMN IF NOT EXISTS first_name VARCHAR(100) DEFAULT NULL");
    $pdo->exec("ALTER TABLE meta_subscribers ADD COLUMN IF NOT EXISTS last_name VARCHAR(100) DEFAULT NULL");
    $pdo->exec("ALTER TABLE meta_subscribers ADD COLUMN IF NOT EXISTS profile_pic TEXT DEFAULT NULL");
    $pdo->exec("ALTER TABLE meta_subscribers ADD COLUMN IF NOT EXISTS locale VARCHAR(20) DEFAULT NULL");
    $pdo->exec("ALTER TABLE meta_subscribers ADD COLUMN IF NOT EXISTS timezone VARCHAR(10) DEFAULT NULL");
    $pdo->exec("ALTER TABLE meta_subscribers ADD COLUMN IF NOT EXISTS gender VARCHAR(20) DEFAULT NULL");
    echo "Added profile fields to meta_subscribers\n";

    echo "Migration completed successfully!";
} catch (PDOException $e) {
    echo "Error: " . $e->getMessage();
}
?>