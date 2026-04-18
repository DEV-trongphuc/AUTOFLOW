<?php
require_once 'db_connect.php';
$fid = 'ad16ed97-06b8-49a6-a8da-222c93191db0';
$stmt = $pdo->prepare("SELECT q.subscriber_id, q.step_id, q.status, s.email FROM subscriber_flow_states q JOIN subscribers s ON q.subscriber_id = s.id WHERE q.flow_id = ? AND q.status != 'waiting' LIMIT 20");
$stmt->execute([$fid]);
echo "<pre>";
print_r($stmt->fetchAll(PDO::FETCH_ASSOC));
echo "</pre>";
