<?php
// Check recent webhook logs for lead form submissions
$logFile = __DIR__ . '/meta_webhook_prod.log';

if (!file_exists($logFile)) {
    die("Log file not found: $logFile");
}

// Read last 200 lines
$lines = file($logFile);
$recentLines = array_slice($lines, -200);

echo "<h2>Recent Meta Webhook Logs (Last 200 lines)</h2>";
echo "<pre style='background: #f5f5f5; padding: 15px; border-radius: 8px; font-size: 12px; max-height: 600px; overflow-y: auto;'>";

// Highlight important patterns
foreach ($recentLines as $line) {
    if (
        stripos($line, 'Full name:') !== false ||
        stripos($line, 'Email:') !== false ||
        stripos($line, 'Phone') !== false ||
        stripos($line, 'Triggering AI') !== false ||
        stripos($line, 'No active AI') !== false ||
        stripos($line, 'AI Scenario exists but') !== false
    ) {
        echo "<strong style='color: #d97706;'>" . htmlspecialchars($line) . "</strong>";
    } else {
        echo htmlspecialchars($line);
    }
}

echo "</pre>";
?>