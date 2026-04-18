<?php
ini_set('display_errors', 1);
error_reporting(E_ALL);
header('Content-Type: text/plain');
$flowId = 'ad16ed97-06b8-49a6-a8da-222c93191db0';
require 'db_connect.php';

echo "--- Debugging 1 Failed Subscriber ---\n";

// 1. Find the failed subscriber
// FIX: Removed 'error_message' column which caused the crash
$stmt = $pdo->prepare("SELECT subscriber_id, status FROM subscriber_flow_states WHERE flow_id = ? AND status = 'failed'");
$stmt->execute([$flowId]);
$failedUser = $stmt->fetch(PDO::FETCH_ASSOC);

if ($failedUser) {
    echo "Found Failed User: " . $failedUser['subscriber_id'] . "\n";

    // Check if they actually have a complete_flow activity
    $stmt = $pdo->prepare("SELECT COUNT(*) FROM subscriber_activity WHERE flow_id = ? AND subscriber_id = ? AND type = 'complete_flow'");
    $stmt->execute([$flowId, $failedUser['subscriber_id']]);
    $hasCompleteLog = $stmt->fetchColumn();

    if ($hasCompleteLog) {
        echo "This user HAD a complete_flow log but is marked FAILED in state table. Fixing now...\n";
        $pdo->prepare("UPDATE subscriber_flow_states SET status = 'completed', updated_at = NOW() WHERE flow_id = ? AND subscriber_id = ?")
            ->execute([$flowId, $failedUser['subscriber_id']]);
        echo "SUCCESS: Marked subscriber as completed.\n";
    } else {
        echo "This user does NOT have a complete_flow log. They are truly failed.\n";
    }
} else {
    echo "No failed users found. Checking for mismatches between logs and state...\n";

    // Identify the specific ID that has the log but not the status
    $stmt = $pdo->prepare("
        SELECT DISTINCT sa.subscriber_id 
        FROM subscriber_activity sa 
        JOIN subscriber_flow_states sfs ON sa.subscriber_id = sfs.subscriber_id AND sa.flow_id = sfs.flow_id
        WHERE sa.flow_id = ? AND sa.type = 'complete_flow' AND sfs.status != 'completed'
    ");
    $stmt->execute([$flowId]);
    $mismatchId = $stmt->fetchColumn();

    if ($mismatchId) {
        echo "Found mismatch ID: $mismatchId. Fixing...\n";
        $pdo->prepare("UPDATE subscriber_flow_states SET status = 'completed', updated_at = NOW() WHERE flow_id = ? AND subscriber_id = ?")
            ->execute([$flowId, $mismatchId]);
        echo "FIXED.\n";
    } else {
        echo "No mismatches found via JOIN.\n";
    }
}

echo "\n--- Final Verification ---\n";
$stmt = $pdo->prepare("SELECT status, COUNT(*) as c FROM subscriber_flow_states WHERE flow_id = ? GROUP BY status");
$stmt->execute([$flowId]);
print_r($stmt->fetchAll(PDO::FETCH_ASSOC));
