<?php
require_once __DIR__ . '/db_connect.php';

// Simulate a deep journey audit for a specific subscriber
$flowId = $_GET['flow_id'] ?? '69dca73f0d951';
$email = $_GET['email'] ?? '';

header('Content-Type: application/json; charset=utf-8');

try {
    if (empty($email)) throw new Exception("Please provide an email for auditing.");

    // 1. Get flow definition
    $stmtFlow = $pdo->prepare("SELECT steps, config FROM flows WHERE id = ?");
    $stmtFlow->execute([$flowId]);
    $flow = $stmtFlow->fetch(PDO::FETCH_ASSOC);
    $steps = json_decode($flow['steps'], true);
    $stepMap = [];
    foreach($steps as $s) $stepMap[$s['id']] = $s;

    // 2. Find Subscriber
    $stmtSub = $pdo->prepare("SELECT id FROM subscribers WHERE email = ?");
    $stmtSub->execute([$email]);
    $subscriberId = $stmtSub->fetchColumn();
    if (!$subscriberId) throw new Exception("Subscriber not found.");

    // 3. Get Flow State
    $stmtState = $pdo->prepare("SELECT * FROM subscriber_flow_states WHERE subscriber_id = ? AND flow_id = ?");
    $stmtState->execute([$subscriberId, $flowId]);
    $state = $stmtState->fetch(PDO::FETCH_ASSOC);

    // 4. Trace Activity Logs (The real journey)
    $stmtAct = $pdo->prepare("SELECT type, details, reference_id, created_at 
                              FROM subscriber_activity 
                              WHERE subscriber_id = ? AND flow_id = ? 
                              ORDER BY created_at ASC");
    $stmtAct->execute([$subscriberId, $flowId]);
    $activities = $stmtAct->fetchAll(PDO::FETCH_ASSOC);

    $journey = [];
    $prevTime = null;

    foreach ($activities as $act) {
        $stepLabel = $stepMap[$act['reference_id']]['label'] ?? 'General/System';
        $time = $act['created_at'];
        $diff = $prevTime ? (strtotime($time) - strtotime($prevTime)) : 0;
        
        $journey[] = [
            'time' => $time,
            'step' => $stepLabel,
            'type' => $act['type'],
            'details' => $act['details'],
            'wait_since_prev' => formatSeconds($diff)
        ];
        $prevTime = $time;
    }

    echo json_encode([
        'success' => true,
        'subscriber_email' => $email,
        'current_status' => $state['status'],
        'current_step' => $stepMap[$state['step_id']]['label'] ?? 'End',
        'scheduled_at' => $state['scheduled_at'],
        'journey_trail' => $journey,
        'audit_verdict' => ($state['status'] === 'failed') ? "FAIL: " . $state['last_error'] : "PASS: Journey flowing correctly"
    ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);

} catch (Exception $e) {
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}

function formatSeconds($s) {
    if ($s == 0) return "0s";
    $h = floor($s / 3600);
    $m = floor(($s % 3600) / 60);
    $sec = $s % 60;
    return ($h > 0 ? "{$h}h " : "") . ($m > 0 ? "{$m}m " : "") . "{$sec}s";
}
