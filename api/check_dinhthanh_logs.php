<?php
require_once 'db_connect.php';

$email = 'dinhthanh@ideas.edu.vn';
$stmt = $pdo->prepare("SELECT id FROM subscribers WHERE email = ?");
$stmt->execute([$email]);
$sid = $stmt->fetchColumn();

if (!$sid)
    die("Subscriber not found.\n");

echo "Full Activity Log for Subscriber $sid ($email):\n";
$stmt = $pdo->prepare("SELECT * FROM subscriber_activity WHERE subscriber_id = ? ORDER BY created_at ASC");
$stmt->execute([$sid]);
$rows = $stmt->fetchAll();

foreach ($rows as $r) {
    echo "{$r['created_at']} | {$r['type']} | Ref: {$r['reference_name']} ({$r['reference_id']}) | Details: {$r['details']}\n";
}

echo "\n--- Flow States ---\n";
$stmt = $pdo->prepare("SELECT * FROM subscriber_flow_states WHERE subscriber_id = ?");
$stmt->execute([$sid]);
foreach ($stmt->fetchAll() as $s) {
    echo "ID: {$s['id']} | Flow: {$s['flow_id']} | Step: {$s['step_id']} | Status: {$s['status']} | Scheduled: {$s['scheduled_at']} | Updated: {$s['updated_at']}\n";
}
