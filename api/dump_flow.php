<?php
require 'db_connect.php';
$stmt = $pdo->query("SELECT steps FROM flows WHERE id = '69dca73f0d951'");
$res = $stmt->fetchColumn();
echo "---STEPS---\n";
echo json_encode(json_decode($res), JSON_PRETTY_PRINT|JSON_UNESCAPED_UNICODE);

$stmt2 = $pdo->query("SELECT q.step_id, q.status, q.scheduled_at, s.email FROM subscriber_flow_states q JOIN subscribers s ON q.subscriber_id=s.id WHERE q.flow_id='69dca73f0d951' AND q.status='waiting' LIMIT 5");
echo "\n---SUBS---\n";
echo json_encode($stmt2->fetchAll(PDO::FETCH_ASSOC), JSON_PRETTY_PRINT|JSON_UNESCAPED_UNICODE);
?>
