<?php
require_once 'db_connect.php';

try {
    // Add pkce_verifier column if it doesn't exist
    $pdo->exec("ALTER TABLE zalo_oa_configs ADD COLUMN pkce_verifier VARCHAR(255) NULL AFTER app_secret");
    echo "Successfully added pkce_verifier column to zalo_oa_configs table.<br>";
} catch (PDOException $e) {
    // Ignore duplicate column
}

try {
    $pdo->exec("ALTER TABLE zalo_broadcasts ADD COLUMN image_url TEXT NULL AFTER content");
    echo "Successfully added image_url column to zalo_broadcasts table.<br>";
} catch (PDOException $e) {
    // Ignore
}
