<?php
// api/find_stuck_items.php
require_once 'db_connect.php';

header('Content-Type: text/plain');

$flowId = $_GET['flow_id'] ?? null;

$sql = "SELECT sfs.*, s.email, f.name as flow_name 
        FROM subscriber_flow_states sfs
        JOIN subscribers s ON sfs.subscriber_id = s.id
        JOIN flows f ON sfs.flow_id = f.id
        WHERE sfs.status IN ('processing', 'waiting')";

if ($flowId) {
    $sql .= " AND sfs.flow_id = ?";
    $stmt = $pdo->prepare($sql);
    $stmt->execute([$flowId]);
} else {
    $stmt = $pdo->query($sql);
}

$items = $stmt->fetchAll(PDO::FETCH_ASSOC);

echo "Found " . count($items) . " items.\n";
foreach ($items as $item) {
    echo "--------------------------------------------------\n";
    echo "Queue ID: {$item['id']}\n";
    echo "Subscriber: {$item['email']} (ID: {$item['subscriber_id']})\n";
    echo "Flow: {$item['flow_name']} (ID: {$item['flow_id']})\n";
    echo "Step ID: {$item['step_id']}\n";
    echo "Status: {$item['status']}\n";
    echo "Updated At: {$item['updated_at']}\n";
    echo "Scheduled At: {$item['scheduled_at']}\n";
    echo "Last Error: {$item['last_error']}\n";
}
?>