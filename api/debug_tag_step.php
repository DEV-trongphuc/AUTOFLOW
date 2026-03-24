<?php
// Debug script to check tag step activity
require_once 'db_connect.php';

header('Content-Type: application/json');

$flowId = $_GET['flow_id'] ?? null;
$stepId = $_GET['step_id'] ?? null;

if (!$flowId || !$stepId) {
    echo json_encode(['error' => 'Missing flow_id or step_id']);
    exit;
}

// 1. Check subscriber_activity for this step
$stmt = $pdo->prepare("
    SELECT sa.*, s.email 
    FROM subscriber_activity sa
    LEFT JOIN subscribers s ON sa.subscriber_id = s.id
    WHERE sa.flow_id = ? AND sa.reference_id = ?
    ORDER BY sa.created_at DESC
    LIMIT 20
");
$stmt->execute([$flowId, $stepId]);
$activities = $stmt->fetchAll();

// 2. Check subscriber_flow_states for this step
$stmt2 = $pdo->prepare("
    SELECT sfs.*, s.email 
    FROM subscriber_flow_states sfs
    LEFT JOIN subscribers s ON sfs.subscriber_id = s.id
    WHERE sfs.flow_id = ? AND sfs.step_id = ?
    ORDER BY sfs.updated_at DESC
    LIMIT 20
");
$stmt2->execute([$flowId, $stepId]);
$flowStates = $stmt2->fetchAll();

// 3. Check what activity types exist for this step
$stmt3 = $pdo->prepare("
    SELECT type, COUNT(*) as count
    FROM subscriber_activity
    WHERE flow_id = ? AND reference_id = ?
    GROUP BY type
");
$stmt3->execute([$flowId, $stepId]);
$activityTypes = $stmt3->fetchAll();

echo json_encode([
    'flow_id' => $flowId,
    'step_id' => $stepId,
    'activities' => $activities,
    'flow_states' => $flowStates,
    'activity_types' => $activityTypes,
    'total_activities' => count($activities),
    'total_flow_states' => count($flowStates)
], JSON_PRETTY_PRINT);
