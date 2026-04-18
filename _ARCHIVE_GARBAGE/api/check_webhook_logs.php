<?php
/**
 * Check Latest Webhook Activity
 * Shows if webhook is receiving events from Meta
 */
require_once 'db_connect.php';

header('Content-Type: text/html; charset=utf-8');

echo "<html><head><style>
body { font-family: monospace; padding: 20px; background: #1e1e1e; color: #d4d4d4; }
.ok { color: #4ec9b0; }
.error { color: #f48771; }
pre { background: #252526; padding: 15px; border-left: 3px solid #007acc; }
h2 { color: #569cd6; }
</style></head><body>";

echo "<h1>🌐 Webhook Activity Monitor</h1>";
echo "<p>Current Time: " . date('Y-m-d H:i:s') . "</p><hr>";

// 1. Check log file
$logFile = __DIR__ . '/meta_webhook_prod.log';

echo "<h2>📄 Log File Status</h2>";
if (file_exists($logFile)) {
    $size = filesize($logFile);
    $modified = date('Y-m-d H:i:s', filemtime($logFile));

    echo "<pre>";
    echo "File: meta_webhook_prod.log\n";
    echo "Size: " . number_format($size) . " bytes\n";
    echo "Last Modified: $modified\n";
    echo "</pre>";

    // Show last 30 lines
    echo "<h2>📋 Last 30 Lines</h2>";
    $content = file_get_contents($logFile);
    $lines = explode("\n", $content);
    $last30 = array_slice($lines, -30);

    echo "<pre style='max-height: 400px; overflow-y: auto;'>";
    foreach ($last30 as $line) {
        if (empty(trim($line)))
            continue;

        // Highlight important keywords
        if (stripos($line, 'error') !== false || stripos($line, 'fail') !== false) {
            echo "<span class='error'>$line</span>\n";
        } elseif (stripos($line, 'success') !== false || stripos($line, 'AI Success') !== false) {
            echo "<span class='ok'>$line</span>\n";
        } else {
            echo htmlspecialchars($line) . "\n";
        }
    }
    echo "</pre>";

} else {
    echo "<p class='error'>❌ Log file not found!</p>";
    echo "<p>This means webhook has NEVER received any events, or logging is disabled.</p>";
}

// 2. Check database for recent webhook events
echo "<h2>💾 Database: Recent Inbound Messages (Last 20)</h2>";
$stmt = $pdo->query("SELECT 
    FROM_UNIXTIME(timestamp) as time,
    psid,
    message_type,
    LEFT(content, 50) as content,
    status
FROM meta_message_logs 
WHERE direction = 'inbound'
ORDER BY timestamp DESC 
LIMIT 20");

$msgs = $stmt->fetchAll(PDO::FETCH_ASSOC);

if (empty($msgs)) {
    echo "<p class='error'>❌ No inbound messages in database!</p>";
} else {
    echo "<table border='1' cellpadding='5' style='border-collapse: collapse; width: 100%;'>";
    echo "<tr><th>Time</th><th>PSID</th><th>Type</th><th>Content</th><th>Status</th></tr>";
    foreach ($msgs as $m) {
        echo "<tr>";
        echo "<td>{$m['time']}</td>";
        echo "<td>" . substr($m['psid'], -8) . "</td>";
        echo "<td>{$m['message_type']}</td>";
        echo "<td>" . htmlspecialchars($m['content']) . "</td>";
        echo "<td>{$m['status']}</td>";
        echo "</tr>";
    }
    echo "</table>";
}

// 3. Test webhook endpoint
echo "<h2>🔗 Webhook Endpoint Test</h2>";
$webhookUrl = "https://automation.ideas.edu.vn/mail_api/meta_webhook.php";
echo "<pre>";
echo "Endpoint: $webhookUrl\n";
echo "Testing connectivity...\n\n";

$ch = curl_init($webhookUrl);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_TIMEOUT, 5);
curl_setopt($ch, CURLOPT_NOBODY, true);
curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

if ($httpCode == 200 || $httpCode == 403) {
    echo "<span class='ok'>✅ Webhook endpoint is reachable (HTTP $httpCode)</span>\n";
} else {
    echo "<span class='error'>❌ Webhook endpoint issue (HTTP $httpCode)</span>\n";
}
echo "</pre>";

// 4. Check Meta webhook subscription
echo "<h2>🔔 Meta Webhook Subscription</h2>";
echo "<p>To verify Meta is sending events to your webhook:</p>";
echo "<ol>";
echo "<li>Go to <a href='https://developers.facebook.com/apps' target='_blank' style='color: #4ec9b0;'>Meta Developers Console</a></li>";
echo "<li>Select your app → Messenger → Settings</li>";
echo "<li>Check 'Webhooks' section</li>";
echo "<li>Verify callback URL is: <code>$webhookUrl</code></li>";
echo "<li>Verify subscribed fields include: <code>messages</code>, <code>messaging_postbacks</code></li>";
echo "</ol>";

echo "<hr><h2>💡 Next Steps</h2>";
echo "<pre>";
echo "If no recent logs/messages:\n";
echo "1. Check Meta webhook subscription in Developers Console\n";
echo "2. Test webhook with Meta's 'Test' button\n";
echo "3. Check server firewall/SSL certificate\n";
echo "\nIf logs exist but AI not replying:\n";
echo "1. Check for errors in logs above\n";
echo "2. Verify AI chatbot is active\n";
echo "3. Check API key validity\n";
echo "</pre>";

echo "</body></html>";
