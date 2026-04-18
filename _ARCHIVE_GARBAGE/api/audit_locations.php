<?php
header('Content-Type: text/plain; charset=utf-8');
require_once 'db_connect.php';

$cid = '6985cffc6c490';
echo "LOCATION DATA AUDIT\n";
echo "===================\n\n";

try {
    $stmt = $pdo->prepare("SELECT location, COUNT(*) as count FROM subscriber_activity WHERE campaign_id = ? AND type IN ('open_email', 'click_link') GROUP BY location");
    $stmt->execute([$cid]);
    $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

    if (empty($rows)) {
        echo "No location data found at all.\n";
    } else {
        foreach ($rows as $r) {
            echo " - " . ($r['location'] ?: 'Unknown') . ": " . $r['count'] . "\n";
        }
    }

    echo "\nChecking IP Addresses for recovery:\n";
    $stmt = $pdo->prepare("SELECT ip_address, location, COUNT(*) as count FROM subscriber_activity WHERE campaign_id = ? AND ip_address IS NOT NULL AND ip_address != '' GROUP BY ip_address, location LIMIT 10");
    $stmt->execute([$cid]);
    while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
        echo " - IP: {$row['ip_address']} | Loc: " . ($row['location'] ?: 'NULL') . "\n";
    }

} catch (Exception $e) {
    echo "Error: " . $e->getMessage();
}
