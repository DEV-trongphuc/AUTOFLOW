<?php
require_once 'db_connect.php';

$flowId = '6972fea76fa61';
$targetStepId = '08542221-c4da-4249-9b2b-2feb8f300581'; // The "Wait 17:00 Jan 26" / "Mail 12h" step
$scheduledAt = '2026-01-26 17:00:00';

// 1. dinhthanh@ideas.edu.vn (Queue ID: 148) -> Move back from completed
// 2. thaont@ideas.edu.vn (Queue ID: 159) -> Move back from Jan 28
// 3. phucht@ideas.edu.vn (Queue ID: 149) -> Fix empty status

$queueIdsToFix = [148, 159, 149];

$stmt = $pdo->prepare("
    UPDATE subscriber_flow_states 
    SET step_id = ?, 
        status = 'waiting', 
        scheduled_at = ?, 
        updated_at = NOW(),
        last_error = NULL
    WHERE id = ?
");

foreach ($queueIdsToFix as $qId) {
    if ($stmt->execute([$targetStepId, $scheduledAt, $qId])) {
        echo "FIXED: Queue ID $qId moved to step $targetStepId scheduled for $scheduledAt\n";
    } else {
        echo "FAILED: Queue ID $qId\n";
    }
}

// Double check if there are others with empty status or clearly ahead
$stmtCheck = $pdo->prepare("SELECT id, email, status, step_id FROM subscriber_flow_states q JOIN subscribers s ON q.subscriber_id = s.id WHERE flow_id = ? AND (status = 'completed' OR status = '' OR status IS NULL)");
$stmtCheck->execute([$flowId]);
$others = $stmtCheck->fetchAll();

if ($others) {
    echo "\nFound other potential issues:\n";
    foreach ($others as $o) {
        echo "ID: {$o['id']}, Email: {$o['email']}, Status: [{$o['status']}]\n";
    }
}
