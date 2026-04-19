<?php
// api/force_retrain_all.php - Reset all training data for clean start
require_once 'db_connect.php';

header('Content-Type: application/json');

try {
    // 1. Truncate Chunks
    $pdo->exec("TRUNCATE TABLE ai_training_chunks");

    // 2. Truncate Term Stats
    $pdo->exec("TRUNCATE TABLE ai_term_stats");

    // 3. Truncate RAG Cache
    $pdo->exec("TRUNCATE TABLE ai_rag_search_cache");

    // 4. Reset Docs status
    $pdo->exec("UPDATE ai_training_docs SET status = 'pending'");

    // 5. Increment AI Version
    $pdo->exec("UPDATE ai_chatbot_settings SET ai_version = ai_version + 1");

    echo json_encode([
        'success' => true,
        'message' => 'Hệ thống đã được reset sạch dữ liệu cũ. Trạng thái tất cả tài liệu đã chuyển về "Chờ xử lý".'
    ]);
} catch (Exception $e) {
    echo json_encode(['success' => false, 'message' => 'Lỗi reset: ' . $e->getMessage()]);
}
