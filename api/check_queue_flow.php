<?php
// api/check_queue_flow.php
require_once 'db_connect.php';

echo "--- QUEUE JOBS FOR FLOWS ---\n";
try {
    $stmt = $pdo->query("SELECT type, status, COUNT(*) as total FROM queue_jobs GROUP BY type, status");
    foreach ($stmt->fetchAll() as $row) {
        echo "Type: {$row['type']} | Status: {$row['status']} | Total: {$row['total']}\n";
    }

    echo "\n--- PENDING FLOW JOBS ---\n";
    $stmt = $pdo->query("SELECT * FROM queue_jobs WHERE type IN ('flow', 'flows', 'flow_batch') AND status = 'pending' LIMIT 5");
    foreach ($stmt->fetchAll() as $row) {
        print_r($row);
    }
} catch (Exception $e) {
    echo "ERROR: " . $e->getMessage() . "\n";
}
