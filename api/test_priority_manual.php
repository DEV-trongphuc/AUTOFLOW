<?php
// api/test_priority_manual.php
error_reporting(E_ALL);
ini_set('display_errors', 1);
header('Content-Type: text/plain');

require_once 'db_connect.php';

// Mock Data
$sid = 'mock_sub_' . time();
$fid = 'mock_flow_' . time();
$triggerType = 'purchase';
$targetId = 'mock_event';

// 1. Create Mock Subscriber
$pdo->prepare("INSERT INTO subscribers (id, email, status, created_at) VALUES (?, ?, 'active', NOW())")
    ->execute([$sid, "test_manual_{$sid}@example.com"]);

// 2. Create Mock Flow (Purchase Trigger)
$steps = [
    [
        'id' => 'step_trigger',
        'type' => 'trigger',
        'config' => ['type' => 'purchase', 'targetId' => $targetId],
        'nextStepId' => 'step_action'
    ],
    [
        'id' => 'step_action',
        'type' => 'action',
        'config' => ['type' => 'wait', 'duration' => 1] // Simple action
    ]
];
$pdo->prepare("INSERT INTO flows (id, name, status, steps, created_at) VALUES (?, 'Manual Debug Flow', 'active', ?, NOW())")
    ->execute([$fid, json_encode($steps)]);

echo "Created Mock Subscriber: $sid\n";
echo "Created Mock Flow: $fid\n";

// 3. Set GET params for worker_priority
$_GET['trigger_type'] = $triggerType;
$_GET['target_id'] = $targetId;
$_GET['subscriber_id'] = $sid;

echo "Starting worker_priority.php...\n";

// Capture output
ob_start();
require 'worker_priority.php';
$output = ob_get_clean();

echo "Worker Output:\n$output\n";

// 4. Verify Enrollment
$stmt = $pdo->prepare("SELECT * FROM subscriber_flow_states WHERE subscriber_id = ? AND flow_id = ?");
$stmt->execute([$sid, $fid]);
$enrollment = $stmt->fetch(PDO::FETCH_ASSOC);

if ($enrollment) {
    echo "SUCCESS: Subscriber enrolled in flow! Status: {$enrollment['status']}\n";
} else {
    echo "FAILURE: Subscriber NOT enrolled.\n";
}

// Cleanup
$pdo->prepare("DELETE FROM subscribers WHERE id = ?")->execute([$sid]);
$pdo->prepare("DELETE FROM flows WHERE id = ?")->execute([$fid]);
$pdo->prepare("DELETE FROM subscriber_flow_states WHERE subscriber_id = ?")->execute([$sid]);
?>