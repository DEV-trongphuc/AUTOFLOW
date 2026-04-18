<?php
/**
 * Check if meta_webhook.php exists and is accessible
 */

header('Content-Type: text/html; charset=utf-8');

echo "<html><head><style>
body { font-family: monospace; padding: 20px; background: #1e1e1e; color: #d4d4d4; }
.ok { color: #4ec9b0; }
.error { color: #f48771; }
pre { background: #252526; padding: 15px; }
</style></head><body>";

echo "<h1>🔍 Webhook File Checker</h1><hr>";

$webhookFile = __DIR__ . '/meta_webhook.php';

echo "<h2>📄 File Status</h2>";
echo "<pre>";
echo "Looking for: $webhookFile\n\n";

if (file_exists($webhookFile)) {
    echo "<span class='ok'>✅ File EXISTS</span>\n";
    echo "Size: " . filesize($webhookFile) . " bytes\n";
    echo "Modified: " . date('Y-m-d H:i:s', filemtime($webhookFile)) . "\n";
    echo "Permissions: " . substr(sprintf('%o', fileperms($webhookFile)), -4) . "\n\n";

    // Check for syntax errors
    echo "Checking for PHP syntax errors...\n";
    $output = [];
    $return = 0;
    exec("php -l " . escapeshellarg($webhookFile) . " 2>&1", $output, $return);

    if ($return === 0) {
        echo "<span class='ok'>✅ No syntax errors</span>\n";
    } else {
        echo "<span class='error'>❌ SYNTAX ERROR:</span>\n";
        echo implode("\n", $output) . "\n";
    }

} else {
    echo "<span class='error'>❌ File NOT FOUND!</span>\n\n";

    // List all files in directory
    echo "Files in current directory:\n";
    $files = scandir(__DIR__);
    foreach ($files as $f) {
        if ($f === '.' || $f === '..')
            continue;
        if (strpos($f, 'webhook') !== false || strpos($f, 'meta') !== false) {
            echo "  - $f\n";
        }
    }
}

echo "</pre>";

echo "<h2>🌐 URL Test</h2>";
echo "<pre>";
$testUrl = "https://automation.ideas.edu.vn/mail_api/meta_webhook.php";
echo "Testing: $testUrl\n\n";

$ch = curl_init($testUrl);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_TIMEOUT, 10);
curl_setopt($ch, CURLOPT_NOBODY, false);
curl_setopt($ch, CURLOPT_HEADER, true);
$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

echo "HTTP Code: $httpCode\n";

if ($httpCode == 200) {
    echo "<span class='ok'>✅ URL is accessible</span>\n";
} elseif ($httpCode == 404) {
    echo "<span class='error'>❌ 404 Not Found - File doesn't exist on server</span>\n";
} elseif ($httpCode == 500) {
    echo "<span class='error'>❌ 500 Server Error - PHP error in file</span>\n";
    echo "\nResponse preview:\n";
    echo substr($response, 0, 500) . "\n";
} else {
    echo "<span class='error'>❌ Error: HTTP $httpCode</span>\n";
}

echo "</pre>";

echo "<h2>💡 Solution</h2>";
echo "<pre>";
if (!file_exists($webhookFile)) {
    echo "File is missing! You need to:\n";
    echo "1. Upload meta_webhook.php to server\n";
    echo "2. Or check if it's in a different folder\n";
} elseif ($httpCode == 500) {
    echo "File has PHP errors! Check the error log above.\n";
} elseif ($httpCode == 404) {
    echo "File exists locally but not accessible via URL.\n";
    echo "Check:\n";
    echo "1. .htaccess rules\n";
    echo "2. Server configuration\n";
    echo "3. File permissions\n";
}
echo "</pre>";

echo "</body></html>";
