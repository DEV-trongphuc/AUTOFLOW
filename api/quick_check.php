<?php
require_once 'db_connect.php';
header('Content-Type: text/plain; charset=utf-8');

echo "=== LAST 15 SUBSCRIBER ACTIVITIES ===\n";
$stmt = $pdo->query("SELECT created_at, subscriber_id, type, reference_name, details FROM subscriber_activity ORDER BY created_at DESC LIMIT 15");
foreach ($stmt->fetchAll() as $r) {
    echo "[{$r['created_at']}] {$r['type']} - {$r['reference_name']} - {$r['details']}\n";
}

echo "\n=== LAST 15 FLOW ENROLLMENTS ===\n";
$stmt = $pdo->query("SELECT sfs.created_at, s.email, f.name, sfs.status FROM subscriber_flow_states sfs JOIN subscribers s ON sfs.subscriber_id=s.id JOIN flows f ON sfs.flow_id=f.id ORDER BY sfs.created_at DESC LIMIT 15");
foreach ($stmt->fetchAll() as $r) {
    echo "[{$r['created_at']}] {$r['email']} → {$r['name']} ({$r['status']})\n";
}
?>