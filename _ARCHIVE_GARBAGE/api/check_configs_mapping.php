<?php
require_once 'db_connect.php';
$stmt = $pdo->query("SELECT id, page_id, page_name, chatbot_id FROM meta_app_configs");
$configs = $stmt->fetchAll(PDO::FETCH_ASSOC);
header('Content-Type: text/plain');
foreach ($configs as $c) {
    echo "ID: {$c['id']} | Page ID: {$c['page_id']} | Name: {$c['page_name']} | Chatbot ID: {$c['chatbot_id']}\n";
}
