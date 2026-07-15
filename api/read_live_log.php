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

echo "--- RECENT SUBSCRIBERS --- \n";
try {
    $stmt = $pdo->query("SELECT email, status, source, joined_at FROM subscribers ORDER BY joined_at DESC LIMIT 5");
    print_r($stmt->fetchAll(PDO::FETCH_ASSOC));
} catch (Exception $e) {
    echo "Database Error: " . $e->getMessage() . "\n";
}

echo "\n--- LAST 50 LINES OF mail_api/error_log --- \n";
echo tailFile(__DIR__ . '/error_log', 50);

echo "\n--- LAST 50 LINES OF PHP INI ERROR LOG --- \n";
$phpErrorLog = ini_get('error_log');
if ($phpErrorLog) {
    echo tailFile($phpErrorLog, 50);
} else {
    echo "No ini error_log path defined.\n";
}
