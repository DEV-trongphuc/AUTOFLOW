<?php
// api/worker_maintenance.php - 10M UPGRADE MAINTENANCE ENGINE
// Performs heavy cleanup and maintenance tasks asynchronously.

require_once 'db_connect.php';

// Only allow CLI or specific secret/IP if needed
if (php_sapi_name() !== 'cli' && !isset($_GET['run'])) {
    die("Maintenance script restricted.");
}

echo "[" . date('Y-m-d H:i:s') . "] Starting Maintenance Cycle...\n";

/**
 * 1. ACTIVITY LOGS - DISABLED PER USER REQUEST
 * Keep ALL activity logs permanently for complete audit trail.
 * No automatic pruning of subscriber_activity table.
 */
echo "  -> Activity log pruning: DISABLED (keeping all records)\n";

/**
 * 2. CLEANUP QUEUE JOBS
 * - Remove completed jobs immediately (no retention needed)
 * - Remove failed jobs older than 7 days (keep recent for debugging)
 * - Reset stuck jobs (processing >24h) to failed, then delete
 */
echo "  -> Cleaning up queue jobs... ";

// Clean ALL completed jobs immediately
$pdo->exec("DELETE FROM queue_jobs WHERE status = 'completed'");

// Clean old failed jobs (keep 7 days for debugging)
$pdo->prepare("DELETE FROM queue_jobs WHERE status = 'failed' AND created_at < DATE_SUB(NOW(), INTERVAL 7 DAY)")->execute();

// Handle stuck jobs (processing >24h) - mark as failed then delete immediately
$pdo->exec("
    UPDATE queue_jobs 
    SET status = 'failed', 
        finished_at = NOW(),
        error_message = 'Auto-failed: Stuck in processing for >24 hours'
    WHERE status = 'processing' AND created_at < DATE_SUB(NOW(), INTERVAL 24 HOUR)
");

$pdo->exec("DELETE FROM queue_jobs WHERE status = 'failed' AND error_message = 'Auto-failed: Stuck in processing for >24 hours'");

echo "Done.\n";

/**
 * 3. CLEANUP ORPHANED FLOW STATES
 * Remove states belonging to deleted flows or deleted subscribers.
 */
echo "  -> Cleaning up orphaned flow states... ";
$pdo->exec("
    DELETE FROM subscriber_flow_states 
    WHERE NOT EXISTS (SELECT 1 FROM flows f WHERE f.id = subscriber_flow_states.flow_id)
    OR NOT EXISTS (SELECT 1 FROM subscribers s WHERE s.id = subscriber_flow_states.subscriber_id)
");
echo "Done.\n";

/**
 * 4. OPTIMIZE TABLES (Optional, run monthly)
 */
if (date('j') == '1' || isset($_GET['full'])) {
    echo "  -> Monthly Table Optimization... ";
    $pdo->exec("OPTIMIZE TABLE subscriber_activity, queue_jobs, subscriber_flow_states");
    echo "Done.\n";
}

echo "[" . date('Y-m-d H:i:s') . "] Maintenance Cycle Complete.\n";
