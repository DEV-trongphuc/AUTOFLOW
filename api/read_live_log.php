<?php
require_once 'db_connect.php';
$cronSecret = getenv('CRON_SECRET') ?: 'autoflow_cron_2026';
$passedSecret = $_GET['secret'] ?? '';

if (!hash_equals($cronSecret, $passedSecret)) {
    http_response_code(403);
    echo "Unauthorized";
    exit;
}

echo "--- AI TRIAL FORM DETAILS --- \n";
try {
    $stmt = $pdo->prepare("SELECT id, name, workspace_id, status, notification_enabled, notification_emails, notification_cc_emails FROM forms WHERE name LIKE ?");
    $stmt->execute(['%AI Trial%']);
    $forms = $stmt->fetchAll(PDO::FETCH_ASSOC);
    print_r($forms);
    
    if (!empty($forms)) {
        $wsId = $forms[0]['workspace_id'];
        echo "\n--- SMTP SETTINGS FOR WORKSPACE $wsId --- \n";
        $stmt2 = $pdo->prepare("SELECT `key`, `value` FROM system_settings WHERE workspace_id = ? AND `key` LIKE 'smtp%'");
        $stmt2->execute([$wsId]);
        $settings = $stmt2->fetchAll(PDO::FETCH_ASSOC);
        foreach ($settings as &$s) {
            if (strpos($s['key'], 'pass') !== false) {
                $s['value'] = '********';
            }
        }
        print_r($settings);
    }
} catch (Exception $e) {
    echo "Database Error: " . $e->getMessage() . "\n";
}
