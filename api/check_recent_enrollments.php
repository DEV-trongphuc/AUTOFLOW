<?php
require_once 'db_connect.php';
header('Content-Type: text/plain; charset=utf-8');

echo "=== RECENT ENROLLMENTS (ALL STATUSES) ===\n\n";
$stmt = $pdo->query("SELECT 
    sfs.id,
    sfs.created_at,
    s.email,
    f.name as flow_name,
    sfs.status,
    sfs.step_id
FROM subscriber_flow_states sfs
JOIN subscribers s ON sfs.subscriber_id = s.id
JOIN flows f ON sfs.flow_id = f.id
ORDER BY sfs.created_at DESC
LIMIT 20");

foreach ($stmt->fetchAll(PDO::FETCH_ASSOC) as $row) {
    echo "[{$row['created_at']}] ID:{$row['id']} - {$row['email']} → {$row['flow_name']} (Status: {$row['status']}, Step: {$row['step_id']})\n";
}

echo "\n=== CHECK QUEUE ID 115 SPECIFICALLY ===\n";
$stmt = $pdo->query("SELECT 
    sfs.*,
    s.email,
    f.name as flow_name
FROM subscriber_flow_states sfs
LEFT JOIN subscribers s ON sfs.subscriber_id = s.id
LEFT JOIN flows f ON sfs.flow_id = f.id
WHERE sfs.id = 115");

$result = $stmt->fetch(PDO::FETCH_ASSOC);
if ($result) {
    echo "FOUND!\n";
    print_r($result);
} else {
    echo "NOT FOUND - enrollment may have been deleted or processed\n";
}
?>