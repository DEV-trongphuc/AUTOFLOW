<?php
// api/optimize_performance_v2.php
// Performance Optimization Migration — Phase 2
// Adds composite indexes to tables with high-frequency queries in workers.
// SAFE TO RUN MULTIPLE TIMES (uses IF NOT EXISTS / error suppression per index).
//
// Run via: GET /api/optimize_performance_v2.php?token=autoflow-admin-001
//   or CLI: php api/optimize_performance_v2.php

require_once __DIR__ . '/db_connect.php';

$token = $_GET['token'] ?? ($_SERVER['argv'][1] ?? '');
if (PHP_SAPI !== 'cli' && $token !== ADMIN_BYPASS_TOKEN) {
    http_response_code(403);
    echo json_encode(['success' => false, 'message' => 'Unauthorized']);
    exit;
}

$results = [];
$errors  = [];

/**
 * Apply a single DDL statement, catch duplicate-key errors gracefully.
 */
function applyIndex(PDO $pdo, string $label, string $sql, array &$results, array &$errors): void
{
    try {
        $pdo->exec($sql);
        $results[] = "✅ $label";
    } catch (PDOException $e) {
        // 1061 = Duplicate key name (index already exists) — not an error for us
        if ($e->getCode() == '42000' && strpos($e->getMessage(), 'Duplicate key name') !== false) {
            $results[] = "⚠️  $label — already exists (skipped)";
        } else {
            $errors[] = "❌ $label — " . $e->getMessage();
        }
    }
}

echo "<pre>\n";
echo "=== AutoFlow Performance Migration v2 ===\n";
echo "Time: " . date('Y-m-d H:i:s') . "\n\n";

// ─── 1. subscriber_activity ──────────────────────────────────────────────────
// Used by: FlowExecutor condition case, checkAdvancedExit, exit condition queries.
// Query pattern: WHERE subscriber_id=? AND type IN (?) AND created_at >= ?
applyIndex($pdo, "subscriber_activity: idx_sub_type_created",
    "ALTER TABLE subscriber_activity
     ADD INDEX idx_sub_type_created (subscriber_id, type, created_at)",
    $results, $errors);

// Used by: campaign worker lock cleanup (DELETE WHERE campaign_id=? AND type=?)
applyIndex($pdo, "subscriber_activity: idx_camp_type",
    "ALTER TABLE subscriber_activity
     ADD INDEX idx_camp_type (campaign_id, type)",
    $results, $errors);

// ─── 2. subscriber_flow_states ───────────────────────────────────────────────
// Used by: worker_flow.php batch SELECT — WHERE status IN ('waiting','processing') AND scheduled_at <= ?
applyIndex($pdo, "subscriber_flow_states: idx_status_scheduled_flow",
    "ALTER TABLE subscriber_flow_states
     ADD INDEX idx_status_scheduled_flow (status, scheduled_at, flow_id)",
    $results, $errors);

// Used by: logActivity Event-Driven trigger — WHERE subscriber_id=? AND status='waiting'
applyIndex($pdo, "subscriber_flow_states: idx_sub_status",
    "ALTER TABLE subscriber_flow_states
     ADD INDEX idx_sub_status (subscriber_id, status)",
    $results, $errors);

// ─── 3. flows ────────────────────────────────────────────────────────────────
// Used by: worker_campaign, worker_priority — WHERE status='active' AND (trigger filter)
applyIndex($pdo, "flows: idx_status_updated",
    "ALTER TABLE flows
     ADD INDEX idx_status_updated (status, updated_at)",
    $results, $errors);

// ─── 4. queue_jobs ───────────────────────────────────────────────────────────
// Used by: worker_queue.php — WHERE queue=? AND status='pending' AND available_at<=?
applyIndex($pdo, "queue_jobs: idx_queue_status_available",
    "ALTER TABLE queue_jobs
     ADD INDEX idx_queue_status_available (queue, status, available_at)",
    $results, $errors);

// ─── 5. mail_delivery_logs ───────────────────────────────────────────────────
// Used by: dashboard campaign stats — WHERE campaign_id=? AND status='success'
applyIndex($pdo, "mail_delivery_logs: idx_camp_status",
    "ALTER TABLE mail_delivery_logs
     ADD INDEX idx_camp_status (campaign_id, status)",
    $results, $errors);

// ─── Output Results ──────────────────────────────────────────────────────────
echo "Results:\n";
foreach ($results as $r) {
    echo "  $r\n";
}

if (!empty($errors)) {
    echo "\nErrors:\n";
    foreach ($errors as $e) {
        echo "  $e\n";
    }
    echo "\nMigration completed with " . count($errors) . " error(s).\n";
} else {
    echo "\nMigration completed successfully (" . count($results) . " operations).\n";
}

echo "</pre>";
