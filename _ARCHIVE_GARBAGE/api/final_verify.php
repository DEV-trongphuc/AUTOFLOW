<?php
header('Content-Type: text/plain; charset=utf-8');
require_once 'db_connect.php';

$cid = '6985cffc6c490';
echo "FINAL VERIFICATION FOR CAMPAIGN: $cid\n";
echo "========================================\n\n";

try {
    // 1. Total activities of key types
    echo "Activity Counts after Recovery:\n";
    $stmt = $pdo->prepare("SELECT type, COUNT(*) as count FROM subscriber_activity WHERE campaign_id = ? GROUP BY type");
    $stmt->execute([$cid]);
    while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
        echo " - {$row['type']}: {$row['count']}\n";
    }

    // 2. Unique Opens
    $stmt = $pdo->prepare("SELECT COUNT(DISTINCT subscriber_id) FROM subscriber_activity WHERE campaign_id = ? AND type = 'open_email'");
    $stmt->execute([$cid]);
    echo "\nUnique Opens reported by subscriber_activity: " . $stmt->fetchColumn() . "\n";

    // 3. Update Campaign Stats manually just to be sure
    echo "\nTriggering stats update for UI...\n";
    $stmt = $pdo->prepare("
        UPDATE campaigns c 
        SET 
            count_sent = (SELECT COUNT(*) FROM subscriber_activity WHERE campaign_id = c.id AND type = 'receive_email'),
            count_unique_opened = (SELECT COUNT(DISTINCT subscriber_id) FROM subscriber_activity WHERE campaign_id = c.id AND type = 'open_email'),
            count_opened = (SELECT COUNT(*) FROM subscriber_activity WHERE campaign_id = c.id AND type = 'open_email')
        WHERE id = ?
    ");
    $stmt->execute([$cid]);
    echo "Campaign table stats updated.\n";

} catch (Exception $e) {
    echo "Error: " . $e->getMessage();
}
