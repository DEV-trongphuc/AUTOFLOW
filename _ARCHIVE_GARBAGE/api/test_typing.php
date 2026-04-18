<?php
/**
 * Test typing indicator directly
 */
require_once 'db_connect.php';
require_once 'meta_sender.php';

// Get latest message
$stmt = $pdo->query("SELECT page_id, psid FROM meta_message_logs WHERE direction = 'inbound' ORDER BY created_at DESC LIMIT 1");
$msg = $stmt->fetch(PDO::FETCH_ASSOC);

if (!$msg) {
    die("No recent messages found");
}

$pageId = $msg['page_id'];
$psid = $msg['psid'];

echo "Testing typing indicator for PSID: $psid on Page: $pageId\n\n";

// Test mark_seen
echo "1. Sending mark_seen...\n";
$result1 = sendMetaSenderAction($pdo, $pageId, $psid, 'mark_seen');
echo "Result: " . json_encode($result1) . "\n\n";

sleep(1);

// Test typing_on
echo "2. Sending typing_on...\n";
$result2 = sendMetaSenderAction($pdo, $pageId, $psid, 'typing_on');
echo "Result: " . json_encode($result2) . "\n\n";

sleep(3);

// Test typing_off
echo "3. Sending typing_off...\n";
$result3 = sendMetaSenderAction($pdo, $pageId, $psid, 'typing_off');
echo "Result: " . json_encode($result3) . "\n\n";

echo "Done! Check your Messenger to see if typing appeared.\n";
