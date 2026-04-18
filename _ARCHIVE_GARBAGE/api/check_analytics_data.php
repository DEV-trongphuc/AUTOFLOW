<?php
header('Content-Type: text/plain; charset=utf-8');
require_once 'db_connect.php';

echo "CHECKING CAMPAIGN ANALYTICS COLUMNS\n";
echo "==================================\n\n";

try {
    $stmt = $pdo->query("DESCRIBE campaigns");
    while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
        if (strpos($row['Field'], 'stat_') === 0) {
            echo " - {$row['Field']} ({$row['Type']})\n";
        }
    }

    echo "\nSample Analytics Data for 6985cffc6c490:\n";
    $stmt = $pdo->prepare("SELECT * FROM campaigns WHERE id = '6985cffc6c490'");
    $stmt->execute();
    $camp = $stmt->fetch(PDO::FETCH_ASSOC);
    foreach ($camp as $k => $v) {
        if (strpos($k, 'stat_') === 0 && !empty($v)) {
            echo " $k: $v\n";
        }
    }

    echo "\nChecking subscriber_activity data for this CID:\n";
    $stmt = $pdo->prepare("SELECT device_type, os, browser, location, COUNT(*) as count FROM subscriber_activity WHERE campaign_id = '6985cffc6c490' AND type = 'open_email' GROUP BY device_type, os, browser, location");
    $stmt->execute();
    $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
    print_r($rows);

} catch (Exception $e) {
    echo "Error: " . $e->getMessage();
}
