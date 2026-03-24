<?php
require_once 'db_connect.php';
header('Content-Type: text/plain; charset=utf-8');

echo "=== WORKER ERROR LOG ===\n";
$errorLog = __DIR__ . '/worker_error.log';
if (file_exists($errorLog)) {
    echo file_get_contents($errorLog);
} else {
    echo "[File not found or no errors]\n";
}

echo "\n\n=== LAST 50 LINES OF DEBUG_PRIORITY.LOG ===\n";
$debugLog = __DIR__ . '/debug_priority.log';
if (file_exists($debugLog)) {
    $lines = file($debugLog);
    echo implode('', array_slice($lines, -50));
} else {
    echo "[File not found]\n";
}
?>