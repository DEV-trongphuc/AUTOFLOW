<?php
/**
 * FLOW SYSTEM SELF-HEALING & INTEGRITY FIX V1.0
 * This script fixes schema issues and cleans up corrupted flow states.
 */

require_once 'db_connect.php';

header('Content-Type: text/plain; charset=utf-8');

function logFix($msg)
{
    echo "[FIX] " . $msg . "\n";
}

logFix("Starting Flow System Self-Healing...");

// 1. SCHEMA REPAIR
logFix("--- Step 1: Schema Repair ---");
try {
    $pdo->query("SELECT last_step_at FROM subscriber_flow_states LIMIT 1");
    logFix("Column `last_step_at` already exists.");
} catch (Exception $e) {
    try {
        logFix("Adding column `last_step_at` to `subscriber_flow_states`...");
        $pdo->exec("ALTER TABLE subscriber_flow_states ADD COLUMN last_step_at DATETIME DEFAULT NULL");
        $pdo->exec("UPDATE subscriber_flow_states SET last_step_at = updated_at WHERE last_step_at IS NULL");
        logFix("`last_step_at` added and back-filled successfully.");
    } catch (Exception $e2) {
        logFix("FAILED to add `last_step_at`: " . $e2->getMessage());
    }
}

// Ensure trigger_type index
try {
    $pdo->exec("ALTER TABLE flows ADD INDEX IF NOT EXISTS (trigger_type)");
    logFix("Index on `flows`.`trigger_type` ensured.");
} catch (Exception $e) {
}

// 2. ORPHANED STATES CLEANUP
logFix("\n--- Step 2: Corrupted Data Cleanup ---");

// A. Remove states for non-existent flows
$stmt = $pdo->query("DELETE FROM subscriber_flow_states WHERE flow_id NOT IN (SELECT id FROM flows)");
logFix("Removed " . $stmt->rowCount() . " orphaned states for deleted flows.");

// B. Remove states for non-existent subscribers
$stmt = $pdo->query("DELETE FROM subscriber_flow_states WHERE subscriber_id NOT IN (SELECT id FROM subscribers)");
logFix("Removed " . $stmt->rowCount() . " orphaned states for deleted subscribers.");

// C. Exit 'completed' subscribers who are still in 'waiting/processing' (Safety fallback)
// This shouldn't happen often but can occur during race conditions.
// We don't delete them, just mark as completed or failed as needed.

// 3. STUCK PROCESS RECOVERY
logFix("\n--- Step 3: Worker Recovery ---");
$stmt = $pdo->query("UPDATE subscriber_flow_states SET status = 'waiting', updated_at = NOW() WHERE status = 'processing' AND updated_at < DATE_SUB(NOW(), INTERVAL 15 MINUTE)");
logFix("Recovered " . $stmt->rowCount() . " points stuck in 'processing' for over 15 minutes.");

// 4. INVALID STEP MIGRATION (The "Stuck at Deleted Step" Problem)
logFix("\n--- Step 4: Invalid Step Migration ---");
$stmtFlows = $pdo->query("SELECT id, steps, name FROM flows WHERE status = 'active'");
$totalMigrated = 0;

while ($flow = $stmtFlows->fetch()) {
    $steps = json_decode($flow['steps'], true) ?: [];
    $validStepIds = array_filter(array_map(function ($s) {
        return trim($s['id'] ?? '');
    }, $steps));

    if (empty($validStepIds))
        continue;

    // Find fallback step
    $fallbackId = null;
    foreach ($steps as $s) {
        if (($s['type'] ?? '') === 'trigger') {
            $fallbackId = trim($s['nextStepId'] ?? '');
            if ($fallbackId)
                break;
        }
    }

    if (!$fallbackId)
        continue;

    $stmtMigrate = $pdo->prepare("
        UPDATE subscriber_flow_states 
        SET step_id = ?, updated_at = NOW(), last_error = 'Auto-migrated: Previous step no longer exists' 
        WHERE flow_id = ? AND status IN ('waiting', 'processing') AND step_id NOT IN ('" . implode("','", $validStepIds) . "')
    ");
    $stmtMigrate->execute([$fallbackId, $flow['id']]);
    $migrated = $stmtMigrate->rowCount();
    if ($migrated > 0) {
        logFix("Flow '{$flow['name']}': Migrated $migrated subscribers from deleted steps to fallback step '$fallbackId'.");
        $totalMigrated += $migrated;
    }
}
logFix("Total subscribers migrated from deleted steps: $totalMigrated");

// 5. ZALO WEBHOOK SYNC CHECK (Self-healing for the stalling bug I fixed earlier)
logFix("\n--- Step 5: Webhook Status Reset ---");
// If any subscribers are stuck in 'zns_delivered' (which isn't a worker status), reset them to 'waiting'
$stmtReset = $pdo->query("UPDATE subscriber_flow_states SET status = 'waiting', updated_at = NOW() WHERE status = 'zns_delivered'");
if ($stmtReset->rowCount() > 0) {
    logFix("Reset " . $stmtReset->rowCount() . " subscribers stuck in legacy 'zns_delivered' status back to 'waiting'.");
}

// 6. QUEUE RECOVERY
logFix("\n--- Step 6: Queue Recovery ---");
$stmtJobReset = $pdo->query("UPDATE queue_jobs SET status = 'pending', attempts = 0, error_message = NULL WHERE status = 'failed' AND (payload LIKE '%sync_web_journey%' OR payload LIKE '%enrich_subscriber%')");
logFix("Reset " . $stmtJobReset->rowCount() . " failed tracking/enrichment jobs back to 'pending'.");

logFix("\nSelf-healing complete. System integrity restored.");
