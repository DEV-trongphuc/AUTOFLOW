<?php
require_once 'db_connect.php';
header('Content-Type: application/json');

$email = 'dom.marketing.vn@gmail.com';
$stmt = $pdo->prepare("SELECT * FROM subscribers WHERE email = ?");
$stmt->execute([$email]);
$sub = $stmt->fetch();

if (!$sub) {
    echo json_encode(['error' => 'Subscriber not found']);
    exit;
}

$sid = $sub['id'];

// Get Flow State
$stmtState = $pdo->prepare("SELECT * FROM subscriber_flow_states WHERE subscriber_id = ?");
$stmtState->execute([$sid]);
$states = $stmtState->fetchAll();

// Get Activity
$stmtAct = $pdo->prepare("SELECT * FROM subscriber_activity WHERE subscriber_id = ? ORDER BY created_at DESC LIMIT 20");
$stmtAct->execute([$sid]);
$activities = $stmtAct->fetchAll();

echo json_encode([
    'subscriber' => $sub,
    'states' => $states,
    'recent_activities' => $activities
], JSON_PRETTY_PRINT);
