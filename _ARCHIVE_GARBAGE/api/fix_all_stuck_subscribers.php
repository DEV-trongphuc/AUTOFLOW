<?php
// api/fix_all_stuck_subscribers.php
// Batch fix for ALL flows with stuck subscribers

ini_set('display_errors', 1);
error_reporting(E_ALL);
set_time_limit(300); // 5 minutes max
require_once 'db_connect.php';

$dryRun = isset($_GET['dry_run']) && $_GET['dry_run'] === '1';
$autoFix = isset($_GET['auto_fix']) && $_GET['auto_fix'] === '1';

echo "<!DOCTYPE html><html><head><meta charset='UTF-8'><title>Fix All Stuck Subscribers</title></head><body>";
echo "<h1>🔧 Fix All Stuck Subscribers - Batch Processing</h1>";
echo "<p>Mode: " . ($dryRun ? "<strong style='color: orange;'>DRY RUN (Preview only)</strong>" : "<strong style='color: red;'>LIVE MODE (Will update database)</strong>") . "</p>";
echo "<p>Time: " . date('Y-m-d H:i:s') . "</p>";

if (!$dryRun && !$autoFix) {
    echo "<div style='background: #fff3cd; border: 2px solid #ffc107; padding: 20px; margin: 20px 0; border-radius: 5px;'>";
    echo "<h3>⚠️ Confirmation Required</h3>";
    echo "<p>You are about to fix stuck subscribers across ALL flows. This will:</p>";
    echo "<ul>";
    echo "<li>Scan all active flows in the database</li>";
    echo "<li>Identify subscribers stuck at completed steps</li>";
    echo "<li>Move them to their next scheduled step</li>";
    echo "</ul>";
    echo "<p><strong>Are you sure you want to proceed?</strong></p>";
    echo "<p>";
    echo "<a href='?dry_run=1' style='background: #17a2b8; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; margin-right: 10px;'>👁️ Preview First (Dry Run)</a>";
    echo "<a href='?auto_fix=1' style='background: #28a745; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;'>✅ Yes, Fix All Flows</a>";
    echo "</p>";
    echo "</div>";
    echo "</body></html>";
    exit;
}

echo "<hr>";

// Get all active flows
$stmtFlows = $pdo->prepare("
    SELECT id, name, status, steps 
    FROM flows 
    WHERE status IN ('active', 'paused')
    ORDER BY created_at DESC
");
$stmtFlows->execute();
$flows = $stmtFlows->fetchAll(PDO::FETCH_ASSOC);

echo "<h2>📊 Found " . count($flows) . " active/paused flows</h2>";

$totalFixed = 0;
$totalScanned = 0;
$flowsWithIssues = 0;

foreach ($flows as $flow) {
    $flowId = $flow['id'];
    $flowName = $flow['name'];
    $flowStatus = $flow['status'];

    echo "<div style='border: 1px solid #ddd; padding: 15px; margin: 10px 0; border-radius: 5px;'>";
    echo "<h3>🔄 Flow: $flowName</h3>";
    echo "<p><small>ID: $flowId | Status: $flowStatus</small></p>";

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
        echo "<p style='color: gray;'>ℹ️ No email steps with next steps found. Skipping...</p>";
        echo "</div>";
        continue;
    }

    echo "<p>Found " . count($emailSteps) . " email step(s) to check</p>";

    $flowFixedCount = 0;

    foreach ($emailSteps as $emailStep) {
        $stepId = $emailStep['id'];
        $stepLabel = $emailStep['label'];
        $nextStepId = $emailStep['nextStepId'];

        // Find next step info
        $nextStepLabel = 'Unknown';
        foreach ($steps as $s) {
            if ($s['id'] === $nextStepId) {
                $nextStepLabel = $s['label'] . " ({$s['type']})";
                break;
            }
        }

        // Find stuck subscribers at this email step
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
            echo "<div style='background: #fff3cd; padding: 10px; margin: 10px 0; border-radius: 3px;'>";
            echo "<p><strong>⚠️ Step: $stepLabel</strong></p>";
            echo "<p>Found <strong>" . count($stuckSubs) . "</strong> stuck subscriber(s)</p>";

            echo "<table border='1' cellpadding='5' style='border-collapse: collapse; width: 100%; font-size: 12px;'>";
            echo "<tr style='background: #f8f9fa;'>
                <th>Email</th>
                <th>Status</th>
                <th>Stuck (min)</th>
                <th>Action</th>
            </tr>";

            foreach ($stuckSubs as $sub) {
                echo "<tr>";
                echo "<td>{$sub['email']}</td>";
                echo "<td>{$sub['status']}</td>";
                echo "<td>{$sub['minutes_stuck']}</td>";

                if (!$dryRun) {
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

                        echo "<td style='color: green;'>✅ Moved to: $nextStepLabel</td>";
                        $flowFixedCount++;
                        $totalFixed++;
                    } catch (Exception $e) {
                        echo "<td style='color: red;'>❌ Error: " . htmlspecialchars($e->getMessage()) . "</td>";
                    }
                } else {
                    echo "<td style='color: blue;'>Would move to: $nextStepLabel</td>";
                    $flowFixedCount++;
                }

                echo "</tr>";
            }

            echo "</table>";
            echo "</div>";
        }
    }

    if ($flowFixedCount === 0) {
        echo "<p style='color: green;'>✅ No stuck subscribers found in this flow</p>";
    } else {
        echo "<p style='color: orange;'><strong>📝 " . ($dryRun ? "Would fix" : "Fixed") . " $flowFixedCount subscriber(s) in this flow</strong></p>";
    }

    echo "</div>";
}

echo "<hr>";
echo "<div style='background: #d4edda; border: 2px solid #28a745; padding: 20px; margin: 20px 0; border-radius: 5px;'>";
echo "<h2>📊 Summary</h2>";
echo "<ul style='font-size: 16px;'>";
echo "<li><strong>Total Flows Scanned:</strong> " . count($flows) . "</li>";
echo "<li><strong>Flows with Issues:</strong> " . $flowsWithIssues . "</li>";
echo "<li><strong>Total Subscribers Scanned:</strong> " . $totalScanned . "</li>";
echo "<li><strong>Total " . ($dryRun ? "Would Be Fixed" : "Fixed") . ":</strong> <span style='color: #28a745; font-size: 20px;'>$totalFixed</span></li>";
echo "</ul>";

if ($dryRun && $totalFixed > 0) {
    echo "<hr>";
    echo "<p style='font-size: 18px;'><strong>⚠️ This was a DRY RUN - No changes were made to the database</strong></p>";
    echo "<p><a href='?auto_fix=1' style='background: #28a745; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-size: 16px;'>🔧 FIX ALL $totalFixed SUBSCRIBERS NOW</a></p>";
} elseif (!$dryRun && $totalFixed > 0) {
    echo "<hr>";
    echo "<p style='font-size: 18px; color: #28a745;'><strong>✅ Successfully fixed $totalFixed subscribers!</strong></p>";
    echo "<p>These subscribers will be processed by the worker in the next run cycle.</p>";
} else {
    echo "<hr>";
    echo "<p style='font-size: 18px; color: #28a745;'><strong>✅ All flows are healthy! No stuck subscribers found.</strong></p>";
}

echo "</div>";

echo "<hr>";
echo "<p><a href='?dry_run=1' style='background: #6c757d; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;'>🔄 Run Again (Dry Run)</a></p>";
echo "<p><small>Script completed at " . date('Y-m-d H:i:s') . "</small></p>";

echo "</body></html>";
?>