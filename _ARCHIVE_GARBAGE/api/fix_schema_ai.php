<?php
require_once 'db_connect.php';
header('Content-Type: application/json');

try {
    // 1. Check columns in ai_training_docs
    $stmt = $pdo->query("DESCRIBE ai_training_docs");
    $existingColumns = $stmt->fetchAll(PDO::FETCH_COLUMN);

    if (!in_array('content', $existingColumns)) {
        $pdo->exec("ALTER TABLE ai_training_docs ADD COLUMN content LONGTEXT AFTER is_active");
    }
    if (!in_array('tags', $existingColumns)) {
        $pdo->exec("ALTER TABLE ai_training_docs ADD COLUMN tags JSON AFTER content");
    }
    if (!in_array('metadata', $existingColumns)) {
        $pdo->exec("ALTER TABLE ai_training_docs ADD COLUMN metadata JSON AFTER tags");
    }

    // 2. Clear old bad data in docs (optional but helpful)
    // $pdo->exec("UPDATE ai_training_docs SET content = '' WHERE content IS NULL");

    echo json_encode(['success' => true, 'message' => 'Database schema updated successfully.']);
} catch (Exception $e) {
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}
