<?php
// Test script to check for specific subscriber provided by user
error_reporting(E_ALL);
ini_set('display_errors', 1);

require_once 'db_connect.php';

// CONFIGURATION
$testEmail = 'dom.marketing.vn@gmail.com'; // Updated for new test case

echo "🔍 Checking for subscriber: $testEmail\n";

// Find subscriber
$stmt = $pdo->prepare("SELECT id, email, status FROM subscribers WHERE email = ?");
$stmt->execute([$testEmail]);
$sub = $stmt->fetch();

if (!$sub) {
    die("❌ Subscriber not found: $testEmail\n");
}

$subscriberId = $sub['id'];
echo "✅ Found subscriber: $subscriberId\n\n";

// Check flow state
$stmt = $pdo->prepare("
    SELECT sfs.*, f.name as flow_name, f.steps
    FROM subscriber_flow_states sfs
    JOIN flows f ON f.id = sfs.flow_id
    WHERE sfs.subscriber_id = ? 
    ORDER BY sfs.updated_at DESC
    LIMIT 5
");
$stmt->execute([$subscriberId]);
$states = $stmt->fetchAll();

foreach ($states as $state) {
    echo "------------------------------------------------\n";
    echo "   Flow: {$state['flow_name']} (ID: {$state['flow_id']})\n";
    echo "   Step ID: {$state['step_id']}\n";
    echo "   Status: [ {$state['status']} ]\n";
    echo "   Scheduled At: {$state['scheduled_at']}\n";
    echo "   Updated At:   {$state['updated_at']}\n";

    // Check if step is Condition Step
    $steps = json_decode($state['steps'], true);
    foreach ($steps as $s) {
        if ($s['id'] === $state['step_id']) {
            echo "   Step Type: " . ($s['type'] ?? 'unknown') . "\n";
            if (($s['type'] ?? '') === 'condition') {
                echo "   Wait: {$s['config']['waitDuration']} {$s['config']['waitUnit']}\n";
            }
        }
    }

    if ($state['status'] === 'waiting') {
        $scheduled = new DateTime($state['scheduled_at']);
        $now = new DateTime();
        if ($scheduled <= $now) {
            echo "   🚨 LATE by " . $scheduled->diff($now)->format('%i min %s sec') . "!\n";
            // FORCE TRIGGER
            echo "   🚀 Force Triggering Worker...\n";
            $workerUrl = API_BASE_URL . "/worker_flow.php?subscriber_id={$subscriberId}&flow_id={$state['flow_id']}";
            $ch = curl_init($workerUrl);
            curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
            curl_setopt($ch, CURLOPT_TIMEOUT, 30);
            $res = curl_exec($ch);
            echo "   Worker Output: " . substr($res, 0, 100) . "...\n";
            curl_close($ch);
        }
    }
}
echo "------------------------------------------------\n";
