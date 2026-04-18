<?php
require_once 'db_connect.php';

$stmt = $pdo->query("SELECT status, COUNT(*) as count FROM queue_jobs GROUP BY status");
$results = $stmt->fetchAll(PDO::FETCH_ASSOC);

echo "Queue Status:\n";
foreach ($results as $row) {
    echo "- {$row['status']}: {$row['count']}\n";
}

$stmtFail = $pdo->query("SELECT type, error_message, created_at FROM queue_jobs WHERE status = 'failed' ORDER BY created_at DESC LIMIT 5");
$fails = $stmtFail->fetchAll(PDO::FETCH_ASSOC);

if ($fails) {
    echo "\nRecent Failures:\n";
    foreach ($fails as $f) {
        echo "- [{$f['created_at']}] Type: {$f['type']}, Error: {$f['error_message']}\n";
    }
} else {
    echo "\nNo recent failures found.\n";
}

$stmtPending = $pdo->query("SELECT id, created_at FROM queue_jobs WHERE status = 'pending' ORDER BY created_at DESC LIMIT 5");
$pending = $stmtPending->fetchAll(PDO::FETCH_ASSOC);

if ($pending) {
    echo "\nRecent Pending Jobs:\n";
    foreach ($pending as $p) {
        echo "- [{$p['created_at']}] ID: {$p['id']}\n";
    }
}
