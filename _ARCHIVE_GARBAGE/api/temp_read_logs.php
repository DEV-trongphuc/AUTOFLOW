<?php
$visitorId = '39c7c64f-eb96-4d62-a0e9-f901995d78ab';
$convId = '86f35ae09b9707e47f23855a8c1c4a4f';

$logFile = __DIR__ . '/logs/ai_debug.log';
if (file_exists($logFile)) {
    $lines = file($logFile);
    $relevant = [];
    foreach ($lines as $line) {
        if (strpos($line, $visitorId) !== false || strpos($line, $convId) !== false || strpos($line, 'CRASH') !== false || strpos($line, 'SYSTEM') !== false) {
            $relevant[] = $line;
        }
    }
    // Last 200 relevant lines
    $output = array_slice($relevant, -200);
    echo implode("", $output);
} else {
    echo "Log file not found at $logFile";
}
