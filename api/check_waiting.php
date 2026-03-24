<?php
require_once 'db_connect.php';
header('Content-Type: text/plain; charset=utf-8');

echo "=== CHECK SPECIFIC ENROLLMENTS ===\n\n";

// Check the waiting enrollments
$stmt = $pdo->query("SELECT 
    sfs.id,
    sfs.created_at,
    s.email,
    f.name as flow_name,
    sfs.status,
    sfs.step_id,
    sfs.scheduled_at
FROM subscriber_flow_states sfs
JOIN subscribers s ON sfs.subscriber_id = s.id
JOIN flows f ON sfs.flow_id = f.id
WHERE sfs.status = 'waiting'
AND sfs.created_at >= '2025-12-31 01:29:00'
ORDER BY sfs.created_at DESC");

foreach ($stmt->fetchAll(PDO::FETCH_ASSOC) as $row) {
    echo "[{$row['created_at']}] {$row['email']} → {$row['flow_name']}\n";
    echo "  Status: {$row['status']}, Step: {$row['step_id']}, Scheduled: {$row['scheduled_at']}\n\n";
}
?>