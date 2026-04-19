<?php
require_once 'db_connect.php';

echo "<h1>Zalo Webhook Diagnostic</h1>";

// 1. Check Log File
$logFile = __DIR__ . '/zalo_debug.log';
echo "<h3>1. Log File Status</h3>";
if (file_exists($logFile)) {
    echo "Log file exists. Size: " . filesize($logFile) . " bytes.<br>";
    echo "Last 20 lines:<br>";
    echo "<pre style='background:#f4f4f4;padding:10px;border:1px solid #ccc; max-height: 400px; overflow: auto;'>";
    $lines = file($logFile);
    $lastLines = array_slice($lines, -20);
    echo htmlspecialchars(implode("", $lastLines));
    echo "</pre>";
} else {
    echo "<b style='color:red;'>Log file (zalo_debug.log) does not exist.</b><br>";
    echo "Attempting to create test log entry...<br>";
    $testWrite = file_put_contents($logFile, date('[Y-m-d H:i:s] ') . "Diagnostic Test Write\n", FILE_APPEND);
    if ($testWrite) {
        echo "✅ <b style='color:green;'>Test write successful!</b> Webhook CAN write logs. If it's still empty, then Zalo is truly not sending requests to this server.<br>";
    } else {
        echo "❌ <b style='color:red;'>Test write FAILED.</b> There is a permission issue preventing PHP from creating files in this folder. Please CHMOD this folder to 755 or 777.<br>";
    }
}

// 2. Check Database Zalo Configs
echo "<h3>2. Zalo OA Configurations</h3>";
try {
    $stmt = $pdo->query("SELECT id, oa_id, name, status, access_token FROM zalo_oa_configs");
    $configs = $stmt->fetchAll();
    if (empty($configs)) {
        echo "<b style='color:red;'>No Zalo OA configurations found in database.</b>";
    } else {
        echo "<table border='1' cellpadding='5' style='border-collapse:collapse;'>";
        echo "<tr><th>ID</th><th>OA ID (Important)</th><th>Name</th><th>Status</th><th>Token</th></tr>";
        foreach ($configs as $c) {
            $hasToken = !empty($c['access_token']) ? "✅" : "❌";
            echo "<tr>
                <td>{$c['id']}</td>
                <td><b>{$c['oa_id']}</b></td>
                <td>{$c['name']}</td>
                <td>{$c['status']}</td>
                <td>$hasToken</td>
            </tr>";
        }
        echo "</table>";
        echo "<p>Ensure the <b>OA ID</b> above matches exactly what is shown in your Zalo OA Manage Dashboard.</p>";
    }
} catch (Exception $e) {
    echo "Error checking database: " . $e->getMessage();
}

// 3. Environment Check
echo "<h3>3. Environment Check</h3>";
echo "PHP Version: " . phpversion() . "<br>";
echo "Current Directory: " . __DIR__ . "<br>";
echo "Writable: " . (is_writable(__DIR__) ? "✅ Yes" : "❌ No (Permissions issue)") . "<br>";
echo "Web Server: " . ($_SERVER['SERVER_SOFTWARE'] ?? 'Unknown') . "<br>";

echo "<hr><p>To test, visit your webhook URL manually: <a href='webhook.php' target='_blank'>webhook.php</a> then refresh this page to see if it was logged.</p>";
