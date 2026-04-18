<?php
header('Content-Type: text/plain; charset=utf-8');
require_once 'db_connect.php';

$cid = '6985cffc6c490';
echo "INVESTIGATING OPEN DATA DISCREPANCY\n";
echo "==================================\n\n";

try {
    // 1. Check unique subscribers for the 46 opens
    echo "Distribution of Open Emails by Subscriber:\n";
    $stmt = $pdo->prepare("SELECT subscriber_id, COUNT(*) as count FROM subscriber_activity WHERE campaign_id = ? AND type = 'open_email' GROUP BY subscriber_id");
    $stmt->execute([$cid]);
    $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
    foreach ($rows as $r) {
        echo " - Sub ID: {$r['subscriber_id']} | Count: {$r['count']}\n";
    }

    // 2. Check the Tracking Unique Cache again for details
    echo "\nTracking Unique Cache for CID $cid (Open events):\n";
    $stmt = $pdo->prepare("SELECT subscriber_id FROM tracking_unique_cache WHERE target_id = ? AND event_type = 'open'");
    $stmt->execute([$cid]);
    $cacheSubs = $stmt->fetchAll(PDO::FETCH_COLUMN);
    echo "Found " . count($cacheSubs) . " unique subscriber IDs in cache.\n";

    if (!empty($cacheSubs)) {
        // Sample first 5
        echo "Sample Cache Sub IDs: " . implode(', ', array_slice($cacheSubs, 0, 5)) . "\n";

        // Check if these Sub IDs have ANY open_email records currently
        $placeholders = implode(',', array_fill(0, min(5, count($cacheSubs)), '?'));
        $stmtAct = $pdo->prepare("SELECT subscriber_id, campaign_id, flow_id, type FROM subscriber_activity WHERE subscriber_id IN ($placeholders) AND type = 'open_email'");
        $stmtAct->execute(array_slice($cacheSubs, 0, 5));
        echo "\nActivity Check for Sample Cache Subscribers:\n";
        while ($act = $stmtAct->fetch(PDO::FETCH_ASSOC)) {
            echo " - Sub: {$act['subscriber_id']} | Type: {$act['type']} | CID: " . ($act['campaign_id'] ?: 'NULL') . " | FID: " . ($act['flow_id'] ?: 'NULL') . "\n";
        }
    }

} catch (Exception $e) {
    echo "Error: " . $e->getMessage();
}
