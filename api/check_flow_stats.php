<?php
header('Content-Type: text/plain; charset=utf-8');
require_once 'db_connect.php';

echo "FLOW STATS CHECK\n";
echo "================\n\n";

try {
    $fid = '808da9d3-dca9-475b-844f-5df52ac0508b';
    $stmt = $pdo->prepare("SELECT name, stat_total_sent, stat_total_opened, stat_unique_opened FROM flows WHERE id = ?");
    $stmt->execute([$fid]);
    $flow = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$flow) {
        echo "Flow $fid not found.\n";
    } else {
        echo "Flow Name: " . $flow['name'] . "\n";
        echo "Total Sent: " . ($flow['stat_total_sent'] ?? 0) . "\n";
        echo "Total Opened: " . ($flow['stat_total_opened'] ?? 0) . "\n";
        echo "Unique Opened: " . ($flow['stat_unique_opened'] ?? 0) . "\n";
    }

    // Check recent opens specifically for this flow
    $stmt = $pdo->prepare("SELECT COUNT(DISTINCT subscriber_id) FROM subscriber_activity WHERE type = 'open_email' AND flow_id = ? AND created_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)");
    $stmt->execute([$fid]);
    echo "\nUnique Opens for this flow in last 24h: " . $stmt->fetchColumn() . "\n";

} catch (Exception $e) {
    echo "Error: " . $e->getMessage();
}
