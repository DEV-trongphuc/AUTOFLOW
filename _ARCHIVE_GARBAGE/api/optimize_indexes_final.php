<?php
// api/optimize_indexes_final.php
require_once 'db_connect.php';

header('Content-Type: text/plain');

function addIndexIfNotExists($pdo, $table, $indexName, $columns)
{
    try {
        // Check if index exists
        $stmt = $pdo->prepare("SHOW INDEX FROM `$table` WHERE Key_name = ?");
        $stmt->execute([$indexName]);
        if ($stmt->rowCount() > 0) {
            echo "[SKIP] Index '$indexName' already exists on table '$table'.\n";
            return;
        }

        // Add index
        $sql = "ALTER TABLE `$table` ADD INDEX `$indexName` ($columns)";
        $pdo->exec($sql);
        echo "[OK] Added index '$indexName' to table '$table'.\n";
    } catch (PDOException $e) {
        echo "[ERROR] Failed to add index '$indexName' to '$table': " . $e->getMessage() . "\n";
    }
}

echo "Starting Index Optimization...\n\n";

// 1. ai_messages: Composite index for fast chat retrieval
addIndexIfNotExists($pdo, 'ai_messages', 'idx_conv_sender_created', 'conversation_id, sender, created_at DESC');

// 2. zalo_subscribers: Composite index for list viewing
addIndexIfNotExists($pdo, 'zalo_subscribers', 'idx_list_interaction', 'zalo_list_id, last_interaction_at DESC');

// 3. ai_conversations: Index for visitor lookup with property and status
addIndexIfNotExists($pdo, 'ai_conversations', 'idx_visitor_prop_status', 'visitor_id, property_id, status');

// 4. web_visitors: Index for subscriber lookup (if not already optimized)
addIndexIfNotExists($pdo, 'web_visitors', 'idx_subscriber_lookup', 'subscriber_id');

// 5. flow_enrollments: Composite for status checks
addIndexIfNotExists($pdo, 'flow_enrollments', 'idx_sub_flow_status', 'subscriber_id, flow_id, status');

echo "\nOptimization Complete.";
