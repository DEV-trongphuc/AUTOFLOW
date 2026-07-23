<?php
require_once __DIR__ . '/db_connect.php';

$totalOverdue = $pdo->query("SELECT COUNT(*) FROM subscriber_flow_states WHERE status='waiting' AND scheduled_at < DATE_SUB(NOW(), INTERVAL 30 MINUTE)")->fetchColumn();

$inactiveFlow = $pdo->query("
    SELECT COUNT(*) FROM subscriber_flow_states q
    JOIN flows f ON q.flow_id = f.id
    WHERE q.status='waiting' AND q.scheduled_at < DATE_SUB(NOW(), INTERVAL 30 MINUTE)
    AND f.status != 'active'
")->fetchColumn();

$wsStateSubMismatch = $pdo->query("
    SELECT COUNT(*) FROM subscriber_flow_states q
    JOIN subscribers s ON q.subscriber_id = s.id
    WHERE q.status='waiting' AND q.scheduled_at < DATE_SUB(NOW(), INTERVAL 30 MINUTE)
    AND q.workspace_id != s.workspace_id
")->fetchColumn();

$wsFlowSubMismatch = $pdo->query("
    SELECT COUNT(*) FROM subscriber_flow_states q
    JOIN flows f ON q.flow_id = f.id
    JOIN subscribers s ON q.subscriber_id = s.id
    WHERE q.status='waiting' AND q.scheduled_at < DATE_SUB(NOW(), INTERVAL 30 MINUTE)
    AND f.workspace_id != s.workspace_id
")->fetchColumn();

$orphanSub = $pdo->query("
    SELECT COUNT(*) FROM subscriber_flow_states q
    LEFT JOIN subscribers s ON q.subscriber_id = s.id
    WHERE q.status='waiting' AND q.scheduled_at < DATE_SUB(NOW(), INTERVAL 30 MINUTE)
    AND s.id IS NULL
")->fetchColumn();

$orphanFlow = $pdo->query("
    SELECT COUNT(*) FROM subscriber_flow_states q
    LEFT JOIN flows f ON q.flow_id = f.id
    WHERE q.status='waiting' AND q.scheduled_at < DATE_SUB(NOW(), INTERVAL 30 MINUTE)
    AND f.id IS NULL
")->fetchColumn();

echo json_encode([
    'total_overdue' => (int)$totalOverdue,
    'inactive_flow' => (int)$inactiveFlow,
    'ws_state_sub_mismatch' => (int)$wsStateSubMismatch,
    'ws_flow_sub_mismatch' => (int)$wsFlowSubMismatch,
    'orphan_subscriber' => (int)$orphanSub,
    'orphan_flow' => (int)$orphanFlow
], JSON_PRETTY_PRINT);
