<?php
include 'api/db_connect.php';
$id = '69de8f0a1bf19';

echo "--- CAMPAIGN DATA ---\n";
$stmt = $pdo->prepare("SELECT id, name, status, count_sent, total_target_audience, sent_at FROM campaigns WHERE id = ?");
$stmt->execute([$id]);
print_r($stmt->fetch(PDO::FETCH_ASSOC));

echo "\n--- LOCKS (processing_campaign) ---\n";
$stmt = $pdo->prepare("SELECT count(*) as total FROM subscriber_activity WHERE campaign_id = ? AND type = 'processing_campaign'");
$stmt->execute([$id]);
print_r($stmt->fetch(PDO::FETCH_ASSOC));

echo "\n--- RECENT WORKER LOGS ---\n";
$stmt = $pdo->prepare("SELECT * FROM subscriber_activity WHERE campaign_id = ? ORDER BY id DESC LIMIT 3");
$stmt->execute([$id]);
print_r($stmt->fetchAll(PDO::FETCH_ASSOC));

echo "\n--- SENDER LOG FILE (Last 10 lines) ---\n";
$logFile = 'api/worker_campaign.log';
if (file_exists($logFile)) {
    $lines = file($logFile);
    echo implode("", array_slice($lines, -10));
} else {
    echo "Log file not found.\n";
}
