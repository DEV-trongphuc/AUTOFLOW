<?php
// api/inspect_clicks.php
require_once __DIR__ . '/db_connect.php';

$campaignId = $_GET['id'] ?? '6a476873248e1';

header("Content-Type: text/plain");
echo "Diagnostic for Campaign ID: $campaignId\n";

try {
    // 1. Overall clicks and unique clicks
    $q1 = $pdo->prepare("SELECT COUNT(*) as total, COUNT(DISTINCT subscriber_id) as unique_users FROM subscriber_activity WHERE campaign_id = ? AND type = 'click_link'");
    $q1->execute([$campaignId]);
    echo "1. Overall stats:\n";
    print_r($q1->fetch(PDO::FETCH_ASSOC));

    // 2. Group by device_type
    echo "\n2. Group by device_type:\n";
    $q2 = $pdo->prepare("SELECT device_type, COUNT(*) as total, COUNT(DISTINCT subscriber_id) as unique_users FROM subscriber_activity WHERE campaign_id = ? AND type = 'click_link' GROUP BY device_type");
    $q2->execute([$campaignId]);
    print_r($q2->fetchAll(PDO::FETCH_ASSOC));

    // 3. Let's see some samples of the user agent and device type
    echo "\n3. Sample of user agents and device types:\n";
    $q3 = $pdo->prepare("SELECT device_type, os, browser, location, user_agent, COUNT(*) as count FROM subscriber_activity WHERE campaign_id = ? AND type = 'click_link' GROUP BY device_type, os, browser, location, user_agent LIMIT 20");
    $q3->execute([$campaignId]);
    print_r($q3->fetchAll(PDO::FETCH_ASSOC));

} catch (Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
}
