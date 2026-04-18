<?php
// api/check_waiting_subscribers.php
// Check subscribers in 'waiting' status at condition steps

ini_set('display_errors', 1);
error_reporting(E_ALL);
require_once 'db_connect.php';

echo "<!DOCTYPE html><html><head><meta charset='UTF-8'><title>Check Waiting Subscribers</title>";
echo "<style>
    body { font-family: Arial, sans-serif; padding: 20px; background: #f5f5f5; }
    .container { background: white; padding: 20px; border-radius: 8px; max-width: 1200px; margin: 0 auto; }
    table { width: 100%; border-collapse: collapse; margin: 20px 0; }
    th, td { padding: 10px; text-align: left; border: 1px solid #ddd; }
    th { background: #4CAF50; color: white; }
    tr:nth-child(even) { background: #f9f9f9; }
    .status-waiting { color: orange; font-weight: bold; }
    .status-processing { color: blue; font-weight: bold; }
    .status-completed { color: green; font-weight: bold; }
    .highlight { background: #fff3cd; }
</style></head><body><div class='container'>";

echo "<h1>🔍 Check Waiting Subscribers in All Flows</h1>";
echo "<p>Time: " . date('Y-m-d H:i:s') . "</p><hr>";

// Get all flows
$stmtFlows = $pdo->prepare("SELECT id, name, steps FROM flows WHERE status IN ('active', 'paused') ORDER BY created_at DESC");
$stmtFlows->execute();
$flows = $stmtFlows->fetchAll(PDO::FETCH_ASSOC);

echo "<h2>Found " . count($flows) . " active/paused flows</h2>";

$totalWaiting = 0;
$totalProcessing = 0;

foreach ($flows as $flow) {
    $flowId = $flow['id'];
    $flowName = $flow['name'];
    $steps = json_decode($flow['steps'], true) ?: [];

    // Get all subscribers in this flow
    $stmtSubs = $pdo->prepare("
        SELECT 
            sfs.id as queue_id,
            sfs.subscriber_id,
            s.email,
            sfs.step_id,
            sfs.status,
            sfs.scheduled_at,
            sfs.created_at,
            sfs.updated_at,
            TIMESTAMPDIFF(HOUR, sfs.created_at, NOW()) as hours_in_step,
            TIMESTAMPDIFF(DAY, sfs.created_at, NOW()) as days_in_step
        FROM subscriber_flow_states sfs
        LEFT JOIN subscribers s ON s.id = sfs.subscriber_id
        WHERE sfs.flow_id = ?
        AND sfs.status IN ('waiting', 'processing')
        ORDER BY sfs.created_at DESC
    ");
    $stmtSubs->execute([$flowId]);
    $subscribers = $stmtSubs->fetchAll(PDO::FETCH_ASSOC);

    if (empty($subscribers)) {
        continue;
    }

    echo "<div style='border: 2px solid #ddd; padding: 15px; margin: 20px 0; border-radius: 8px;'>";
    echo "<h3>📊 Flow: $flowName</h3>";
    echo "<p><small>ID: $flowId</small></p>";
    echo "<p>Subscribers in flow: <strong>" . count($subscribers) . "</strong></p>";

    echo "<table>";
    echo "<tr>
        <th>Email</th>
        <th>Step ID</th>
        <th>Step Info</th>
        <th>Status</th>
        <th>Time in Step</th>
        <th>Scheduled At</th>
        <th>Created At</th>
    </tr>";

    foreach ($subscribers as $sub) {
        // Find step info
        $stepInfo = "Unknown";
        $stepType = "unknown";
        $isConditionStep = false;

        foreach ($steps as $step) {
            if ($step['id'] === $sub['step_id']) {
                $stepInfo = $step['label'];
                $stepType = $step['type'];
                $isConditionStep = ($stepType === 'condition');

                if ($isConditionStep) {
                    $config = $step['config'] ?? [];
                    $waitDur = $config['waitDuration'] ?? 1;
                    $waitUnit = $config['waitUnit'] ?? 'hours';
                    $condType = $config['conditionType'] ?? 'opened';
                    $stepInfo .= " (Condition: $condType, Wait: $waitDur $waitUnit)";
                } else {
                    $stepInfo .= " ($stepType)";
                }
                break;
            }
        }

        $timeInStep = "";
        if ($sub['days_in_step'] > 0) {
            $timeInStep = $sub['days_in_step'] . " days, " . ($sub['hours_in_step'] % 24) . " hours";
        } else {
            $timeInStep = $sub['hours_in_step'] . " hours";
        }

        $rowClass = $isConditionStep ? "class='highlight'" : "";
        $statusClass = "status-" . strtolower($sub['status']);

        echo "<tr $rowClass>";
        echo "<td>{$sub['email']}</td>";
        echo "<td><small>{$sub['step_id']}</small></td>";
        echo "<td><strong>$stepInfo</strong></td>";
        echo "<td class='$statusClass'>{$sub['status']}</td>";
        echo "<td>$timeInStep</td>";
        echo "<td>{$sub['scheduled_at']}</td>";
        echo "<td>{$sub['created_at']}</td>";
        echo "</tr>";

        if ($sub['status'] === 'waiting')
            $totalWaiting++;
        if ($sub['status'] === 'processing')
            $totalProcessing++;
    }

    echo "</table>";
    echo "</div>";
}

echo "<hr>";
echo "<div style='background: #e7f3ff; padding: 20px; border-radius: 8px;'>";
echo "<h2>📊 Summary</h2>";
echo "<ul style='font-size: 16px;'>";
echo "<li><strong>Total Waiting:</strong> <span style='color: orange;'>$totalWaiting</span></li>";
echo "<li><strong>Total Processing:</strong> <span style='color: blue;'>$totalProcessing</span></li>";
echo "<li><strong>Total Active in Flows:</strong> <span style='color: green;'>" . ($totalWaiting + $totalProcessing) . "</span></li>";
echo "</ul>";
echo "</div>";

echo "<hr>";
echo "<p><small>Highlighted rows = Condition steps</small></p>";
echo "</div></body></html>";
?>