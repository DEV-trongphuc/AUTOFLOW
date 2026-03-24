<?php
$logFile = __DIR__ . '/meta_webhook_prod.log';
echo "Attempting to write to: $logFile\n";
$res = file_put_contents($logFile, date('[Y-m-d H:i:s] ') . "TEST LOG ENTRY\n", FILE_APPEND);
if ($res === false) {
    echo "FAILED to write log.\n";
    echo "Permissions: " . substr(sprintf('%o', fileperms(__DIR__)), -4);
} else {
    echo "SUCCESS: Wrote $res bytes.\n";
    echo "Please check if 'meta_webhook_prod.log' exists now.";
}
?>