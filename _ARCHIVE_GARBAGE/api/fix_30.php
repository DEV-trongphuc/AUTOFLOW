<?php
require 'db_connect.php';

// Fix the 30 people who got stuck with 08:00
$stmt = $pdo->prepare("SELECT subscriber_id FROM subscriber_flow_states WHERE flow_id = '69dca73f0d951' AND scheduled_at = '2026-04-14 08:00:00'");
$stmt->execute();
$subs = $stmt->fetchAll(PDO::FETCH_COLUMN);

if (!empty($subs)) {
    $placeholders = implode(',', array_fill(0, count($subs), '?'));
    // Set them to 15:25:51 tomorrow
    $pdo->prepare("UPDATE subscriber_flow_states SET scheduled_at = '2026-04-14 15:25:51' WHERE subscriber_id IN ($placeholders) AND flow_id = '69dca73f0d951'")->execute($subs);
    echo "Fixed " . count($subs) . " subscribers to perfectly match the rest of the campaign.\n";
} else {
    echo "No subscribers found to fix.\n";
}
