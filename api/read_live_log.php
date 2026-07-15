<?php
require_once 'db_connect.php';
$cronSecret = getenv('CRON_SECRET') ?: 'autoflow_cron_2026';
$passedSecret = $_GET['secret'] ?? '';

if (!hash_equals($cronSecret, $passedSecret)) {
    http_response_code(403);
    echo "Unauthorized";
    exit;
}

echo "--- SMTP SETTINGS FOR WORKSPACE 0 (GLOBAL) --- \n";
try {
    $stmt = $pdo->prepare("SELECT `key`, `value` FROM system_settings WHERE workspace_id = 0 AND `key` LIKE 'smtp%'");
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
