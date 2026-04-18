<?php
require_once 'api/db_connect.php';

$flowId = 'ad16ed97-06b8-49a6-a8da-222c93191db0';

$stmt = $pdo->prepare("SELECT name, steps FROM flows WHERE id = ?");
$stmt->execute([$flowId]);
$flow = $stmt->fetch(PDO::FETCH_ASSOC);

if (!$flow) {
    echo "Flow not found\n";
    exit;
}

echo "Flow Name: " . $flow['name'] . "\n";
$steps = json_decode($flow['steps'], true);

foreach ($steps as $step) {
    echo "--- Step ---\n";
    echo "ID: " . $step['id'] . "\n";
    echo "Type: " . $step['type'] . "\n";
    echo "Label: " . ($step['label'] ?? 'N/A') . "\n";
    if (isset($step['wait_time'])) {
        echo "Wait Time: " . $step['wait_time'] . " " . ($step['wait_unit'] ?? '') . "\n";
    }
    if (isset($step['nextStepId']))
        echo "Next ID: " . $step['nextStepId'] . "\n";
    if (isset($step['trueNextStepId']))
        echo "True Next ID: " . $step['trueNextStepId'] . "\n";
    if (isset($step['falseNextStepId']))
        echo "False Next ID: " . $step['falseNextStepId'] . "\n";
}
