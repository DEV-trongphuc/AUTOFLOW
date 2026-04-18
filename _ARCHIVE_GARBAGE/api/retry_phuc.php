<?php
require_once 'db_connect.php';

$email = 'phucht@ideas.edu.vn';
$flowId = '808da9d3-dca9-475b-844f-5df52ac0508b';
// Step ID của bước Gửi Email thất bại
$emailStepId = '181a8223-b4ee-4eb0-a90f-360653ebf864';

// 1. Get subscriber ID
$stmt = $pdo->prepare("SELECT id FROM subscribers WHERE email = ?");
$stmt->execute([$email]);
$subId = $stmt->fetchColumn();

// 2. Reset Status to Waiting
$stmt = $pdo->prepare("UPDATE subscriber_flow_states SET status = 'waiting', step_id = ?, scheduled_at = NOW(), last_error = NULL WHERE subscriber_id = ? AND flow_id = ?");
$stmt->execute([$emailStepId, $subId, $flowId]);

echo "Reset done. Rows affected: " . $stmt->rowCount() . "\n";

// 3. Poke Worker
echo "Poking worker...\n";
$url = API_BASE_URL . "/worker_flow.php?priority_queue_id=RETRY&subscriber_id=$subId&priority_flow_id=$flowId";
// Note: We don't have the queue ID easily here but regular worker will pick it up since status is waiting and time is NOW.
triggerAsyncWorker();
echo "Worker triggered.\n";
