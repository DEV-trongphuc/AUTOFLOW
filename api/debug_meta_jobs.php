<?php
require 'db_connect.php';
$stmt = $pdo->query("SELECT id, status, available_at, created_at, finished_at, error_message FROM queue_jobs WHERE payload LIKE '%process_meta_inbound%' ORDER BY created_at DESC LIMIT 5");
header('Content-Type: application/json');
echo json_encode($stmt->fetchAll(PDO::FETCH_ASSOC));
