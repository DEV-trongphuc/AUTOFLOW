<?php
/**
 * Check Meta Token & Webhook Subscription
 */
require_once 'db_connect.php';

header('Content-Type: text/html; charset=utf-8');

echo "<html><head><style>
body { font-family: monospace; padding: 20px; background: #1e1e1e; color: #d4d4d4; }
.ok { color: #4ec9b0; font-weight: bold; }
.error { color: #f48771; font-weight: bold; }
pre { background: #252526; padding: 15px; border-left: 3px solid #007acc; }
h2 { color: #569cd6; }
</style></head><body>";

echo "<h1>🔑 Meta Token & Subscription Check</h1>";
echo "<p>Current Time: " . date('Y-m-d H:i:s') . "</p><hr>";

// Get all active page configs
$stmt = $pdo->query("SELECT * FROM meta_app_configs WHERE status = 'active'");
$configs = $stmt->fetchAll(PDO::FETCH_ASSOC);

if (empty($configs)) {
    echo "<p class='error'>❌ No active Meta page configs found!</p>";
    exit;
}

foreach ($configs as $config) {
    echo "<h2>📄 Page: {$config['page_name']} ({$config['page_id']})</h2>";
    echo "<pre>";

    // Check token validity
    $token = $config['page_access_token'];
    $tokenPreview = substr($token, 0, 20) . '...' . substr($token, -10);
    echo "Token: $tokenPreview\n";
    echo "Verify Token: {$config['verify_token']}\n";
    echo "App ID: {$config['app_id']}\n\n";

    // Test token with Meta API
    echo "Testing token validity...\n";
    $testUrl = "https://graph.facebook.com/v21.0/me?access_token=" . urlencode($token);

    $ch = curl_init($testUrl);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_TIMEOUT, 10);
    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    if ($httpCode == 200) {
        $data = json_decode($response, true);
        echo "<span class='ok'>✅ Token is VALID</span>\n";
        echo "Page ID: {$data['id']}\n";
        echo "Page Name: {$data['name']}\n\n";

        // Check webhook subscription
        echo "Checking webhook subscription...\n";
        $subUrl = "https://graph.facebook.com/v21.0/{$config['page_id']}/subscribed_apps?access_token=" . urlencode($token);

        $ch = curl_init($subUrl);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_TIMEOUT, 10);
        $subResponse = curl_exec($ch);
        curl_close($ch);

        $subData = json_decode($subResponse, true);

        if (isset($subData['data']) && !empty($subData['data'])) {
            echo "<span class='ok'>✅ Webhook is SUBSCRIBED</span>\n";
            echo "Subscribed fields: " . json_encode($subData['data'][0]['subscribed_fields'] ?? []) . "\n";
        } else {
            echo "<span class='error'>❌ Webhook NOT subscribed!</span>\n";
            echo "Response: " . json_encode($subData) . "\n";
            echo "\n🔧 TO FIX: Go to Meta Developers Console and re-subscribe webhook\n";
        }

    } else {
        echo "<span class='error'>❌ Token is INVALID or EXPIRED</span>\n";
        echo "HTTP Code: $httpCode\n";
        echo "Response: $response\n";
        echo "\n🔧 TO FIX: Generate new Page Access Token from Meta Developers Console\n";
    }

    echo "</pre><hr>";
}

echo "<h2>💡 How to Fix</h2>";
echo "<ol>";
echo "<li><b>If token expired:</b> Generate new token at <a href='https://developers.facebook.com/tools/accesstoken/' target='_blank' style='color: #4ec9b0;'>Meta Access Token Tool</a></li>";
echo "<li><b>If webhook not subscribed:</b> Go to App → Messenger → Settings → Webhooks → Subscribe</li>";
echo "<li><b>Update token in database:</b> Use meta_config.php to update</li>";
echo "</ol>";

echo "</body></html>";
