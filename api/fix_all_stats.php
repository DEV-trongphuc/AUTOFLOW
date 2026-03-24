<?php
require_once 'db_connect.php';

echo "<pre>";
echo "--- Fixing Discrepancy in Flow Stats ---\n";

$flowId = 'ad16ed97-06b8-49a6-a8da-222c93191db0';

// 1. Fetch current steps
$stmt = $pdo->prepare("SELECT steps FROM flows WHERE id = ?");
$stmt->execute([$flowId]);
$stepsJson = $stmt->fetchColumn();
$steps = json_decode($stepsJson, true);

if (!$steps) {
    echo "Steps not found.\n";
    exit;
}

echo "Flow found. Steps count: " . count($steps) . "\n";

foreach ($steps as &$step) {
    $sid = $step['id'];
    $type = $step['type'];
    echo "Processing Step: $sid ($type - {$step['label']})\n";

    // Count unique subscribers who passed this step in reality (subscriber_activity)
    // We count ANY progression activity for this step
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

    echo "  -> Real unique count from activity: $realCount\n";

    // Check current stats in JSON (if they exist)
    if (!isset($step['stats'])) {
        $step['stats'] = [];
    }

    // The UI uses 'processed' for "ĐÃ ĐI QUA"
    $step['stats']['processed'] = $realCount;

    // For Condition steps, check branch details
    if ($type === 'condition') {
        $stmtTrue = $pdo->prepare("SELECT COUNT(DISTINCT subscriber_id) FROM subscriber_activity WHERE flow_id = ? AND reference_id = ? AND type = 'condition_true'");
        $stmtTrue->execute([$flowId, $sid]);
        $trueCount = (int) $stmtTrue->fetchColumn();

        $stmtFalse = $pdo->prepare("SELECT COUNT(DISTINCT subscriber_id) FROM subscriber_activity WHERE flow_id = ? AND reference_id = ? AND type = 'condition_false'");
        $stmtFalse->execute([$flowId, $sid]);
        $falseCount = (int) $stmtFalse->fetchColumn();

        echo "  -> Branch stats: IF: $trueCount, ELSE: $falseCount\n";
        $step['stats']['matched'] = $trueCount;
        $step['stats']['timed_out'] = $falseCount;
    }
}

// 2. Save back to flows table
$newStepsJson = json_encode($steps);
$stmtUpdate = $pdo->prepare("UPDATE flows SET steps = ? WHERE id = ?");
$stmtUpdate->execute([$newStepsJson, $flowId]);
echo "\nFlow steps updated in database.\n";

// 3. Update global stat_completed
$stmtRecap = $pdo->prepare("SELECT COUNT(DISTINCT subscriber_id) as enrolled, COUNT(DISTINCT CASE WHEN status = 'completed' THEN subscriber_id END) as completed FROM subscriber_flow_states WHERE flow_id = ?");
$stmtRecap->execute([$flowId]);
$recap = $stmtRecap->fetch();
$pdo->prepare("UPDATE flows SET stat_enrolled = ?, stat_completed = ? WHERE id = ?")
    ->execute([$recap['enrolled'], $recap['completed'], $flowId]);
echo "Global stats updated: Enrolled: {$recap['enrolled']}, Completed: {$recap['completed']}\n";

echo "\nDONE. Please refresh the browser.";
echo "</pre>";
?>