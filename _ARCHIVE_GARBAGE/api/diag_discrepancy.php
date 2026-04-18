<?php
require_once __DIR__ . '/db_connect.php';
$flowId = '69dca73f0d951';
$stmt = $pdo->prepare("SELECT status, count(*) as count FROM subscriber_flow_states WHERE flow_id = ? GROUP BY status");
$stmt->execute([$flowId]);
echo "Status Summary:\n";
print_r($stmt->fetchAll(PDO::FETCH_ASSOC));

$stmt = $pdo->prepare("SELECT step_id, status, count(*) as count FROM subscriber_flow_states WHERE flow_id = ? AND status != 'completed' GROUP BY step_id, status");
$stmt->execute([$flowId]);
echo "\nDetailed Steps (Non-Completed):\n";
print_r($stmt->fetchAll(PDO::FETCH_ASSOC));
?>
