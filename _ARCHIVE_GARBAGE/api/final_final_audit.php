<?php
header('Content-Type: text/plain; charset=utf-8');
require_once 'db_connect.php';

$cid = '6985cffc6c490';
echo "CAMPAIGN FINAL VERIFICATION\n";
echo "===========================\n\n";

try {
    $stmt = $pdo->prepare("SELECT name, count_sent, count_unique_opened, count_opened, count_unique_clicked, count_clicked FROM campaigns WHERE id = ?");
    $stmt->execute([$cid]);
    $camp = $stmt->fetch(PDO::FETCH_ASSOC);

    echo "Campaign: {$camp['name']}\n";
    echo "Sent: {$camp['count_sent']}\n";
    echo "Unique Opens: {$camp['count_unique_opened']}\n";
    echo "Total Opens: {$camp['count_opened']}\n";
    echo "Unique Clicks: {$camp['count_unique_clicked']}\n";
    echo "Total Clicks: {$camp['count_clicked']}\n\n";

    echo "Activity Logs Check:\n";
    $stmt = $pdo->prepare("SELECT type, COUNT(*) as total, COUNT(DISTINCT subscriber_id) as unique_subs FROM subscriber_activity WHERE campaign_id = ? GROUP BY type");
    $stmt->execute([$cid]);
    while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
        echo " - {$row['type']}: Total={$row['total']} | Unique={$row['unique_subs']}\n";
    }

} catch (Exception $e) {
    echo "Error: " . $e->getMessage();
}
