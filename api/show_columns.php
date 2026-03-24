<?php
require_once 'db_connect.php';
header('Content-Type: text/plain; charset=utf-8');

echo "=== SUBSCRIBERS TABLE STRUCTURE ===\n\n";

$stmt = $pdo->query("SHOW COLUMNS FROM subscribers");
$columns = $stmt->fetchAll();

echo "Available columns:\n";
foreach ($columns as $col) {
    echo "  - {$col['Field']} ({$col['Type']}) " . ($col['Null'] === 'YES' ? 'NULL' : 'NOT NULL') . "\n";
}

echo "\n=== END ===\n";
