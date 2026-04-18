<?php
error_reporting(E_ALL);
ini_set('display_errors', 1);
require_once __DIR__ . '/db_connect.php';

$flowId = '69dca73f0d951';
$stepCompletedWaitId = '668930db-7bb5-4e43-87f2-7ae3e2131a4a'; // Node "Ch? d?n 16/04 20:00"
$targetDate = '2026-04-16 20:00:00';

$stmt = $pdo->prepare("UPDATE subscriber_flow_states SET scheduled_at = ? WHERE flow_id = ? AND step_id = ? AND status = 'waiting' AND scheduled_at <= NOW()");
$stmt->execute([$targetDate, $flowId, $stepCompletedWaitId]);

echo "Fixed: " . $stmt->rowCount();
?>
