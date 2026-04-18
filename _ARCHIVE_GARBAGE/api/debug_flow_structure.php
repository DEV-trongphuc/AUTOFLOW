<?php
// Debug flow structure to see step connections
require_once 'db_connect.php';

header('Content-Type: application/json');

$flowId = $_GET['flow_id'] ?? null;

if (!$flowId) {
    echo json_encode(['error' => 'Missing flow_id']);
    exit;
}

$stmt = $pdo->prepare("SELECT id, name, steps FROM flows WHERE id = ?");
$stmt->execute([$flowId]);
$flow = $stmt->fetch();

if (!$flow) {
    echo json_encode(['error' => 'Flow not found']);
    exit;
}

$steps = json_decode($flow['steps'], true);

// Build a connection map
$connections = [];
foreach ($steps as $step) {
    $stepInfo = [
        'id' => $step['id'],
        'name' => $step['name'] ?? 'Unnamed',
        'type' => $step['type'],
        'nextStepId' => $step['nextStepId'] ?? null,
        'config' => $step['config'] ?? []
    ];

    // For condition steps, show both branches
    if ($step['type'] === 'condition') {
        $stepInfo['yesPath'] = $step['config']['yesPath'] ?? null;
        $stepInfo['noPath'] = $step['config']['noPath'] ?? null;
    }

    $connections[] = $stepInfo;
}

// Find the tag step
$tagStep = null;
foreach ($steps as $step) {
    if ($step['id'] === 'a67a3ff2-8b47-40cb-a21f-62a79bac1c10') {
        $tagStep = $step;
        break;
    }
}

// Find what points to the tag step
$pointsToTag = [];
foreach ($steps as $step) {
    if (isset($step['nextStepId']) && $step['nextStepId'] === 'a67a3ff2-8b47-40cb-a21f-62a79bac1c10') {
        $pointsToTag[] = [
            'step_id' => $step['id'],
            'step_name' => $step['name'] ?? 'Unnamed',
            'step_type' => $step['type'],
            'connection_type' => 'nextStepId'
        ];
    }

    if ($step['type'] === 'condition') {
        if (($step['config']['yesPath'] ?? null) === 'a67a3ff2-8b47-40cb-a21f-62a79bac1c10') {
            $pointsToTag[] = [
                'step_id' => $step['id'],
                'step_name' => $step['name'] ?? 'Unnamed',
                'step_type' => $step['type'],
                'connection_type' => 'yesPath'
            ];
        }
        if (($step['config']['noPath'] ?? null) === 'a67a3ff2-8b47-40cb-a21f-62a79bac1c10') {
            $pointsToTag[] = [
                'step_id' => $step['id'],
                'step_name' => $step['name'] ?? 'Unnamed',
                'step_type' => $step['type'],
                'connection_type' => 'noPath'
            ];
        }
    }
}

echo json_encode([
    'flow_name' => $flow['name'],
    'tag_step' => $tagStep,
    'steps_pointing_to_tag' => $pointsToTag,
    'all_connections' => $connections
], JSON_PRETTY_PRINT);
