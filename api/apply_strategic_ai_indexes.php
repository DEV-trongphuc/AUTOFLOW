<?php
/**
 * api/apply_strategic_ai_indexes.php
 * 
 * This script applies critical performance indexes to the AI-related tables.
 * It includes FULLTEXT indexes for RAG and search, and composite indexes for 
 * faster filtering and ordering of message history and conversations.
 */

require_once 'db_connect.php';

header('Content-Type: application/json');

function logOptim($msg)
{
    echo $msg . "\n";
}

function addIndexSafely($pdo, $table, $indexName, $columns, $type = 'INDEX')
{
    try {
        // Check if table exists
        $tableCheck = $pdo->query("SHOW TABLES LIKE '$table'");
        if ($tableCheck->rowCount() === 0) {
            return ["status" => "skipped", "message" => "Table $table not found"];
        }

        // Check if index exists
        $check = $pdo->query("SHOW INDEX FROM `$table` WHERE Key_name = '$indexName'");
        if ($check->rowCount() > 0) {
            return ["status" => "skipped", "message" => "Index $indexName already exists on $table"];
        }

        // Apply index
        $sql = "ALTER TABLE `$table` ADD $type `$indexName` ($columns)";
        $pdo->exec($sql);
        return ["status" => "success", "message" => "Added $type $indexName to $table"];
    } catch (Exception $e) {
        return ["status" => "error", "message" => "Error on $table/$indexName: " . $e->getMessage()];
    }
}

$results = [];

logOptim("--- STARTING STRATEGIC AI INDEX OPTIMIZATION ---");

// 1. RAG PERFORMANCE (FULLTEXT)
// Essential for the MATCH() AGAINST() queries in chat_rag.php
$results[] = addIndexSafely($pdo, 'ai_training_chunks', 'ft_chunk_content', 'content', 'FULLTEXT');
$results[] = addIndexSafely($pdo, 'ai_training_docs', 'ft_doc_content', 'name, content', 'FULLTEXT');

// 2. CONVERSATION SEARCH & FILTERING
// For searching in the chat sidebar
$results[] = addIndexSafely($pdo, 'ai_org_conversations', 'ft_org_conv_search', 'title, last_message', 'FULLTEXT');
$results[] = addIndexSafely($pdo, 'ai_conversations', 'ft_conv_search', 'last_message', 'FULLTEXT');

// 3. HISTORY RETRIEVAL (Composite Indexes)
// Speeds up fetching messages for a specific conversation ordered by time
$results[] = addIndexSafely($pdo, 'ai_org_messages', 'idx_org_msg_conv_time', 'conversation_id, created_at');
$results[] = addIndexSafely($pdo, 'ai_messages', 'idx_msg_conv_sender_time', 'conversation_id, sender, created_at');

// 4. CONVERSATION LISTING PERFORMANCE
// Optimized for ORDER BY created_at DESC LIMIT X
$results[] = addIndexSafely($pdo, 'ai_org_conversations', 'idx_org_conv_prop_time', 'property_id, created_at DESC');
$results[] = addIndexSafely($pdo, 'ai_conversations', 'idx_conv_prop_time', 'property_id, created_at DESC');

// 5. VECTOR CACHE PERFORMANCE
// Hash lookup must be as fast as possible
try {
    $checkPk = $pdo->query("SHOW KEYS FROM ai_vector_cache WHERE Key_name = 'PRIMARY'");
    if ($checkPk->rowCount() === 0) {
        // Ensure hash column is not null and has proper length
        $pdo->exec("ALTER TABLE ai_vector_cache MODIFY hash VARCHAR(32) NOT NULL");
        $pdo->exec("ALTER TABLE ai_vector_cache ADD PRIMARY KEY (hash)");
        $results[] = ["status" => "success", "message" => "Added PRIMARY KEY to ai_vector_cache(hash)"];
    } else {
        $results[] = ["status" => "skipped", "message" => "Primary Key already exists on ai_vector_cache"];
    }
} catch (Exception $e) {
    $results[] = ["status" => "error", "message" => "Vector cache PK error: " . $e->getMessage()];
}

// 6. WORKSPACE FILES
$results[] = addIndexSafely($pdo, 'ai_workspace_files', 'idx_work_conv', 'conversation_id');
$results[] = addIndexSafely($pdo, 'ai_workspace_files', 'idx_work_prop_name', 'property_id, file_name');

// 7. GLOBAL ASSETS (already mostly handled, but ensuring url lookup)
$results[] = addIndexSafely($pdo, 'global_assets', 'idx_assets_url', 'url(255)');
$results[] = addIndexSafely($pdo, 'global_assets', 'idx_assets_conv', 'conversation_id');

logOptim("--- OPTIMIZATION COMPLETE ---");

echo json_encode(['success' => true, 'results' => $results], JSON_PRETTY_PRINT);
