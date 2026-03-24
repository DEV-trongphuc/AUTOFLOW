<?php
// api/force_cleanup_failed.php
error_reporting(E_ALL);
ini_set('display_errors', 1);

require_once 'db_connect.php';

echo "<pre>";
echo "Force cleaning ALL failed queue jobs...\n\n";

try {
    // Show what we're about to delete
    $stmt = $pdo->query("
        SELECT id, queue, error_message, created_at
        FROM queue_jobs
        WHERE status = 'failed'
        ORDER BY created_at DESC
    ");
    $toDelete = $stmt->fetchAll(PDO::FETCH_ASSOC);

    echo "Jobs to be deleted:\n";
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n";
    foreach ($toDelete as $job) {
        echo "ID {$job['id']}: {$job['queue']} - {$job['error_message']} ({$job['created_at']})\n";
    }
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n";

    // Delete ALL failed jobs
    $stmt = $pdo->prepare("DELETE FROM queue_jobs WHERE status = 'failed'");
    $stmt->execute();
    $deleted = $stmt->rowCount();

    echo "✅ Deleted $deleted failed jobs\n\n";

    // Show updated stats
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

    echo "\n✅ Cleanup complete! Queue is now clean.\n";
} catch (Exception $e) {
    echo "❌ Error: " . $e->getMessage() . "\n";
}

echo "</pre>";
?>