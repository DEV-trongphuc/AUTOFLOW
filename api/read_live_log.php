<?php
require_once 'db_connect.php';
$cronSecret = getenv('CRON_SECRET') ?: 'autoflow_cron_2026';
$passedSecret = $_GET['secret'] ?? '';

if (!hash_equals($cronSecret, $passedSecret)) {
    http_response_code(403);
    echo "Unauthorized";
    exit;
}

try {
    echo "--- SUBSCRIBER DETAIL --- \n";
    $stmt = $pdo->prepare("SELECT id, email, status, source, joined_at FROM subscribers WHERE email = ?");
    $stmt->execute(['test_direct_1650@ideas.edu.vn']);
    print_r($stmt->fetchAll(PDO::FETCH_ASSOC));

    echo "\n--- SUBSCRIBER ACTIVITIES --- \n";
    $stmt = $pdo->prepare("SELECT a.created_at, a.type, a.reference_id, s.email FROM subscriber_activity a LEFT JOIN subscribers s ON a.subscriber_id = s.id WHERE s.email = ? ORDER BY a.id DESC");
    $stmt->execute(['test_direct_1650@ideas.edu.vn']);
    print_r($stmt->fetchAll(PDO::FETCH_ASSOC));
} catch (Exception $e) {
    echo "Database Error: " . $e->getMessage() . "\n";
}
