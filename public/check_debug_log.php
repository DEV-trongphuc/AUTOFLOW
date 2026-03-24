<?php
$logFile = '../api/logs/ai_debug.log';
if (file_exists($logFile)) {
    echo "<pre>";
    // Show last 50 lines
    $lines = file($logFile);
    $lastLines = array_slice($lines, -50);
    echo implode("", $lastLines);
    echo "</pre>";
} else {
    echo "Log file not found: $logFile";
}
