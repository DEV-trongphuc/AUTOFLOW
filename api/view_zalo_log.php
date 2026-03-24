<?php
$logFile = __DIR__ . '/zalo_debug.log';
if (file_exists($logFile)) {
    echo "<pre>" . htmlspecialchars(file_get_contents($logFile)) . "</pre>";
} else {
    echo "Log file empty (Chưa có Webhook nào tới)";
}
?>