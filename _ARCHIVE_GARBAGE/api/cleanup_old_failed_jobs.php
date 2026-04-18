<?php
// api/cleanup_old_failed_jobs.php
error_reporting(E_ALL);
ini_set('display_errors', 1);

require_once 'db_connect.php';

echo "<pre>";
echo "Cleaning up old failed queue jobs...\n\n";

try {
    // Delete all failed jobs older than 1 hour
    $stmt = $pdo->prepare("
        DELETE FROM queue_jobs 
        WHERE status = 'failed' 
        AND created_at < DATE_SUB(NOW(), INTERVAL 1 HOUR)
    ");
    $stmt->execute();
    $deleted = $stmt->rowCount();

    echo "✓ Deleted $deleted old failed jobs\n\n";

    // Show remaining queue stats
    $stmt = $pdo->query("
        SELECT status, COUNT(*) as count
        FROM queue_jobs
        WHERE created_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
        GROUP BY status
    ");
    $stats = $stmt->fetchAll(PDO::FETCH_ASSOC);

    echo "Queue Status (Last 24 hours):\n";
    foreach ($stats as $stat) {
        echo "  {$stat['status']}: {$stat['count']}\n";
    }

    echo "\n✅ Cleanup complete!\n";
} catch (Exception $e) {
    echo "❌ Error: " . $e->getMessage() . "\n";
}

echo "</pre>";
?>