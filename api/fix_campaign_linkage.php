<?php
require_once 'bootstrap.php';
initializeSystem($pdo);

echo "Starting Campaign Linkage Fix...\n";

// 1. Find all flows with campaign triggers
$stmt = $pdo->query("SELECT id, name, steps FROM flows WHERE steps LIKE '%\"type\":\"campaign\"%'");
$flows = $stmt->fetchAll();

foreach ($flows as $flow) {
    $steps = json_decode($flow['steps'], true);
    $campaignId = null;
    foreach ($steps as $step) {
        if (($step['type'] ?? '') === 'trigger' && ($step['config']['type'] ?? '') === 'campaign') {
            $campaignId = $step['config']['targetId'] ?? $step['config']['campaignId'] ?? null;
            break;
        }
    }

    if ($campaignId) {
        echo "Found Flow '{$flow['name']}' linked to Campaign '{$campaignId}'\n";

        // Update subscriber_activity
        $stmtAct = $pdo->prepare("UPDATE subscriber_activity SET campaign_id = ? WHERE flow_id = ? AND campaign_id IS NULL");
        $stmtAct->execute([$campaignId, $flow['id']]);
        $actCount = $stmtAct->rowCount();

        // Update mail_delivery_logs
        $stmtLog = $pdo->prepare("UPDATE mail_delivery_logs SET campaign_id = ? WHERE flow_id = ? AND campaign_id IS NULL");
        $stmtLog->execute([$campaignId, $flow['id']]);
        $logCount = $stmtLog->rowCount();

        echo "  -> Linked $actCount activities and $logCount delivery logs.\n";

        // Update campaign count_sent for good measure
        $stmtCount = $pdo->prepare("
            UPDATE campaigns s 
            SET count_sent = (SELECT COUNT(DISTINCT subscriber_id) FROM subscriber_activity WHERE campaign_id = s.id AND type IN ('receive_email', 'zns_sent', 'zalo_sent', 'meta_sent'))
            WHERE id = ?
        ");
        $stmtCount->execute([$campaignId]);
    }
}

echo "Fix Completed.\n";
