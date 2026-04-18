<?php
require_once 'db_connect.php';

try {
    $stmt = $pdo->query("SHOW COLUMNS FROM zalo_subscriber_activity LIKE 'zalo_msg_id'");
    if (!$stmt->fetch()) {
        $pdo->exec("ALTER TABLE zalo_subscriber_activity ADD COLUMN zalo_msg_id VARCHAR(100) DEFAULT NULL AFTER reference_name");
        $pdo->exec("ALTER TABLE zalo_subscriber_activity ADD INDEX idx_zalo_msg_id (zalo_msg_id)");
        echo "Column 'zalo_msg_id' added to 'zalo_subscriber_activity'.\n";
    } else {
        echo "Column 'zalo_msg_id' already exists.\n";
    }
} catch (Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
}
