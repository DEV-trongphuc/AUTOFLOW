<?php
// api/migrate_web_visitors.php - Add missing columns for visitor identification
require_once 'db_connect.php';

header('Content-Type: text/plain; charset=utf-8');
echo "=== WEB VISITORS TABLE MIGRATION ===\n\n";

try {
    // Check and add subscriber_id column first
    $stmt = $pdo->query("SHOW COLUMNS FROM web_visitors LIKE 'subscriber_id'");
    if ($stmt->rowCount() == 0) {
        echo "Adding column: subscriber_id... ";
        $pdo->exec("ALTER TABLE web_visitors ADD COLUMN subscriber_id VARCHAR(255) NULL AFTER property_id");
        $pdo->exec("ALTER TABLE web_visitors ADD INDEX idx_subscriber_id (subscriber_id)");
        echo "✓ DONE\n";
    } else {
        echo "Column subscriber_id already exists ✓\n";
    }

    // Check and add zalo_user_id column
    $stmt = $pdo->query("SHOW COLUMNS FROM web_visitors LIKE 'zalo_user_id'");
    if ($stmt->rowCount() == 0) {
        echo "Adding column: zalo_user_id... ";
        $pdo->exec("ALTER TABLE web_visitors ADD COLUMN zalo_user_id VARCHAR(255) NULL AFTER subscriber_id");
        $pdo->exec("ALTER TABLE web_visitors ADD INDEX idx_zalo_user_id (zalo_user_id)");
        echo "✓ DONE\n";
    } else {
        echo "Column zalo_user_id already exists ✓\n";
    }

    // Check and add email column
    $stmt = $pdo->query("SHOW COLUMNS FROM web_visitors LIKE 'email'");
    if ($stmt->rowCount() == 0) {
        echo "Adding column: email... ";
        $pdo->exec("ALTER TABLE web_visitors ADD COLUMN email VARCHAR(255) NULL AFTER zalo_user_id");
        $pdo->exec("ALTER TABLE web_visitors ADD INDEX idx_email (email)");
        echo "✓ DONE\n";
    } else {
        echo "Column email already exists ✓\n";
    }

    // Check and add phone column
    $stmt = $pdo->query("SHOW COLUMNS FROM web_visitors LIKE 'phone'");
    if ($stmt->rowCount() == 0) {
        echo "Adding column: phone... ";
        $pdo->exec("ALTER TABLE web_visitors ADD COLUMN phone VARCHAR(50) NULL AFTER email");
        $pdo->exec("ALTER TABLE web_visitors ADD INDEX idx_phone (phone)");
        echo "✓ DONE\n";
    } else {
        echo "Column phone already exists ✓\n";
    }

    echo "\n=== MIGRATION COMPLETE ===\n";
    echo "All required columns are now present!\n\n";

    // Show final schema
    echo "FINAL SCHEMA:\n";
    $stmt = $pdo->query("DESCRIBE web_visitors");
    $columns = $stmt->fetchAll(PDO::FETCH_ASSOC);
    foreach ($columns as $col) {
        echo "  - {$col['Field']} ({$col['Type']}) {$col['Null']}\n";
    }

} catch (Exception $e) {
    echo "\n[ERROR] " . $e->getMessage() . "\n";
}
?>