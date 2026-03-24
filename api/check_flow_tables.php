<?php
require_once 'db_connect.php';

echo "=== CHECKING FLOW-RELATED TABLES ===\n\n";

// Get all tables in database
$stmt = $pdo->query("SHOW TABLES");
$tables = $stmt->fetchAll(PDO::FETCH_COLUMN);

echo "Looking for flow-related tables:\n";
foreach ($tables as $table) {
    if (stripos($table, 'flow') !== false || stripos($table, 'subscriber') !== false) {
        echo "  - $table\n";
    }
}

echo "\n=== DONE ===\n";
