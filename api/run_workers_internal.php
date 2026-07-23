<?php
$logPath = __DIR__ . '/worker_flow.log';
if (file_exists($logPath)) {
    $lines = explode("\n", file_get_contents($logPath));
    $lastLines = array_slice($lines, -20);
    echo implode("\n", $lastLines);
} else {
    echo "Log file not found.";
}
