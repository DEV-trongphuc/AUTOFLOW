<?php
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);

require __DIR__ . '/db_connect.php';

echo "<pre>";
echo "--- 10 TIN NHAN ZALO GAN NHAT TRONG CSDL ---\n";
try {
    $stmt = $pdo->query("
        SELECT m.id, m.conversation_id, m.sender, m.message, m.created_at, c.visitor_id
        FROM ai_messages m
        JOIN ai_conversations c ON m.conversation_id = c.id
        WHERE c.visitor_id LIKE 'zalo_%'
        ORDER BY m.id DESC LIMIT 10
    ");
    $messages = $stmt->fetchAll(PDO::FETCH_ASSOC);
    print_r($messages);
} catch (Exception $e) {
    echo "Loi: " . $e->getMessage() . "\n";
}
echo "</pre>";
