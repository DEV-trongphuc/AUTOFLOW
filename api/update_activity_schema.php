<?php
require_once 'db_connect.php';
try {
    $pdo->exec("ALTER TABLE subscriber_activity MODIFY details TEXT");
    echo "Database schema updated successfully.\n";
} catch (Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
}
