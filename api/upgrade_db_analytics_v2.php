<?php
// api/upgrade_db_analytics_v2.php
require_once 'db_connect.php';

header('Content-Type: text/plain; charset=utf-8');
echo "Checking Database Schema for Analytics & UX Upgrades (Fixed Syntax)...\n\n";

function addColumnIfNotExists($pdo, $table, $column, $definition)
{
    try {
        $stmt = $pdo->query("SHOW COLUMNS FROM `$table` LIKE '$column'");
        if ($stmt->rowCount() == 0) {
            $sql = "ALTER TABLE `$table` ADD COLUMN `$column` $definition";
            echo "Executing: $sql\n";
            $pdo->exec($sql);
            echo "✅ Added `$column` to `$table`\n";
        } else {
            echo "ℹ️  `$column` already exists in `$table`\n";
        }
    } catch (PDOException $e) {
        echo "❌ Error adding `$column`: " . $e->getMessage() . "\n";
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
// Use TEXT for older MariaDB versions or JSON if supported
try {
    addColumnIfNotExists($pdo, 'ai_org_conversations', 'tags', "JSON NULL COMMENT 'Array of strings' AFTER is_pinned");
} catch (Exception $e) {
    // Fallback to TEXT if JSON not supported
    addColumnIfNotExists($pdo, 'ai_org_conversations', 'tags', "TEXT NULL COMMENT 'JSON array' AFTER is_pinned");
}


addColumnIfNotExists($pdo, 'ai_org_conversations', 'user_id', "VARCHAR(50) NULL AFTER visitor_id");
try {
    $pdo->exec("CREATE INDEX idx_user_id ON ai_org_conversations(user_id)");
} catch (Exception $e) {
}

addColumnIfNotExists($pdo, 'ai_org_conversations', 'title', "VARCHAR(255) NULL");
addColumnIfNotExists($pdo, 'ai_org_conversations', 'sentiment', "ENUM('positive', 'neutral', 'negative') NULL AFTER tags");

echo "\nDone.\n";
