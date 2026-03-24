<?php
header('Content-Type: text/plain; charset=utf-8');
require_once 'db_connect.php';

echo "QUEUE JOBS SCHEMA CHECK\n";
echo "=======================\n\n";

try {
    $stmt = $pdo->query("DESCRIBE queue_jobs");
    while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
        echo " - {$row['Field']} ({$row['Type']})\n";
    }

    echo "\n\nSample Stuck Jobs (without worker_type):\n";
    $stmt = $pdo->query("SELECT id, type, status, created_at, updated_at FROM queue_jobs WHERE status = 'processing' AND created_at < DATE_SUB(NOW(), INTERVAL 24 HOUR) LIMIT 10");
    while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
        echo " - ID: {$row['id']} | Type: {$row['type']} | Created: {$row['created_at']} | Updated: {$row['updated_at']}\n";
    }

} catch (Exception $e) {
    echo "Error: " . $e->getMessage();
}
