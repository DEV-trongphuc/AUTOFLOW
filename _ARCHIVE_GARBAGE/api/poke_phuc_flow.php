<?php
require_once 'db_connect.php';

$email = 'phucht@ideas.edu.vn';
$flowId = '808da9d3-dca9-475b-844f-5df52ac0508b';

// 1. Get subscriber ID
$stmt = $pdo->prepare("SELECT id FROM subscribers WHERE email = ?");
$stmt->execute([$email]);
$subId = $stmt->fetchColumn();

if (!$subId) {
    echo "Subscriber not found.\n";
    exit;
}

// 2. Find the current waiting state
$stmt = $pdo->prepare("SELECT id FROM subscriber_flow_states WHERE subscriber_id = ? AND flow_id = ? AND status = 'waiting'");
$stmt->execute([$subId, $flowId]);
$queueId = $stmt->fetchColumn();

if (!$queueId) {
    echo "No waiting state found for this user in this flow.\n";
    // Check if processing
    $stmt = $pdo->prepare("SELECT id FROM subscriber_flow_states WHERE subscriber_id = ? AND flow_id = ? AND status = 'processing'");
    $stmt->execute([$subId, $flowId]);
    $queueId = $stmt->fetchColumn();
    if ($queueId) {
        echo "User is currently in 'processing' status. Waiting for worker...\n";
    }
    exit;
}

echo "Found waiting state ID: $queueId. Poking worker...\n";

// 3. Poke the worker directly
$url = API_BASE_URL . "/worker_flow.php?priority_queue_id=$queueId&subscriber_id=$subId&priority_flow_id=$flowId";
echo "URL: $url\n";

$ch = curl_init($url);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_TIMEOUT, 30);
$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

echo "HTTP Code: $httpCode\n";
echo "Response: $response\n";
