<?php
// api/upgrade_db_analytics.php
require_once 'db_connect.php';

header('Content-Type: text/plain; charset=utf-8');
echo "Checking Database Schema for Analytics & UX Upgrades...\n\n";

function addColumnIfNotExists($pdo, $table, $column, $definition)
{
    try {
        $stmt = $pdo->query("SHOW COLUMNS FROM `$table` LIKE '$column'");
        if ($stmt->rowCount() == 0) {
            $pdo->exec("ALTER TABLE `$table` ADD COLUMN $definition");
            echo "✅ Added `$column` to `$table`\n";
        } else {
            echo "ℹ️  `$column` already exists in `$table`\n";
        }
    } catch (PDOException $e) {
        echo "❌ Error adding `$column`: " . $e->getMessage() . "\n";
    }
}

function addIndexIfNotExists($pdo, $table, $indexName, $columns)
{
    try {
        $stmt = $pdo->query("SHOW INDEX FROM `$table` WHERE Key_name = '$indexName'");
        if ($stmt->rowCount() == 0) {
            $pdo->exec("CREATE INDEX `$indexName` ON `$table` ($columns)");
            echo "✅ Added index `$indexName` to `$table`\n";
        } else {
            echo "ℹ️  Index `$indexName` already exists in `$table`\n";
        }
    } catch (PDOException $e) {
        echo "❌ Error adding index `$indexName`: " . $e->getMessage() . "\n";
    }
}

// 1. UPGRADE MESSAGES TABLE (Analytics)
echo "--- Upgrading ai_org_messages ---\n";
addColumnIfNotExists($pdo, 'ai_org_messages', 'model', "VARCHAR(100) NULL AFTER sender");
addColumnIfNotExists($pdo, 'ai_org_messages', 'tokens', "INT DEFAULT 0 AFTER model");
addColumnIfNotExists($pdo, 'ai_org_messages', 'processing_time', "FLOAT NULL COMMENT 'Seconds taken' AFTER tokens");
addColumnIfNotExists($pdo, 'ai_org_messages', 'rating', "TINYINT NULL COMMENT '1=Like, -1=Dislike' AFTER processing_time");

// 2. UPGRADE CONVERSATIONS TABLE (UX & Organization)
echo "\n--- Upgrading ai_org_conversations ---\n";
addColumnIfNotExists($pdo, 'ai_org_conversations', 'is_pinned', "TINYINT(1) DEFAULT 0 AFTER status");
addColumnIfNotExists($pdo, 'ai_org_conversations', 'tags', "JSON NULL COMMENT 'Array of strings' AFTER is_pinned");
addColumnIfNotExists($pdo, 'ai_org_conversations', 'sentiment', "ENUM('positive', 'neutral', 'negative') NULL AFTER tags");

// 3. PERFORMANCE INDEXES
echo "\n--- Optimizing Indexes ---\n";
// Crucial for "Show user's chat history sorted by time"
addIndexIfNotExists($pdo, 'ai_org_conversations', 'idx_user_time', 'user_id, last_message_at');
// Crucial for "Show bot's recent chats"
addIndexIfNotExists($pdo, 'ai_org_conversations', 'idx_property_time', 'property_id, last_message_at');

echo "\nDone. Database is now ready for heavy analytics and advanced UX.\n";
