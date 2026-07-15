<?php
// Secure this script with the cron secret so unauthorized users cannot read logs
require_once 'db_connect.php';
$cronSecret = getenv('CRON_SECRET') ?: 'autoflow_cron_2026';
$passedSecret = $_GET['secret'] ?? '';

if (!hash_equals($cronSecret, $passedSecret)) {
    http_response_code(403);
    echo "Unauthorized";
    exit;
}

$logFile = __DIR__ . '/error_log';
if (file_exists($logFile)) {
    echo "--- ERROR LOG --- \n";
    echo file_get_contents($logFile);
} else {
    echo "No error_log file found at: " . $logFile;
}

$phpErrorLog = ini_get('error_log');
if ($phpErrorLog && file_exists($phpErrorLog)) {
    echo "\n\n--- PHP INI ERROR LOG ($phpErrorLog) --- \n";
    echo file_get_contents($phpErrorLog);
} else {
    echo "\n\nNo PHP ini error log found or not readable: " . $phpErrorLog;
}
