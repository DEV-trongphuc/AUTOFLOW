<?php
require_once 'db_connect.php';

$subscriberId = '36365f62-117f-4756-aadb-bac4c5b3a5fa'; // Phuc
$flowId = '808da9d3-dca9-475b-844f-5df52ac0508b'; // Flow

// 1. Find all waiting states for this user in this flow
$stmt = $pdo->prepare("SELECT id, status, updated_at FROM subscriber_flow_states WHERE subscriber_id = ? AND flow_id = ? AND status = 'waiting' ORDER BY updated_at DESC");
$stmt->execute([$subscriberId, $flowId]);
$rows = $stmt->fetchAll();

echo "Found " . count($rows) . " waiting states.\n";

if (count($rows) > 1) {
    // Keep the LATEST one (first in array due to DESC sort)
    $keepId = $rows[0]['id'];
    echo "Keeping Latest ID: $keepId (Updated: {$rows[0]['updated_at']})\n";

    $deleteIds = [];
    for ($i = 1; $i < count($rows); $i++) {
        $deleteIds[] = $rows[$i]['id'];
    }

    if (!empty($deleteIds)) {
        $idsStr = implode(',', $deleteIds);
        $pdo->exec("DELETE FROM subscriber_flow_states WHERE id IN ($idsStr)");
        echo "Deleted duplicates: $idsStr\n";
    }
} else {
    echo "No duplicates found.\n";
}
