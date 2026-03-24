<?php
/**
 * api/view_meta_debug.php
 * Script to view the latest logs from the Meta Webhook
 */

header('Content-Type: text/plain; charset=utf-8');

// Try to find the correct log file
$logFiles = [
    __DIR__ . '/meta_webhook_prod.log',
    __DIR__ . '/meta_webhook.log',
    __DIR__ . '/debug_meta.log'
];

$logFile = null;
foreach ($logFiles as $file) {
    if (file_exists($file)) {
        $logFile = $file;
        break;
    }
}

if (!$logFile) {
    die("No Meta log files found. (Checked: " . implode(', ', array_map('basename', $logFiles)) . ").\nThis usually means no events have been received by the webhook yet.");
}

echo "--- LATEST META WEBHOOK LOGS (" . basename($logFile) . ") ---\n";
echo "Current Time: " . date('Y-m-d H:i:s') . "\n";
echo "File Size: " . filesize($logFile) . " bytes\n\n";

// 2. Read file efficiently
$content = file_get_contents($logFile);
$lines = explode("\n", $content);
$lines = array_slice($lines, -100); // Last 100 lines
$output = implode("\n", $lines);

// 3. Highlight Human Takeover entries
$output = htmlspecialchars($output);
$output = str_replace("Human reply (echo) detected", "--- [!!!] HUMAN REPLY DETECTED [!!!] ---", $output);
$output = str_replace("Pausing AI", ">>> PAUSING AI <<<", $output);

echo $output;

echo "\n--- END OF LOGS ---";
