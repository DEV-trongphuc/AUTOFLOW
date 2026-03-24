<?php
// Test script to verify orphaned step cleanup logic
// This simulates a flow with orphaned steps

require_once 'db_connect.php';

// Test data: Flow with orphaned steps
$testFlow = [
    'id' => 'test-flow-' . uniqid(),
    'name' => 'Test Flow - Orphaned Steps',
    'status' => 'draft',
    'steps' => [
        // Trigger step
        [
            'id' => 'trigger-1',
            'type' => 'trigger',
            'config' => ['type' => 'segment', 'targetId' => 'seg-1'],
            'nextStepId' => 'email-1'
        ],
        // Email step 1 (reachable)
        [
            'id' => 'email-1',
            'type' => 'action',
            'label' => 'Email 1',
            'nextStepId' => 'condition-1'
        ],
        // Condition step (reachable)
        [
            'id' => 'condition-1',
            'type' => 'condition',
            'label' => 'Đã mở email?',
            'yesStepId' => 'email-2',
            'noStepId' => 'wait-1'
        ],
        // Email step 2 (reachable via YES branch)
        [
            'id' => 'email-2',
            'type' => 'action',
            'label' => 'Email 2',
            'nextStepId' => null
        ],
        // Wait step (reachable via NO branch)
        [
            'id' => 'wait-1',
            'type' => 'wait',
            'label' => 'Chờ 1 ngày',
            'nextStepId' => 'email-3'
        ],
        // Email step 3 (reachable)
        [
            'id' => 'email-3',
            'type' => 'action',
            'label' => 'Email 3',
            'nextStepId' => null
        ],
        // ORPHANED STEPS (not connected to flow)
        [
            'id' => 'orphan-1',
            'type' => 'action',
            'label' => 'Orphaned Email 1',
            'nextStepId' => 'orphan-2'
        ],
        [
            'id' => 'orphan-2',
            'type' => 'wait',
            'label' => 'Orphaned Wait',
            'nextStepId' => null
        ],
        // DELETED STEP (was removed but still in array)
        [
            'id' => 'deleted-1',
            'type' => 'action',
            'label' => 'Deleted Email',
            'nextStepId' => null
        ]
    ],
    'config' => [
        'frequency' => 'one-time'
    ]
];

echo "=== TEST: Orphaned Step Cleanup ===\n\n";
echo "Original steps count: " . count($testFlow['steps']) . "\n";
echo "Steps:\n";
foreach ($testFlow['steps'] as $step) {
    echo "  - {$step['id']} ({$step['type']}): {$step['label']}\n";
}

// Simulate the getReachableSteps function
function getReachableSteps($steps)
{
    if (empty($steps))
        return [];

    $trigger = null;
    foreach ($steps as $s) {
        if ($s['type'] === 'trigger') {
            $trigger = $s;
            break;
        }
    }

    if (!$trigger)
        return [];

    $reachableIds = [];
    $queue = [$trigger['id']];

    while (!empty($queue)) {
        $currentId = array_shift($queue);
        if (in_array($currentId, $reachableIds))
            continue;

        $currentStep = null;
        foreach ($steps as $s) {
            if ($s['id'] === $currentId) {
                $currentStep = $s;
                break;
            }
        }

        if (!$currentStep)
            continue;

        $reachableIds[] = $currentId;

        // Traverse based on step type
        if ($currentStep['type'] === 'condition') {
            if (!empty($currentStep['yesStepId']))
                $queue[] = $currentStep['yesStepId'];
            if (!empty($currentStep['noStepId']))
                $queue[] = $currentStep['noStepId'];
        } else if ($currentStep['type'] === 'split_test') {
            if (!empty($currentStep['pathAStepId']))
                $queue[] = $currentStep['pathAStepId'];
            if (!empty($currentStep['pathBStepId']))
                $queue[] = $currentStep['pathBStepId'];
        } else if ($currentStep['type'] === 'advanced_condition') {
            if (!empty($currentStep['config']['branches'])) {
                foreach ($currentStep['config']['branches'] as $b) {
                    if (!empty($b['stepId']))
                        $queue[] = $b['stepId'];
                }
            }
            if (!empty($currentStep['config']['defaultStepId']))
                $queue[] = $currentStep['config']['defaultStepId'];
        } else if ($currentStep['type'] === 'link_flow' || $currentStep['type'] === 'remove_action') {
            // Terminal steps - no next step
        } else {
            // All other steps use nextStepId
            if (!empty($currentStep['nextStepId']))
                $queue[] = $currentStep['nextStepId'];
        }
    }

    // Filter steps to only include reachable ones
    $result = [];
    foreach ($steps as $s) {
        if (in_array($s['id'], $reachableIds)) {
            $result[] = $s;
        }
    }

    return $result;
}

// Clean orphaned steps
$cleanedSteps = getReachableSteps($testFlow['steps']);

echo "\n=== AFTER CLEANUP ===\n";
echo "Cleaned steps count: " . count($cleanedSteps) . "\n";
echo "Reachable steps:\n";
foreach ($cleanedSteps as $step) {
    echo "  ✓ {$step['id']} ({$step['type']}): {$step['label']}\n";
}

echo "\n=== ORPHANED STEPS (REMOVED) ===\n";
$orphanedSteps = array_filter($testFlow['steps'], function ($step) use ($cleanedSteps) {
    foreach ($cleanedSteps as $clean) {
        if ($clean['id'] === $step['id'])
            return false;
    }
    return true;
});

if (empty($orphanedSteps)) {
    echo "  (none)\n";
} else {
    foreach ($orphanedSteps as $step) {
        echo "  ✗ {$step['id']} ({$step['type']}): {$step['label']}\n";
    }
}

// Test trigger_type derivation
$triggerType = null;
foreach ($cleanedSteps as $s) {
    if ($s['type'] === 'trigger' && isset($s['config']['type'])) {
        $triggerType = $s['config']['type'];
        break;
    }
}

echo "\n=== TRIGGER TYPE ===\n";
echo "Derived trigger_type: " . ($triggerType ?? 'null') . "\n";

// Verify expected results
$expectedReachable = ['trigger-1', 'email-1', 'condition-1', 'email-2', 'wait-1', 'email-3'];
$actualReachable = array_map(function ($s) {
    return $s['id']; }, $cleanedSteps);

echo "\n=== VALIDATION ===\n";
$isValid = (count($expectedReachable) === count($actualReachable)) &&
    empty(array_diff($expectedReachable, $actualReachable));

if ($isValid) {
    echo "✓ TEST PASSED: All expected steps are reachable, orphaned steps removed\n";
} else {
    echo "✗ TEST FAILED: Mismatch in reachable steps\n";
    echo "  Expected: " . implode(', ', $expectedReachable) . "\n";
    echo "  Actual: " . implode(', ', $actualReachable) . "\n";
}

if ($triggerType === 'segment') {
    echo "✓ TEST PASSED: trigger_type correctly derived as 'segment'\n";
} else {
    echo "✗ TEST FAILED: trigger_type should be 'segment', got: " . ($triggerType ?? 'null') . "\n";
}

echo "\n=== TEST COMPLETE ===\n";
?>