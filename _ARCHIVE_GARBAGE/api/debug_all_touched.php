<?php
// Temporary debug endpoint to check tag step data
require_once 'db_connect.php';

header('Content-Type: application/json');

$flowId = $_GET['flow_id'] ?? null;
$stepId = $_GET['step_id'] ?? null;

if (!$flowId || !$stepId) {
    echo json_encode(['error' => 'Missing parameters']);
    exit;
}

$progressionTypes = [
    'sent_email',
    'receive_email',
    'process_action',
    'sent',
    'update_tag',
    'list_action',
    'enter_flow',
    'unsubscribe',
    'delete_contact',
    'remove_action',
    'wait_processed',
    'condition_true',
    'condition_false',
    'ab_test_a',
    'ab_test_b',
    'advanced_condition',
    'zns_sent',
    'sent_zns'
];
$typePlaceholders = implode("','", $progressionTypes);

// Check raw activity data
$stmt1 = $pdo->prepare("
    SELECT subscriber_id, type, created_at, details
    FROM subscriber_activity
    WHERE flow_id = ? AND reference_id = ? AND type IN ('$typePlaceholders')
    ORDER BY created_at DESC
");
$stmt1->execute([$flowId, $stepId]);
$rawActivities = $stmt1->fetchAll();

// Check who is in waiting state
$stmt2 = $pdo->prepare("
    SELECT subscriber_id, status, created_at
    FROM subscriber_flow_states
    WHERE flow_id = ? AND step_id = ? AND status IN ('waiting', 'processing')
");
$stmt2->execute([$flowId, $stepId]);
$waitingUsers = $stmt2->fetchAll();

// Get the final query result (what should show in modal)
$historySql = "
    SELECT subscriber_id, MAX(created_at) as entered_at 
    FROM subscriber_activity
    WHERE flow_id = ? AND reference_id = ? AND type IN ('$typePlaceholders')
    GROUP BY subscriber_id
";

$stmt3 = $pdo->prepare("
    SELECT s.id, s.email, s.first_name, s.last_name, u.entered_at
    FROM ($historySql) as u
    JOIN subscribers s ON u.subscriber_id = s.id
    WHERE u.subscriber_id NOT IN (
        SELECT subscriber_id FROM subscriber_flow_states 
        WHERE flow_id = ? AND step_id = ? AND status IN ('waiting', 'processing')
    )
    ORDER BY u.entered_at DESC
");
$stmt3->execute([$flowId, $stepId, $flowId, $stepId]);
$finalResult = $stmt3->fetchAll();

echo json_encode([
    'flow_id' => $flowId,
    'step_id' => $stepId,
    'raw_activities_count' => count($rawActivities),
    'raw_activities' => $rawActivities,
    'waiting_users_count' => count($waitingUsers),
    'waiting_users' => $waitingUsers,
    'final_result_count' => count($finalResult),
    'final_result' => $finalResult
], JSON_PRETTY_PRINT);
