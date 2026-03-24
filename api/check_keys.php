<?php
require_once 'db_connect.php';
$res = $pdo->query('SELECT property_id, gemini_api_key FROM ai_chatbot_settings')->fetchAll(PDO::FETCH_ASSOC);
echo json_encode($res, JSON_PRETTY_PRINT);
