<?php
require_once 'db_connect.php';
header('Content-Type: application/json');

try {
    $stmt = $pdo->query("SELECT * FROM zalo_delivery_logs ORDER BY created_at DESC LIMIT 20");
    $logs = $stmt->fetchAll(PDO::FETCH_ASSOC);
    echo json_encode(['success' => true, 'data' => $logs]);
} catch (Exception $e) {
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}
