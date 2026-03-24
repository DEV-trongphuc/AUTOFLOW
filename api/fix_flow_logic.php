<?php
require_once 'db_connect.php';

$flowId = '6972fea76fa61';
$stmt = $pdo->prepare("SELECT steps FROM flows WHERE id = ?");
$stmt->execute([$flowId]);
$stepsJson = $stmt->fetchColumn();

if (!$stepsJson) {
    die("Flow not found in DB.\n");
}

$steps = json_decode($stepsJson, true);
$found = false;

foreach ($steps as &$step) {
    if ($step['id'] === '063f9d18-dd82-40a2-a613-8bcddef34502') {
        $step['config']['targetStepId'] = '08542221-c4da-4249-9b2b-2feb8f300581';
        $found = true;
    }
}

if ($found) {
    $newJson = json_encode($steps);
    $stmtUpd = $pdo->prepare("UPDATE flows SET steps = ? WHERE id = ?");
    $stmtUpd->execute([$newJson, $flowId]);
    echo "SUCCESS: targetStepId updated for Flow $flowId\n";
} else {
    echo "ERROR: Condition step not found in Flow steps.\n";
}
