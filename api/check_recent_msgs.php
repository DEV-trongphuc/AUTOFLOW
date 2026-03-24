<?php
require_once 'db_connect.php';
header('Content-Type: text/plain; charset=utf-8');

echo "--- RECENT META MESSAGES (DB) ---\n";
$stmt = $pdo->query("SELECT created_at, content, direction, psid FROM meta_message_logs ORDER BY created_at DESC LIMIT 20");
while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
    echo "[{$row['created_at']}] [{$row['direction']}] PSID: {$row['psid']} | Content: " . substr($row['content'], 0, 50) . "...\n";
}

echo "\n--- RECENT ZALO MESSAGES (DB) ---\n";
$stmt = $pdo->query("SELECT created_at, message_text, direction, zalo_user_id FROM zalo_user_messages ORDER BY created_at DESC LIMIT 20");
while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
    echo "[{$row['created_at']}] [{$row['direction']}] ID: {$row['zalo_user_id']} | Text: " . substr($row['message_text'], 0, 50) . "...\n";
}
