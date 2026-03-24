<?php
// api/debug_flow_step.php
require_once 'db_connect.php';

error_reporting(E_ALL);
ini_set('display_errors', 1);

echo "--- FLOW STEP DEBUG ---\n";
try {
    // 1. Find the active flow triggered by the recent campaign
    $cid = '6985cffc6c490';
    $stmt = $pdo->query("SELECT id, name, steps FROM flows WHERE status = 'active' ORDER BY updated_at DESC LIMIT 5");
    $flows = $stmt->fetchAll();

    $targetFlow = null;
    foreach ($flows as $f) {
        if (strpos($f['steps'], $cid) !== false) {
            $targetFlow = $f;
            break;
        }
    }

    if (!$targetFlow) {
        echo "No active flow found linked to campaign $cid.\n";
        exit;
    }

    echo "Found Flow: " . $targetFlow['name'] . " (ID: " . $targetFlow['id'] . ")\n";
    $steps = json_decode($targetFlow['steps'], true);
    foreach ($steps as $s) {
        $waitType = $s['config']['waitType'] ?? 'time';
        $waitValue = $s['config']['waitValue'] ?? '0';
        $waitUnit = $s['config']['waitUnit'] ?? 'minutes';
        echo "Step: {$s['label']} (ID: {$s['id']}) | Type: {$s['type']} | Logic: $waitType ($waitValue $waitUnit)\n";
    }

    // 2. Check current queue for this flow
    $stmt = $pdo->prepare("SELECT COUNT(*) FROM queue_jobs WHERE payload LIKE ? AND status = 'pending'");
    $stmt->execute(['%"flow_id":"' . $targetFlow['id'] . '"%']);
    $pending = $stmt->fetchColumn();
    echo "\nPending jobs in queue for this flow: $pending\n";

    // 3. Check subscriber_flow_states for anyone 'waiting'
    $stmt = $pdo->prepare("SELECT status, COUNT(*) as total FROM subscriber_flow_states WHERE flow_id = ? GROUP BY status");
    $stmt->execute([$targetFlow['id']]);
    echo "\nSubscriber States in this flow:\n";
    foreach ($stmt->fetchAll() as $row) {
        echo "- {$row['status']}: {$row['total']}\n";
    }

} catch (Exception $e) {
    echo "ERROR: " . $e->getMessage() . "\n";
}
