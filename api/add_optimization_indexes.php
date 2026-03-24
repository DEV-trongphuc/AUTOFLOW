<?php
// api/add_optimization_indexes.php
require_once 'db_connect.php';

header('Content-Type: application/json');

function tableExists($pdo, $table)
{
    try {
        $result = $pdo->query("SHOW TABLES LIKE '$table'");
        return $result->rowCount() > 0;
    } catch (PDOException $e) {
        return false;
    }
}

function addIndexIfNotExists($pdo, $table, $indexName, $columns)
{
    try {
        // Check if table exists first
        if (!tableExists($pdo, $table)) {
            return ["status" => "skipped", "message" => "Table $table does not exist"];
        }

        // Check if index exists
        $check = $pdo->query("SHOW INDEX FROM `$table` WHERE Key_name = '$indexName'");
        if ($check->rowCount() > 0) {
            return ["status" => "skipped", "message" => "Index $indexName on $table already exists"];
        }

        // Create index
        $sql = "ALTER TABLE `$table` ADD INDEX `$indexName` ($columns)";
        $pdo->exec($sql);
        return ["status" => "success", "message" => "Index $indexName added to $table"];
    } catch (PDOException $e) {
        return ["status" => "error", "message" => "Failed to add index $indexName: " . $e->getMessage()];
    }
}

$results = [];

// 1. AI Messages Optimization (using actual table name)
// Commonly filtered by conversation_id and ordered by created_at
$results[] = addIndexIfNotExists($pdo, 'ai_messages', 'idx_msg_conversation', 'conversation_id');
$results[] = addIndexIfNotExists($pdo, 'ai_messages', 'idx_msg_created', 'created_at');

// 2. AI Conversations Optimization (using actual table name)
// Commonly ordered by updated_at desc for recent chats
$results[] = addIndexIfNotExists($pdo, 'ai_conversations', 'idx_conv_updated', 'updated_at');
$results[] = addIndexIfNotExists($pdo, 'ai_conversations', 'idx_conv_visitor', 'visitor_id');
$results[] = addIndexIfNotExists($pdo, 'ai_conversations', 'idx_conv_property', 'property_id');

// 3. Campaign Logs Optimization (if table exists)
// Huge table, needs indexing on campaign_id and subscriber_id
$results[] = addIndexIfNotExists($pdo, 'campaign_logs', 'idx_log_campaign', 'campaign_id');
$results[] = addIndexIfNotExists($pdo, 'campaign_logs', 'idx_log_subscriber', 'subscriber_id');
$results[] = addIndexIfNotExists($pdo, 'campaign_logs', 'idx_log_action', 'action');

// 4. AI Training Optimization
$results[] = addIndexIfNotExists($pdo, 'ai_training_docs', 'idx_docs_property', 'property_id');
$results[] = addIndexIfNotExists($pdo, 'ai_training_docs', 'idx_docs_status', 'status');
$results[] = addIndexIfNotExists($pdo, 'ai_training_chunks', 'idx_chunks_doc', 'doc_id');
$results[] = addIndexIfNotExists($pdo, 'ai_training_chunks', 'idx_chunks_property', 'property_id');

echo json_encode(['success' => true, 'results' => $results]);
?>