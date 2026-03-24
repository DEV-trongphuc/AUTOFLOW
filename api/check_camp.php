<?php
require_once 'db_connect.php';

$cid = '6985cffc6c490';

echo "--- Campaign Detail ($cid) ---\n";
$stmt = $pdo->prepare("SELECT * FROM campaigns WHERE id = ?");
$stmt->execute([$cid]);
$camp = $stmt->fetch(PDO::FETCH_ASSOC);

if (!$camp) {
    die("Campaign not found.");
}

print_r([
    'id' => $camp['id'],
    'name' => $camp['name'],
    'status' => $camp['status'],
    'count_sent' => $camp['count_sent'],
    'total_target_audience' => $camp['total_target_audience'],
    'updated_at' => $camp['updated_at']
]);

echo "\n--- Activity Breakdown ---\n";
$stmtAct = $pdo->prepare("SELECT type, COUNT(*) as total FROM subscriber_activity WHERE campaign_id = ? GROUP BY type");
$stmtAct->execute([$cid]);
print_r($stmtAct->fetchAll(PDO::FETCH_ASSOC));

echo "\n--- Recent Delivery Logs ---\n";
$stmtLogs = $pdo->prepare("SELECT sent_at, recipient, status, error_message FROM mail_delivery_logs WHERE campaign_id = ? ORDER BY sent_at DESC LIMIT 5");
$stmtLogs->execute([$cid]);
print_r($stmtLogs->fetchAll(PDO::FETCH_ASSOC));
