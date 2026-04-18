<?php
require_once 'db_connect.php';
try {
    $pdo->exec("ALTER TABLE ai_chatbot_settings ADD COLUMN teaser_msg TEXT DEFAULT NULL AFTER welcome_msg");
    echo json_encode(['success' => true, 'message' => 'Column teaser_msg added successfully']);
} catch (Exception $e) {
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}
