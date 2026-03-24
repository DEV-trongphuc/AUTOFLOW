<?php
require_once 'db_connect.php';

echo "<pre>";
echo "--- executing Deep Sync to fix counts ---\n";

$flowId = 'ad16ed97-06b8-49a6-a8da-222c93191db0';
$conditionStepId = '80966800-d4c1-4afd-9393-4290aceb9fc1';
$tagStepId = 'd327fe62-c975-4bbe-bb3a-a352c409de86';
$endStepId = '75d19b7a-9762-45e3-820d-830206a41434';

// 1. Find subscribers who are 'completed' but missing activities
$stmt = $pdo->prepare("
    SELECT sfs.subscriber_id, sfs.updated_at 
    FROM subscriber_flow_states sfs
    WHERE sfs.flow_id = ? AND sfs.status = 'completed'
");
$stmt->execute([$flowId]);
$completedInState = $stmt->fetchAll();
echo "Total Completed in Flow State: " . count($completedInState) . "\n";

foreach ($completedInState as $row) {
    $sid = $row['subscriber_id'];
    $finishedAt = $row['updated_at'];

    // Check missing Tag activity
    $stmt = $pdo->prepare("SELECT id FROM subscriber_activity WHERE subscriber_id = ? AND flow_id = ? AND reference_id = ? AND type = 'update_tag'");
    $stmt->execute([$sid, $flowId, $tagStepId]);
    if (!$stmt->fetch()) {
        echo "Fixing: Adding missing Tag log for $sid\n";
        $pdo->prepare("INSERT INTO subscriber_activity (subscriber_id, flow_id, reference_id, type, reference_name, details, created_at) VALUES (?, ?, ?, 'update_tag', 'Flow Step', 'Tag applied (Sync Fix)', ?)")
            ->execute([$sid, $flowId, $tagStepId, $finishedAt]);
    }

    // Check missing Complete activity
    $stmt = $pdo->prepare("SELECT id FROM subscriber_activity WHERE subscriber_id = ? AND flow_id = ? AND type = 'complete_flow'");
    $stmt->execute([$sid, $flowId]);
    if (!$stmt->fetch()) {
        echo "Fixing: Adding missing Completion log for $sid\n";
        $pdo->prepare("INSERT INTO subscriber_activity (subscriber_id, flow_id, reference_id, type, reference_name, details, created_at) VALUES (?, ?, ?, 'complete_flow', 'Flow Finished', 'Flow finished (Sync Fix)', ?)")
            ->execute([$sid, $flowId, $endStepId, $finishedAt]);
    }
}

echo "\n--- Recalculating Stats for UI ---\n";
// 2. Fetch steps and update stats in flows table JSON
$stmt = $pdo->prepare("SELECT steps FROM flows WHERE id = ?");
$stmt->execute([$flowId]);
$steps = json_decode($stmt->fetchColumn(), true);

foreach ($steps as &$step) {
    $sid = $step['id'];
    $progressionTypes = [
        'sent_email',
        'receive_email',
        'process_action',
        'sent',
        'update_tag',
        'list_action',
        'enter_flow',
        'unsubscribe',
        'unsubscribed_from_flow',
        'delete_contact',
        'remove_action',
        'wait_processed',
        'condition_true',
        'condition_false',
        'ab_test_a',
        'ab_test_b',
        'advanced_condition',
        'zns_sent',
        'sent_zns',
        'zalo_sent',
        'zalo_clicked',
        'zns_clicked',
        'click_zns',
        'zns_skipped',
        'complete_flow'
    ];
    $placeholders = implode("','", $progressionTypes);
    $stmtCount = $pdo->prepare("SELECT COUNT(DISTINCT subscriber_id) FROM subscriber_activity WHERE flow_id = ? AND reference_id = ? AND type IN ('$placeholders')");
    $stmtCount->execute([$flowId, $sid]);
    $realCount = (int) $stmtCount->fetchColumn();

    if (!isset($step['stats']))
        $step['stats'] = [];
    $step['stats']['processed'] = $realCount;
    echo "Step $sid updated to $realCount\n";
}

$pdo->prepare("UPDATE flows SET steps = ?, stat_completed = (SELECT COUNT(DISTINCT subscriber_id) FROM subscriber_flow_states WHERE flow_id = ? AND status = 'completed') WHERE id = ?")
    ->execute([json_encode($steps), $flowId, $flowId]);

echo "\nDONE. The numbers should now be perfectly aligned.";
echo "</pre>";
?>