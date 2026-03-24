<?php
// api/chat_feedback.php
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: POST");
header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");

require_once 'db_connect.php';

$data = json_decode(file_get_contents("php://input"));

if (!empty($data->chunk_ids) && is_array($data->chunk_ids)) {
    try {
        // 1. Lazy Migration: Ensure column exists
        $colCheck = $pdo->query("SHOW COLUMNS FROM ai_training_chunks LIKE 'relevance_boost'");
        if ($colCheck->rowCount() == 0) {
            $pdo->exec("ALTER TABLE ai_training_chunks ADD COLUMN relevance_boost INT DEFAULT 0");
        }

        // 2. Increment/Decrement Boost
        $action = $data->action ?? 'like';
        $change = ($action === 'unlike') ? -1 : 1;

        $in = str_repeat('?,', count($data->chunk_ids) - 1) . '?';
        // Use GREATEST(0, ...) to prevent negative boost if unliking too much? No, simple +/- is fine for now.
        // Actually, preventing negative might be good, but users might downvote bad answers? 
        // User request is "hủy thả tim" (cancel like), so return to previous state. 
        // If it was 0, unlike makes it -1.
        // Let's stick to simple addition/subtraction.
        $sql = "UPDATE ai_training_chunks SET relevance_boost = relevance_boost + ($change) WHERE id IN ($in)";
        $stmt = $pdo->prepare($sql);
        $stmt->execute($data->chunk_ids);

        echo json_encode(["message" => "Feedback processed ($action).", "updated" => count($data->chunk_ids)]);
    } catch (PDOException $e) {
        http_response_code(503);
        echo json_encode(["message" => "Error processing feedback.", "error" => $e->getMessage()]);
    }
} else {
    http_response_code(400);
    echo json_encode(["message" => "Incomplete data. chunk_ids required."]);
}
?>