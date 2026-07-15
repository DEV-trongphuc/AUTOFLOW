<?php
require_once 'db_connect.php';
$cronSecret = getenv('CRON_SECRET') ?: 'autoflow_cron_2026';
$passedSecret = $_GET['secret'] ?? '';

if (!hash_equals($cronSecret, $passedSecret)) {
    http_response_code(403);
    echo "Unauthorized";
    exit;
}

echo "--- TESTING SHELL_EXEC --- \n";
$output = shell_exec('php -v');
if ($output === null) {
    echo "shell_exec returned null or is disabled.\n";
} else {
    echo "shell_exec works! Output:\n$output\n";
}

echo "\n--- TESTING EXEC --- \n";
$outArr = [];
$retVal = -1;
exec('php -v', $outArr, $retVal);
echo "exec return code: $retVal\n";
echo "exec output:\n" . implode("\n", $outArr) . "\n";
