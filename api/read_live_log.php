<?php
require_once 'db_connect.php';
$cronSecret = getenv('CRON_SECRET') ?: 'autoflow_cron_2026';
$passedSecret = $_GET['secret'] ?? '';

if (!hash_equals($cronSecret, $passedSecret)) {
    http_response_code(403);
    echo "Unauthorized";
    exit;
}

function tailFile($filepath, $lines = 15) {
    if (!file_exists($filepath)) return "File not found: " . $filepath . "\n";
    $data = file($filepath);
    $lineCount = count($data);
    $start = max(0, $lineCount - $lines);
    return implode("", array_slice($data, $start));
}

echo "--- LAST 15 LINES OF mail_api/error_log --- \n";
echo tailFile(__DIR__ . '/error_log', 15);

echo "\n--- LAST 15 LINES OF PARENT error_log --- \n";
echo tailFile(dirname(__DIR__) . '/error_log', 15);

echo "\n--- PHP INI error_log value --- \n";
echo ini_get('error_log') . "\n";
