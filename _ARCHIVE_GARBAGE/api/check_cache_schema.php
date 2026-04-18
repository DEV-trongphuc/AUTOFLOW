<?php
header('Content-Type: text/plain; charset=utf-8');
require_once 'db_connect.php';

echo "SCHEMA CHECK: tracking_unique_cache\n";
echo "===================================\n\n";

try {
    $stmt = $pdo->query("DESCRIBE tracking_unique_cache");
    while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
        echo " - {$row['Field']} ({$row['Type']})\n";
    }
} catch (Exception $e) {
    echo "Error: " . $e->getMessage();
}
