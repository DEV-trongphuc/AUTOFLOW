<?php
header('Content-Type: text/plain; charset=utf-8');
require_once 'db_connect.php';

echo "QUEUE JOBS AUDIT\n";
echo "================\n\n";

try {
    // 1. Overall Statistics
    echo "Overall Queue Statistics:\n";
    $stmt = $pdo->query("SELECT status, COUNT(*) as count FROM queue_jobs GROUP BY status");
    while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
        echo " - {$row['status']}: {$row['count']}\n";
    }

    echo "\n";

    // 2. Old Processed Jobs (candidates for deletion)
    $stmt = $pdo->query("SELECT COUNT(*) FROM queue_jobs WHERE status = 'processed' AND created_at < DATE_SUB(NOW(), INTERVAL 7 DAY)");
    $oldProcessed = $stmt->fetchColumn();
    echo "Old Processed Jobs (>7 days): $oldProcessed\n";

    // 3. Old Failed Jobs
    $stmt = $pdo->query("SELECT COUNT(*) FROM queue_jobs WHERE status = 'failed' AND created_at < DATE_SUB(NOW(), INTERVAL 7 DAY)");
    $oldFailed = $stmt->fetchColumn();
    echo "Old Failed Jobs (>7 days): $oldFailed\n";

    // 4. Stuck Jobs (pending/processing for >24 hours)
    $stmt = $pdo->query("SELECT COUNT(*) FROM queue_jobs WHERE status IN ('pending', 'processing') AND created_at < DATE_SUB(NOW(), INTERVAL 24 HOUR)");
    $stuck = $stmt->fetchColumn();
    echo "Stuck Jobs (pending/processing >24h): $stuck\n";

    echo "\n";

    // 5. Sample of stuck jobs
    if ($stuck > 0) {
        echo "Sample Stuck Jobs:\n";
        $stmt = $pdo->query("SELECT id, worker_type, status, created_at, payload FROM queue_jobs WHERE status IN ('pending', 'processing') AND created_at < DATE_SUB(NOW(), INTERVAL 24 HOUR) LIMIT 5");
        while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
            echo " - ID: {$row['id']} | Type: {$row['worker_type']} | Status: {$row['status']} | Age: {$row['created_at']}\n";
            echo "   Payload: " . substr($row['payload'], 0, 100) . "...\n";
        }
    }

    echo "\n";

    // 6. Jobs by worker type
    echo "Jobs by Worker Type:\n";
    $stmt = $pdo->query("SELECT worker_type, status, COUNT(*) as count FROM queue_jobs GROUP BY worker_type, status ORDER BY worker_type, status");
    while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
        echo " - {$row['worker_type']} ({$row['status']}): {$row['count']}\n";
    }

} catch (Exception $e) {
    echo "Error: " . $e->getMessage();
}
