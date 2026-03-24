<?php
require_once 'db_connect.php';
$flowId = 'ad16ed97-06b8-49a6-a8da-222c93191db0';

echo "<pre>";
echo "--- Recalculating Stats for Flow: $flowId ---\n";

// 1. Check Flow States count
$stmt = $pdo->prepare("SELECT status, count(*) as count FROM subscriber_flow_states WHERE flow_id = ? GROUP BY status");
$stmt->execute([$flowId]);
print_r($stmt->fetchAll());

// 2. Check Activity Logs for this flow
$stmt = $pdo->prepare("SELECT type, count(*) as count FROM subscriber_activity WHERE flow_id = ? GROUP BY type");
$stmt->execute([$flowId]);
echo "\nActivity Counts:\n";
print_r($stmt->fetchAll());

// 3. Count unique subscribers who finished
$stmt = $pdo->prepare("SELECT count(DISTINCT subscriber_id) FROM subscriber_flow_states WHERE flow_id = ? AND status = 'completed'");
$stmt->execute([$flowId]);
$completedReal = $stmt->fetchColumn();
echo "\nReal Completed (Flow States): $completedReal\n";

$stmt = $pdo->prepare("SELECT count(*) FROM subscriber_activity WHERE flow_id = ? AND type = 'complete_flow'");
$stmt->execute([$flowId]);
$completedAct = $stmt->fetchColumn();
echo "Real Completed (Activity Logs): $completedAct\n";

// 4. Update the flow summary
if ($completedReal > 0) {
    // Note: The UI might be reading from 'flows' table or aggregated steps.
    // Let's check 'flows' table first.
    $stmt = $pdo->prepare("SELECT stat_completed FROM flows WHERE id = ?");
    $stmt->execute([$flowId]);
    $current = $stmt->fetchColumn();
    echo "Current stat_completed in 'flows' table: $current\n";

    if ($current != $completedReal) {
        $pdo->prepare("UPDATE flows SET stat_completed = ? WHERE id = ?")->execute([$completedReal, $flowId]);
        echo "Updated table 'flows' stat_completed to $completedReal\n";
    }
}

echo "</pre>";
?>