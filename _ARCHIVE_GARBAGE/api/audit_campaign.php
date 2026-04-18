<?php
header('Content-Type: text/plain; charset=utf-8');
require_once 'db_connect.php';

$cid = '6985cffc6c490';
echo "Comprehensive Data Audit for Campaign: $cid\n";
echo "=============================================\n\n";

try {
    // 1. Check campaigns table stats
    $stmt = $pdo->prepare("SELECT * FROM campaigns WHERE id = ?");
    $stmt->execute([$cid]);
    $camp = $stmt->fetch(PDO::FETCH_ASSOC);
    echo "Stats in campaigns table:\n";
    echo " - Sent: " . $camp['count_sent'] . "\n";
    echo " - Unique Opened: " . $camp['count_unique_opened'] . "\n";
    echo " - Total Opened: " . $camp['count_opened'] . "\n\n";

    // 2. Sample 5 Subscribers who were sent this campaign
    echo "Sample of 5 subscribers linked to this campaign in subscriber_activity:\n";
    $stmt = $pdo->prepare("SELECT subscriber_id, type, created_at FROM subscriber_activity WHERE campaign_id = ? LIMIT 5");
    $stmt->execute([$cid]);
    while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
        echo " - Sub ID: {$row['subscriber_id']} | Type: {$row['type']} | Created: {$row['created_at']}\n";
    }

    // 3. Check for 'receive_email' records specifically
    $stmt = $pdo->prepare("SELECT COUNT(*) FROM subscriber_activity WHERE campaign_id = ? AND type = 'receive_email'");
    $stmt->execute([$cid]);
    echo "\nTotal 'receive_email' records with this CID: " . $stmt->fetchColumn() . "\n";

    // 4. Check for 'open_email' records globally that might belong here
    echo "\nSearching for 'open_email' without CID but linked to flow ad16ed97-06b8-49a6-a8da-222c93191db0 (Flow 1):\n";
    $stmt = $pdo->prepare("SELECT COUNT(*) FROM subscriber_activity WHERE type = 'open_email' AND flow_id = 'ad16ed97-06b8-49a6-a8da-222c93191db0' AND (campaign_id IS NULL OR campaign_id = '')");
    $stmt->execute();
    echo " - Found: " . $stmt->fetchColumn() . "\n";

    echo "Searching for 'open_email' without CID but linked to flow 808da9d3-dca9-475b-844f-5df52ac0508b (Flow 2):\n";
    $stmt = $pdo->prepare("SELECT COUNT(*) FROM subscriber_activity WHERE type = 'open_email' AND flow_id = '808da9d3-dca9-475b-844f-5df52ac0508b' AND (campaign_id IS NULL OR campaign_id = '')");
    $stmt->execute();
    echo " - Found: " . $stmt->fetchColumn() . "\n";

} catch (Exception $e) {
    echo "Error: " . $e->getMessage();
}
