<?php
require_once 'db_connect.php';

$flowId = 'ad16ed97-06b8-49a6-a8da-222c93191db0';
$conditionStepId = '80966800-d4c1-4afd-9393-4290aceb9fc1';

echo "<pre>";
echo "--- Investigating Else Branch Discrepancy (1495 vs 1460) ---\n";

// 1. Get flow structure to identify "Else" branch steps
$stmt = $pdo->prepare("SELECT steps FROM flows WHERE id = ?");
$stmt->execute([$flowId]);
$stepsJson = $stmt->fetchColumn();
$steps = json_decode($stepsJson, true);

$conditionStep = null;
foreach ($steps as $s) {
    if ($s['id'] === $conditionStepId) {
        $conditionStep = $s;
        break;
    }
}

if (!$conditionStep) {
    die("Condition step not found\n");
}

$elsePathStart = $conditionStep['noStepId'] ?? null;
echo "Else path starts at: " . ($elsePathStart ?: "END (Direct)") . "\n";

// 2. Identify all steps in the Else branch
$elseBranchSteps = [];
if ($elsePathStart) {
    $queue = [$elsePathStart];
    $visited = [];
    while (!empty($queue)) {
        $sid = array_shift($queue);
        if (in_array($sid, $visited))
            continue;
        $visited[] = $sid;
        $elseBranchSteps[] = $sid;

        // Find step
        foreach ($steps as $s) {
            if ($s['id'] === $sid) {
                if (isset($s['nextStepId']))
                    $queue[] = $s['nextStepId'];
                if (isset($s['yesStepId']))
                    $queue[] = $s['yesStepId'];
                if (isset($s['noStepId']))
                    $queue[] = $s['noStepId'];
                break;
            }
        }
    }
}

echo "Steps in Else branch: " . implode(', ', $elseBranchSteps) . "\n";

// 3. Get subscribers who went through condition_false
$stmt = $pdo->prepare("SELECT DISTINCT subscriber_id FROM subscriber_activity WHERE flow_id = ? AND reference_id = ? AND type = 'condition_false'");
$stmt->execute([$flowId, $conditionStepId]);
$elseSubs = $stmt->fetchAll(PDO::FETCH_COLUMN);
echo "Subscribers who matched Condition FALSE (Else): " . count($elseSubs) . "\n";

// 4. Get subscribers who are COMPLETED on this branch
// Note: If the branch ends after the condition (noStepId is null), step_id for completed will be conditionStepId
$targetStepIdForCompletion = empty($elseBranchSteps) ? $conditionStepId : end($elseBranchSteps);
echo "Target Step ID for Branch Completion: $targetStepIdForCompletion\n";

$stmt = $pdo->prepare("SELECT DISTINCT subscriber_id FROM subscriber_flow_states WHERE flow_id = ? AND status = 'completed' AND step_id = ?");
$stmt->execute([$flowId, $targetStepIdForCompletion]);
$completedSubs = $stmt->fetchAll(PDO::FETCH_COLUMN);
echo "Subscribers COMPLETED on this branch: " . count($completedSubs) . "\n";

// 5. Find the missing ones
$missing = array_diff($elseSubs, $completedSubs);
echo "Total Missing from Completed: " . count($missing) . "\n";

if (!empty($missing)) {
    // Breakdown missing by status
    $placeholders = implode(',', array_fill(0, count($missing), '?'));
    $stmt = $pdo->prepare("SELECT status, COUNT(*) as count FROM subscriber_flow_states WHERE flow_id = ? AND subscriber_id IN ($placeholders) GROUP BY status");
    $stmt->execute(array_merge([$flowId], array_values($missing)));
    $statusBreakdown = $stmt->fetchAll(PDO::FETCH_ASSOC);
    echo "\nStatus Breakdown of Missing Subscribers:\n";
    foreach ($statusBreakdown as $sb) {
        echo "  - {$sb['status']}: {$sb['count']}\n";
    }

    // Step Breakdown for those waiting
    $stmt = $pdo->prepare("SELECT step_id, COUNT(*) as count FROM subscriber_flow_states WHERE flow_id = ? AND status = 'waiting' AND subscriber_id IN ($placeholders) GROUP BY step_id");
    $stmt->execute(array_merge([$flowId], array_values($missing)));
    $stepBreakdown = $stmt->fetchAll(PDO::FETCH_ASSOC);
    echo "\nStep Breakdown for Waiting Subscribers:\n";
    foreach ($stepBreakdown as $stb) {
        echo "  - Step {$stb['step_id']}: {$stb['count']}\n";
    }

    echo "\nAnalyzing a few missing subscribers:\n";
    $sample = array_slice($missing, 0, 5);
    foreach ($sample as $sid) {
        $stmt = $pdo->prepare("SELECT email FROM subscribers WHERE id = ?");
        $stmt->execute([$sid]);
        $email = $stmt->fetchColumn();

        echo "\nSub: $sid ($email)\n";

        // Check current state
        $stmt = $pdo->prepare("SELECT * FROM subscriber_flow_states WHERE subscriber_id = ? AND flow_id = ?");
        $stmt->execute([$sid, $flowId]);
        $state = $stmt->fetch();
        echo "  Current State: " . ($state ? "Status: {$state['status']} | Step: {$state['step_id']} | Scheduled: {$state['scheduled_at']}" : "NOT FOUND IN STATES") . "\n";

        // Check activity
        $stmt = $pdo->prepare("SELECT type, reference_id, created_at FROM subscriber_activity WHERE subscriber_id = ? AND flow_id = ? ORDER BY created_at DESC LIMIT 5");
        $stmt->execute([$sid, $flowId]);
        $acts = $stmt->fetchAll();
        echo "  Recent Activity:\n";
        foreach ($acts as $a) {
            echo "    [{$a['created_at']}] {$a['type']} (Ref: {$a['reference_id']})\n";
        }
    }
}

echo "</pre>";
