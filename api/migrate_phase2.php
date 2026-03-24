<?php
// migrate_phase2.php - Phase 2 Database Migration
require_once 'db_connect.php';

header('Content-Type: text/plain; charset=utf-8');

$logs = [];
$logs[] = "=== Phase 2 Database Migration ===";
$logs[] = "Started at: " . date('Y-m-d H:i:s');
$logs[] = "";

try {
    $pdo->beginTransaction();

    // 1. Create segment_count_update_queue table
    $logs[] = "[1/1] Creating segment_count_update_queue table...";
    $sql = "CREATE TABLE IF NOT EXISTS `segment_count_update_queue` (
        `segment_id` VARCHAR(255) PRIMARY KEY,
        `queued_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX `idx_queued` (`queued_at`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci";

    $pdo->exec($sql);
    $logs[] = "✓ segment_count_update_queue table created successfully";

    // 2. Verify table exists
    $stmt = $pdo->query("SHOW TABLES LIKE 'segment_count_update_queue'");
    if ($stmt->rowCount() > 0) {
        $logs[] = "✓ Table verification passed";
    } else {
        throw new Exception("Table creation verification failed");
    }

    // 3. Queue all existing segments for count update
    $logs[] = "";
    $logs[] = "Queuing existing segments for count update...";
    $stmtSegs = $pdo->query("SELECT id FROM segments");
    $segments = $stmtSegs->fetchAll(PDO::FETCH_COLUMN);

    if (!empty($segments)) {
        $placeholders = implode(',', array_fill(0, count($segments), '(?)'));
        $stmtQueue = $pdo->prepare("INSERT IGNORE INTO segment_count_update_queue (segment_id) VALUES $placeholders");
        $stmtQueue->execute($segments);
        $logs[] = "✓ Queued " . count($segments) . " segments for background count update";
    } else {
        $logs[] = "ℹ No segments found to queue";
    }

    $pdo->commit();

    $logs[] = "";
    $logs[] = "=== Migration Completed Successfully ===";
    $logs[] = "Finished at: " . date('Y-m-d H:i:s');
    $logs[] = "";
    $logs[] = "Next Steps:";
    $logs[] = "1. Schedule worker_segment_counts.php in cron (every 2 minutes)";
    $logs[] = "2. Monitor segment_count_update_queue table";
    $logs[] = "3. Test segment operations for performance improvement";

} catch (Exception $e) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }
    $logs[] = "";
    $logs[] = "❌ Migration Failed: " . $e->getMessage();
    $logs[] = "Stack trace: " . $e->getTraceAsString();
}

// Output logs
foreach ($logs as $log) {
    echo $log . "\n";
}
?>