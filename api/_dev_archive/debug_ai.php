<?php
$logFile = __DIR__ . '/logs/ai_debug.log';
echo "<h1>AI Debug Log</h1>";
if (file_exists($logFile)) {
    $lines = array_reverse(file($logFile));
    $recent = array_slice($lines, 0, 50);
    echo "<pre>" . htmlspecialchars(implode("", $recent)) . "</pre>";
} else {
    echo "Log file not found at $logFile";
}
