<?php
header('Content-Type: text/plain; charset=utf-8');

$logFile = __DIR__ . '/worker_flow.log';

if (!file_exists($logFile)) {
    echo "Log file not found: $logFile\n";
    exit;
}

// Get last 200 lines
$lines = file($logFile);
$totalLines = count($lines);
$startLine = max(0, $totalLines - 200);

echo "=== WORKER FLOW LOG (Last 200 lines) ===\n";
echo "Total lines: $totalLines\n";
echo "Showing from line: " . ($startLine + 1) . "\n\n";

for ($i = $startLine; $i < $totalLines; $i++) {
    echo $lines[$i];
}
