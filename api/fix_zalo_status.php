<?php
require_once 'db_connect.php';

try {
    // 1. Update ENUM for zalo_subscribers
    $pdo->exec("ALTER TABLE zalo_subscribers MODIFY COLUMN status VARCHAR(20) DEFAULT 'active'");

    // 2. Refresh updated_at on zalo_subscribers (if needed) - keep it consistent with main subscribers
    // Already has it from migration_zalo_audience.php

    echo "Zalo Status Migration completed successfully.\n";
} catch (Exception $e) {
    echo "Migration failed: " . $e->getMessage() . "\n";
}
