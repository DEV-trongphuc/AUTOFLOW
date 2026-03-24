<?php
/**
 * Add ai_paused_until column to meta_subscribers table
 */
require_once 'db_connect.php';

try {
    // Check if column exists
    $stmt = $pdo->query("SHOW COLUMNS FROM meta_subscribers LIKE 'ai_paused_until'");
    $exists = $stmt->fetch();

    if (!$exists) {
        echo "Adding ai_paused_until column...\n";
        $pdo->exec("ALTER TABLE meta_subscribers ADD COLUMN ai_paused_until DATETIME NULL DEFAULT NULL AFTER last_active_at");
        echo "✓ Column added successfully!\n";
    } else {
        echo "✓ Column already exists\n";
    }

    echo "\nCurrent meta_subscribers structure:\n";
    $stmt = $pdo->query("DESCRIBE meta_subscribers");
    while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
        echo "- {$row['Field']} ({$row['Type']}) {$row['Null']} {$row['Default']}\n";
    }

} catch (Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
}
