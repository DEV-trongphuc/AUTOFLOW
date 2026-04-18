<?php
require_once 'db_connect.php';
header('Content-Type: text/plain; charset=utf-8');

echo "=== ENTER_FLOW ACTIVITIES (Last 20) ===\n\n";
$stmt = $pdo->query("SELECT 
    created_at,
    subscriber_id,
    reference_name,
    details
FROM subscriber_activity 
WHERE type = 'enter_flow'
ORDER BY created_at DESC 
LIMIT 20");

foreach ($stmt->fetchAll(PDO::FETCH_ASSOC) as $row) {
    echo "[{$row['created_at']}] Sub:{$row['subscriber_id']} - {$row['reference_name']} - {$row['details']}\n";
}

echo "\n=== CHECK IF QUEUE 115-117 WERE CREATED THEN DELETED ===\n";
// Check if there are any activities related to these queue IDs
$stmt = $pdo->query("SELECT * FROM subscriber_activity WHERE details LIKE '%Queue ID: 115%' OR details LIKE '%Queue ID: 116%' OR details LIKE '%Queue ID: 117%'");
$results = $stmt->fetchAll(PDO::FETCH_ASSOC);
if ($results) {
    echo "FOUND activities mentioning these queue IDs:\n";
    print_r($results);
} else {
    echo "NO activities found - enrollments may have been rolled back\n";
}
?>