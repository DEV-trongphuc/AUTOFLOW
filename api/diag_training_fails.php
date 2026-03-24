<?php
require_once 'db_connect.php';
$stmt = $pdo->query("SELECT id, queue, status, error_message FROM queue_jobs WHERE queue = 'ai_training' AND status = 'failed' LIMIT 10");
$results = $stmt->fetchAll(PDO::FETCH_ASSOC);
echo json_encode($results);
