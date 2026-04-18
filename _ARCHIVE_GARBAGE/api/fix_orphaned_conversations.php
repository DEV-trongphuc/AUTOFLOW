<?php
// api/fix_orphaned_conversations.php
require_once 'db_connect.php';

header('Content-Type: text/plain; charset=utf-8');

echo "Cleaning up orphaned conversations...\n";

// 1. Get count before
$sql = "SELECT count(*) FROM ai_org_conversations c LEFT JOIN ai_org_messages m ON c.id = m.conversation_id WHERE m.id IS NULL";
$countBefore = $pdo->query($sql)->fetchColumn();
echo "Found $countBefore orphaned conversations (0 messages).\n";

if ($countBefore > 0) {
    // 2. Delete
    $deleteSql = "DELETE c FROM ai_org_conversations c LEFT JOIN ai_org_messages m ON c.id = m.conversation_id WHERE m.id IS NULL";
    $stmt = $pdo->prepare($deleteSql);
    $stmt->execute();
    $deleted = $stmt->rowCount();

    echo "Deleted $deleted conversations.\n";
} else {
    echo "No cleanup needed.\n";
}

echo "Done.\n";
