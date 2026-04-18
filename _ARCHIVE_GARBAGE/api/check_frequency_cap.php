<?php
// api/check_frequency_cap.php
require_once 'db_connect.php';

$subscriberEmail = 'marketing@ideas.edu.vn'; // From trace before
$flowId = 'af4895e2-ce65-4c6a-902c-229fda80b93f';

echo "<h2>Frequency Cap Check</h2>";
echo "Email: $subscriberEmail<br>";
echo "Flow ID: $flowId<br>";

// 1. Check Flow Config Cap
$stmtFlow = $pdo->prepare("SELECT config FROM flows WHERE id = ?");
$stmtFlow->execute([$flowId]);
$row = $stmtFlow->fetch(PDO::FETCH_ASSOC);
$config = json_decode($row['config'] ?? '{}', true);
$cap = $config['frequencyCap'] ?? 3;

echo "<strong>Daily Cap Limit:</strong> $cap<br>";

// 2. Count Sent Emails Today
$todayStart = date('Y-m-d 00:00:00');
echo "Checking sent from: $todayStart<br>";

$stmtCap = $pdo->prepare("SELECT COUNT(*) FROM mail_delivery_logs WHERE recipient = ? AND flow_id = ? AND status = 'success' AND sent_at >= ?");
$stmtCap->execute([$subscriberEmail, $flowId, $todayStart]);
$sentCount = (int) $stmtCap->fetchColumn();

echo "<strong>Sent Today:</strong> $sentCount<br>";

if ($sentCount >= $cap) {
    echo "<h3 style='color:red'>CAP REACHED!</h3>";
    echo "The system will delay next emails by 1 hour until the cap resets (at midnight) or you increase the limit.";
} else {
    echo "<h3 style='color:green'>Within Limits.</h3>";
}
