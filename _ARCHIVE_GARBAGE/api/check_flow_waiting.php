<?php
// api/check_flow_waiting.php
require_once 'db_connect.php';

error_reporting(E_ALL);
ini_set('display_errors', 1);

echo "--- FLOW WAITING ANALYSIS ---\n";
try {
    $fid = 'ad16ed97-06b8-49a6-a8da-222c93191db0';

    // 1. Check a sample of waiting subscribers
    $stmt = $pdo->prepare("SELECT id, subscriber_id, step_id, scheduled_at, status, updated_at FROM subscriber_flow_states WHERE flow_id = ? AND status = 'waiting' LIMIT 10");
    $stmt->execute([$fid]);
    $waiting = $stmt->fetchAll();

    echo "Sample of waiting states:\n";
    foreach ($waiting as $w) {
        echo "ID: {$w['id']} | Sub: {$w['subscriber_id']} | Step: {$w['step_id']} | Scheduled: {$w['scheduled_at']} | Status: {$w['status']}\n";
    }

    // 2. See if there are any that SHOULD be processed now
    $stmt = $pdo->prepare("SELECT COUNT(*) FROM subscriber_flow_states WHERE flow_id = ? AND status = 'waiting' AND scheduled_at <= NOW()");
    $stmt->execute([$fid]);
    $due = $stmt->fetchColumn();
    echo "\nSubscribers DUE for processing (scheduled_at <= NOW()): $due\n";

    // 3. Check for recent activity for a specific subscriber who clicked (turniodev@gmail.com)
    $stmt = $pdo->query("SELECT id FROM subscribers WHERE email = 'turniodev@gmail.com'");
    $subId = $stmt->fetchColumn();
    if ($subId) {
        echo "\nActivity for turniodev@gmail.com (ID: $subId):\n";
        $stmt = $pdo->prepare("SELECT type, reference_id, details, created_at FROM subscriber_activity WHERE subscriber_id = ? ORDER BY created_at DESC LIMIT 5");
        $stmt->execute([$subId]);
        foreach ($stmt->fetchAll() as $act) {
            echo "- {$act['type']} | Ref: {$act['reference_id']} | Details: {$act['details']} | At: {$act['created_at']}\n";
        }
    }

} catch (Exception $e) {
    echo "ERROR: " . $e->getMessage() . "\n";
}
