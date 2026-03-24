<?php
require_once 'db_connect.php';

header('Content-Type: text/plain');
echo "Database Performance Optimization Utility\n";
echo "========================================\n\n";

function addIndexIfMissing($pdo, $table, $indexName, $columns)
{
    try {
        // Check if index exists
        $stmt = $pdo->prepare("SHOW INDEX FROM $table WHERE Key_name = ?");
        $stmt->execute([$indexName]);
        if ($stmt->fetch()) {
            echo "[-] Index '$indexName' already exists on table '$table'.\n";
            return;
        }

        // Add index
        $sql = "ALTER TABLE `$table` ADD INDEX `$indexName` ($columns)";
        $pdo->exec($sql);
        echo "[+] Successfully added index '$indexName' to '$table'.\n";
    } catch (Exception $e) {
        echo "[!] Error adding index to '$table': " . $e->getMessage() . "\n";
    }
}

// 1. Optimize ai_org_conversations for list sorting
addIndexIfMissing($pdo, 'ai_org_conversations', 'idx_prop_updated', 'property_id, updated_at');
addIndexIfMissing($pdo, 'ai_org_conversations', 'idx_updated_at', 'updated_at');

// 2. Optimize message fetching
addIndexIfMissing($pdo, 'ai_org_messages', 'idx_conv_created', 'conversation_id, created_at');
addIndexIfMissing($pdo, 'ai_messages', 'idx_conv_created', 'conversation_id, created_at');

// 3. Optimize Zalo/Meta lookups
addIndexIfMissing($pdo, 'zalo_subscribers', 'idx_user_oa', 'zalo_user_id, oa_id');

echo "\nOptimization completed.\n";
?>