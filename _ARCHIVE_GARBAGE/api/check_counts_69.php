<?php
require_once 'db_connect.php';
$flowId = '69dca73f0d951';
$stmt = $pdo->prepare("SELECT status, count(*) as count FROM subscriber_flow_states WHERE flow_id = ? GROUP BY status");
$stmt->execute([$flowId]);
$all = $stmt->fetchAll(PDO::FETCH_ASSOC);
header('Content-Type: application/json');
echo json_encode($all);
?>
