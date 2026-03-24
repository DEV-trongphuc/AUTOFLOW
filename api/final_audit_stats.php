<?php
header('Content-Type: text/plain; charset=utf-8');
require_once 'db_connect.php';

$cid = '6985cffc6c490';
echo "CAMPAIGN FINAL AUDIT: $cid\n";
echo "=============================\n\n";

try {
    $stmt = $pdo->prepare("SELECT name, count_sent, count_unique_opened, count_opened FROM campaigns WHERE id = ?");
    $stmt->execute([$cid]);
    $camp = $stmt->fetch(PDO::FETCH_ASSOC);

    echo "Campaign Name: {$camp['name']}\n";
    echo "Reported Sent: {$camp['count_sent']}\n";
    echo "Reported Unique Opened: {$camp['count_unique_opened']}\n";
    echo "Reported Total Opened: {$camp['count_opened']}\n\n";

    echo "Verifying from subscriber_activity table:\n";
    $stmt = $pdo->prepare("SELECT COUNT(*) FROM subscriber_activity WHERE campaign_id = ? AND type = 'receive_email'");
    $stmt->execute([$cid]);
    echo " - Actual Receive Logs: " . $stmt->fetchColumn() . "\n";

    $stmt = $pdo->prepare("SELECT COUNT(DISTINCT subscriber_id) FROM subscriber_activity WHERE campaign_id = ? AND type = 'open_email'");
    $stmt->execute([$cid]);
    echo " - Actual Unique Open Logs: " . $stmt->fetchColumn() . "\n";

    $stmt = $pdo->prepare("SELECT COUNT(*) FROM subscriber_activity WHERE campaign_id = ? AND type = 'open_email'");
    $stmt->execute([$cid]);
    echo " - Actual Total Open Logs: " . $stmt->fetchColumn() . "\n";

} catch (Exception $e) {
    echo "Error: " . $e->getMessage();
}
