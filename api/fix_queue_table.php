<?php
// api/fix_queue_table.php
require_once 'db_connect.php';

try {
    // Check current type
    $stmt = $pdo->query("DESCRIBE campaign_queue campaign_id");
    $col = $stmt->fetch();
    echo "Current campaign_id type: " . $col['Type'] . "\n";

    if (strpos(strtolower($col['Type']), 'int') !== false) {
        echo "Fixing campaign_id type to char(36)...\n";
        $pdo->exec("ALTER TABLE campaign_queue MODIFY campaign_id char(36) NOT NULL");
        echo "Table altered successfully.\n";
    } else {
        echo "Table already has correct type or campaign_queue does not exist.\n";
    }
} catch (Exception $e) {
    echo "Error: " . $e->getMessage();
}
