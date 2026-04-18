<?php
// api/check_flow_distribution.php
require_once 'db_connect.php';

echo "<pre>--- FLOW DISTRIBUTION CHECK ---\n";

try {
    $fid = 'ad16ed97-06b8-49a6-a8da-222c93191db0';

    // 1. Status overview
    $stmt = $pdo->prepare("SELECT status, COUNT(*) as count FROM subscriber_flow_states WHERE flow_id = ? GROUP BY status");
    $stmt->execute([$fid]);
    echo "Current Status Counts:\n";
    print_r($stmt->fetchAll(PDO::FETCH_ASSOC));

    // 2. Step distribution for waiting
    $stmt = $pdo->prepare("SELECT step_id, status, COUNT(*) as count FROM subscriber_flow_states WHERE flow_id = ? AND status = 'waiting' GROUP BY step_id");
    $stmt->execute([$fid]);
    echo "\nWaiting distribution by Step:\n";
    print_r($stmt->fetchAll(PDO::FETCH_ASSOC));

    // 3. Check Scheduled time for those waiting at the condition step
    $stmt = $pdo->prepare("SELECT COUNT(*) FROM subscriber_flow_states WHERE flow_id = ? AND status = 'waiting' AND scheduled_at > NOW()");
    $stmt->execute([$fid]);
    $future = $stmt->fetchColumn();
    echo "\nSubscribers scheduled in the FUTURE (cannot be processed yet): $future\n";

} catch (Exception $e) {
    echo "ERROR: " . $e->getMessage() . "\n";
}
echo "</pre>";
