<?php
require_once 'db_connect.php';

$flowId = 'ad16ed97-06b8-49a6-a8da-222c93191db0';

$stmt = $pdo->prepare("SELECT * FROM flows WHERE id = ?");
$stmt->execute([$flowId]);
$flow = $stmt->fetch(PDO::FETCH_ASSOC);

$stmt = $pdo->prepare("SELECT status, COUNT(*) as count FROM subscriber_flow_states WHERE flow_id = ? GROUP BY status");
$stmt->execute([$flowId]);
$states = $stmt->fetchAll(PDO::FETCH_ASSOC);

$stmt = $pdo->prepare("SELECT COUNT(DISTINCT subscriber_id) FROM subscriber_activity WHERE flow_id = ? AND type = 'complete_flow'");
$stmt->execute([$flowId]);
$activityCompletions = $stmt->fetchColumn();

header('Content-Type: application/json');
echo json_encode([
    'flow_table_stats' => [
        'enrolled' => $flow['stat_enrolled'],
        'completed' => $flow['stat_completed']
    ],
    'actual_state_counts' => $states,
    'activity_log_completions' => $activityCompletions
], JSON_PRETTY_PRINT);
