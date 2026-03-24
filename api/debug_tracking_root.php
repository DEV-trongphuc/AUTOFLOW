<?php
require_once 'api/db_connect.php';

echo "--- TRACKING STATUS ---\n";
echo "API_BASE_URL: " . API_BASE_URL . "\n";
echo "Protocol: " . (isset($_SERVER['HTTPS']) ? 'https' : 'http') . "\n";
echo "Host: " . ($_SERVER['HTTP_HOST'] ?? 'CLI') . "\n";

$cid = '6985cffc6c490';
$stmt = $pdo->prepare("SELECT count_sent, count_opened, count_clicked, status FROM campaigns WHERE id = ?");
$stmt->execute([$cid]);
$c = $stmt->fetch();

echo "\n--- Campaign 6985cffc6c490 ---\n";
echo "Status: " . ($c['status'] ?? 'N/A') . "\n";
echo "Sent: " . ($c['count_sent'] ?? 0) . "\n";
echo "Opened: " . ($c['count_opened'] ?? 0) . "\n";
echo "Clicked: " . ($c['count_clicked'] ?? 0) . "\n";

// Reset to sending if it was Sent prematurely
if ($c['status'] === 'sent' && $c['count_sent'] < 1500) {
    $pdo->prepare("UPDATE campaigns SET status = 'sending' WHERE id = ?")->execute([$cid]);
    echo "ACTION: Campaign status RESET to 'sending'.\n";
}
