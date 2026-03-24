<?php
error_reporting(E_ALL);
ini_set('display_errors', 1);
require_once 'db_connect.php';

$flowId = '6200f46f-7349-4fa2-a65d-889abe63c25d';
$stepId = '5254dbfa-7657-4375-a7a8-3930f948f775'; // Step Condition

echo "=== FIXING SCHEDULED_AT FOR CONDITION STEP ===\n";

try {
    // 1. Get flow steps to find wait config
    $stmt = $pdo->prepare("SELECT steps FROM flows WHERE id = ?");
    $stmt->execute([$flowId]);
    $steps = json_decode($stmt->fetchColumn(), true);

    $waitDur = 3;
    $waitUnit = 'days';

    foreach ($steps as $s) {
        if ($s['id'] === $stepId) {
            $waitDur = (int) ($s['config']['waitDuration'] ?? 3);
            $waitUnit = $s['config']['waitUnit'] ?? 'days';
            break;
        }
    }

    echo "Config: $waitDur $waitUnit\n";

    // 2. Update scheduled_at based on created_at (entry time to step)
    // Formula: scheduled_at = created_at + wait duration
    // MariaDB expects singular units: DAY, HOUR, MINUTE
    $unit = 'DAY';
    if (strpos(strtolower($waitUnit), 'hour') !== false)
        $unit = 'HOUR';
    if (strpos(strtolower($waitUnit), 'minute') !== false)
        $unit = 'MINUTE';

    $sql = "UPDATE subscriber_flow_states 
            SET scheduled_at = DATE_ADD(created_at, INTERVAL $waitDur $unit)
            WHERE flow_id = ? AND TRIM(step_id) = ? AND status = 'waiting'";

    $stmtUpd = $pdo->prepare($sql);
    $stmtUpd->execute([$flowId, trim($stepId)]);
    $count = $stmtUpd->rowCount();

    echo "Updated $count subscribers to show correct timeout time.\n";
    echo "Done.\n";

} catch (Exception $e) {
    echo "ERROR: " . $e->getMessage() . "\n";
}
