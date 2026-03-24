<?php
require_once 'db_connect.php';

echo "Starting Flow ID Backfill for Activity Logs...\n";

// 1. Get all flows
$stmt = $pdo->query("SELECT id, name, steps FROM flows");
$flows = $stmt->fetchAll(PDO::FETCH_ASSOC);

$updatedCount = 0;

foreach ($flows as $flow) {
    $flowId = $flow['id'];
    $steps = json_decode($flow['steps'], true);

    if (!is_array($steps))
        continue;

    $stepIds = [];
    foreach ($steps as $step) {
        if (isset($step['id'])) {
            $stepIds[] = $step['id'];
        }
    }

    if (empty($stepIds))
        continue;

    // Convert to placeholders for SQL IN clause
    $placeholders = implode(',', array_fill(0, count($stepIds), '?'));

    // Update subscriber_activity
    // Map logs with reference_id matching these steps to this flow_id
    // But ONLY if flow_id is NULL (to avoid overwriting correct data if any)
    $sql = "UPDATE subscriber_activity
            SET flow_id = ?
            WHERE reference_id IN ($placeholders) AND flow_id IS NULL";

    // Params: flowId, then all stepIds
    $params = array_merge([$flowId], $stepIds);

    $stmtUpdate = $pdo->prepare($sql);
    $stmtUpdate->execute($params);
    $count = $stmtUpdate->rowCount();

    if ($count > 0) {
        echo "Flow: {$flow['name']} -> Updated $count log entries.\n";
        $updatedCount += $count;
    }
}

echo "Total updated entries: $updatedCount\n";
echo "Backfill Complete.\n";
?>