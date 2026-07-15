<?php
require_once 'db_connect.php';
$cronSecret = getenv('CRON_SECRET') ?: 'autoflow_cron_2026';
$passedSecret = $_GET['secret'] ?? '';

if (!hash_equals($cronSecret, $passedSecret)) {
    http_response_code(403);
    echo "Unauthorized";
    exit;
}

function tailFile($filepath, $lines = 40) {
    if (!file_exists($filepath)) return "File not found: " . $filepath . "\n";
    $data = file($filepath);
    $lineCount = count($data);
    $start = max(0, $lineCount - $lines);
    return implode("", array_slice($data, $start));
}

echo "--- LAST 40 LINES OF error_log --- \n";
echo tailFile(__DIR__ . '/error_log', 40);

echo "\n--- LAST 40 LINES OF worker_priority.log --- \n";
echo tailFile(__DIR__ . '/worker_priority.log', 40);

echo "\n--- LAST 40 LINES OF worker_trace.log --- \n";
echo tailFile(__DIR__ . '/worker_trace.log', 40);
