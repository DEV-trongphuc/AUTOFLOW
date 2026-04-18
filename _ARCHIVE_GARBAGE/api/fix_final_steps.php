<?php
require_once 'db_connect.php';

$flowId = 'ad16ed97-06b8-49a6-a8da-222c93191db0';

echo "<pre>";
echo "--- Fixing 'final' step_id discrepancy ---\n";

// 1. Find all subscribers in this flow with step_id = 'final'
$stmt = $pdo->prepare("SELECT subscriber_id FROM subscriber_flow_states WHERE flow_id = ? AND step_id = 'final'");
$stmt->execute([$flowId]);
$subs = $stmt->fetchAll(PDO::FETCH_COLUMN);

echo "Found " . count($subs) . " subscribers with step_id = 'final'.\n";

$fixedCount = 0;
foreach ($subs as $sid) {
    // 2. Find their latest complete_flow activity to get the real step_id
    $stmt = $pdo->prepare("SELECT reference_id FROM subscriber_activity WHERE subscriber_id = ? AND flow_id = ? AND type = 'complete_flow' ORDER BY created_at DESC LIMIT 1");
    $stmt->execute([$sid, $flowId]);
    $realStepId = $stmt->fetchColumn();

    if ($realStepId && $realStepId !== 'final') {
        $pdo->prepare("UPDATE subscriber_flow_states SET step_id = ? WHERE subscriber_id = ? AND flow_id = ? AND step_id = 'final'")
            ->execute([$realStepId, $sid, $flowId]);
        $fixedCount++;
    }
}

echo "Fixed $fixedCount subscribers.\n";
echo "</pre>";
