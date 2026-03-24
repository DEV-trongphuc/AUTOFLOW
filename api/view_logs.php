<?php
require_once 'db_connect.php';

$logFile = __DIR__ . '/logs/ai_debug.log';
if (!file_exists($logFile)) {
    die("Log file not found yet. Send some messages first!");
}

header('Content-Type: text/plain');
echo "AI CHAT DEBUG LOGS\n";
echo "==================\n\n";

// Read last 200 lines to give more context
$lines = file($logFile);
$lastLines = array_slice($lines, -200);
echo implode("", $lastLines);
