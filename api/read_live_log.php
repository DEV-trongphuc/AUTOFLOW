<?php
require_once 'db_connect.php';
$cronSecret = getenv('CRON_SECRET') ?: 'autoflow_cron_2026';
$passedSecret = $_GET['secret'] ?? '';

if (!hash_equals($cronSecret, $passedSecret)) {
    http_response_code(403);
    echo "Unauthorized";
    exit;
}

function tailFile($filepath, $lines = 40) {
    if (!file_exists($filepath)) return "File not found: " . $filepath . "\n";
    $data = file($filepath);
    $lineCount = count($data);
    $start = max(0, $lineCount - $lines);
    return implode("", array_slice($data, $start));
}

echo "--- LAST 40 LINES OF error_log --- \n";
echo tailFile(__DIR__ . '/error_log', 40);

echo "\n--- SMTP CONFIGURATION FOR WS 1 --- \n";
try {
    $stmt = $pdo->prepare("SELECT `key`, `value` FROM system_settings WHERE workspace_id = 1 AND `key` LIKE 'smtp%'");
    $stmt->execute();
    $settings = $stmt->fetchAll(PDO::FETCH_ASSOC);
    foreach ($settings as &$s) {
        if (strpos($s['key'], 'pass') !== false) {
            $s['value'] = '********';
        }
    }
    print_r($settings);
} catch (Exception $e) {
    echo "Database Error: " . $e->getMessage() . "\n";
}
