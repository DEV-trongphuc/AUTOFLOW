<?php
// api/check_recent_activity.php
require_once 'db_connect.php';
header('Content-Type: text/plain; charset=utf-8');

echo "=== RECENT SUBSCRIBER ACTIVITY (Last 10) ===\n\n";
$stmt = $pdo->query("SELECT 
    created_at,
    subscriber_id,
    type,
    reference_name,
    details
FROM subscriber_activity 
ORDER BY created_at DESC 
LIMIT 10");

foreach ($stmt->fetchAll(PDO::FETCH_ASSOC) as $row) {
    echo "[{$row['created_at']}] {$row['subscriber_id']} - {$row['type']} - {$row['reference_name']}: {$row['details']}\n";
}

echo "\n\n=== RECENT FLOW ENROLLMENTS (Last 10) ===\n\n";
$stmt = $pdo->query("SELECT 
    sfs.id,
    sfs.created_at,
    sfs.subscriber_id,
    s.email,
    f.name as flow_name,
    sfs.step_id,
    sfs.status,
    sfs.scheduled_at
FROM subscriber_flow_states sfs
JOIN subscribers s ON sfs.subscriber_id = s.id
JOIN flows f ON sfs.flow_id = f.id
ORDER BY sfs.created_at DESC 
LIMIT 10");

foreach ($stmt->fetchAll(PDO::FETCH_ASSOC) as $row) {
    echo "[{$row['created_at']}] ID:{$row['id']} - {$row['email']} → Flow: {$row['flow_name']} (Step: {$row['step_id']}, Status: {$row['status']}, Scheduled: {$row['scheduled_at']})\n";
}

echo "\n\n=== ACTIVE FLOWS WITH PURCHASE/FORM TRIGGERS ===\n\n";
$stmt = $pdo->query("SELECT id, name, steps, status FROM flows WHERE status = 'active'");
foreach ($stmt->fetchAll(PDO::FETCH_ASSOC) as $flow) {
    $steps = json_decode($flow['steps'], true);
    foreach ($steps as $step) {
        if ($step['type'] === 'trigger') {
            $config = $step['config'];
            $type = $config['type'] ?? '';
            $targetId = $config['targetId'] ?? '';
            if (in_array($type, ['purchase', 'form', 'custom_event'])) {
                echo "Flow: {$flow['name']} ({$flow['id']})\n";
                echo "  Trigger: $type, Target ID: " . ($targetId ?: 'ANY') . "\n";
            }
        }
    }
}
?>