<?php
require_once 'db_connect.php';
$bots = $pdo->query("SELECT property_id, bot_name FROM ai_chatbot_settings WHERE property_id IN ('7ac8420d-b248-4ab5-a97d-0fd177e0ae64', 'ce71ea2e-d841-4e0f-b3ad-332297cde330')")->fetchAll(PDO::FETCH_ASSOC);
print_r($bots);
?>