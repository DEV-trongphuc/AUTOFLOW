<?php
// api/debug_campaign_clicks.php
error_reporting(E_ALL);
ini_set('display_errors', 1);

require_once 'db_connect.php';

$campaignId = '69594d0719832';

echo "<pre>";
echo "Campaign ID: $campaignId\n\n";

// Test exact query from campaigns.php
$sql = "SELECT details, COUNT(*) as total_clicks, COUNT(DISTINCT subscriber_id) as unique_clicks 
        FROM subscriber_activity 
        WHERE campaign_id = ? AND type = 'click_link'
        GROUP BY details 
        ORDER BY total_clicks DESC";

$stmt = $pdo->prepare($sql);
$stmt->execute([$campaignId]);
$links = $stmt->fetchAll(PDO::FETCH_ASSOC);

echo "Query: $sql\n";
echo "Params: [$campaignId]\n\n";
echo "Results: " . count($links) . " links\n\n";

if (empty($links)) {
    echo "NO RESULTS!\n\n";

    // Debug: Check if clicks exist
    $stmt2 = $pdo->prepare("SELECT * FROM subscriber_activity WHERE campaign_id = ? AND type = 'click_link' LIMIT 5");
    $stmt2->execute([$campaignId]);
    $clicks = $stmt2->fetchAll(PDO::FETCH_ASSOC);

    echo "Raw clicks for this campaign:\n";
    print_r($clicks);

    // Check campaign_id format
    $stmt3 = $pdo->query("SELECT DISTINCT campaign_id, LENGTH(campaign_id) as len FROM subscriber_activity WHERE type = 'click_link'");
    $allCampaigns = $stmt3->fetchAll(PDO::FETCH_ASSOC);

    echo "\n\nAll campaign IDs with clicks:\n";
    foreach ($allCampaigns as $c) {
        echo "  ID: '{$c['campaign_id']}' (length: {$c['len']})\n";
    }

} else {
    foreach ($links as $link) {
        echo "Link: {$link['details']}\n";
        echo "  Total: {$link['total_clicks']}\n";
        echo "  Unique: {$link['unique_clicks']}\n\n";
    }
}

echo "</pre>";
?>