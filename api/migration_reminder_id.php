<?php
// api/migration_reminder_id.php
// Add reminder_id column to subscriber_activity table if not exists

require_once __DIR__ . '/db_connect.php';

try {
    $pdo->exec("
        ALTER TABLE subscriber_activity 
        ADD COLUMN reminder_id INT(11) DEFAULT NULL AFTER campaign_id,
        ADD INDEX idx_reminder_activity (reminder_id, created_at);
    ");
    echo "Successfully added reminder_id column to subscriber_activity table.";
} catch (PDOException $e) {
    if (strpos($e->getMessage(), "Duplicate column name") !== false) {
        echo "Column reminder_id already exists.";
    } else {
        echo "Error: " . $e->getMessage();
    }
}
?>
