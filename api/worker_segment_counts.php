<?php
// worker_segment_counts.php - Background worker for segment count updates
require_once 'db_connect.php';
require_once 'segment_helper.php';

set_time_limit(300); // 5 minutes max
$startTime = time();
$maxRuntime = 240; // 4 minutes to allow graceful shutdown
$batchSize = 10;

try {
    $logs = [];
    $logs[] = "[START] Segment count update worker started at " . date('Y-m-d H:i:s');

    while ((time() - $startTime) < $maxRuntime) {
        // Fetch batch of segments to update
        $stmt = $pdo->prepare("
            SELECT segment_id 
            FROM segment_count_update_queue 
            ORDER BY queued_at ASC 
            LIMIT ?
        ");
        $stmt->execute([$batchSize]);
        $queue = $stmt->fetchAll(PDO::FETCH_COLUMN);

        if (empty($queue)) {
            $logs[] = "[IDLE] No segments in queue, exiting.";
            break;
        }

        $logs[] = "[BATCH] Processing " . count($queue) . " segments";

        foreach ($queue as $segmentId) {
            try {
                // Get segment criteria
                $stmtSeg = $pdo->prepare("SELECT criteria FROM segments WHERE id = ?");
                $stmtSeg->execute([$segmentId]);
                $criteria = $stmtSeg->fetchColumn();

                if (!$criteria) {
                    $logs[] = "[SKIP] Segment $segmentId not found, removing from queue";
                    $pdo->prepare("DELETE FROM segment_count_update_queue WHERE segment_id = ?")->execute([$segmentId]);
                    continue;
                }

                // Calculate count
                $res = buildSegmentWhereClause($criteria, $segmentId);
                $stmtCount = $pdo->prepare("
                    SELECT COUNT(*) 
                    FROM subscribers s 
                    WHERE s.status IN ('active', 'lead', 'customer') AND " . $res['sql']
                );
                $stmtCount->execute($res['params']);
                $count = (int) $stmtCount->fetchColumn();

                // Update segment
                $pdo->prepare("UPDATE segments SET subscriber_count = ? WHERE id = ?")->execute([$count, $segmentId]);

                // Remove from queue
                $pdo->prepare("DELETE FROM segment_count_update_queue WHERE segment_id = ?")->execute([$segmentId]);

                $logs[] = "[UPDATE] Segment $segmentId: $count subscribers";

            } catch (Exception $e) {
                $logs[] = "[ERROR] Segment $segmentId failed: " . $e->getMessage();
                // Don't remove from queue on error - will retry next run
            }
        }

        // Prevent tight loop
        usleep(100000); // 100ms
    }

    $logs[] = "[END] Worker completed at " . date('Y-m-d H:i:s');

} catch (Exception $e) {
    $logs[] = "[FATAL] " . $e->getMessage();
}

// Output logs
foreach ($logs as $log) {
    echo $log . "\n";
}
?>