<?php
require_once 'db_connect.php';

$flowId = '6972fea76fa61';
$stmt = $pdo->prepare("SELECT id, name, steps, trigger_type FROM flows WHERE id = ?");
$stmt->execute([$flowId]);
$flow = $stmt->fetch();

if (!$flow) {
    die("Flow $flowId not found.\n");
}

echo "Flow Name: " . $flow['name'] . "\n";
echo "Trigger Type: " . $flow['trigger_type'] . "\n";
echo "Steps JSON:\n";
echo $flow['steps'] . "\n";

// Also find the other flow mentioned in logs
$stmt = $pdo->prepare("SELECT id, name FROM flows WHERE name LIKE '%Chăm sóc sau Chiến dịch Team Building%'");
$stmt->execute();
$otherFlows = $stmt->fetchAll();
foreach ($otherFlows as $f) {
    echo "\nFound Other Flow: " . $f['name'] . " (ID: " . $f['id'] . ")\n";
    $stmtS = $pdo->prepare("SELECT steps FROM flows WHERE id = ?");
    $stmtS->execute([$f['id']]);
    echo "Steps JSON for " . $f['name'] . ":\n";
    echo $stmtS->fetchColumn() . "\n";
}
