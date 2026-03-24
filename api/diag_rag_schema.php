<?php
require_once 'db_connect.php';
header('Content-Type: application/json');
$res = [];
try {
    $res['columns'] = $pdo->query("SHOW COLUMNS FROM ai_training_chunks")->fetchAll(PDO::FETCH_ASSOC);
    $res['indexes'] = $pdo->query("SHOW INDEX FROM ai_training_chunks")->fetchAll(PDO::FETCH_ASSOC);

    // Check if there are any chunks
    $res['count'] = $pdo->query("SELECT COUNT(*) FROM ai_training_chunks")->fetchColumn();

    // Check sample metadata_text
    $res['sample'] = $pdo->query("SELECT metadata_text FROM ai_training_chunks WHERE metadata_text IS NOT NULL LIMIT 1")->fetchColumn();

} catch (Exception $e) {
    $res['error'] = $e->getMessage();
}
echo json_encode($res, JSON_PRETTY_PRINT);
