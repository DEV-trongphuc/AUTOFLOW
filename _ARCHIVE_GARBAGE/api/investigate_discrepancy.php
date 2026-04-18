<?php
require_once 'db_connect.php';

$flowId = 'ad16ed97-06b8-49a6-a8da-222c93191db0';
$conditionStepId = '80966800-d4c1-4afd-9393-4290aceb9fc1';
$tagStepId = 'd327fe62-c975-4bbe-bb3a-a352c409de86';

echo "<pre>";
echo "--- Investigating Discrepancy (36 vs 35) ---\n";

// 1. Get subscribers who matched Condition True
$stmt = $pdo->prepare("SELECT DISTINCT subscriber_id FROM subscriber_activity WHERE flow_id = ? AND reference_id = ? AND type = 'condition_true'");
$stmt->execute([$flowId, $conditionStepId]);
$matchedSubs = $stmt->fetchAll(PDO::FETCH_COLUMN);
echo "Subscribers who matched Condition True: " . count($matchedSubs) . "\n";

// 2. Get subscribers who reached Tag step
$stmt = $pdo->prepare("SELECT DISTINCT subscriber_id FROM subscriber_activity WHERE flow_id = ? AND reference_id = ? AND type = 'update_tag'");
$stmt->execute([$flowId, $tagStepId]);
$tagSubs = $stmt->fetchAll(PDO::FETCH_COLUMN);
echo "Subscribers who reached Tag step: " . count($tagSubs) . "\n";

// 3. Find the missing one(s)
$missing = array_diff($matchedSubs, $tagSubs);
echo "Missing Subscriber IDs: " . implode(', ', $missing) . "\n";

foreach ($missing as $sid) {
    echo "\nAnalyzing Missing Subscriber: $sid\n";

    // Check their current state
    $stmt = $pdo->prepare("SELECT * FROM subscriber_flow_states WHERE subscriber_id = ? AND flow_id = ?");
    $stmt->execute([$sid, $flowId]);
    $state = $stmt->fetch();
    echo "Current Flow State: " . json_encode($state, JSON_PRETTY_PRINT) . "\n";

    // Check all their activity for this flow
    $stmt = $pdo->prepare("SELECT * FROM subscriber_activity WHERE subscriber_id = ? AND flow_id = ? ORDER BY created_at ASC");
    $stmt->execute([$sid, $flowId]);
    $activities = $stmt->fetchAll();
    echo "Activity History:\n";
    foreach ($activities as $a) {
        echo "  [{$a['created_at']}] {$a['type']} - Ref: {$a['reference_id']}\n";
    }
}

echo "</pre>";
?>