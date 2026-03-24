<?php
require_once 'db_connect.php';
header('Content-Type: application/json');

try {
    // Add address column to subscribers if not exists
    $pdo->exec("ALTER TABLE subscribers ADD COLUMN IF NOT EXISTS address TEXT AFTER city");

    // Also add address to web_visitors for tracking purposes
    $pdo->exec("ALTER TABLE web_visitors ADD COLUMN IF NOT EXISTS address TEXT AFTER city");

    echo json_encode(['success' => true, 'message' => 'Added address column to subscribers and web_visitors tables.']);
} catch (Exception $e) {
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}
