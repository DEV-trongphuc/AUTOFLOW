<?php
require_once 'db_connect.php';
$cronSecret = getenv('CRON_SECRET') ?: 'autoflow_cron_2026';
$passedSecret = $_GET['secret'] ?? '';

if (!hash_equals($cronSecret, $passedSecret)) {
    http_response_code(403);
    echo "Unauthorized";
    exit;
}

echo "--- RECENT SUBSCRIBERS --- \n";
try {
    $stmt = $pdo->query("SELECT email, status, source, joined_at FROM subscribers ORDER BY joined_at DESC LIMIT 5");
    print_r($stmt->fetchAll(PDO::FETCH_ASSOC));
} catch (Exception $e) {
    echo "Database Error: " . $e->getMessage() . "\n";
}

echo "\n--- RECENT ACTIVITY LOGS --- \n";
try {
    $stmt = $pdo->query("SELECT a.created_at, a.type, a.reference_id, s.email FROM subscriber_activity a LEFT JOIN subscribers s ON a.subscriber_id = s.id ORDER BY a.id DESC LIMIT 10");
    print_r($stmt->fetchAll(PDO::FETCH_ASSOC));
} catch (Exception $e) {
    echo "Database Error: " . $e->getMessage() . "\n";
}
