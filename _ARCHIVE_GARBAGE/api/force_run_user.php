<?php
// api/force_run_user.php
require_once 'worker_flow.php';

// Forcefully inject the user into the processing loop
echo "<h1>Forcing Flow Execution for marketing@ideas.edu.vn</h1>";

// 1. Manually find the queue item
$stmt = $pdo->prepare("SELECT sfs.*, s.email, f.name as flow_name, f.steps, f.config as flow_config 
                       FROM subscriber_flow_states sfs
                       JOIN subscribers s ON sfs.subscriber_id = s.id
                       JOIN flows f ON sfs.flow_id = f.id
                       WHERE s.email = 'marketing@ideas.edu.vn'");
$stmt->execute();
$items = $stmt->fetchAll(PDO::FETCH_ASSOC);

if (empty($items)) {
    die("User not found in any flow state.");
}

// 2. Mock GLOBAL $logs to capture output
$logs = []; // Reset logs

// 3. Run Logic (Slightly Adapted from Worker)
// We need to simulate the loop body from worker_flow.php
// Since we can't easily extract the loop body function, we will REPLICATE the minimal check logic here
// to verify matching behavior in a live environment.

foreach ($items as $item) {
    echo "<h2>Processing Flow: {$item['flow_name']} (Step: {$item['step_id']})</h2>";

    $flowId = $item['flow_id'];
    $subscriberId = $item['subscriber_id'];
    $steps = json_decode($item['steps'], true);
    $currentStep = null;
    foreach ($steps as $s) {
        if ($s['id'] === $item['step_id']) {
            $currentStep = $s;
            break;
        }
    }

    if (!$currentStep) {
        echo "Step not found definition.";
        continue;
    }

    if ($currentStep['type'] !== 'condition') {
        echo "Not a condition step. Skipping.";
        continue;
    }

    // --- CONDITION CHECK LOGIC COPY ---
    $config = $currentStep['config'];
    $conditions = $config['conditions'] ?? [];
    echo "<ul>";
    foreach ($conditions as $cond) {
        $condType = $cond['type'] ?? '';
        echo "<li>Checking Type: $condType</li>";

        if ($condType === 'clicked') {
            $actType = 'click_link';

            // USE THE EXACT SQL WE JUST PATCHED
            $sql = "SELECT id FROM subscriber_activity WHERE subscriber_id = ? AND type = ? AND flow_id = ? AND created_at >= (SELECT created_at FROM subscriber_flow_states WHERE id = ?)";
            $params = [$subscriberId, $actType, $flowId, $item['id']];

            echo "SQL: $sql <br>";
            echo "Params: " . json_encode($params) . "<br>";

            $stmtAct = $pdo->prepare($sql);
            $stmtAct->execute($params);
            if ($stmtAct->fetch()) {
                echo "<strong style='color:green'>MATCHED!</strong> (Logic in worker should pass)";

                // ATTEMPT TO FORCE UPDATE
                $yesStep = $currentStep['yesStepId'] ?? null;
                echo "<br>Next Step (YES): $yesStep";

                if ($yesStep) {
                    $pdo->prepare("UPDATE subscriber_flow_states SET step_id = ?, status = 'waiting', scheduled_at = NOW(), updated_at = NOW() WHERE id = ?")->execute([$yesStep, $item['id']]);
                    echo "<br><strong style='color:blue'>FORCED MOVED TO NEXT STEP!</strong>";
                }
            } else {
                echo "<strong style='color:red'>NO MATCH</strong> (Logic in worker fails)";
            }
        }
    }
    echo "</ul>";
}
?>