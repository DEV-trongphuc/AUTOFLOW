<?php
require_once 'db_connect.php';

$stmt = $pdo->query("SELECT MIN(reserved_at) as oldest, MAX(reserved_at) as newest FROM queue_jobs WHERE status = 'processing'");
$range = $stmt->fetch();

echo "Processing Job Range:\n";
echo "Oldest: {$range['oldest']}\n";
echo "Newest: {$range['newest']}\n";

$stmt = $pdo->query("SELECT id, queue, payload, reserved_at FROM queue_jobs WHERE status = 'processing' ORDER BY reserved_at ASC LIMIT 5");
$stuck = $stmt->fetchAll();

echo "\n--- Sample Stuck Jobs ---\n";
foreach ($stuck as $s) {
    echo "ID: {$s['id']} | Queue: {$s['queue']} | Reserved: {$s['reserved_at']} | Payload: " . substr($s['payload'], 0, 50) . "...\n";
}
