<?php
// api/fix_all_cli.php
// CLI version - Auto fix all stuck subscribers

ini_set('display_errors', 1);
error_reporting(E_ALL);
set_time_limit(300);
require_once 'db_connect.php';

echo "=================================================================\n";
echo "🔧 FIX ALL STUCK SUBSCRIBERS - BATCH PROCESSING\n";
echo "=================================================================\n";
echo "Time: " . date('Y-m-d H:i:s') . "\n";
echo "Mode: LIVE - Will update database\n";
echo "=================================================================\n\n";

// Get all active flows
$stmtFlows = $pdo->prepare("
    SELECT id, name, status, steps 
    FROM flows 
    WHERE status IN ('active', 'paused')
    ORDER BY created_at DESC
");
$stmtFlows->execute();
$flows = $stmtFlows->fetchAll(PDO::FETCH_ASSOC);

echo "📊 Found " . count($flows) . " active/paused flows\n\n";

$totalFixed = 0;
$totalScanned = 0;
$flowsWithIssues = 0;

foreach ($flows as $flowIndex => $flow) {
    $flowId = $flow['id'];
    $flowName = $flow['name'];
    $flowStatus = $flow['status'];

    echo "-------------------------------------------------------------------\n";
    echo "[" . ($flowIndex + 1) . "/" . count($flows) . "] Flow: $flowName\n";
    echo "ID: $flowId | Status: $flowStatus\n";

    // Parse steps
    $steps = json_decode($flow['steps'], true) ?: [];

    // Find all email steps that have a nextStepId
    $emailSteps = [];
    foreach ($steps as $step) {
        if ($step['type'] === 'email' && !empty($step['nextStepId'])) {
            $emailSteps[] = [
                'id' => $step['id'],
                'label' => $step['label'],
                'nextStepId' => $step['nextStepId']
            ];
        }
    }

    if (empty($emailSteps)) {
        echo "ℹ️  No email steps with next steps found. Skipping...\n";
        continue;
    }

    echo "Found " . count($emailSteps) . " email step(s) to check\n";

    $flowFixedCount = 0;

    foreach ($emailSteps as $emailStep) {
        $stepId = $emailStep['id'];
        $stepLabel = $emailStep['label'];
        $nextStepId = $emailStep['nextStepId'];

        // Find next step info
        $nextStepLabel = 'Unknown';
        $nextStepType = 'unknown';
        foreach ($steps as $s) {
            if ($s['id'] === $nextStepId) {
                $nextStepLabel = $s['label'];
                $nextStepType = $s['type'];
                break;
            }
        }

        // Find stuck subscribers at this email step
        // Stuck = status is 'processing' or 'completed' but still at email step for more than 5 minutes
        $stmtStuck = $pdo->prepare("
            SELECT 
                sfs.id as queue_id,
                sfs.subscriber_id,
                s.email,
                sfs.status,
                sfs.updated_at,
                TIMESTAMPDIFF(MINUTE, sfs.updated_at, NOW()) as minutes_stuck
            FROM subscriber_flow_states sfs
            LEFT JOIN subscribers s ON s.id = sfs.subscriber_id
            WHERE sfs.flow_id = ?
            AND sfs.step_id = ?
            AND sfs.status IN ('processing', 'completed')
            AND TIMESTAMPDIFF(MINUTE, sfs.updated_at, NOW()) > 5
        ");
        $stmtStuck->execute([$flowId, $stepId]);
        $stuckSubs = $stmtStuck->fetchAll(PDO::FETCH_ASSOC);

        $totalScanned += count($stuckSubs);

        if (!empty($stuckSubs)) {
            $flowsWithIssues++;
            echo "\n  ⚠️  Step: $stepLabel\n";
            echo "  Found " . count($stuckSubs) . " stuck subscriber(s)\n";

            foreach ($stuckSubs as $sub) {
                try {
                    // Move to next step
                    $pdo->prepare("
                        UPDATE subscriber_flow_states 
                        SET step_id = ?, 
                            status = 'waiting', 
                            scheduled_at = NOW(),
                            created_at = NOW(),
                            updated_at = NOW() 
                        WHERE id = ?
                    ")->execute([$nextStepId, $sub['queue_id']]);

                    echo "  ✅ {$sub['email']} -> Moved to: $nextStepLabel ($nextStepType)\n";
                    $flowFixedCount++;
                    $totalFixed++;
                } catch (Exception $e) {
                    echo "  ❌ {$sub['email']} -> Error: " . $e->getMessage() . "\n";
                }
            }
        }
    }

    if ($flowFixedCount === 0) {
        echo "✅ No stuck subscribers found in this flow\n";
    } else {
        echo "\n📝 Fixed $flowFixedCount subscriber(s) in this flow\n";
    }
}

echo "\n=================================================================\n";
echo "📊 SUMMARY\n";
echo "=================================================================\n";
echo "Total Flows Scanned:       " . count($flows) . "\n";
echo "Flows with Issues:         $flowsWithIssues\n";
echo "Total Subscribers Scanned: $totalScanned\n";
echo "Total Fixed:               $totalFixed\n";
echo "=================================================================\n";

if ($totalFixed > 0) {
    echo "\n✅ Successfully fixed $totalFixed subscribers!\n";
    echo "These subscribers will be processed by the worker in the next run cycle.\n";
} else {
    echo "\n✅ All flows are healthy! No stuck subscribers found.\n";
}

echo "\nCompleted at " . date('Y-m-d H:i:s') . "\n";
echo "=================================================================\n";
?>