<?php
ini_set('display_errors', 1);
error_reporting(E_ALL);

require_once 'db_connect.php';

$id = 'b685ab18-d445-4098-9f60-f80968683cd3';

try {
    $stmt = $pdo->prepare("SELECT id, visitor_id, property_id, status FROM ai_conversations WHERE id = ?");
    $stmt->execute([$id]);
    $conv = $stmt->fetch(PDO::FETCH_ASSOC);

    $stmt2 = $pdo->prepare("SELECT id, conversation_id, sender, created_at, message FROM ai_messages WHERE conversation_id = ? ORDER BY id DESC LIMIT 5");
    $stmt2->execute([$id]);
    $msgs = $stmt2->fetchAll(PDO::FETCH_ASSOC);

    echo json_encode(['success' => true, 'conv' => $conv, 'msgs' => $msgs]);
} catch (Exception $e) {
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}
