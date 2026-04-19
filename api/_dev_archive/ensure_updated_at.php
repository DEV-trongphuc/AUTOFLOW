<?php
// api/ensure_subscribers_updated_at.sql
// Let's use a PHP script to run arbitrary SQL since I can't run mysql client directly

require_once 'db_connect.php';

try {
    // Check if updated_at exists in subscribers
    $stmt = $pdo->query("SHOW COLUMNS FROM subscribers LIKE 'updated_at'");
    $exists = $stmt->fetch();

    if (!$exists) {
        $pdo->exec("ALTER TABLE subscribers ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP");
        echo "Added updated_at to subscribers table\n";
    } else {
        echo "updated_at already exists in subscribers table\n";
    }

    // Also ensure all existing rows have a value if it was just added
    $pdo->exec("UPDATE subscribers SET updated_at = joined_at WHERE updated_at IS NULL");

} catch (Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
}
?>