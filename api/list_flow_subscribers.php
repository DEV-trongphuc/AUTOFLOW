<?php
require_once 'db_connect.php';

$flowId = '6972fea76fa61';
$stmt = $pdo->prepare("
    SELECT q.id as queue_id, q.subscriber_id, q.step_id, q.status, q.scheduled_at, q.updated_at, q.last_error,
           s.email, s.first_name, s.last_name
    FROM subscriber_flow_states q
    JOIN subscribers s ON q.subscriber_id = s.id
    WHERE q.flow_id = ?
    ORDER BY q.status DESC, q.updated_at DESC
");
$stmt->execute([$flowId]);
$rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

echo "Subscribers in Flow $flowId:\n";
echo str_repeat("-", 100) . "\n";
echo sprintf("%-10s | %-25s | %-12s | %-12s | %-20s | %-20s\n", "Queue ID", "Email", "Step ID", "Status", "Scheduled At", "Last Error");
echo str_repeat("-", 100) . "\n";

foreach ($rows as $row) {
    echo sprintf(
        "%-10s | %-25s | %-12s | %-12s | %-20s | %-20s\n",
        $row['queue_id'],
        $row['email'],
        substr($row['step_id'], 0, 8),
        $row['status'],
        $row['scheduled_at'],
        substr($row['last_error'] ?? '', 0, 20)
    );
}
