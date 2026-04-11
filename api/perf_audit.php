<?php
require_once 'db_connect.php';

header('Content-Type: text/plain');

echo "Database: $db\n";
echo "---------------------------------\n";

$tables = ['ai_conversations', 'ai_messages', 'ai_org_conversations', 'ai_org_messages', 'web_visitors', 'subscribers', 'meta_subscribers', 'zalo_subscribers', 'web_page_views', 'web_events'];

foreach ($tables as $table) {
    try {
        $count = $pdo->query("SELECT COUNT(*) FROM $table")->fetchColumn();
        echo "Table: $table - Count: $count\n";
        
        $indices = $pdo->query("SHOW INDEX FROM $table")->fetchAll();
        echo "Indexes:\n";
        foreach ($indices as $idx) {
            echo "  - {$idx['Key_name']} ({$idx['Column_name']})\n";
        }
        echo "\n";
    } catch (Exception $e) {
        echo "Error checking $table: " . $e->getMessage() . "\n\n";
    }
}

echo "Testing Query Timings:\n";
$start = microtime(true);
$pdo->query("SELECT m.*, b.name as bot_name FROM ai_messages m INNER JOIN ai_conversations c ON m.conversation_id = c.id LEFT JOIN ai_chatbots b ON c.property_id = b.id WHERE m.conversation_id = (SELECT id FROM ai_conversations LIMIT 1) ORDER BY m.id DESC LIMIT 30")->fetchAll();
echo "get_messages mock (30 messages): " . round((microtime(true) - $start) * 1000, 2) . "ms\n";

$start = microtime(true);
$pdo->query("SELECT c.id FROM ai_conversations c LEFT JOIN web_visitors v ON c.visitor_id = v.id ORDER BY c.last_message_at DESC LIMIT 20")->fetchAll();
echo "list_conversations mock (20 convs): " . round((microtime(true) - $start) * 1000, 2) . "ms\n";

echo "\nChecking for missing critical indexes...\n";

function checkIndex($pdo, $table, $column) {
    try {
        $indices = $pdo->query("SHOW INDEX FROM $table")->fetchAll();
        foreach ($indices as $idx) {
            if ($idx['Column_name'] === $column) return true;
        }
        echo "[MISSING] Table $table should have index on $column\n";
        echo "  RUN: ALTER TABLE `$table` ADD INDEX (`$column`);\n";
        return false;
    } catch (Exception $e) {
        return false;
    }
}

checkIndex($pdo, 'ai_messages', 'conversation_id');
checkIndex($pdo, 'ai_messages', 'created_at');
checkIndex($pdo, 'ai_conversations', 'property_id');
checkIndex($pdo, 'ai_conversations', 'last_message_at');
checkIndex($pdo, 'meta_subscribers', 'psid');
checkIndex($pdo, 'zalo_subscribers', 'zalo_user_id');
checkIndex($pdo, 'web_page_views', 'visitor_id');
checkIndex($pdo, 'web_page_views', 'loaded_at');
checkIndex($pdo, 'web_events', 'visitor_id');
checkIndex($pdo, 'web_events', 'created_at');

echo "\nDone.\n";
