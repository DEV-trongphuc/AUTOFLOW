<?php
// api/check_flow_structure.php
// Check flow structure to see step connections

ini_set('display_errors', 1);
error_reporting(E_ALL);
require_once 'db_connect.php';

header('Content-Type: text/plain; charset=utf-8');

$flowId = $_GET['flow_id'] ?? '6200f46f-7349-4fa2-a65d-889abe63c25d'; // Chào mừng gửi Form

echo "=================================================================\n";
echo "FLOW STRUCTURE CHECK\n";
echo "=================================================================\n";
echo "Flow ID: $flowId\n";
echo "Time: " . date('Y-m-d H:i:s') . "\n\n";

// Get flow
$stmtFlow = $pdo->prepare("SELECT * FROM flows WHERE id = ?");
$stmtFlow->execute([$flowId]);
$flow = $stmtFlow->fetch(PDO::FETCH_ASSOC);

if (!$flow) {
    die("❌ Flow not found!\n");
}

echo "Flow Name: {$flow['name']}\n";
echo "Status: {$flow['status']}\n\n";

$steps = json_decode($flow['steps'], true) ?: [];

echo "--- FLOW STEPS (" . count($steps) . " total) ---\n\n";

foreach ($steps as $index => $step) {
    echo "Step #" . ($index + 1) . ":\n";
    echo "  ID: {$step['id']}\n";
    echo "  Type: {$step['type']}\n";
    echo "  Label: {$step['label']}\n";

    // Show connections
    if (isset($step['nextStepId'])) {
        echo "  Next Step ID: {$step['nextStepId']}\n";

        // Find next step
        $found = false;
        foreach ($steps as $s) {
            if ($s['id'] === $step['nextStepId']) {
                echo "  Next Step: {$s['label']} ({$s['type']})\n";
                $found = true;
                break;
            }
        }
        if (!$found) {
            echo "  ⚠️ WARNING: Next step ID '{$step['nextStepId']}' NOT FOUND in flow!\n";
        }
    } else {
        echo "  Next Step ID: NULL (End of flow)\n";
    }

    // For condition steps, show branches
    if ($step['type'] === 'condition') {
        echo "  YES Branch: " . ($step['yesStepId'] ?? 'NULL') . "\n";
        echo "  NO Branch: " . ($step['noStepId'] ?? 'NULL') . "\n";

        $config = $step['config'] ?? [];
        echo "  Condition Type: " . ($config['conditionType'] ?? 'N/A') . "\n";
        echo "  Wait Duration: " . ($config['waitDuration'] ?? 'N/A') . " " . ($config['waitUnit'] ?? 'N/A') . "\n";
    }

    echo "\n";
}

// Check for orphaned steps
echo "--- ORPHANED STEPS CHECK ---\n";
$allStepIds = array_column($steps, 'id');
$referencedStepIds = [];

foreach ($steps as $step) {
    if (isset($step['nextStepId'])) {
        $referencedStepIds[] = $step['nextStepId'];
    }
    if (isset($step['yesStepId'])) {
        $referencedStepIds[] = $step['yesStepId'];
    }
    if (isset($step['noStepId'])) {
        $referencedStepIds[] = $step['noStepId'];
    }
}

$referencedStepIds = array_unique($referencedStepIds);

foreach ($referencedStepIds as $refId) {
    if (!in_array($refId, $allStepIds)) {
        echo "⚠️ WARNING: Step ID '$refId' is referenced but doesn't exist!\n";
    }
}

echo "\n=================================================================\n";
echo "END OF REPORT\n";
echo "=================================================================\n";
?>