<?php
header('Content-Type: text/plain; charset=utf-8');
require_once 'db_connect.php';

$cid = '6985cffc6c490';
echo "DEEP AUDIT START\n";
echo "================\n";

try {
    // 1. Check all activity types in the entire table to see what's common
    echo "\nGlobal Activity Counts (Top 10):\n";
    $stmt = $pdo->query("SELECT type, COUNT(*) as count FROM subscriber_activity GROUP BY type ORDER BY count DESC LIMIT 10");
    while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
        echo " - {$row['type']}: {$row['count']}\n";
    }

    // 2. Check activities for our CID specifically (ALL types)
    echo "\nAll activity types for CID $cid:\n";
    $stmt = $pdo->prepare("SELECT type, COUNT(*) as count FROM subscriber_activity WHERE campaign_id = ? GROUP BY type");
    $stmt->execute([$cid]);
    while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
        echo " - {$row['type']}: {$row['count']}\n";
    }

    // 3. Check for 'receive_email' records for THIS campaign name or subject if CID failed
    $stmt = $pdo->prepare("SELECT name, subject FROM campaigns WHERE id = ?");
    $stmt->execute([$cid]);
    $camp = $stmt->fetch(PDO::FETCH_ASSOC);
    $cName = $camp['name'] ?? '';

    echo "\nSearching for 'receive_email' by Reference Name ($cName):\n";
    $stmt = $pdo->prepare("SELECT campaign_id, COUNT(*) as count FROM subscriber_activity WHERE type = 'receive_email' AND reference_name = ? GROUP BY campaign_id");
    $stmt->execute([$cName]);
    while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
        echo " - CID: " . ($row['campaign_id'] ?: 'NULL') . " | Count: " . $row['count'] . "\n";
    }

    // 4. Check mail_delivery_logs
    echo "\nChecking mail_delivery_logs for CID $cid:\n";
    $stmt = $pdo->prepare("SELECT status, COUNT(*) as count FROM mail_delivery_logs WHERE campaign_id = ? GROUP BY status");
    $stmt->execute([$cid]);
    while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
        echo " - {$row['status']}: {$row['count']}\n";
    }

    // 5. Sample an 'open_email' record for Flow 808da9d3-dca9-475b-844f-5df52ac0508b
    echo "\nSample 'open_email' for Flow 808da9d3-dca9-475b-844f-5df52ac0508b:\n";
    $stmt = $pdo->prepare("SELECT * FROM subscriber_activity WHERE type = 'open_email' AND flow_id = '808da9d3-dca9-475b-844f-5df52ac0508b' LIMIT 1");
    $stmt->execute();
    $sample = $stmt->fetch(PDO::FETCH_ASSOC);
    if ($sample) {
        print_r($sample);
    } else {
        echo "None found.\n";
    }

    // 6. check raw_event_buffer
    $stmt = $pdo->query("SELECT COUNT(*) FROM raw_event_buffer WHERE processed = 0");
    echo "\nUnprocessed raw events: " . $stmt->fetchColumn() . "\n";

} catch (Exception $e) {
    echo "Error: " . $e->getMessage();
}
