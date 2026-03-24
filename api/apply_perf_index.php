<?php
// api/apply_perf_index.php
require_once 'db_connect.php';
header('Content-Type: application/json');

try {
    $pdo->exec("ALTER TABLE subscriber_activity ADD INDEX IF NOT EXISTS idx_activity_freq (subscriber_id, type, created_at)");
    echo json_encode(['success' => true, 'message' => 'Index idx_activity_freq added or already exists.']);
} catch (Exception $e) {
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}
