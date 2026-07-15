<?php
require_once 'db_connect.php';
$cronSecret = getenv('CRON_SECRET') ?: 'autoflow_cron_2026';
$passedSecret = $_GET['secret'] ?? '';

if (!hash_equals($cronSecret, $passedSecret)) {
    http_response_code(403);
    echo "Unauthorized";
    exit;
}

function tailFile($filepath, $lines = 100) {
    if (!file_exists($filepath)) return "File not found: " . $filepath . "\n";
    $data = file($filepath);
    $lineCount = count($data);
    $start = max(0, $lineCount - $lines);
    return implode("", array_slice($data, $start));
}

echo "--- LAST 100 LINES OF mail_api/error_log --- \n";
echo tailFile(__DIR__ . '/error_log', 100);

echo "\n\n--- LAST 20 MAIL DELIVERY LOGS --- \n";
try {
    $stmt = $pdo->query("SELECT id, recipient, subject, status, error_message, sent_at, workspace_id FROM mail_delivery_logs ORDER BY id DESC LIMIT 20");
    $logs = $stmt->fetchAll(PDO::FETCH_ASSOC);
    print_r($logs);
} catch (Exception $e) {
    echo "Error querying mail_delivery_logs: " . $e->getMessage() . "\n";
}
