<?php
require_once 'db_connect.php';

echo "--- Adding 'ai_paused_until' column to subscribers tables ---\n";

function addColumnIfNotExists($pdo, $table, $column, $definition)
{
    try {
        $stmt = $pdo->query("SHOW COLUMNS FROM $table LIKE '$column'");
        if ($stmt->fetch()) {
            echo "Column '$column' already exists in '$table'. Skipping.\n";
        } else {
            $pdo->exec("ALTER TABLE $table ADD COLUMN $column $definition");
            echo "✅ Added column '$column' to '$table'.\n";
        }
    } catch (PDOException $e) {
        echo "❌ Error updating '$table': " . $e->getMessage() . "\n";
    }
}

// 1. Update meta_subscribers
addColumnIfNotExists($pdo, 'meta_subscribers', 'ai_paused_until', 'DATETIME NULL DEFAULT NULL');

// 2. Update zalo_subscribers (if table exists)
try {
    $stmt = $pdo->query("SHOW TABLES LIKE 'zalo_subscribers'");
    if ($stmt->fetch()) {
        addColumnIfNotExists($pdo, 'zalo_subscribers', 'ai_paused_until', 'DATETIME NULL DEFAULT NULL');
    } else {
        echo "Table 'zalo_subscribers' does not exist. Skipping.\n";
    }
} catch (PDOException $e) {
    echo "Error checking table zalo_subscribers: " . $e->getMessage() . "\n";
}

// 3. Update main subscribers table (optional, but good for unified view)
// addColumnIfNotExists($pdo, 'subscribers', 'ai_paused_until', 'DATETIME NULL DEFAULT NULL');

echo "\nDone.\n";
?>