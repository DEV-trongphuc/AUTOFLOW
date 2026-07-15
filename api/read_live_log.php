<?php
require_once 'db_connect.php';
$cronSecret = getenv('CRON_SECRET') ?: 'autoflow_cron_2026';
$passedSecret = $_GET['secret'] ?? '';

if (!hash_equals($cronSecret, $passedSecret)) {
    http_response_code(403);
    echo "Unauthorized";
    exit;
}

echo "--- FILE MTOMES --- \n";
echo "forms.php: " . date("Y-m-d H:i:s", filemtime(__DIR__ . '/forms.php')) . "\n";
echo "worker_notify.php: " . date("Y-m-d H:i:s", filemtime(__DIR__ . '/worker_notify.php')) . "\n";
echo "read_live_log.php: " . date("Y-m-d H:i:s", filemtime(__FILE__)) . "\n";
