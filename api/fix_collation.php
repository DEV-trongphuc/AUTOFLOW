<?php
require_once 'db_connect.php';

try {
    echo "<h1>Fixing Database Collation...</h1>";

    // 1. Drop FK
    try {
        $pdo->exec("ALTER TABLE `zalo_broadcast_tracking` DROP FOREIGN KEY `fk_tracking_broadcast`");
        echo "Dropped Foreign Key fk_tracking_broadcast.<br>";
    } catch (Exception $e) {
        echo "FK drop failed (might not exist): " . $e->getMessage() . "<br>";
    }

    // 2. Convert Tables
    $pdo->exec("ALTER TABLE `zalo_broadcasts` CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci");
    echo "Converted zalo_broadcasts to utf8mb4_unicode_ci.<br>";

    $pdo->exec("ALTER TABLE `zalo_broadcast_tracking` CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci");
    echo "Converted zalo_broadcast_tracking to utf8mb4_unicode_ci.<br>";

    // 3. Add FK Back
    // Check if constraint exists or just try adding
    try {
        $pdo->exec("ALTER TABLE `zalo_broadcast_tracking` ADD CONSTRAINT `fk_tracking_broadcast` FOREIGN KEY (`broadcast_id`) REFERENCES `zalo_broadcasts` (`id`) ON DELETE CASCADE");
        echo "Restored Foreign Key fk_tracking_broadcast.<br>";
    } catch (Exception $e) {
        echo "FK restore failed: " . $e->getMessage() . "<br>";
    }

    echo "<h3 style='color:green'>Done!</h3>";

} catch (Exception $e) {
    echo "<h3 style='color:red'>Error: " . $e->getMessage() . "</h3>";
}
