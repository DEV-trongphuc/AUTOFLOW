<?php
require_once 'db_connect.php';
$cronSecret = getenv('CRON_SECRET') ?: 'autoflow_cron_2026';
$passedSecret = $_GET['secret'] ?? '';

if (!hash_equals($cronSecret, $passedSecret)) {
    http_response_code(403);
    echo "Unauthorized";
    exit;
}

echo "--- FORM SUBMISSIONS IN DB --- \n";
try {
    $stmt = $pdo->prepare("SELECT a.created_at, a.type, a.reference_id, s.email, a.workspace_id FROM subscriber_activity a LEFT JOIN subscribers s ON a.subscriber_id = s.id WHERE a.type = 'form_submit' AND a.reference_id = ?");
    $stmt->execute(['15bc1263ceaec6fc77fa8b475c8aaf4e']);
    print_r($stmt->fetchAll(PDO::FETCH_ASSOC));
} catch (Exception $e) {
    echo "Database Error: " . $e->getMessage() . "\n";
}
