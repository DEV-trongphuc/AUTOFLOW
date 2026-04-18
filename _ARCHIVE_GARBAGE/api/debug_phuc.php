<?php
require_once 'db_connect.php';

$email = 'phucht@ideas.edu.vn';
echo "Checking status for $email...\n\n";

// 1. Get subscriber ID
$stmt = $pdo->prepare("SELECT id FROM subscribers WHERE email = ?");
$stmt->execute([$email]);
$subId = $stmt->fetchColumn();

if (!$subId) {
    echo "Subscriber not found.\n";
    exit;
}

echo "Subscriber ID: $subId\n";

// 2. Check Flow States
$stmt = $pdo->prepare("SELECT q.*, f.name as flow_name FROM subscriber_flow_states q JOIN flows f ON q.flow_id = f.id WHERE q.subscriber_id = ?");
$stmt->execute([$subId]);
$states = $stmt->fetchAll();

echo "\n--- Flow States ---\n";
foreach ($states as $s) {
    echo "Flow: {$s['flow_name']} ({$s['flow_id']})\n";
    echo "Step: {$s['step_id']}\n";
    echo "Status: {$s['status']}\n";
    echo "Scheduled At: {$s['scheduled_at']}\n";
    echo "Updated At: {$s['updated_at']}\n";
    echo "-------------------\n";
}

// 3. Check Recent Activity
$stmt = $pdo->prepare("SELECT * FROM subscriber_activity WHERE subscriber_id = ? ORDER BY created_at DESC LIMIT 5");
$stmt->execute([$subId]);
$activities = $stmt->fetchAll();

echo "\n--- Recent Activity ---\n";
foreach ($activities as $a) {
    echo "[{$a['created_at']}] Type: {$a['type']} | Ref: {$a['reference_id']} | Flow: {$a['flow_id']} | Campaign: {$a['campaign_id']}\n";
    echo "Details: {$a['details']}\n";
    echo "-------------------\n";
}

// 4. Check Queue Jobs
$stmt = $pdo->prepare("SELECT * FROM queue_jobs WHERE payload LIKE ? AND status != 'completed' ORDER BY created_at DESC LIMIT 5");
$stmt->execute(['%' . $subId . '%']);
$jobs = $stmt->fetchAll();

echo "\n--- Pending/Failed Queue Jobs for this Sub ---\n";
foreach ($jobs as $j) {
    echo "ID: {$j['id']} | Queue: {$j['queue']} | Status: {$j['status']} | Available: {$j['available_at']} | Created: {$j['created_at']}\n";
    echo "Error: {$j['error_message']}\n";
    echo "-------------------\n";
}
