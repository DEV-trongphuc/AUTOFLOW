<?php
require_once __DIR__ . '/db_connect.php';
$flowId = '69dca73f0d951';

header('Content-Type: application/json');

try {
    // RESET 92 SUBSCRIBERS FROM FAILED TO WAITING
    $stmt = $pdo->prepare("UPDATE subscriber_flow_states 
                           SET status = 'waiting', last_error = NULL, updated_at = NOW() 
                           WHERE flow_id = ? AND status = 'failed' AND last_error = 'Step not found'");
    $stmt->execute([$flowId]);
    $count = $stmt->rowCount();
    
    echo json_encode([
        'success' => true,
        'message' => "Successfully rescued $count subscribers. They will be processed by the next worker run.",
        'now' => date('Y-m-d H:i:s')
    ], JSON_PRETTY_PRINT);
} catch (Exception $e) {
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}
