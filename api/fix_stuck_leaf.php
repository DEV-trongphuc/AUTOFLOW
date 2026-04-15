<?php
error_reporting(E_ALL);
ini_set('display_errors', 1);

require_once 'db_connect.php';

$flowId = '69dca73f0d951';
$stmt = $pdo->prepare("SELECT steps FROM flows WHERE id = ?");
$stmt->execute([$flowId]);
$stepsJson = $stmt->fetchColumn();
$steps = json_decode($stepsJson, true);

$leafNodes = [];
foreach ($steps as $step) {
    $hasOut = false;
    if (isset($step['nextStepId']) && $step['nextStepId']) $hasOut = true;
    if (isset($step['yesStepId']) && $step['yesStepId']) $hasOut = true;
    if (isset($step['noStepId']) && $step['noStepId']) $hasOut = true;
    if (isset($step['pathAStepId']) && $step['pathAStepId']) $hasOut = true;
    if (isset($step['pathBStepId']) && $step['pathBStepId']) $hasOut = true;
    if (!$hasOut && $step['type'] !== 'trigger') $leafNodes[] = $step['id'];
}

echo "<h3>Nodes Hoàn thành (Leaf Nodes):</h3>";
echo implode(', ', $leafNodes) . "<br>";

if (count($leafNodes) > 0) {
    $placeholders = implode(',', array_fill(0, count($leafNodes), '?'));
    $stmt = $pdo->prepare("SELECT id FROM subscriber_flow_states WHERE flow_id = ? AND status != 'completed' AND step_id IN ()");
    $stmt->execute(array_merge([$flowId], $leafNodes));
    $stuck = $stmt->fetchAll(PDO::FETCH_ASSOC);

    echo "Tìm th?y <b>" . count($stuck) . "</b> ngu?i chua báo Hoàn thành t?i các bu?c này.<br>";
    if (count($stuck) > 0) {
        $ids = array_column($stuck, 'id');
        $idPlaceholders = implode(',', array_fill(0, count($ids), '?'));
        $pdo->prepare("UPDATE subscriber_flow_states SET status = 'completed', updated_at = NOW() WHERE id IN ()")->execute($ids);
        echo "<h2 style='color:green'>Ðã x? lý xong xuôi!</h2>";
    }
}
