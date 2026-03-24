<?php
require_once 'db_connect.php';
try {
    // MySQL 5.7+ workarounds since ADD COLUMN IF NOT EXISTS requires MariaDB or MySQL 8+
    $commands = [
        "ALTER TABLE purchase_events ADD COLUMN notification_enabled BOOLEAN DEFAULT FALSE",
        "ALTER TABLE purchase_events ADD COLUMN notification_emails TEXT",
        "ALTER TABLE purchase_events ADD COLUMN notification_subject VARCHAR(255)",
        "ALTER TABLE custom_events ADD COLUMN notification_enabled BOOLEAN DEFAULT FALSE",
        "ALTER TABLE custom_events ADD COLUMN notification_emails TEXT",
        "ALTER TABLE custom_events ADD COLUMN notification_subject VARCHAR(255)",
        "ALTER TABLE forms ADD COLUMN notification_enabled BOOLEAN DEFAULT FALSE",
        "ALTER TABLE forms ADD COLUMN notification_emails TEXT",
        "ALTER TABLE forms ADD COLUMN notification_subject VARCHAR(255)"
    ];

    foreach ($commands as $cmd) {
        try {
            $pdo->exec($cmd);
        } catch (PDOException $e) {
            if (strpos($e->getMessage(), 'Duplicate column name') === false) {
                throw $e;
            }
        }
    }

    echo "Migration successful - Added notification columns to purchase_events and custom_events.";
} catch (Exception $e) {
    if (strpos($e->getMessage(), 'Duplicate column name') !== false) {
        echo "Already migrated.";
    } else {
        echo "Migration failed: " . $e->getMessage();
    }
}
