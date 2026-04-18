<?php
require_once 'db_connect.php';
$stmt = $pdo->query("SELECT id, mid, psid, message_type, content, status, error_message, created_at 
                     FROM meta_message_logs 
                     WHERE direction = 'outbound' 
                     ORDER BY created_at DESC LIMIT 10");
$rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

header('Content-Type: application/json');
echo json_encode($rows, JSON_PRETTY_PRINT);
?>