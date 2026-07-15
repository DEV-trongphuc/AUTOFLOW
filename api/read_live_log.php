<?php
require_once 'db_connect.php';
$cronSecret = getenv('CRON_SECRET') ?: 'autoflow_cron_2026';
$passedSecret = $_GET['secret'] ?? '';

if (!hash_equals($cronSecret, $passedSecret)) {
    http_response_code(403);
    echo "Unauthorized";
    exit;
}

// Test writing to php error log
error_log("--- TEST ERROR LOG ENTRY AT " . date('Y-m-d H:i:s') . " ---");

function tailFile($filepath, $lines = 15) {
    if (!file_exists($filepath)) return "File not found: " . $filepath . "\n";
    $data = file($filepath);
    $lineCount = count($data);
    $start = max(0, $lineCount - $lines);
    return implode("", array_slice($data, $start));
}

echo "--- LAST 15 LINES OF error_log --- \n";
echo tailFile(__DIR__ . '/error_log', 15);

echo "\n--- CPANEL GIT REPOSITORIES --- \n";
$repoDir = '/home/vhvxoigh/repositories';
if (is_dir($repoDir)) {
    print_r(scandir($repoDir));
} else {
    echo "Directory not found: " . $repoDir . "\n";
}
