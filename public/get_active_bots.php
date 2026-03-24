<?php
require_once '../api/db_connect.php';
$stmt = $pdo->query("SELECT id, name FROM ai_chatbots WHERE is_active = 1 LIMIT 5");
$bots = $stmt->fetchAll(PDO::FETCH_ASSOC);
header('Content-Type: application/json');
echo json_encode($bots);
