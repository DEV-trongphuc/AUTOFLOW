<?php
// api/check_worker_log.php
// Check worker_flow.log for recent activity

ini_set('display_errors', 1);
error_reporting(E_ALL);

header('Content-Type: text/plain; charset=utf-8');

$logFile = __DIR__ . '/worker_flow.log';

echo "=================================================================\n";
echo "WORKER FLOW LOG - Last 200 Lines\n";
echo "=================================================================\n";
echo "Time: " . date('Y-m-d H:i:s') . "\n";
echo "Log File: $logFile\n";
echo "=================================================================\n\n";

if (!file_exists($logFile)) {
    echo "❌ Log file not found!\n";
    echo "This means worker has never run or logging is disabled.\n";
    exit;
}

$fileSize = filesize($logFile);
$lastModified = date('Y-m-d H:i:s', filemtime($logFile));

echo "File Size: " . number_format($fileSize) . " bytes\n";
echo "Last Modified: $lastModified\n";
echo "=================================================================\n\n";

// Read last 200 lines
$lines = file($logFile);
$totalLines = count($lines);
$startLine = max(0, $totalLines - 200);

echo "Showing last 200 lines (Total: $totalLines lines)\n";
echo "=================================================================\n\n";

for ($i = $startLine; $i < $totalLines; $i++) {
    echo $lines[$i];
}

echo "\n=================================================================\n";
echo "END OF LOG\n";
echo "=================================================================\n";
?>