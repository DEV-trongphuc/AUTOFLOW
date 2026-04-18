<?php
// api/check_email_logs.php
require_once 'db_connect.php';

$subscriberId = '695f37ac7fc61'; // From previous logs
$flowId = 'af4895e2-ce65-4c6a-902c-229fda80b93f';

echo "<h2>Email Delivery Logs for Subscriber: $subscriberId</h2>";

$stmt = $pdo->prepare("SELECT * FROM mail_delivery_logs WHERE subscriber_id = ? ORDER BY sent_at DESC LIMIT 10");
$stmt->execute([$subscriberId]);
$logs = $stmt->fetchAll(PDO::FETCH_ASSOC);

if (empty($logs)) {
    echo "No email logs found for this subscriber.";
} else {
    echo "<table border='1' cellpadding='5'><tr><th>Time</th><th>Subject</th><th>Status</th><th>Error</th></tr>";
    foreach ($logs as $log) {
        echo "<tr>";
        echo "<td>{$log['sent_at']}</td>";
        echo "<td>{$log['subject']}</td>";
        echo "<td>{$log['status']}</td>";
        echo "<td>{$log['error_message']}</td>";
        echo "</tr>";
    }
    echo "</table>";
}

echo "<h3>Check Subscriber Activity</h3>";
$stmtAct = $pdo->prepare("SELECT * FROM subscriber_activity WHERE subscriber_id = ? ORDER BY created_at DESC LIMIT 10");
$stmtAct->execute([$subscriberId]);
$acts = $stmtAct->fetchAll(PDO::FETCH_ASSOC);

foreach ($acts as $act) {
    echo "{$act['created_at']} - <strong>{$act['type']}</strong>: {$act['details']}<br>";
}
