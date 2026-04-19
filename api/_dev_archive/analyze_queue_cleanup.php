<?php
header('Content-Type: text/plain; charset=utf-8');
require_once 'db_connect.php';

echo "QUEUE JOBS CLEANUP ANALYSIS\n";
echo "===========================\n\n";

try {
    // 1. Analyze stuck jobs
    echo "Stuck Jobs Analysis (processing >24h):\n";
    $stmt = $pdo->query("
        SELECT queue, COUNT(*) as count, MIN(created_at) as oldest, MAX(created_at) as newest
        FROM queue_jobs 
        WHERE status = 'processing' AND created_at < DATE_SUB(NOW(), INTERVAL 24 HOUR)
        GROUP BY queue
    ");
    while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
        echo " - Queue '{$row['queue']}': {$row['count']} jobs (oldest: {$row['oldest']})\n";
    }

    echo "\n";

    // 2. Sample stuck job payloads
    echo "Sample Stuck Job Payloads:\n";
    $stmt = $pdo->query("
        SELECT id, queue, payload, created_at, reserved_at, attempts 
        FROM queue_jobs 
        WHERE status = 'processing' AND created_at < DATE_SUB(NOW(), INTERVAL 24 HOUR)
        LIMIT 5
    ");
    while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
        echo " - ID: {$row['id']} | Queue: {$row['queue']} | Attempts: {$row['attempts']}\n";
        echo "   Created: {$row['created_at']} | Reserved: {$row['reserved_at']}\n";
        echo "   Payload: " . substr($row['payload'], 0, 150) . "...\n\n";
    }

    // 3. Old completed jobs
    echo "Old Completed Jobs (>7 days):\n";
    $stmt = $pdo->query("
        SELECT queue, COUNT(*) as count 
        FROM queue_jobs 
        WHERE status = 'completed' AND finished_at < DATE_SUB(NOW(), INTERVAL 7 DAY)
        GROUP BY queue
    ");
    $total = 0;
    while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
        echo " - Queue '{$row['queue']}': {$row['count']} jobs\n";
        $total += $row['count'];
    }
    echo "Total old completed: $total\n\n";

    // 4. Failed jobs
    echo "Failed Jobs:\n";
    $stmt = $pdo->query("
        SELECT queue, COUNT(*) as count, MIN(created_at) as oldest
        FROM queue_jobs 
        WHERE status = 'failed'
        GROUP BY queue
    ");
    while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
        echo " - Queue '{$row['queue']}': {$row['count']} jobs (oldest: {$row['oldest']})\n";
    }

} catch (Exception $e) {
    echo "Error: " . $e->getMessage();
}
