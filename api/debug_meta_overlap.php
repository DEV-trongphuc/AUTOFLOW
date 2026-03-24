<?php
require_once 'db_connect.php';

echo "--- Meta App Configs ---\n";
$configs = $pdo->query("SELECT id, page_id, page_name, status FROM meta_app_configs")->fetchAll(PDO::FETCH_ASSOC);
foreach ($configs as $c) {
    echo "ID: {$c['id']} | Page ID: {$c['page_id']} | Name: {$c['page_name']} | Status: {$c['status']}\n";
}

echo "\n--- Active AI Scenarios ---\n";
$scenarios = $pdo->query("SELECT id, meta_config_id, type, status, ai_chatbot_id FROM meta_automation_scenarios WHERE type = 'ai_reply' AND status = 'active'")->fetchAll(PDO::FETCH_ASSOC);
foreach ($scenarios as $s) {
    echo "ID: {$s['id']} | Config ID: {$s['meta_config_id']} | AI Chatbot: {$s['ai_chatbot_id']}\n";
}
?>