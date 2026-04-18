<?php
require_once 'db_connect.php';
header('Content-Type: application/json');

try {
    $total = $pdo->query("SELECT COUNT(*) FROM subscribers")->fetchColumn();
    $unsub = $pdo->query("SELECT COUNT(*) FROM subscribers WHERE status='unsubscribed'")->fetchColumn();
    $customer = $pdo->query("SELECT COUNT(*) FROM subscribers WHERE status='customer'")->fetchColumn();
    
    echo json_encode([
        'success' => true,
        'data' => [
            'total' => $total,
            'unsubscribed' => $unsub,
            'customer' => $customer
        ]
    ]);
} catch (Exception $e) {
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}
