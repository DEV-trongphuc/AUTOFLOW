<?php
require_once __DIR__ . '/db_connect.php';
$flowId = '69dca73f0d951';
$stmt = $pdo->prepare("SELECT status, COUNT(*) as count FROM subscriber_flow_states WHERE flow_id = ? GROUP BY status");
$stmt->execute([$flowId]);
$stats = $stmt->fetchAll(PDO::FETCH_ASSOC);
echo json_encode($stats);
?>
