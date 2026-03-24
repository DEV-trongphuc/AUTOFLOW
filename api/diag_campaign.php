<?php
header('Content-Type: text/plain');
require_once 'db_connect.php'; // In api/ directory
$cid = '6985cffc6c490';

echo "Database Check for Campaign: $cid\n";
echo "====================================\n\n";

try {
    // 1. Check Campaign Record
    $stmt = $pdo->prepare("SELECT id, name, status, count_sent, count_unique_opened, count_opened, type, config FROM campaigns WHERE id = ?");
    $stmt->execute([$cid]);
    $campaign = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$campaign) {
        echo "[ERROR] Campaign NOT FOUND in campaigns table.\n";
    } else {
        echo "Campaign Name: " . $campaign['name'] . "\n";
        echo "Status: " . $campaign['status'] . "\n";
        echo "Type: " . $campaign['type'] . "\n";
        echo "Stats in campaigns table columns:\n";
        echo " - Sent: " . ($campaign['count_sent'] ?? 0) . "\n";
        echo " - Unique Opened: " . ($campaign['count_unique_opened'] ?? 0) . "\n";
        echo " - Total Opened: " . ($campaign['count_opened'] ?? 0) . "\n";
    }

    // 2. Search for related Flow
    $flowId = 'ad16ed97-06b8-49a6-a8da-222c93191db0';
    echo "\nChecking Flow: $flowId\n";

    // 3. Activities for this Campaign ID
    $stmt = $pdo->prepare("SELECT type, COUNT(*) as total, COUNT(DISTINCT subscriber_id) as unique_count FROM subscriber_activity WHERE campaign_id = ? GROUP BY type");
    $stmt->execute([$cid]);
    echo "\nActivities with campaign_id = $cid:\n";
    $results = $stmt->fetchAll(PDO::FETCH_ASSOC);
    if (empty($results))
        echo "None\n";
    foreach ($results as $a)
        echo " - " . $a['type'] . ": " . $a['total'] . " (" . $a['unique_count'] . " unique)\n";

    // 4. Activities for this Flow ID
    $stmt = $pdo->prepare("SELECT type, COUNT(*) as total, COUNT(DISTINCT subscriber_id) as unique_count FROM subscriber_activity WHERE flow_id = ? GROUP BY type");
    $stmt->execute([$flowId]);
    echo "\nActivities with flow_id = $flowId:\n";
    $results = $stmt->fetchAll(PDO::FETCH_ASSOC);
    if (empty($results))
        echo "None\n";
    foreach ($results as $a)
        echo " - " . $a['type'] . ": " . $a['total'] . " (" . $a['unique_count'] . " unique)\n";

    // 5. Activities with flow_id but NO campaign_id
    $stmt = $pdo->prepare("SELECT type, COUNT(*) as total FROM subscriber_activity WHERE flow_id = ? AND (campaign_id IS NULL OR campaign_id = '') GROUP BY type");
    $stmt->execute([$flowId]);
    echo "\nActivities with flow_id = $flowId AND NO campaign_id:\n";
    $results = $stmt->fetchAll(PDO::FETCH_ASSOC);
    if (empty($results))
        echo "None\n";
    foreach ($results as $a)
        echo " - " . $a['type'] . ": " . $a['total'] . "\n";

    // 6. Check for any 'open_email' in the last 48h that might be related
    echo "\nRecent 'open_email' activities (last 48h):\n";
    $stmt = $pdo->query("SELECT campaign_id, flow_id, COUNT(*) as total FROM subscriber_activity WHERE type = 'open_email' AND created_at >= DATE_SUB(NOW(), INTERVAL 2 DAY) GROUP BY campaign_id, flow_id");
    while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
        echo " - CID: " . ($row['campaign_id'] ?: 'NULL') . " | FID: " . ($row['flow_id'] ?: 'NULL') . " | Count: " . $row['total'] . "\n";
    }

} catch (Exception $e) {
    echo "\n[FATAL ERROR] " . $e->getMessage();
}
