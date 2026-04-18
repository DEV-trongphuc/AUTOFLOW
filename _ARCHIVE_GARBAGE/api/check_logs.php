<?php
// api/check_logs.php
header('Content-Type: text/plain; charset=utf-8');

$files = [
    'debug_priority.log',
    'debug_campaign.log',
    'php_error.log',
    'worker_campaign.log'
];

foreach ($files as $file) {
    echo "================================================================================\n";
    echo "FILE: $file\n";
    echo "================================================================================\n";
    if (file_exists(__DIR__ . '/' . $file)) {
        echo file_get_contents(__DIR__ . '/' . $file);
    } else {
        echo "[File not found]\n";
    }
    echo "\n\n";
}
?>