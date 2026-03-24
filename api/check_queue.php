<?php
// api/check_queue.php
require_once 'db_connect.php';

header('Content-Type: application/json');

$pending = $pdo->query("SELECT COUNT(*) FROM queue_jobs WHERE status = 'pending'")->fetchColumn();
$processing = $pdo->query("SELECT COUNT(*) FROM queue_jobs WHERE status = 'processing'")->fetchColumn();
$failed = $pdo->query("SELECT COUNT(*) FROM queue_jobs WHERE status = 'failed'")->fetchColumn();
$completed = $pdo->query("SELECT COUNT(*) FROM queue_jobs WHERE status = 'completed'")->fetchColumn();

// Check stuck docs
$stuckDocs = $pdo->query("SELECT id, name, status, error_message FROM ai_training_docs WHERE status = 'processing'")->fetchAll(PDO::FETCH_ASSOC);

$timeInfo = $pdo->query("SELECT NOW() as db_now")->fetch();
$phpNow = date('Y-m-d H:i:s');

echo json_encode([
    'queue_stats' => [
        'pending' => (int) $pending,
        'processing' => (int) $processing,
        'failed' => (int) $failed,
        'completed' => (int) $completed
    ],
    'stuck_docs' => $stuckDocs,
    'time_sync' => [
        'db_now' => $timeInfo['db_now'],
        'php_now' => $phpNow
    ]
]);
