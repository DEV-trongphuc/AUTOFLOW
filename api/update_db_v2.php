<?php
require_once 'db_connect.php';
header('Content-Type: text/plain');
try {
    echo "Updating schema...\n";
    $pdo->exec("ALTER TABLE ai_conversations ADD COLUMN last_message TEXT, ADD COLUMN last_message_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;");
    echo "Added columns to ai_conversations.\n";
    $pdo->exec("CREATE INDEX idx_conv_last_msg ON ai_conversations (property_id, last_message_at DESC);");
    echo "Added index to ai_conversations.\n";

    echo "Populating old data...\n";
    // Optional: Populate last_message/last_message_at for existing conversations
    $pdo->exec("
        UPDATE ai_conversations c 
        SET 
            last_message = (SELECT message FROM ai_messages WHERE conversation_id = c.id ORDER BY created_at DESC LIMIT 1),
            last_message_at = (SELECT created_at FROM ai_messages WHERE conversation_id = c.id ORDER BY created_at DESC LIMIT 1)
        WHERE last_message IS NULL
    ");
    echo "Migration complete.\n";
} catch (Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
    // Check if error is 'Column already exists' and ignore it
    if (strpos($e->getMessage(), 'Duplicate column') !== false || strpos($e->getMessage(), 'already exists') !== false) {
        echo "Columns already exist, skipping.\n";
    }
}
