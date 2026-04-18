<?php
header('Content-Type: text/plain; charset=utf-8');
require_once 'db_connect.php';

echo "LOG VIEWER\n";
echo "==========\n\n";

$logs = [
    'worker_campaign.log',
    'worker_flow.log',
    'webhook_error.log',
    'worker_error.log',
    'worker_trace.log'
];

foreach ($logs as $log) {
    if (file_exists($log)) {
        echo "LOG: $log\n";
        echo "----------------\n";
        echo shell_exec("tail -n 50 " . escapeshellarg($log)) ?: file_get_contents($log);
        echo "\n\n";
    } else {
        echo "LOG: $log (NOT FOUND)\n\n";
    }
}
