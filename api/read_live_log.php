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

$phpErrorLog = ini_get('error_log');
echo "\n\n--- LAST 100 LINES OF PHP INI ERROR LOG ($phpErrorLog) --- \n";
if ($phpErrorLog) {
    echo tailFile($phpErrorLog, 100);
} else {
    echo "No ini error_log path defined.\n";
}
