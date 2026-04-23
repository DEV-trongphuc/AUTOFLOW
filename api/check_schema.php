<?php
require_once 'db_connect.php';
$tables = ['web_page_views', 'ai_messages', 'ai_conversations', 'subscriber_activity'];
echo "SCHEMA AUDIT:\n";
foreach ($tables as $t) {
    echo "Table: $t\n";
    try {
        $res = $pdo->query("DESCRIBE $t")->fetchAll(PDO::FETCH_ASSOC);
        foreach ($res as $f) {
            echo "  - {$f['Field']} ({$f['Type']})\n";
        }
    } catch (Exception $e) {
        echo "  - Error: " . $e->getMessage() . "\n";
    }
}
unlink(__FILE__); // Tự xóa sau khi chạy
