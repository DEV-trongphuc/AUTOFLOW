<?php
header('Content-Type: text/plain');

$logFile = __DIR__ . '/meta_webhook_prod.log';

if (file_exists($logFile)) {
    $logs = file($logFile);
    $recent = array_slice($logs, -200); // Last 200 lines
    echo implode('', $recent);
} else {
    echo "Log file not found!";
}
