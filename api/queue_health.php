<?php
require_once 'db_connect.php';

$stmt = $pdo->query("SELECT status, COUNT(*) as count FROM queue_jobs GROUP BY status");
$stats = $stmt->fetchAll();

echo "--- Queue Health ---\n";
foreach ($stats as $s) {
    echo "Status: {$s['status']} | Count: {$s['count']}\n";
}

$stmt = $pdo->query("SELECT id, queue, status, available_at, error_message FROM queue_jobs WHERE status = 'failed' ORDER BY finished_at DESC LIMIT 5");
$failed = $stmt->fetchAll();

if ($failed) {
    echo "\n--- Recent Failed Jobs ---\n";
    foreach ($failed as $f) {
        echo "ID: {$f['id']} | Queue: {$f['queue']} | Error: {$f['error_message']}\n";
    }
}
