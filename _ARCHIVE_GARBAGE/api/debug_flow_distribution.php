<?php
// Debug entire flow to see subscriber distribution
require_once 'db_connect.php';

header('Content-Type: application/json');

$flowId = $_GET['flow_id'] ?? null;

if (!$flowId) {
    echo json_encode(['error' => 'Missing flow_id']);
    exit;
}

// 1. Get flow info
$stmt = $pdo->prepare("SELECT id, name, status, steps FROM flows WHERE id = ?");
$stmt->execute([$flowId]);
$flow = $stmt->fetch();

if (!$flow) {
    echo json_encode(['error' => 'Flow not found']);
    exit;
}

$steps = json_decode($flow['steps'], true);

// 2. Get subscriber distribution across all steps
$stmt2 = $pdo->prepare("
    SELECT step_id, status, COUNT(*) as count
    FROM subscriber_flow_states
    WHERE flow_id = ?
    GROUP BY step_id, status
");
$stmt2->execute([$flowId]);
$distribution = $stmt2->fetchAll();

// 3. Get activity counts per step
$stmt3 = $pdo->prepare("
    SELECT reference_id as step_id, type, COUNT(*) as count
    FROM subscriber_activity
    WHERE flow_id = ?
    GROUP BY reference_id, type
");
$stmt3->execute([$flowId]);
$activities = $stmt3->fetchAll();

// 4. Get total enrolled
$stmt4 = $pdo->prepare("
    SELECT COUNT(DISTINCT subscriber_id) as total
    FROM subscriber_flow_states
    WHERE flow_id = ?
");
$stmt4->execute([$flowId]);
$totalEnrolled = $stmt4->fetchColumn();

// Format steps with names
$stepMap = [];
foreach ($steps as $step) {
    $stepMap[$step['id']] = [
        'name' => $step['name'] ?? 'Unnamed',
        'type' => $step['type'] ?? 'unknown'
    ];
}

echo json_encode([
    'flow' => [
        'id' => $flow['id'],
        'name' => $flow['name'],
        'status' => $flow['status'],
        'total_enrolled' => $totalEnrolled
    ],
    'steps' => $stepMap,
    'subscriber_distribution' => $distribution,
    'activity_counts' => $activities,
    'summary' => [
        'total_steps' => count($steps),
        'steps_with_subscribers' => count(array_unique(array_column($distribution, 'step_id'))),
        'steps_with_activities' => count(array_unique(array_column($activities, 'step_id')))
    ]
], JSON_PRETTY_PRINT);
