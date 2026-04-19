<?php
// api/forms_debug.php - Add debug logging to forms submission
// This is a MODIFIED version of forms.php with extensive logging
error_reporting(E_ALL);
ini_set('display_errors', 1);

require_once 'db_connect.php';

$debugLog = __DIR__ . '/forms_debug.log';

function debugLog($msg)
{
    global $debugLog;
    file_put_contents($debugLog, date('Y-m-d H:i:s') . ' - ' . $msg . "\n", FILE_APPEND);
}

debugLog("=== FORMS DEBUG START ===");
debugLog("POST data: " . print_r($_POST, true));

// Simulate form submission
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['formId'])) {
    $formId = $_POST['formId'];
    $email = $_POST['email'] ?? 'test@example.com';

    debugLog("Form ID: $formId, Email: $email");

    try {
        $pdo->beginTransaction();
        debugLog("Transaction started");

        // Insert subscriber (simplified)
        $stmt = $pdo->prepare("INSERT INTO subscribers (email, status, created_at) VALUES (?, 'active', NOW()) ON DUPLICATE KEY UPDATE id=LAST_INSERT_ID(id)");
        $stmt->execute([$email]);
        $sid = $pdo->lastInsertId();

        debugLog("Subscriber ID: $sid");

        // Log activity
        $stmt = $pdo->prepare("INSERT INTO subscriber_activity (subscriber_id, type, reference_id, reference_name, details, created_at) VALUES (?, 'form_submit', ?, 'Test Form', 'Debug test', NOW())");
        $stmt->execute([$sid, $formId]);

        debugLog("Activity logged");

        $pdo->commit();
        debugLog("Transaction committed");

        // NOW TRIGGER WORKER
        $workerUrl = "https://automation.ideas.edu.vn/mail_api/worker_priority.php?" . http_build_query([
            'trigger_type' => 'form',
            'target_id' => $formId,
            'subscriber_id' => $sid
        ]);

        debugLog("Worker URL: $workerUrl");

        $ch = curl_init();
        curl_setopt($ch, CURLOPT_URL, $workerUrl);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, false);
        curl_setopt($ch, CURLOPT_TIMEOUT, 1);
        curl_setopt($ch, CURLOPT_NOSIGNAL, 1);
        curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);

        debugLog("Curl starting...");
        $result = @curl_exec($ch);
        $error = curl_error($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        debugLog("Curl finished - HTTP: $httpCode, Error: " . ($error ?: 'NONE'));

        echo "OK - Check forms_debug.log\n";

    } catch (Exception $e) {
        if ($pdo->inTransaction())
            $pdo->rollBack();
        debugLog("ERROR: " . $e->getMessage());
        echo "ERROR: " . $e->getMessage() . "\n";
    }
} else {
    echo "Usage: POST with formId=xxx&email=xxx\n";
}
?>