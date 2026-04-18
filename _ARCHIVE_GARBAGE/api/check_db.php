<?php
require_once 'db_connect.php';

echo "=== RECENT ZALO INBOUND MESSAGES ===\n";
$stmt = $pdo->query("SELECT * FROM zalo_user_messages WHERE direction = 'inbound' ORDER BY created_at DESC LIMIT 5");
print_r($stmt->fetchAll());

echo "\n=== RECENT AI LOGS ===\n";
$stmt2 = $pdo->query("SELECT * FROM ai_chat_logs ORDER BY created_at DESC LIMIT 5");
print_r($stmt2->fetchAll());

echo "\n=== ACTIVE ZALO SCENARIOS ===\n";
$stmt3 = $pdo->query("SELECT id, oa_config_id, type, trigger_text, status, ai_chatbot_id FROM zalo_automation_scenarios WHERE status = 'active'");
print_r($stmt3->fetchAll());

echo "\n=== RECENT ZALO ACTIVITY ===\n";
$stmt4 = $pdo->query("SELECT * FROM zalo_activity_buffer ORDER BY created_at DESC LIMIT 5");
print_r($stmt4->fetchAll());

echo "\n=== ZALO SUBSCRIBERS WITH PAUSED AI ===\n";
$stmt5 = $pdo->query("SELECT id, zalo_user_id, ai_paused_until FROM zalo_subscribers WHERE ai_paused_until > NOW() LIMIT 5");
print_r($stmt5->fetchAll());