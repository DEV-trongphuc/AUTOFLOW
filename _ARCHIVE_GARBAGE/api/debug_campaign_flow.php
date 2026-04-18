<?php
// api/debug_campaign_flow.php
require_once 'db_connect.php';
header('Content-Type: text/plain; charset=utf-8');

// Get the campaign ID from GET parameter
$cid = $_GET['cid'] ?? null;

if (!$cid) {
    echo "Usage: ?cid=CAMPAIGN_ID\n";
    exit;
}

// 1. Get Campaign Details
echo "=== CAMPAIGN DETAILS ===\n";
$stmt = $pdo->prepare("SELECT id, name, status, target_config FROM campaigns WHERE id = ?");
$stmt->execute([$cid]);
$campaign = $stmt->fetch(PDO::FETCH_ASSOC);

if (!$campaign) {
    echo "Campaign not found: $cid\n";
    exit;
}

echo "ID: {$campaign['id']}\n";
echo "Name: {$campaign['name']}\n";
echo "Status: {$campaign['status']}\n";

$target = json_decode($campaign['target_config'], true);
echo "Target Lists: " . implode(', ', $target['listIds'] ?? []) . "\n";
echo "Target Segments: " . implode(', ', $target['segmentIds'] ?? []) . "\n";
echo "Linked Flow ID: " . ($target['linkedFlowId'] ?? 'NONE') . "\n\n";

// 2. Check if there's a linked flow
$linkedFlowId = $target['linkedFlowId'] ?? null;

if ($linkedFlowId) {
    echo "=== LINKED FLOW DETAILS ===\n";
    $stmt = $pdo->prepare("SELECT id, name, status, steps FROM flows WHERE id = ?");
    $stmt->execute([$linkedFlowId]);
    $flow = $stmt->fetch(PDO::FETCH_ASSOC);

    if ($flow) {
        echo "Flow ID: {$flow['id']}\n";
        echo "Flow Name: {$flow['name']}\n";
        echo "Flow Status: {$flow['status']}\n";

        $steps = json_decode($flow['steps'], true);
        echo "Steps:\n";
        foreach ($steps as $idx => $step) {
            echo "  [$idx] {$step['type']} - {$step['label']}\n";
            if ($step['type'] === 'trigger') {
                echo "      Config: " . json_encode($step['config']) . "\n";
                echo "      Next Step: {$step['nextStepId']}\n";
            }
        }
        echo "\n";

        // Check subscriber flow states
        echo "=== SUBSCRIBER FLOW STATES (Sample) ===\n";
        $stmt = $pdo->prepare("SELECT subscriber_id, step_id, status, created_at FROM subscriber_flow_states WHERE flow_id = ? ORDER BY created_at DESC LIMIT 5");
        $stmt->execute([$linkedFlowId]);
        $states = $stmt->fetchAll(PDO::FETCH_ASSOC);

        foreach ($states as $state) {
            echo "  Subscriber: {$state['subscriber_id']}, Step: {$state['step_id']}, Status: {$state['status']}, Created: {$state['created_at']}\n";
        }
    } else {
        echo "WARNING: Linked flow $linkedFlowId not found!\n";
    }
} else {
    echo "=== NO LINKED FLOW ===\n";
    echo "Campaign will send emails directly.\n";
}

echo "\n=== MAIL DELIVERY LOGS (Last 5) ===\n";
$stmt = $pdo->prepare("SELECT recipient, status, sent_at, error_message FROM mail_delivery_logs WHERE campaign_id = ? ORDER BY sent_at DESC LIMIT 5");
$stmt->execute([$cid]);
$logs = $stmt->fetchAll(PDO::FETCH_ASSOC);

foreach ($logs as $log) {
    echo "  {$log['recipient']} - {$log['status']} at {$log['sent_at']}";
    if ($log['error_message']) {
        echo " (Error: {$log['error_message']})";
    }
    echo "\n";
}

if (count($logs) === 0) {
    echo "  No delivery logs found for this campaign.\n";
}
?>