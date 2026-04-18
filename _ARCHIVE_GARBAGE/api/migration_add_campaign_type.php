<?php
require_once 'db_connect.php';

try {
    // Check if column exists
    $stmt = $pdo->query("SHOW COLUMNS FROM campaigns LIKE 'type'");
    if ($stmt->rowCount() == 0) {
        $pdo->exec("ALTER TABLE campaigns ADD COLUMN type VARCHAR(50) DEFAULT 'email' AFTER name");
        echo "Column 'type' added successfully.\n";
    } else {
        echo "Column 'type' already exists.\n";
    }
    // Check if column 'config' exists
    $stmt = $pdo->query("SHOW COLUMNS FROM campaigns LIKE 'config'");
    if ($stmt->rowCount() == 0) {
        $pdo->exec("ALTER TABLE campaigns ADD COLUMN config JSON DEFAULT NULL AFTER type");
        echo "Column 'config' added successfully.\n";
    } else {
        echo "Column 'config' already exists.\n";
    }
} catch (PDOException $e) {
    echo "Error: " . $e->getMessage() . "\n";
}
