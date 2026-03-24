<?php
require_once 'db_connect.php';

$email = 'phucht@ideas.edu.vn';
$flowId = '808da9d3-dca9-475b-844f-5df52ac0508b';

// 1. Get subscriber ID
$stmt = $pdo->prepare("SELECT id FROM subscribers WHERE email = ?");
$stmt->execute([$email]);
$subId = $stmt->fetchColumn();

// 2. Check Flow State
$stmt = $pdo->prepare("SELECT * FROM subscriber_flow_states WHERE subscriber_id = ? AND flow_id = ?");
$stmt->execute([$subId, $flowId]);
$state = $stmt->fetch();

echo "--- Flow State ---\n";
print_r($state);

// 3. Last Activity
$stmt = $pdo->prepare("SELECT * FROM subscriber_activity WHERE subscriber_id = ? ORDER BY created_at DESC LIMIT 3");
$stmt->execute([$subId]);
$acts = $stmt->fetchAll();
echo "\n--- Last 3 Activities ---\n";
foreach ($acts as $a) {
    echo "{$a['created_at']} | {$a['type']} | {$a['details']}\n";
}
