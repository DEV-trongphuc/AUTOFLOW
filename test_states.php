<?php
require 'api/db_connect.php'; 
$flowId = $_GET['flow_id'] ?? 'c135da1d6d4ba'; // Not sure of exact flow ID, will fetch latest
$stmt1 = $pdo->query("SELECT id, name FROM flows ORDER BY updated_at DESC LIMIT 1");
$flow = $stmt1->fetch();
$fid = $flow['id'];

$stmt = $pdo->prepare("SELECT status, count(*) c FROM subscriber_flow_states WHERE flow_id = ? GROUP BY status");
$stmt->execute([$fid]);
print_r(['flow' => $flow['name'], 'fid' => $fid, 'states' => $stmt->fetchAll(PDO::FETCH_ASSOC)]);

$stmt2 = $pdo->prepare("SELECT stat_enrolled, stat_completed, stat_total_sent FROM flows WHERE id = ?");
$stmt2->execute([$fid]);
print_r($stmt2->fetch(PDO::FETCH_ASSOC));
