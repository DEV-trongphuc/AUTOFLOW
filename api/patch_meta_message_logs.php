<?php
require_once 'db_connect.php';

try {
    // Check if column exists first
    $stmt = $pdo->query("SHOW COLUMNS FROM meta_message_logs LIKE 'updated_at'");
    if ($stmt->rowCount() == 0) {
        $sql = "ALTER TABLE meta_message_logs ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP;";
        $pdo->exec($sql);
        echo "SUCCESS: Added 'updated_at' column to 'meta_message_logs' table.\n";
    } else {
        echo "INFO: 'updated_at' column already exists in 'meta_message_logs' table.\n";
    }
} catch (PDOException $e) {
    if (strpos($e->getMessage(), 'Duplicate column name') !== false) {
        echo "INFO: 'updated_at' column already exists (caught exception).\n";
    } else {
        echo "ERROR: " . $e->getMessage() . "\n";
    }
}
