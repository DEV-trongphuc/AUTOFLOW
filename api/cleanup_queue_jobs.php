<?php
header('Content-Type: text/plain; charset=utf-8');
require_once 'db_connect.php';

echo "QUEUE JOBS CLEANUP TOOL\n";
echo "=======================\n\n";

if (!isset($_GET['commit'])) {
    echo "DRY RUN MODE. Add ?commit=1 to execute cleanup.\n\n";
}

try {
    $pdo->beginTransaction();

    // 1. Clean ALL completed jobs immediately
    $stmt = $pdo->prepare("SELECT COUNT(*) FROM queue_jobs WHERE status = 'completed'");
    $stmt->execute();
    $completedCount = $stmt->fetchColumn();
    echo "Completed Jobs (all): $completedCount\n";

    if (isset($_GET['commit']) && $completedCount > 0) {
        $pdo->exec("DELETE FROM queue_jobs WHERE status = 'completed'");
        echo " -> Deleted $completedCount completed jobs.\n";
    }

    // 2. Clean old failed jobs (>7 days)
    $stmt = $pdo->prepare("SELECT COUNT(*) FROM queue_jobs WHERE status = 'failed' AND created_at < DATE_SUB(NOW(), INTERVAL 7 DAY)");
    $stmt->execute();
    $failedCount = $stmt->fetchColumn();
    echo "\nOld Failed Jobs (>7 days): $failedCount\n";

    if (isset($_GET['commit']) && $failedCount > 0) {
        $pdo->exec("DELETE FROM queue_jobs WHERE status = 'failed' AND created_at < DATE_SUB(NOW(), INTERVAL 7 DAY)");
        echo " -> Deleted $failedCount failed jobs.\n";
    }

    // 3. Reset stuck jobs (processing >24h) back to failed
    $stmt = $pdo->prepare("SELECT COUNT(*) FROM queue_jobs WHERE status = 'processing' AND created_at < DATE_SUB(NOW(), INTERVAL 24 HOUR)");
    $stmt->execute();
    $stuckCount = $stmt->fetchColumn();
    echo "\nStuck Jobs (processing >24h): $stuckCount\n";

    if (isset($_GET['commit']) && $stuckCount > 0) {
        $pdo->exec("
            UPDATE queue_jobs 
            SET status = 'failed', 
                finished_at = NOW(),
                error_message = 'Auto-failed: Stuck in processing for >24 hours'
            WHERE status = 'processing' AND created_at < DATE_SUB(NOW(), INTERVAL 24 HOUR)
        ");
        echo " -> Marked $stuckCount stuck jobs as failed.\n";

        // Then delete them immediately since they're old
        $pdo->exec("DELETE FROM queue_jobs WHERE status = 'failed' AND error_message = 'Auto-failed: Stuck in processing for >24 hours'");
        echo " -> Deleted $stuckCount stuck jobs.\n";
    }

    if (isset($_GET['commit'])) {
        $pdo->commit();
        echo "\nCleanup completed successfully.\n";
    } else {
        $pdo->rollBack();
        echo "\nTotal jobs to be cleaned: " . ($completedCount + $failedCount + $stuckCount) . "\n";
    }

} catch (Exception $e) {
    if ($pdo->inTransaction())
        $pdo->rollBack();
    echo "Error: " . $e->getMessage();
}
