<?php
require_once __DIR__ . '/db_connect.php';
$flowId = '69dca73f0d951';
// Reset stuck processing items older than 5 minutes
$pdo->prepare("UPDATE subscriber_flow_states SET status = 'waiting' WHERE flow_id = ? AND status = 'processing' AND updated_at < DATE_SUB(NOW(), INTERVAL 5 MINUTE)")->execute([$flowId]);
echo "Reset stuck processing items.\n";

// Count non-completed
$stmt = $pdo->prepare("SELECT status, count(*) as count FROM subscriber_flow_states WHERE flow_id = ? AND status != 'completed' GROUP BY status");
$stmt->execute([$flowId]);
print_r($stmt->fetchAll(PDO::FETCH_ASSOC));
?>
