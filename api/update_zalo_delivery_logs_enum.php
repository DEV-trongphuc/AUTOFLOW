<?php
require_once 'db_connect.php';

try {
    // Check current enum
    $stmt = $pdo->query("DESCRIBE zalo_delivery_logs status");
    $row = $stmt->fetch(PDO::FETCH_ASSOC);
    $type = $row['Type'];

    echo "Current Type: $type\n";

    if (strpos($type, "'delivered'") === false || strpos($type, "'seen'") === false) {
        echo "Updating enum status...\n";
        $sql = "ALTER TABLE zalo_delivery_logs MODIFY COLUMN status ENUM('pending','sent','failed','invalid_phone','quota_exceeded','time_restricted','delivered','seen') DEFAULT 'pending'";
        $pdo->exec($sql);
        echo "Table updated successfully.\n";
    } else {
        echo "Enum already contains delivered and seen.\n";
    }
} catch (Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
}
?>