<?php
// api/worker_enroll.php - OMNI-ENGINE V28.2 (OPTIMIZED ATOMIC ENROLLMENT)
// This worker handles standard flow triggers like segment entry using direct SQL.

error_reporting(E_ALL & ~E_DEPRECATED & ~E_NOTICE);
ini_set('display_errors', 0);
set_time_limit(300);

require_once 'db_connect.php';
require_once __DIR__ . '/worker_guard.php';
require_once 'flow_helpers.php';
require_once 'segment_helper.php';

date_default_timezone_set('Asia/Ho_Chi_Minh');
$pdo->exec("SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci");
header('Content-Type: application/json; charset=utf-8');

$now = date('Y-m-d H:i:s');
$logs = [];
$logs[] = "--- ENROLLMENT WORKER START: $now ---";

$lockStmt = $pdo->query("SELECT GET_LOCK('worker_enroll_lock', 0)");
if ($lockStmt->fetchColumn() !== 1) {
    die(json_encode(['status' => 'skipped', 'message' => 'Already running']));
}

// [FIX P11-H5] Register shutdown handler to guarantee lock release even on PHP fatal/OOM.
// Without this, an unexpected crash holds the advisory lock until the DB connection closes
// (MySQL wait_timeout, typically 8h), blocking all subsequent enrollment runs.
register_shutdown_function(function () use ($pdo) {
    try {
        $pdo->query("DO RELEASE_LOCK('worker_enroll_lock')");
    } catch (Throwable $e) { /* ignore � connection may already be closed */ }
});

// 1. Segment Sync � QUEUE-BASED (replaces full blocking scan)
// [FIX] Old approach: SELECT COUNT(*) for ALL segments before any enrollment.
// With 200 segments � 1s each = 200s wasted ? timeout before enrollment starts.
// New approach: Only sync segments that have pending updates in segment_count_update_queue
// (inserted by cleanup/split/exclude operations), plus any segment not synced in >1 hour.
// Cap at 20 per run to bound worst-case sync time to ~20s.
$logs[] = "[Segment] Syncing queued segments...";

$syncedSegments = 0;
$syncLimit = 20;

try {
    // Priority 1: Segments explicitly queued for update
    $stmtQueue = $pdo->query(
        "SELECT DISTINCT q.segment_id, seg.criteria
         FROM segment_count_update_queue q
         JOIN segments seg ON q.segment_id = seg.id
         ORDER BY q.queued_at ASC
         LIMIT $syncLimit"
    );
    $queuedSegs = $stmtQueue->fetchAll();

    foreach ($queuedSegs as $seg) {
        $segId = $seg['segment_id'];
        if (empty($seg['criteria'])) {
            // [FIX P30-D1] Use explicit COUNT query instead of inline correlated subquery.
            // The subquery pattern (SELECT COUNT(*) FROM subscribers) inside UPDATE runs fine
            // but is harder to extend (e.g. add workspace_id scope later).
            // Consistent with the criteria branch pattern: count first, then update.
            $stmtAll = $pdo->query("SELECT COUNT(*) FROM subscribers WHERE status IN ('active','lead','customer')");
            $allCount = (int) $stmtAll->fetchColumn();
            $pdo->prepare("UPDATE segments SET subscriber_count = ?, synced_at = NOW() WHERE id = ?")
                ->execute([$allCount, $segId]);
        } else {
            $segRes = buildSegmentWhereClause($seg['criteria'], $segId);
            $stmtC = $pdo->prepare("SELECT COUNT(*) FROM subscribers s WHERE " . $segRes['sql']);
            $stmtC->execute($segRes['params']);
            $count = $stmtC->fetchColumn();
            $pdo->prepare("UPDATE segments SET subscriber_count = ?, synced_at = NOW() WHERE id = ?")
                ->execute([$count, $segId]);
        }
        // Remove from queue after successful sync
        $pdo->prepare("DELETE FROM segment_count_update_queue WHERE segment_id = ?")
            ->execute([$segId]);
        $syncedSegments++;
    }

    // Priority 2: Stale segments (not synced in 1 hour) � fill up remaining slots
    $remaining = $syncLimit - $syncedSegments;
    if ($remaining > 0) {
        $stmtStale = $pdo->prepare(
            "SELECT id, criteria FROM segments
             WHERE (synced_at IS NULL OR synced_at < DATE_SUB(NOW(), INTERVAL 1 HOUR))
             ORDER BY synced_at ASC LIMIT ?"
        );
        $stmtStale->execute([$remaining]);
        foreach ($stmtStale->fetchAll() as $seg) {
            if (empty($seg['criteria'])) {
                // [FIX P30-D1] Mirror of queue branch � explicit count for consistency
                $stmtAll2 = $pdo->query("SELECT COUNT(*) FROM subscribers WHERE status IN ('active','lead','customer')");
                $allCount2 = (int) $stmtAll2->fetchColumn();
                $pdo->prepare("UPDATE segments SET subscriber_count = ?, synced_at = NOW() WHERE id = ?")
                    ->execute([$allCount2, $seg['id']]);
            } else {
                $segRes = buildSegmentWhereClause($seg['criteria'], $seg['id']);
                $stmtC = $pdo->prepare("SELECT COUNT(*) FROM subscribers s WHERE " . $segRes['sql']);
                $stmtC->execute($segRes['params']);
                $count = $stmtC->fetchColumn();
                $pdo->prepare("UPDATE segments SET subscriber_count = ?, synced_at = NOW() WHERE id = ?")
                    ->execute([$count, $seg['id']]);
            }
            $syncedSegments++;
        }
    }
} catch (Exception $e) {
    $logs[] = "[Segment] Sync error: " . $e->getMessage();
}

$logs[] = "[Segment] Synced $syncedSegments segment(s) (queue-based, max $syncLimit).";

// 2. Standard Flow Enrollment
$logs[] = "[Enrollment] Checking active flows for new enrollments...";
// [FIX P30-W1] Include workspace_id so enrollment logs and stat updates can be
// workspace-scoped. Also guards against enrolling into archived flows from
// other workspaces that somehow share the same segment.
$stmtActiveFlows = $pdo->query("SELECT id, name, steps, config, workspace_id FROM flows WHERE status = 'active'");
$activeFlows = $stmtActiveFlows->fetchAll();

foreach ($activeFlows as $flow) {
    $steps = json_decode($flow['steps'], true) ?: [];
    $fConfig = json_decode($flow['config'], true) ?: [];
    $frequency = $fConfig['frequency'] ?? 'one-time';
    $allowMultiple = !empty($fConfig['allowMultiple']);
    $maxEnrollments = (int) ($fConfig['maxEnrollments'] ?? 0);
    $cooldownHours = (int) ($fConfig['enrollmentCooldownHours'] ?? 12);

    $trigger = null;
    foreach ($steps as $s) {
        if ($s['type'] === 'trigger') {
            $trigger = $s;
            break;
        }
    }
    if (!$trigger || !isset($trigger['nextStepId']))
        continue;

    $tConfig = $trigger['config'] ?? [];
    $tType = $tConfig['type'] ?? 'segment';

    // handled by worker_trigger.php: date, dormant, campaign
    if ($tType !== 'segment')
        continue;

    $stmtSeg = $pdo->prepare("SELECT criteria FROM segments WHERE id = ?");
    $stmtSeg->execute([$tConfig['targetId']]);
    $segDef = $stmtSeg->fetch();

    if (!$segDef) {
        $logs[] = "  - Flow '{$flow['name']}': Trigger segment '{$tConfig['targetId']}' not found.";
        continue;
    }

    $segRes = buildSegmentWhereClause($segDef['criteria'], $tConfig['targetId']);
    $segSql = $segRes['sql'];
    $segParams = $segRes['params'];

    $existsCheckSql = "";
    $checkParams = [];
    $checks = [];
    
    // [NEW_ONLY FIX] If enrollStrategy is new_only, NEVER enroll users who were marked as 'cancelled' during activation.
    $enrollStrategy = $tConfig['enrollStrategy'] ?? 'all';
    if ($enrollStrategy === 'new_only') {
        $checks[] = "NOT EXISTS (SELECT 1 FROM subscriber_flow_states sfs WHERE sfs.subscriber_id = s.id AND sfs.flow_id = ? AND sfs.status = 'cancelled')";
        $checkParams[] = $flow['id'];
    }

    if ($frequency === 'one-time') {
        $checks[] = "NOT EXISTS (SELECT 1 FROM subscriber_flow_states sfs WHERE sfs.subscriber_id = s.id AND sfs.flow_id = ?)";
        $checkParams[] = $flow['id'];
    } else {
        if ($maxEnrollments > 0) {
            $checks[] = "(SELECT COUNT(*) FROM subscriber_flow_states sfs WHERE sfs.subscriber_id = s.id AND sfs.flow_id = ?) < $maxEnrollments";
            $checkParams[] = $flow['id'];
        }
        if ($allowMultiple) {
            $checks[] = "NOT EXISTS (SELECT 1 FROM subscriber_flow_states sfs WHERE sfs.subscriber_id = s.id AND sfs.flow_id = ? AND sfs.status IN ('waiting', 'processing'))";
            $checkParams[] = $flow['id'];
        } else {
            $checks[] = "NOT EXISTS (
                SELECT 1 FROM subscriber_flow_states sfs 
                WHERE sfs.subscriber_id = s.id 
                AND sfs.flow_id = ? 
                AND (sfs.status IN ('waiting', 'processing') OR sfs.updated_at > DATE_SUB(NOW(), INTERVAL $cooldownHours HOUR))
            )";
            $checkParams[] = $flow['id'];
        }
    }
    
    if (!empty($checks)) {
        $existsCheckSql = "AND " . implode(" AND ", $checks);
    }

    $sqlIns = "INSERT INTO subscriber_flow_states (subscriber_id, flow_id, step_id, scheduled_at, status, created_at, updated_at, last_step_at)
               SELECT s.id, ?, ?, ?, 'waiting', NOW(), NOW(), NOW()
               FROM subscribers s
               WHERE s.status IN ('active', 'lead', 'customer') 
               AND ($segSql)
               $existsCheckSql";

    $initialSchedule = date('Y-m-d H:i:s', time() - 1); // Default backward 1 sec for instant trigger if not wait

    // [SMART SCHEDULE] Check if first step is WAIT
    foreach ($steps as $fs) {
        if ($fs['id'] === $trigger['nextStepId'] && $fs['type'] === 'wait') {
            $fsWaitConfig = $fs['config'] ?? [];
            $fsWaitMode = $fsWaitConfig['mode'] ?? 'duration';
            if ($fsWaitMode === 'duration') {
                $dur = (int) ($fsWaitConfig['duration'] ?? 0);
                $unit = $fsWaitConfig['unit'] ?? 'minutes';
                $unitSeconds = match ($unit) {
                    'weeks' => 604800,
                    'days' => 86400,
                    'hours' => 3600,
                    default => 60,
                };
                $delay = $unitSeconds * $dur;
                if ($delay > 0) {
                    $initialSchedule = date('Y-m-d H:i:s', time() + $delay);
                }
            } elseif ($fsWaitMode === 'until_date') {
                $specDate   = $fsWaitConfig['specificDate'] ?? '';
                $targetTime = $fsWaitConfig['untilTime'] ?? '09:00';
                if ($specDate) {
                    $targetTs = strtotime("$specDate $targetTime:00");
                    if ($targetTs > time()) {
                        $initialSchedule = date('Y-m-d H:i:s', $targetTs);
                    }
                }
            } elseif ($fsWaitMode === 'until') {
                $targetTime = $fsWaitConfig['untilTime'] ?? '09:00';
                $dt = new DateTime();
                $parts2 = explode(':', $targetTime);
                $dt->setTime((int)$parts2[0], (int)($parts2[1] ?? 0), 0);
                if ($dt->getTimestamp() <= time()) $dt->modify('+1 day');
                $initialSchedule = $dt->format('Y-m-d H:i:s');
            }
            break;
        }
    }

    $params = array_merge([$flow['id'], $trigger['nextStepId'], $initialSchedule], $segParams, $checkParams);

    try {
        $stmtIns = $pdo->prepare($sqlIns);
        $stmtIns->execute($params);
        $enrolledCount = $stmtIns->rowCount();

        if ($enrolledCount > 0) {
            $pdo->prepare("UPDATE flows SET stat_enrolled = stat_enrolled + ? WHERE id = ?")->execute([$enrolledCount, $flow['id']]);
            $logs[] = "  - Flow '{$flow['name']}': Enrolled $enrolledCount subscribers.";
        }
    } catch (Exception $e) {
        $logs[] = "  - [ERROR] Flow '{$flow['name']}': " . $e->getMessage();
    }
}

$pdo->query("DO RELEASE_LOCK('worker_enroll_lock')");
$logs[] = "--- ENROLLMENT WORKER END ---";
echo json_encode(['status' => 'completed', 'logs' => $logs]);
