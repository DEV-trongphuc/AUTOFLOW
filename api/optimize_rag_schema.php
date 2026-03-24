<?php
// api/optimize_rag_schema.php - Enhanced RAG Schema Migration (FINAL)
require_once 'db_connect.php';

header('Content-Type: application/json');

try {
    // 1. Update ai_training_chunks
    // We need metadata_text to store the rich text (Title + Content + Facts)
    $pdo->exec("ALTER TABLE ai_training_chunks ADD COLUMN IF NOT EXISTS metadata_text LONGTEXT AFTER content");

    // Ensure vector_norm exists and is double/float
    // (Already exists but let's be sure about the name)

    // 2. Create ai_term_stats for optimized BM25 (RRF Point #2)
    $pdo->exec("CREATE TABLE IF NOT EXISTS ai_term_stats (
        term VARCHAR(100),
        property_id VARCHAR(50),
        df INT DEFAULT 0,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (term, property_id),
        INDEX (property_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");

    // 3. Add AI Versioning & Dynamic Intent Configs to ai_chatbot_settings (Point #4 & #5)
    $pdo->exec("ALTER TABLE ai_chatbot_settings ADD COLUMN IF NOT EXISTS ai_version INT DEFAULT 1");
    $pdo->exec("ALTER TABLE ai_chatbot_settings ADD COLUMN IF NOT EXISTS intent_configs LONGTEXT DEFAULT NULL");

    // 4. Clear RAG cache to force fresh start with new logic
    $pdo->exec("TRUNCATE TABLE ai_rag_search_cache");

    echo json_encode(['success' => true, 'message' => 'Schema fully optimized. Please re-train your documents to populate rich embeddings.']);
} catch (Exception $e) {
    echo json_encode(['success' => false, 'message' => 'Migration failed: ' . $e->getMessage()]);
}
