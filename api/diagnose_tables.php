<?php
require_once 'db_connect.php';

header('Content-Type: text/plain; charset=utf-8');

echo "========== DATABASE SCHEMA DIAGNOSTIC ==========\n";
echo "Checking tables and columns...\n\n";

$expectedSchema = [
    'ai_chatbot_settings' => [
        'property_id',
        'is_enabled',
        'bot_name',
        'company_name',
        'brand_color',
        'bot_avatar',
        'welcome_msg',
        'persona_prompt',
        'gemini_api_key',
        'quick_actions',
        'system_instruction',
        'fast_replies',
        'similarity_threshold',
        'top_k',
        'history_limit',
        'widget_position',
        'excluded_pages',
        'excluded_paths'
    ],
    'ai_training_docs' => [
        'id',
        'property_id',
        'name',
        'source_type',
        'is_active',
        'status',
        'priority',
        'content',
        'tags',
        'metadata',
        'parent_id'
    ],
    'ai_training_chunks' => [
        'id',
        'doc_id',
        'property_id',
        'content',
        'embedding',
        'tags',
        'priority_level'
    ],
    'ai_conversations' => [
        'id',
        'visitor_id',
        'property_id',
        'status',
        'metadata'
    ],
    'ai_messages' => [
        'id',
        'conversation_id',
        'sender',
        'message',
        'metadata'
    ],
    'web_visitors' => [
        'id',
        'property_id',
        'email',
        'phone',
        'subscriber_id',
        'data',
        'visit_count'
    ],
    'web_sessions' => [
        'id',
        'visitor_id',
        'property_id',
        'device_type',
        'os',
        'browser',
        'page_count'
    ],
    'web_page_views' => [
        'id',
        'session_id',
        'visitor_id',
        'url',
        'title',
        'load_time_ms',
        'is_entrance'
    ],
    'web_events' => [
        'id',
        'session_id',
        'visitor_id',
        'event_type',
        'target_text'
    ],
    'subscribers' => [
        'id',
        'property_id',
        'email',
        'phone',
        'first_name',
        'last_name'
    ],
    'ai_vector_cache' => [
        'hash',
        'vector',
        'created_at'
    ],
    'ai_rag_search_cache' => [
        'query_hash',
        'results',
        'created_at'
    ]
];

$missingTables = [];
$missingColumns = [];
$errors = [];

foreach ($expectedSchema as $table => $columns) {
    try {
        $stmt = $pdo->query("SHOW TABLES LIKE '$table'");
        if ($stmt->rowCount() == 0) {
            $missingTables[] = $table;
            echo "[MISSING TABLE] $table\n";
            continue;
        }

        echo "[OK] Table: $table\n";

        $stmt = $pdo->query("DESCRIBE $table");
        $existingCols = $stmt->fetchAll(PDO::FETCH_COLUMN);

        foreach ($columns as $col) {
            if (!in_array($col, $existingCols)) {
                $missingColumns[$table][] = $col;
                echo "   -> [MISSING COLUMN] $col\n";
            }
        }
    } catch (Exception $e) {
        $errors[] = "Error checking $table: " . $e->getMessage();
    }
}

echo "\n========== SUMMARY ==========\n";

if (empty($missingTables) && empty($missingColumns) && empty($errors)) {
    echo "✅ ALL SYSTEMS GO! Database schema looks correct.\n";
} else {
    echo "⚠️ ISSUES FOUND:\n";
    if (!empty($missingTables)) {
        echo "Missing Tables:\n - " . implode("\n - ", $missingTables) . "\n";
    }
    if (!empty($missingColumns)) {
        echo "Missing Columns:\n";
        foreach ($missingColumns as $table => $cols) {
            echo " - $table: " . implode(", ", $cols) . "\n";
        }
    }
    if (!empty($errors)) {
        echo "Errors:\n - " . implode("\n - ", $errors) . "\n";
    }

    echo "\nSUGGESTED ACTION: Run migration scripts or visit /api/ai_chatbot.php?setup=1\n";
}
