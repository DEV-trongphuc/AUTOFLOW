<?php
require_once 'db_connect.php';

try {
    $pdo->exec("ALTER TABLE meta_automation_scenarios MODIFY COLUMN message_type ENUM('text', 'image', 'video') DEFAULT 'text'");
    echo "Modified message_type enum.\n";

    // Check if attachment_id exists
    $stmt = $pdo->query("SHOW COLUMNS FROM meta_automation_scenarios LIKE 'attachment_id'");
    if (!$stmt->fetch()) {
        $pdo->exec("ALTER TABLE meta_automation_scenarios ADD COLUMN attachment_id VARCHAR(255) DEFAULT NULL AFTER image_url");
        echo "Added attachment_id column.\n";
    }
} catch (Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
}
?>