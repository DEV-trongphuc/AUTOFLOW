<?php
// api/cleanup_failed_jobs.php - Clean up old failed queue jobs
error_reporting(E_ALL);
ini_set('display_errors', 1);

require_once 'db_connect.php';

echo "<pre>";
echo "========================================\n";
echo "CLEANUP FAILED QUEUE JOBS\n";
echo "========================================\n\n";

// 1. Show current failed jobs
echo "1. Current failed jobs:\n";
try {
    $stmt = $pdo->query("
        SELECT id, queue, error_message, created_at 
        FROM queue_jobs 
        WHERE status = 'failed' 
        ORDER BY created_at DESC
    ");
    $failedJobs = $stmt->fetchAll(PDO::FETCH_ASSOC);

    if (empty($failedJobs)) {
        echo "  ✓ No failed jobs found!\n\n";
    } else {
        echo "  Found " . count($failedJobs) . " failed jobs:\n\n";
        foreach ($failedJobs as $job) {
            echo "  ID {$job['id']} | {$job['queue']} | {$job['created_at']}\n";
            echo "    Error: {$job['error_message']}\n\n";
        }
    }
} catch (Exception $e) {
    die("Error: " . $e->getMessage() . "\n");
}

// 2. Delete failed jobs older than 1 hour
echo "2. Deleting failed jobs older than 1 hour...\n";
try {
    $stmt = $pdo->prepare("
        DELETE FROM queue_jobs 
        WHERE status = 'failed' 
        AND created_at < DATE_SUB(NOW(), INTERVAL 1 HOUR)
    ");
    $stmt->execute();
    $deleted = $stmt->rowCount();

    echo "  ✓ Deleted $deleted old failed jobs\n\n";
} catch (Exception $e) {
    echo "  ✗ Error: " . $e->getMessage() . "\n\n";
}

// 3. Show updated stats
echo "3. Updated queue stats:\n";
try {
    $stmt = $pdo->query("
        SELECT 
            status,
            COUNT(*) as count,
            MIN(created_at) as oldest,
            MAX(created_at) as newest
        FROM queue_jobs
        GROUP BY status
        ORDER BY status
    ");
    $stats = $stmt->fetchAll(PDO::FETCH_ASSOC);

    echo "\n";
    foreach ($stats as $stat) {
        echo "  {$stat['status']}: {$stat['count']} jobs\n";
        echo "    Oldest: {$stat['oldest']}\n";
        echo "    Newest: {$stat['newest']}\n\n";
    }
} catch (Exception $e) {
    echo "  Error: " . $e->getMessage() . "\n";
}

echo "========================================\n";
echo "✓ Cleanup complete!\n";
echo "========================================\n";
echo "</pre>";
?>