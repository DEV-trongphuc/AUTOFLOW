<?php
// api/check_segments_cleanup.php - SEGMENT MAINTENANCE V1.0
// This worker assumes it is run daily by a CRON command.
// Purpose: Archive subscribers who are in a segment with 'auto_cleanup_days' > 0 AND have been inactive for that period.

error_reporting(E_ALL & ~E_DEPRECATED & ~E_NOTICE);
ini_set('display_errors', 0);
set_time_limit(300); // Max 5 minutes for maintenance

require_once 'db_connect.php';
require_once 'segment_helper.php';

date_default_timezone_set('Asia/Ho_Chi_Minh');
$pdo->exec("SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci");

$logs = [];
$logs[] = "--- SEGMENT CLEANUP START: " . date('Y-m-d H:i:s') . " ---";

try {
    // 1. Find segments with auto_cleanup_days > 0
    $stmtSeg = $pdo->query("SELECT id, name, criteria, auto_cleanup_days FROM segments WHERE auto_cleanup_days > 0");
    $segments = $stmtSeg->fetchAll();

    if (empty($segments)) {
        $logs[] = "[Info] No segments configured for auto-cleanup.";
    } else {
        foreach ($segments as $seg) {
            $segId = $seg['id'];
            $segName = $seg['name'];
            $days = (int) $seg['auto_cleanup_days'];

            if ($days <= 0)
                continue;

            $logs[] = "[Processing] Segment '{$segName}' (ID: $segId) - Cleanup after $days days inactivity.";

            // 2. Build Segment Criteria Query
            // We need to identify who is CURRENTLY in this segment.
            $criteriaJson = $seg['criteria'];
            $res = buildSegmentWhereClause($criteriaJson);
            $whereClause = $res['sql']; // e.g. "params.tags LIKE ..."
            $params = $res['params'];   // e.g. ["%tag%"]

            // 3. Find Subscribers in this segment who are also inactive
            // Criteria: 
            // - Matches Segment ($whereClause)
            // - Status is 'active' (don't need to archive already archived)
            // - last_activity_at < NOW - $days
            // OR (if last_activity_at is NULL) joined_at < NOW - $days ?? -> Let's assume NULL means inactive since join? Or ignore?
            // Safer: IF last_activity_at IS NULL, use joined_at.

            $cutoffDate = date('Y-m-d H:i:s', strtotime("-$days days"));

            // The Query: Select IDs first to log them? Or direct Update?
            // Let's Select first to log count.

            $sql = "SELECT id FROM subscribers s 
                    WHERE s.status IN ('active', 'lead', 'customer') 
                    AND ($whereClause) 
                    AND (
                        (s.last_activity_at IS NOT NULL AND s.last_activity_at < ?)
                        OR 
                        (s.last_activity_at IS NULL AND s.joined_at < ?)
                    )";

            // Add cutoff params to the end of existing params
            $checkParams = array_merge($params, [$cutoffDate, $cutoffDate]);

            $stmtCheck = $pdo->prepare($sql);
            $stmtCheck->execute($checkParams);
            $idsToArchive = $stmtCheck->fetchAll(PDO::FETCH_COLUMN);

            $count = count($idsToArchive);
            if ($count > 0) {
                // 4. Archive Them
                $placeholders = implode(',', array_fill(0, $count, '?'));
                $updateSql = "UPDATE subscribers SET status = 'unsubscribed', notes = JSON_ARRAY_APPEND(COALESCE(notes, '[]'), '$', ?) WHERE id IN ($placeholders)";

                // Note message
                $noteMsg = "Auto-archived by Segment '{$segName}' cleanup rule ($days days inactivity)";

                $updateParams = array_merge([$noteMsg], $idsToArchive);

                $stmtUpdate = $pdo->prepare($updateSql);
                $stmtUpdate->execute($updateParams);

                $logs[] = "  -> Archived $count subscribers.";
            } else {
                $logs[] = "  -> No matching inactive subscribers found.";
            }
        }
    }

} catch (Exception $e) {
    $logs[] = "[ERROR] " . $e->getMessage();
}

$logs[] = "--- SEGMENT CLEANUP END: " . date('Y-m-d H:i:s') . " ---";

// Output logs (for Cron output capture)
echo implode("\n", $logs);
?>