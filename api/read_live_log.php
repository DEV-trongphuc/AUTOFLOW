<?php
require_once 'db_connect.php';
$cronSecret = getenv('CRON_SECRET') ?: 'autoflow_cron_2026';
$passedSecret = $_GET['secret'] ?? '';

if (!hash_equals($cronSecret, $passedSecret)) {
    http_response_code(403);
    echo "Unauthorized";
    exit;
}

try {
    // Force update the notification email in the DB
    $stmtUp = $pdo->prepare("UPDATE forms SET notification_emails = 'phucht@ideas.edu.vn' WHERE name = 'AI Trial'");
    $stmtUp->execute();
    echo "SUCCESS: Updated form notification_emails to phucht@ideas.edu.vn in database.\n\n";

    echo "--- UPDATED AI TRIAL FORM DETAILS --- \n";
    $stmt = $pdo->prepare("SELECT id, name, workspace_id, status, notification_enabled, notification_emails, notification_cc_emails FROM forms WHERE name LIKE ?");
    $stmt->execute(['%AI Trial%']);
    print_r($stmt->fetchAll(PDO::FETCH_ASSOC));
} catch (Exception $e) {
    echo "Database Error: " . $e->getMessage() . "\n";
}
